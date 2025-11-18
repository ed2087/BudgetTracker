const User = require('../models/User');
const tokenService = require('../services/tokenService');
const jwtConfig = require('../config/jwt');

exports.login = async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = tokenService.generateToken(user._id, user.householdName, rememberMe);

    const cookieOptions = rememberMe ? jwtConfig.getRememberMeCookieOptions() : jwtConfig.getCookieOptions();

    res.cookie('token', token, cookieOptions);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        householdName: user.householdName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.register = async (req, res) => {
  try {
    const { username, password, householdName, securityQuestions } = req.body;

    if (!username || !password || !householdName) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    if (!securityQuestions || securityQuestions.length !== 2) {
      return res.status(400).json({ success: false, message: 'Two security questions required' });
    }

    for (let sq of securityQuestions) {
      if (!sq.question || !sq.answer) {
        return res.status(400).json({ success: false, message: 'Security question and answer required' });
      }
      if (sq.answer.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Security answers must be at least 2 characters' });
      }
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const user = new User({
      username,
      password,
      householdName,
      securityQuestions
    });

    const recoveryCode = user.generateRecoveryCode();
    user.recoveryCode = recoveryCode;

    await user.save();

    // NO BALANCE CREATION

    res.status(201).json({
      success: true,
      recoveryCode: recoveryCode,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }

    const user = await User.findOne({ username }).select('securityQuestions');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const questions = user.securityQuestions.map(sq => sq.question);

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifySecurityAnswers = async (req, res) => {
  try {
    const { username, answers } = req.body;

    if (!username || !answers || answers.length !== 2) {
      return res.status(400).json({ success: false, message: 'Username and two answers required' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const match0 = await user.matchSecurityAnswer(0, answers[0]);
    const match1 = await user.matchSecurityAnswer(1, answers[1]);

    if (!match0 || !match1) {
      return res.status(401).json({ success: false, message: 'Incorrect answers' });
    }

    const resetToken = tokenService.generateToken(user._id, user.householdName, false);

    res.json({
      success: true,
      resetToken
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyRecoveryCode = async (req, res) => {
  try {
    const { username, recoveryCode } = req.body;

    if (!username || !recoveryCode) {
      return res.status(400).json({ success: false, message: 'Username and recovery code required' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.recoveryCode !== recoveryCode.toUpperCase().trim()) {
      return res.status(401).json({ success: false, message: 'Invalid recovery code' });
    }

    const resetToken = tokenService.generateToken(user._id, user.householdName, false);

    res.json({
      success: true,
      resetToken
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const decoded = tokenService.verifyToken(resetToken);

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    const newRecoveryCode = user.generateRecoveryCode();
    user.recoveryCode = newRecoveryCode;

    await user.save();

    res.json({
      success: true,
      recoveryCode: newRecoveryCode,
      message: 'Password reset successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.logout = (req, res) => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true
  });

  res.json({ success: true });
};

exports.verifyToken = (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      householdName: req.user.householdName
    }
  });
};