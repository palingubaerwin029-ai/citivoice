/**
 * migrate-sync-schema.js
 * Synchronizes the live database schema with the updated schema.sql:
 * - Drops legacy upvote artifacts (concerns.upvotes, concern_upvotes table)
 * - Ensures user columns exist: address, reset_otp, reset_otp_expires
 * - Ensures concern columns exist: is_validated, validated_at, validated_by_name
 * - Ensures recommended indexes exist
 */

const pool = require('../db');

const columnExists = async (table, column) => {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME 
     FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = ? 
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
};

const tableExists = async (table) => {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME 
     FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = ?`,
    [table]
  );
  return rows.length > 0;
};

const indexExists = async (table, indexName) => {
  const [rows] = await pool.query(
    `SELECT INDEX_NAME 
     FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = ? 
       AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return rows.length > 0;
};

const run = async () => {
  console.log('🔄 Starting schema sync on live database...');

  try {
    // 1. Drop concern_upvotes table
    if (await tableExists('concern_upvotes')) {
      console.log('🗑️  Dropping table concern_upvotes...');
      await pool.query('DROP TABLE IF EXISTS concern_upvotes');
      console.log('✅ Dropped table concern_upvotes');
    } else {
      console.log('ℹ️  Table concern_upvotes does not exist (already dropped).');
    }

    // 2. Drop upvotes column from concerns
    if (await columnExists('concerns', 'upvotes')) {
      console.log('🗑️  Dropping column upvotes from concerns...');
      await pool.query('ALTER TABLE concerns DROP COLUMN upvotes');
      console.log('✅ Dropped column upvotes from concerns');
    } else {
      console.log('ℹ️  Column concerns.upvotes does not exist (already dropped).');
    }

    // 3. Ensure users columns
    if (!(await columnExists('users', 'address'))) {
      console.log('➕ Adding users.address...');
      await pool.query('ALTER TABLE users ADD COLUMN address VARCHAR(255) DEFAULT NULL AFTER barangay');
      console.log('✅ Added users.address');
    }
    if (!(await columnExists('users', 'reset_otp'))) {
      console.log('➕ Adding users.reset_otp & reset_otp_expires...');
      await pool.query(`
        ALTER TABLE users 
          ADD COLUMN reset_otp VARCHAR(255) DEFAULT NULL AFTER rejection_reason,
          ADD COLUMN reset_otp_expires DATETIME DEFAULT NULL AFTER reset_otp
      `);
      console.log('✅ Added users.reset_otp');
    }

    // 4. Ensure concern columns
    if (!(await columnExists('concerns', 'admin_viewed_at'))) {
      console.log('➕ Adding concerns.admin_viewed_at...');
      await pool.query('ALTER TABLE concerns ADD COLUMN admin_viewed_at DATETIME DEFAULT NULL AFTER admin_note');
      console.log('✅ Added concerns.admin_viewed_at');
    }

    // 5. Recommended performance indexes
    const indexes = [
      { table: 'users', name: 'idx_users_role', sql: 'CREATE INDEX idx_users_role ON users(role)' },
      { table: 'users', name: 'idx_users_verification', sql: 'CREATE INDEX idx_users_verification ON users(verification_status)' },
      { table: 'users', name: 'idx_users_phone', sql: 'CREATE INDEX idx_users_phone ON users(phone)' },
      { table: 'concerns', name: 'idx_concerns_status', sql: 'CREATE INDEX idx_concerns_status ON concerns(status)' },
      { table: 'concerns', name: 'idx_concerns_category', sql: 'CREATE INDEX idx_concerns_category ON concerns(category)' },
      { table: 'concerns', name: 'idx_concerns_priority', sql: 'CREATE INDEX idx_concerns_priority ON concerns(priority)' },
      { table: 'concerns', name: 'idx_concerns_created_at', sql: 'CREATE INDEX idx_concerns_created_at ON concerns(created_at)' },
      { table: 'concerns', name: 'idx_concerns_department', sql: 'CREATE INDEX idx_concerns_department ON concerns(department)' },
      { table: 'concerns', name: 'idx_concerns_barangay', sql: 'CREATE INDEX idx_concerns_barangay ON concerns(user_barangay)' },
      { table: 'notifications', name: 'idx_notifications_user_read', sql: 'CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read)' },
      { table: 'concern_assignments', name: 'idx_assignments_status', sql: 'CREATE INDEX idx_assignments_status ON concern_assignments(status)' },
      { table: 'audit_log', name: 'idx_audit_entity', sql: 'CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id)' },
    ];

    for (const idx of indexes) {
      if (!(await indexExists(idx.table, idx.name))) {
        try {
          await pool.query(idx.sql);
          console.log(`✅ Created index ${idx.name} on ${idx.table}`);
        } catch (e) {
          console.warn(`⚠️  Could not create index ${idx.name}: ${e.message}`);
        }
      }
    }

    console.log('🎉 Schema sync completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Schema sync failed:', err);
    process.exit(1);
  }
};

run();
