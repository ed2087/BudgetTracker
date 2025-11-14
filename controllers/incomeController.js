const Income = require('../models/Income');
const PendingConfirmation = require('../models/PendingConfirmation');
const Balance = require('../models/Balance');
const { calculateTotalMonthlyIncome } = require('../services/calculations');
const { calculateNextPayday, validateAmount, validateDate } = require('../utils/helpers');

exports.getAllIncome = async (req, res) => {
  try {
    const incomeSources = await Income.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const totalMonthly = calculateTotalMonthlyIncome(incomeSources);

    res.json({
      success: true,
      incomeSources,
      totalMonthly
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createIncome = async (req, res) => {
  try {
    const { sourceName, amount, frequency, nextPayday, active } = req.body;

    if (!sourceName || !amount || !frequency) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!validateAmount(amount)) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (frequency !== 'irregular' && !nextPayday) {
      return res.status(400).json({ success: false, message: 'Next payday required for regular income' });
    }

    const income = await Income.create({
      userId: req.user._id,
      sourceName,
      amount,
      frequency,
      nextPayday: frequency === 'irregular' ? null : nextPayday,
      active: active !== undefined ? active : true
    });

    res.status(201).json({ success: true, income });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateIncome = async (req, res) => {
  try {
    const { sourceName, amount, frequency, nextPayday, active } = req.body;

    const income = await Income.findOne({ _id: req.params.id, userId: req.user._id });

    if (!income) {
      return res.status(404).json({ success: false, message: 'Income source not found' });
    }

    if (amount && !validateAmount(amount)) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (sourceName) income.sourceName = sourceName;
    if (amount) income.amount = amount;
    if (frequency) income.frequency = frequency;
    if (nextPayday !== undefined) income.nextPayday = frequency === 'irregular' ? null : nextPayday;
    if (active !== undefined) income.active = active;

    await income.save();

    res.json({ success: true, income });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteIncome = async (req, res) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, userId: req.user._id });

    if (!income) {
      return res.status(404).json({ success: false, message: 'Income source not found' });
    }

    await income.deleteOne();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getIncomeHistory = async (req, res) => {
  try {
    const { startDate, endDate, source } = req.query;

    const filter = { userId: req.user._id, status: 'confirmed' };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (source) {
      filter.referenceId = source;
    }

    const history = await PendingConfirmation.find({ ...filter, type: 'income' })
      .populate('referenceId')
      .sort({ createdAt: -1 });

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};