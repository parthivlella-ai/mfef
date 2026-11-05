const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['EXPIRED', 'EXPIRING_SOON', 'EXPIRING_7_DAYS', 'LOW_STOCK', 'SYSTEM'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      default: 'warning',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    periodKey: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      batchNumber: String,
      medicineName: String,
      daysLeft: Number,
      quantity: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee no duplicate notifications for the same user, medicine, and period
notificationSchema.index({ userId: 1, periodKey: 1 }, { unique: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

