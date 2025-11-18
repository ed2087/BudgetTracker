const mongoose = require('mongoose');

const PendingConfirmationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    required: true,
    enum: ['Income', 'RecurringTemplate']
  },
  name: {
    type: String,
    required: true
  },
  expectedAmount: {
    type: Number,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'skipped', 'snoozed', 'archived'],
    default: 'pending'
  },
  snoozeUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
PendingConfirmationSchema.index({ userId: 1, status: 1 });
PendingConfirmationSchema.index({ dueDate: 1 });
PendingConfirmationSchema.index({ userId: 1, type: 1, referenceId: 1, dueDate: 1 });

// Virtual for checking if overdue
PendingConfirmationSchema.virtual('isOverdue').get(function() {
  if (this.status !== 'pending') return false;
  return new Date() > this.dueDate;
});

PendingConfirmationSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  return Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
});

// Make sure virtuals are included in JSON
PendingConfirmationSchema.set('toJSON', { virtuals: true });
PendingConfirmationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PendingConfirmation', PendingConfirmationSchema);