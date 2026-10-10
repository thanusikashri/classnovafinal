const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Class = require('../models/Class');

// @desc    Get all quizzes for a class
// @route   GET /api/classes/:classId/quizzes
// @access  Private
exports.getQuizzes = async (req, res, next) => {
  try {
    const classId = req.params.classId;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (req.user.role === 'student' && !cls.students.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this class' });
    }

    // Students only see published quizzes. Teachers see all.
    const query = { classId };
    const isTeacher = cls.teacher.toString() === req.user.id || req.user.role === 'admin';
    if (!isTeacher) {
      query.isPublished = true;
    }

    // Don't send correct answers in the list
    const quizzes = await Quiz.find(query).select('-questions.correctOptionIndex').sort('-createdAt');

    res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new quiz
// @route   POST /api/classes/:classId/quizzes
// @access  Private (Teacher/Admin)
exports.createQuiz = async (req, res, next) => {
  try {
    const classId = req.params.classId;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (cls.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to create quizzes for this class' });
    }

    req.body.classId = classId;
    req.body.teacher = req.user.id;

    const quiz = await Quiz.create(req.body);

    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single quiz
// @route   GET /api/classes/:classId/quizzes/:id
// @access  Private
exports.getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const cls = await Class.findById(quiz.classId);
    if (req.user.role === 'student' && !cls.students.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this quiz' });
    }

    const isTeacher = cls.teacher.toString() === req.user.id || req.user.role === 'admin';
    if (!isTeacher && !quiz.isPublished) {
      return res.status(403).json({ success: false, message: 'Quiz is not published yet' });
    }

    // Strip correctOptionIndex for students
    let quizData = quiz.toObject();
    if (!isTeacher) {
      quizData.questions.forEach(q => {
        delete q.correctOptionIndex;
      });
    }

    res.status(200).json({
      success: true,
      data: quizData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update quiz
// @route   PUT /api/classes/:classId/quizzes/:id
// @access  Private (Teacher/Admin)
exports.updateQuiz = async (req, res, next) => {
  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (quiz.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this quiz' });
    }

    // Check if there are existing attempts. If so, limit edits (e.g., cannot change questions)
    const attemptsCount = await QuizAttempt.countDocuments({ quizId: quiz._id });
    if (attemptsCount > 0 && req.body.questions) {
      return res.status(400).json({ success: false, message: 'Cannot edit questions after students have started the quiz' });
    }

    delete req.body.classId;
    delete req.body.teacher;

    quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete quiz
// @route   DELETE /api/classes/:classId/quizzes/:id
// @access  Private (Teacher/Admin)
exports.deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (quiz.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this quiz' });
    }

    await QuizAttempt.deleteMany({ quizId: quiz._id });
    await quiz.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Start quiz attempt
// @route   POST /api/classes/:classId/quizzes/:id/attempts
// @access  Private (Student)
exports.startAttempt = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const studentId = req.user.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz || !quiz.isPublished) {
      return res.status(404).json({ success: false, message: 'Quiz not found or not published' });
    }

    const cls = await Class.findById(quiz.classId);
    if (!cls.students.includes(studentId)) {
      return res.status(403).json({ success: false, message: 'Must be enrolled in class to take quiz' });
    }

    const now = new Date();
    if (quiz.startTime && now < new Date(quiz.startTime)) {
      return res.status(400).json({ success: false, message: 'Quiz has not started yet' });
    }
    if (quiz.endTime && now > new Date(quiz.endTime)) {
      return res.status(400).json({ success: false, message: 'Quiz has ended' });
    }

    const existingAttemptsCount = await QuizAttempt.countDocuments({ quizId, student: studentId });
    if (existingAttemptsCount >= quiz.maxAttempts) {
      // Find latest attempt to see if it's still in progress
      const latestAttempt = await QuizAttempt.findOne({ quizId, student: studentId }).sort('-createdAt');
      if (latestAttempt && latestAttempt.status === 'In Progress') {
        // Enforce time limit check on resume
        const elapsedMinutes = (Date.now() - new Date(latestAttempt.startTime).getTime()) / 60000;
        if (elapsedMinutes > quiz.durationMinutes) {
          // Time is up, auto submit
          latestAttempt.status = 'Submitted';
          latestAttempt.submittedAt = new Date(new Date(latestAttempt.startTime).getTime() + quiz.durationMinutes * 60000);
          await latestAttempt.save();
          return res.status(400).json({ success: false, message: 'Time limit exceeded. Attempt auto-submitted.' });
        }
        // Allow resuming
        return res.status(200).json({ success: true, data: latestAttempt });
      }
      return res.status(400).json({ success: false, message: 'Max attempts reached' });
    }

    const attempt = await QuizAttempt.create({
      quizId,
      student: studentId,
      status: 'In Progress',
      answers: []
    });

    res.status(201).json({
      success: true,
      data: attempt
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit quiz attempt
// @route   PUT /api/classes/:classId/quizzes/:id/attempts/:attemptId
// @access  Private (Student)
exports.submitAttempt = async (req, res, next) => {
  try {
    const { id: quizId, attemptId } = req.params;
    const { answers } = req.body; // array of { questionId, selectedOptionIndex }
    
    const attempt = await QuizAttempt.findOne({ _id: attemptId, quizId, student: req.user.id });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status === 'Submitted') {
      return res.status(400).json({ success: false, message: 'Attempt is already submitted' });
    }

    const quiz = await Quiz.findById(quizId);
    
    // Check if time expired
    const elapsedMinutes = (Date.now() - new Date(attempt.startTime).getTime()) / 60000;
    const isExpired = elapsedMinutes > quiz.durationMinutes;

    // Calculate score safely using server-side correctOptionIndex
    let score = 0;
    const safeAnswers = [];

    // Map quiz questions for O(1) lookup
    const qMap = {};
    quiz.questions.forEach(q => qMap[q._id.toString()] = q);

    if (Array.isArray(answers)) {
      answers.forEach(ans => {
        const q = qMap[ans.questionId];
        if (q) {
          safeAnswers.push({ questionId: ans.questionId, selectedOptionIndex: ans.selectedOptionIndex });
          if (ans.selectedOptionIndex === q.correctOptionIndex) {
            score += q.marks;
          }
        }
      });
    }

    attempt.answers = safeAnswers;
    attempt.score = score;
    attempt.status = 'Submitted';
    
    if (isExpired) {
      attempt.submittedAt = new Date(new Date(attempt.startTime).getTime() + quiz.durationMinutes * 60000);
    } else {
      attempt.submittedAt = Date.now();
    }

    await attempt.save();

    res.status(200).json({
      success: true,
      data: attempt,
      message: isExpired ? 'Time expired. Submitted automatically.' : 'Submitted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all attempts for a quiz (Teacher analytics)
// @route   GET /api/classes/:classId/quizzes/:id/attempts
// @access  Private (Teacher/Admin)
exports.getQuizAnalytics = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (quiz.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const attempts = await QuizAttempt.find({ quizId }).populate('student', 'name email');

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get my attempts
// @route   GET /api/classes/:classId/quizzes/:id/attempts/me
// @access  Private (Student)
exports.getMyAttempts = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const attempts = await QuizAttempt.find({ quizId, student: req.user.id }).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (err) {
    next(err);
  }
};
