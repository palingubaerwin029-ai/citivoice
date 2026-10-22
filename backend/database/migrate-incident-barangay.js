const pool = require('../db');
const { getIncidentBarangay } = require('../utils/barangayGeo');
require('dotenv').config();

async function run() {
  const conn = pool;
  console.log('Connected to database via pool.');

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

  await pool.end();
  console.log('Migration successfully finished!');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
