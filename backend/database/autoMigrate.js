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

    // 2. Ensure users.reset_otp exists
    const [otpCols] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_otp'");
    if (otpCols.length === 0) {
      console.log('➕ [AutoMigrate] Adding users.reset_otp columns...');
      await pool.query('ALTER TABLE users ADD COLUMN reset_otp VARCHAR(10) DEFAULT NULL AFTER verification_id_image, ADD COLUMN reset_otp_expires DATETIME DEFAULT NULL AFTER reset_otp');
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
  } catch (err) {
    console.warn('⚠️ [AutoMigrate] Schema sync notice:', err.message);
  }
};

module.exports = autoMigrate;
