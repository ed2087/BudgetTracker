const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

const generateToken = (userId, householdName, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : jwtConfig.expiresIn;
  
  return jwt.sign(
    { 
      userId, 
      householdName 
    },
    jwtConfig.secret,
    { expiresIn }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    return null;
  }
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};