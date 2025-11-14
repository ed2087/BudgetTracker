const Tesseract = require('tesseract.js');
const fs = require('fs');

const processReceipt = async (filePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}
    });
    
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    const parsedData = parseReceiptText(cleanText);
    
    fs.unlinkSync(filePath);
    
    return {
      success: true,
      extractedText: cleanText,
      parsedData
    };
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

const parseReceiptText = (text) => {
  const parsedData = {
    amount: null,
    date: null,
    merchant: null
  };
  
  const amountPatterns = [
    /\$\s*(\d{1,5}(?:,\d{3})*(?:\.\d{2}))/g,
    /total[:\s]*\$?\s*(\d{1,5}(?:,\d{3})*(?:\.\d{2}))/gi,
    /amount[:\s]*\$?\s*(\d{1,5}(?:,\d{3})*(?:\.\d{2}))/gi
  ];
  
  let amounts = [];
  amountPatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount);
      }
    });
  });
  
  if (amounts.length > 0) {
    parsedData.amount = Math.max(...amounts);
  }
  
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        parsedData.date = parsedDate;
        break;
      }
    }
  }
  
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    const firstLines = lines.slice(0, 3).join(' ');
    const businessIndicators = /(LLC|Inc|Corp|Ltd|Store|Shop|Market)/i;
    if (businessIndicators.test(firstLines)) {
      parsedData.merchant = firstLines.substring(0, 100);
    } else {
      parsedData.merchant = lines[0].substring(0, 100);
    }
  }
  
  return parsedData;
};

module.exports = {
  processReceipt
};