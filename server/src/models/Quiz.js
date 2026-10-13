const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please add question text']
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer'],
    default: 'multiple_choice'
  },
  options: {
    type: [String],
    default: []
  },
  correctOptionIndex: {
    type: Number,
    min: 0
  },
  correctAnswer: {
    type: String
  },
  rubric: {
    type: String
  },
  explanation: {
    type: String
  },
  marks: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  }
});

const QuizSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class',
    required: true
  },
  teacher: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a quiz title'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String
  },
  durationMinutes: {
    type: Number,
    required: [true, 'Please set a duration in minutes'],
    min: 1
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  questions: {
    type: [QuestionSchema],
    validate: [
      {
        validator: function(v) {
          return !v || (v.length >= 1 && v.length <= 10);
        },
        message: 'A quiz cannot contain more than 10 questions (maximum 10 allowed)'
      }
    ]
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  maxAttempts: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

// Virtual to calculate total marks
QuizSchema.virtual('totalMarks').get(function() {
  return this.questions.reduce((total, q) => total + q.marks, 0);
});

QuizSchema.set('toJSON', { virtuals: true });
QuizSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Quiz', QuizSchema);
