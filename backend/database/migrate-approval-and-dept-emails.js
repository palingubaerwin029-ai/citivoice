/**
 * Migration: Add email & contact_phone to departments table
 * and add approval metadata to concerns table.
 *
 * Run: node backend/database/migrate-approval-and-dept-emails.js
 */

require('dotenv').config();
const pool = require('../db');

const DEPARTMENT_EMAILS = [
  { name: "City Engineer's Office (CEO)", category: 'Road & Infrastructure', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2002', description: "Maintains public drainages, clears major blockages, repairs broken culverts, and builds new drainage systems along city-owned roads." },
  { name: 'City Environment and Natural Resources Office (CENRO)', category: 'Waste & Sanitation', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2005', description: 'Manages garbage collection schedules, operates the city\'s sanitary landfill, and enforces anti-littering and waste segregation ordinances.' },
  { name: 'Negros Occidental Electric Cooperative (NOCECO)', category: 'Electricity', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2003', description: 'Distributes electricity, manages power outages, repairs broken electric poles, handles meter connections, and processes your monthly bill.' },
];

async function migrate() {
  try {
    console.log('[Migration] Updating database for department approval emails & workflow...');

    // 1. Add email column to departments table
    const [deptEmailCols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'email'`
    );
    if (deptEmailCols.length === 0) {
      await pool.query('ALTER TABLE departments ADD COLUMN email VARCHAR(255) DEFAULT NULL AFTER category');
      console.log('[Migration] ✅ Added `email` column to `departments` table.');
    }

    // 2. Add contact_phone column to departments table
    const [deptPhoneCols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'contact_phone'`
    );
    if (deptPhoneCols.length === 0) {
      await pool.query('ALTER TABLE departments ADD COLUMN contact_phone VARCHAR(50) DEFAULT NULL AFTER email');
      console.log('[Migration] ✅ Added `contact_phone` column to `departments` table.');
    }

    // 3. Add approval fields to concerns table
    const [approvalNotesCol] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'concerns' AND COLUMN_NAME = 'approval_notes'`
    );
    if (approvalNotesCol.length === 0) {
      await pool.query('ALTER TABLE concerns ADD COLUMN approval_notes TEXT DEFAULT NULL AFTER admin_note');
      await pool.query('ALTER TABLE concerns ADD COLUMN approved_by_name VARCHAR(255) DEFAULT NULL AFTER approval_notes');
      await pool.query('ALTER TABLE concerns ADD COLUMN approved_at DATETIME DEFAULT NULL AFTER approved_by_name');
      console.log('[Migration] ✅ Added approval tracking columns to `concerns` table.');
    }

    // 3b. Add resolved_image_url to concerns table if missing
    const [resolvedImgCol] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'concerns' AND COLUMN_NAME = 'resolved_image_url'`
    );
    if (resolvedImgCol.length === 0) {
      await pool.query('ALTER TABLE concerns ADD COLUMN resolved_image_url TEXT DEFAULT NULL AFTER image_url');
      console.log('[Migration] ✅ Added `resolved_image_url` column to `concerns` table.');
    }

    // 4. Add target_department to concern_comments table for inter-department communications
    const [targetDeptCol] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'concern_comments' AND COLUMN_NAME = 'target_department'`
    );
    if (targetDeptCol.length === 0) {
      await pool.query('ALTER TABLE concern_comments ADD COLUMN target_department VARCHAR(100) DEFAULT NULL AFTER is_internal');
      console.log('[Migration] ✅ Added `target_department` column to `concern_comments` table.');
    }

    // 5. Seed / update departments & delete obsolete ones
    const validNames = DEPARTMENT_EMAILS.map((d) => d.name);
    await pool.query('DELETE FROM departments WHERE name NOT IN (?)', [validNames]);
    console.log('[Migration] 🧹 Cleaned up obsolete departments.');

    for (const d of DEPARTMENT_EMAILS) {
      const [existing] = await pool.query('SELECT id FROM departments WHERE LOWER(name) = LOWER(?)', [d.name]);
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO departments (name, category, email, contact_phone, description) VALUES (?, ?, ?, ?, ?)',
          [d.name, d.category, d.email, d.contact_phone, d.description]
        );
        console.log(`[Migration] ➕ Created department: ${d.name}`);
      } else {
        await pool.query(
          'UPDATE departments SET email = ?, contact_phone = ?, category = ?, description = ? WHERE id = ?',
          [d.email, d.contact_phone, d.category, d.description, existing[0].id]
        );
        console.log(`[Migration] 🔄 Updated department details: ${d.name}`);
      }
    }

    console.log('\n[Migration] Migration completed successfully! 🎉');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] ❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
