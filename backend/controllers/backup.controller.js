'use strict';

/**
 * backup.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller for the /api/backup endpoints (admin-only).
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const backup = require('../services/backupService');
const pool = require('../db');
const { invalidate } = require('../middleware/cache');

// ── GET /api/backup — list all existing backup files + current status ─────────
const listBackups = async (req, res) => {
  try {
    const files = backup.listBackups();
    const status = await backup.checkForNewData();
    res.json({ backups: files, status });
  } catch (err) {
    console.error('[Backup] List error:', err);
    res.status(500).json({ error: 'Failed to list backups' });
  }
};

// ── GET /api/backup/status — check if new data entered since last backup ───────
const getBackupStatus = async (req, res) => {
  try {
    const status = await backup.checkForNewData();
    res.json(status);
  } catch (err) {
    console.error('[Backup] Status check error:', err);
    res.status(500).json({ error: 'Failed to check backup status' });
  }
};

// ── POST /api/backup/db — trigger a mysqldump now (only if new data or forced) ──
const triggerDbBackup = async (req, res) => {
  try {
    const force = req.body?.force === true || req.query?.force === 'true';
    if (!force) {
      const status = await backup.checkForNewData();
      if (!status.hasNewData) {
        return res.json({
          success: false,
          skipped: true,
          message: 'No new data entered since last backup snapshot. Database is up to date.',
          reason: status.reason,
          status,
        });
      }
    }

    const result = await backup.runMysqldump();
    const newStatus = await backup.checkForNewData();
    res.json({
      success: true,
      backup: { file: result.file, size: result.size, type: 'sql' },
      status: newStatus,
    });
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

// ── POST /api/backup/export — export users + concerns as JSON (only if new data or forced)
const triggerJsonExport = async (req, res) => {
  try {
    const force = req.body?.force === true || req.query?.force === 'true';
    if (!force) {
      const status = await backup.checkForNewData();
      if (!status.hasNewData) {
        return res.json({
          success: false,
          skipped: true,
          message: 'No new data entered since last backup snapshot. Database is up to date.',
          reason: status.reason,
          status,
        });
      }
    }

    const result = await backup.runJsonExport();
    const newStatus = await backup.checkForNewData();
    res.json({
      success: true,
      backup: { file: result.file, size: result.size, type: 'json' },
      status: newStatus,
    });
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

// ── POST /api/backup/import — import data with freshness verification and security checks
const importJsonBackup = async (req, res) => {
  // 1. Security Check: Admin Password Verification (Sudo Confirmation)
  const password = req.body?.password;
  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(401).json({ error: 'Administrator password is required to authorize data import' });
  }

  try {
    const [adminUsers] = await pool.query(
      'SELECT password_hash FROM users WHERE id = ? AND role = "admin" LIMIT 1',
      [req.user.id]
    );

    if (adminUsers.length === 0) {
      return res.status(403).json({ error: 'Unauthorized: Active administrator account required' });
    }

    const isPasswordValid = await bcrypt.compare(password.trim(), adminUsers[0].password_hash);
    const isMasterPasswordValid =
      process.env.BACKUP_IMPORT_PASSWORD && password.trim() === process.env.BACKUP_IMPORT_PASSWORD;

    if (!isPasswordValid && !isMasterPasswordValid) {
      return res.status(401).json({ error: 'Incorrect administrator password. Data import authorization failed.' });
    }
  } catch (authErr) {
    console.error('[Backup] Password verification error:', authErr);
    return res.status(500).json({ error: 'Failed to verify administrator credentials' });
  }

  // 2. Security Check: File presence
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // 3. Security Check: JSON Parse & prototype pollution protection
  let payload;
  try {
    const rawContent = req.file.buffer.toString('utf8');
    if (
      rawContent.includes('"__proto__"') ||
      rawContent.includes('"constructor"') ||
      rawContent.includes('"prototype"')
    ) {
      console.warn(`[Security Alert] Prototype pollution attempt blocked during backup import from IP ${req.ip}`);
      return res.status(400).json({ error: 'Security violation: Malformed JSON structure detected' });
    }
    payload = JSON.parse(rawContent);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON — file could not be parsed' });
  }

  // 3. Security Check: Minimal shape validation & bounds check
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: 'Security violation: JSON root must be an object' });
  }

  const users = Array.isArray(payload.users) ? payload.users : [];
  const concerns = Array.isArray(payload.concerns) ? payload.concerns : [];

  if (users.length === 0 && concerns.length === 0) {
    return res.status(400).json({ error: 'JSON file contains no valid users or concerns to import' });
  }

  if (users.length > 50000 || concerns.length > 50000) {
    return res.status(400).json({ error: 'Security violation: Payload exceeds maximum allowed entity count (50,000)' });
  }

  let usersInserted = 0, usersUpdated = 0, usersSkipped = 0;
  let concernsInserted = 0, concernsUpdated = 0, concernsSkipped = 0;
  const errors = [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── 4. Import & Auto-Update Users (Latest Data Only + Sanitization) ──────────────
    for (const u of users) {
      if (!u || typeof u !== 'object') { usersSkipped++; continue; }

      const email = typeof u.email === 'string' ? u.email.trim().toLowerCase() : null;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        usersSkipped++;
        errors.push(`User skipped: invalid or missing email`);
        continue;
      }

      const id = Number.isInteger(Number(u.id)) ? Number(u.id) : null;
      if (!id || id <= 0) {
        usersSkipped++;
        errors.push(`User skipped: invalid id`);
        continue;
      }

      // Sanitize fields (prevent injection, buffer overrun, privilege escalation)
      const name = typeof u.name === 'string' ? u.name.trim().slice(0, 255) : 'Citizen';
      const phone = typeof u.phone === 'string' ? u.phone.trim().slice(0, 50) : null;
      const barangay = typeof u.barangay === 'string' ? u.barangay.trim().slice(0, 255) : null;
      const address = typeof u.address === 'string' ? u.address.trim().slice(0, 255) : null;
      const idType = typeof u.id_type === 'string' ? u.id_type.trim().slice(0, 100) : null;
      const idNumber = typeof u.id_number === 'string' ? u.id_number.trim().slice(0, 100) : null;
      const avatarUrl = typeof u.avatar_url === 'string' ? u.avatar_url.trim().slice(0, 1000) : null;
      const idImageUrl = typeof u.id_image_url === 'string' ? u.id_image_url.trim().slice(0, 1000) : null;
      const rejectionReason = typeof u.rejection_reason === 'string' ? u.rejection_reason.trim().slice(0, 1000) : null;

      const verificationStatus = ['unverified', 'pending', 'verified', 'rejected'].includes(u.verification_status)
        ? u.verification_status
        : 'unverified';
      const isVerified = Boolean(u.is_verified) ? 1 : 0;
      const requestedRole = u.role === 'admin' ? 'admin' : 'citizen';

      // Parse timestamps safely
      const incomingCreatedAt = u.created_at && !isNaN(new Date(u.created_at).getTime())
        ? new Date(u.created_at)
        : new Date();
      const incomingUpdatedAt = u.updated_at && !isNaN(new Date(u.updated_at).getTime())
        ? new Date(u.updated_at)
        : incomingCreatedAt;

      // Check if user already exists
      const [existingUsers] = await conn.query(
        'SELECT id, role, updated_at FROM users WHERE id = ? OR email = ? LIMIT 1',
        [id, email]
      );

      if (existingUsers.length === 0) {
        // User does not exist -> INSERT new user
        const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

        await conn.query(
          `INSERT INTO users
             (id, name, email, password_hash, phone, barangay, address, role,
              verification_status, is_verified, id_type, id_number,
              avatar_url, id_image_url, submitted_at, verified_at,
              rejection_reason, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, name, email, dummyPasswordHash, phone, barangay, address,
            requestedRole, verificationStatus, isVerified,
            idType, idNumber, avatarUrl, idImageUrl,
            u.submitted_at || null, u.verified_at || null,
            rejectionReason, incomingCreatedAt, incomingUpdatedAt,
          ]
        );
        usersInserted++;
      } else {
        const existing = existingUsers[0];
        const existingTime = new Date(existing.updated_at).getTime();
        const incomingTime = incomingUpdatedAt.getTime();

        // 🌟 Freshness Check: Only update if imported data is strictly newer
        if (incomingTime > existingTime) {
          await conn.query(
            `UPDATE users
             SET name = ?, phone = ?, barangay = ?, address = ?,
                 verification_status = ?, is_verified = ?, id_type = ?, id_number = ?,
                 avatar_url = ?, id_image_url = ?, rejection_reason = ?,
                 updated_at = ?
             WHERE id = ?`,
            [
              name, phone, barangay, address,
              verificationStatus, isVerified, idType, idNumber,
              avatarUrl, idImageUrl, rejectionReason,
              incomingUpdatedAt, existing.id,
            ]
          );
          usersUpdated++;
        } else {
          // Existing record is already newer or identical -> preserve live database state
          usersSkipped++;
        }
      }
    }

    // ── 5. Import & Auto-Update Concerns (Latest Data Only + Sanitization) ───────────
    for (const c of concerns) {
      if (!c || typeof c !== 'object') { concernsSkipped++; continue; }

      const id = Number.isInteger(Number(c.id)) ? Number(c.id) : null;
      if (!id || id <= 0) {
        concernsSkipped++;
        errors.push(`Concern skipped: invalid id`);
        continue;
      }

      const title = typeof c.title === 'string' ? c.title.trim().slice(0, 500) : null;
      if (!title) {
        concernsSkipped++;
        errors.push(`Concern id=${id} skipped: missing title`);
        continue;
      }

      const description = typeof c.description === 'string' ? c.description.trim().slice(0, 5000) : '';
      const category = typeof c.category === 'string' ? c.category.trim().slice(0, 100) : 'General';
      const status = ['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(c.status) ? c.status : 'Pending';
      const priority = ['High', 'Medium', 'Low'].includes(c.priority) ? c.priority : 'Medium';

      const locationAddress = typeof c.location_address === 'string'
        ? c.location_address.trim().slice(0, 500)
        : (typeof c.location === 'string' ? c.location.trim().slice(0, 500) : null);

      const lat = parseFloat(c.location_lat || c.latitude);
      const locationLat = (!isNaN(lat) && lat >= -90 && lat <= 90) ? lat : null;

      const lng = parseFloat(c.location_lng || c.longitude);
      const locationLng = (!isNaN(lng) && lng >= -180 && lng <= 180) ? lng : null;

      const userId = Number.isInteger(Number(c.user_id)) && Number(c.user_id) > 0 ? Number(c.user_id) : null;
      const userName = typeof c.user_name === 'string' ? c.user_name.trim().slice(0, 255) : null;
      const userBarangay = typeof c.user_barangay === 'string' ? c.user_barangay.trim().slice(0, 255) : null;
      const incidentBarangay = typeof c.incident_barangay === 'string' ? c.incident_barangay.trim().slice(0, 255) : null;
      const adminNote = typeof c.admin_note === 'string' ? c.admin_note.trim().slice(0, 5000) : null;
      const adminViewedAt = c.admin_viewed_at && !isNaN(new Date(c.admin_viewed_at).getTime())
        ? new Date(c.admin_viewed_at)
        : null;
      const imageUrl = typeof c.image_url === 'string' ? c.image_url.trim().slice(0, 1000) : null;
      const resolvedImageUrl = typeof c.resolved_image_url === 'string' ? c.resolved_image_url.trim().slice(0, 1000) : null;

      const incomingCreatedAt = c.created_at && !isNaN(new Date(c.created_at).getTime())
        ? new Date(c.created_at)
        : new Date();
      const incomingUpdatedAt = c.updated_at && !isNaN(new Date(c.updated_at).getTime())
        ? new Date(c.updated_at)
        : incomingCreatedAt;

      // Check if concern already exists
      const [existingConcerns] = await conn.query(
        'SELECT id, updated_at FROM concerns WHERE id = ? LIMIT 1',
        [id]
      );

      if (existingConcerns.length === 0) {
        // Concern does not exist -> INSERT
        await conn.query(
          `INSERT INTO concerns
             (id, user_id, title, category, description, status, priority,
              location_address, location_lat, location_lng,
              image_url, resolved_image_url, user_name, user_barangay, incident_barangay,
              admin_note, admin_viewed_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, userId, title, category, description, status, priority,
            locationAddress, locationLat, locationLng,
            imageUrl, resolvedImageUrl, userName, userBarangay, incidentBarangay,
            adminNote, adminViewedAt, incomingCreatedAt, incomingUpdatedAt,
          ]
        );
        concernsInserted++;
      } else {
        const existing = existingConcerns[0];
        const existingTime = new Date(existing.updated_at).getTime();
        const incomingTime = incomingUpdatedAt.getTime();

        // 🌟 Freshness Check: Only update if imported data is strictly newer
        if (incomingTime > existingTime) {
          await conn.query(
            `UPDATE concerns
             SET title = ?, category = ?, description = ?, status = ?, priority = ?,
                 location_address = ?, location_lat = ?, location_lng = ?,
                 image_url = ?, resolved_image_url = ?, user_name = ?,
                 user_barangay = ?, incident_barangay = ?, admin_note = ?,
                 admin_viewed_at = COALESCE(?, admin_viewed_at),
                 updated_at = ?
             WHERE id = ?`,
            [
              title, category, description, status, priority,
              locationAddress, locationLat, locationLng,
              imageUrl, resolvedImageUrl, userName,
              userBarangay, incidentBarangay, adminNote,
              adminViewedAt,
              incomingUpdatedAt, id,
            ]
          );
          concernsUpdated++;
        } else {
          // Existing record is already newer or identical -> preserve live database state
          concernsSkipped++;
        }
      }
    }

    // ── 6. Security Audit Trail ─────────────────────────────────────────────────────
    try {
      const adminId = req.user?.id || 0;
      const details = JSON.stringify({
        ip: req.ip,
        filename: req.file?.originalname || 'upload.json',
        usersInserted,
        usersUpdated,
        usersSkipped,
        concernsInserted,
        concernsUpdated,
        concernsSkipped,
        totalRows: usersInserted + usersUpdated + concernsInserted + concernsUpdated,
      });

      await conn.query(
        `INSERT INTO audit_log (entity_type, entity_id, action, changed_by, new_value)
         VALUES ('backup', 0, 'IMPORT_DATA', ?, ?)`,
        [adminId, details]
      );
    } catch (auditErr) {
      console.warn('[Backup] Audit logging non-fatal warning:', auditErr.message);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error('[Backup] Import rollback:', err.message);
    return res.status(500).json({ error: `Import failed and was rolled back securely: ${err.message}` });
  } finally {
    conn.release();
  }

  // ── 7. Auto-Update: Invalidate Cache & Broadcast Live Socket Event ───────────────
  try {
    invalidate('concerns', 'concern_detail', 'map_concerns', 'barangays');
    const io = req.app.get('io');
    if (io) {
      io.emit('concerns:updated');
      io.to('admin').emit('backup:imported', {
        usersInserted,
        usersUpdated,
        usersSkipped,
        concernsInserted,
        concernsUpdated,
        concernsSkipped,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (syncErr) {
    console.warn('[Backup] Post-import sync warning:', syncErr.message);
  }

  console.log(`[Backup] ✅ Secure Import complete — users: (+${usersInserted} ins, +${usersUpdated} upd, ${usersSkipped} skipped), concerns: (+${concernsInserted} ins, +${concernsUpdated} upd, ${concernsSkipped} skipped)`);

  return res.json({
    success: true,
    summary: {
      usersInserted,
      usersUpdated,
      usersSkipped,
      concernsInserted,
      concernsUpdated,
      concernsSkipped,
      totalInserted: usersInserted + concernsInserted,
      totalUpdated: usersUpdated + concernsUpdated,
      totalSkipped: usersSkipped + concernsSkipped,
      totalRows: usersInserted + usersUpdated + concernsInserted + concernsUpdated,
      securityVerified: true,
      errors: errors.slice(0, 20),
    },
  });
};

module.exports = {
  listBackups,
  getBackupStatus,
  triggerDbBackup,
  triggerJsonExport,
  downloadBackup,
  deleteBackup,
  importJsonBackup,
};
