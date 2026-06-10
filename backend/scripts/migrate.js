const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'citivoice',
    multipleStatements: true,
  });

  try {
    console.log('🚀 Starting database update...');

    // 1. Drop old tables
    console.log('🗑️ Dropping deprecated tables (announcements, events)...');
    await connection.query('DROP TABLE IF EXISTS announcements; DROP TABLE IF EXISTS events;');

    // 2. Run new schema
    console.log('📄 Running updated schema.sql...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schema);

    console.log('✅ Database updated successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
