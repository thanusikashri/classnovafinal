const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { demoStore } = require('../services/demoStore');
const { generateQuizQuestions, generateQuizQuestionsFromPdf, validateQuestionCount } = require('../services/aiGenerator.service');
const { extractTextFromPdfBuffer } = require('../services/pdfExtractor.service');
const upload = require('../middlewares/upload.middleware');

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
      { role: 'teacher', email: 'teacher@demo.classnova.local', label: 'Dr. Sarah Williams (Instructor A)' },
      { role: 'teacher', email: 'teacher2@demo.classnova.local', label: 'Prof. Marcus Vance (Instructor B)' },
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
  const allClasses = demoStore.getClasses(req.user._id, 'student', false);
  const enrolledClasses = demoStore.getClasses(req.user._id, 'student', true);
  const enrolledClassIds = enrolledClasses.map(c => c._id);
  const allClassIds = allClasses.map(c => c._id);

  const enrichedClasses = allClasses.map(c => {
    const qList = demoStore.getQuizzes(c._id).filter(q => q.isPublished);
    const aList = demoStore.getAssignments(c._id);
    const mList = demoStore.getMaterials(c._id);
    const isEnrolled = c.students && c.students.some(s => (typeof s === 'object' ? s._id : s) === req.user._id);
    return {
      ...c,
      quizCount: qList.length,
      assignmentCount: aList.length,
      materialCount: mList.length,
      isEnrolled: !!isEnrolled
    };
  });

  // Collect announcements across all classes
  const announcements = demoStore.getAnnouncements().filter(a => {
    const cId = typeof a.classId === 'object' ? a.classId._id : a.classId;
    return allClassIds.includes(cId);
  }).slice(0, 10);

  // Collect materials across all classes
  const recentMaterials = demoStore.getMaterials().filter(m => allClassIds.includes(m.classId)).slice(0, 10);

  // Collect student leaves (all statuses) and pending leaves
  const allStudentLeaves = demoStore.getStudentLeaves(req.user._id);
  const pendingLeaves = allStudentLeaves.filter(l => l.status === 'pending');

  // Collect upcoming assignments and published quizzes across all classes
  const assignmentItems = demoStore.getAssignments().filter(a => allClassIds.includes(a.classId)).map(a => ({
    _id: a._id,
    title: a.title,
    dueDate: a.dueDate,
    type: 'assignment',
    classId: a.classId
  }));

  const quizItems = demoStore.getQuizzes().filter(q => allClassIds.includes(q.classId) && q.isPublished).map(q => ({
    _id: q._id,
    title: q.title,
    dueDate: q.endTime,
    type: 'quiz',
    classId: q.classId,
    durationMinutes: q.durationMinutes
  }));

  const upcomingAssessments = [...quizItems, ...assignmentItems].slice(0, 10);

  res.status(200).json({
    success: true,
    data: {
      classes: enrichedClasses,
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

  // Pending leaves strictly for this teacher's courses
  const pendingLeaves = demoStore.getTeacherLeaves(req.user.role === 'admin' ? 'all' : req.user._id, 'pending');

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

// Admin Users List & Management
router.get('/users', authenticateDemo, authorizeDemo('admin'), (req, res) => {
  let list = demoStore.getUsers();
  if (req.query.role) {
    list = list.filter(u => u.role === req.query.role);
  }
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    list = list.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }
  res.status(200).json({
    success: true,
    count: list.length,
    data: list
  });
});

router.post('/users', authenticateDemo, authorizeDemo('admin'), (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required' });
  }
  const newUser = demoStore.createUser(req.body);
  res.status(201).json({
    success: true,
    data: newUser,
    message: 'User created successfully'
  });
});

router.put('/users/:id/status', authenticateDemo, authorizeDemo('admin'), (req, res) => {
  const user = demoStore.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  if (user.role === 'admin') {
    return res.status(400).json({ success: false, message: 'Cannot deactivate admin accounts' });
  }
  const updated = demoStore.updateUser(req.params.id, { isActive: req.body.isActive });
  res.status(200).json({
    success: true,
    data: updated
  });
});

router.put('/users/:id', authenticateDemo, authorizeDemo('admin'), (req, res) => {
  const updated = demoStore.updateUser(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.status(200).json({
    success: true,
    data: updated
  });
});

// --- CLASSES ROUTES ---
router.get('/classes', authenticateDemo, (req, res) => {
  const enrolledOnly = req.query.enrolledOnly === 'true';
  const classes = demoStore.getClasses(req.user._id, req.user.role, enrolledOnly);
  const allAssignments = demoStore.getAssignments();
  const allQuizzes = demoStore.getQuizzes();
  const allMaterials = demoStore.getMaterials();

  const isTeacherOrAdmin = req.user.role === 'teacher' || req.user.role === 'admin';

  const enrichedClasses = classes.map(cls => {
    const isEnrolled = cls.students && cls.students.some(s => (typeof s === 'object' ? s._id : s) === req.user._id);
    const quizCount = allQuizzes.filter(q => q.classId === cls._id && (isTeacherOrAdmin || q.isPublished)).length;
    const assignmentCount = allAssignments.filter(a => a.classId === cls._id).length;
    const materialCount = allMaterials.filter(m => m.classId === cls._id).length;
    return {
      ...cls,
      isEnrolled: isTeacherOrAdmin || !!isEnrolled,
      quizCount,
      assignmentCount,
      materialCount
    };
  });

  res.status(200).json({
    success: true,
    count: enrichedClasses.length,
    data: enrichedClasses
  });
});

router.get('/classes/:id', authenticateDemo, (req, res) => {
  const cls = demoStore.getClassById(req.params.id);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  const isEnrolled = cls.students && cls.students.some(s => (typeof s === 'object' ? s._id : s) === req.user._id);
  const isTeacherOrAdmin = req.user.role === 'admin' || (cls.teacher && (cls.teacher._id === req.user._id || cls.teacher === req.user._id));
  res.status(200).json({
    success: true,
    data: {
      ...cls,
      isEnrolled: isTeacherOrAdmin || !!isEnrolled
    }
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
    data: demoStore.getClassById(targetClass._id)
  });
});

router.post('/classes/:id/enroll', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const targetClass = demoStore.getClassById(req.params.id);
  if (!targetClass) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  demoStore.enrollStudent(targetClass._id, req.user._id);
  res.status(200).json({
    success: true,
    message: `Enrolled in ${targetClass.name} successfully`,
    data: demoStore.getClassById(targetClass._id)
  });
});

// --- ANNOUNCEMENTS ---
router.get('/announcements', authenticateDemo, (req, res) => {
  const list = demoStore.getAnnouncements();
  res.status(200).json({
    success: true,
    count: list.length,
    data: list
  });
});

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
  const isTeacher = req.user.role === 'admin' || req.user.role === 'teacher';

  const enriched = list.map(a => {
    if (isTeacher) {
      const stats = demoStore.getAssignmentStats(req.params.classId, a._id);
      return {
        ...a,
        submissionCount: stats?.submissions?.length || 0,
        stats: stats?.stats || null
      };
    } else {
      const sub = demoStore.getMySubmission(a._id, req.user._id);
      return {
        ...a,
        hasSubmitted: !!sub,
        mySubmission: sub || null,
        mySubmissionStatus: sub ? (sub.status || 'Turned In') : 'Pending'
      };
    }
  });

  res.status(200).json({
    success: true,
    count: enriched.length,
    data: enriched
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

// Teacher Assignments Overview with Submission Statistics
router.get('/assignments/teacher-overview', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const overview = demoStore.getTeacherAssignmentsOverview(req.user._id);
  res.status(200).json({
    success: true,
    count: overview.length,
    data: overview
  });
});

router.get('/classes/:classId/assignments/:assignmentId/submissions', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const assignment = demoStore.getAssignmentById(req.params.assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }
  const cls = demoStore.getClassById(req.params.classId || assignment.classId);
  const isTeacher = req.user.role === 'admin' ||
    (assignment.teacher && (assignment.teacher._id === req.user._id || assignment.teacher === req.user._id)) ||
    (cls && cls.teacher && (cls.teacher._id === req.user._id || cls.teacher === req.user._id));
  if (!isTeacher) {
    return res.status(403).json({ success: false, message: 'Not authorized to view submissions for this assignment' });
  }

  const result = demoStore.getAssignmentStats(req.params.classId, req.params.assignmentId);
  if (!result) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  res.status(200).json({
    success: true,
    count: result.submissions.length,
    stats: result.stats,
    submissions: result.submissions,
    eligibleStudents: result.eligibleStudents,
    data: {
      stats: result.stats,
      submissions: result.submissions,
      eligibleStudents: result.eligibleStudents
    }
  });
});

router.get('/classes/:classId/assignments/:assignmentId/submissions/me', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const sub = demoStore.getMySubmission(req.params.assignmentId, req.user._id);
  if (!sub) {
    return res.status(404).json({ success: false, message: 'No submission found' });
  }
  res.status(200).json({
    success: true,
    data: sub
  });
});

