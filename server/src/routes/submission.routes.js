const express = require('express');
const {
  submitWork,
  getSubmissions,
  getMySubmission,
  gradeSubmission,
  downloadSubmissionFile
} = require('../controllers/submission.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router
  .route('/')
  .get(authorize('teacher', 'admin'), getSubmissions)
  .post(authorize('student'), upload.single('file'), submitWork);

router.route('/me').get(authorize('student'), getMySubmission);

router.route('/:submissionId/grade').put(authorize('teacher', 'admin'), gradeSubmission);

router.route('/:submissionId/file').get(downloadSubmissionFile);

module.exports = router;
