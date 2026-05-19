const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { cacheMiddleware, invalidate } = require('../middleware/cache');
const { validateBarangay, validateIdParam } = require('../middleware/validate');

// ─── List all barangays (cached 10 min) ───────────────────────────────────────
router.get('/', cacheMiddleware('barangays', 600), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM barangays ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Barangays list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Add barangay (admin only) ────────────────────────────────────────────────
router.post('/', auth, requireRole('admin'), validateBarangay, async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO barangays (name, created_at, updated_at) VALUES (?, NOW(), NOW())',
      [name.trim()]
    );
    invalidate('barangays');
    const [rows] = await pool.query('SELECT * FROM barangays WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'This barangay already exists' });
    console.error('Barangay create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update barangay (admin only) ─────────────────────────────────────────────
router.put('/:id', auth, requireRole('admin'), validateIdParam, validateBarangay, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query('UPDATE barangays SET name=?, updated_at=NOW() WHERE id=?', [name.trim(), req.params.id]);
    invalidate('barangays');
    const [rows] = await pool.query('SELECT * FROM barangays WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'This barangay already exists' });
    console.error('Barangay update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Delete barangay (admin only) ─────────────────────────────────────────────
router.delete('/:id', auth, requireRole('admin'), validateIdParam, async (req, res) => {
  try {
    await pool.query('DELETE FROM barangays WHERE id = ?', [req.params.id]);
    invalidate('barangays');
    res.json({ success: true });
  } catch (err) {
    console.error('Barangay delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
