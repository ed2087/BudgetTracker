const cron = require('node-cron');
const Income = require('../models/Income');
const RecurringTemplate = require('../models/RecurringTemplate');
const PendingConfirmation = require('../models/PendingConfirmation');
const User = require('../models/User');
const { calculateNextPayday } = require('../utils/helpers');
const Notification = require('./notifications');

const runDailyJob = async () => {
  console.log('=== DAILY CRON START ===', new Date());
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // ===== BACKFILL ALL MISSING RECURRING BILLS =====
    const recurringTemplates = await RecurringTemplate.find({
      active: true,
      autoPrompt: true
    });
    
    console.log(`Checking ${recurringTemplates.length} recurring templates for missing confirmations`);
    
    for (const template of recurringTemplates) {
      // Get the month when this template was created
      const createdDate = new Date(template.createdAt);
      const startMonth = createdDate.getMonth();
      const startYear = createdDate.getFullYear();
      
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      console.log(`\n--- Checking ${template.name} (created ${createdDate.toDateString()}) ---`);
      
      // Loop through EVERY MONTH from creation until now
      for (let year = startYear; year <= currentYear; year++) {
        const monthStart = (year === startYear) ? startMonth : 0;
        const monthEnd = (year === currentYear) ? currentMonth : 11;
        
        for (let month = monthStart; month <= monthEnd; month++) {
          const monthStartDate = new Date(year, month, 1);
          const monthEndDate = new Date(year, month + 1, 0);
          
          // Check if confirmation exists for THIS specific month
          const existing = await PendingConfirmation.findOne({
            userId: template.userId,
            type: 'expense',
            referenceId: template._id,
            dueDate: { $gte: monthStartDate, $lte: monthEndDate }
          });
          
          if (!existing) {
            // CREATE MISSING CONFIRMATION
            const billDueDate = new Date(year, month, template.dueDay);
            
            await PendingConfirmation.create({
              userId: template.userId,
              type: 'expense',
              referenceId: template._id,
              referenceModel: 'RecurringTemplate',
              name: template.name,
              expectedAmount: template.expectedAmount,
              dueDate: billDueDate,
              status: 'pending'
            });
            
            const daysLate = Math.floor((today - billDueDate) / (1000 * 60 * 60 * 24));
            console.log(`✓ Created: ${template.name} for ${monthStartDate.toLocaleDateString('en-US', {month: 'short', year: 'numeric'})} (${daysLate > 0 ? daysLate + ' days overdue' : 'on time'})`);
          } else {
            console.log(`  Skip: ${template.name} for ${monthStartDate.toLocaleDateString('en-US', {month: 'short', year: 'numeric'})} (status: ${existing.status})`);
          }
        }
      }
    }
    
    // ===== BACKFILL ALL MISSING INCOME CONFIRMATIONS =====
    const incomes = await Income.find({ active: true });
    
    console.log(`\nChecking ${incomes.length} income sources for missing confirmations`);
    
    for (const income of incomes) {
      if (!income.nextPayday || income.frequency === 'irregular') {
        console.log(`Skip ${income.sourceName} - irregular or no next payday set`);
        continue;
      }
      
      console.log(`\n--- Checking ${income.sourceName} (next payday: ${income.nextPayday.toDateString()}) ---`);
      
      // Calculate all past paydays from creation date until today
      let currentPayday = new Date(income.nextPayday);
      const createdDate = new Date(income.createdAt);
      const paydays = [];
      
      // Go backwards from nextPayday to find the earliest payday after creation
      let tempDate = new Date(currentPayday);
      while (tempDate > createdDate) {
        tempDate = calculatePreviousPayday(tempDate, income.frequency);
      }
      
      // Now go forward and collect all paydays up to today
      while (tempDate <= today) {
        if (tempDate >= createdDate) {
          paydays.push(new Date(tempDate));
        }
        tempDate = calculateNextPayday(income.frequency, tempDate);
      }
      
      console.log(`Found ${paydays.length} paydays to check`);
      
      // Check each payday
      for (const payday of paydays) {
        const paydayStart = new Date(payday);
        paydayStart.setHours(0, 0, 0, 0);
        const paydayEnd = new Date(paydayStart);
        paydayEnd.setDate(paydayEnd.getDate() + 1);
        
        const existing = await PendingConfirmation.findOne({
          userId: income.userId,
          type: 'income',
          referenceId: income._id,
          dueDate: { $gte: paydayStart, $lt: paydayEnd }
        });
        
        if (!existing) {
          await PendingConfirmation.create({
            userId: income.userId,
            type: 'income',
            referenceId: income._id,
            referenceModel: 'Income',
            name: income.sourceName,
            expectedAmount: income.amount,
            dueDate: payday,
            status: 'pending'
          });
          
          const daysLate = Math.floor((today - payday) / (1000 * 60 * 60 * 24));
          console.log(`✓ Created: ${income.sourceName} for ${payday.toDateString()} (${daysLate > 0 ? daysLate + ' days late' : 'on time'})`);
        } else {
          console.log(`  Skip: ${income.sourceName} for ${payday.toDateString()} (status: ${existing.status})`);
        }
      }
    }
    
    // ===== OVERDUE REMINDERS (7+ days old and still pending) =====
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const overdue = await PendingConfirmation.find({
      status: 'pending',
      dueDate: { $lt: sevenDaysAgo }
    });
    
    console.log(`\nFound ${overdue.length} overdue confirmations (7+ days old)`);
    
    for (const confirmation of overdue) {
      const daysOverdue = Math.floor((today - confirmation.dueDate) / (1000 * 60 * 60 * 24));
      
      Notification.create(
        confirmation.userId,
        `OVERDUE: ${confirmation.name} ($${confirmation.expectedAmount}) is ${daysOverdue} days overdue!`,
        'warning',
        'high'
      );
    }
    
    console.log('\n=== DAILY CRON END ===');
  } catch (error) {
    console.error('Daily cron job error:', error);
    throw error;
  }
};

