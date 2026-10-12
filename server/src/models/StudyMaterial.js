const mongoose = require('mongoose');

const StudyMaterialSchema = new mongoose.Schema({
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
    required: [true, 'Please add a material title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  fileUrl: {
    type: String,
    required: [true, 'Please provide a file URL']
  },
  fileName: {
    type: String,
    required: [true, 'Please provide a file name']
  },
  fileType: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('StudyMaterial', StudyMaterialSchema);
