const Announcement = require('../models/Announcement');
const Class = require('../models/Class');
const Notification = require('../models/Notification');

// @desc    Get announcements for a class
// @route   GET /api/classes/:classId/announcements
// @access  Private
exports.getAnnouncements = async (req, res, next) => {
  try {
    const classData = await Class.findById(req.params.classId);

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && classData.teacher.toString() !== req.user.id && !classData.students.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view announcements for this class' });
    }

    const announcements = await Announcement.find({ classId: req.params.classId })
      .populate('author', 'name email role')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: announcements.length, data: announcements });
  } catch (err) {
    next(err);
  }
};

// @desc    Create announcement
// @route   POST /api/classes/:classId/announcements
// @access  Private (Teacher of class, Admin)
exports.createAnnouncement = async (req, res, next) => {
  try {
    const classData = await Class.findById(req.params.classId);

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && classData.teacher.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the class teacher can create announcements' });
    }

    req.body.classId = req.params.classId;
    req.body.author = req.user.id;

    const announcement = await Announcement.create(req.body);
    const populated = await announcement.populate('author', 'name email role');

    // Create notifications for all students in the class
    if (classData.students && classData.students.length > 0) {
      const notifications = classData.students.map(studentId => ({
        recipient: studentId,
        title: `New Announcement in ${classData.name}`,
        message: announcement.content.substring(0, 100) + (announcement.content.length > 100 ? '...' : ''),
        type: 'announcement',
        link: `/classes/${classData._id}`
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};
