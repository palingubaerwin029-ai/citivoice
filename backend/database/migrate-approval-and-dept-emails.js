/**
 * Migration: Add email & contact_phone to departments table
 * and add approval metadata to concerns table.
 *
 * Run: node backend/database/migrate-approval-and-dept-emails.js
 */

require('dotenv').config();
const pool = require('../db');

const DEPARTMENT_EMAILS = [
  { name: "City Mayor's Office", category: 'Executive Approval', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2001', description: "City Mayor's Executive Office for high-priority concern approvals and official directives." },
  { name: 'City Engineering Office', category: 'Road & Infrastructure', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2002', description: 'Handles road repairs, bridge maintenance, and other public infrastructure.' },
  { name: 'NOCECO / Electric Utility', category: 'Electricity', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2003', description: 'Manages streetlights, electrical posts, power issues, and wiring concerns.' },
  { name: 'City Water District', category: 'Water & Drainage', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2004', description: 'Responsible for clean water supply, pipe bursts, and drainage/flooding systems.' },
  { name: 'City Sanitation Division', category: 'Waste & Sanitation', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2005', description: 'Coordinates garbage collection, waste management, and public sanitation.' },
  { name: 'PNP / Barangay Tanod', category: 'Public Safety', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2006', description: 'Enforces public order, traffic safety, and immediate emergency response.' },
  { name: 'City Admin Office', category: 'Other', email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2000', description: 'Administrative support, policy implementation, and general inquiries.' },
  { name: 'Barangay Hall', category: null, email: 'palingubaerwin029@gmail.com', contact_phone: '(053) 471-2007', description: 'Local barangay affairs, community relations, and low-priority local concerns.' }
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

    // 4. Add target_department to concern_comments table for inter-department communications
    const [targetDeptCol] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'concern_comments' AND COLUMN_NAME = 'target_department'`
    );
    if (targetDeptCol.length === 0) {
      await pool.query('ALTER TABLE concern_comments ADD COLUMN target_department VARCHAR(100) DEFAULT NULL AFTER is_internal');
      console.log('[Migration] ✅ Added `target_department` column to `concern_comments` table.');
    }

    // 5. Seed / update departments
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
          'UPDATE departments SET email = COALESCE(email, ?), contact_phone = COALESCE(contact_phone, ?), category = COALESCE(category, ?) WHERE id = ?',
          [d.email, d.contact_phone, d.category, existing[0].id]
        );
        console.log(`[Migration] 🔄 Updated department contact details: ${d.name}`);
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
