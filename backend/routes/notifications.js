const express = require("express");
const router = express.Router();
const db = require("../db");

// Middleware to authenticate user and extract user_id from token
const authUser = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const jwt = require("jsonwebtoken");
    const payload = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET || "default_secret_key");
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// GET /api/notifications - Get all notifications for current user
router.get("/", authUser, async (req, res) => {
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
router.get("/unread-count", authUser, async (req, res) => {
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
router.put("/:id/read", authUser, async (req, res) => {
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
router.put("/read-all", authUser, async (req, res) => {
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
