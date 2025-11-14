const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const { generateMonthlyReport, generateTaxSummary } = require('../services/pdfGenerator');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const { calculateTotalMonthlyIncome, calculateMonthlyExpenses, calculateExpensesByCategory } = require('../services/calculations');

router.get('/monthly-pdf', protectAPI, async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const incomeSources = await Income.find({ userId: req.user._id });
    const totalIncome = calculateTotalMonthlyIncome(incomeSources);

    const expenses = await Expense.find({ userId: req.user._id });
    const totalExpenses = calculateMonthlyExpenses(expenses, targetMonth, targetYear);

    const categoryBreakdown = calculateExpensesByCategory(expenses, targetMonth, targetYear);

    const transactions = expenses.filter(e => {
      const d = new Date(e.paidDate);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const monthName = new Date(targetYear, targetMonth).toLocaleDateString('en-US', { month: 'long' });

    await generateMonthlyReport({
      householdName: req.user.householdName,
      month: monthName,
      year: targetYear,
      totalIncome,
      totalExpenses,
      difference: totalIncome - totalExpenses,
      categoryBreakdown: categoryBreakdown.byCategory,
      transactions
    }, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/tax-summary-pdf', protectAPI, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const targetYear = parseInt(year);

    const expenses = await Expense.find({ userId: req.user._id });

    const categoryTotals = {};

    expenses.forEach(expense => {
      const expenseYear = new Date(expense.paidDate).getFullYear();
      
      if (expenseYear === targetYear) {
        if (!categoryTotals[expense.category]) {
          categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
      }
    });

    await generateTaxSummary({
      householdName: req.user.householdName,
      year: targetYear,
      categoryTotals
    }, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/transactions-csv', protectAPI, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { userId: req.user._id };

    if (startDate || endDate) {
      filter.paidDate = {};
      if (startDate) filter.paidDate.$gte = new Date(startDate);
      if (endDate) filter.paidDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter).sort({ paidDate: -1 });

    let csv = 'Date,Type,Name,Category,Amount,Notes\n';

    expenses.forEach(expense => {
      const date = new Date(expense.paidDate).toLocaleDateString();
      const notes = (expense.notes || '').replace(/,/g, ';');
      csv += `${date},Expense,${expense.name},${expense.category},${expense.amount},"${notes}"\n`;
    });

    const startStr = startDate || 'All';
    const endStr = endDate || 'All';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=Transactions_${startStr}_${endStr}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;