const Expense = require('../models/Expense');
const Income = require('../models/Income');
const RecurringTemplate = require('../models/RecurringTemplate');
const Balance = require('../models/Balance');
const {
  calculateTotalMonthlyIncome,
  calculateMonthlyExpenses,
  calculateExpensesByCategory,
  calculateCategoryTrend,
  findMoneyLeaks,
  calculateSavingsRate,
  calculateDailyBalance
} = require('../services/calculations');
const { getSpendingStatus } = require('../utils/helpers');

exports.getOverview = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const incomeSources = await Income.find({ userId: req.user._id });
    const totalIncome = calculateTotalMonthlyIncome(incomeSources);

    const expenses = await Expense.find({ userId: req.user._id });
    const totalExpenses = calculateMonthlyExpenses(expenses, currentMonth, currentYear);

    const difference = totalIncome - totalExpenses;
    const status = getSpendingStatus(totalExpenses, totalIncome);

    const lastSixMonths = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      lastSixMonths.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: totalIncome,
        expenses: calculateMonthlyExpenses(expenses, month, year)
      });
    }

    const categoryBreakdown = calculateExpensesByCategory(expenses, currentMonth, currentYear);

    const categories = ['Housing', 'Groceries', 'Transportation', 'Utilities', 'Entertainment', 'Subscriptions'];
    const trends = {};
    
    categories.forEach(category => {
      trends[category] = calculateCategoryTrend(expenses, category, currentMonth, currentYear);
    });

    const recurringTemplates = await RecurringTemplate.find({ userId: req.user._id });
    const moneyLeaks = findMoneyLeaks(recurringTemplates);

    const savingsRate = calculateSavingsRate(expenses, totalIncome, 3);

    res.json({
      success: true,
      currentMonth: {
        income: totalIncome,
        expenses: totalExpenses,
        difference,
        status
      },
      lastSixMonths,
      categoryBreakdown,
      trends,
      moneyLeaks,
      savingsRate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getCategoryTrends = async (req, res) => {
  try {
    const { months = 3 } = req.query;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const expenses = await Expense.find({ userId: req.user._id });

    const categories = [...new Set(expenses.map(e => e.category))];
    const trends = {};

    categories.forEach(category => {
      trends[category] = calculateCategoryTrend(expenses, category, currentMonth, currentYear);
    });

    res.json({ success: true, categories: trends });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getYearComparison = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const currentYear = parseInt(year);
    const lastYear = currentYear - 1;

    const expenses = await Expense.find({ userId: req.user._id });

    const currentYearData = {};
    const lastYearData = {};

    for (let month = 0; month < 12; month++) {
      const monthName = new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' });
      
      currentYearData[monthName] = calculateMonthlyExpenses(expenses, month, currentYear);
      lastYearData[monthName] = calculateMonthlyExpenses(expenses, month, lastYear);
    }

    const currentYearTotal = Object.values(currentYearData).reduce((sum, val) => sum + val, 0);
    const lastYearTotal = Object.values(lastYearData).reduce((sum, val) => sum + val, 0);
    const difference = currentYearTotal - lastYearTotal;

    const categoryComparison = {};
    const categories = [...new Set(expenses.map(e => e.category))];

    categories.forEach(category => {
      const currentYearCat = expenses
        .filter(e => new Date(e.paidDate).getFullYear() === currentYear && e.category === category)
        .reduce((sum, e) => sum + e.amount, 0);
      
      const lastYearCat = expenses
        .filter(e => new Date(e.paidDate).getFullYear() === lastYear && e.category === category)
        .reduce((sum, e) => sum + e.amount, 0);

      categoryComparison[category] = {
        currentYear: currentYearCat,
        lastYear: lastYearCat,
        difference: currentYearCat - lastYearCat,
        percentChange: lastYearCat > 0 ? ((currentYearCat - lastYearCat) / lastYearCat * 100) : 0
      };
    });

    res.json({
      success: true,
      currentYear: {
        year: currentYear,
        total: currentYearTotal,
        byMonth: currentYearData
      },
      lastYear: {
        year: lastYear,
        total: lastYearTotal,
        byMonth: lastYearData
      },
      comparison: {
        difference,
        percentChange: lastYearTotal > 0 ? (difference / lastYearTotal * 100) : 0,
        byCategory: categoryComparison
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDailyBalance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const balance = await Balance.findOne({ userId: req.user._id });

    if (!balance) {
      return res.status(404).json({ success: false, message: 'Balance not found' });
    }

    const expenses = await Expense.find({ userId: req.user._id });
    const income = await Income.find({ userId: req.user._id });

    const dailyBalances = calculateDailyBalance(balance, expenses, income, targetMonth, targetYear);

    res.json({ success: true, dailyBalances });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};