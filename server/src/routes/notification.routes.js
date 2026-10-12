const express = require('express');
const {
    getNotifications,
    getUnreadCount,
    markRead,
    markAllRead
} = require('../controllers/notification.controller');

const { authenticate } = require('../middlewares/auth.middleware.js');

const router = express.Router();

router.use(authenticate);

router.get('/unread', getUnreadCount);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.get('/', getNotifications);

module.exports = router;