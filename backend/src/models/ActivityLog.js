const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'MEDICINE_CREATED',
        'MEDICINE_UPDATED',
        'MEDICINE_DELETED',
        'STOCK_ADJUSTED',
        'MEDICINE_DISPOSED',
        'USER_REGISTERED',
        'USER_ROLE_UPDATED',
        'USER_STATUS_UPDATED',
        'USER_DELETED',
        'SYSTEM_BACKUP',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    user: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, default: 'System' },
      role: { type: String, default: 'staff' },
      email: { type: String },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical', 'success'],
      default: 'info',
    },
  },
  {
    timestamps: true,
  }
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;

