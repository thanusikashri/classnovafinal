const StudyMaterial = require('../models/StudyMaterial');
const Class = require('../models/Class');
const Notification = require('../models/Notification');
const cloudinaryService = require('../services/cloudinary.service');
const https = require('https');

// @desc    Get materials for a class
// @route   GET /api/classes/:classId/materials
// @access  Private
exports.getMaterials = async (req, res, next) => {
  try {
    const classId = req.params.classId;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Check permissions
    if (req.user.role === 'student' && !cls.students.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access materials for this class' });
    }
    if (req.user.role === 'teacher' && cls.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to access materials for this class' });
    }

    const materials = await StudyMaterial.find({ classId }).sort('-createdAt').populate('teacher', 'name email');

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new material
// @route   POST /api/classes/:classId/materials
// @access  Private (Teacher/Admin)
exports.createMaterial = async (req, res, next) => {
  try {
    const classId = req.params.classId;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Ensure user is the teacher of this class or an admin
    if (cls.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to add materials for this class' });
    }

    if (!req.file && !req.body.fileUrl) {
      return res.status(400).json({ success: false, message: 'Please provide a file to upload' });
    }

    let fileUrl = req.body.fileUrl;
    let fileName = req.body.fileName;
    let fileType = req.body.fileType;

    if (req.file) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
        return res.status(500).json({ success: false, message: 'Cloudinary configuration is missing. Cannot process file upload.' });
      }
      try {
        const uploadResult = await cloudinaryService.uploadToCloudinary(req.file.buffer, `smart-classroom/classes/${classId}`);
        fileUrl = uploadResult.secure_url;
        fileName = req.file.originalname || req.body.title;
        fileType = req.file.mimetype;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ success: false, message: 'Failed to upload file to Cloudinary' });
      }
    }

    req.body.classId = classId;
    req.body.teacher = cls.teacher; // Use actual class teacher
    req.body.fileUrl = fileUrl;
    req.body.fileName = fileName;
    req.body.fileType = fileType;

    const material = await StudyMaterial.create(req.body);

    // Create notifications for all students in the class
    if (cls.students && cls.students.length > 0) {
      const notifications = cls.students.map(studentId => ({
        recipient: studentId,
        title: `New Material in ${cls.name}`,
        message: `Material: ${material.title}`,
        type: 'assignment', // reusing 'assignment' or we could add 'material' to schema enum
        link: `/classes/${cls._id}`
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      data: material
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Download material file
// @route   GET /api/classes/:classId/materials/:materialId/download
// @access  Private
exports.downloadMaterial = async (req, res, next) => {
  try {
    const { classId, materialId } = req.params;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (req.user.role === 'student' && !cls.students.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to download materials for this class' });
    }
    if (req.user.role === 'teacher' && cls.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to download materials for this class' });
    }

    const material = await StudyMaterial.findOne({ _id: materialId, classId });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    if (!material.fileUrl) {
      return res.status(400).json({ success: false, message: 'Material has no file associated' });
    }

    let downloadName = material.fileName || material.title || 'material_download';
    // Sanitize filename strictly (RFC 5987 / safe ASCII)
    downloadName = downloadName.replace(/[^a-zA-Z0-9.\-_\s]/g, '_').trim();
    // Handle non-ASCII safely in Content-Disposition if needed, but safe replace above is usually enough for this requirement.

    if (!downloadName.includes('.')) {
      if (material.fileType && material.fileType.includes('/')) {
        const ext = material.fileType.split('/')[1];
        if (ext && ext !== 'octet-stream') {
          downloadName += '.' + ext;
        }
      }
    }

    const isView = req.query.action === 'view';
    const disposition = isView ? 'inline' : 'attachment';

    res.setHeader('Content-Disposition', `${disposition}; filename="${downloadName}"`);
    if (material.fileType) {
      res.setHeader('Content-Type', material.fileType);
    }

    const request = material.fileUrl.startsWith('https') ? https : require('http');
    request.get(material.fileUrl, (stream) => {
      if (stream.statusCode !== 200) {
        res.status(stream.statusCode).end();
        return;
      }
      stream.pipe(res);
    }).on('error', (e) => {
      console.error('Stream error:', e);
      res.status(500).end();
    });

  } catch (err) {
    next(err);
  }
};

// @desc    Update material
// @route   PUT /api/classes/:classId/materials/:materialId
// @access  Private (Teacher/Admin)
exports.updateMaterial = async (req, res, next) => {
  try {
    const { classId, materialId } = req.params;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (cls.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update materials for this class' });
    }

    let material = await StudyMaterial.findOne({ _id: materialId, classId });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    const updates = {
      title: req.body.title || material.title,
      description: req.body.description !== undefined ? req.body.description : material.description,
    };

    if (req.file) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
        return res.status(500).json({ success: false, message: 'Cloudinary configuration is missing.' });
      }
      try {
        const uploadResult = await cloudinaryService.uploadToCloudinary(req.file.buffer, `smart-classroom/classes/${classId}`);
        updates.fileUrl = uploadResult.secure_url;
        updates.fileName = req.file.originalname || updates.title;
        updates.fileType = req.file.mimetype;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ success: false, message: 'Failed to upload new file to Cloudinary' });
      }
    }

    material = await StudyMaterial.findByIdAndUpdate(materialId, updates, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      data: material
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete material
// @route   DELETE /api/classes/:classId/materials/:materialId
// @access  Private (Teacher/Admin)
exports.deleteMaterial = async (req, res, next) => {
  try {
    const { classId, materialId } = req.params;
    const cls = await Class.findById(classId);

    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (cls.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete materials for this class' });
    }

    const material = await StudyMaterial.findOne({ _id: materialId, classId });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    await StudyMaterial.deleteOne({ _id: materialId });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
