const pool = require('../db');

const selectAllDepartments = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM concern_assignments ca 
         WHERE ca.department LIKE CONCAT(d.name, '%') AND ca.status != 'completed') as active_assignments_count
      FROM departments d 
      ORDER BY d.name ASC
    `);
    return rows;
  } catch (err) {
    console.error('Error fetching all departments:', err);
    throw err;
  }
};

const selectDepartmentById = async (id) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
    return rows[0];
  } catch (err) {
    console.error('Error fetching department by id:', err);
    throw err;
  }
};

const selectDepartmentByName = async (name) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments WHERE LOWER(name) = LOWER(?)', [name]);
    return rows[0];
  } catch (err) {
    console.error('Error fetching department by name:', err);
    throw err;
  }
};

const selectDepartmentByCategory = async (category) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departments WHERE category = ?', [category]);
    return rows[0];
  } catch (err) {
    console.error('Error fetching department by category:', err);
    throw err;
  }
};

const insertDepartment = async (data) => {
  const { name, category, description, email, contact_phone } = data;
  try {
    const [result] = await pool.query(
      'INSERT INTO departments (name, category, description, email, contact_phone) VALUES (?, ?, ?, ?, ?)',
      [name, category || null, description || null, email || null, contact_phone || null]
    );
    return result.insertId;
  } catch (err) {
    console.error('Error inserting department:', err);
    throw err;
  }
};

const updateDepartment = async (id, data) => {
  const { name, category, description, email, contact_phone } = data;
  try {
    await pool.query(
      'UPDATE departments SET name = ?, category = ?, description = ?, email = ?, contact_phone = ? WHERE id = ?',
      [name, category || null, description || null, email || null, contact_phone || null, id]
    );
  } catch (err) {
    console.error('Error updating department:', err);
    throw err;
  }
};

const deleteDepartment = async (id) => {
  try {
    await pool.query('DELETE FROM departments WHERE id = ?', [id]);
  } catch (err) {
    console.error('Error deleting department:', err);
    throw err;
  }
};

module.exports = {
  selectAllDepartments,
  selectDepartmentById,
  selectDepartmentByName,
  selectDepartmentByCategory,
  insertDepartment,
  updateDepartment,
  deleteDepartment,
};
