/**
 * Migration: Add sla_paused_at column to concern_assignments table
 * This column tracks when the SLA timer was paused (when status changes to "In Progress").
 * When NULL, the SLA timer is running normally.
 */
const pool = require('../db');

const migrate = async () => {
  console.log('[Migration] Adding sla_paused_at column to concern_assignments...');
  try {
    await pool.query(`
      ALTER TABLE concern_assignments 
      ADD COLUMN IF NOT EXISTS sla_paused_at DATETIME DEFAULT NULL 
      AFTER sla_deadline
    `);
    console.log('[Migration] ✅ sla_paused_at column added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('[Migration] ⚠️ Column sla_paused_at already exists. Skipping.');
    } else {
      console.error('[Migration] ❌ Error:', err.message);
      throw err;
    }
  } finally {
    await pool.end();
  }
};

migrate();
