const express = require('express');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { demoStore } = require('../services/demoStore');

const router = express.Router();

// Helper to sign JWT in demo mode
const generateDemoToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, isDemoUser: true },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN || '7d' }
  );
};

// Middleware to authenticate demo tokens
const authenticateDemo = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized: token missing' });
  }
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = demoStore.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User session not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid session token' });
  }
};

// Role guard for demo routes
const authorizeDemo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this action`
      });
    }
    next();
  };
};

// --- AUTH ROUTES ---
router.post('/auth/login', (req, res) => {
  const { email } = req.body;
  const user = demoStore.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Unrecognized credentials. Try student@demo.classnova.local, teacher@demo.classnova.local, or admin@demo.classnova.local'
    });
  }
  const token = generateDemoToken(user);
  res.status(200).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

router.get('/auth/me', authenticateDemo, (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

router.post('/auth/logout', (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

router.get('/demo/accounts', (req, res) => {
  res.status(200).json({
    success: true,
    accounts: [
      { role: 'student', email: 'student@demo.classnova.local', label: 'Alex Johnson (Student)' },
      { role: 'teacher', email: 'teacher@demo.classnova.local', label: 'Dr. Sarah Williams (Professor)' },
      { role: 'admin', email: 'admin@demo.classnova.local', label: 'System Administrator' }
    ]
  });
});

router.post('/demo/reset', authenticateDemo, (req, res) => {
  demoStore.reset();
  res.status(200).json({ success: true, message: 'Data store reset successfully' });
});

// --- DASHBOARD ROUTES ---
router.get('/dashboard/student', authenticateDemo, authorizeDemo('student', 'admin'), (req, res) => {
  const classes = demoStore.getClasses(req.user._id, 'student');
  const classIds = classes.map(c => c._id);

  // Collect announcements across all enrolled classes
  const announcements = demoStore.getAnnouncements().filter(a => {
    const cId = typeof a.classId === 'object' ? a.classId._id : a.classId;
    return classIds.includes(cId);
  }).slice(0, 10);

  // Collect materials across enrolled classes
  const recentMaterials = demoStore.getMaterials().filter(m => classIds.includes(m.classId)).slice(0, 10);

  // Collect student leaves (all statuses) and pending leaves
  const allStudentLeaves = demoStore.getStudentLeaves(req.user._id);
  const pendingLeaves = allStudentLeaves.filter(l => l.status === 'pending');

  // Collect upcoming assignments across all enrolled classes
  const upcomingAssessments = demoStore.getAssignments().filter(a => classIds.includes(a.classId)).map(a => ({
    _id: a._id,
    title: a.title,
    dueDate: a.dueDate,
    type: 'assignment',
    classId: a.classId
  })).slice(0, 5);

  res.status(200).json({
    success: true,
    data: {
      classes,
      announcements,
      attendance: 94,
      leaves: allStudentLeaves,
      pendingLeaves,
      recentMaterials,
      upcomingAssessments,
      upcomingAssignments: upcomingAssessments
    }
  });
});

router.get('/dashboard/teacher', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const classes = demoStore.getClasses(req.user._id, 'teacher');
  const classIds = classes.map(c => c._id);

  // Collect announcements across all classes taught by this teacher
  const announcements = demoStore.getAnnouncements().filter(a => {
    const cId = typeof a.classId === 'object' ? a.classId._id : a.classId;
    return classIds.includes(cId);
  }).slice(0, 10);

  // Collect assignments across classes taught by this teacher
  const upcomingAssignments = demoStore.getAssignments().filter(a => classIds.includes(a.classId)).map(a => {
    const cls = classes.find(c => c._id === a.classId);
    return {
      _id: a._id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      classId: a.classId,
      className: cls ? cls.name : 'Class'
    };
  }).slice(0, 10);

  // Collect materials
  const recentMaterials = demoStore.getMaterials().filter(m => classIds.includes(m.classId)).slice(0, 10);

  // Pending leaves
  const pendingLeaves = demoStore.getTeacherLeaves(req.user._id);

  // Active attendance session
  const activeSession = classIds.length > 0 ? demoStore.getActiveAttendanceSession(classIds[0]) : null;

  res.status(200).json({
    success: true,
    data: {
      classes,
      announcements,
      upcomingAssignments,
      todaysAttendance: activeSession ? [{
        _id: activeSession._id,
        sessionId: activeSession._id,
        classId: { _id: activeSession.classId, name: 'CS101: Introduction to Artificial Intelligence' },
        createdAt: activeSession.createdAt,
        expiresAt: activeSession.expiresAt,
        status: activeSession.status,
        presentCount: 1
      }] : [],
      pendingLeaves,
      recentMaterials
    }
  });
});

// --- ADMIN STATS ---
router.get('/admin/stats', authenticateDemo, authorizeDemo('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    data: demoStore.getAdminStats()
  });
});

// Admin Users List
router.get('/users', authenticateDemo, authorizeDemo('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    count: demoStore.getUsers().length,
    data: demoStore.getUsers()
  });
});

// --- CLASSES ROUTES ---
router.get('/classes', authenticateDemo, (req, res) => {
  const classes = demoStore.getClasses(req.user._id, req.user.role);
  res.status(200).json({
    success: true,
    count: classes.length,
    data: classes
  });
});

router.get('/classes/:id', authenticateDemo, (req, res) => {
  const cls = demoStore.getClassById(req.params.id);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  res.status(200).json({
    success: true,
    data: cls
  });
});

router.post('/classes', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({ success: false, message: 'Class name is required' });
  }
  const newClass = demoStore.createClass(req.body, req.user);
  res.status(201).json({
    success: true,
    data: newClass,
    message: 'Class created successfully'
  });
});

router.post('/classes/enroll', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const { code } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Class code is required' });
  }
  const targetClass = demoStore.getClasses('all', 'admin').find(c => (c.code === code.trim() || c.classCode === code.trim()));
  if (!targetClass) {
    return res.status(404).json({ success: false, message: 'Invalid class code. Please check with your instructor.' });
  }
  demoStore.enrollStudent(targetClass._id, req.user._id);
  res.status(200).json({
    success: true,
    message: `Enrolled in ${targetClass.name} successfully`,
    data: targetClass
  });
});

// --- ANNOUNCEMENTS ---
router.get('/classes/:classId/announcements', authenticateDemo, (req, res) => {
  const list = demoStore.getAnnouncements(req.params.classId);
  res.status(200).json({
    success: true,
    count: list.length,
    data: list
  });
});

router.post('/classes/:classId/announcements', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const { content, title } = req.body;
  const messageBody = content || title;
  if (!messageBody || !messageBody.trim()) {
    return res.status(400).json({ success: false, message: 'Announcement message is required' });
  }
  const cls = demoStore.getClassById(req.params.classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  // Verify teacher ownership
  if (req.user.role !== 'admin' && cls.teacher._id !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized: You are not the teacher of this class' });
  }

  const ann = demoStore.createAnnouncement(req.params.classId, messageBody, title, req.user);
  res.status(201).json({
    success: true,
    data: ann,
    message: 'Announcement published successfully'
  });
});

// --- ASSIGNMENTS ---
router.get('/classes/:classId/assignments', authenticateDemo, (req, res) => {
  const list = demoStore.getAssignments(req.params.classId);
  res.status(200).json({
    success: true,
    count: list.length,
    data: list
  });
});

router.get('/classes/:classId/assignments/:assignmentId', authenticateDemo, (req, res) => {
  const assignment = demoStore.getAssignmentById(req.params.assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }
  res.status(200).json({
    success: true,
    data: assignment
  });
});

router.post('/classes/:classId/assignments', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const { title, description } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Assignment title is required' });
  }
  const cls = demoStore.getClassById(req.params.classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  if (req.user.role !== 'admin' && cls.teacher._id !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to create assignments for this class' });
  }

  const newAssignment = demoStore.createAssignment(req.params.classId, req.body, req.user);
  res.status(201).json({
    success: true,
    message: 'Assignment created successfully',
    data: newAssignment
  });
});

router.get('/classes/:classId/assignments/:assignmentId/submissions', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const assignment = demoStore.getAssignmentById(req.params.assignmentId);
  res.status(200).json({
    success: true,
    data: assignment ? (assignment.submissions || []) : []
  });
});

router.get('/classes/:classId/assignments/:assignmentId/submissions/me', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const assignment = demoStore.getAssignmentById(req.params.assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }
  const sub = assignment.submissions ? assignment.submissions.find(s => s.studentId === req.user._id) : null;
  res.status(200).json({
    success: true,
    data: sub || null
  });
});

router.post('/classes/:classId/assignments/:assignmentId/submissions', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const assignment = demoStore.getAssignmentById(req.params.assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }
  const submission = {
    _id: `sub-${Date.now()}`,
    assignmentId: assignment._id,
    studentId: req.user._id,
    studentName: req.user.name,
    content: req.body.content || 'Submission submitted',
    submittedAt: new Date().toISOString()
  };
  if (!assignment.submissions) assignment.submissions = [];
  assignment.submissions.push(submission);

  res.status(201).json({
    success: true,
    message: 'Assignment submitted successfully',
    data: submission
  });
});

// --- QUIZZES ---
router.get('/classes/:classId/quizzes', authenticateDemo, (req, res) => {
  res.status(200).json({
    success: true,
    data: [
      {
        _id: 'quiz-01',
        title: 'Quiz 1: Intelligent Search Fundamentals',
        description: 'Multiple choice assessment covering heuristics, tree search, and graph algorithms.',
        durationMinutes: 30,
        isPublished: true,
        endTime: new Date(Date.now() + 86400000 * 3).toISOString()
      }
    ]
  });
});

// --- STUDY MATERIALS ---
router.get('/classes/:classId/materials', authenticateDemo, (req, res) => {
  const materials = demoStore.getMaterials(req.params.classId);
  res.status(200).json({
    success: true,
    count: materials.length,
    data: materials
  });
});

router.post('/classes/:classId/materials', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const { title, description } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Material title is required' });
  }
  const fileInfo = {
    fileName: `${title.replace(/\s+/g, '_')}.pdf`,
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileType: 'application/pdf'
  };
  const mat = demoStore.createMaterial(req.params.classId, title, description, req.user, fileInfo);
  res.status(201).json({
    success: true,
    data: mat,
    message: 'Study material added successfully'
  });
});

router.get('/classes/:classId/materials/:materialId/download', authenticateDemo, (req, res) => {
  const mat = demoStore.getMaterialById(req.params.materialId);
  if (!mat) {
    return res.status(404).json({ success: false, message: 'Material not found' });
  }

  const sampleContent = `%PDF-1.4\n% Study Material for ClassNova: ${mat.title}\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000018 00000 n \n0000000077 00000 n \n0000000133 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n230\n%%EOF`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${mat.fileName || 'document.pdf'}"`);
  res.send(Buffer.from(sampleContent, 'utf-8'));
});

