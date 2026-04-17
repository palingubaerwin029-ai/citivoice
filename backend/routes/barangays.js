const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

// ─── List all barangays ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM barangays ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Add barangay ─────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Barangay name is required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO barangays (name, created_at, updated_at) VALUES (?, NOW(), NOW())',
      [name.trim()]
    );
    const [rows] = await pool.query('SELECT * FROM barangays WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'This barangay already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Update barangay ──────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Barangay name is required' });
  try {
    await pool.query('UPDATE barangays SET name=?, updated_at=NOW() WHERE id=?', [name.trim(), req.params.id]);
    const [rows] = await pool.query('SELECT * FROM barangays WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'This barangay already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Delete barangay ──────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM barangays WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
