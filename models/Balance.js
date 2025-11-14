const mongoose = require('mongoose');

const BalanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  currentBalance: {
    type: Number,
    required: true,
    default: 0
  },
  lastUpdated: {
    type: Date,
    required: true,
    default: Date.now
  },
  history: [{
    date: {
      type: Date,
      required: true
    },
    balance: {
      type: Number,
      required: true
    },
    change: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense', 'manual_adjustment']
    }
  }]
}, {
  timestamps: true
});

BalanceSchema.index({ userId: 1 });

module.exports = mongoose.model('Balance', BalanceSchema);