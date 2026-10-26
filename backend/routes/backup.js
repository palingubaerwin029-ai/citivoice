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
  getBackupStatus,
  triggerDbBackup,
  triggerJsonExport,
  downloadBackup,
  deleteBackup,
  importJsonBackup,
} = require('../controllers/backup.controller');

const rateLimit = require('express-rate-limit');

const adminOnly = [auth, requireRole('admin')];

// Dedicated rate limiter for data import (prevent DoS/resource abuse)
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 imports per 15 minutes
  message: { error: 'Too many data import attempts. Please wait 15 minutes before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

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

// GET    /api/backup                      — list all backups + current status
router.get('/', ...adminOnly, listBackups);

// GET    /api/backup/status               — check if new data entered since last backup
router.get('/status', ...adminOnly, getBackupStatus);

// POST   /api/backup/db                   — run mysqldump now
router.post('/db', ...adminOnly, triggerDbBackup);

// POST   /api/backup/export               — run JSON data export now
router.post('/export', ...adminOnly, triggerJsonExport);

// POST   /api/backup/import               — import a JSON data export with security rate limit
router.post('/import', ...adminOnly, importLimiter, importUpload.single('backup'), importJsonBackup);

// GET    /api/backup/download/:filename   — stream/download a file
router.get('/download/:filename', ...adminOnly, downloadBackup);

// DELETE /api/backup/:filename            — delete a file
router.delete('/:filename', ...adminOnly, deleteBackup);

module.exports = router;
