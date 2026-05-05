const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// List all templates
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM concern_templates ORDER BY category ASC, created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Templates list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new template (Admin only)
router.post('/', auth, requireRole('admin'), async (req, res) => {
  const { category, priority, quick_title, template_body } = req.body;

  if (!category || !quick_title || !template_body) {
    return res.status(400).json({ error: 'category, quick_title, and template_body are required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO concern_templates (category, priority, quick_title, template_body)
       VALUES (?, ?, ?, ?)`,
      [category, priority || 'Medium', quick_title, template_body]
    );
    const [rows] = await pool.query('SELECT * FROM concern_templates WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Template create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update template (Admin only)
router.put('/:id', auth, requireRole('admin'), async (req, res) => {
  const { category, priority, quick_title, template_body } = req.body;
  
  try {
    const [existing] = await pool.query('SELECT id FROM concern_templates WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Template not found' });

    const fields = [];
    const values = [];

    if (category)      { fields.push('category = ?');      values.push(category); }
    if (priority)      { fields.push('priority = ?');      values.push(priority); }
    if (quick_title)   { fields.push('quick_title = ?');   values.push(quick_title); }
    if (template_body) { fields.push('template_body = ?'); values.push(template_body); }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.params.id);

    await pool.query(`UPDATE concern_templates SET ${fields.join(', ')} WHERE id = ?`, values);
    
    const [rows] = await pool.query('SELECT * FROM concern_templates WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Template update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete template (Admin only)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM concern_templates WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Template not found' });

    await pool.query('DELETE FROM concern_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Template delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
