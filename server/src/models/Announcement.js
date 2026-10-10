const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class',
    required: true
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Please add announcement content']
  },
  attachments: [{
    url: String,
    filename: String,
    fileType: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
