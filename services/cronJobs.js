const cron = require('node-cron');
const Income = require('../models/Income');
const RecurringTemplate = require('../models/RecurringTemplate');
const PendingConfirmation = require('../models/PendingConfirmation');
const User = require('../models/User');
const { calculateNextPayday } = require('../utils/helpers');
const Notification = require('./notifications');

const dailyJob = cron.schedule('0 8 * * *', async () => {
  console.log('Running daily cron job...');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const incomes = await Income.find({
      active: true,
      nextPayday: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    for (const income of incomes) {
      const existing = await PendingConfirmation.findOne({
        userId: income.userId,
        type: 'income',
        referenceId: income._id,
        status: 'pending'
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
        
        Notification.create(
          income.userId,
          `Payday! Confirm you received $${income.amount} from ${income.sourceName}.`,
          'confirmation',
          'high'
        );
      }
      
      income.nextPayday = calculateNextPayday(income.frequency, income.nextPayday);
      await income.save();
    }
    
    const currentDay = today.getDate();
    const recurringTemplates = await RecurringTemplate.find({
      active: true,
      autoPrompt: true,
      dueDay: currentDay
    });
    
    for (const template of recurringTemplates) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const existing = await PendingConfirmation.findOne({
        userId: template.userId,
        type: 'expense',
        referenceId: template._id,
        status: { $in: ['pending', 'confirmed'] },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      if (!existing) {
        await PendingConfirmation.create({
          userId: template.userId,
          type: 'expense',
          referenceId: template._id,
          referenceModel: 'RecurringTemplate',
          name: template.name,
          expectedAmount: template.expectedAmount,
          dueDate: today,
          status: 'pending'
        });
        
        Notification.create(
          template.userId,
          `Is the ${template.name} ($${template.expectedAmount}) paid this month?`,
          'confirmation',
          'high'
        );
      }
    }
    
    const overdue = await PendingConfirmation.find({
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    });
    
    for (const confirmation of overdue) {
      Notification.create(
        confirmation.userId,
        `Reminder: ${confirmation.name} ($${confirmation.expectedAmount}) still needs confirmation.`,
        'warning',
        'high'
      );
    }
    
    console.log('Daily cron job completed');
  } catch (error) {
    console.error('Daily cron job error:', error);
  }
}, {
  scheduled: false
});

const weeklyJob = cron.schedule('0 20 * * 0', async () => {
  console.log('Running weekly cron job...');
  
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
    
    console.log('Weekly cron job completed');
  } catch (error) {
    console.error('Weekly cron job error:', error);
  }
}, {
  scheduled: false
});

const monthlyJob = cron.schedule('1 0 1 * *', async () => {
  console.log('Running monthly cron job...');
  
  try {
    await PendingConfirmation.updateMany(
      { 
        status: { $in: ['confirmed', 'skipped'] },
        updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      { status: 'archived' }
    );
    
    console.log('Monthly cron job completed');
  } catch (error) {
    console.error('Monthly cron job error:', error);
  }
}, {
  scheduled: false
});

const startCronJobs = () => {
  dailyJob.start();
  weeklyJob.start();
  monthlyJob.start();
  console.log('Cron jobs started');
};

const stopCronJobs = () => {
  dailyJob.stop();
  weeklyJob.stop();
  monthlyJob.stop();
  console.log('Cron jobs stopped');
};

module.exports = {
  startCronJobs,
  stopCronJobs
};