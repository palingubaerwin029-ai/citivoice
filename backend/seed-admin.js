const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function seedAdmin() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'citivoice',
    });

    const hash = await bcrypt.hash('admin123', 10);
    const email = 'admin@citivoice.gov.ph';

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, verification_status, is_verified) 
       VALUES (?, ?, ?, 'admin', 'verified', 1)
       ON DUPLICATE KEY UPDATE password_hash = ?`,
      ['System Administrator', email, hash, hash]
    );

    console.log('✅ Admin user created: ' + email + ' / admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin user:', err);
    process.exit(1);
  }
}

seedAdmin();
