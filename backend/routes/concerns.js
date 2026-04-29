const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');
const { notifyUser } = require('../services/notificationService');

const BASE_URL = () => process.env.BASE_URL || 'http://localhost:5000';

const deleteImageFile = (imageUrl) => {
  if (!imageUrl) return;
  try {
    const filename = imageUrl.split('/uploads/')[1];
    if (filename) {
      // Basic traversal check: filename shouldn't contain ".."
      if (filename.includes('..')) return;
      const filePath = path.join(__dirname, '..', 'uploads', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  } catch (_) { }
};

// ─── List all concerns (auth required) ────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM concerns ORDER BY created_at DESC');

    // If not admin, strip potentially sensitive user info for concerns not owned by the user
    if (req.user.role !== 'admin') {
      const sanitized = rows.map(r => {
        if (r.user_id === req.user.id) return r;
        const { user_id, user_name, user_barangay, ...rest } = r;
        return rest;
      });
      return res.json(sanitized);
    }

    res.json(rows);
  } catch (err) {
    console.error('Concerns list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get single concern (auth required) ───────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM concerns WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Concern not found' });

    const concern = rows[0];
    const [up] = await pool.query(
      'SELECT id FROM concern_upvotes WHERE concern_id=? AND user_id=?',
      [concern.id, req.user.id]
    );
    concern.is_upvoted_by_me = up.length > 0;

    // If not admin and not owner, strip potentially sensitive user info
    if (req.user.role !== 'admin' && concern.user_id !== req.user.id) {
      const { user_id, user_name, user_barangay, ...rest } = concern;
      return res.json(rest);
    }

    res.json(concern);
  } catch (err) {
    console.error('Concern fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Submit new concern ───────────────────────────────────────────────────────
router.post('/', auth, upload.single('image'), async (req, res) => {
  const {
    title, description, category, priority,
    location_address, location_lat, location_lng,
    user_name, user_barangay,
  } = req.body;

  if (!title || !description || !category)
    return res.status(400).json({ error: 'title, description and category are required' });

  const image_url = req.file ? `${BASE_URL()}/uploads/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO concerns
         (title, description, category, priority, status, image_url,
          location_address, location_lat, location_lng,
          user_id, user_name, user_barangay, admin_note, upvotes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, NULL, 0, NOW(), NOW())`,
      [
        title, description, category, priority || 'Medium', image_url,
        location_address || null, location_lat || null, location_lng || null,
        req.user.id, user_name || null, user_barangay || null,
      ]
    );
    const [rows] = await pool.query('SELECT * FROM concerns WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Concern submit error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update concern (admin only: status, admin_note) ──────────────────────────
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { status, admin_note } = req.body;
  try {
    const [existing] = await pool.query(`
      SELECT c.user_id, c.title, c.status, u.name, u.email, u.phone 
      FROM concerns c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Concern not found' });
    const concern = existing[0];

    const fields = [];
    const values = [];
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (admin_note !== undefined) { fields.push('admin_note = ?'); values.push(admin_note || null); }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    fields.push('updated_at = NOW()');
    values.push(req.params.id);

    await pool.query(`UPDATE concerns SET ${fields.join(', ')} WHERE id = ?`, values);

    // Create in-app notification if needed
    if (concern.user_id) {
      if (status && status !== concern.status) {
        await pool.query(
          'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
          [concern.user_id, 'Concern Updated', `Your concern "${concern.title}" was updated to ${status}.`]
        );
        notifyUser(concern, "Concern Updated", `Your concern "${concern.title}" has been updated to ${status}. Check the app for details.`);
      }
      if (admin_note) {
        await pool.query(
          'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
          [concern.user_id, 'New Official Response', `An admin replied to your concern: "${concern.title}".`]
        );
        notifyUser(concern, "New Official Response", `An admin has officially responded to your concern: "${concern.title}". Check the app to view the update.`);
      }
    }

    const [rows] = await pool.query('SELECT * FROM concerns WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Concern update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Delete concern (admin only) ──────────────────────────────────────────────
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT image_url FROM concerns WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Concern not found' });
    deleteImageFile(rows[0].image_url);
    await pool.query('DELETE FROM concern_upvotes WHERE concern_id = ?', [req.params.id]);
    await pool.query('DELETE FROM concerns WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Concern delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Toggle upvote ────────────────────────────────────────────────────────────
router.post('/:id/upvote', auth, async (req, res) => {
  const { id: concernId } = req.params;
  const userId = req.user.id;
  try {
    const [existing] = await pool.query(
      'SELECT id FROM concern_upvotes WHERE concern_id = ? AND user_id = ?',
      [concernId, userId]
    );
    if (existing.length) {
      await pool.query('DELETE FROM concern_upvotes WHERE concern_id = ? AND user_id = ?', [concernId, userId]);
      await pool.query('UPDATE concerns SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = ?', [concernId]);
      return res.json({ upvoted: false });
    }
    await pool.query('INSERT INTO concern_upvotes (concern_id, user_id) VALUES (?, ?)', [concernId, userId]);
    await pool.query('UPDATE concerns SET upvotes = upvotes + 1 WHERE id = ?', [concernId]);
    res.json({ upvoted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Upload ID image (mobile verification) ────────────────────────────────────
router.post('/upload/id-image', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const url = `${BASE_URL()}/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
