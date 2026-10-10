const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Class = require('../models/Class');

// @desc    Submit or resubmit work
// @route   POST /api/classes/:classId/assignments/:assignmentId/submissions
// @access  Private (Student)
exports.submitWork = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const cls = await Class.findById(assignment.classId);
    if (!cls.students.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You must be enrolled in the class to submit' });
    }

    const content = req.body.content;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Please provide submission content' });
    }

    let submission = await Submission.findOne({ assignmentId, student: req.user.id });

    if (submission) {
      // Resubmission
      submission.content = content;
      submission.status = 'Submitted';
      await submission.save();
    } else {
      // First submission
      submission = await Submission.create({
        assignmentId,
        student: req.user.id,
        content,
        status: 'Submitted'
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all submissions for an assignment
// @route   GET /api/classes/:classId/assignments/:assignmentId/submissions
// @access  Private (Teacher/Admin)
exports.getSubmissions = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view submissions for this assignment' });
    }

    const submissions = await Submission.find({ assignmentId }).populate('student', 'name email');

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student's own submission for an assignment
// @route   GET /api/classes/:classId/assignments/:assignmentId/submissions/me
// @access  Private (Student)
exports.getMySubmission = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    const submission = await Submission.findOne({ assignmentId, student: req.user.id });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Grade submission
// @route   PUT /api/classes/:classId/assignments/:assignmentId/submissions/:submissionId/grade
// @access  Private (Teacher/Admin)
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { assignmentId, submissionId } = req.params;
    const { marks, feedback } = req.body;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    if (assignment.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to grade this assignment' });
    }

    let submission = await Submission.findOne({ _id: submissionId, assignmentId });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (marks !== undefined) {
      if (marks < 0 || marks > assignment.maxMarks) {
        return res.status(400).json({ success: false, message: `Marks must be between 0 and ${assignment.maxMarks}` });
      }
      submission.marks = marks;
      submission.status = 'Graded';
      submission.gradedAt = Date.now();
    }

    if (feedback !== undefined) {
      submission.feedback = feedback;
    }

    await submission.save();

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (err) {
    next(err);
  }
};
