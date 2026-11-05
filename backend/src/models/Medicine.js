const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
      minlength: [2, 'Medicine name must be at least 2 characters long'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'Antibiotics',
    },
    brand: {
      type: String,
      required: [true, 'Brand / Manufacturer name is required'],
      trim: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
      uppercase: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    unit: {
      type: String,
      trim: true,
      default: 'Tablets',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative'],
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // User ID / Owner ID referencing the authenticated user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Retain createdBy as alias for compatibility
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    minStockLevel: {
      type: Number,
      default: 10,
      min: [1, 'Minimum stock level must be at least 1'],
    },
    // Optional storage & dispensing attributes
    storageCondition: {
      type: String,
      default: 'Room Temperature (15-25°C)',
    },
    rackLocation: {
      type: String,
      default: '',
    },
    genericName: {
      type: String,
      default: '',
    },
    prescriptionRequired: {
      type: Boolean,
      default: false,
    },
    disposalDetails: {
      disposedAt: Date,
      reason: String,
      disposedBy: String,
      notes: String,
    },
    isDisposed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically provides createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook: ensure createdBy matches userId, and brand/supplier sync
medicineSchema.pre('save', function (next) {
  if (this.userId && !this.createdBy) {
    this.createdBy = this.userId;
  }
  if (!this.userId && this.createdBy) {
    this.userId = this.createdBy;
  }
  if (!this.genericName && this.name) {
    this.genericName = this.name;
  }
  next();
});

// Virtual field for Days Until Expiry (Dynamic based on actual current date)
medicineSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.expiryDate) return null;
  const now = new Date();
  const exp = new Date(this.expiryDate);
  const diffTime = exp.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual field: Computed Status ('Expired' | 'Expiring Soon' | 'Low Stock' | 'Safe')
medicineSchema.virtual('status').get(function () {
  if (this.isDisposed) return 'Disposed';

  const days = this.daysUntilExpiry;
  if (days === null) return 'Safe';

  if (days <= 0) {
    return 'Expired';
  }

  if (days <= 30) {
    return 'Expiring Soon';
  }

  const threshold = this.minStockLevel || 10;
  if (this.quantity <= threshold) {
    return 'Low Stock';
  }

  return 'Safe';
});

// Virtual boolean flags for fast filtering & badges
medicineSchema.virtual('isExpired').get(function () {
  const days = this.daysUntilExpiry;
  return days !== null && days <= 0;
});

medicineSchema.virtual('isExpiringWithin7Days').get(function () {
  const days = this.daysUntilExpiry;
  return days !== null && days > 0 && days <= 7;
});

medicineSchema.virtual('isExpiringWithin30Days').get(function () {
  const days = this.daysUntilExpiry;
  return days !== null && days > 0 && days <= 30;
});

medicineSchema.virtual('isLowStock').get(function () {
  const threshold = this.minStockLevel || 10;
  return this.quantity <= threshold;
});

const Medicine = mongoose.model('Medicine', medicineSchema);

module.exports = Medicine;
