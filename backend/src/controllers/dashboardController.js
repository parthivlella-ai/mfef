const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const mockStore = require('../utils/mockStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get aggregated dashboard analytics and stats for authenticated user
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const userId = req.user._id;

    let medicines = [];
    let recentLogs = [];
    let unreadNotificationsCount = 0;

    if (isDbConnected()) {
      const medQuery = isAdmin ? {} : { $or: [{ userId: userId }, { createdBy: userId }] };
      medicines = await Medicine.find(medQuery).sort({ createdAt: -1 }).lean();

      const logQuery = isAdmin ? {} : { 'user.id': userId };
      recentLogs = await ActivityLog.find(logQuery).sort({ createdAt: -1 }).limit(8).lean();

      unreadNotificationsCount = await Notification.countDocuments({ userId, isRead: false });
    } else {
      medicines = mockStore.getMedicines().filter((m) => {
        if (!isAdmin) {
          return String(m.userId) === String(userId) || String(m.createdBy) === String(userId);
        }
        return true;
      });
      recentLogs = mockStore.getActivityLogs().slice(0, 8);
    }

    const now = new Date();
    let totalMedicines = 0;
    let activeMedicines = 0;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let expiringIn30DaysCount = 0;
    let expiringIn7DaysCount = 0;
    let expiredCount = 0;
    let safeCount = 0;
    let totalInventoryValue = 0;
    let categoryCounts = {};
    let urgentAlerts = [];
    let upcomingExpiryReminders = [];

    medicines.forEach((med) => {
      if (med.isDisposed || med.status === 'disposed') return;

      totalMedicines += 1;
      const qty = Number(med.quantity || 0);
      const threshold = Number(med.minStockLevel || 10);
      totalStockUnits += qty;
      const unitVal = med.price !== undefined && med.price !== null ? Number(med.price) : Number(med.unitPrice || 0);
      totalInventoryValue += qty * unitVal;

      // Expiry calculation dynamically against new Date()
      const expDate = new Date(med.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const isExpired = diffDays <= 0;
      const isExpiring7 = diffDays > 0 && diffDays <= 7;
      const isExpiring30 = diffDays > 0 && diffDays <= 30;
      const isLowStock = qty <= threshold;

      if (!isExpired) {
        activeMedicines += 1;
      }

      // Stock status
      if (qty === 0) {
        outOfStockCount += 1;
      } else if (isLowStock) {
        lowStockCount += 1;
      }

      // Category breakdown
      const cat = med.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Expiry breakdown
      if (isExpired) {
        expiredCount += 1;
        urgentAlerts.push({
          type: 'expired',
          severity: 'critical',
          medicineId: med._id,
          name: med.name,
          brand: med.brand || 'Generic',
          batchNumber: med.batchNumber,
          daysLeft: diffDays,
          message: `Batch ${med.batchNumber} has expired (${Math.abs(diffDays)} days ago)`,
        });
      } else if (isExpiring7) {
        expiringIn7DaysCount += 1;
        expiringIn30DaysCount += 1;
        urgentAlerts.push({
          type: 'critical_expiry',
          severity: 'critical',
          medicineId: med._id,
          name: med.name,
          brand: med.brand || 'Generic',
          batchNumber: med.batchNumber,
          daysLeft: diffDays,
          message: `Urgent: Batch ${med.batchNumber} expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
        });
        upcomingExpiryReminders.push({
          _id: med._id,
          name: med.name,
          brand: med.brand || 'Generic',
          batchNumber: med.batchNumber,
          category: med.category,
          quantity: qty,
          unit: med.unit || 'Units',
          expiryDate: med.expiryDate,
          daysLeft: diffDays,
          urgency: 'high',
        });
      } else if (isExpiring30) {
        expiringIn30DaysCount += 1;
        urgentAlerts.push({
          type: 'warning_expiry',
          severity: 'warning',
          medicineId: med._id,
          name: med.name,
          brand: med.brand || 'Generic',
          batchNumber: med.batchNumber,
          daysLeft: diffDays,
          message: `Expiring soon in ${diffDays} days`,
        });
        upcomingExpiryReminders.push({
          _id: med._id,
          name: med.name,
          brand: med.brand || 'Generic',
          batchNumber: med.batchNumber,
          category: med.category,
          quantity: qty,
          unit: med.unit || 'Units',
          expiryDate: med.expiryDate,
          daysLeft: diffDays,
          urgency: 'medium',
        });
      } else {
        safeCount += 1;
        if (diffDays <= 60) {
          upcomingExpiryReminders.push({
            _id: med._id,
            name: med.name,
            brand: med.brand || 'Generic',
            batchNumber: med.batchNumber,
            category: med.category,
            quantity: qty,
            unit: med.unit || 'Units',
            expiryDate: med.expiryDate,
            daysLeft: diffDays,
            urgency: 'low',
          });
        }
      }

      if (isLowStock && qty > 0) {
        urgentAlerts.push({
          type: 'low_stock',
          severity: 'warning',
          medicineId: med._id,
          name: med.name,
          brand: med.brand || 'Generic',
          batchNumber: med.batchNumber,
          quantity: qty,
          threshold,
          message: `Low stock alert: Only ${qty} ${med.unit || 'units'} remaining (Min limit: ${threshold})`,
        });
      }
    });

    // Format category distribution
    const categoryDistribution = Object.keys(categoryCounts).map((cat) => ({
      category: cat,
      count: categoryCounts[cat],
      percentage: totalMedicines > 0 ? Math.round((categoryCounts[cat] / totalMedicines) * 100) : 0,
    }));

    // Stock health breakdown
    const stockBreakdown = {
      adequate: Math.max(0, totalMedicines - lowStockCount - outOfStockCount),
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
    };

    // Expiry breakdown for charts
    const expiryStatusBreakdown = {
      safe: safeCount,
      expiringSoon: expiringIn30DaysCount - expiringIn7DaysCount,
      expiring7: expiringIn7DaysCount,
      expired: expiredCount,
      lowStock: lowStockCount,
    };

    // Sort upcoming expiry reminders (soonest first)
    upcomingExpiryReminders.sort((a, b) => a.daysLeft - b.daysLeft);

    // Recently added medicines (top 6)
    const recentlyAdded = medicines.slice(0, 6).map((med) => {
      const expDate = new Date(med.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      let status = 'Safe';
      if (diffDays <= 0) status = 'Expired';
      else if (diffDays <= 30) status = 'Expiring Soon';
      else if ((med.quantity || 0) <= (med.minStockLevel || 10)) status = 'Low Stock';

      return {
        _id: med._id,
        name: med.name,
        brand: med.brand || 'Generic',
        category: med.category,
        batchNumber: med.batchNumber,
        quantity: med.quantity,
        unit: med.unit || 'Units',
        price: med.price,
        expiryDate: med.expiryDate,
        daysLeft: diffDays,
        status,
        createdAt: med.createdAt,
      };
    });

    // Sort urgent alerts (critical first)
    urgentAlerts.sort((a, b) => {
      const priority = { critical: 1, warning: 2, info: 3 };
      return (priority[a.severity] || 3) - (priority[b.severity] || 3);
    });

    return res.json({
      success: true,
      data: {
        summary: {
          totalMedicines,
          activeMedicines,
          expiredCount,
          expiringIn30DaysCount,
          expiringIn7DaysCount,
          lowStockCount,
          outOfStockCount,
          safeCount,
          totalStockUnits,
          totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
          unreadNotificationsCount,
        },
        categoryDistribution,
        expiryStatusBreakdown,
        stockBreakdown,
        recentlyAdded,
        upcomingExpiryReminders: upcomingExpiryReminders.slice(0, 5),
        urgentAlerts: urgentAlerts.slice(0, 6),
        recentActivity: recentLogs,
      },
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to compile dashboard metrics',
    });
  }
};

module.exports = {
  getDashboardStats,
};
