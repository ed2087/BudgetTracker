const mongoose = require('mongoose');

const IncomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sourceName: {
    type: String,
    required: [true, 'Source name is required'],
    trim: true,
    maxlength: [100, 'Source name cannot exceed 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: ['weekly', 'biweekly', 'monthly', 'irregular']
  },
  nextPayday: {
    type: Date,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

IncomeSchema.index({ userId: 1 });
IncomeSchema.index({ nextPayday: 1 });
IncomeSchema.index({ active: 1 });

module.exports = mongoose.model('Income', IncomeSchema);