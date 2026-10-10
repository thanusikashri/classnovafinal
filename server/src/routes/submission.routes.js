const express = require('express');
const {
  submitWork,
  getSubmissions,
  getMySubmission,
  gradeSubmission
} = require('../controllers/submission.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router
  .route('/')
  .get(authorize('teacher', 'admin'), getSubmissions)
  .post(authorize('student'), submitWork);

router.route('/me').get(authorize('student'), getMySubmission);

router.route('/:submissionId/grade').put(authorize('teacher', 'admin'), gradeSubmission);

module.exports = router;
