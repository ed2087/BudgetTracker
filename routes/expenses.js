const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseById,
  getExpenseSummary
} = require('../controllers/expenseController');

router.get('/', protectAPI, getAllExpenses);
router.post('/', protectAPI, createExpense);
router.put('/:id', protectAPI, updateExpense);
router.delete('/:id', protectAPI, deleteExpense);
router.get('/summary', protectAPI, getExpenseSummary);
router.get('/:id', protectAPI, getExpenseById);

module.exports = router;