const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const {
  getAllRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  getRecurringHistory
} = require('../controllers/recurringController');

router.get('/', protectAPI, getAllRecurring);
router.post('/', protectAPI, createRecurring);
router.put('/:id', protectAPI, updateRecurring);
router.delete('/:id', protectAPI, deleteRecurring);
router.get('/:id/history', protectAPI, getRecurringHistory);

module.exports = router;