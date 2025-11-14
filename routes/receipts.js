const express = require('express');
const router = express.Router();
const { protectAPI } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { processReceiptUpload } = require('../controllers/receiptController');

router.post('/process', protectAPI, upload.single('receipt'), processReceiptUpload);

module.exports = router;