const RecurringTemplate = require('../models/RecurringTemplate');
const Expense = require('../models/Expense');
const PendingConfirmation = require('../models/PendingConfirmation');
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

    // ===== AUTO-CREATE PENDING CONFIRMATION FOR CURRENT MONTH =====
    if ((autoPrompt !== undefined ? autoPrompt : true) && (active !== undefined ? active : true)) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      
      // Check if confirmation already exists for this month (shouldn't, but safety check)
      const existingConfirmation = await PendingConfirmation.findOne({
        userId: req.user._id,
        type: 'expense',
        referenceId: template._id,
        dueDate: { $gte: monthStart, $lte: monthEnd }
      });
      
      if (!existingConfirmation) {
        const billDueDate = new Date(currentYear, currentMonth, dueDay);
        
        await PendingConfirmation.create({
          userId: req.user._id,
          type: 'expense',
          referenceId: template._id,
          referenceModel: 'RecurringTemplate',
          name: sanitizeInput(name),
          expectedAmount,
          dueDate: billDueDate,
          status: 'pending'
        });
        
        console.log(`✓ Auto-created confirmation for new recurring bill: ${name} (due: ${billDueDate.toDateString()})`);
      }
    }

    res.status(201).json({ success: true, template });
  } catch (error) {
    console.error('Create recurring error:', error);
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