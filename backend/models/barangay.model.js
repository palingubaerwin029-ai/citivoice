const pool = require('../db');

const selectAllBarangays = async () => {
  try {
    const [rows] = await pool.query('SELECT * FROM barangays ORDER BY name ASC');
    return rows;
  } catch (err) {
    console.error('Error fetching all barangays:', err);
    throw err;
  }
};

const selectBarangayById = async (id) => {
  try {
    const [rows] = await pool.query('SELECT * FROM barangays WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    console.error('Error fetching barangay by id:', err);
    throw err;
  }
};

const insertBarangay = async (name) => {
  try {
    const [result] = await pool.query(
      'INSERT INTO barangays (name, created_at, updated_at) VALUES (?, NOW(), NOW())',
      [name],
    );
    return result.insertId;
  } catch (err) {
    console.error('Error inserting barangay:', err);
    throw err;
  }
};

const updateBarangay = async (id, name) => {
  try {
    const [result] = await pool.query('UPDATE barangays SET name=?, updated_at=NOW() WHERE id=?', [
      name,
      id,
    ]);
    return result.affectedRows;
  } catch (err) {
    console.error('Error updating barangay:', err);
    throw err;
  }
};

const deleteBarangay = async (id) => {
  try {
    const [result] = await pool.query('DELETE FROM barangays WHERE id = ?', [id]);
    return result.affectedRows;
  } catch (err) {
    console.error('Error deleting barangay:', err);
    throw err;
  }
};

module.exports = {
  selectAllBarangays,
  selectBarangayById,
  insertBarangay,
  updateBarangay,
  deleteBarangay,
};
