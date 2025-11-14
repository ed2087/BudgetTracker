const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const {
  getAllConfirmations,
  confirmConfirmation,
  snoozeConfirmation,
  skipConfirmation,
  updateConfirmationAmount
} = require('../controllers/confirmationController');

router.get('/', protectAPI, getAllConfirmations);
router.post('/:id/confirm', protectAPI, confirmConfirmation);
router.post('/:id/snooze', protectAPI, snoozeConfirmation);
router.post('/:id/skip', protectAPI, skipConfirmation);
router.put('/:id/amount', protectAPI, updateConfirmationAmount);

module.exports = router;