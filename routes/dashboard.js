const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const PendingConfirmation = require('../models/PendingConfirmation');
const Balance = require('../models/Balance');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const RecurringTemplate = require('../models/RecurringTemplate');
const { calculateTotalMonthlyIncome, calculateMonthlyExpenses } = require('../services/calculations');
const { getSpendingStatus } = require('../utils/helpers');

router.get('/stats', protectAPI, async (req, res) => {
  try {
    const balance = await Balance.findOne({ userId: req.user._id });
    const incomeSources = await Income.find({ userId: req.user._id });
    const expenses = await Expense.find({ userId: req.user._id });

    const now = new Date();
    const monthlyIncome = calculateTotalMonthlyIncome(incomeSources);
    const monthlyExpenses = calculateMonthlyExpenses(expenses, now.getMonth(), now.getFullYear());
    const netDifference = monthlyIncome - monthlyExpenses;
    const status = getSpendingStatus(monthlyExpenses, monthlyIncome);

    const pendingCount = await PendingConfirmation.countDocuments({
      userId: req.user._id,
      status: 'pending'
    });

    res.json({
      success: true,
      currentBalance: balance ? balance.currentBalance : 0,
      monthlyIncome,
      monthlyExpenses,
      netDifference,
      status: status.status,
      statusMessage: getStatusMessage(status),
      pendingCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/pending', protectAPI, async (req, res) => {
  try {
    const incomeConfirmations = await PendingConfirmation.find({
      userId: req.user._id,
      type: 'income',
      status: 'pending'
    }).populate('referenceId').sort({ dueDate: 1 });

    const expenseConfirmations = await PendingConfirmation.find({
      userId: req.user._id,
      type: 'expense',
      status: 'pending'
    }).populate('referenceId').sort({ dueDate: 1 });

    res.json({
      success: true,
      incomeConfirmations,
      expenseConfirmations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/upcoming', protectAPI, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const upcomingBills = await RecurringTemplate.find({
      userId: req.user._id,
      active: true,
      dueDay: {
        $gte: now.getDate(),
        $lte: now.getDate() + parseInt(days)
      }
    }).sort({ dueDay: 1 });

    res.json({ success: true, upcomingBills });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/recent', protectAPI, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentExpenses = await Expense.find({ userId: req.user._id })
      .sort({ paidDate: -1 })
      .limit(parseInt(limit));

    const balance = await Balance.findOne({ userId: req.user._id });
    const recentActivity = balance && balance.history.length > 0
      ? balance.history.slice(-parseInt(limit)).reverse()
      : [];

    res.json({ success: true, recentActivity, recentExpenses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function getStatusMessage(status) {
  const percentage = Math.round(status.percentage);
  
  switch(status.status) {
    case 'healthy':
      return `You're spending ${percentage}% of your income. Keep it up.`;
    case 'warning':
      return `You're spending ${percentage}% of your income. You're barely saving anything.`;
    case 'danger':
      return `⚠️ You're spending ${percentage}% of your income. This cannot continue.`;
    case 'critical':
      return `🔥 YOU'RE BLEEDING MONEY. You're spending ${percentage}% of your income. Cut expenses NOW.`;
    default:
      return 'Check your spending.';
  }
}



module.exports = router;