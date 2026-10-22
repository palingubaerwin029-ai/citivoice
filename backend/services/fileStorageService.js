const fs = require('fs');
const path = require('path');
const pool = require('../db');

/**
 * Initializes the persistent file storage table in the database
 */
const initFileStorage = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_storage (
        filename VARCHAR(255) PRIMARY KEY,
        mimetype VARCHAR(100) NOT NULL,
        data LONGBLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('[FileStorage] Init error:', err);
  }
};

/**
 * Stores a file in the database so it survives server restarts and ephemeral disk resets
 */
const saveFileToDb = async (filename, mimetype, filePath) => {
  if (!filename || !filePath) return;
  try {
    if (!fs.existsSync(filePath)) return;
    const data = fs.readFileSync(filePath);
    await pool.query(
      `INSERT INTO file_storage (filename, mimetype, data) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE data = VALUES(data), mimetype = VALUES(mimetype)`,
      [filename, mimetype || 'image/jpeg', data]
    );
    console.log(`[FileStorage] Saved ${filename} to persistent cloud database (${data.length} bytes)`);
  } catch (err) {
    console.error(`[FileStorage] Failed to save ${filename} to database:`, err.message);
  }
};

/**
 * Retrieves a file from the database
 */
const getFileFromDb = async (filename) => {
  if (!filename) return null;
  try {
    const [rows] = await pool.query(
      'SELECT mimetype, data FROM file_storage WHERE filename = ?',
      [filename]
    );
    return rows[0] || null;
  } catch (err) {
    console.error(`[FileStorage] Failed to get ${filename} from database:`, err.message);
    return null;
  }
};

module.exports = {
  initFileStorage,
  saveFileToDb,
  getFileFromDb,
};
