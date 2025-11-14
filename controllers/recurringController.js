const RecurringTemplate = require('../models/RecurringTemplate');
const Expense = require('../models/Expense');
const { validateAmount, isValidDueDay, sanitizeInput } = require('../utils/helpers');

exports.getAllRecurring = async (req, res) => {
  try {
    const active = await RecurringTemplate.find({ userId: req.user._id, active: true }).sort({ dueDay: 1 });
    const inactive = await RecurringTemplate.find({ userId: req.user._id, active: false }).sort({ dueDay: 1 });

    res.json({ success: true, active, inactive });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createRecurring = async (req, res) => {
  try {
    const { name, category, expectedAmount, dueDay, frequency, autoPrompt, active } = req.body;

    if (!name || !category || !expectedAmount || !dueDay || !frequency) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!validateAmount(expectedAmount)) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (!isValidDueDay(dueDay)) {
      return res.status(400).json({ success: false, message: 'Due day must be between 1 and 31' });
    }

    const template = await RecurringTemplate.create({
      userId: req.user._id,
      name: sanitizeInput(name),
      category,
      expectedAmount,
      dueDay,
      frequency,
      autoPrompt: autoPrompt !== undefined ? autoPrompt : true,
      active: active !== undefined ? active : true
    });

    res.status(201).json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateRecurring = async (req, res) => {
  try {
    const { name, category, expectedAmount, dueDay, frequency, autoPrompt, active } = req.body;

    const template = await RecurringTemplate.findOne({ _id: req.params.id, userId: req.user._id });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    if (name) template.name = sanitizeInput(name);
    if (category) template.category = category;
    if (expectedAmount && validateAmount(expectedAmount)) template.expectedAmount = expectedAmount;
    if (dueDay && isValidDueDay(dueDay)) template.dueDay = dueDay;
    if (frequency) template.frequency = frequency;
    if (autoPrompt !== undefined) template.autoPrompt = autoPrompt;
    if (active !== undefined) template.active = active;

    await template.save();

    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteRecurring = async (req, res) => {
  try {
    const template = await RecurringTemplate.findOne({ _id: req.params.id, userId: req.user._id });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    await template.deleteOne();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getRecurringHistory = async (req, res) => {
  try {
    const template = await RecurringTemplate.findOne({ _id: req.params.id, userId: req.user._id });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const payments = await Expense.find({
      userId: req.user._id,
      templateId: req.params.id
    }).sort({ paidDate: -1 });

    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};