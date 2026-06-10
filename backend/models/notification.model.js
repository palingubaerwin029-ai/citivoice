const db = require('../db');

const selectNotificationsByUser = async (userId) => {
  const [rows] = await db.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId],
  );
  return rows;
};

const selectUnreadCount = async (userId) => {
  const [rows] = await db.query(
    'SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = false',
    [userId],
  );
  return rows[0].unreadCount;
};

const updateNotificationRead = async (id, userId) => {
  await db.query('UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?', [
    id,
    userId,
  ]);
};

const updateAllNotificationsRead = async (userId) => {
  await db.query('UPDATE notifications SET is_read = true WHERE user_id = ?', [userId]);
};

const insertNotification = async (userId, title, message) => {
  await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [
    userId,
    title,
    message,
  ]);
};

module.exports = {
  selectNotificationsByUser,
  selectUnreadCount,
  updateNotificationRead,
  updateAllNotificationsRead,
  insertNotification,
};
