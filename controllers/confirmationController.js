const PendingConfirmation = require('../models/PendingConfirmation');
const Expense = require('../models/Expense');
const Balance = require('../models/Balance');
const RecurringTemplate = require('../models/RecurringTemplate');
const Income = require('../models/Income');

exports.getAllConfirmations = async (req, res) => {
  try {
    const pending = await PendingConfirmation.find({
      userId: req.user._id,
      status: 'pending'
    })
      .populate('referenceId')
      .sort({ dueDate: 1 });

    const snoozed = await PendingConfirmation.find({
      userId: req.user._id,
      status: 'snoozed',
      snoozeUntil: { $lte: new Date() }
    })
      .populate('referenceId')
      .sort({ dueDate: 1 });

    res.json({ success: true, pending, snoozed });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.confirmConfirmation = async (req, res) => {
  try {
    const { actualAmount, actualDate } = req.body;

    const confirmation = await PendingConfirmation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!confirmation) {
      return res.status(404).json({ success: false, message: 'Confirmation not found' });
    }

    const amount = actualAmount || confirmation.expectedAmount;
    const date = actualDate ? new Date(actualDate) : confirmation.dueDate;

    if (confirmation.type === 'income') {
      const balance = await Balance.findOne({ userId: req.user._id });

      if (balance) {
        balance.currentBalance += amount;
        balance.lastUpdated = new Date();
        balance.history.push({
          date: new Date(),
          balance: balance.currentBalance,
          change: amount,
          reason: `Income: ${confirmation.name}`,
          type: 'income'
        });
        await balance.save();
      }
    } else if (confirmation.type === 'expense') {
      const template = await RecurringTemplate.findById(confirmation.referenceId);

      const expense = await Expense.create({
        userId: req.user._id,
        templateId: confirmation.referenceId,
        name: confirmation.name,
        category: template.category,
        amount,
        dueDate: confirmation.dueDate,
        paidDate: date,
        status: date > confirmation.dueDate ? 'late' : 'paid',
        type: 'recurring'
      });

      const balance = await Balance.findOne({ userId: req.user._id });

      if (balance) {
        balance.currentBalance -= amount;
        balance.lastUpdated = new Date();
        balance.history.push({
          date: new Date(),
          balance: balance.currentBalance,
          change: -amount,
          reason: `Expense: ${confirmation.name}`,
          type: 'expense'
        });
        await balance.save();
      }
    }

    confirmation.status = 'confirmed';
    await confirmation.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.snoozeConfirmation = async (req, res) => {
  try {
    const { snoozeUntil } = req.body;

    if (!snoozeUntil) {
      return res.status(400).json({ success: false, message: 'Snooze date required' });
    }

    const confirmation = await PendingConfirmation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!confirmation) {
      return res.status(404).json({ success: false, message: 'Confirmation not found' });
    }

    confirmation.status = 'snoozed';
    confirmation.snoozeUntil = new Date(snoozeUntil);
    await confirmation.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.skipConfirmation = async (req, res) => {
  try {
    const confirmation = await PendingConfirmation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!confirmation) {
      return res.status(404).json({ success: false, message: 'Confirmation not found' });
    }

    confirmation.status = 'skipped';
    await confirmation.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateConfirmationAmount = async (req, res) => {
  try {
    const { actualAmount } = req.body;

    if (!actualAmount) {
      return res.status(400).json({ success: false, message: 'Amount required' });
    }

    const confirmation = await PendingConfirmation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!confirmation) {
      return res.status(404).json({ success: false, message: 'Confirmation not found' });
    }

    confirmation.expectedAmount = actualAmount;
    await confirmation.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};