const express = require('express');
const { getMaterials, createMaterial, downloadMaterial, updateMaterial, deleteMaterial } = require('../controllers/material.controller');
const { authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// mergeParams: true allows accessing params from the parent router (classId)
const router = express.Router({ mergeParams: true });

router.get('/', getMaterials);
router.post('/', authorize('teacher', 'admin'), upload.single('file'), createMaterial);
router.get('/:materialId/download', downloadMaterial);
router.put('/:materialId', authorize('teacher', 'admin'), upload.single('file'), updateMaterial);
router.delete('/:materialId', authorize('teacher', 'admin'), deleteMaterial);

module.exports = router;
