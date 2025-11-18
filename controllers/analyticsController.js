const Expense = require('../models/Expense');
const Income = require('../models/Income');
const RecurringTemplate = require('../models/RecurringTemplate');
const PendingConfirmation = require('../models/PendingConfirmation');
const {
  calculateMonthlyExpenses,
  calculateExpensesByCategory,
  calculateCategoryTrend,
  findMoneyLeaks
} = require('../services/calculations');
const { getSpendingStatus } = require('../utils/helpers');

exports.getOverview = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get CONFIRMED income only
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

    // Get expenses
    const expenses = await Expense.find({ userId: req.user._id });
    const totalExpenses = calculateMonthlyExpenses(expenses, currentMonth, currentYear);

    // Calculate left this month
    const leftThisMonth = confirmedIncome - totalExpenses;

    // Get upcoming bills
    const upcomingBills = await PendingConfirmation.find({
      userId: req.user._id,
      type: 'expense',
      status: 'pending'
    });
    
    const upcomingBillsTotal = upcomingBills.reduce((sum, bill) => sum + bill.expectedAmount, 0);
    const afterBills = leftThisMonth - upcomingBillsTotal;

    // Get status
    const status = getSpendingStatus(totalExpenses, confirmedIncome);

    // Last 6 months data
    const lastSixMonths = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      // Get confirmed income for this month
      const monthConfirmedIncome = await PendingConfirmation.find({
        userId: req.user._id,
        type: 'income',
        status: 'confirmed',
        createdAt: {
          $gte: new Date(year, month, 1),
          $lte: new Date(year, month + 1, 0)
        }
      });
      
      const monthIncome = monthConfirmedIncome.reduce((sum, record) => sum + record.expectedAmount, 0);
      const monthExpenses = calculateMonthlyExpenses(expenses, month, year);
      
      lastSixMonths.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: monthIncome,
        expenses: monthExpenses
      });
    }

    // Category breakdown
    const categoryBreakdown = calculateExpensesByCategory(expenses, currentMonth, currentYear);

    // Category trends
    const categories = ['Housing', 'Groceries', 'Transportation', 'Utilities', 'Entertainment', 'Subscriptions'];
    const trends = {};
    
    categories.forEach(category => {
      trends[category] = calculateCategoryTrend(expenses, category, currentMonth, currentYear);
    });

    // Money leaks
    const recurringTemplates = await RecurringTemplate.find({ userId: req.user._id });
    const moneyLeaks = findMoneyLeaks(recurringTemplates);

    // Savings rate (last 3 months)
    const savingsMonthlyData = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthConfirmedIncome = await PendingConfirmation.find({
        userId: req.user._id,
        type: 'income',
        status: 'confirmed',
        createdAt: {
          $gte: new Date(year, month, 1),
          $lte: new Date(year, month + 1, 0)
        }
      });
      
      const monthIncome = monthConfirmedIncome.reduce((sum, record) => sum + record.expectedAmount, 0);
      const monthExpenses = calculateMonthlyExpenses(expenses, month, year);
      
      savingsMonthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: monthIncome,
        expenses: monthExpenses,
        difference: monthIncome - monthExpenses
      });
    }
    
    const savingsTotal = savingsMonthlyData.reduce((sum, data) => sum + data.difference, 0);

    res.json({
      success: true,
      currentMonth: {
        income: confirmedIncome,
        expenses: totalExpenses,
        difference: leftThisMonth,
        upcomingBills: upcomingBillsTotal,
        afterBills: afterBills,
        status
      },
      lastSixMonths,
      categoryBreakdown,
      trends,
      moneyLeaks,
      savingsRate: {
        monthlyData: savingsMonthlyData,
        total: savingsTotal,
        trend: savingsMonthlyData.length > 1 && savingsMonthlyData[savingsMonthlyData.length - 1].difference > savingsMonthlyData[0].difference ? 'improving' : 'declining'
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
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
    // This endpoint is no longer relevant without balance tracking
    // Return empty or remove endpoint
    res.json({ 
      success: false, 
      message: 'Balance tracking has been removed. Use income/expense tracking instead.' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};