router.post('/classes/:classId/assignments/:assignmentId/submissions', authenticateDemo, authorizeDemo('student'), upload.single('file'), (req, res) => {
  const assignment = demoStore.getAssignmentById(req.params.assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }

  const cls = demoStore.getClassById(req.params.classId || assignment.classId);
  if (cls && cls.students && !cls.students.some(s => (typeof s === 'object' ? s._id : s) === req.user._id)) {
    return res.status(403).json({ success: false, message: 'Must be enrolled in class to submit work' });
  }

  let fileName = 'assignment_submission.pdf';
  let fileSize = 102400;
  let fileType = 'application/pdf';
  let filePath = '';

  if (req.file) {
    fileName = req.file.originalname;
    fileSize = req.file.size || req.file.buffer.length;
    fileType = req.file.mimetype || 'application/pdf';

    const uploadsDir = path.join(__dirname, '../../uploads/submissions');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const safeName = `${req.params.assignmentId}_${req.user._id}_${Date.now()}_${path.basename(fileName).replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    filePath = path.join(uploadsDir, safeName);
    try {
      fs.writeFileSync(filePath, req.file.buffer);
    } catch (e) {
      console.error('File write error:', e);
    }
  }

  const submissionId = `sub-${Date.now()}`;
  const fileUrl = `/api/classes/${req.params.classId}/assignments/${req.params.assignmentId}/submissions/${submissionId}/file`;
  const fileInfo = {
    fileName,
    fileSize,
    fileType,
    filePath,
    fileUrl
  };

  const sub = demoStore.submitAssignment(req.params.classId, req.params.assignmentId, req.user, fileInfo, req.body.content || '');
  if (!sub) {
    return res.status(400).json({ success: false, message: 'Failed to record submission' });
  }

  res.status(200).json({
    success: true,
    data: sub,
    message: sub.isLate ? 'Assignment submitted (Late)' : 'Assignment turned in successfully'
  });
});

router.put('/classes/:classId/assignments/:assignmentId/submissions/:submissionId/grade', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const assignment = demoStore.getAssignmentById(req.params.assignmentId);
  if (!assignment) {
    return res.status(404).json({ success: false, message: 'Assignment not found' });
  }
  const cls = demoStore.getClassById(req.params.classId || assignment.classId);
  const isTeacher = req.user.role === 'admin' ||
    (assignment.teacher && (assignment.teacher._id === req.user._id || assignment.teacher === req.user._id)) ||
    (cls && cls.teacher && (cls.teacher._id === req.user._id || cls.teacher === req.user._id));
  if (!isTeacher) {
    return res.status(403).json({ success: false, message: 'Not authorized to grade this assignment' });
  }

  const { marks, feedback } = req.body;
  if (marks !== undefined) {
    const num = Number(marks);
    if (isNaN(num) || num < 0 || num > assignment.maxMarks) {
      return res.status(400).json({ success: false, message: `Marks must be between 0 and ${assignment.maxMarks}` });
    }
  }

  const updated = demoStore.gradeSubmission(req.params.assignmentId, req.params.submissionId, req.user._id, { marks, feedback });
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }

  res.status(200).json({
    success: true,
    data: updated,
    message: 'Submission graded successfully'
  });
});

router.get('/classes/:classId/assignments/:assignmentId/submissions/:submissionId/file', authenticateDemo, (req, res) => {
  const assignment = demoStore.getAssignmentById(req.params.assignmentId);
  const sub = demoStore.getSubmissionById(req.params.submissionId);
  if (!sub) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }

  const isOwner = sub.studentId === req.user._id || (sub.student && sub.student._id === req.user._id);
  const cls = demoStore.getClassById(req.params.classId || (assignment && assignment.classId));
  const isTeacher = req.user.role === 'admin' ||
    (assignment && assignment.teacher && (assignment.teacher._id === req.user._id || assignment.teacher === req.user._id)) ||
    (cls && cls.teacher && (cls.teacher._id === req.user._id || cls.teacher === req.user._id));

  if (!isOwner && !isTeacher) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this document' });
  }

  const action = req.query.action === 'download' ? 'attachment' : 'inline';
  const cleanName = (sub.fileName || 'submission.pdf').replace(/[^a-zA-Z0-9.\-_]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${action}; filename="${cleanName}"`);

  if (sub.filePath && fs.existsSync(sub.filePath)) {
    return fs.createReadStream(sub.filePath).pipe(res);
  }

  const sampleContent = `%PDF-1.4\n% Submitted Assignment Document: ${cleanName}\n% Student: ${sub.studentName || 'Alex Johnson'}\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000018 00000 n \n0000000077 00000 n \n0000000133 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n230\n%%EOF`;
  res.send(Buffer.from(sampleContent, 'utf-8'));
});

