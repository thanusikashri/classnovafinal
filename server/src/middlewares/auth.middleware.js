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

const Class = require('../models/Class');

// Helper to ensure user is enrolled student, owner teacher, or admin
exports.requireClassMember = (classIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const classId = req.params[classIdParam] || req.body.classId || req.query.classId;
      if (!classId) {
        return res.status(400).json({ success: false, message: 'Class ID is required' });
      }

      if (req.user.role === 'admin') {
        return next();
      }

      const cls = await Class.findById(classId);
      if (!cls) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }

      const isTeacher = cls.teacher.toString() === req.user.id;
      const isStudent = cls.students.some(s => s.toString() === req.user.id);

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ success: false, message: 'Not authorized: You are not a member of this class' });
      }

      req.currentClass = cls;
      next();
    } catch (err) {
      next(err);
    }
  };
};

exports.requireClassTeacher = (classIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const classId = req.params[classIdParam] || req.body.classId || req.query.classId;
      if (!classId) {
        return res.status(400).json({ success: false, message: 'Class ID is required' });
      }

      if (req.user.role === 'admin') {
        return next();
      }

      const cls = await Class.findById(classId);
      if (!cls) {
        return res.status(404).json({ success: false, message: 'Class not found' });
      }

      if (cls.teacher.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized: You are not the teacher of this class' });
      }

      req.currentClass = cls;
      next();
    } catch (err) {
      next(err);
    }
  };
};

