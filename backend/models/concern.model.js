const pool = require('../db');

const selectAllConcerns = async (limit = 20, offset = 0, userId = null, status = null, category = null) => {
  let query = 'SELECT * FROM concerns WHERE 1=1';
  const params = [];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  return rows;
};

const countConcerns = async (userId = null, status = null, category = null) => {
  let query = 'SELECT COUNT(*) as total FROM concerns WHERE 1=1';
  const params = [];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }
  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }
  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].total;
};

const selectMapConcerns = async () => {
  // Only lightweight data for map markers (supporting both raw column names and aliases)
  const [rows] = await pool.query(
    'SELECT id, title, location_lat, location_lng, location_lat as lat, location_lng as lng, status, category FROM concerns WHERE location_lat IS NOT NULL'
  );
  return rows;
};

const selectConcernById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM concerns WHERE id = ?', [id]);
  return rows[0];
};

const checkUpvote = async (concernId, userId) => {
  const [rows] = await pool.query(
    'SELECT id FROM concern_upvotes WHERE concern_id=? AND user_id=?',
    [concernId, userId],
  );
  return rows.length > 0;
};

const insertConcern = async (data) => {
  const {
    title,
    description,
    category,
    priority,
    image_url,
    location_address,
    location_lat,
    location_lng,
    user_id,
    user_name,
    user_barangay,
    department,
  } = data;
  const [result] = await pool.query(
    `INSERT INTO concerns
       (title, description, category, priority, status, image_url,
        location_address, location_lat, location_lng,
        user_id, user_name, user_barangay, admin_note, upvotes,
        department,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, NOW(), NOW())`,
    [
      title,
      description,
      category,
      priority || 'Medium',
      image_url,
      location_address || null,
      location_lat || null,
      location_lng || null,
      user_id,
      user_name || null,
      user_barangay || null,
      department || null,
    ],
  );
  return result.insertId;
};

const selectConcernWithUser = async (id) => {
  const [existing] = await pool.query(
    `
    SELECT c.user_id, c.title, c.status, u.name, u.email, u.phone 
    FROM concerns c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `,
    [id],
  );
  return existing[0];
};

const updateConcernFields = async (id, fields, values) => {
  await pool.query(`UPDATE concerns SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
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
  await pool.query('DELETE FROM concern_upvotes WHERE concern_id = ? AND user_id = ?', [
    concernId,
    userId,
  ]);
  await pool.query('UPDATE concerns SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = ?', [
    concernId,
  ]);
};

const addUpvote = async (concernId, userId) => {
  await pool.query('INSERT INTO concern_upvotes (concern_id, user_id) VALUES (?, ?)', [
    concernId,
    userId,
  ]);
  await pool.query('UPDATE concerns SET upvotes = upvotes + 1 WHERE id = ?', [concernId]);
};

// Also adding insertNotification here temporarily or we can create notification model.
// Let's create it in notification.model.js when we get there. We'll use a direct query here or create notification model now.
const insertNotification = async (userId, title, message) => {
  await pool.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [
    userId,
    title,
    message,
  ]);
};

// ─── AI Feature: Concern Links (duplicate/similar tracking) ─────────────────

const insertConcernLink = async (sourceId, targetId, linkType, similarityScore) => {
  try {
    await pool.query(
      `INSERT INTO concern_links (source_concern_id, target_concern_id, link_type, similarity_score)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE link_type = VALUES(link_type), similarity_score = VALUES(similarity_score)`,
      [sourceId, targetId, linkType, similarityScore],
    );
  } catch (err) {
    // Silently ignore if table doesn't exist yet (migration not run)
    if (err.code === 'ER_NO_SUCH_TABLE') return;
    throw err;
  }
};

const selectLinkedConcerns = async (concernId) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT c.id, c.title, c.status, c.category, c.priority, c.user_barangay, c.user_id, c.admin_note, c.department, c.created_at,
             cl.link_type, cl.similarity_score
      FROM concern_links cl
      JOIN concerns c ON (
        CASE WHEN cl.source_concern_id = ? THEN cl.target_concern_id ELSE cl.source_concern_id END
      ) = c.id
      WHERE cl.source_concern_id = ? OR cl.target_concern_id = ?
      ORDER BY cl.similarity_score DESC
    `,
      [concernId, concernId, concernId],
    );
    return rows;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') return [];
    throw err;
  }
};

module.exports = {
  selectAllConcerns,
  countConcerns,
  selectMapConcerns,
  selectConcernById,
  checkUpvote,
  insertConcern,
  selectConcernWithUser,
  updateConcernFields,
  selectConcernImageUrl,
  deleteConcernAndUpvotes,
  removeUpvote,
  addUpvote,
  insertNotification,
  insertConcernLink,
  selectLinkedConcerns,
};
