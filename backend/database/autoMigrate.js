const pool = require('../db');

/**
 * Automatically checks and applies required schema updates upon backend startup.
 * Ensures production databases (e.g. on Render) stay synchronized without manual SQL execution.
 */
const autoMigrate = async () => {
  try {
    // 1. Ensure concerns.admin_viewed_at exists
    const [viewedCols] = await pool.query("SHOW COLUMNS FROM concerns LIKE 'admin_viewed_at'");
    if (viewedCols.length === 0) {
      console.log('➕ [AutoMigrate] Adding concerns.admin_viewed_at...');
      await pool.query('ALTER TABLE concerns ADD COLUMN admin_viewed_at DATETIME DEFAULT NULL AFTER admin_note');
      await pool.query("UPDATE concerns SET admin_viewed_at = COALESCE(updated_at, created_at, NOW()) WHERE admin_viewed_at IS NULL AND (status != 'Pending' OR admin_note IS NOT NULL)");
      console.log('✅ [AutoMigrate] Added concerns.admin_viewed_at');
    }

    // 2. Ensure users.address exists
    const [addressCols] = await pool.query("SHOW COLUMNS FROM users LIKE 'address'");
    if (addressCols.length === 0) {
      console.log('➕ [AutoMigrate] Adding users.address...');
      await pool.query('ALTER TABLE users ADD COLUMN address VARCHAR(255) DEFAULT NULL AFTER barangay');
      console.log('✅ [AutoMigrate] Added users.address');
    }

    // 3. Ensure users.reset_otp exists
    const [otpCols] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_otp'");
    if (otpCols.length === 0) {
      console.log('➕ [AutoMigrate] Adding users.reset_otp columns...');
      await pool.query('ALTER TABLE users ADD COLUMN reset_otp VARCHAR(255) DEFAULT NULL, ADD COLUMN reset_otp_expires DATETIME DEFAULT NULL');
      console.log('✅ [AutoMigrate] Added users.reset_otp');
    }

    // 3. Ensure concerns validation columns exist
    const [validCols] = await pool.query("SHOW COLUMNS FROM concerns LIKE 'is_validated'");
    if (validCols.length === 0) {
      console.log('➕ [AutoMigrate] Adding concerns validation columns...');
      await pool.query('ALTER TABLE concerns ADD COLUMN is_validated TINYINT(1) DEFAULT 0 AFTER admin_note, ADD COLUMN validated_at DATETIME DEFAULT NULL AFTER is_validated, ADD COLUMN validated_by_name VARCHAR(255) DEFAULT NULL AFTER validated_at');
      console.log('✅ [AutoMigrate] Added concerns validation columns');
    }

    // 4. Ensure concern_comments.image_url exists
    const [commentImageCols] = await pool.query("SHOW COLUMNS FROM concern_comments LIKE 'image_url'");
    if (commentImageCols.length === 0) {
      console.log('➕ [AutoMigrate] Adding concern_comments.image_url...');
      await pool.query('ALTER TABLE concern_comments ADD COLUMN image_url VARCHAR(1000) DEFAULT NULL AFTER comment');
      console.log('✅ [AutoMigrate] Added concern_comments.image_url');
    }

    // 5. Ensure users.is_super_admin exists
    const [superAdminCols] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_super_admin'");
    if (superAdminCols.length === 0) {
      console.log('➕ [AutoMigrate] Adding users.is_super_admin...');
      await pool.query('ALTER TABLE users ADD COLUMN is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER role');
      console.log('✅ [AutoMigrate] Added users.is_super_admin');
    }

    // Ensure the primary/initial administrator has is_super_admin = 1
    const [superAdmins] = await pool.query("SELECT id FROM users WHERE role = 'admin' AND is_super_admin = 1");
    if (superAdmins.length === 0) {
      await pool.query("UPDATE users SET is_super_admin = 1 WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
      console.log('✅ [AutoMigrate] Designated primary super administrator');
    }

    // 6. Ensure concern_edit_history table exists for citizen edits tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS concern_edit_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        concern_id INT NOT NULL,
        edited_by INT NOT NULL,
        edited_by_name VARCHAR(255) DEFAULT NULL,
        edited_by_role VARCHAR(50) DEFAULT 'citizen',
        old_title VARCHAR(500) DEFAULT NULL,
        new_title VARCHAR(500) DEFAULT NULL,
        old_description TEXT DEFAULT NULL,
        new_description TEXT DEFAULT NULL,
        old_category VARCHAR(100) DEFAULT NULL,
        new_category VARCHAR(100) DEFAULT NULL,
        old_location_address TEXT DEFAULT NULL,
        new_location_address TEXT DEFAULT NULL,
        old_image_url TEXT DEFAULT NULL,
        new_image_url TEXT DEFAULT NULL,
        change_summary TEXT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_edit_history_concern (concern_id, created_at),
        KEY fk_edit_history_user (edited_by),
        CONSTRAINT fk_edit_history_concern FOREIGN KEY (concern_id) REFERENCES concerns(id) ON DELETE CASCADE,
        CONSTRAINT fk_edit_history_user FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Ensure concerns edit tracking columns exist
    const [editCols] = await pool.query("SHOW COLUMNS FROM concerns LIKE 'edit_count'");
    if (editCols.length === 0) {
      console.log('➕ [AutoMigrate] Adding concerns.edit_count and last_edited_at...');
      await pool.query('ALTER TABLE concerns ADD COLUMN edit_count INT NOT NULL DEFAULT 0 AFTER admin_viewed_at, ADD COLUMN last_edited_at DATETIME DEFAULT NULL AFTER edit_count');
      console.log('✅ [AutoMigrate] Added concerns.edit_count and last_edited_at');
    }
  } catch (err) {
    console.warn('⚠️ [AutoMigrate] Schema sync notice:', err.message);
  }
};

module.exports = autoMigrate;
