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