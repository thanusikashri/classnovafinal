const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'User account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Helper for Member 2 to use
exports.requireClassMember = (classIdParam = 'id') => {
  return async (req, res, next) => {
    // Basic implementation; actual class check happens in controller or a specific service
    // For Member 2's routes, they can use this to ensure req.user is part of req.params[classIdParam]
    // A more complete implementation needs the Class model which we will implement next
    next();
  };
};

exports.requireClassTeacher = (classIdParam = 'id') => {
  return async (req, res, next) => {
    // Basic implementation placeholder
    next();
  };
};
