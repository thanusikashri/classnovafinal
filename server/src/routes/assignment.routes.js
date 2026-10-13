const express = require('express');
const {
  getAssignments,
  createAssignment,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getTeacherAssignmentsOverview
} = require('../controllers/assignment.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/teacher-overview', authorize('teacher', 'admin'), getTeacherAssignmentsOverview);

router
  .route('/')
  .get(getAssignments)
  .post(authorize('teacher', 'admin'), createAssignment);

router
  .route('/:id')
  .get(getAssignmentById)
  .put(authorize('teacher', 'admin'), updateAssignment)
  .delete(authorize('teacher', 'admin'), deleteAssignment);

// We will mount submission routes under assignments inside server.js or directly here.
const submissionRouter = require('./submission.routes');
router.use('/:assignmentId/submissions', submissionRouter);

module.exports = router;
