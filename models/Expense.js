const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringTemplate',
    default: null
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
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  dueDate: {
    type: Date,
    default: null
  },
  paidDate: {
    type: Date,
    required: [true, 'Paid date is required']
  },
  status: {
    type: String,
    required: true,
    enum: ['paid', 'late'],
    default: 'paid'
  },
  type: {
    type: String,
    required: true,
    enum: ['recurring', 'one-time']
  },
  receiptText: {
    type: String,
    maxlength: [5000, 'Receipt text too long']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

ExpenseSchema.index({ userId: 1 });
ExpenseSchema.index({ paidDate: 1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ type: 1 });
ExpenseSchema.index({ userId: 1, paidDate: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);