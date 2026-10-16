#!/usr/bin/env node
require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../db');

(async () => {
  try {
    console.log('\n🔧 Adding admin validation fields to concerns table...\n');

    // Check if columns exist
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'concerns' AND COLUMN_NAME = 'is_validated'"
    );

    if (cols.length === 0) {
      await pool.query(`
        ALTER TABLE concerns
          ADD COLUMN is_validated TINYINT(1) NOT NULL DEFAULT 0 AFTER admin_note,
          ADD COLUMN validated_at DATETIME DEFAULT NULL AFTER is_validated,
          ADD COLUMN validated_by_name VARCHAR(255) DEFAULT NULL AFTER validated_at
      `);
      console.log('✅ Added is_validated, validated_at, validated_by_name columns');
    } else {
      console.log('ℹ️ Validation columns already exist');
    }

    // Set previously approved concerns as validated so archive stays intact
    await pool.query(`
      UPDATE concerns 
      SET is_validated = 1, 
          validated_at = COALESCE(approved_at, NOW()), 
          validated_by_name = 'System Administrator'
      WHERE approved_at IS NOT NULL AND is_validated = 0
    `);
    console.log('✅ Backfilled historical approved concerns with validation metadata');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
})();
