const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getMonthStart = (date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getMonthEnd = (date = new Date()) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

const calculateNextPayday = (frequency, currentDate = new Date()) => {
  const next = new Date(currentDate);
  
  switch(frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }
  
  return next;
};

const calculateMonthlyIncome = (amount, frequency) => {
  switch(frequency) {
    case 'weekly':
      return amount * 4.33;
    case 'biweekly':
      return amount * 2.17;
    case 'monthly':
      return amount;
    case 'irregular':
      return 0;
    default:
      return 0;
  }
};

const isDateInMonth = (date, month, year) => {
  const d = new Date(date);
  return d.getMonth() === month && d.getFullYear() === year;
};

const getSpendingStatus = (expenses, income) => {
  if (income === 0) return { status: 'critical', color: 'red' };
  
  const percentage = (expenses / income) * 100;
  
  if (percentage <= 90) {
    return { status: 'healthy', color: 'green', percentage };
  } else if (percentage <= 99) {
    return { status: 'warning', color: 'yellow', percentage };
  } else if (percentage <= 110) {
    return { status: 'danger', color: 'orange', percentage };
  } else {
    return { status: 'critical', color: 'red', percentage };
  }
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0 && num <= 9999999.99;
};

const validateDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

const getDaysInMonth = (month, year) => {
  return new Date(year, month + 1, 0).getDate();
};

const isValidDueDay = (day) => {
  return Number.isInteger(day) && day >= 1 && day <= 31;
};

module.exports = {
  formatCurrency,
  formatDate,
  formatDateTime,
  getMonthStart,
  getMonthEnd,
  calculateNextPayday,
  calculateMonthlyIncome,
  isDateInMonth,
  getSpendingStatus,
  sanitizeInput,
  validateAmount,
  validateDate,
  getDaysInMonth,
  isValidDueDay
};