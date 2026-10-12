const express = require('express');
const { getClasses, getClass, createClass, enrollStudent } = require('../controllers/class.controller');
const { getAnnouncements, createAnnouncement } = require('../controllers/announcement.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const assignmentRouter = require('./assignment.routes');
const quizRouter = require('./quiz.routes');
const materialRouter = require('./material.routes');

const router = express.Router();

router.use(authenticate);

router.get('/', getClasses);
router.post('/', authorize('teacher', 'admin'), createClass);
router.post('/enroll', authorize('student'), enrollStudent);
router.get('/:id', getClass);

router.get('/:classId/announcements', getAnnouncements);
router.post('/:classId/announcements', authorize('teacher', 'admin'), createAnnouncement);

// Re-route into other resource routers
router.use('/:classId/assignments', assignmentRouter);
router.use('/:classId/quizzes', quizRouter);
router.use('/:classId/materials', materialRouter);

module.exports = router;
