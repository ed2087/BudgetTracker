const mongoose = require('mongoose');

const RecurringTemplateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Housing', 'Utilities', 'Transportation', 'Groceries', 
      'Insurance', 'Debt Payments', 'Healthcare',
      'Entertainment', 'Dining Out', 'Clothing', 'Hobbies',
      'Subscriptions', 'Shopping', 'Other'
    ]
  },
  expectedAmount: {
    type: Number,
    required: [true, 'Expected amount is required'],
    min: [0, 'Amount must be positive']
  },
  dueDay: {
    type: Number,
    required: [true, 'Due day is required'],
    min: [1, 'Due day must be between 1 and 31'],
    max: [31, 'Due day must be between 1 and 31']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: ['weekly', 'biweekly', 'monthly', 'yearly']
  },
  active: {
    type: Boolean,
    default: true
  },
  autoPrompt: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

RecurringTemplateSchema.index({ userId: 1 });
RecurringTemplateSchema.index({ dueDay: 1 });
RecurringTemplateSchema.index({ active: 1 });

module.exports = mongoose.model('RecurringTemplate', RecurringTemplateSchema);