router.put('/classes/:classId/materials/:materialId', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const cls = demoStore.getClassById(req.params.classId);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
  if (req.user.role !== 'admin' && cls.teacher._id !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to update materials for this class' });
  }
  const mat = demoStore.getMaterialById(req.params.materialId);
  if (!mat) return res.status(404).json({ success: false, message: 'Material not found' });
  const updated = demoStore.updateMaterial(req.params.materialId, {
    title: req.body.title || mat.title,
    description: req.body.description !== undefined ? req.body.description : mat.description
  });
  res.status(200).json({ success: true, data: updated, message: 'Material updated successfully' });
});

router.delete('/classes/:classId/materials/:materialId', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const cls = demoStore.getClassById(req.params.classId);
  if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
  if (req.user.role !== 'admin' && cls.teacher._id !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete materials for this class' });
  }
  const deleted = demoStore.deleteMaterial(req.params.materialId);
  if (!deleted) return res.status(404).json({ success: false, message: 'Material not found' });
  res.status(200).json({ success: true, data: {}, message: 'Material deleted successfully' });
});

// --- ATTENDANCE & OTP ROUTES ---
router.get('/attendance/classes/:classId/active', authenticateDemo, (req, res) => {
  const session = demoStore.getActiveAttendanceSession(req.params.classId);
  res.status(200).json({
    success: true,
    data: session ? {
      ...session,
      sessionId: session._id
    } : null
  });
});

