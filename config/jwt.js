module.exports = {
  secret: process.env.JWT_SECRET || 'your-super-secret-key-change-this',
  expiresIn: process.env.JWT_EXPIRE || '7d',
  cookieExpire: parseInt(process.env.COOKIE_EXPIRE) || 7,
  
  getCookieOptions: () => {
    return {
      expires: new Date(Date.now() + (parseInt(process.env.COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
  },
  
  getRememberMeCookieOptions: () => {
    return {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
  }
};