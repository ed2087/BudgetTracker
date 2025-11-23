const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const { protect } = require('./middleware/auth');
const { startCronJobs } = require('./services/cronJobs');

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/income', require('./routes/income'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/confirmations', require('./routes/confirmations'));
app.use('/api/reports', require('./routes/reports'));

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/dashboard', protect, (req, res) => {
  res.render('dashboard');
});

app.get('/income', protect, (req, res) => {
  res.render('income');
});

app.get('/expenses', protect, (req, res) => {
  res.render('expenses');
});

app.get('/recurring', protect, (req, res) => {
  res.render('recurring');
});

app.get('/analytics', protect, (req, res) => {
  res.render('analytics');
});

app.get('/settings', protect, (req, res) => {
  res.render('settings');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.get('/faq', (req, res) => {
  res.render('faq');
});


// MANUAL CRON TRIGGER - Creates all missing confirmations
app.get('/trigger-cron', protect, async (req, res) => {
  try {
    const { runDailyJob } = require('./services/cronJobs');
    const RecurringTemplate = require('./models/RecurringTemplate');
    const Income = require('./models/Income');
    const PendingConfirmation = require('./models/PendingConfirmation');
    
    console.log('\n========================================');
    console.log('⚡ MANUAL CRON TRIGGER');
    console.log('User:', req.user.username, 'ID:', req.user._id);
    console.log('========================================\n');
    
    // Check what data exists BEFORE running cron
    const templates = await RecurringTemplate.find({ userId: req.user._id, active: true });
    const incomes = await Income.find({ userId: req.user._id, active: true });
    const existingConfirmations = await PendingConfirmation.find({ userId: req.user._id });
    
    console.log('BEFORE CRON:');
    console.log(`- Recurring Templates: ${templates.length}`);
    templates.forEach(t => console.log(`  - ${t.name} (created: ${t.createdAt})`));
    console.log(`- Income Sources: ${incomes.length}`);
    incomes.forEach(i => console.log(`  - ${i.sourceName} (next payday: ${i.nextPayday})`));
    console.log(`- Existing Confirmations: ${existingConfirmations.length}`);
    console.log('');
    
    // Run the cron job
    await runDailyJob();
    
    // Check what was created AFTER running cron
    const newConfirmations = await PendingConfirmation.find({ userId: req.user._id });
    
    console.log('\nAFTER CRON:');
    console.log(`- Total Confirmations: ${newConfirmations.length}`);
    console.log(`- New Confirmations Created: ${newConfirmations.length - existingConfirmations.length}`);
    
    newConfirmations.forEach(c => {
      console.log(`  - ${c.type}: ${c.name} - $${c.expectedAmount} (due: ${c.dueDate}) [${c.status}]`);
    });
    
    res.json({ 
      success: true, 
      message: 'Cron job executed',
      before: existingConfirmations.length,
      after: newConfirmations.length,
      created: newConfirmations.length - existingConfirmations.length,
      confirmations: newConfirmations.map(c => ({
        type: c.type,
        name: c.name,
        amount: c.expectedAmount,
        dueDate: c.dueDate,
        status: c.status
      }))
    });
  } catch (error) {
    console.error('Manual cron trigger error:', error);
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
});


app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    startCronJobs();
  }
});