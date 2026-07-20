/**
 * Migration: Add category column to departments table and seed data
 * 
 * Run this once on an existing database:
 *   node database/migrate-departments-crud.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'root',
  database: 'citivoice',
});

const DEPARTMENTS = [
  { name: "City Engineer's Office (CEO)", category: 'Road & Infrastructure', description: "Maintains public drainages, clears major blockages, repairs broken culverts, and builds new drainage systems along city-owned roads." },
  { name: 'City Environment and Natural Resources Office (CENRO)', category: 'Waste & Sanitation', description: 'Manages garbage collection schedules, operates the city\'s sanitary landfill, and enforces anti-littering and waste segregation ordinances.' },
  { name: 'Negros Occidental Electric Cooperative (NOCECO)', category: 'Electricity', description: 'Distributes electricity, manages power outages, repairs broken electric poles, handles meter connections, and processes your monthly bill.' },
];

async function migrate() {
  try {
    console.log('[Migration] Updating departments table structure...');

    // 1. Add category column if not exists
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'category'`
    );

    if (columns.length === 0) {
      await pool.query('ALTER TABLE departments ADD COLUMN category VARCHAR(100) DEFAULT NULL UNIQUE AFTER name');
      console.log('[Migration] ✅ Column `category` added to `departments` table.');
    } else {
      console.log('[Migration] ⏭️  Column `category` already exists. Skipping ALTER.');
    }

    // 2. Seed/Update departments
    for (const dept of DEPARTMENTS) {
      await pool.query(
        `INSERT INTO departments (name, category, description) VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE category = VALUES(category), description = VALUES(description), updated_at = NOW()`,
        [dept.name, dept.category, dept.description]
      );
    }
    console.log('[Migration] ✅ Seed/update of departments complete.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] ❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
