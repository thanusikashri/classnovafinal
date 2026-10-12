const Assignment = require('../models/Assignment');
const Class = require('../models/Class');
const Notification = require('../models/Notification');

// @desc    Get assignments for a class
// @route   GET /api/classes/:classId/assignments
// @access  Private (Students enrolled, or teacher/admin)
exports.getAssignments = async (req, res, next) => {
  try {
    const classId = req.params.classId;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Check permissions
    if (req.user.role === 'student' && !cls.students.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this class' });
    }

    const assignments = await Assignment.find({ classId }).sort('-createdAt').populate('teacher', 'name email');

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new assignment
// @route   POST /api/classes/:classId/assignments
// @access  Private (Teacher/Admin)
exports.createAssignment = async (req, res, next) => {
  try {
    const classId = req.params.classId;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Ensure user is the teacher of this class or an admin
    if (cls.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to create assignments for this class' });
    }

    req.body.classId = classId;
    req.body.teacher = req.user.id;

    const assignment = await Assignment.create(req.body);

    // Create notifications for all students in the class
    if (cls.students && cls.students.length > 0) {
      const notifications = cls.students.map(studentId => ({
        recipient: studentId,
        title: `New Assignment in ${cls.name}`,
        message: `Assignment: ${assignment.title}`,
        type: 'assignment',
        link: `/classes/${cls._id}/assignments/${assignment._id}`
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      data: assignment
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single assignment
// @route   GET /api/classes/:classId/assignments/:id
// @access  Private
exports.getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('teacher', 'name email');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const cls = await Class.findById(assignment.classId);
    if (req.user.role === 'student' && !cls.students.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this assignment' });
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update assignment
// @route   PUT /api/classes/:classId/assignments/:id
// @access  Private (Teacher/Admin)
exports.updateAssignment = async (req, res, next) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Check ownership
    if (assignment.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this assignment' });
    }

    // Prevent changing classId or teacher
    delete req.body.classId;
    delete req.body.teacher;

    assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('teacher', 'name email');

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete assignment
// @route   DELETE /api/classes/:classId/assignments/:id
// @access  Private (Teacher/Admin)
exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Check ownership
    if (assignment.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this assignment' });
    }

    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
