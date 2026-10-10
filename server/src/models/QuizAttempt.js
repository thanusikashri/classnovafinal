const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.ObjectId,
    required: true
  },
  selectedOptionIndex: {
    type: Number,
    required: true
  }
});

const QuizAttemptSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['In Progress', 'Submitted'],
    default: 'In Progress'
  },
  answers: [AnswerSchema],
  score: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  }
}, { timestamps: true });

QuizAttemptSchema.index({ quizId: 1, student: 1 });

module.exports = mongoose.model('QuizAttempt', QuizAttemptSchema);
