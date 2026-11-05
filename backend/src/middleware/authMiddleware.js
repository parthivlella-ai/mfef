const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'meditrack_super_secret_jwt_key_2026_xyz'
      );

      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        if (user.status === 'inactive') {
          return res.status(403).json({
            success: false,
            message: 'Your account is deactivated. Please contact an administrator.',
          });
        }
        req.user = user;
        return next();
      }

      return res.status(401).json({
        success: false,
        message: 'User no longer exists or session has expired',
      });
    } catch (error) {
      const isExpired = error.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        isExpired,
        message: isExpired ? 'Session expired. Please log in again.' : 'Invalid authentication token',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Administrator privileges required',
  });
};

module.exports = {
  protect,
  adminOnly,
};