// --- QUIZZES ---
router.get('/classes/:classId/quizzes', authenticateDemo, (req, res) => {
  const quizzes = demoStore.getQuizzes(req.params.classId);
  const isTeacher = req.user.role === 'admin' || req.user.role === 'teacher';
  const list = isTeacher
    ? quizzes.map(q => ({
        ...q,
        attemptsCount: (demoStore.getQuizAttempts(q._id) || []).length
      }))
    : quizzes.filter(q => q.isPublished).map(q => {
        const copy = {
          ...q,
          questions: (q.questions || []).map(item => {
            const { correctOptionIndex, ...rest } = item;
            return rest;
          })
        };
        const myAttempts = demoStore.getMyAttempts(q._id, req.user._id);
        const completed = myAttempts.find(a => a.status === 'Submitted');
        if (completed) {
          copy.hasAttempted = true;
          copy.lastScore = completed.score;
          copy.lastPercentage = completed.percentage;
        } else {
          copy.hasAttempted = false;
        }
        return copy;
      });

  res.status(200).json({
    success: true,
    count: list.length,
    data: list
  });
});

router.post('/classes/:classId/quizzes', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const cls = demoStore.getClassById(req.params.classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  if (req.user.role !== 'admin' && cls.teacher._id !== req.user._id && cls.teacher !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to create quizzes for this class' });
  }

  if (!req.body.title || !req.body.title.trim()) {
    return res.status(400).json({ success: false, message: 'Quiz title is required' });
  }

  // Validate questions array
  if (!req.body.questions || !Array.isArray(req.body.questions) || req.body.questions.length === 0) {
    return res.status(400).json({ success: false, message: 'A quiz must contain at least 1 question' });
  }

  if (req.body.questions.length > 10) {
    return res.status(400).json({ success: false, message: 'A quiz cannot contain more than 10 questions (maximum 10 allowed)' });
  }

  for (let i = 0; i < req.body.questions.length; i++) {
    const q = req.body.questions[i];
    if (!q.text || !q.text.trim()) {
      return res.status(400).json({ success: false, message: `Question ${i + 1} text is required` });
    }
    const qType = q.type || 'multiple_choice';
    if (qType === 'multiple_choice') {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} must have at least 2 options` });
      }
      const optIdx = Number(q.correctOptionIndex);
      if (isNaN(optIdx) || optIdx < 0 || optIdx >= q.options.length) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} has an invalid correct option index` });
      }
    } else if (qType === 'true_false') {
      if (!Array.isArray(q.options) || q.options.length !== 2) {
        q.options = ['True', 'False'];
      }
      const optIdx = Number(q.correctOptionIndex);
      if (isNaN(optIdx) || optIdx < 0 || optIdx >= 2) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} must specify whether True (0) or False (1) is correct` });
      }
    } else if (qType === 'short_answer') {
      if (!q.correctAnswer && !q.expectedAnswer) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} must have a reference/expected answer` });
      }
    }
  }

  try {
    const newQuiz = demoStore.createQuiz(req.params.classId, req.body, req.user);
    res.status(201).json({
      success: true,
      data: newQuiz,
      message: 'Quiz created successfully'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/classes/:classId/quizzes/:id', authenticateDemo, (req, res) => {
  const quiz = demoStore.getQuizById(req.params.id);
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }
  const isTeacher = req.user.role === 'admin' || req.user.role === 'teacher';
  let quizData = { ...quiz };
  if (!isTeacher) {
    quizData.questions = (quiz.questions || []).map(q => {
      const { correctOptionIndex, ...rest } = q;
      return rest;
    });
  }
  res.status(200).json({
    success: true,
    data: quizData
  });
});

