const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.ObjectId,
    ref: 'AttendanceSession',
    required: true
  },
  classId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class',
    required: true
  },
  studentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'excused'],
    default: 'present'
  }
}, {
  timestamps: true
});

// Unique compound database index to prevent duplicate attendance submissions
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceRecordSchema.index({ classId: 1, studentId: 1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
