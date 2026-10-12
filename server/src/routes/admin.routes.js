const express = require('express');
const { getAdminStats } = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);

module.exports = router;