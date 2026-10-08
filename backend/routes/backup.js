'use strict';

/**
 * backup.js — Route definitions for /api/backup
 * All routes require authentication + admin role.
 */

const router = require('express').Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  listBackups,
  triggerDbBackup,
  triggerJsonExport,
  downloadBackup,
  deleteBackup,
} = require('../controllers/backup.controller');

const adminOnly = [auth, requireRole('admin')];

// GET    /api/backup                      — list all backups
router.get('/', ...adminOnly, listBackups);

// POST   /api/backup/db                   — run mysqldump now
router.post('/db', ...adminOnly, triggerDbBackup);

// POST   /api/backup/export               — run JSON data export now
router.post('/export', ...adminOnly, triggerJsonExport);

// GET    /api/backup/download/:filename   — stream/download a file
router.get('/download/:filename', ...adminOnly, downloadBackup);

// DELETE /api/backup/:filename            — delete a file
router.delete('/:filename', ...adminOnly, deleteBackup);

module.exports = router;
