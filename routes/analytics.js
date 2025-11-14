const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const {
  getOverview,
  getCategoryTrends,
  getYearComparison,
  getDailyBalance
} = require('../controllers/analyticsController');

router.get('/overview', protectAPI, getOverview);
router.get('/category-trends', protectAPI, getCategoryTrends);
router.get('/year-comparison', protectAPI, getYearComparison);
router.get('/daily-balance', protectAPI, getDailyBalance);

module.exports = router;