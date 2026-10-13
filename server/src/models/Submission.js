const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Assignment',
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
  teacher: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  content: {
    type: String,
    default: ''
  },
  fileUrl: {
    type: String,
    required: [true, 'Please provide the uploaded document']
  },
  fileName: {
    type: String,
    required: [true, 'Original document filename is required']
  },
  fileSize: {
    type: Number,
    default: 0
  },
  fileType: {
    type: String,
    default: 'application/pdf'
  },
  filePath: {
    type: String,
    default: ''
  },
  isLate: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Submitted', 'Graded', 'Reviewed'],
    default: 'Submitted'
  },
  marks: {
    type: Number,
    min: [0, 'Marks cannot be less than 0']
  },
  feedback: {
    type: String,
    default: ''
  },
  gradedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  }
}, { timestamps: true });

// Ensure a student can only have one active submission per assignment
SubmissionSchema.index({ assignmentId: 1, student: 1 }, { unique: true });
SubmissionSchema.index({ classId: 1, teacher: 1 });

module.exports = mongoose.model('Submission', SubmissionSchema);
