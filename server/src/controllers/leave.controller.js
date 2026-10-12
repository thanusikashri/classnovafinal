const LeaveApplication = require('../models/LeaveApplication');
const Class = require('../models/Class');
const Notification = require('../models/Notification');

// @desc    Apply for leave (Student)
// @route   POST /api/leaves
// @access  Private (Student)
exports.applyForLeave = async (req, res, next) => {
  try {
    const { classId, startDate, endDate, reason } = req.body;

    if (!classId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide classId, startDate, endDate, and reason'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or end date' });
    }

    if (start > end) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
    }

    // Verify enrollment
    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const isEnrolled = cls.students.some(s => s.toString() === req.user.id);
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this class' });
    }

    const leave = await LeaveApplication.create({
      student: req.user.id,
      classId,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      status: 'pending'
    });

    // Notify the class teacher
    try {
      await Notification.create({
        recipient: cls.teacher,
        title: 'New Leave Application',
        message: `${req.user.name} applied for leave in ${cls.name}`,
        type: 'leave',
        link: `/teacher-dashboard`
      });
    } catch (notifErr) {
      console.error('Failed to notify teacher of leave application', notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: leave
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student's own leave applications
// @route   GET /api/leaves/my
// @access  Private (Student)
exports.getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await LeaveApplication.find({ student: req.user.id })
      .populate('classId', 'name')
      .populate('reviewedBy', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel a pending leave application (Student)
// @route   PUT /api/leaves/:id/cancel
// @access  Private (Student)
exports.cancelLeave = async (req, res, next) => {
  try {
    const leave = await LeaveApplication.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave application not found' });
    }

    if (leave.student.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this application' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot cancel a leave application that is already ${leave.status}` });
    }

    leave.status = 'cancelled';
    await leave.save();

    res.status(200).json({
      success: true,
      message: 'Leave application cancelled',
      data: leave
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get leave applications for teacher's classes
// @route   GET /api/leaves/teacher
// @access  Private (Teacher, Admin)
exports.getTeacherLeaves = async (req, res, next) => {
  try {
    let classQuery = {};
    if (req.user.role !== 'admin') {
      classQuery = { teacher: req.user.id };
    }

    const classes = await Class.find(classQuery);
    const classIds = classes.map(c => c._id);

    const filter = { classId: { $in: classIds } };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const leaves = await LeaveApplication.find(filter)
      .populate('student', 'name email')
      .populate('classId', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Review (Approve/Reject) leave application
// @route   PUT /api/leaves/:id/review
// @access  Private (Teacher, Admin)
exports.reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const leave = await LeaveApplication.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave application not found' });
    }

    const cls = await Class.findById(leave.classId);
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (req.user.role !== 'admin' && cls.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to review this leave request' });
    }

    // Prevent duplicate notification / redundant state change
    const isSameStatus = leave.status === status;

    leave.status = status;
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    if (reviewNote) leave.reviewNote = reviewNote.trim();
    await leave.save();

    if (!isSameStatus) {
      try {
        await Notification.create({
          recipient: leave.student,
          title: `Leave Application ${status.toUpperCase()}`,
          message: `Your leave application for ${cls.name} has been ${status}.`,
          type: 'leave',
          link: `/student-dashboard`
        });
      } catch (notifErr) {
        console.error('Failed to notify student of leave decision', notifErr);
      }
    }

    res.status(200).json({
      success: true,
      message: `Leave application ${status}`,
      data: leave
    });
  } catch (err) {
    next(err);
  }
};
