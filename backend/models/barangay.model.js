const pool = require('../db');

const selectAllBarangays = async () => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, 
        (SELECT COUNT(*) FROM concerns c WHERE c.incident_barangay = b.name) AS concern_count
       FROM barangays b 
       ORDER BY b.name ASC`
    );
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

const selectConcernsByBarangay = async (barangayName) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.description, c.category, c.priority, c.status, 
              c.image_url, c.location_address, c.location_lat, c.location_lng,
              c.user_barangay, c.incident_barangay, c.created_at, c.updated_at,
              u.name AS citizen_name
       FROM concerns c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.incident_barangay = ?
       ORDER BY c.created_at DESC`,
      [barangayName]
    );
    return rows;
  } catch (err) {
    console.error('Error fetching concerns by barangay:', err);
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
  selectConcernsByBarangay,
  insertBarangay,
  updateBarangay,
  deleteBarangay,
};
