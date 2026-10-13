const mongoose = require('mongoose');

const leaveApplicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  classId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class',
    required: true
  },
  teacher: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  startDate: {
    type: Date,
    required: [true, 'Please provide a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please provide an end date']
  },
  reason: {
    type: String,
    required: [true, 'Please provide a reason for leave'],
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNote: {
    type: String,
    trim: true,
    maxlength: 300
  },
  teacherComment: {
    type: String,
    trim: true,
    maxlength: 300
  }
}, {
  timestamps: true
});

leaveApplicationSchema.index({ classId: 1, student: 1, status: 1 });
leaveApplicationSchema.index({ teacher: 1, status: 1 });
leaveApplicationSchema.index({ student: 1, createdAt: -1 });

module.exports = mongoose.model('LeaveApplication', leaveApplicationSchema);
