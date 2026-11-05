const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const ActivityLog = require('../models/ActivityLog');
const mockStore = require('../utils/mockStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// Helper to calculate status strictly against actual current date
const enrichMedicineCalculations = (med, customThreshold = 10) => {
  const now = new Date();
  const expDate = new Date(med.expiryDate);
  const diffTime = expDate.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const threshold = Number(med.minStockLevel || customThreshold) || 10;
  const isExpired = daysUntilExpiry <= 0;
  const isExpiringWithin7Days = daysUntilExpiry > 0 && daysUntilExpiry <= 7;
  const isExpiringWithin30Days = daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  const isLowStock = Number(med.quantity || 0) <= threshold;

  let computedStatus = 'Safe';
  if (med.isDisposed) {
    computedStatus = 'Disposed';
  } else if (isExpired) {
    computedStatus = 'Expired';
  } else if (isExpiringWithin30Days) {
    computedStatus = 'Expiring Soon';
  } else if (isLowStock) {
    computedStatus = 'Low Stock';
  } else {
    computedStatus = 'Safe';
  }

  return {
    ...med,
    daysUntilExpiry,
    isExpired,
    isExpiringWithin7Days,
    isExpiringWithin30Days,
    isLowStock,
    computedStatus,
  };
};

// @desc    Get all medicines with search (by name or brand), category filter, status filter, and sort (expiryDate, quantity)
// @route   GET /api/medicines
// @access  Private / Authenticated
const getMedicines = async (req, res) => {
  try {
    const {
      search,
      category,
      statusFilter, // 'all', 'expired', 'expiring7', 'expiring30', 'lowStock', 'safe'
      threshold = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 100,
    } = req.query;

    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;
    const lowStockThreshold = Number(threshold) || 10;
    const now = new Date();

    if (isDbConnected()) {
      let query = {};

      // Security: regular users can ONLY see their own records
      if (!isAdmin) {
        query.$or = [{ userId: userId }, { createdBy: userId }];
      }

      // Search by medicine name OR brand
      if (search && search.trim() !== '') {
        const regex = new RegExp(search.trim(), 'i');
        const searchConditions = [
          { name: regex },
          { brand: regex },
          { genericName: regex },
          { batchNumber: regex },
        ];
        if (query.$or) {
          query.$and = [{ $or: query.$or }, { $or: searchConditions }];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }

      // Filter by category
      if (category && category !== 'All') {
        query.category = category;
      }

      // Status-specific filters
      if (statusFilter === 'expired') {
        query.expiryDate = { $lte: now };
        query.isDisposed = { $ne: true };
      } else if (statusFilter === 'expiring7') {
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        query.expiryDate = { $gt: now, $lte: in7Days };
        query.isDisposed = { $ne: true };
      } else if (statusFilter === 'expiring30') {
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        query.expiryDate = { $gt: now, $lte: in30Days };
        query.isDisposed = { $ne: true };
      } else if (statusFilter === 'lowStock') {
        query.quantity = { $lte: lowStockThreshold };
        query.isDisposed = { $ne: true };
      } else if (statusFilter === 'safe') {
        const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        query.expiryDate = { $gt: in30Days };
        query.quantity = { $gt: lowStockThreshold };
        query.isDisposed = { $ne: true };
      }

      // Sorting
      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (Number(page) - 1) * Number(limit);
      const total = await Medicine.countDocuments(query);
      const rawMedicines = await Medicine.find(query)
        .populate('userId', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean();

      // Enrich with real-time dynamic date calculations
      const medicines = rawMedicines.map((m) => enrichMedicineCalculations(m, lowStockThreshold));

      return res.json({
        success: true,
        count: medicines.length,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        data: medicines,
      });
    } else {
      // In-Memory Fallback
      let list = mockStore.getMedicines();

      if (!isAdmin) {
        list = list.filter(
          (m) =>
            String(m.userId) === String(userId) ||
            String(m.createdBy) === String(userId) ||
            !m.userId
        );
      }

      if (search && search.trim() !== '') {
        const s = search.toLowerCase().trim();
        list = list.filter(
          (m) =>
            m.name.toLowerCase().includes(s) ||
            (m.brand && m.brand.toLowerCase().includes(s)) ||
            (m.genericName && m.genericName.toLowerCase().includes(s)) ||
            m.batchNumber.toLowerCase().includes(s)
        );
      }

      if (category && category !== 'All') {
        list = list.filter((m) => m.category === category);
      }

      const enriched = list.map((m) => enrichMedicineCalculations(m, lowStockThreshold));
      let filtered = enriched;

      if (statusFilter === 'expired') {
        filtered = enriched.filter((m) => m.isExpired);
      } else if (statusFilter === 'expiring7') {
        filtered = enriched.filter((m) => m.isExpiringWithin7Days);
      } else if (statusFilter === 'expiring30') {
        filtered = enriched.filter((m) => m.isExpiringWithin30Days);
      } else if (statusFilter === 'lowStock') {
        filtered = enriched.filter((m) => m.isLowStock);
      } else if (statusFilter === 'safe') {
        filtered = enriched.filter((m) => m.computedStatus === 'Safe');
      }

      filtered.sort((a, b) => {
        let fieldA = a[sortBy];
        let fieldB = b[sortBy];

        if (sortBy === 'expiryDate' || sortBy === 'createdAt' || sortBy === 'purchaseDate') {
          fieldA = new Date(fieldA).getTime();
          fieldB = new Date(fieldB).getTime();
        } else if (typeof fieldA === 'string') {
          fieldA = fieldA.toLowerCase();
          fieldB = fieldB.toLowerCase();
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      return res.json({
        success: true,
        count: filtered.length,
        total: filtered.length,
        page: 1,
        pages: 1,
        data: filtered,
      });
    }
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve medicine inventory',
    });
  }
};

// @desc    Get counts: Total, Expired, Expiring in 7 days, Expiring in 30 days, Low Stock
// @route   GET /api/medicines/stats
// @access  Private
const getMedicineStats = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;
    const threshold = Number(req.query.threshold) || 10;
    const now = new Date();

    let query = { isDisposed: { $ne: true } };
    if (!isAdmin) {
      query.$or = [{ userId: userId }, { createdBy: userId }];
    }

    if (isDbConnected()) {
      const allMeds = await Medicine.find(query).lean();

      let total = 0;
      let expired = 0;
      let expiring7 = 0;
      let expiring30 = 0;
      let lowStock = 0;
      let safe = 0;

      allMeds.forEach((m) => {
        total += 1;
        const enriched = enrichMedicineCalculations(m, threshold);
        if (enriched.isExpired) {
          expired += 1;
        } else if (enriched.isExpiringWithin7Days) {
          expiring7 += 1;
          expiring30 += 1;
        } else if (enriched.isExpiringWithin30Days) {
          expiring30 += 1;
        }

        if (enriched.isLowStock) {
          lowStock += 1;
        }

        if (enriched.computedStatus === 'Safe') {
          safe += 1;
        }
      });

      return res.json({
        success: true,
        data: {
          total,
          expired,
          expiring7,
          expiring30,
          lowStock,
          safe,
          threshold,
        },
      });
    } else {
      const meds = mockStore.getMedicines().filter((m) => {
        if (!isAdmin) {
          return String(m.userId) === String(userId) || String(m.createdBy) === String(userId);
        }
        return true;
      });

      let total = meds.length;
      let expired = 0;
      let expiring7 = 0;
      let expiring30 = 0;
      let lowStock = 0;
      let safe = 0;

      meds.forEach((m) => {
        const enriched = enrichMedicineCalculations(m, threshold);
        if (enriched.isExpired) expired += 1;
        if (enriched.isExpiringWithin7Days) expiring7 += 1;
        if (enriched.isExpiringWithin30Days) expiring30 += 1;
        if (enriched.isLowStock) lowStock += 1;
        if (enriched.computedStatus === 'Safe') safe += 1;
      });

      return res.json({
        success: true,
        data: { total, expired, expiring7, expiring30, lowStock, safe, threshold },
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single medicine details (with record ownership check)
// @route   GET /api/medicines/:id
// @access  Private
const getMedicineById = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;

    if (isDbConnected()) {
      const medicine = await Medicine.findById(req.params.id)
        .populate('userId', 'name email role')
        .lean();

      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine record not found' });
      }

      // Record ownership security check
      const ownerId = medicine.userId?._id || medicine.userId || medicine.createdBy;
      if (!isAdmin && ownerId && String(ownerId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own medicine records.',
        });
      }

      const enriched = enrichMedicineCalculations(medicine);
      return res.json({ success: true, data: enriched });
    } else {
      const medicine = mockStore.getMedicineById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine record not found' });
      }

      const ownerId = medicine.userId || medicine.createdBy;
      if (!isAdmin && ownerId && String(ownerId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own medicine records.',
        });
      }

      return res.json({ success: true, data: enrichMedicineCalculations(medicine) });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new medicine (Bound strictly to authenticated user)
// @route   POST /api/medicines
// @access  Private
const createMedicine = async (req, res) => {
  try {
    const {
      name,
      category,
      brand,
      batchNumber,
      quantity,
      unit,
      purchaseDate,
      expiryDate,
      price,
      description,
      minStockLevel,
      storageCondition,
      rackLocation,
    } = req.body;

    // Backend Input Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name is required and must be at least 2 characters long',
      });
    }

    if (!category || typeof category !== 'string' || category.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }

    if (!brand || typeof brand !== 'string' || brand.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Brand / Manufacturer name is required',
      });
    }

    if (!batchNumber || typeof batchNumber !== 'string' || batchNumber.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Batch number is required',
      });
    }

    if (quantity === undefined || isNaN(Number(quantity)) || Number(quantity) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid non-negative number',
      });
    }

    if (!expiryDate || isNaN(new Date(expiryDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'A valid expiry date is required',
      });
    }

    if (price !== undefined && price !== null && price !== '' && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a valid non-negative number if provided',
      });
    }

    const payload = {
      name: name.trim(),
      category: category.trim(),
      brand: brand.trim(),
      batchNumber: batchNumber.toUpperCase().trim(),
      quantity: Number(quantity) || 0,
      unit: unit ? unit.trim() : 'Tablets',
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      expiryDate: new Date(expiryDate),
      price: price !== undefined && price !== null && price !== '' ? Number(price) : null,
      description: description ? description.trim() : '',
      minStockLevel: Number(minStockLevel) || 10,
      storageCondition: storageCondition || 'Room Temperature (15-25°C)',
      rackLocation: rackLocation ? rackLocation.trim() : '',
      userId: req.user._id,
      createdBy: req.user._id,
    };

    if (isDbConnected()) {
      // Check for duplicate batch number under this user's account
      const existing = await Medicine.findOne({
        batchNumber: payload.batchNumber,
        $or: [{ userId: req.user._id }, { createdBy: req.user._id }],
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `A batch with number "${payload.batchNumber}" already exists in your inventory.`,
        });
      }

      const medicine = await Medicine.create(payload);

      await ActivityLog.create({
        action: 'MEDICINE_CREATED',
        title: 'New Medicine Added',
        description: `${payload.name} (${payload.brand}, Batch: ${payload.batchNumber}) was added to inventory.`,
        user: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role,
          email: req.user.email,
        },
        metadata: { medicineId: medicine._id, batchNumber: payload.batchNumber },
        severity: 'success',
      });

      return res.status(201).json({
        success: true,
        message: 'Medicine added successfully!',
        data: enrichMedicineCalculations(medicine.toObject()),
      });
    } else {
      const newMed = mockStore.addMedicine(payload);
      return res.status(201).json({
        success: true,
        message: 'Medicine added successfully! (Preview Mode)',
        data: enrichMedicineCalculations(newMed),
      });
    }
  } catch (error) {
    console.error('Create Medicine Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create medicine',
    });
  }
};