// Helper to calculate previous payday
function calculatePreviousPayday(date, frequency) {
  const prev = new Date(date);
  
  switch(frequency) {
    case 'weekly':
      prev.setDate(prev.getDate() - 7);
      break;
    case 'biweekly':
      prev.setDate(prev.getDate() - 14);
      break;
    case 'monthly':
      prev.setMonth(prev.getMonth() - 1);
      break;
    default:
      return null;
  }
  
  return prev;
}

const dailyJob = cron.schedule('0 8 * * *', runDailyJob, {
  scheduled: false,
  timezone: "America/New_York"
});

const weeklyJob = cron.schedule('0 20 * * 0', async () => {
  console.log('=== WEEKLY CRON START ===', new Date());
  
  try {
    const users = await User.find();
    
    for (const user of users) {
      Notification.create(
        user._id,
        'Weekly summary: Check your analytics page to see this week\'s spending.',
        'summary',
        'low'
      );
    }
    
    console.log(`Weekly summary sent to ${users.length} users`);
    console.log('=== WEEKLY CRON END ===');
  } catch (error) {
    console.error('Weekly cron job error:', error);
  }
}, {
  scheduled: false,
  timezone: "America/New_York"
});

const monthlyJob = cron.schedule('1 0 1 * *', async () => {
  console.log('=== MONTHLY CRON START ===', new Date());
  
  try {
    const result = await PendingConfirmation.updateMany(
      { 
        status: { $in: ['confirmed', 'skipped'] },
        updatedAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      { status: 'archived' }
    );
    
    console.log(`Archived ${result.modifiedCount} old confirmations (90+ days)`);
    console.log('=== MONTHLY CRON END ===');
  } catch (error) {
    console.error('Monthly cron job error:', error);
  }
}, {
  scheduled: false,
  timezone: "America/New_York"
});

const startCronJobs = () => {
  dailyJob.start();
  weeklyJob.start();
  monthlyJob.start();
  console.log('✓ All cron jobs started (timezone: America/New_York)');
  console.log('  - Daily job: 8:00 AM EST');
  console.log('  - Weekly job: 8:00 PM EST Sundays');
  console.log('  - Monthly job: 12:01 AM EST on 1st of month');
};

const stopCronJobs = () => {
  dailyJob.stop();
  weeklyJob.stop();
  monthlyJob.stop();
  console.log('✓ All cron jobs stopped');
};

module.exports = {
  startCronJobs,
  stopCronJobs,
  dailyJob,
  weeklyJob,
  monthlyJob,
  runDailyJob
};