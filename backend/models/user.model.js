const pool = require('../db');

const selectByEmail = async (email) => {
  try {
    const [row] = await pool.query(
      'SELECT users.id, users.email, users.password_hash, users.role FROM users WHERE email = ?',
      [email],
    );
    return row[0];
  } catch (err) {
    console.error('Error fetching user by email:', err);
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

const insertUser = async (name, email, hash, phone, barangay) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, barangay, role, verification_status, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'citizen', 'unverified', 0, NOW(), NOW())`,
      [name, email, hash, phone || null, barangay || null],
    );
    return result.insertId;
  } catch (err) {
    console.error('Error inserting user:', err);
    throw err;
  }
};

const selectAllCitizens = async () => {
  const [rows] = await pool.query("SELECT * FROM users WHERE role = 'citizen' ORDER BY created_at DESC");
  return rows;
};

const checkExistingIdNumber = async (idNumber, excludeId) => {
  const [rows] = await pool.query('SELECT id FROM users WHERE id_number = ? AND id != ?', [idNumber, excludeId]);
  return rows.length > 0;
};

const updateUserDetails = async (id, name, phone, barangay, id_type, id_number, id_image_url, submitted_at) => {
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
    [name, phone, barangay, id_type, id_number, id_image_url, submitted_at, id]
  );
};

const updateUserVerification = async (id, status, isVerified, rejectionReason, verifiedAtStr) => {
  await pool.query(
    `UPDATE users SET verification_status=?, is_verified=?,
     rejection_reason=?, verified_at=${verifiedAtStr}, updated_at=NOW() WHERE id=?`,
    [status, isVerified, rejectionReason, id]
  );
};

const selectUserContactInfo = async (id) => {
  const [rows] = await pool.query('SELECT name, email, phone FROM users WHERE id = ?', [id]);
  return rows[0];
};

const updateUserFcmToken = async (id, fcmToken) => {
  await pool.query('UPDATE users SET fcm_token=?, updated_at=NOW() WHERE id=?', [fcmToken, id]);
};

module.exports = {
  selectByEmail,
  selectByPhone,
  selectById,
  insertUser,
  selectAllCitizens,
  checkExistingIdNumber,
  updateUserDetails,
  updateUserVerification,
  selectUserContactInfo,
  updateUserFcmToken
};
