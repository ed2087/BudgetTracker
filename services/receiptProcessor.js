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
  
  // Extract amount
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
  
  // Extract date
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
  
  // Extract merchant - improved logic
  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 2);
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    
    // Skip common non-merchant patterns
    if (line.match(/^(receipt|invoice|date|time|thank|customer|copy|original)/i)) continue;
    if (line.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) continue; // Skip dates
    if (line.match(/^\d+$/)) continue; // Skip pure numbers
    if (line.match(/^[\d\s\-\/\.,]+$/)) continue; // Skip number-heavy lines
    if (line.length < 3) continue; // Too short
    
    // Check if line has business indicators
    if (line.match(/(LLC|Inc|Corp|Ltd|Co\.|Company|Store|Shop|Market|Depot|Station)/i)) {
      parsedData.merchant = line.substring(0, 50).trim();
      break;
    }
    
    // If no business indicator found in first few lines, take first substantive line
    if (i === 0 && line.length >= 3 && line.length <= 50) {
      // Extract just the business name (before address/phone)
      const namePart = line.split(/\d{3,}/)[0].trim(); // Split before phone/address numbers
      if (namePart.length >= 3) {
        parsedData.merchant = namePart.substring(0, 50).trim();
      }
    }
  }
  
  // If still no merchant, take first line as fallback
  if (!parsedData.merchant && lines.length > 0) {
    const firstLine = lines[0].split(/\d{3,}/)[0].trim();
    parsedData.merchant = firstLine.substring(0, 50).trim();
  }
  
  return parsedData;
};

module.exports = {
  processReceipt
};