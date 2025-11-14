const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const {
  getAllIncome,
  createIncome,
  updateIncome,
  deleteIncome,
  getIncomeHistory
} = require('../controllers/incomeController');

router.get('/', protectAPI, getAllIncome);
router.post('/', protectAPI, createIncome);
router.put('/:id', protectAPI, updateIncome);
router.delete('/:id', protectAPI, deleteIncome);
router.get('/history', protectAPI, getIncomeHistory);

module.exports = router;