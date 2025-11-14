const { processReceipt } = require('../services/receiptProcessor');

exports.processReceiptUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const result = await processReceipt(req.file.path);

    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: result.error || 'Failed to process receipt' 
      });
    }

    res.json({
      success: true,
      extractedText: result.extractedText,
      parsedData: result.parsedData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};