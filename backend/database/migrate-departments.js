/**
 * Migration: Create and seed departments table
 * 
 * Run this once on an existing database:
 *   node database/migrate-departments.js
 */

require('dotenv').config();
const pool = require('../db');

const DEPARTMENTS = [
  { name: "City Engineer's Office (CEO)", description: "Maintains public drainages, clears major blockages, repairs broken culverts, and builds new drainage systems along city-owned roads." },
  { name: 'City Environment and Natural Resources Office (CENRO)', description: 'Manages garbage collection schedules, operates the city\'s sanitary landfill, and enforces anti-littering and waste segregation ordinances.' },
  { name: 'Negros Occidental Electric Cooperative (NOCECO)', description: 'Distributes electricity, manages power outages, repairs broken electric poles, handles meter connections, and processes your monthly bill.' },
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

    // 2. Cleanup obsolete & seed 3 official departments
    const validNames = DEPARTMENTS.map((d) => d.name);
    await pool.query('DELETE FROM departments WHERE name NOT IN (?)', [validNames]);

    for (const dept of DEPARTMENTS) {
      await pool.query(
        `INSERT INTO departments (name, description) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE description = VALUES(description), updated_at = NOW()`,
        [dept.name, dept.description]
      );
    }
    console.log('[Migration] ✅ Departments seeded & cleaned successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] ❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
