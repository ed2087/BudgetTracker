// scripts/seedTestData.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Balance = require('../models/Balance');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const RecurringTemplate = require('../models/RecurringTemplate');
const PendingConfirmation = require('../models/PendingConfirmation');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/budgettracker', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Helper: Get date X days ago
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Helper: Get date X days from now
const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Helper: Random amount
const randomAmount = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const seedTestData = async () => {
  try {
    console.log('\n🌱 Starting test data seed...\n');

    // ===== 1. CREATE TEST USER =====
    console.log('1️⃣ Creating test user...');
    
    // Delete existing test user and all related data
    const existingUser = await User.findOne({ username: 'testuser' });
    if (existingUser) {
      console.log('   ⚠ Deleting existing test user and data...');
      await Balance.deleteMany({ userId: existingUser._id });
      await Income.deleteMany({ userId: existingUser._id });
      await Expense.deleteMany({ userId: existingUser._id });
      await RecurringTemplate.deleteMany({ userId: existingUser._id });
      await PendingConfirmation.deleteMany({ userId: existingUser._id });
      await User.deleteOne({ _id: existingUser._id });
    }
    
    const testUser = new User({
      username: 'testuser',
      password: 'password123', // Will be hashed by pre-save hook
      householdName: 'Test Household',
      securityQuestions: [
        {
          question: "What is your favorite color?",
          answer: 'blue' // Will be hashed by pre-save hook
        },
        {
          question: "What city were you born in?",
          answer: 'charlotte' // Will be hashed by pre-save hook
        }
      ],
      preferences: {
        reminderFrequency: 'daily',
        lowBalanceThreshold: 500
      }
    });

    // Generate recovery code BEFORE saving (so it gets saved)
    testUser.recoveryCode = testUser.generateRecoveryCode();
    
    await testUser.save();
    const userId = testUser._id;
    
    console.log('   ✓ Test user created');
    console.log(`   ✓ Recovery Code: ${testUser.recoveryCode}`);

    // ===== 2. CREATE INCOME SOURCES =====
    console.log('\n2️⃣ Creating income sources...');
    
    const weeklyIncome = await Income.create({
      userId,
      sourceName: 'Rucker Dentistry',
      amount: 960,
      frequency: 'weekly',
      nextPayday: daysFromNow(2),
      active: true
    });
    console.log('   ✓ Weekly income: $960 (next payday in 2 days)');

    const biweeklyIncome = await Income.create({
      userId,
      sourceName: 'Side Hustle',
      amount: 400,
      frequency: 'biweekly',
      nextPayday: daysFromNow(5),
      active: true
    });
    console.log('   ✓ Biweekly income: $400 (next payday in 5 days)');

    // ===== 3. CREATE RECURRING BILLS =====
    console.log('\n3️⃣ Creating recurring bills...');
    
    const recurringBills = [
      { name: 'Rent', category: 'Housing', expectedAmount: 1200, dueDay: 1, frequency: 'monthly', autoPrompt: true },
      { name: 'Electric Bill', category: 'Utilities', expectedAmount: 150, dueDay: 5, frequency: 'monthly', autoPrompt: true },
      { name: 'Internet', category: 'Utilities', expectedAmount: 80, dueDay: 10, frequency: 'monthly', autoPrompt: true },
      { name: 'Car Insurance', category: 'Insurance', expectedAmount: 180, dueDay: 15, frequency: 'monthly', autoPrompt: true },
      { name: 'Phone Bill', category: 'Utilities', expectedAmount: 95, dueDay: 18, frequency: 'monthly', autoPrompt: true },
      { name: 'Netflix', category: 'Subscriptions', expectedAmount: 15.99, dueDay: 22, frequency: 'monthly', autoPrompt: true },
      { name: 'Gym Membership', category: 'Entertainment', expectedAmount: 45, dueDay: 25, frequency: 'monthly', autoPrompt: true },
      { name: 'Credit Card Payment', category: 'Debt Payments', expectedAmount: 250, dueDay: 28, frequency: 'monthly', autoPrompt: true },
    ];

    const createdBills = [];
    for (const bill of recurringBills) {
      const created = await RecurringTemplate.create({
        userId,
        ...bill,
        active: true
      });
      createdBills.push(created);
      console.log(`   ✓ ${bill.name}: $${bill.expectedAmount} (due day ${bill.dueDay})`);
    }

    // ===== 4. CREATE BALANCE FIRST (with starting amount) =====
    console.log('\n4️⃣ Creating initial balance...');
    
    const startingBalance = 5000;
    const balance = await Balance.create({
      userId,
      currentBalance: startingBalance,
      lastUpdated: daysAgo(90),
      history: [{
        date: daysAgo(90),
        balance: startingBalance,
        change: startingBalance,
        reason: 'Initial balance',
        type: 'manual_adjustment'
      }]
    });
    console.log(`   ✓ Starting balance: $${startingBalance}`);

    // ===== 5. CREATE PAST EXPENSES (3 months) =====
    console.log('\n5️⃣ Creating past expenses (last 3 months)...');
    
    let expenseCount = 0;
    const categories = ['Groceries', 'Dining Out', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare'];
    
    // Generate expenses for last 90 days (fewer to keep balance positive)
    for (let i = 90; i > 0; i--) {
      const date = daysAgo(i);
      
      // Random 1-2 expenses per day (reduced from 2-4)
      const dailyExpenses = randomAmount(1, 2);
      
      for (let j = 0; j < dailyExpenses; j++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const amount = randomAmount(15, 80); // Reduced from 10-150
        
        await Expense.create({
          userId,
          name: `${category} purchase`,
          category,
          amount,
          paidDate: date,
          status: 'paid',
          type: 'one-time',
          notes: 'Test data'
        });
        
        // Update balance immediately
        balance.currentBalance -= amount;
        balance.history.push({
          date: date,
          balance: balance.currentBalance,
          change: -amount,
          reason: `Expense: ${category} purchase`,
          type: 'expense'
        });
        
        expenseCount++;
      }
    }
    
    // Add past income (weekly for 12 weeks)
    console.log('\n6️⃣ Adding past income...');
    for (let i = 0; i < 12; i++) {
      const incomeDate = daysAgo(84 - (i * 7)); // Start from 12 weeks ago
      
      balance.currentBalance += 960;
      balance.history.push({
        date: incomeDate,
        balance: balance.currentBalance,
        change: 960,
        reason: 'Income: Rucker Dentistry',
        type: 'income'
      });
    }
    
    balance.lastUpdated = new Date();
    await balance.save();
    
    console.log(`   ✓ Created ${expenseCount} past expenses`);
    console.log(`   ✓ Added 12 weekly income payments`);
    console.log(`   ✓ Current balance: $${balance.currentBalance.toFixed(2)}`);

    // ===== 7. CREATE PENDING CONFIRMATIONS =====
    console.log('\n7️⃣ Creating pending confirmations...');
    
    // OVERDUE INCOME (missed payday from 5 days ago)
    await PendingConfirmation.create({
      userId,
      type: 'income',
      referenceId: weeklyIncome._id,
      referenceModel: 'Income',
      name: 'Rucker Dentistry',
      expectedAmount: 960,
      dueDate: daysAgo(5),
      status: 'pending'
    });
    console.log('   ✓ OVERDUE income confirmation (5 days late): $960');

    // TODAY'S BILL (if we're past day 5)
    const today = new Date();
    const currentDay = today.getDate();
    
    if (currentDay >= 5) {
      const electricBill = createdBills.find(b => b.name === 'Electric Bill');
      await PendingConfirmation.create({
        userId,
        type: 'expense',
        referenceId: electricBill._id,
        referenceModel: 'RecurringTemplate',
        name: 'Electric Bill',
        expectedAmount: 150,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 5),
        status: 'pending'
      });
      console.log('   ✓ PENDING expense confirmation: Electric Bill $150');
    }

    // OVERDUE BILLS (from earlier this month)
    for (const bill of createdBills) {
      if (bill.dueDay < currentDay && bill.dueDay >= (currentDay - 7) && bill.dueDay !== 1) {
        const billDueDate = new Date(today.getFullYear(), today.getMonth(), bill.dueDay);
        
        await PendingConfirmation.create({
          userId,
          type: 'expense',
          referenceId: bill._id,
          referenceModel: 'RecurringTemplate',
          name: bill.name,
          expectedAmount: bill.expectedAmount,
          dueDate: billDueDate,
          status: 'pending'
        });
        
        const daysLate = Math.floor((today - billDueDate) / (1000 * 60 * 60 * 24));
        console.log(`   ✓ OVERDUE expense confirmation (${daysLate} days late): ${bill.name} $${bill.expectedAmount}`);
      }
    }

    // SNOOZED CONFIRMATION (Rent)
    const rentBill = createdBills.find(b => b.name === 'Rent');
    if (currentDay >= 1) {
      await PendingConfirmation.create({
        userId,
        type: 'expense',
        referenceId: rentBill._id,
        referenceModel: 'RecurringTemplate',
        name: 'Rent',
        expectedAmount: 1200,
        dueDate: new Date(today.getFullYear(), today.getMonth(), 1),
        status: 'snoozed',
        snoozeUntil: daysFromNow(1)
      });
      console.log('   ✓ SNOOZED expense confirmation (until tomorrow): Rent $1200');
    }

    // ===== 8. VERIFY DATA WAS SAVED =====
    console.log('\n8️⃣ Verifying data...');
    
    const savedUser = await User.findById(userId);
    const savedBalance = await Balance.findOne({ userId });
    const savedIncome = await Income.countDocuments({ userId });
    const savedExpenses = await Expense.countDocuments({ userId });
    const savedRecurring = await RecurringTemplate.countDocuments({ userId });
    const savedPending = await PendingConfirmation.countDocuments({ userId, status: 'pending' });
    const savedSnoozed = await PendingConfirmation.countDocuments({ userId, status: 'snoozed' });
    
    console.log(`   ✓ User saved: ${!!savedUser}`);
    console.log(`   ✓ Balance saved: ${!!savedBalance}`);
    console.log(`   ✓ Income sources: ${savedIncome}`);
    console.log(`   ✓ Expenses: ${savedExpenses}`);
    console.log(`   ✓ Recurring bills: ${savedRecurring}`);
    console.log(`   ✓ Pending confirmations: ${savedPending}`);
    console.log(`   ✓ Snoozed confirmations: ${savedSnoozed}`);

    // ===== 9. SUMMARY =====
    console.log('\n📊 SUMMARY:');
    console.log('═══════════════════════════════════════');
    console.log(`User: testuser / password123`);
    console.log(`Recovery Code: ${savedUser.recoveryCode}`);
    console.log(`Current Balance: $${savedBalance.currentBalance.toFixed(2)}`);
    console.log(`Income Sources: ${savedIncome}`);
    console.log(`Recurring Bills: ${savedRecurring}`);
    console.log(`Past Expenses: ${savedExpenses}`);
    console.log(`Pending Confirmations: ${savedPending}`);
    console.log(`Snoozed Confirmations: ${savedSnoozed}`);
    console.log('═══════════════════════════════════════');
    
    console.log('\n✅ Test data seed complete!\n');
    console.log('🔑 Login with:');
    console.log('   Username: testuser');
    console.log('   Password: password123\n');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
};

// Run the seed
const run = async () => {
  await connectDB();
  await seedTestData();
  
  console.log('\n🔍 Final verification query...');
  const user = await User.findOne({ username: 'testuser' });
  console.log(`User exists: ${!!user}`);
  console.log(`User ID: ${user?._id}`);
  
  await mongoose.connection.close();
  console.log('\n✓ Database connection closed');
  process.exit(0);
};

run();