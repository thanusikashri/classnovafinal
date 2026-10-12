const express = require('express');
const { getStudentDashboard, getTeacherDashboard } = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/student', authorize('student', 'admin'), getStudentDashboard);
router.get('/teacher', authorize('teacher', 'admin'), getTeacherDashboard);

module.exports = router;
