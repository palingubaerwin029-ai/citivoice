'use strict';

/**
 * backup.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller for the /api/backup endpoints (admin-only).
 */

const path = require('path');
const fs = require('fs');
const backup = require('../services/backupService');
const pool = require('../db');

// ── GET /api/backup — list all existing backup files ─────────────────────────
const listBackups = async (req, res) => {
  try {
    const files = backup.listBackups();
    res.json({ backups: files });
  } catch (err) {
    console.error('[Backup] List error:', err);
    res.status(500).json({ error: 'Failed to list backups' });
  }
};

// ── POST /api/backup/db — trigger a mysqldump now ────────────────────────────
const triggerDbBackup = async (req, res) => {
  try {
    const result = await backup.runMysqldump();
    res.json({ success: true, backup: { file: result.file, size: result.size, type: 'sql' } });
  } catch (err) {
    console.error('[Backup] mysqldump trigger error:', err);
    // If mysqldump is not available (e.g. no binary on PATH), give a clear message
    const isMissingBinary =
      err.message.includes('not found') ||
      err.message.includes('ENOENT') ||
      err.message.includes('spawn');
    res.status(500).json({
      error: isMissingBinary
        ? 'mysqldump binary not found. Ensure MySQL client tools are installed or use JSON export.'
        : `Database backup failed: ${err.message}`,
    });
  }
};

// ── POST /api/backup/export — export users + concerns as JSON ────────────────
const triggerJsonExport = async (req, res) => {
  try {
    const result = await backup.runJsonExport();
    res.json({ success: true, backup: { file: result.file, size: result.size, type: 'json' } });
  } catch (err) {
    console.error('[Backup] JSON export trigger error:', err);
    res.status(500).json({ error: `Data export failed: ${err.message}` });
  }
};

// ── GET /api/backup/download/:filename — stream a backup file ────────────────
const downloadBackup = (req, res) => {
  try {
    const { filename } = req.params;

    // Security: only allow filenames without path traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Only allow .sql and .json extensions
    if (!filename.endsWith('.sql') && !filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(backup.BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    const stat = fs.statSync(filePath);
    const isJson = filename.endsWith('.json');

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', isJson ? 'application/json' : 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);

    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[Backup] Download error:', err);
    res.status(500).json({ error: 'Failed to download backup' });
  }
};

// ── DELETE /api/backup/:filename — remove a specific backup file ─────────────
const deleteBackup = (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    if (!filename.endsWith('.sql') && !filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(backup.BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: `Deleted ${filename}` });
  } catch (err) {
    console.error('[Backup] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
};

// ── POST /api/backup/import — restore data from a JSON export file ─────────────────────
const importJsonBackup = async (req, res) => {
  // req.file is set by multer memoryStorage
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let payload;
  try {
    payload = JSON.parse(req.file.buffer.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON — file could not be parsed' });
  }

  // Minimal shape validation
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'JSON root must be an object' });
  }

  const users    = Array.isArray(payload.users)    ? payload.users    : [];
  const concerns = Array.isArray(payload.concerns) ? payload.concerns : [];

  if (users.length === 0 && concerns.length === 0) {
    return res.status(400).json({ error: 'JSON file contains no users or concerns to import' });
  }

  let usersInserted = 0, usersSkipped = 0;
  let concernsInserted = 0, concernsSkipped = 0;
  const errors = [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── Import users ──────────────────────────────────────────────────────────────────────────────────
    for (const u of users) {
      if (!u.id || !u.email) { usersSkipped++; continue; }
      try {
        await conn.query(
          `INSERT INTO users
             (id, name, email, phone, barangay, role, department,
              verification_status, is_verified, id_type, id_number,
              avatar_url, id_image_url, submitted_at, verified_at,
              rejection_reason, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
             name               = VALUES(name),
             phone              = VALUES(phone),
             barangay           = VALUES(barangay),
             role               = VALUES(role),
             department         = VALUES(department),
             verification_status= VALUES(verification_status),
             is_verified        = VALUES(is_verified),
             avatar_url         = VALUES(avatar_url),
             updated_at         = VALUES(updated_at)`,
          [
            u.id, u.name || null, u.email,
            u.phone || null, u.barangay || null,
            u.role || 'citizen', u.department || null,
            u.verification_status || 'unverified',
            u.is_verified ? 1 : 0,
            u.id_type || null, u.id_number || null,
            u.avatar_url || null, u.id_image_url || null,
            u.submitted_at || null, u.verified_at || null,
            u.rejection_reason || null,
            u.created_at || new Date(), u.updated_at || new Date(),
          ],
        );
        usersInserted++;
      } catch (e) {
        usersSkipped++;
        errors.push(`User id=${u.id}: ${e.message}`);
      }
    }

    // ── Import concerns ───────────────────────────────────────────────────────────────────────────
    for (const c of concerns) {
      if (!c.id) { concernsSkipped++; continue; }
      try {
        await conn.query(
          `INSERT INTO concerns
             (id, user_id, title, category, description, status, priority,
              location_address, location_lat, location_lng, image_url,
              resolution_note, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
             title            = VALUES(title),
             category         = VALUES(category),
             description      = VALUES(description),
             status           = VALUES(status),
             priority         = VALUES(priority),
             location_address = VALUES(location_address),
             resolution_note  = VALUES(resolution_note),
             updated_at       = VALUES(updated_at)`,
          [
            c.id, c.user_id || null,
            c.title || null, c.category || null,
            c.description || null,
            c.status || 'Pending', c.priority || 'Medium',
            c.location_address || c.location || null,
            c.latitude  || c.location_lat  || null,
            c.longitude || c.location_lng  || null,
            c.image_url || null,
            c.resolution_note || null,
            c.created_at || new Date(), c.updated_at || new Date(),
          ],
        );
        concernsInserted++;
      } catch (e) {
        concernsSkipped++;
        errors.push(`Concern id=${c.id}: ${e.message}`);
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error('[Backup] Import rollback:', err.message);
    return res.status(500).json({ error: `Import failed and was rolled back: ${err.message}` });
  } finally {
    conn.release();
  }

  console.log(`[Backup] ✅  Import complete — users: +${usersInserted} skipped:${usersSkipped}, concerns: +${concernsInserted} skipped:${concernsSkipped}`);

  return res.json({
    success: true,
    summary: {
      usersInserted,
      usersSkipped,
      concernsInserted,
      concernsSkipped,
      totalRows: usersInserted + concernsInserted,
      errors: errors.slice(0, 20),   // cap at 20 error lines
    },
  });
};

module.exports = {
  listBackups,
  triggerDbBackup,
  triggerJsonExport,
  downloadBackup,
  deleteBackup,
  importJsonBackup,
};
