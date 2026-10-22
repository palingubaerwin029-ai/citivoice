const {
  selectAllBarangays,
  selectBarangayById,
  insertBarangay,
  updateBarangay,
  deleteBarangay,
  selectConcernsByBarangay,
} = require('../models/barangay.model');
const { invalidate } = require('../middleware/cache');

const listBarangays = async (req, res) => {
  try {
    const rows = await selectAllBarangays();
    res.json(rows);
  } catch (err) {
    console.error('Barangays list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createBarangay = async (req, res) => {
  const { name } = req.body;
  try {
    const insertId = await insertBarangay(name.trim());
    invalidate('barangays');
    const newBarangay = await selectBarangayById(insertId);
    res.status(201).json(newBarangay);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'This barangay already exists' });
    }
    console.error('Barangay create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const editBarangay = async (req, res) => {
  const { name } = req.body;
  try {
    await updateBarangay(req.params.id, name.trim());
    invalidate('barangays');
    const updatedBarangay = await selectBarangayById(req.params.id);
    res.json(updatedBarangay);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'This barangay already exists' });
    }
    console.error('Barangay update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeBarangay = async (req, res) => {
  try {
    await deleteBarangay(req.params.id);
    invalidate('barangays');
    res.json({ success: true });
  } catch (err) {
    console.error('Barangay delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getBarangayConcerns = async (req, res) => {
  try {
    const barangay = await selectBarangayById(req.params.id);
    if (!barangay) {
      return res.status(404).json({ error: 'Barangay not found' });
    }
    const concerns = await selectConcernsByBarangay(barangay.name);
    res.json({
      barangay,
      concerns,
      total: concerns.length,
    });
  } catch (err) {
    console.error('Barangay concerns error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  listBarangays,
  createBarangay,
  editBarangay,
  removeBarangay,
  getBarangayConcerns,
};
