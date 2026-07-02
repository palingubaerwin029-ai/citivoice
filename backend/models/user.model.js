const pool = require('../db');

const selectByEmail = async (email) => {
  try {
    const [row] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return row[0];
  } catch (err) {
    console.error('Error fetching user by email:', err);
    throw err;
  }
};

const selectByName = async (name) => {
  try {
    const [row] = await pool.query('SELECT id FROM users WHERE LOWER(name) = LOWER(?)', [name]);
    return row[0];
  } catch (err) {
    console.error('Error fetching user by name:', err);
    throw err;
  }
};

const selectByPhone = async (phone) => {
  try {
    const [row] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
    return row[0];
  } catch (err) {
    console.error('Error fetching user by phone:', err);
    throw err;
  }
};

const selectById = async (id) => {
  try {
    const [row] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return row[0];
  } catch (err) {
    console.error('Error fetching user by id:', err);
    throw err;
  }
};

const insertUser = async (name, email, hash, phone, barangay, idType, idNumber, idImageUrl) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, barangay, role, verification_status, is_verified, id_type, id_number, id_image_url, submitted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'citizen', 'pending', 0, ?, ?, ?, NOW(), NOW(), NOW())`,
      [name, email, hash, phone || null, barangay || null, idType, idNumber, idImageUrl],
    );
    return result.insertId;
  } catch (err) {
    console.error('Error inserting user:', err);
    throw err;
  }
};

const selectAllCitizens = async (limit = 20, offset = 0, search = '', barangay = '', status = '') => {
  let query = `
    SELECT u.*, 
      (SELECT COUNT(*) FROM concerns c WHERE c.user_id = u.id) as reports_count,
      (SELECT COUNT(*) FROM concerns c WHERE c.user_id = u.id AND c.status = 'Resolved') as resolved_count
    FROM users u 
    WHERE u.role = 'citizen'
  `;
  const params = [];

  if (search) {
    query += " AND (u.name LIKE ? OR u.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (barangay && barangay !== 'All') {
    query += " AND u.barangay = ?";
    params.push(barangay);
  }
  if (status) {
    query += " AND u.verification_status = ?";
    params.push(status);
  }

  query += " ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await pool.query(query, params);
  return rows;
};

const countCitizens = async (search = '', barangay = '', status = '') => {
  let query = "SELECT COUNT(*) as total FROM users u WHERE u.role = 'citizen'";
  const params = [];

  if (search) {
    query += " AND (u.name LIKE ? OR u.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (barangay && barangay !== 'All') {
    query += " AND u.barangay = ?";
    params.push(barangay);
  }
  if (status) {
    query += " AND u.verification_status = ?";
    params.push(status);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].total;
};

const checkExistingIdNumber = async (idNumber, excludeId) => {
  const [rows] = await pool.query('SELECT id FROM users WHERE id_number = ? AND id != ?', [
    idNumber,
    excludeId,
  ]);
  return rows.length > 0;
};

const updateUserDetails = async (
  id,
  name,
  phone,
  barangay,
  id_type,
  id_number,
  id_image_url,
  submitted_at,
) => {
  await pool.query(
    `UPDATE users SET
      name                = COALESCE(?, name),
      phone               = COALESCE(?, phone),
      barangay            = COALESCE(?, barangay),
      id_type             = COALESCE(?, id_type),
      id_number           = COALESCE(?, id_number),
      id_image_url        = COALESCE(?, id_image_url),
      submitted_at        = COALESCE(?, submitted_at),
      updated_at          = NOW()
     WHERE id = ?`,
    [name, phone, barangay, id_type, id_number, id_image_url, submitted_at, id],
  );
};

const updateUserVerification = async (id, status, isVerified, rejectionReason, verifiedAtStr) => {
  await pool.query(
    `UPDATE users SET verification_status=?, is_verified=?,
     rejection_reason=?, verified_at=${verifiedAtStr}, updated_at=NOW() WHERE id=?`,
    [status, isVerified, rejectionReason, id],
  );
};

const selectUserContactInfo = async (id) => {
  const [rows] = await pool.query('SELECT name, email, phone FROM users WHERE id = ?', [id]);
  return rows[0];
};

const updateUserFcmToken = async (id, fcmToken) => {
  await pool.query('UPDATE users SET fcm_token=?, updated_at=NOW() WHERE id=?', [fcmToken, id]);
};

const deleteUser = async (id) => {
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
};

// ── Password Reset OTP helpers ────────────────────────────────────────────────
const updateResetOtp = async (email, hashedOtp, expiresAt) => {
  await pool.query(
    'UPDATE users SET reset_otp = ?, reset_otp_expires = ?, updated_at = NOW() WHERE email = ?',
    [hashedOtp, expiresAt, email],
  );
};

const clearResetOtp = async (email) => {
  await pool.query(
    'UPDATE users SET reset_otp = NULL, reset_otp_expires = NULL, updated_at = NOW() WHERE email = ?',
    [email],
  );
};

const updatePasswordByEmail = async (email, newHash) => {
  await pool.query(
    'UPDATE users SET password_hash = ?, reset_otp = NULL, reset_otp_expires = NULL, updated_at = NOW() WHERE email = ?',
    [newHash, email],
  );
};

// ── Profile Picture ───────────────────────────────────────────────────────────
const updateUserAvatar = async (id, avatarUrl) => {
  await pool.query('UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?', [
    avatarUrl,
    id,
  ]);
};

/**
 * Find admin users belonging to a specific department, ordered by fewest
 * active (non-completed) assignments for round-robin load balancing.
 * @param {string} departmentName - The department name to match (e.g., "City Engineering Office")
 * @returns {Promise<Array>} Admin users sorted by least active assignments
 */
const selectAdminsByDepartment = async (departmentName) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.fcm_token, u.department,
        (SELECT COUNT(*) FROM concern_assignments ca 
         WHERE ca.assigned_to = u.id AND ca.status NOT IN ('completed')) as active_assignments
       FROM users u
       WHERE u.role = 'admin' AND u.department = ?
       ORDER BY active_assignments ASC`,
      [departmentName]
    );
    return rows;
  } catch (err) {
    console.error('Error fetching admins by department:', err);
    throw err;
  }
};

module.exports = {
  selectByEmail,
  selectByName,
  selectByPhone,
  selectById,
  insertUser,
  selectAllCitizens,
  countCitizens,
  checkExistingIdNumber,
  updateUserDetails,
  updateUserVerification,
  selectUserContactInfo,
  updateUserFcmToken,
  deleteUser,
  updateResetOtp,
  clearResetOtp,
  updatePasswordByEmail,
  updateUserAvatar,
  selectAdminsByDepartment,
};
