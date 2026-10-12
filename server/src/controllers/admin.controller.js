const User = require('../models/User');
const Class = require('../models/Class');
const Assignment = require('../models/Assignment');
const StudyMaterial = require('../models/StudyMaterial');
const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const LeaveApplication = require('../models/LeaveApplication');
const assessmentAdapter = require('../services/assessmentAdapter');

// @desc    Get admin statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getAdminStats = async (req, res, next) => {
  try {
    // 1. Users by role
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    
    // 2. Classes and total unique enrollments
    const totalClasses = await Class.countDocuments();
    const classes = await Class.find().select('students');
    let totalEnrollments = 0;
    classes.forEach(c => {
      totalEnrollments += (c.students ? c.students.length : 0);
    });

    // 3. Assignments & Materials
    const totalAssignments = await Assignment.countDocuments();
    const totalMaterials = await StudyMaterial.countDocuments();

    // 4. Attendance sessions and records
    const totalAttendanceSessions = await AttendanceSession.countDocuments();
    const totalAttendanceRecords = await AttendanceRecord.countDocuments();

    // 5. Leave applications
    const pendingLeaves = await LeaveApplication.countDocuments({ status: 'pending' });
    const totalLeaves = await LeaveApplication.countDocuments();

    // 6. Assessments via adapter
    const assessmentStats = await assessmentAdapter.getAdminAssessmentStats();

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          students: totalStudents,
          teachers: totalTeachers,
          admins: totalAdmins
        },
        classes: {
          total: totalClasses,
          totalEnrollments
        },
        academic: {
          assignments: totalAssignments,
          materials: totalMaterials
        },
        attendance: {
          sessions: totalAttendanceSessions,
          records: totalAttendanceRecords
        },
        leaves: {
          pending: pendingLeaves,
          total: totalLeaves
        },
        assessments: assessmentStats.isAvailable ? {
          totalQuizzes: assessmentStats.totalQuizzes,
          totalAttempts: assessmentStats.totalAttempts
        } : null
      }
    });
  } catch (err) {
    next(err);
  }
};
