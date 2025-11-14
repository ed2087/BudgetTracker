const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  householdName: {
    type: String,
    required: [true, 'Household name is required'],
    trim: true
  },
  securityQuestions: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
  recoveryCode: {
    type: String,
    required: true
  },
  preferences: {
    reminderFrequency: {
      type: String,
      enum: ['daily', 'every3days', 'weekly'],
      default: 'daily'
    },
    lowBalanceThreshold: {
      type: Number,
      default: 500
    }
  }
}, {
  timestamps: true
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.pre('save', async function(next) {
  if (this.securityQuestions && this.securityQuestions.length > 0) {
    const salt = await bcrypt.genSalt(10);
    for (let i = 0; i < this.securityQuestions.length; i++) {
      if (this.isModified(`securityQuestions.${i}.answer`)) {
        this.securityQuestions[i].answer = await bcrypt.hash(
          this.securityQuestions[i].answer.toLowerCase().trim(),
          salt
        );
      }
    }
  }
  next();
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.matchSecurityAnswer = async function(questionIndex, enteredAnswer) {
  if (!this.securityQuestions[questionIndex]) {
    return false;
  }
  return await bcrypt.compare(
    enteredAnswer.toLowerCase().trim(),
    this.securityQuestions[questionIndex].answer
  );
};

UserSchema.methods.generateRecoveryCode = function() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return 'BT-' + segments.join('-');
};

module.exports = mongoose.model('User', UserSchema);