router.put('/classes/:classId/quizzes/:id', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const cls = demoStore.getClassById(req.params.classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  const quiz = demoStore.getQuizById(req.params.id);
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }
  if (req.user.role !== 'admin' && cls.teacher._id !== req.user._id && cls.teacher !== req.user._id && quiz.teacher !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this quiz' });
  }

  if (req.body.questions) {
    if (!Array.isArray(req.body.questions) || req.body.questions.length === 0) {
      return res.status(400).json({ success: false, message: 'A quiz must contain at least 1 question' });
    }
    if (req.body.questions.length > 10) {
      return res.status(400).json({ success: false, message: 'A quiz cannot contain more than 10 questions (maximum 10 allowed)' });
    }
    for (let i = 0; i < req.body.questions.length; i++) {
      const q = req.body.questions[i];
      if (!q.text || !q.text.trim()) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} text is required` });
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} must have at least 2 options` });
      }
      const optIdx = Number(q.correctOptionIndex);
      if (isNaN(optIdx) || optIdx < 0 || optIdx >= q.options.length) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} has an invalid correct option index` });
      }
    }
  }

  try {
    const updated = demoStore.updateQuiz(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    res.status(200).json({
      success: true,
      data: updated,
      message: 'Quiz updated successfully'
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// --- AI QUIZ GENERATOR ROUTE ---
router.post('/ai/generate-quiz', authenticateDemo, authorizeDemo('teacher', 'admin'), async (req, res) => {
  try {
    const { topic, questionCount = 10, difficulty = 'medium' } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required for quiz generation'
      });
    }

    let validatedCount;
    try {
      validatedCount = validateQuestionCount(questionCount);
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        message: valErr.message
      });
    }

    const result = await generateQuizQuestions({
      topic: topic.trim(),
      questionCount: validatedCount,
      difficulty
    });

    res.status(200).json({
      success: true,
      count: result.questions.length,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error generating quiz questions'
    });
  }
});

// --- AI GENERATE QUIZ FROM UPLOADED PDF ROUTE (DEMO MODE) ---
router.post('/ai/generate-quiz-from-pdf', authenticateDemo, authorizeDemo('teacher', 'admin'), upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid PDF file to upload.'
      });
    }

    // Validate mime-type / extension
    if (req.file.mimetype !== 'application/pdf' && !req.file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({
        success: false,
        message: 'Only PDF documents are supported. Please upload a valid .pdf file.'
      });
    }

    const { classId, questionCount = 10, questionType = 'multiple_choice', difficulty = 'medium' } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Please select an authorized course (classId) for this quiz.'
      });
    }

    const cls = demoStore.getClassById(classId);
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Target course not found.'
      });
    }

    const courseTeacherId = cls.teacher ? (cls.teacher._id || cls.teacher) : null;
    const isAuthorized = req.user.role === 'admin' || courseTeacherId === req.user._id;
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create quizzes for this course.'
      });
    }

    let validatedCount;
    try {
      validatedCount = validateQuestionCount(questionCount);
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        message: valErr.message
      });
    }

    // Step 1: Extract text from PDF buffer
    let extraction;
    try {
      extraction = await extractTextFromPdfBuffer(req.file.buffer);
    } catch (extractErr) {
      return res.status(400).json({
        success: false,
        message: extractErr.message
      });
    }

    // Step 2: Generate questions grounded in document content
    const quizData = await generateQuizQuestionsFromPdf({
      documentText: extraction.text,
      questionCount: validatedCount,
      questionType,
      difficulty,
      courseName: cls.name,
      fileName: req.file.originalname
    });

    res.status(200).json({
      success: true,
      count: quizData.questions.length,
      data: {
        ...quizData,
        classId: cls._id,
        className: cls.name,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        pagesCount: extraction.pagesCount
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Error generating quiz from PDF document'
    });
  }
});

router.delete('/classes/:classId/quizzes/:id', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const cls = demoStore.getClassById(req.params.classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  const quiz = demoStore.getQuizById(req.params.id);
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }
  if (req.user.role !== 'admin' && cls.teacher._id !== req.user._id && cls.teacher !== req.user._id && quiz.teacher !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this quiz' });
  }
  const deleted = demoStore.deleteQuiz(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }
  res.status(200).json({
    success: true,
    message: 'Quiz deleted successfully'
  });
});

router.get('/classes/:classId/quizzes/:id/attempts', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const quiz = demoStore.getQuizById(req.params.id);
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }
  const cls = demoStore.getClassById(req.params.classId);
  const isTeacher = req.user.role === 'admin' || (quiz.teacher === req.user._id) || (cls && cls.teacher && (cls.teacher._id === req.user._id || cls.teacher === req.user._id));
  if (!isTeacher) {
    return res.status(403).json({ success: false, message: 'Not authorized to view analytics for this quiz' });
  }
  const attempts = demoStore.getQuizAttempts(req.params.id);
  res.status(200).json({
    success: true,
    count: attempts.length,
    data: attempts
  });
});

router.get('/classes/:classId/quizzes/:id/attempts/me', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const attempts = demoStore.getMyAttempts(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    count: attempts.length,
    data: attempts
  });
});

router.get('/classes/:classId/quizzes/:id/attempts/:attemptId', authenticateDemo, (req, res) => {
  const attempt = demoStore.getQuizAttemptById(req.params.id, req.params.attemptId);
  if (!attempt) {
    return res.status(404).json({ success: false, message: 'Attempt not found' });
  }
  const quiz = demoStore.getQuizById(req.params.id);
  const isOwner = attempt.studentId === req.user._id || (attempt.student && attempt.student._id === req.user._id);
  const isTeacher = req.user.role === 'admin' || (quiz && quiz.teacher === req.user._id);
  if (!isOwner && !isTeacher) {
    return res.status(403).json({ success: false, message: 'Not authorized to view this attempt' });
  }
  res.status(200).json({
    success: true,
    data: attempt
  });
});

router.post('/classes/:classId/quizzes/:id/attempts', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const quiz = demoStore.getQuizById(req.params.id);
  if (!quiz || !quiz.isPublished) {
    return res.status(404).json({ success: false, message: 'Quiz not found or not published' });
  }
  const cls = demoStore.getClassById(req.params.classId);
  if (cls && cls.students && !cls.students.some(s => (typeof s === 'object' ? s._id : s) === req.user._id)) {
    return res.status(403).json({ success: false, message: 'Must be enrolled in class to take quiz' });
  }
  const attempt = demoStore.startQuizAttempt(req.params.id, req.user);
  res.status(201).json({
    success: true,
    data: attempt
  });
});

router.put('/classes/:classId/quizzes/:id/attempts/:attemptId', authenticateDemo, authorizeDemo('student'), async (req, res) => {
  const attempt = await demoStore.submitQuizAttempt(req.params.id, req.params.attemptId, req.user._id, req.body.answers || []);
  if (!attempt) {
    return res.status(404).json({ success: false, message: 'Attempt not found' });
  }
  res.status(200).json({
    success: true,
    data: attempt,
    message: 'Quiz attempt submitted and evaluated successfully'
  });
});

router.put('/classes/:classId/quizzes/:id/attempts/:attemptId/grade', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const quiz = demoStore.getQuizById(req.params.id);
  if (!quiz) {
    return res.status(404).json({ success: false, message: 'Quiz not found' });
  }
  const cls = demoStore.getClassById(req.params.classId);
  const isTeacher = req.user.role === 'admin' || (quiz.teacher === req.user._id) || (cls && cls.teacher && (cls.teacher._id === req.user._id || cls.teacher === req.user._id));
  if (!isTeacher) {
    return res.status(403).json({ success: false, message: 'Not authorized to grade this quiz' });
  }
  const attempt = demoStore.gradeQuizAttempt(req.params.id, req.params.attemptId, req.user._id, req.body);
  if (!attempt) {
    return res.status(404).json({ success: false, message: 'Attempt not found' });
  }
  res.status(200).json({
    success: true,
    data: attempt,
    message: 'Grading updated successfully'
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
  const cls = demoStore.getClassById(req.params.classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }
  if (req.user.role !== 'admin' && cls.teacher._id !== req.user._id && cls.teacher !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to add materials to this class' });
  }
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
    count: list.length,
    data: list
  });
});

router.post('/leaves', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const { classId, reason, startDate, endDate } = req.body;
  if (!classId || !reason || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Please provide classId, startDate, endDate, and reason' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid start or end date' });
  }
  if (start > end) {
    return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
  }

  const cls = demoStore.getClassById(classId);
  if (!cls) {
    return res.status(404).json({ success: false, message: 'Class not found' });
  }

  // Verify enrollment
  const isEnrolled = cls.students && cls.students.some(s => (typeof s === 'object' ? s._id : s) === req.user._id);
  if (!isEnrolled) {
    return res.status(403).json({ success: false, message: 'You are not enrolled in this class' });
  }

  const leave = demoStore.applyLeave(classId, req.user, reason, startDate, endDate);
  res.status(201).json({
    success: true,
    data: leave,
    message: 'Leave application submitted successfully'
  });
});

router.put('/leaves/:id/cancel', authenticateDemo, authorizeDemo('student'), (req, res) => {
  const result = demoStore.cancelLeave(req.params.id, req.user._id);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, message: result.message });
  }
  res.status(200).json({
    success: true,
    data: result.leave,
    message: 'Leave application cancelled successfully'
  });
});

router.get('/leaves/teacher', authenticateDemo, authorizeDemo('teacher', 'admin'), (req, res) => {
  const teacherId = req.user.role === 'admin' ? 'all' : req.user._id;
  const list = demoStore.getTeacherLeaves(teacherId, req.query.status);
  res.status(200).json({
    success: true,
    count: list.length,
    data: list
  });
});

router.put('/leaves/:id/review', authenticateDemo, (req, res) => {
  // Prevent unauthorized student attempts
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'User role is not authorized to review leave requests' });
  }

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
  const courseTeacherId = cls?.teacher ? (cls.teacher._id || cls.teacher) : (leave.teacher ? (leave.teacher._id || leave.teacher) : null);

  if (req.user.role !== 'admin' && courseTeacherId !== req.user._id) {
    return res.status(403).json({ success: false, message: 'Not authorized to review leave requests for this class' });
  }

  const comment = (teacherComment || reviewNote || '').trim();
  const updated = demoStore.reviewLeave(req.params.id, status, comment, req.user);
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
