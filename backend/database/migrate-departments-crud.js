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
  { name: 'City Engineering Office', category: 'Road & Infrastructure', description: 'Handles road repairs, bridge maintenance, and other public infrastructure.' },
  { name: 'NOCECO / Electric Utility', category: 'Electricity', description: 'Manages streetlights, electrical posts, power issues, and wiring concerns.' },
  { name: 'City Water District', category: 'Water & Drainage', description: 'Responsible for clean water supply, pipe bursts, and drainage/flooding systems.' },
  { name: 'City Sanitation Division', category: 'Waste & Sanitation', description: 'Coordinates garbage collection, waste management, and public sanitation.' },
  { name: 'PNP / Barangay Tanod', category: 'Public Safety', description: 'Enforces public order, traffic safety, and immediate emergency response.' },
  { name: 'City Admin Office', category: 'Other', description: 'Administrative support, policy implementation, and general inquiries.' },
  { name: 'Barangay Hall', category: null, description: 'Local barangay affairs, community relations, and low-priority local concerns.' }
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
