const crypto = require('crypto');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Class = require('../models/Class');
const { env } = require('../config/env');
const { calculateStudentAttendance } = require('../services/attendance.service');

// Helper to generate a secure random 6-digit OTP
const generateSecureOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// @desc    Start attendance session (Teacher)
// @route   POST /api/attendance/classes/:classId/start
// @access  Private (Teacher, Admin)
exports.startSession = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (req.user.role !== 'admin' && cls.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized: You are not the teacher of this class' });
    }

    // Close any prior active session for this class
    await AttendanceSession.updateMany(
      { classId, status: 'active' },
      { status: 'expired' }
    );

    const otp = generateSecureOTP();
    const expirySeconds = env.OTP_EXPIRY_SECONDS || 60;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    const session = await AttendanceSession.create({
      classId,
      teacher: req.user.id,
      otp,
      expiresAt,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session._id,
        classId: session.classId,
        otp: session.otp, // returned only to teacher upon starting
        expiresAt: session.expiresAt,
        expirySeconds,
        status: session.status
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    End/Close attendance session (Teacher)
// @route   PUT /api/attendance/sessions/:sessionId/close
// @access  Private (Teacher, Admin)
exports.closeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await AttendanceSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found' });
    }

    if (req.user.role !== 'admin' && session.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to close this session' });
    }

    session.status = 'closed';
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get active session for a class (Teacher or Student)
// @route   GET /api/attendance/classes/:classId/active
// @access  Private
exports.getActiveSession = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const isTeacher = req.user.role === 'admin' || cls.teacher.toString() === req.user.id;
    const isStudent = cls.students.some(s => s.toString() === req.user.id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ success: false, message: 'Not a member of this class' });
    }

    const session = await AttendanceSession.findOne({
      classId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).select('+otp');

    if (!session) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }

    // CRITICAL: Never expose OTP to students!
    const responseData = {
      sessionId: session._id,
      classId: session.classId,
      expiresAt: session.expiresAt,
      status: session.status
    };

    if (isTeacher) {
      responseData.otp = session.otp;
    }

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit OTP to mark attendance (Student)
// @route   POST /api/attendance/submit
// @access  Private (Student)
exports.submitAttendance = async (req, res, next) => {
  try {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({ success: false, message: 'Session ID and OTP are required' });
    }

    const session = await AttendanceSession.findById(sessionId).select('+otp');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found' });
    }

    // Check session status and expiry using server time
    const now = new Date();
    if (session.status !== 'active' || now > new Date(session.expiresAt)) {
      if (session.status === 'active') {
        session.status = 'expired';
        await session.save();
      }
      return res.status(400).json({ success: false, message: 'This attendance session has expired or is closed' });
    }

    // Verify enrollment
    const cls = await Class.findById(session.classId);
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const isEnrolled = cls.students.some(s => s.toString() === req.user.id);
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this class' });
    }

    // Verify OTP (string comparison)
    if (session.otp !== otp.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    // Check duplicate attendance
    const existing = await AttendanceRecord.findOne({
      sessionId: session._id,
      studentId: req.user.id
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for this session' });
    }

    const record = await AttendanceRecord.create({
      sessionId: session._id,
      classId: session.classId,
      studentId: req.user.id,
      status: 'present',
      markedAt: now
    });

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: record
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for this session' });
    }
    next(err);
  }
};

// @desc    Get session attendance details (Teacher)
// @route   GET /api/attendance/sessions/:sessionId
// @access  Private (Teacher, Admin)
exports.getSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await AttendanceSession.findById(sessionId).populate('classId', 'name');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (req.user.role !== 'admin' && session.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const records = await AttendanceRecord.find({ sessionId })
      .populate('studentId', 'name email')
      .sort('-markedAt');

    res.status(200).json({
      success: true,
      data: {
        session,
        records,
        totalPresent: records.length
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get class attendance report & history
// @route   GET /api/attendance/classes/:classId/report
// @access  Private (Teacher, Admin, or Student personal)
exports.getClassAttendanceReport = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const cls = await Class.findById(classId).populate('students', 'name email');

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const isTeacher = req.user.role === 'admin' || cls.teacher.toString() === req.user.id;
    const isStudent = cls.students.some(s => s._id.toString() === req.user.id);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (isTeacher) {
      const sessions = await AttendanceSession.find({ classId }).sort('-createdAt');
      
      const studentReports = [];
      for (const student of cls.students) {
        const metrics = await calculateStudentAttendance(classId, student._id);
        studentReports.push({
          student: {
            _id: student._id,
            name: student.name,
            email: student.email
          },
          ...metrics
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          classId: cls._id,
          className: cls.name,
          totalSessions: sessions.length,
          sessions,
          students: studentReports
        }
      });
    }

    // Student view: only their personal data
    const metrics = await calculateStudentAttendance(classId, req.user.id);
    const myRecords = await AttendanceRecord.find({
      classId,
      studentId: req.user.id
    }).populate('sessionId', 'createdAt');

    res.status(200).json({
      success: true,
      data: {
        classId: cls._id,
        className: cls.name,
        ...metrics,
        records: myRecords
      }
    });
  } catch (err) {
    next(err);
  }
};
