const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const PendingConfirmation = require('../models/PendingConfirmation');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const RecurringTemplate = require('../models/RecurringTemplate');
const { calculateMonthlyExpenses } = require('../services/calculations');

router.get('/stats', protectAPI, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get all expenses for current month
    const expenses = await Expense.find({ userId: req.user._id });
    const totalExpenses = calculateMonthlyExpenses(expenses, currentMonth, currentYear);

    // Get CONFIRMED income only (from confirmed pending confirmations)
    const confirmedIncomeRecords = await PendingConfirmation.find({
      userId: req.user._id,
      type: 'income',
      status: 'confirmed',
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lte: new Date(currentYear, currentMonth + 1, 0)
      }
    });
    
    const confirmedIncome = confirmedIncomeRecords.reduce((sum, record) => sum + record.expectedAmount, 0);

    // Calculate left this month
    const leftThisMonth = confirmedIncome - totalExpenses;

    // Get upcoming bills (pending expense confirmations)
    const upcomingBills = await PendingConfirmation.find({
      userId: req.user._id,
      type: 'expense',
      status: 'pending'
    });
    
    const upcomingBillsTotal = upcomingBills.reduce((sum, bill) => sum + bill.expectedAmount, 0);

    // Calculate after bills
    const afterBills = leftThisMonth - upcomingBillsTotal;

    // Determine status
    const percentage = confirmedIncome > 0 ? (totalExpenses / confirmedIncome) * 100 : 0;
    let status = 'healthy';
    let statusMessage = '';

    if (percentage <= 50) {
      status = 'healthy';
      statusMessage = `You're spending ${Math.round(percentage)}% of your income. Keep it up.`;
    } else if (percentage <= 75) {
      status = 'warning';
      statusMessage = `You're spending ${Math.round(percentage)}% of your income. Watch your spending.`;
    } else if (percentage <= 100) {
      status = 'danger';
      statusMessage = `⚠️ You're spending ${Math.round(percentage)}% of your income. Cut back now.`;
    } else {
      status = 'critical';
      statusMessage = `🔥 YOU'RE SPENDING ${Math.round(percentage)}% OF YOUR INCOME. You're losing money!`;
    }

    // Get pending confirmations count
    const pendingCount = await PendingConfirmation.countDocuments({
      userId: req.user._id,
      status: 'pending'
    });

    res.json({
      success: true,
      confirmedIncome,
      totalExpenses,
      leftThisMonth,
      upcomingBillsTotal,
      afterBills,
      status,
      statusMessage,
      pendingCount
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
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
    const currentDay = now.getDate();
    const futureDay = currentDay + parseInt(days);

    const upcomingBills = await RecurringTemplate.find({
      userId: req.user._id,
      active: true,
      dueDay: {
        $gte: currentDay,
        $lte: futureDay
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

    // Get recent confirmed income
    const recentIncome = await PendingConfirmation.find({
      userId: req.user._id,
      type: 'income',
      status: 'confirmed'
    })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));

    // Combine and format recent activity
    const recentActivity = [];
    
    recentIncome.forEach(income => {
      recentActivity.push({
        date: income.updatedAt,
        reason: `Income: ${income.name}`,
        change: income.expectedAmount,
        type: 'income'
      });
    });

    recentExpenses.forEach(expense => {
      recentActivity.push({
        date: expense.paidDate,
        reason: `Expense: ${expense.name}`,
        change: -expense.amount,
        type: 'expense'
      });
    });

    // Sort by date
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ 
      success: true, 
      recentActivity: recentActivity.slice(0, parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;