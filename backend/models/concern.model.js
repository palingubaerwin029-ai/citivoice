const pool = require('../db');
const { getIncidentBarangay } = require('../utils/barangayGeo');

const selectAllConcerns = async (
  limit = 20,
  offset = 0,
  userId = null,
  status = null,
  category = null,
  barangay = null,
  search = null
) => {
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
  if (barangay && barangay !== 'All') {
    query += ' AND (incident_barangay = ? OR (incident_barangay IS NULL AND user_barangay = ?))';
    params.push(barangay, barangay);
  }
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ' AND (title LIKE ? OR description LIKE ? OR user_name LIKE ? OR location_address LIKE ? OR incident_barangay LIKE ? OR user_barangay LIKE ?)';
    params.push(term, term, term, term, term, term);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  return rows;
};

const countConcerns = async (
  userId = null,
  status = null,
  category = null,
  barangay = null,
  search = null
) => {
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
  if (barangay && barangay !== 'All') {
    query += ' AND (incident_barangay = ? OR (incident_barangay IS NULL AND user_barangay = ?))';
    params.push(barangay, barangay);
  }
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ' AND (title LIKE ? OR description LIKE ? OR user_name LIKE ? OR location_address LIKE ? OR incident_barangay LIKE ? OR user_barangay LIKE ?)';
    params.push(term, term, term, term, term, term);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].total;
};

const selectConcernStats = async (userId = null) => {
  let query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN priority = 'High' AND status = 'Pending' THEN 1 ELSE 0 END) as urgent
    FROM concerns
  `;
  const params = [];
  if (userId) {
    query += ' WHERE user_id = ?';
    params.push(userId);
  }
  const [rows] = await pool.query(query, params);
  const r = rows[0] || {};
  return {
    total: Number(r.total || 0),
    pending: Number(r.pending || 0),
    inProgress: Number(r.inProgress || 0),
    resolved: Number(r.resolved || 0),
    rejected: Number(r.rejected || 0),
    urgent: Number(r.urgent || 0),
  };
};

const selectMapConcerns = async () => {
  // Data needed for map markers AND the bottom-sheet card when a marker is tapped
  const [rows] = await pool.query(
    `SELECT id, title, location_lat, location_lng, location_lat AS lat, location_lng AS lng,
            status, category, priority, image_url, location_address, user_barangay
     FROM concerns
     WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL`
  );
  return rows;
};

const selectConcernById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM concerns WHERE id = ?', [id]);
  return rows[0];
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
  const incident_barangay =
    data.incident_barangay ||
    getIncidentBarangay({
      location_address,
      location_lat,
      location_lng,
      user_barangay,
    });

  const status = data.status || 'Pending';
  const admin_note = data.admin_note || null;

  const [result] = await pool.query(
    `INSERT INTO concerns
       (title, description, category, priority, status, image_url,
        location_address, location_lat, location_lng,
        user_id, user_name, user_barangay, incident_barangay, admin_note,
        department,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      title,
      description,
      category,
      priority || 'Medium',
      status,
      image_url,
      location_address || null,
      location_lat || null,
      location_lng || null,
      user_id,
      user_name || null,
      user_barangay || null,
      incident_barangay || null,
      admin_note,
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

// Child rows (notifications, assignments, comments, links) go via ON DELETE CASCADE.
const deleteConcern = async (id) => {
  await pool.query('DELETE FROM concerns WHERE id = ?', [id]);
};

const insertNotification = async (userId, title, message, concernId = null) => {
  await pool.query(
    'INSERT INTO notifications (user_id, title, message, concern_id) VALUES (?, ?, ?, ?)',
    [userId, title, message, concernId || null]
  );
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
  selectConcernStats,
  selectMapConcerns,
  selectConcernById,
  insertConcern,
  selectConcernWithUser,
  updateConcernFields,
  selectConcernImageUrl,
  deleteConcern,
  insertNotification,
  insertConcernLink,
  selectLinkedConcerns,
};
