const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const LeaveApplication = require('../models/LeaveApplication');

/**
 * Calculates attendance metrics for a student in a class,
 * properly excluding approved leave dates from denominator.
 * 
 * Formula:
 * Attended = count of present sessions
 * Approved Leaves = sessions during which student had an approved leave
 * Eligible Sessions = total class sessions - approved leave sessions
 * Percentage = eligible > 0 ? (Attended / Eligible) * 100 : 100
 */
exports.calculateStudentAttendance = async (classId, studentId) => {
  // 1. Get all closed/active sessions for the class
  const sessions = await AttendanceSession.find({ classId });
  const totalSessions = sessions.length;

  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      attendedSessions: 0,
      approvedLeaveSessions: 0,
      eligibleSessions: 0,
      percentage: 100 // 100% when no sessions conducted yet
    };
  }

  // 2. Get attended records
  const sessionIds = sessions.map(s => s._id);
  const records = await AttendanceRecord.find({
    sessionId: { $in: sessionIds },
    studentId,
    status: 'present'
  });
  const attendedSessions = records.length;

  // 3. Get approved leaves for this student in this class
  const approvedLeaves = await LeaveApplication.find({
    classId,
    student: studentId,
    status: 'approved'
  });

  // Calculate sessions falling into approved leave dates
  let approvedLeaveSessions = 0;
  if (approvedLeaves.length > 0) {
    const leavePeriods = approvedLeaves.map(l => {
      const s = new Date(l.startDate);
      s.setUTCHours(0, 0, 0, 0);
      const e = new Date(l.endDate);
      e.setUTCHours(23, 59, 59, 999);
      return { start: s.getTime(), end: e.getTime() };
    });

    for (const session of sessions) {
      const sessionTime = new Date(session.createdAt).getTime();
      const isDuringLeave = leavePeriods.some(lp => sessionTime >= lp.start && sessionTime <= lp.end);
      if (isDuringLeave) {
        approvedLeaveSessions++;
      }
    }
  }

  const eligibleSessions = Math.max(0, totalSessions - approvedLeaveSessions);
  const percentage = eligibleSessions > 0
    ? Math.min(100, Math.round((attendedSessions / eligibleSessions) * 100))
    : 100;

  return {
    totalSessions,
    attendedSessions,
    approvedLeaveSessions,
    eligibleSessions,
    percentage
  };
};

/**
 * Calculates overall attendance across all enrolled classes for a student
 */
exports.calculateOverallStudentAttendance = async (classIds, studentId) => {
  if (!classIds || classIds.length === 0) {
    return 100;
  }

  let totalAttended = 0;
  let totalEligible = 0;
  let hasAnySessions = false;

  for (const cId of classIds) {
    const metrics = await exports.calculateStudentAttendance(cId, studentId);
    if (metrics.totalSessions > 0) {
      hasAnySessions = true;
      totalAttended += metrics.attendedSessions;
      totalEligible += metrics.eligibleSessions;
    }
  }

  if (!hasAnySessions || totalEligible === 0) {
    return 100;
  }

  return Math.min(100, Math.round((totalAttended / totalEligible) * 100));
};
