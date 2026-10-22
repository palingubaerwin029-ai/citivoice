const mysql = require('mysql2/promise');
const { getIncidentBarangay } = require('../utils/barangayGeo');
require('dotenv').config();

async function run() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306') === 3306 ? (host === 'localhost' ? 3307 : 3306) : parseInt(process.env.DB_PORT);
  const conn = await mysql.createConnection({
    host,
    port,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'citivoice',
  });

  console.log('Connected to database.');

  // Check if incident_barangay column exists
  const [cols] = await conn.query("SHOW COLUMNS FROM concerns LIKE 'incident_barangay'");
  if (cols.length === 0) {
    await conn.query('ALTER TABLE concerns ADD COLUMN incident_barangay VARCHAR(255) NULL AFTER user_barangay');
    console.log('Added column incident_barangay to concerns table.');
  }

  // Populate incident_barangay for all concerns based on coordinates/pinned location
  const [concerns] = await conn.query('SELECT id, location_lat, location_lng, location_address, user_barangay FROM concerns');
  for (const c of concerns) {
    const pinned = getIncidentBarangay(c);
    await conn.query('UPDATE concerns SET incident_barangay = ? WHERE id = ?', [pinned, c.id]);
    console.log(`Concern #${c.id} updated -> incident_barangay: "${pinned}"`);
  }

  // Ensure index exists
  try {
    await conn.query('CREATE INDEX idx_concerns_incident_barangay ON concerns(incident_barangay)');
    console.log('Created index idx_concerns_incident_barangay.');
  } catch (err) {
    // index already exists
  }

  await conn.end();
  console.log('Migration successfully finished!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
