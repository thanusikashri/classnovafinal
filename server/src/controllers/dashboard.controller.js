const Class = require('../models/Class');
const Announcement = require('../models/Announcement');
const StudyMaterial = require('../models/StudyMaterial');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const LeaveApplication = require('../models/LeaveApplication');
const { calculateStudentAttendance, calculateOverallStudentAttendance } = require('../services/attendance.service');
const assessmentAdapter = require('../services/assessmentAdapter');

// @desc    Get student dashboard data
// @route   GET /api/dashboard/student
// @access  Private (Student)
exports.getStudentDashboard = async (req, res, next) => {
  try {
    const classes = await Class.find({ students: req.user.id })
      .populate('teacher', 'name email');

    const classIds = classes.map(c => c._id);

    const announcements = await Announcement.find({ classId: { $in: classIds } })
      .populate('author', 'name')
      .populate('classId', 'name')
      .sort('-createdAt')
      .limit(5);

    const recentMaterials = await StudyMaterial.find({ classId: { $in: classIds } })
      .populate('teacher', 'name')
      .populate('classId', 'name')
      .sort('-createdAt')
      .limit(5);

    // Real Attendance percentage
    const attendancePercentage = await calculateOverallStudentAttendance(classIds, req.user.id);

    // Recent Leave applications for this student (all statuses: pending, approved, rejected)
    const leaves = await LeaveApplication.find({
      student: req.user.id
    })
    .populate('classId', 'name')
    .populate('reviewedBy', 'name')
    .sort('-createdAt')
    .limit(10);

    const pendingLeaves = leaves.filter(l => l.status === 'pending');

    // Upcoming assessments via adapter
    const upcomingAssessments = await assessmentAdapter.getStudentUpcomingAssessments(classIds, req.user.id);

    res.status(200).json({
      success: true,
      data: {
        classes,
        announcements,
        attendance: attendancePercentage,
        leaves: leaves || [],
        pendingLeaves: pendingLeaves || [],
        recentMaterials: recentMaterials || [],
        upcomingAssessments: upcomingAssessments.items || []
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get teacher dashboard data
// @route   GET /api/dashboard/teacher
// @access  Private (Teacher, Admin)
exports.getTeacherDashboard = async (req, res, next) => {
  try {
    // Admin can see all, teacher sees their own
    const query = req.user.role === 'admin' ? {} : { teacher: req.user.id };
    
    const classes = await Class.find(query)
      .populate('teacher', 'name email');

    const classIds = classes.map(c => c._id);

    const announcements = await Announcement.find({ classId: { $in: classIds } })
      .populate('author', 'name')
      .populate('classId', 'name')
      .sort('-createdAt')
      .limit(5);
      
    const recentMaterials = await StudyMaterial.find({ classId: { $in: classIds } })
      .populate('teacher', 'name')
      .populate('classId', 'name')
      .sort('-createdAt')
      .limit(5);

    // Pending leaves requiring teacher review for their classes
    const pendingLeaves = await LeaveApplication.find({
      classId: { $in: classIds },
      status: 'pending'
    })
    .populate('student', 'name email')
    .populate('classId', 'name')
    .sort('-createdAt')
    .limit(5);

    // Today's attendance sessions for teacher's classes
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaysSessions = await AttendanceSession.find({
      classId: { $in: classIds },
      createdAt: { $gte: startOfToday }
    })
    .populate('classId', 'name')
    .sort('-createdAt');

    const todaysAttendanceList = [];
    for (const session of todaysSessions) {
      const recordsCount = await AttendanceRecord.countDocuments({ sessionId: session._id, status: 'present' });
      todaysAttendanceList.push({
        _id: session._id,
        classId: session.classId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        status: session.status,
        presentCount: recordsCount
      });
    }

    const upcomingAssignments = await Assignment.find({ classId: { $in: classIds } })
      .populate('classId', 'name')
      .sort('dueDate')
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        classes,
        announcements,
        upcomingAssignments,
        todaysAttendance: todaysAttendanceList,
        pendingLeaves: pendingLeaves || [],
        recentMaterials: recentMaterials || []
      }
    });
  } catch (err) {
    next(err);
  }
};
