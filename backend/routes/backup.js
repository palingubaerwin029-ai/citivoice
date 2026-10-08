'use strict';

/**
 * backup.js — Route definitions for /api/backup
 * All routes require authentication + admin role.
 */

const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  listBackups,
  triggerDbBackup,
  triggerJsonExport,
  downloadBackup,
  deleteBackup,
  importJsonBackup,
} = require('../controllers/backup.controller');

const adminOnly = [auth, requireRole('admin')];

// Multer: store imported JSON entirely in memory (max 50 MB)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only .json files are accepted for import'));
    }
  },
});

// GET    /api/backup                      — list all backups
router.get('/', ...adminOnly, listBackups);

// POST   /api/backup/db                   — run mysqldump now
router.post('/db', ...adminOnly, triggerDbBackup);

// POST   /api/backup/export               — run JSON data export now
router.post('/export', ...adminOnly, triggerJsonExport);

// POST   /api/backup/import               — import a JSON data export
router.post('/import', ...adminOnly, importUpload.single('backup'), importJsonBackup);

// GET    /api/backup/download/:filename   — stream/download a file
router.get('/download/:filename', ...adminOnly, downloadBackup);

// DELETE /api/backup/:filename            — delete a file
router.delete('/:filename', ...adminOnly, deleteBackup);

module.exports = router;
