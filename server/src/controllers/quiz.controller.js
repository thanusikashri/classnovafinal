const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Class = require('../models/Class');
const { evaluateDescriptiveAnswer } = require('../services/aiGenerator.service');

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

    // Backend validation: enforce between 1 and 10 questions maximum
    if (!req.body.questions || !Array.isArray(req.body.questions) || req.body.questions.length === 0) {
      return res.status(400).json({ success: false, message: 'A quiz must contain at least 1 question' });
    }

    if (req.body.questions.length > 10) {
      return res.status(400).json({ success: false, message: 'A quiz cannot contain more than 10 questions (maximum 10 allowed)' });
    }

    for (let i = 0; i < req.body.questions.length; i++) {
      const q = req.body.questions[i];
      if (!q.text || !q.text.trim()) {
        return res.status(400).json({ success: false, message: `Question ${i + 1} text is required` });
      }
      const qType = q.type || 'multiple_choice';
      if (qType === 'multiple_choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} must have at least 2 options` });
        }
        const optIdx = Number(q.correctOptionIndex);
        if (isNaN(optIdx) || optIdx < 0 || optIdx >= q.options.length) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} has an invalid correct option index` });
        }
      } else if (qType === 'true_false') {
        if (!Array.isArray(q.options) || q.options.length !== 2) {
          q.options = ['True', 'False'];
        }
        const optIdx = Number(q.correctOptionIndex);
        if (isNaN(optIdx) || optIdx < 0 || optIdx >= 2) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} must specify whether True (0) or False (1) is correct` });
        }
      } else if (qType === 'short_answer') {
        if (!q.correctAnswer && !q.expectedAnswer) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} must have a reference/expected answer` });
        }
      }
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

    if (req.body.questions) {
      if (!Array.isArray(req.body.questions) || req.body.questions.length === 0) {
        return res.status(400).json({ success: false, message: 'A quiz must contain at least 1 question' });
      }
      if (req.body.questions.length > 10) {
        return res.status(400).json({ success: false, message: 'A quiz cannot contain more than 10 questions (maximum 10 allowed)' });
      }
      for (let i = 0; i < req.body.questions.length; i++) {
        const q = req.body.questions[i];
        if (!q.text || !q.text.trim()) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} text is required` });
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} must have at least 2 options` });
        }
        const optIdx = Number(q.correctOptionIndex);
        if (isNaN(optIdx) || optIdx < 0 || optIdx >= q.options.length) {
          return res.status(400).json({ success: false, message: `Question ${i + 1} has an invalid correct option index` });
        }
      }
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
    const { answers } = req.body; // array of { questionId, selectedOptionIndex, textAnswer }
    
    const attempt = await QuizAttempt.findOne({ _id: attemptId, quizId, student: req.user.id });
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (attempt.status === 'Submitted') {
      return res.status(400).json({ success: false, message: 'Attempt is already submitted' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }
    
    // Check if time expired
    const elapsedMinutes = (Date.now() - new Date(attempt.startTime).getTime()) / 60000;
    const isExpired = elapsedMinutes > quiz.durationMinutes;

    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let hasManualReview = false;

    const safeAnswers = [];
    const evaluation = [];

    const ansMap = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.questionId) {
          ansMap[a.questionId.toString()] = a;
        }
      });
    }

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i];
      const qId = q._id.toString();
      const studentAns = ansMap[qId] || ansMap[i.toString()] || null;
      const questionMarks = q.marks || 1;
      maxScore += questionMarks;

      const qType = q.type || 'multiple_choice';

      if (qType === 'multiple_choice' || qType === 'true_false') {
        const selectedOptIdx = studentAns && studentAns.selectedOptionIndex !== undefined && studentAns.selectedOptionIndex !== null && studentAns.selectedOptionIndex !== -1
          ? Number(studentAns.selectedOptionIndex)
          : null;

        const isAnswered = selectedOptIdx !== null && !isNaN(selectedOptIdx);
        const selectedOptText = isAnswered && q.options && q.options[selectedOptIdx] ? q.options[selectedOptIdx] : '';
        const correctOptText = q.options && q.options[q.correctOptionIndex] ? q.options[q.correctOptionIndex] : '';

        if (!isAnswered) {
          unansweredCount++;
          safeAnswers.push({ questionId: qId, selectedOptionIndex: -1 });
          evaluation.push({
            questionId: qId,
            questionText: q.text,
            questionType: qType,
            studentAnswer: null,
            selectedOptionText: 'No answer submitted',
            correctOptionIndex: q.correctOptionIndex,
            correctAnswerText: correctOptText,
            isCorrect: false,
            marksAwarded: 0,
            maxMarks: questionMarks,
            feedback: 'Question was left unanswered.',
            needsManualReview: false
          });
        } else {
          const isCorrect = selectedOptIdx === q.correctOptionIndex;
          const marksAwarded = isCorrect ? questionMarks : 0;
          if (isCorrect) {
            correctCount++;
            score += marksAwarded;
          } else {
            incorrectCount++;
          }

          safeAnswers.push({ questionId: qId, selectedOptionIndex: selectedOptIdx });
          evaluation.push({
            questionId: qId,
            questionText: q.text,
            questionType: qType,
            studentAnswer: selectedOptIdx,
            selectedOptionText: selectedOptText,
            correctOptionIndex: q.correctOptionIndex,
            correctAnswerText: correctOptText,
            isCorrect,
            marksAwarded,
            maxMarks: questionMarks,
            feedback: isCorrect ? 'Correct! Full marks awarded.' : `Incorrect. Correct answer: ${correctOptText}`,
            needsManualReview: false
          });
        }
      } else if (qType === 'short_answer') {
        const textAnswer = studentAns && studentAns.textAnswer ? String(studentAns.textAnswer).trim() : '';
        const isAnswered = textAnswer.length > 0;
        const expectedAnswer = q.correctAnswer || (q.options && q.options[0]) || '';

        if (!isAnswered) {
          unansweredCount++;
          safeAnswers.push({ questionId: qId, textAnswer: '' });
          evaluation.push({
            questionId: qId,
            questionText: q.text,
            questionType: qType,
            studentAnswer: '',
            selectedOptionText: 'No response submitted',
            correctAnswerText: expectedAnswer,
            isCorrect: false,
            marksAwarded: 0,
            maxMarks: questionMarks,
            feedback: 'Question was left unanswered.',
            needsManualReview: false
          });
        } else {
          const evalResult = await evaluateDescriptiveAnswer(textAnswer, expectedAnswer, q.rubric || '', questionMarks);
          score += evalResult.marksAwarded;
          if (evalResult.isCorrect) {
            correctCount++;
          } else {
            incorrectCount++;
          }
          if (evalResult.needsManualReview) {
            hasManualReview = true;
          }

          safeAnswers.push({ questionId: qId, textAnswer });
          evaluation.push({
            questionId: qId,
            questionText: q.text,
            questionType: qType,
            studentAnswer: textAnswer,
            selectedOptionText: textAnswer,
            correctAnswerText: expectedAnswer,
            isCorrect: evalResult.isCorrect,
            marksAwarded: evalResult.marksAwarded,
            maxMarks: questionMarks,
            feedback: evalResult.feedback,
            needsManualReview: evalResult.needsManualReview
          });
        }
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const evaluationStatus = hasManualReview ? 'Pending Review' : 'Evaluated';

    attempt.answers = safeAnswers;
    attempt.evaluation = evaluation;
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.correctCount = correctCount;
    attempt.incorrectCount = incorrectCount;
    attempt.unansweredCount = unansweredCount;
    attempt.evaluationStatus = evaluationStatus;
    attempt.status = 'Submitted';
    attempt.submittedAt = isExpired
      ? new Date(new Date(attempt.startTime).getTime() + quiz.durationMinutes * 60000)
      : new Date();

    await attempt.save();

    res.status(200).json({
      success: true,
      data: attempt,
      message: isExpired ? 'Time expired. Submitted automatically.' : 'Submitted and evaluated successfully'
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

    const attempts = await QuizAttempt.find({ quizId })
      .populate('student', 'name email studentId')
      .sort('-submittedAt -createdAt');

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single attempt details
// @route   GET /api/classes/:classId/quizzes/:id/attempts/:attemptId
// @access  Private
exports.getAttemptById = async (req, res, next) => {
  try {
    const { id: quizId, attemptId } = req.params;
    const attempt = await QuizAttempt.findById(attemptId).populate('student', 'name email studentId');

    if (!attempt || attempt.quizId.toString() !== quizId) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const isStudentOwner = attempt.student && (attempt.student._id.toString() === req.user.id || attempt.student.toString() === req.user.id);
    const isTeacher = quiz.teacher.toString() === req.user.id || req.user.role === 'admin';

    if (!isStudentOwner && !isTeacher) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this attempt' });
    }

    res.status(200).json({
      success: true,
      data: attempt
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Teacher manually grades or adjusts marks
// @route   PUT /api/classes/:classId/quizzes/:id/attempts/:attemptId/grade
// @access  Private (Teacher/Admin)
exports.gradeAttempt = async (req, res, next) => {
  try {
    const { id: quizId, attemptId } = req.params;
    const { evaluations, teacherNotes } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    if (quiz.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to grade this quiz' });
    }

    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt || attempt.quizId.toString() !== quizId) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (Array.isArray(evaluations)) {
      evaluations.forEach(ev => {
        const item = attempt.evaluation.find(e => e.questionId === ev.questionId);
        if (item) {
          if (ev.marksAwarded !== undefined) {
            item.marksAwarded = Math.min(item.maxMarks, Math.max(0, Number(ev.marksAwarded)));
            item.isCorrect = item.marksAwarded >= Math.ceil(item.maxMarks * 0.5);
          }
          if (ev.feedback !== undefined) {
            item.feedback = ev.feedback;
          }
          item.needsManualReview = false;
        }
      });
    }

    // Recalculate score and percentage
    let newScore = 0;
    let newCorrect = 0;
    let newIncorrect = 0;
    let hasPending = false;

    attempt.evaluation.forEach(e => {
      newScore += e.marksAwarded;
      if (e.isCorrect) newCorrect++;
      else if (e.marksAwarded === 0 && e.studentAnswer === null) {
        // Unanswered
      } else {
        newIncorrect++;
      }
      if (e.needsManualReview) hasPending = true;
    });

    attempt.score = newScore;
    attempt.percentage = attempt.maxScore > 0 ? Math.round((newScore / attempt.maxScore) * 100) : 0;
    attempt.correctCount = newCorrect;
    attempt.incorrectCount = newIncorrect;
    attempt.evaluationStatus = hasPending ? 'Pending Review' : 'Evaluated';
    attempt.manualGrading = {
      gradedBy: req.user.id,
      gradedAt: new Date(),
      teacherNotes: teacherNotes || ''
    };

    await attempt.save();

    res.status(200).json({
      success: true,
      data: attempt,
      message: 'Grading updated successfully'
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