router.post('/attendance/classes/:classId/start', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const duration = parseInt(req.body.durationMinutes) || 15;
  const session = demoStore.startAttendanceSession(req.params.classId, req.user._id, duration);
  res.status(201).json({
    success: true,
    data: {
      ...session,
      sessionId: session._id
    },
    message: 'Attendance session started successfully'
  });
});

router.put('/attendance/sessions/:sessionId/close', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const session = demoStore.closeAttendanceSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }
  res.status(200).json({
    success: true,
    data: session,
    message: 'Attendance session closed'
  });
});

router.post('/attendance/submit', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const { sessionId, otp } = req.body;
  if (!sessionId || !otp) {
    return res.status(400).json({ success: false, message: 'Session ID and OTP are required' });
  }
  const result = demoStore.submitAttendance(sessionId, req.user._id, otp);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }
  res.status(200).json({
    success: true,
    message: 'Attendance recorded successfully',
    data: result.record
  });
});

router.get('/attendance/classes/:classId/report', authenticateDemo, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      totalSessions: 12,
      attendedSessions: 11,
      attendancePercentage: 92,
      history: [
        { date: '2026-10-10', status: 'present' },
        { date: '2026-10-08', status: 'present' },
        { date: '2026-10-05', status: 'absent' }
      ]
    }
  });
});

