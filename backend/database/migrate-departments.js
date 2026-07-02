/**
 * Migration: Create and seed departments table
 * 
 * Run this once on an existing database:
 *   node database/migrate-departments.js
 */

require('dotenv').config();
const pool = require('../db');

const DEPARTMENTS = [
  { name: 'City Engineering Office', description: 'Handles road repairs, bridge maintenance, and other public infrastructure.' },
  { name: 'NOCECO / Electric Utility', description: 'Manages streetlights, electrical posts, power issues, and wiring concerns.' },
  { name: 'City Water District', description: 'Responsible for clean water supply, pipe bursts, and drainage/flooding systems.' },
  { name: 'City Sanitation Division', description: 'Coordinates garbage collection, waste management, and public sanitation.' },
  { name: 'PNP / Barangay Tanod', description: 'Enforces public order, traffic safety, and immediate emergency response.' },
  { name: 'City Admin Office', description: 'Administrative support, policy implementation, and general inquiries.' },
  { name: 'Barangay Hall', description: 'Local barangay affairs, community relations, and low-priority local concerns.' }
];

async function migrate() {
  try {
    console.log('[Migration] Checking departments table...');

    // 1. Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(255) NOT NULL UNIQUE,
        description TEXT         DEFAULT NULL,
        created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('[Migration] ✅ Table `departments` verified.');

    // 2. Seed departments
    for (const dept of DEPARTMENTS) {
      await pool.query(
        `INSERT INTO departments (name, description) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE description = VALUES(description), updated_at = NOW()`,
        [dept.name, dept.description]
      );
    }
    console.log('[Migration] ✅ Departments seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] ❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
