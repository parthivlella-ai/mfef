const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Medicine = require('../models/Medicine');
const mockStore = require('../utils/mockStore');

const isDbConnected = () => mongoose.connection.readyState === 1;

// Helper to generate in-app alerts dynamically without duplicates
const syncUserNotifications = async (userId) => {
  const now = new Date();
  const query = {
    $or: [{ userId }, { createdBy: userId }],
    isDisposed: { $ne: true },
  };

  const medicines = await Medicine.find(query).lean();

  for (const med of medicines) {
    const expDate = new Date(med.expiryDate);
    const diffTime = expDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const qty = Number(med.quantity || 0);
    const threshold = Number(med.minStockLevel || 10);

    // 1. Expired alert
    if (daysLeft <= 0) {
      const periodKey = `${med._id}_EXPIRED`;
      try {
        await Notification.updateOne(
          { userId, periodKey },
          {
            $setOnInsert: {
              userId,
              medicineId: med._id,
              title: `Expired Batch: ${med.name}`,
              message: `Batch ${med.batchNumber} of ${med.name} (${med.brand || 'Generic'}) expired ${Math.abs(daysLeft)} days ago. Decommission required.`,
              type: 'EXPIRED',
              severity: 'critical',
              isRead: false,
              periodKey,
              metadata: {
                batchNumber: med.batchNumber,
                medicineName: med.name,
                daysLeft,
                quantity: qty,
              },
            },
          },
          { upsert: true }
        );
      } catch (err) {
        // duplicate key error is expected and ignored
      }
    }
    // 2. Urgent Expiry: <= 7 Days
    else if (daysLeft <= 7) {
      const periodKey = `${med._id}_EXPIRING_7D`;
      try {
        await Notification.updateOne(
          { userId, periodKey },
          {
            $setOnInsert: {
              userId,
              medicineId: med._id,
              title: `Urgent Expiry: ${med.name} (≤ 7 Days)`,
              message: `Batch ${med.batchNumber} expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Priority rotation needed.`,
              type: 'EXPIRING_7_DAYS',
              severity: 'critical',
              isRead: false,
              periodKey,
              metadata: {
                batchNumber: med.batchNumber,
                medicineName: med.name,
                daysLeft,
                quantity: qty,
              },
            },
          },
          { upsert: true }
        );
      } catch (err) {
        // duplicate key error ignored
      }
    }
    // 3. Expiring Soon: 8 to 30 Days
    else if (daysLeft <= 30) {
      const periodKey = `${med._id}_EXPIRING_30D`;
      try {
        await Notification.updateOne(
          { userId, periodKey },
          {
            $setOnInsert: {
              userId,
              medicineId: med._id,
              title: `Expiring Soon: ${med.name}`,
              message: `Batch ${med.batchNumber} of ${med.name} will expire in ${daysLeft} days.`,
              type: 'EXPIRING_SOON',
              severity: 'warning',
              isRead: false,
              periodKey,
              metadata: {
                batchNumber: med.batchNumber,
                medicineName: med.name,
                daysLeft,
                quantity: qty,
              },
            },
          },
          { upsert: true }
        );
      } catch (err) {
        // duplicate key error ignored
      }
    }

    // 4. Low-Stock Alert
    if (qty <= threshold) {
      const periodKey = `${med._id}_LOW_STOCK`;
      try {
        await Notification.updateOne(
          { userId, periodKey },
          {
            $setOnInsert: {
              userId,
              medicineId: med._id,
              title: `Low Stock Alert: ${med.name}`,
              message: `Only ${qty} ${med.unit || 'units'} remaining for batch ${med.batchNumber} (Safety limit: ${threshold}).`,
              type: 'LOW_STOCK',
              severity: qty === 0 ? 'critical' : 'warning',
              isRead: false,
              periodKey,
              metadata: {
                batchNumber: med.batchNumber,
                medicineName: med.name,
                daysLeft,
                quantity: qty,
              },
            },
          },
          { upsert: true }
        );
      } catch (err) {
        // duplicate key error ignored
      }
    }
  }
};

// @desc    Get user notifications with dynamic sync
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    if (isDbConnected()) {
      // Sync fresh notifications from medicines
      await syncUserNotifications(userId);

      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const unreadCount = await Notification.countDocuments({ userId, isRead: false });

      return res.json({
        success: true,
        count: notifications.length,
        unreadCount,
        data: notifications,
      });
    } else {
      // Fallback in-memory
      return res.json({
        success: true,
        count: 0,
        unreadCount: 0,
        data: [],
      });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    if (isDbConnected()) {
      const notification = await Notification.findOne({ _id: req.params.id, userId });
      if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      const unreadCount = await Notification.countDocuments({ userId, isRead: false });

      return res.json({
        success: true,
        message: 'Notification marked as read',
        unreadCount,
        data: notification,
      });
    } else {
      return res.json({ success: true, message: 'Marked as read' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    if (isDbConnected()) {
      await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return res.json({
        success: true,
        message: 'All notifications marked as read',
        unreadCount: 0,
      });
    } else {
      return res.json({ success: true, message: 'All marked as read', unreadCount: 0 });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;

    if (isDbConnected()) {
      await Notification.findOneAndDelete({ _id: req.params.id, userId });
      const unreadCount = await Notification.countDocuments({ userId, isRead: false });

      return res.json({
        success: true,
        message: 'Notification removed',
        unreadCount,
      });
    } else {
      return res.json({ success: true, message: 'Notification removed' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  syncUserNotifications,
};

