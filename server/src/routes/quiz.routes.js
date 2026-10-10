const express = require('express');
const {
  getQuizzes,
  createQuiz,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  startAttempt,
  submitAttempt,
  getQuizAnalytics,
  getMyAttempts
} = require('../controllers/quiz.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router
  .route('/')
  .get(getQuizzes)
  .post(authorize('teacher', 'admin'), createQuiz);

router
  .route('/:id')
  .get(getQuizById)
  .put(authorize('teacher', 'admin'), updateQuiz)
  .delete(authorize('teacher', 'admin'), deleteQuiz);

router
  .route('/:id/attempts')
  .get(authorize('teacher', 'admin'), getQuizAnalytics)
  .post(authorize('student'), startAttempt);

router.get('/:id/attempts/me', authorize('student'), getMyAttempts);

router.put('/:id/attempts/:attemptId', authorize('student'), submitAttempt);

module.exports = router;
