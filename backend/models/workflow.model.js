const pool = require('../db');

// ─── Concern Assignments ───
const insertAssignment = async (data) => {
  const { concern_id, assigned_to, assigned_by, department, sla_hours, sla_deadline, status } = data;
  const [result] = await pool.query(
    `INSERT INTO concern_assignments 
     (concern_id, assigned_to, assigned_by, department, sla_hours, sla_deadline, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [concern_id, assigned_to || null, assigned_by || null, department || null, sla_hours, sla_deadline, status || 'assigned']
  );
  return result.insertId;
};

const getAssignmentsByConcern = async (concernId) => {
  const [rows] = await pool.query(
    `SELECT ca.*, u.name as assignee_name, u.email as assignee_email 
     FROM concern_assignments ca
     LEFT JOIN users u ON ca.assigned_to = u.id
     WHERE ca.concern_id = ?
     ORDER BY ca.created_at DESC`,
    [concernId]
  );
  return rows;
};

const updateAssignmentStatus = async (id, status) => {
  await pool.query('UPDATE concern_assignments SET status = ? WHERE id = ?', [status, id]);
};

const getOverdueAssignments = async () => {
  const [rows] = await pool.query(
    `SELECT ca.*, c.title, c.priority 
     FROM concern_assignments ca
     JOIN concerns c ON ca.concern_id = c.id
     WHERE ca.status NOT IN ('completed', 'escalated') AND ca.sla_deadline < NOW()`
  );
  return rows;
};

// ─── Internal Comments ───
const insertComment = async (data) => {
  const { concern_id, user_id, user_name, comment, is_internal, target_department } = data;
  const [result] = await pool.query(
    `INSERT INTO concern_comments (concern_id, user_id, user_name, comment, is_internal, target_department) VALUES (?, ?, ?, ?, ?, ?)`,
    [concern_id, user_id, user_name, comment, is_internal === undefined ? true : is_internal, target_department || null]
  );
  return result.insertId;
};

const getCommentsByConcern = async (concernId) => {
  const [rows] = await pool.query(
    `SELECT * FROM concern_comments WHERE concern_id = ? ORDER BY created_at ASC`,
    [concernId]
  );
  return rows;
};

// ─── Audit Log ───
const insertAuditLog = async (data) => {
  const { entity_type, entity_id, action, changed_by, changed_by_name, old_value, new_value } = data;
  const [result] = await pool.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changed_by_name, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entity_type,
      entity_id,
      action,
      changed_by || null,
      changed_by_name || null,
      old_value ? JSON.stringify(old_value) : null,
      new_value ? JSON.stringify(new_value) : null
    ]
  );
  return result.insertId;
};

const getAuditLog = async (entityType, entityId) => {
  const [rows] = await pool.query(
    `SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return rows;
};

module.exports = {
  insertAssignment,
  getAssignmentsByConcern,
  updateAssignmentStatus,
  getOverdueAssignments,
  insertComment,
  getCommentsByConcern,
  insertAuditLog,
  getAuditLog
};
