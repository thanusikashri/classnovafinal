const crypto = require('crypto');
const Class = require('../models/Class');

// @desc    Get classes
// @route   GET /api/classes
// @access  Private
exports.getClasses = async (req, res, next) => {
  try {
    let query;

    if (req.user.role === 'admin') {
      query = Class.find().populate('teacher', 'name email');
    } else if (req.user.role === 'teacher') {
      query = Class.find({ teacher: req.user.id }).populate('teacher', 'name email');
    } else {
      if (req.query.enrolledOnly === 'true') {
        query = Class.find({ students: req.user.id }).populate('teacher', 'name email');
      } else {
        query = Class.find().populate('teacher', 'name email');
      }
    }

    const classes = await query;
    res.status(200).json({ success: true, count: classes.length, data: classes });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
exports.getClass = async (req, res, next) => {
  try {
    const classData = await Class.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('students', 'name email');

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const isEnrolled = classData.students.some(s => s._id.toString() === req.user.id);
    const isTeacher = classData.teacher._id.toString() === req.user.id || req.user.role === 'admin';

    const responseData = classData.toObject();
    responseData.isEnrolled = isTeacher || isEnrolled;

    res.status(200).json({ success: true, data: responseData });
  } catch (err) {
    next(err);
  }
};

// @desc    Create class
// @route   POST /api/classes
// @access  Private (Teacher, Admin)
exports.createClass = async (req, res, next) => {
  try {
    req.body.teacher = req.user.id;
    
    // Auto-generate class code securely
    const generateCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
    let classCode = generateCode();
    
    // Ensure unique code
    let exists = await Class.findOne({ classCode });
    while (exists) {
      classCode = generateCode();
      exists = await Class.findOne({ classCode });
    }
    req.body.classCode = classCode;

    const classData = await Class.create(req.body);
    res.status(201).json({ success: true, data: classData });
  } catch (err) {
    next(err);
  }
};

// @desc    Enroll student via class code
// @route   POST /api/classes/enroll
// @access  Private (Student)
exports.enrollStudent = async (req, res, next) => {
  try {
    const { classCode } = req.body;
    
    if (!classCode) {
      return res.status(400).json({ success: false, message: 'Please provide a class code' });
    }

    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can enroll' });
    }

    const normalizedCode = classCode.trim().toUpperCase();

    // Pre-check for proper error message
    const existingClass = await Class.findOne({ classCode: normalizedCode });
    if (!existingClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    if (existingClass.students.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this class' });
    }

    // Atomic update to prevent race conditions
    const classData = await Class.findOneAndUpdate(
      { classCode: normalizedCode },
      { $addToSet: { students: req.user.id } },
      { new: true }
    );

    res.status(200).json({ success: true, data: classData });
  } catch (err) {
    next(err);
  }
};

// @desc    Enroll student via class ID
// @route   POST /api/classes/:id/enroll
// @access  Private (Student)
exports.enrollStudentById = async (req, res, next) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can enroll' });
    }

    const existingClass = await Class.findById(req.params.id);
    if (!existingClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (existingClass.students.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Already enrolled in this class' });
    }

    const classData = await Class.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { students: req.user.id } },
      { new: true }
    );

    res.status(200).json({ success: true, data: classData, message: `Enrolled in ${existingClass.name} successfully` });
  } catch (err) {
    next(err);
  }
};
