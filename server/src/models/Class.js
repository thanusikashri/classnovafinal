const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a class name'],
    trim: true,
    maxlength: [100, 'Class name can not be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  teacher: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  students: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  classCode: {
    type: String,
    required: true,
    unique: true,
    maxlength: [10, 'Class code can not be more than 10 characters']
  }
}, { timestamps: true });

module.exports = mongoose.model('Class', ClassSchema);
