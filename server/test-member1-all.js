const test = require('node:test');
const assert = require('node:assert');

// Models
const Notification = require('./src/models/Notification');
const Class = require('./src/models/Class');
const User = require('./src/models/User');
const AttendanceSession = require('./src/models/AttendanceSession');
const AttendanceRecord = require('./src/models/AttendanceRecord');
const LeaveApplication = require('./src/models/LeaveApplication');
const StudyMaterial = require('./src/models/StudyMaterial');
const Assignment = require('./src/models/Assignment');

// Controllers
const { markRead } = require('./src/controllers/notification.controller');
const { getTeacherDashboard, getStudentDashboard } = require('./src/controllers/dashboard.controller');
const { getAdminStats } = require('./src/controllers/admin.controller');
const { startSession, submitAttendance, getActiveSession } = require('./src/controllers/attendance.controller');
const { applyForLeave, reviewLeave, cancelLeave } = require('./src/controllers/leave.controller');
const { calculateStudentAttendance } = require('./src/services/attendance.service');
const assessmentAdapter = require('./src/services/assessmentAdapter');

test('Member 1 Comprehensive Test Suite', async (t) => {

  await t.test('1. Notification recipient isolation', async () => {
    const mockReq = {
      user: { id: 'user1' },
      params: { id: 'notif1' }
    };
    
    Notification.findById = async (id) => ({
      _id: id,
      recipient: { toString: () => 'user2' },
      isRead: false,
      save: async () => {}
    });

    let responseData = null;
    let statusCode = null;
    const mockRes = { 
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await markRead(mockReq, mockRes, () => {});
    
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseData.message, 'Not authorized to access this notification');
  });

  await t.test('2. OTP Attendance Generation (Teacher)', async () => {
    Class.findById = async (id) => ({
      _id: 'class1',
      name: 'Class 1',
      teacher: { toString: () => 'teacher1' },
      students: ['student1']
    });

    AttendanceSession.updateMany = async () => ({ modifiedCount: 1 });
    AttendanceSession.create = async (doc) => ({
      _id: 'session1',
      ...doc
    });

    const mockReq = {
      user: { id: 'teacher1', role: 'teacher' },
      params: { classId: 'class1' }
    };

    let responseData = null;
    let statusCode = null;
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await startSession(mockReq, mockRes, () => {});

    assert.strictEqual(statusCode, 201);
    assert.ok(responseData.success);
    assert.strictEqual(responseData.data.sessionId, 'session1');
    assert.strictEqual(typeof responseData.data.otp, 'string');
    assert.strictEqual(responseData.data.otp.length, 6);
  });

  await t.test('3. OTP Concealment for Student in Active Session', async () => {
    Class.findById = async (id) => ({
      _id: 'class1',
      teacher: { toString: () => 'teacher1' },
      students: [{ toString: () => 'student1' }]
    });

    AttendanceSession.findOne = () => ({
      select: () => ({
        _id: 'session1',
        classId: 'class1',
        status: 'active',
        expiresAt: new Date(Date.now() + 60000),
        otp: '123456'
      })
    });

    // Student requesting active session
    const mockReqStudent = {
      user: { id: 'student1', role: 'student' },
      params: { classId: 'class1' }
    };

    let studentResData = null;
    const mockResStudent = {
      status: () => ({ json: (data) => { studentResData = data; } })
    };

    await getActiveSession(mockReqStudent, mockResStudent, () => {});

    assert.ok(studentResData.success);
    assert.strictEqual(studentResData.data.sessionId, 'session1');
    // Student must NEVER receive OTP!
    assert.strictEqual(studentResData.data.otp, undefined);

    // Teacher requesting active session
    const mockReqTeacher = {
      user: { id: 'teacher1', role: 'teacher' },
      params: { classId: 'class1' }
    };

    let teacherResData = null;
    const mockResTeacher = {
      status: () => ({ json: (data) => { teacherResData = data; } })
    };

    await getActiveSession(mockReqTeacher, mockResTeacher, () => {});

    assert.ok(teacherResData.success);
    // Teacher sees OTP
    assert.strictEqual(teacherResData.data.otp, '123456');
  });

  await t.test('4. OTP Attendance Submission Validation & Expiry', async () => {
    // Expired session test
    AttendanceSession.findById = () => ({
      select: () => ({
        _id: 'sessionExpired',
        classId: 'class1',
        status: 'active',
        expiresAt: new Date(Date.now() - 5000), // in the past
        otp: '654321',
        save: async () => {}
      })
    });

    const mockReq = {
      user: { id: 'student1', role: 'student' },
      body: { sessionId: 'sessionExpired', otp: '654321' }
    };

    let responseData = null;
    let statusCode = null;
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await submitAttendance(mockReq, mockRes, () => {});

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.message, 'This attendance session has expired or is closed');
  });

  await t.test('5. Attendance percentage excluding approved leaves', async () => {
    const classId = 'class1';
    const studentId = 'student1';

    // 4 sessions: 2 attended, 1 unexcused missed, 1 during approved leave
    AttendanceSession.find = async () => [
      { _id: 's1', createdAt: new Date('2026-10-01T10:00:00Z') },
      { _id: 's2', createdAt: new Date('2026-10-02T10:00:00Z') },
      { _id: 's3', createdAt: new Date('2026-10-03T10:00:00Z') }, // missed during leave
      { _id: 's4', createdAt: new Date('2026-10-04T10:00:00Z') }  // unexcused missed
    ];

    AttendanceRecord.find = async () => [
      { sessionId: 's1', status: 'present' },
      { sessionId: 's2', status: 'present' }
    ];

    LeaveApplication.find = async () => [
      {
        startDate: new Date('2026-10-03T00:00:00Z'),
        endDate: new Date('2026-10-03T23:59:59Z'),
        status: 'approved'
      }
    ];

    const metrics = await calculateStudentAttendance(classId, studentId);
    assert.strictEqual(metrics.totalSessions, 4);
    assert.strictEqual(metrics.attendedSessions, 2);
    assert.strictEqual(metrics.approvedLeaveSessions, 1);
    assert.strictEqual(metrics.eligibleSessions, 3); // 4 - 1 = 3
    assert.strictEqual(metrics.percentage, 67); // Math.round((2 / 3) * 100) = 67%
  });

  await t.test('6. Leave Application Date Validation & Authorization', async () => {
    Class.findById = async () => ({
      _id: 'class1',
      students: [{ toString: () => 'student1' }]
    });

    const mockReqInvalidDate = {
      user: { id: 'student1', role: 'student', name: 'Student 1' },
      body: {
        classId: 'class1',
        startDate: '2026-10-15',
        endDate: '2026-10-10', // End before start
        reason: 'Holiday'
      }
    };

    let statusCode = null;
    let responseData = null;
    const mockRes = {
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };

    await applyForLeave(mockReqInvalidDate, mockRes, () => {});

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseData.message, 'Start date cannot be after end date');
  });

  await t.test('7. Admin stats aggregate real counts', async () => {
    User.countDocuments = async (query) => {
      if (!query) return 100;
      if (query.role === 'student') return 80;
      if (query.role === 'teacher') return 15;
      if (query.role === 'admin') return 5;
    };
    Class.countDocuments = async () => 10;
    Class.find = () => ({
      select: async () => [
        { students: ['s1', 's2'] },
        { students: ['s3'] }
      ]
    });
    Assignment.countDocuments = async () => 25;
    StudyMaterial.countDocuments = async () => 12;
    AttendanceSession.countDocuments = async () => 30;
    AttendanceRecord.countDocuments = async () => 150;
    LeaveApplication.countDocuments = async (query) => {
      if (query?.status === 'pending') return 3;
      return 15;
    };

    let responseData = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => { responseData = data; }
      })
    };

    await getAdminStats({}, mockRes, () => {});

    assert.ok(responseData.success);
    assert.strictEqual(responseData.data.users.total, 100);
    assert.strictEqual(responseData.data.classes.total, 10);
    assert.strictEqual(responseData.data.classes.totalEnrollments, 3);
    assert.strictEqual(responseData.data.academic.assignments, 25);
    assert.strictEqual(responseData.data.academic.materials, 12);
    assert.strictEqual(responseData.data.attendance.sessions, 30);
    assert.strictEqual(responseData.data.attendance.records, 150);
    assert.strictEqual(responseData.data.leaves.pending, 3);
  });

  await t.test('8. Shared Assessment Adapter returns truthful data', async () => {
    const stats = await assessmentAdapter.getAdminAssessmentStats();
    assert.strictEqual(typeof stats.isAvailable, 'boolean');
    assert.strictEqual(typeof stats.totalQuizzes, 'number');
  });
});
