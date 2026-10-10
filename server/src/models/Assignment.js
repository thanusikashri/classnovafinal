const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
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
    required: [true, 'Please add an assignment title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add assignment instructions']
  },
  dueDate: {
    type: Date
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 100,
    min: [0, 'Maximum marks cannot be less than 0']
  }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
