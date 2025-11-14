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
    enum: ['pending', 'confirmed', 'skipped', 'snoozed'],
    default: 'pending'
  },
  snoozeUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

PendingConfirmationSchema.index({ userId: 1 });
PendingConfirmationSchema.index({ status: 1 });
PendingConfirmationSchema.index({ dueDate: 1 });
PendingConfirmationSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PendingConfirmation', PendingConfirmationSchema);