'use strict';

/**
 * backup.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller for the /api/backup endpoints (admin-only).
 */

const path = require('path');
const fs = require('fs');
const backup = require('../services/backupService');

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

module.exports = {
  listBackups,
  triggerDbBackup,
  triggerJsonExport,
  downloadBackup,
  deleteBackup,
};