// @desc    Edit existing medicine details (Ownership enforced)
// @route   PUT /api/medicines/:id
// @access  Private
const updateMedicine = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;

    const {
      name,
      category,
      brand,
      batchNumber,
      quantity,
      unit,
      purchaseDate,
      expiryDate,
      price,
      description,
      minStockLevel,
      storageCondition,
      rackLocation,
    } = req.body;

    // Validation
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long' });
    }
    if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) < 0)) {
      return res.status(400).json({ success: false, message: 'Quantity cannot be negative' });
    }
    if (expiryDate !== undefined && isNaN(new Date(expiryDate).getTime())) {
      return res.status(400).json({ success: false, message: 'A valid expiry date is required' });
    }

    if (isDbConnected()) {
      const medicine = await Medicine.findById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      // Security check
      const ownerId = medicine.userId || medicine.createdBy;
      if (!isAdmin && ownerId && String(ownerId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only edit your own medicine records.',
        });
      }

      if (name !== undefined) medicine.name = name.trim();
      if (category !== undefined) medicine.category = category.trim();
      if (brand !== undefined) medicine.brand = brand.trim();
      if (batchNumber !== undefined) medicine.batchNumber = batchNumber.toUpperCase().trim();
      if (quantity !== undefined) medicine.quantity = Number(quantity);
      if (unit !== undefined) medicine.unit = unit.trim();
      if (purchaseDate !== undefined) medicine.purchaseDate = new Date(purchaseDate);
      if (expiryDate !== undefined) medicine.expiryDate = new Date(expiryDate);
      if (price !== undefined) medicine.price = price !== null && price !== '' ? Number(price) : null;
      if (description !== undefined) medicine.description = description.trim();
      if (minStockLevel !== undefined) medicine.minStockLevel = Number(minStockLevel);
      if (storageCondition !== undefined) medicine.storageCondition = storageCondition;
      if (rackLocation !== undefined) medicine.rackLocation = rackLocation.trim();

      const updated = await medicine.save();

      await ActivityLog.create({
        action: 'MEDICINE_UPDATED',
        title: 'Medicine Details Updated',
        description: `${medicine.name} (Batch: ${medicine.batchNumber}) was modified by ${req.user.name}.`,
        user: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role,
          email: req.user.email,
        },
        metadata: { medicineId: medicine._id },
        severity: 'info',
      });

      return res.json({
        success: true,
        message: 'Medicine updated successfully',
        data: enrichMedicineCalculations(updated.toObject()),
      });
    } else {
      const medicine = mockStore.getMedicineById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      const ownerId = medicine.userId || medicine.createdBy;
      if (!isAdmin && ownerId && String(ownerId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only edit your own medicine records.',
        });
      }

      const updated = mockStore.updateMedicine(req.params.id, req.body);
      return res.json({
        success: true,
        message: 'Medicine updated successfully',
        data: enrichMedicineCalculations(updated),
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a medicine (Ownership enforced)
// @route   DELETE /api/medicines/:id
// @access  Private
const deleteMedicine = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;

    if (isDbConnected()) {
      const medicine = await Medicine.findById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine record not found' });
      }

      // Security check
      const ownerId = medicine.userId || medicine.createdBy;
      if (!isAdmin && ownerId && String(ownerId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only delete your own medicine records.',
        });
      }

      const medName = medicine.name;
      const batchNum = medicine.batchNumber;

      await Medicine.findByIdAndDelete(req.params.id);

      await ActivityLog.create({
        action: 'MEDICINE_DELETED',
        title: 'Medicine Record Deleted',
        description: `${medName} (Batch: ${batchNum}) was deleted from inventory by ${req.user.name}.`,
        user: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role,
          email: req.user.email,
        },
        severity: 'warning',
      });

      return res.json({
        success: true,
        message: `"${medName}" was permanently removed from inventory.`,
      });
    } else {
      const medicine = mockStore.getMedicineById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      const ownerId = medicine.userId || medicine.createdBy;
      if (!isAdmin && ownerId && String(ownerId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only delete your own medicine records.',
        });
      }

      mockStore.deleteMedicine(req.params.id);
      return res.json({ success: true, message: 'Medicine deleted successfully.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Quick adjust stock (+ or -)
// @route   PATCH /api/medicines/:id/stock
// @access  Private
const adjustStock = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;
    const { change, reason = 'Inventory count adjustment' } = req.body;
    const adjustment = Number(change);

    if (isNaN(adjustment) || adjustment === 0) {
      return res.status(400).json({ success: false, message: 'Provide a valid non-zero stock change number' });
    }

    if (isDbConnected()) {
      const medicine = await Medicine.findById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      const ownerId = medicine.userId || medicine.createdBy;
      if (!isAdmin && ownerId && String(ownerId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only adjust stock for your own medicines.',
        });
      }

      const oldQty = medicine.quantity;
      const newQty = Math.max(0, oldQty + adjustment);
      medicine.quantity = newQty;
      await medicine.save();

      return res.json({
        success: true,
        message: `Stock updated. Current balance: ${newQty} ${medicine.unit}`,
        data: enrichMedicineCalculations(medicine.toObject()),
      });
    } else {
      const medicine = mockStore.getMedicineById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }
      const updated = mockStore.updateMedicine(req.params.id, {
        quantity: Math.max(0, medicine.quantity + adjustment),
      });
      return res.json({
        success: true,
        message: `Stock updated to ${updated.quantity}`,
        data: enrichMedicineCalculations(updated),
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark medicine as disposed
// @route   POST /api/medicines/:id/dispose
// @access  Private
const disposeMedicine = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Disposal reason is required' });
    }

    if (isDbConnected()) {
      const medicine = await Medicine.findById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      const ownerId = medicine.userId || medicine.createdBy;
      if (!isAdmin && ownerId && String(ownerId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only dispose your own medicines.',
        });
      }

      medicine.isDisposed = true;
      medicine.quantity = 0;
      medicine.disposalDetails = {
        disposedAt: new Date(),
        reason,
        disposedBy: req.user.name,
        notes: notes || 'Biohazard decommissioning logged.',
      };
      await medicine.save();

      return res.json({
        success: true,
        message: 'Medicine decommissioned and marked as disposed.',
        data: enrichMedicineCalculations(medicine.toObject()),
      });
    } else {
      const updated = mockStore.updateMedicine(req.params.id, {
        isDisposed: true,
        quantity: 0,
      });
      return res.json({ success: true, message: 'Medicine disposed.', data: enrichMedicineCalculations(updated) });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed expiry intelligence breakdown
// @route   GET /api/medicines/expiry/breakdown
// @access  Private
const getExpiryBreakdown = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;

    let query = { isDisposed: { $ne: true } };
    if (!isAdmin) {
      query.$or = [{ userId: userId }, { createdBy: userId }];
    }

    if (isDbConnected()) {
      const allMedicines = await Medicine.find(query).lean();
      const enriched = allMedicines.map((m) => enrichMedicineCalculations(m));

      const expired = enriched.filter((m) => m.isExpired);
      const expiring7 = enriched.filter((m) => m.isExpiringWithin7Days);
      const expiring30 = enriched.filter((m) => m.isExpiringWithin30Days && !m.isExpiringWithin7Days);
      const safe = enriched.filter((m) => m.computedStatus === 'Safe');

      return res.json({
        success: true,
        counts: {
          total: enriched.length,
          expired: expired.length,
          expiring7: expiring7.length,
          expiring30: expiring30.length,
          safe: safe.length,
        },
        data: {
          expired,
          expiring7,
          expiring30,
          safe,
        },
      });
    } else {
      const list = mockStore.getMedicines().filter((m) => {
        if (!isAdmin) {
          return String(m.userId) === String(userId) || String(m.createdBy) === String(userId);
        }
        return true;
      });
      const enriched = list.map((m) => enrichMedicineCalculations(m));
      return res.json({
        success: true,
        counts: {
          total: enriched.length,
          expired: enriched.filter((m) => m.isExpired).length,
          expiring7: enriched.filter((m) => m.isExpiringWithin7Days).length,
          expiring30: enriched.filter((m) => m.isExpiringWithin30Days).length,
          safe: enriched.filter((m) => m.computedStatus === 'Safe').length,
        },
        data: {
          expired: enriched.filter((m) => m.isExpired),
          expiring7: enriched.filter((m) => m.isExpiringWithin7Days),
          expiring30: enriched.filter((m) => m.isExpiringWithin30Days),
          safe: enriched.filter((m) => m.computedStatus === 'Safe'),
        },
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMedicines,
  getMedicineStats,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  adjustStock,
  disposeMedicine,
  getExpiryBreakdown,
};
