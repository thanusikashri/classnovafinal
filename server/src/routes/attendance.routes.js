const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  startSession,
  closeSession,
  getActiveSession,
  submitAttendance,
  getSessionDetails,
  getClassAttendanceReport
} = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// Rate limiter for OTP submission to prevent brute-force attacks (e.g. max 10 attempts per minute per IP)
const otpSubmitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: 'Too many OTP attempts, please try again in a minute' },
  standardHeaders: true,
  legacyHeaders: false
});

// Teacher routes
router.post('/classes/:classId/start', authorize('teacher', 'admin'), startSession);
router.put('/sessions/:sessionId/close', authorize('teacher', 'admin'), closeSession);
router.get('/sessions/:sessionId', authorize('teacher', 'admin'), getSessionDetails);

// Shared / Student routes
router.get('/classes/:classId/active', getActiveSession);
router.post('/submit', authorize('student'), otpSubmitLimiter, submitAttendance);
router.get('/classes/:classId/report', getClassAttendanceReport);

module.exports = router;
