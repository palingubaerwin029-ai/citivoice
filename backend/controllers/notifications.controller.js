const {
  selectNotificationsByUser,
  selectUnreadCount,
  updateNotificationRead,
  updateAllNotificationsRead,
} = require('../models/notification.model');

const getNotifications = async (req, res) => {
  try {
    const rows = await selectNotificationsByUser(req.user.id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await selectUnreadCount(req.user.id);
    res.json({ unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to count unread notifications' });
  }
};

const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await updateNotificationRead(id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};

const markAllRead = async (req, res) => {
  try {
    await updateAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};
