const tokenService = require('../services/tokenService');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).redirect('/login');
  }

  try {
    const decoded = tokenService.verifyToken(token);

    if (!decoded) {
      return res.status(401).redirect('/login');
    }

    req.user = await User.findById(decoded.userId).select('-password');

    if (!req.user) {
      return res.status(401).redirect('/login');
    }

    next();
  } catch (error) {
    return res.status(401).redirect('/login');
  }
};

const protectAPI = async (req, res, next) => {
  let token;

  if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  try {
    const decoded = tokenService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = await User.findById(decoded.userId).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

module.exports = { protect, protectAPI };