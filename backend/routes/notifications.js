const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../middleware/auth");
const { validateIdParam } = require('../middleware/validate');

// GET /api/notifications - Get all notifications for current user
router.get("/", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// GET /api/notifications/unread-count - Get count of unread notifications
router.get("/unread-count", auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = false",
      [req.user.id]
    );
    res.json({ unreadCount: rows[0].unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to count unread notifications" });
  }
});

// PUT /api/notifications/:id/read - Mark single notification as read
router.put("/:id/read", auth, validateIdParam, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      "UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read for current user
router.put("/read-all", auth, async (req, res) => {
  try {
    await db.query(
      "UPDATE notifications SET is_read = true WHERE user_id = ?",
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

module.exports = router;
