const express = require('express');
const { getUsers, getUser, updateUserStatus } = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id/status', updateUserStatus);

module.exports = router;
