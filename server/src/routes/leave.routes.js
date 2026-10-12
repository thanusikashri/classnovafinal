const express = require('express');
const {
  applyForLeave,
  getMyLeaves,
  cancelLeave,
  getTeacherLeaves,
  reviewLeave
} = require('../controllers/leave.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// Student routes
router.post('/', authorize('student'), applyForLeave);
router.get('/my', authorize('student'), getMyLeaves);
router.put('/:id/cancel', authorize('student'), cancelLeave);

// Teacher/Admin routes
router.get('/teacher', authorize('teacher', 'admin'), getTeacherLeaves);
router.put('/:id/review', authorize('teacher', 'admin'), reviewLeave);

module.exports = router;
