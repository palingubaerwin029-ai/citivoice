/**
 * Migration: Add department column to users table
 * 
 * Run this once on an existing database:
 *   node database/migrate-add-department.js
 * 
 * This adds a `department` column to the `users` table so admin users
 * can be associated with a specific city department for auto-assignment.
 */

require('dotenv').config();
const pool = require('../db');

const VALID_DEPARTMENTS = [
  'City Engineering Office',
  'NOCECO / Electric Utility',
  'City Water District',
  'City Sanitation Division',
  'PNP / Barangay Tanod',
  'City Admin Office',
  'Barangay Hall',
];

async function migrate() {
  try {
    console.log('[Migration] Adding department column to users table...');

    // Add column (IF NOT EXISTS is not supported for columns in MySQL, so we check first)
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'department'`
    );

    if (columns.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT NULL AFTER role');
      console.log('[Migration] ✅ Column `department` added to `users` table.');
    } else {
      console.log('[Migration] ⏭️  Column `department` already exists. Skipping.');
    }

    // Print valid departments for reference
    console.log('\n[Migration] Valid department values for admin users:');
    VALID_DEPARTMENTS.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
    console.log('\n[Migration] To assign a department to an admin, run:');
    console.log("  UPDATE users SET department = 'City Engineering Office' WHERE id = <admin_user_id>;");

    process.exit(0);
  } catch (err) {
    console.error('[Migration] ❌ Failed:', err.message);
    process.exit(1);
  }
}

migrate();
