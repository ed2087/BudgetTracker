const express = require('express');
const router = express.Router();
const { 
  login, 
  register, 
  logout, 
  verifyToken,
  verifyUsername,
  verifySecurityAnswers,
  verifyRecoveryCode,
  resetPassword
} = require('../controllers/authController');
const { protectAPI } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);
router.get('/verify', protectAPI, verifyToken);

router.post('/verify-username', verifyUsername);
router.post('/verify-security-answers', verifySecurityAnswers);
router.post('/verify-recovery-code', verifyRecoveryCode);
router.post('/reset-password', resetPassword);

module.exports = router;