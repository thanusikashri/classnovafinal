const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Please provide submission content']
  },
  status: {
    type: String,
    enum: ['Submitted', 'Graded'],
    default: 'Submitted'
  },
  marks: {
    type: Number,
    min: [0, 'Marks cannot be less than 0']
  },
  feedback: {
    type: String
  },
  gradedAt: {
    type: Date
  }
}, { timestamps: true });

// Ensure a student can only have one submission per assignment
SubmissionSchema.index({ assignmentId: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
