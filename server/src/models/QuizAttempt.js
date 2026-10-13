const mongoose = require('mongoose');

const EvaluationItemSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  questionText: {
    type: String
  },
  questionType: {
    type: String,
    default: 'multiple_choice'
  },
  studentAnswer: {
    type: mongoose.Schema.Types.Mixed
  },
  selectedOptionText: {
    type: String
  },
  correctOptionIndex: {
    type: Number
  },
  correctAnswerText: {
    type: String
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  marksAwarded: {
    type: Number,
    default: 0
  },
  maxMarks: {
    type: Number,
    default: 1
  },
  feedback: {
    type: String,
    default: ''
  },
  needsManualReview: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  selectedOptionIndex: {
    type: Number
  },
  textAnswer: {
    type: String
  }
}, { _id: false });

const QuizAttemptSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Quiz',
    required: true
  },
  classId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class'
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['In Progress', 'Submitted'],
    default: 'In Progress'
  },
  evaluationStatus: {
    type: String,
    enum: ['Evaluated', 'Pending Review'],
    default: 'Evaluated'
  },
  answers: [AnswerSchema],
  evaluation: [EvaluationItemSchema],
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  correctCount: {
    type: Number,
    default: 0
  },
  incorrectCount: {
    type: Number,
    default: 0
  },
  unansweredCount: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  manualGrading: {
    gradedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    gradedAt: {
      type: Date
    },
    teacherNotes: {
      type: String
    }
  }
}, { timestamps: true });

QuizAttemptSchema.index({ quizId: 1, student: 1 });
QuizAttemptSchema.index({ classId: 1, status: 1 });

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
