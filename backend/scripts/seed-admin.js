#!/usr/bin/env node
require('dotenv').config({ path: __dirname + '/../.env' });
const readline = require('readline');
const bcrypt   = require('bcryptjs');
const pool     = require('../db');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  try {
    console.log('\n🔧 CitiVoice — Admin Account Setup\n');

    const name     = (await ask('Admin name  [Admin]: ')) || 'Admin';
    const email    = (await ask('Admin email [admin@citivoice.gov.ph]: ')) || 'admin@citivoice.gov.ph';
    const password = await ask('Admin password (min 8 chars): ');

    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters.');
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 12);

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      await pool.query(
        'UPDATE users SET name = ?, password_hash = ?, role = ?, verification_status = ?, is_verified = 1, updated_at = NOW() WHERE email = ?',
        [name, hash, 'admin', 'verified', email]
      );
      console.log(`\n✅ Admin account updated: ${email}`);
    } else {
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role, verification_status, is_verified, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 'verified', 1, NOW(), NOW())`,
        [name, email, hash]
      );
      console.log(`\n✅ Admin account created: ${email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
