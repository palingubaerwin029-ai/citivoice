const pool = require('../db');

const selectAllConcerns = async () => {
  const [rows] = await pool.query('SELECT * FROM concerns ORDER BY created_at DESC');
  return rows;
};

const selectConcernById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM concerns WHERE id = ?', [id]);
  return rows[0];
};

const checkUpvote = async (concernId, userId) => {
  const [rows] = await pool.query(
    'SELECT id FROM concern_upvotes WHERE concern_id=? AND user_id=?',
    [concernId, userId]
  );
  return rows.length > 0;
};

const insertConcern = async (data) => {
  const {
    title, description, category, priority, image_url,
    location_address, location_lat, location_lng,
    user_id, user_name, user_barangay
  } = data;
  const [result] = await pool.query(
    `INSERT INTO concerns
       (title, description, category, priority, status, image_url,
        location_address, location_lat, location_lng,
        user_id, user_name, user_barangay, admin_note, upvotes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, NULL, 0, NOW(), NOW())`,
    [
      title, description, category, priority || 'Medium', image_url,
      location_address || null, location_lat || null, location_lng || null,
      user_id, user_name || null, user_barangay || null,
    ]
  );
  return result.insertId;
};

const selectConcernWithUser = async (id) => {
  const [existing] = await pool.query(`
    SELECT c.user_id, c.title, c.status, u.name, u.email, u.phone 
    FROM concerns c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `, [id]);
  return existing[0];
};

const updateConcernFields = async (id, fields, values) => {
  await pool.query(`UPDATE concerns SET ${fields.join(', ')} WHERE id = ?`, values);
};

const selectConcernImageUrl = async (id) => {
  const [rows] = await pool.query('SELECT image_url FROM concerns WHERE id = ?', [id]);
  return rows[0]?.image_url;
};

const deleteConcernAndUpvotes = async (id) => {
  await pool.query('DELETE FROM concern_upvotes WHERE concern_id = ?', [id]);
  await pool.query('DELETE FROM concerns WHERE id = ?', [id]);
};

const removeUpvote = async (concernId, userId) => {
  await pool.query('DELETE FROM concern_upvotes WHERE concern_id = ? AND user_id = ?', [concernId, userId]);
  await pool.query('UPDATE concerns SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = ?', [concernId]);
};

const addUpvote = async (concernId, userId) => {
  await pool.query('INSERT INTO concern_upvotes (concern_id, user_id) VALUES (?, ?)', [concernId, userId]);
  await pool.query('UPDATE concerns SET upvotes = upvotes + 1 WHERE id = ?', [concernId]);
};

// Also adding insertNotification here temporarily or we can create notification model. 
// Let's create it in notification.model.js when we get there. We'll use a direct query here or create notification model now.
const insertNotification = async (userId, title, message) => {
  await pool.query(
    'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
    [userId, title, message]
  );
};

module.exports = {
  selectAllConcerns,
  selectConcernById,
  checkUpvote,
  insertConcern,
  selectConcernWithUser,
  updateConcernFields,
  selectConcernImageUrl,
  deleteConcernAndUpvotes,
  removeUpvote,
  addUpvote,
  insertNotification
};
