const PDFDocument = require('pdfkit');
const { formatCurrency, formatDate } = require('../utils/helpers');

const generateMonthlyReport = async (data, res) => {
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=MonthlyReport_${data.month}_${data.year}.pdf`);
  
  doc.pipe(res);
  
  doc.fontSize(20).text('Monthly Budget Report', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(12).text(`Household: ${data.householdName}`);
  doc.text(`Period: ${data.month} ${data.year}`);
  doc.text(`Generated: ${formatDate(new Date())}`);
  doc.moveDown();
  
  doc.fontSize(16).text('Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12);
  doc.text(`Total Income: ${formatCurrency(data.totalIncome)}`);
  doc.text(`Total Expenses: ${formatCurrency(data.totalExpenses)}`);
  doc.text(`Net Difference: ${formatCurrency(data.difference)}`, {
    color: data.difference >= 0 ? 'green' : 'red'
  });
  doc.moveDown();
  
  doc.fontSize(16).text('Expenses by Category', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12);
  
  Object.entries(data.categoryBreakdown).forEach(([category, amount]) => {
    const percentage = ((amount / data.totalExpenses) * 100).toFixed(1);
    doc.text(`${category}: ${formatCurrency(amount)} (${percentage}%)`);
  });
  doc.moveDown();
  
  if (data.transactions && data.transactions.length > 0) {
    doc.addPage();
    doc.fontSize(16).text('All Transactions', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    
    data.transactions.forEach(transaction => {
      doc.text(`${formatDate(transaction.paidDate)} - ${transaction.name} - ${transaction.category} - ${formatCurrency(transaction.amount)}`);
    });
  }
  
  doc.end();
};

const generateTaxSummary = async (data, res) => {
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=TaxSummary_${data.year}.pdf`);
  
  doc.pipe(res);
  
  doc.fontSize(20).text('Tax Summary Report', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(12).text(`Household: ${data.householdName}`);
  doc.text(`Tax Year: ${data.year}`);
  doc.text(`Generated: ${formatDate(new Date())}`);
  doc.moveDown();
  
  doc.fontSize(10).text('For tax purposes only. Consult a tax professional.', { oblique: true });
  doc.moveDown();
  
  doc.fontSize(16).text('Expenses by Category', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12);
  
  let grandTotal = 0;
  
  Object.entries(data.categoryTotals).forEach(([category, amount]) => {
    doc.text(`${category}: ${formatCurrency(amount)}`);
    grandTotal += amount;
  });
  
  doc.moveDown();
  doc.fontSize(14).text(`Grand Total: ${formatCurrency(grandTotal)}`, { bold: true });
  
  doc.end();
};

module.exports = {
  generateMonthlyReport,
  generateTaxSummary
};