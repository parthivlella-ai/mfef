const mongoose = require('mongoose');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const ActivityLog = require('../models/ActivityLog');
const mockStore = require('../utils/mockStore');
const { getDbStatus } = require('../config/db');

const isDbConnected = () => mongoose.connection.readyState === 1;

// @desc    Get aggregated Admin Dashboard analytics, platform-wide stats, and chart data
// @route   GET /api/admin/dashboard
// @access  Private (Admin Only)
const getAdminDashboardStats = async (req, res) => {
  try {
    const now = new Date();

    if (isDbConnected()) {
      // 1. User counts
      const totalRegisteredUsers = await User.countDocuments({ role: { $ne: 'admin' } });
      const totalAllUsers = await User.countDocuments();
      const activeUsersCount = await User.countDocuments({ status: 'active' });
      const inactiveUsersCount = await User.countDocuments({ status: 'inactive' });

      // 2. Medicine counts across entire platform
      const totalMedicinesAcrossPlatform = await Medicine.countDocuments({ isDisposed: { $ne: true } });
      const totalExpiredMedicines = await Medicine.countDocuments({
        expiryDate: { $lte: now },
        isDisposed: { $ne: true },
      });

      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const totalExpiringSoonMedicines = await Medicine.countDocuments({
        expiryDate: { $gt: now, $lte: in30Days },
        isDisposed: { $ne: true },
      });

      const totalActiveMedicines = Math.max(0, totalMedicinesAcrossPlatform - totalExpiredMedicines);

      // 3. Recently registered users (passwords never exposed)
      const recentlyRegisteredUsers = await User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();

      // 4. Platform Category Breakdown for Charts
      const categoryAggregation = await Medicine.aggregate([
        { $match: { isDisposed: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } },
        { $sort: { count: -1 } },
      ]);

      const categoryDistribution = categoryAggregation.map((cat) => ({
        category: cat._id || 'Other',
        count: cat.count,
        totalQuantity: cat.totalQuantity,
        percentage: totalMedicinesAcrossPlatform > 0 ? Math.round((cat.count / totalMedicinesAcrossPlatform) * 100) : 0,
      }));

      // 5. Monthly Registration Trend (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const registrationTrend = await User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // 6. Platform Expiry Status Breakdown for Charts
      const expiryDistribution = {
        safe: Math.max(0, totalMedicinesAcrossPlatform - totalExpiredMedicines - totalExpiringSoonMedicines),
        expiringSoon: totalExpiringSoonMedicines,
        expired: totalExpiredMedicines,
      };

      // 7. Recent activity logs
      const recentLogs = await ActivityLog.find().sort({ createdAt: -1 }).limit(8).lean();

      return res.json({
        success: true,
        data: {
          metrics: {
            totalRegisteredUsers,
            totalAllUsers,
            activeUsersCount,
            inactiveUsersCount,
            totalMedicinesAcrossPlatform,
            totalActiveMedicines,
            totalExpiredMedicines,
            totalExpiringSoonMedicines,
          },
          recentlyRegisteredUsers,
          charts: {
            categoryDistribution,
            expiryDistribution,
            userStatusBreakdown: {
              active: activeUsersCount,
              inactive: inactiveUsersCount,
            },
            registrationTrend: registrationTrend.map((r) => ({
              month: r._id,
              count: r.count,
            })),
          },
          recentActivity: recentLogs,
        },
      });
    } else {
      // In-Memory Fallback
      const users = mockStore.getUsers();
      const meds = mockStore.getMedicines();
      const logs = mockStore.getActivityLogs();

      return res.json({
        success: true,
        data: {
          metrics: {
            totalRegisteredUsers: users.filter((u) => u.role !== 'admin').length,
            totalAllUsers: users.length,
            activeUsersCount: users.filter((u) => u.status === 'active').length,
            inactiveUsersCount: users.filter((u) => u.status === 'inactive').length,
            totalMedicinesAcrossPlatform: meds.length,
            totalActiveMedicines: meds.length,
            totalExpiredMedicines: 0,
            totalExpiringSoonMedicines: 0,
          },
          recentlyRegisteredUsers: users.slice(0, 5),
          charts: {
            categoryDistribution: [],
            expiryDistribution: { safe: meds.length, expiringSoon: 0, expired: 0 },
            userStatusBreakdown: { active: users.length, inactive: 0 },
            registrationTrend: [],
          },
          recentActivity: logs.slice(0, 8),
        },
      });
    }
  } catch (error) {
    console.error('Error compiling Admin Dashboard stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    View and search all users with populated medicine statistics
// @route   GET /api/admin/users
// @access  Private (Admin Only)
const getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;

    if (isDbConnected()) {
      let query = {};

      if (search && search.trim() !== '') {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [{ name: regex }, { email: regex }, { pharmacyName: regex }];
      }

      if (role && role !== 'all') {
        query.role = role;
      }

      if (status && status !== 'all') {
        query.status = status;
      }

      // Fetch users without passwords
      const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();

      // Aggregate medicine statistics for each user
      const userIds = users.map((u) => u._id);
      const now = new Date();

      const userMedicineStats = await Medicine.aggregate([
        {
          $match: {
            $or: [{ userId: { $in: userIds } }, { createdBy: { $in: userIds } }],
            isDisposed: { $ne: true },
          },
        },
        {
          $group: {
            _id: '$userId',
            totalMedicines: { $sum: 1 },
            totalQuantity: { $sum: '$quantity' },
            expiredMedicines: {
              $sum: { $cond: [{ $lte: ['$expiryDate', now] }, 1, 0] },
            },
          },
        },
      ]);

      const statsMap = {};
      userMedicineStats.forEach((stat) => {
        if (stat._id) statsMap[String(stat._id)] = stat;
      });

      const enrichedUsers = users.map((u) => {
        const s = statsMap[String(u._id)] || { totalMedicines: 0, totalQuantity: 0, expiredMedicines: 0 };
        return {
          ...u,
          stats: {
            medicineCount: s.totalMedicines,
            totalQuantity: s.totalQuantity,
            expiredCount: s.expiredMedicines,
          },
        };
      });

      return res.json({ success: true, count: enrichedUsers.length, data: enrichedUsers });
    } else {
      let users = mockStore.getUsers().map((u) => {
        const copy = { ...u };
        delete copy.password;
        delete copy.plainPassword;
        return {
          ...copy,
          stats: { medicineCount: 0, totalQuantity: 0, expiredCount: 0 },
        };
      });

      if (search && search.trim() !== '') {
        const s = search.toLowerCase().trim();
        users = users.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
      }

      return res.json({ success: true, count: users.length, data: users });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    View specific user medicine statistics
// @route   GET /api/admin/users/:id/stats
// @access  Private (Admin Only)
const getUserMedicineStats = async (req, res) => {
  try {
    const userId = req.params.id;

    if (isDbConnected()) {
      const user = await User.findById(userId).select('-password').lean();
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const medicines = await Medicine.find({
        $or: [{ userId }, { createdBy: userId }],
        isDisposed: { $ne: true },
      }).lean();

      const now = new Date();
      let totalStock = 0;
      let expiredCount = 0;
      let lowStockCount = 0;

      medicines.forEach((m) => {
        totalStock += Number(m.quantity || 0);
        if (new Date(m.expiryDate) <= now) expiredCount += 1;
        if (Number(m.quantity || 0) <= Number(m.minStockLevel || 10)) lowStockCount += 1;
      });

      return res.json({
        success: true,
        data: {
          user,
          stats: {
            totalMedicines: medicines.length,
            activeMedicines: Math.max(0, medicines.length - expiredCount),
            expiredCount,
            lowStockCount,
            totalStock,
          },
          medicines: medicines.slice(0, 10),
        },
      });
    } else {
      return res.status(404).json({ success: false, message: 'Database required' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Activate or deactivate user account
// @route   PUT or PATCH /api/admin/users/:id/status
// @access  Private (Admin Only)
const toggleUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status specified. Must be "active" or "inactive".' });
    }

    if (isDbConnected()) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Security: Admin cannot deactivate their own active account
      if (String(user._id) === String(req.user._id) && status === 'inactive') {
        return res.status(400).json({
          success: false,
          message: 'You cannot deactivate your own administrative account.',
        });
      }

      user.status = status;
      await user.save();

      await ActivityLog.create({
        action: 'USER_STATUS_UPDATED',
        title: 'User Account Status Changed',
        description: `Account for ${user.name} (${user.email}) was set to "${status}".`,
        user: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role,
          email: req.user.email,
        },
        severity: status === 'inactive' ? 'warning' : 'info',
      });

      return res.json({
        success: true,
        message: `User account is now ${status}`,
        data: { _id: user._id, name: user.name, status: user.status },
      });
    } else {
      const updated = mockStore.updateUser(req.params.id, { status });
      return res.json({
        success: true,
        message: `User account is now ${status}`,
        data: { _id: updated._id, name: updated.name, status: updated.status },
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin Only)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Supported roles are "user" and "admin".' });
    }

    if (isDbConnected()) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Security: Admin cannot demote themselves
      if (String(user._id) === String(req.user._id) && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'You cannot remove your own administrator privileges.',
        });
      }

      user.role = role;
      await user.save();

      await ActivityLog.create({
        action: 'USER_ROLE_UPDATED',
        title: 'User Role Changed',
        description: `Role for ${user.name} (${user.email}) updated to "${role}".`,
        user: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role,
          email: req.user.email,
        },
        severity: 'info',
      });

      return res.json({
        success: true,
        message: `User role updated to ${role} successfully`,
        data: { _id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } else {
      const updated = mockStore.updateUser(req.params.id, { role });
      return res.json({
        success: true,
        message: `User role updated to ${role} successfully`,
        data: { _id: updated._id, name: updated.name, email: updated.email, role: updated.role },
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user account with confirmation
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin Only)
const deleteUser = async (req, res) => {
  try {
    const targetId = req.params.id;

    if (isDbConnected()) {
      const user = await User.findById(targetId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User account not found' });
      }

      // Security: Admin cannot delete themselves
      if (String(user._id) === String(req.user._id)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own administrator account',
        });
      }

      const userName = user.name;
      const userEmail = user.email;

      // Delete user
      await User.findByIdAndDelete(targetId);

      // Clean up / decommission user medicines
      await Medicine.deleteMany({ userId: targetId });

      await ActivityLog.create({
        action: 'USER_DELETED',
        title: 'User Account Purged',
        description: `User account for ${userName} (${userEmail}) was removed by ${req.user.name}.`,
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
        message: `User "${userName}" and associated records were permanently removed.`,
      });
    } else {
      mockStore.deleteUser(targetId);
      return res.json({ success: true, message: 'User account removed successfully' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get full activity audit log trail
// @route   GET /api/admin/audit-logs
// @access  Private (Admin Only)
const getAuditLogs = async (req, res) => {
  try {
    const { action, severity, limit = 50 } = req.query;

    if (isDbConnected()) {
      let query = {};
      if (action && action !== 'All') query.action = action;
      if (severity && severity !== 'All') query.severity = severity;

      const logs = await ActivityLog.find(query).sort({ createdAt: -1 }).limit(Number(limit));
      return res.json({ success: true, count: logs.length, data: logs });
    } else {
      const logs = mockStore.getActivityLogs();
      return res.json({ success: true, count: logs.length, data: logs.slice(0, Number(limit)) });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    System health & diagnostics
// @route   GET /api/admin/system-health
// @access  Private (Admin Only)
const getSystemHealth = async (req, res) => {
  try {
    const dbStatus = getDbStatus();
    const memoryUsage = process.memoryUsage();

    let totalUsers = 0;
    let totalMedicines = 0;
    let totalLogs = 0;

    if (isDbConnected()) {
      totalUsers = await User.countDocuments();
      totalMedicines = await Medicine.countDocuments();
      totalLogs = await ActivityLog.countDocuments();
    } else {
      totalUsers = mockStore.getUsers().length;
      totalMedicines = mockStore.getMedicines().length;
      totalLogs = mockStore.getActivityLogs().length;
    }

    return res.json({
      success: true,
      data: {
        server: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          platform: process.platform,
          memoryMb: Math.round(memoryUsage.rss / (1024 * 1024)),
          env: process.env.NODE_ENV || 'development',
        },
        database: dbStatus,
        inventoryHealth: {
          totalUsers,
          totalMedicines,
          totalLogs,
          status: 'Optimal',
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminDashboardStats,
  getAllUsers,
  getUserMedicineStats,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAuditLogs,
  getSystemHealth,
};
