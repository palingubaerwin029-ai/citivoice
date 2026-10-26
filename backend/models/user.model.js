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
    const status = idImageUrl ? 'pending' : 'unverified';
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, barangay, role, verification_status, is_verified, id_type, id_number, id_image_url, submitted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'citizen', ?, 0, ?, ?, ?, NOW(), NOW(), NOW())`,
      [name, email, hash, phone || null, barangay || null, status, idType || null, idNumber || null, idImageUrl || null],
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
  address,
) => {
  await pool.query(
    `UPDATE users SET
      name                = COALESCE(?, name),
      phone               = COALESCE(?, phone),
      barangay            = COALESCE(?, barangay),
      address             = COALESCE(?, address),
      id_type             = COALESCE(?, id_type),
      id_number           = COALESCE(?, id_number),
      id_image_url        = COALESCE(?, id_image_url),
      submitted_at        = COALESCE(?, submitted_at),
      updated_at          = NOW()
     WHERE id = ?`,
    [name, phone, barangay, address, id_type, id_number, id_image_url, submitted_at, id],
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

// ── Pre-registration Email Verification helpers ──────────────────────────────
let emailVerificationsTableReady = false;
const ensureEmailVerificationsTable = async () => {
  if (emailVerificationsTableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      email       VARCHAR(255) PRIMARY KEY,
      otp_hash    VARCHAR(255) NOT NULL,
      expires_at  DATETIME     NOT NULL,
      is_verified TINYINT(1)   DEFAULT 0,
      created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  emailVerificationsTableReady = true;
};

const upsertRegistrationOtp = async (email, hashedOtp, expiresAt) => {
  await ensureEmailVerificationsTable();
  await pool.query(
    `INSERT INTO email_verifications (email, otp_hash, expires_at, is_verified, updated_at)
     VALUES (?, ?, ?, 0, NOW())
     ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), is_verified = 0, updated_at = NOW()`,
    [email.toLowerCase(), hashedOtp, expiresAt],
  );
};

const getRegistrationOtp = async (email) => {
  await ensureEmailVerificationsTable();
  const [rows] = await pool.query('SELECT * FROM email_verifications WHERE email = ?', [email.toLowerCase()]);
  return rows[0] || null;
};

const markRegistrationEmailVerified = async (email) => {
  await ensureEmailVerificationsTable();
  await pool.query('UPDATE email_verifications SET is_verified = 1, updated_at = NOW() WHERE email = ?', [email.toLowerCase()]);
};

const deleteRegistrationOtp = async (email) => {
  await ensureEmailVerificationsTable();
  await pool.query('DELETE FROM email_verifications WHERE email = ?', [email.toLowerCase()]);
};

// ── Admin 2FA Email OTP helpers ──────────────────────────────────────────────
let admin2FATableReady = false;
const ensureAdmin2FATable = async () => {
  if (admin2FATableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_2fa_codes (
      user_id    INT PRIMARY KEY,
      otp_hash   VARCHAR(255) NOT NULL,
      expires_at DATETIME     NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  admin2FATableReady = true;
};

const upsertAdmin2FA = async (userId, hashedOtp, expiresAt) => {
  await ensureAdmin2FATable();
  await pool.query(
    `INSERT INTO admin_2fa_codes (user_id, otp_hash, expires_at, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE otp_hash = VALUES(otp_hash), expires_at = VALUES(expires_at), updated_at = NOW()`,
    [userId, hashedOtp, expiresAt],
  );
};

const getAdmin2FA = async (userId) => {
  await ensureAdmin2FATable();
  const [rows] = await pool.query('SELECT * FROM admin_2fa_codes WHERE user_id = ?', [userId]);
  return rows[0] || null;
};

const deleteAdmin2FA = async (userId) => {
  await ensureAdmin2FATable();
  await pool.query('DELETE FROM admin_2fa_codes WHERE user_id = ?', [userId]);
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
  upsertRegistrationOtp,
  getRegistrationOtp,
  markRegistrationEmailVerified,
  deleteRegistrationOtp,
  upsertAdmin2FA,
  getAdmin2FA,
  deleteAdmin2FA,
};

