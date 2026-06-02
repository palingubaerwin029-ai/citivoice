const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateIdParam } = require('../middleware/validate');
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead
} = require('../controllers/notifications.controller');

// GET /api/notifications - Get all notifications for current user
router.get('/', auth, getNotifications);

// GET /api/notifications/unread-count - Get count of unread notifications
router.get('/unread-count', auth, getUnreadCount);

// PUT /api/notifications/:id/read - Mark single notification as read
router.put('/:id/read', auth, validateIdParam, markRead);

// PUT /api/notifications/read-all - Mark all notifications as read for current user
router.put('/read-all', auth, markAllRead);

module.exports = router;