// --- LEAVE APPLICATIONS ---
router.get('/leaves/my', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const list = demoStore.getStudentLeaves(req.user._id);
  res.status(200).json({
    success: true,
    data: list
  });
});

router.post('/leaves', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const { classId, reason, startDate, endDate } = req.body;
  if (!classId || !reason || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'All leave application fields are required' });
  }
  const leave = demoStore.applyLeave(classId, req.user, reason, startDate, endDate);
  res.status(201).json({
    success: true,
    data: leave,
    message: 'Leave application submitted successfully'
  });
});

router.get('/leaves/teacher', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const list = demoStore.getTeacherLeaves(req.user._id);
  res.status(200).json({
    success: true,
    data: list
  });
});

router.put('/leaves/:id/review', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const { status, teacherComment, reviewNote } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
  }
  const leave = demoStore.data.leaveApplications.find(l => l._id === req.params.id);
  if (!leave) {
    return res.status(404).json({ success: false, message: 'Leave application not found' });
  }

  // Teacher ownership check
  const cId = typeof leave.classId === 'object' ? leave.classId._id : leave.classId;
  const cls = demoStore.getClassById(cId);
  if (req.user.role !== 'admin' && cls && cls.teacher._id !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to review leave requests for this class' });
  }

  const comment = teacherComment || reviewNote || '';
  const updated = demoStore.reviewLeave(req.params.id, status, comment);
  res.status(200).json({
    success: true,
    data: updated,
    message: `Leave application ${status} successfully`
  });
});

// --- NOTIFICATIONS ---
router.get('/notifications/unread', authenticateDemo, (req, res) => {
  const notifs = demoStore.getNotifications(req.user._id);
  const unread = notifs.filter(n => !n.isRead).length;
  res.status(200).json({
    success: true,
    data: { count: unread }
  });
});

router.get('/notifications', authenticateDemo, (req, res) => {
  const list = demoStore.getNotifications(req.user._id);
  res.status(200).json({
    success: true,
    data: list
  });
});

router.put('/notifications/:id/read', authenticateDemo, (req, res) => {
  const notif = demoStore.markNotificationRead(req.params.id);
  res.status(200).json({
    success: true,
    data: notif
  });
});

router.put('/notifications/read-all', authenticateDemo, (req, res) => {
  demoStore.markAllNotificationsRead(req.user._id);
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

module.exports = router;
