const Expense = require('../models/Expense');
const { validateAmount, validateDate, sanitizeInput } = require('../utils/helpers');

exports.getAllExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category, type, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };

    if (startDate || endDate) {
      filter.paidDate = {};
      if (startDate) filter.paidDate.$gte = new Date(startDate);
      if (endDate) filter.paidDate.$lte = new Date(endDate);
    }

    if (category) filter.category = category;
    if (type) filter.type = type;

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .sort({ paidDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      success: true,
      expenses,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { name, category, amount, paidDate, notes, receiptText, type, templateId, dueDate } = req.body;

    if (!name || !category || !amount || !paidDate || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!validateAmount(amount)) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    if (!validateDate(paidDate)) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    const paidDateObj = new Date(paidDate);
    const dueDateObj = dueDate ? new Date(dueDate) : null;
    const status = dueDateObj && paidDateObj > dueDateObj ? 'late' : 'paid';

    const expense = await Expense.create({
      userId: req.user._id,
      templateId: templateId || null,
      name: sanitizeInput(name),
      category,
      amount,
      dueDate: dueDateObj,
      paidDate: paidDateObj,
      status,
      type,
      receiptText: receiptText ? sanitizeInput(receiptText) : null,
      notes: notes ? sanitizeInput(notes) : null
    });

    // NO BALANCE UPDATE

    res.status(201).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const { name, category, amount, paidDate, notes } = req.body;

    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (name) expense.name = sanitizeInput(name);
    if (category) expense.category = category;
    if (amount && validateAmount(amount)) {
      expense.amount = amount;
    }
    if (paidDate && validateDate(paidDate)) expense.paidDate = new Date(paidDate);
    if (notes !== undefined) expense.notes = sanitizeInput(notes);

    await expense.save();

    // NO BALANCE UPDATE

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    // NO BALANCE UPDATE

    await expense.deleteOne();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getExpenseSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      userId: req.user._id,
      paidDate: { $gte: startDate, $lte: endDate }
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const transactionCount = expenses.length;

    const byCategory = {};
    const necessities = ['Housing', 'Utilities', 'Transportation', 'Groceries', 'Insurance', 'Debt Payments', 'Healthcare'];
    let necessitiesTotal = 0;
    let luxuriesTotal = 0;

    expenses.forEach(expense => {
      if (!byCategory[expense.category]) {
        byCategory[expense.category] = 0;
      }
      byCategory[expense.category] += expense.amount;

      if (necessities.includes(expense.category)) {
        necessitiesTotal += expense.amount;
      } else {
        luxuriesTotal += expense.amount;
      }
    });

    res.json({
      success: true,
      totalExpenses,
      byCategory,
      necessities: necessitiesTotal,
      luxuries: luxuriesTotal,
      transactionCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};