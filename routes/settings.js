const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const User = require('../models/User');
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
    const income = await Income.find({ userId: req.user._id });
    const expenses = await Expense.find({ userId: req.user._id });
    const recurring = await RecurringTemplate.find({ userId: req.user._id });
    const confirmations = await PendingConfirmation.find({ userId: req.user._id });

    const exportData = {
      user,
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

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// REMOVED: /balance/update endpoint
// REMOVED: /balance endpoint
// REMOVED: /balance/history endpoint

module.exports = router;