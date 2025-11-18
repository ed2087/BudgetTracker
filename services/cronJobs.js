const cron = require('node-cron');
const Income = require('../models/Income');
const RecurringTemplate = require('../models/RecurringTemplate');
const PendingConfirmation = require('../models/PendingConfirmation');
const User = require('../models/User');
const { calculateNextPayday } = require('../utils/helpers');
const Notification = require('./notifications');

const dailyJob = cron.schedule('0 8 * * *', async () => {
  console.log('=== DAILY CRON START ===', new Date());
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();
    
    // ===== INCOME PAYDAY CHECKS (Last 7 Days) =====
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const incomes = await Income.find({
      active: true,
      nextPayday: {
        $gte: oneWeekAgo,
        $lte: today
      }
    });
    
    console.log(`Checking ${incomes.length} income sources for paydays`);
    
    for (const income of incomes) {
      // Check if confirmation already exists for this specific payday
      const paydayStart = new Date(income.nextPayday);
      paydayStart.setHours(0, 0, 0, 0);
      const paydayEnd = new Date(paydayStart);
      paydayEnd.setDate(paydayEnd.getDate() + 1);
      
      const existing = await PendingConfirmation.findOne({
        userId: income.userId,
        type: 'income',
        referenceId: income._id,
        status: { $in: ['pending', 'confirmed', 'snoozed'] },
        dueDate: {
          $gte: paydayStart,
          $lt: paydayEnd
        }
      });
      
      if (!existing) {
        await PendingConfirmation.create({
          userId: income.userId,
          type: 'income',
          referenceId: income._id,
          referenceModel: 'Income',
          name: income.sourceName,
          expectedAmount: income.amount,
          dueDate: income.nextPayday,
          status: 'pending'
        });
        
        const daysLate = Math.floor((today - income.nextPayday) / (1000 * 60 * 60 * 24));
        console.log(`✓ Created income confirmation for ${income.sourceName} (payday: ${income.nextPayday.toDateString()}, ${daysLate > 0 ? daysLate + ' days late' : 'on time'})`);
        
        Notification.create(
          income.userId,
          `Payday! Confirm you received $${income.amount} from ${income.sourceName}.`,
          'confirmation',
          'high'
        );
      }
    }
    
    // ===== RECURRING BILL CHECKS (Current Month) =====
    const recurringTemplates = await RecurringTemplate.find({
      active: true,
      autoPrompt: true,
      dueDay: { $lte: currentDay }  // All bills due up to today this month
    });
    
    console.log(`Checking ${recurringTemplates.length} recurring bills for current month`);
    
    for (const template of recurringTemplates) {
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      const existing = await PendingConfirmation.findOne({
        userId: template.userId,
        type: 'expense',
        referenceId: template._id,
        status: { $in: ['pending', 'confirmed', 'snoozed'] },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      if (!existing) {
        const billDueDate = new Date(currentYear, currentMonth, template.dueDay);
        
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
        console.log(`✓ Created expense confirmation for ${template.name} (due: day ${template.dueDay}, ${daysLate > 0 ? daysLate + ' days overdue' : 'on time'})`);
        
        Notification.create(
          template.userId,
          `Is the ${template.name} ($${template.expectedAmount}) paid this month?`,
          'confirmation',
          'high'
        );
      }
    }
    
    // ===== OVERDUE REMINDERS (3+ days old) =====
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const overdue = await PendingConfirmation.find({
      status: 'pending',
      dueDate: { $lt: threeDaysAgo }
    });
    
    console.log(`Found ${overdue.length} overdue confirmations needing reminders`);
    
    for (const confirmation of overdue) {
      const daysOverdue = Math.floor((today - confirmation.dueDate) / (1000 * 60 * 60 * 24));
      
      Notification.create(
        confirmation.userId,
        `Reminder: ${confirmation.name} ($${confirmation.expectedAmount}) is ${daysOverdue} days overdue. Please confirm.`,
        'warning',
        'high'
      );
    }
    
    console.log('=== DAILY CRON END ===');
  } catch (error) {
    console.error('Daily cron job error:', error);
  }
}, {
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
        updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      { status: 'archived' }
    );
    
    console.log(`Archived ${result.modifiedCount} old confirmations`);
    console.log('=== MONTHLY CRON END ===');
  } catch (error) {
    console.error('Monthly cron job error:', error);
  }
}, {
  scheduled: false,
  timezone: "America/New_York"
});

// Manual trigger functions for testing
dailyJob.trigger = async () => {
  console.log('⚡ MANUALLY TRIGGERING DAILY JOB');
  const task = dailyJob.options.onTick;
  await task();
};

weeklyJob.trigger = async () => {
  console.log('⚡ MANUALLY TRIGGERING WEEKLY JOB');
  const task = weeklyJob.options.onTick;
  await task();
};

monthlyJob.trigger = async () => {
  console.log('⚡ MANUALLY TRIGGERING MONTHLY JOB');
  const task = monthlyJob.options.onTick;
  await task();
};

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
  monthlyJob
};