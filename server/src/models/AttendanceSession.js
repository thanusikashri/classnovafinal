const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
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
  otp: {
    type: String,
    required: true,
    select: false // Do not expose OTP in regular queries
  },
  expiresAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'expired'],
    default: 'active'
  }
}, {
  timestamps: true
});

attendanceSessionSchema.index({ classId: 1, createdAt: -1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
