const { calculateMonthlyIncome, getSpendingStatus, isDateInMonth } = require('../utils/helpers');

const calculateTotalMonthlyIncome = (incomeSources) => {
  return incomeSources
    .filter(source => source.active)
    .reduce((total, source) => {
      return total + calculateMonthlyIncome(source.amount, source.frequency);
    }, 0);
};

const calculateMonthlyExpenses = (expenses, month, year) => {
  return expenses
    .filter(expense => isDateInMonth(expense.paidDate, month, year))
    .reduce((total, expense) => total + expense.amount, 0);
};

const calculateExpensesByCategory = (expenses, month, year) => {
  const byCategory = {};
  const necessities = ['Housing', 'Utilities', 'Transportation', 'Groceries', 'Insurance', 'Debt Payments', 'Healthcare'];
  
  let necessitiesTotal = 0;
  let luxuriesTotal = 0;
  
  expenses
    .filter(expense => isDateInMonth(expense.paidDate, month, year))
    .forEach(expense => {
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
  
  return {
    byCategory,
    necessitiesTotal,
    luxuriesTotal,
    necessitiesPercent: necessitiesTotal,
    luxuriesPercent: luxuriesTotal
  };
};

const calculateCategoryTrend = (expenses, category, currentMonth, currentYear) => {
  const thisMonth = expenses.filter(e => 
    e.category === category && 
    isDateInMonth(e.paidDate, currentMonth, currentYear)
  ).reduce((sum, e) => sum + e.amount, 0);
  
  const lastMonth = new Date(currentYear, currentMonth - 1);
  const lastMonthTotal = expenses.filter(e => 
    e.category === category && 
    isDateInMonth(e.paidDate, lastMonth.getMonth(), lastMonth.getFullYear())
  ).reduce((sum, e) => sum + e.amount, 0);
  
  const threeMonthsAgo = [
    new Date(currentYear, currentMonth),
    new Date(currentYear, currentMonth - 1),
    new Date(currentYear, currentMonth - 2)
  ];
  
  const threeMonthTotal = expenses.filter(e => {
    const expenseDate = new Date(e.paidDate);
    return e.category === category && threeMonthsAgo.some(month => 
      isDateInMonth(expenseDate, month.getMonth(), month.getFullYear())
    );
  }).reduce((sum, e) => sum + e.amount, 0);
  
  const threeMonthAvg = threeMonthTotal / 3;
  
  let percentChange = 0;
  if (lastMonthTotal > 0) {
    percentChange = ((thisMonth - lastMonthTotal) / lastMonthTotal) * 100;
  }
  
  let trend = 'stable';
  if (percentChange > 20) {
    trend = 'up';
  } else if (percentChange < -20) {
    trend = 'down';
  }
  
  if (thisMonth > threeMonthAvg * 1.5) {
    trend = 'spike';
  }
  
  return {
    thisMonth,
    lastMonth: lastMonthTotal,
    threeMonthAvg,
    percentChange,
    trend
  };
};

const findMoneyLeaks = (recurringTemplates) => {
  const luxuryCategories = ['Entertainment', 'Subscriptions', 'Hobbies', 'Other'];
  
  const leaks = recurringTemplates.filter(template => 
    template.active &&
    template.expectedAmount < 100 &&
    template.frequency === 'monthly' &&
    luxuryCategories.includes(template.category)
  );
  
  const monthlyTotal = leaks.reduce((sum, leak) => sum + leak.expectedAmount, 0);
  const yearlyTotal = monthlyTotal * 12;
  
  return {
    leaks,
    monthlyTotal,
    yearlyTotal,
    count: leaks.length
  };
};

const calculateSavingsRate = (expenses, income, months = 3) => {
  const monthlyData = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i);
    const month = targetDate.getMonth();
    const year = targetDate.getFullYear();
    
    const monthExpenses = calculateMonthlyExpenses(expenses, month, year);
    const difference = income - monthExpenses;
    
    monthlyData.push({
      month: targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income,
      expenses: monthExpenses,
      difference
    });
  }
  
  const total = monthlyData.reduce((sum, data) => sum + data.difference, 0);
  
  return {
    monthlyData,
    total,
    trend: monthlyData.length > 1 && monthlyData[monthlyData.length - 1].difference > monthlyData[0].difference ? 'improving' : 'declining'
  };
};

const calculateDailyBalance = (balance, expenses, income, month, year) => {
  const dailyBalances = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let runningBalance = balance.currentBalance;
  
  const sortedHistory = balance.history
    .filter(h => isDateInMonth(h.date, month, year))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    
    const dayChanges = sortedHistory.filter(h => 
      new Date(h.date).getDate() === day
    );
    
    dayChanges.forEach(change => {
      runningBalance += change.change;
    });
    
    dailyBalances.push({
      date: currentDate,
      balance: runningBalance
    });
  }
  
  return dailyBalances;
};

module.exports = {
  calculateTotalMonthlyIncome,
  calculateMonthlyExpenses,
  calculateExpensesByCategory,
  calculateCategoryTrend,
  findMoneyLeaks,
  calculateSavingsRate,
  calculateDailyBalance
};