#!/usr/bin/env node
require('dotenv').config({ path: __dirname + '/../.env' });
const bcrypt = require('bcryptjs');
const pool = require('../db');

(async () => {
  try {
    console.log('\n🏛️ Setting up Office of the Mayor account...\n');

    await pool.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'citizen', 'vice_mayor', 'mayor') NOT NULL DEFAULT 'citizen'"
    );

    const name = 'Office of the City Mayor';
    const email = 'mayor@kabankalancity.gov.ph';
    const password = 'Mayor2026!';
    const hash = await bcrypt.hash(password, 12);

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      await pool.query(
        'UPDATE users SET name = ?, password_hash = ?, role = ?, department = ?, verification_status = ?, is_verified = 1, updated_at = NOW() WHERE email = ?',
        [name, hash, 'mayor', 'Office of the City Mayor', 'verified', email]
      );
      console.log(`✅ Mayor account updated: ${email}`);
    } else {
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, department, verification_status, is_verified, created_at, updated_at)
         VALUES (?, ?, ?, 'mayor', 'Office of the City Mayor', 'verified', 1, NOW(), NOW())`,
        [name, email, hash]
      );
      console.log(`✅ Mayor account created: ${email}`);
    }

    console.log(`\nCredentials for Office of the Mayor:\n  Email: ${email}\n  Password: ${password}\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
})();
