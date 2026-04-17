const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

// ─── List all events ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Create event ─────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { title, description, category, date, location, organizer, link } = req.body;
  if (!title?.trim() || !date)
    return res.status(400).json({ error: 'Title and date are required' });
  try {
    const [result] = await pool.query(
      `INSERT INTO events (title, description, category, date, location, organizer, link, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title.trim(), description || null, category || 'other', new Date(date), location || null, organizer || null, link || null]
    );
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Update event ─────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const { title, description, category, date, location, organizer, link } = req.body;
  try {
    await pool.query(
      `UPDATE events SET
         title       = COALESCE(?, title),
         description = COALESCE(?, description),
         category    = COALESCE(?, category),
         date        = COALESCE(?, date),
         location    = COALESCE(?, location),
         organizer   = COALESCE(?, organizer),
         link        = COALESCE(?, link),
         updated_at  = NOW()
       WHERE id = ?`,
      [title, description, category, date ? new Date(date) : null, location, organizer, link, req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete event ─────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
