const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const User = require('../models/User');
const Balance = require('../models/Balance');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const RecurringTemplate = require('../models/RecurringTemplate');
const PendingConfirmation = require('../models/PendingConfirmation');

router.get('/', protectAPI, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      householdName: user.householdName,
      username: user.username,
      preferences: user.preferences
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/household', protectAPI, async (req, res) => {
  try {
    const { householdName } = req.body;

    if (!householdName) {
      return res.status(400).json({ success: false, message: 'Household name required' });
    }

    const user = await User.findById(req.user._id);
    user.householdName = householdName;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/password', protectAPI, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/preferences', protectAPI, async (req, res) => {
  try {
    const { reminderFrequency, lowBalanceThreshold } = req.body;

    const user = await User.findById(req.user._id);

    if (reminderFrequency) user.preferences.reminderFrequency = reminderFrequency;
    if (lowBalanceThreshold !== undefined) user.preferences.lowBalanceThreshold = lowBalanceThreshold;

    await user.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/export', protectAPI, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const balance = await Balance.findOne({ userId: req.user._id });
    const income = await Income.find({ userId: req.user._id });
    const expenses = await Expense.find({ userId: req.user._id });
    const recurring = await RecurringTemplate.find({ userId: req.user._id });
    const confirmations = await PendingConfirmation.find({ userId: req.user._id });

    const exportData = {
      user,
      balance,
      income,
      expenses,
      recurring,
      confirmations,
      exportedAt: new Date()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=budget-data-export.json');
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/delete-all', protectAPI, async (req, res) => {
  try {
    const { confirmPassword } = req.body;

    if (!confirmPassword) {
      return res.status(400).json({ success: false, message: 'Password confirmation required' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(confirmPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Password is incorrect' });
    }

    await Income.deleteMany({ userId: req.user._id });
    await Expense.deleteMany({ userId: req.user._id });
    await RecurringTemplate.deleteMany({ userId: req.user._id });
    await PendingConfirmation.deleteMany({ userId: req.user._id });
    
    const balance = await Balance.findOne({ userId: req.user._id });
    if (balance) {
      balance.currentBalance = 0;
      balance.history = [];
      await balance.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/balance/update', protectAPI, async (req, res) => {
  try {
    const { newBalance, reason } = req.body;

    if (newBalance === undefined) {
      return res.status(400).json({ success: false, message: 'New balance required' });
    }

    let balance = await Balance.findOne({ userId: req.user._id });

    if (!balance) {
      balance = await Balance.create({
        userId: req.user._id,
        currentBalance: newBalance,
        lastUpdated: new Date(),
        history: [{
          date: new Date(),
          balance: newBalance,
          change: newBalance,
          reason: reason || 'Initial balance',
          type: 'manual_adjustment'
        }]
      });
    } else {
      const change = newBalance - balance.currentBalance;
      balance.currentBalance = newBalance;
      balance.lastUpdated = new Date();
      balance.history.push({
        date: new Date(),
        balance: newBalance,
        change,
        reason: reason || 'Manual adjustment',
        type: 'manual_adjustment'
      });
      await balance.save();
    }

    res.json({ success: true, balance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/balance', protectAPI, async (req, res) => {
  try {
    const balance = await Balance.findOne({ userId: req.user._id });

    if (!balance) {
      return res.status(404).json({ success: false, message: 'Balance not found' });
    }

    res.json({
      success: true,
      currentBalance: balance.currentBalance,
      lastUpdated: balance.lastUpdated,
      history: balance.history.slice(-20).reverse()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/balance/history', protectAPI, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const balance = await Balance.findOne({ userId: req.user._id });

    if (!balance) {
      return res.status(404).json({ success: false, message: 'Balance not found' });
    }

    let history = balance.history;

    if (startDate || endDate) {
      history = history.filter(entry => {
        const entryDate = new Date(entry.date);
        if (startDate && entryDate < new Date(startDate)) return false;
        if (endDate && entryDate > new Date(endDate)) return false;
        return true;
      });
    }

    res.json({ success: true, history: history.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;