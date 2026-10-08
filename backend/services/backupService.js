'use strict';

/**
 * backupService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles:
 *   1. Scheduled mysqldump  → backups/db/  (runs every 24 h by default)
 *   2. On-demand JSON data export for users & concerns
 *   3. Backup rotation  → keeps the last N dumps; older ones are deleted
 *   4. Listing existing backups from disk
 */

const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const pool = require('../db');

// ── Config ────────────────────────────────────────────────────────────────────
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../../backups/db');
const MAX_BACKUPS = parseInt(process.env.BACKUP_MAX_FILES, 10) || 10; // keep last N
const INTERVAL_MS =
  parseInt(process.env.BACKUP_INTERVAL_MS, 10) || 24 * 60 * 60 * 1000; // default 24 h

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
const timestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

/**
 * Rotate old backups: keep only the newest `MAX_BACKUPS` files.
 */
const rotateBackups = () => {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.sql') || f.endsWith('.json'))
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time); // newest first

    const excess = files.slice(MAX_BACKUPS);
    excess.forEach(({ name }) => {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, name));
        console.log(`[Backup] 🗑  Rotated old backup: ${name}`);
      } catch (e) {
        console.error(`[Backup] Failed to delete ${name}:`, e.message);
      }
    });
  } catch (e) {
    console.error('[Backup] Rotation error:', e.message);
  }
};

// ── mysqldump / mariadb-dump ──────────────────────────────────────────────────
let _dumpToolConfig = null;

const getDumpToolConfig = () => {
  if (_dumpToolConfig) return _dumpToolConfig;

  // Detect which binary is available.
  // Prefer mariadb-dump when available (standard in Alpine Linux / MariaDB client packages),
  // which avoids the "mysqldump: Deprecated program name" warning.
  const candidates = ['mariadb-dump', 'mysqldump'];
  for (const bin of candidates) {
    try {
      const ver = execSync(`${bin} --version`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
      const isMaria = /mariadb/i.test(ver);
      // MariaDB dump supports --skip-ssl to prevent:
      // "TLS/SSL error: self-signed certificate in certificate chain"
      // MySQL 8 mysqldump uses --ssl-mode=DISABLED.
      const sslFlag = isMaria ? '--skip-ssl' : '--ssl-mode=DISABLED';
      _dumpToolConfig = { bin, sslFlag, isMaria };
      console.log(`[Backup] Detected database dump tool: ${bin} (sslFlag: ${sslFlag})`);
      return _dumpToolConfig;
    } catch (_) {
      // Try next candidate
    }
  }

  // Fallback default
  _dumpToolConfig = { bin: 'mariadb-dump', sslFlag: '--skip-ssl', isMaria: true };
  return _dumpToolConfig;
};

/**
 * Run mysqldump / mariadb-dump for the entire database and save to backups/db/.
 * Returns a Promise that resolves with { file, size } on success.
 *
 * Requires mariadb-dump or mysqldump to be available on PATH (Docker users: runs inside container).
 */
const runMysqldump = async () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'citivoice';

  const tool = getDumpToolConfig();

  // If using MariaDB dump against MySQL 8+, ensure user has mysql_native_password
  // so authentication succeeds without caching_sha2_password plugin mismatch
  if (tool.isMaria && user === 'root' && password) {
    try {
      const escapedPw = password.replace(/'/g, "''");
      await pool.query(`ALTER USER '${user}'@'%' IDENTIFIED WITH mysql_native_password BY '${escapedPw}'`);
      await pool.query('FLUSH PRIVILEGES');
    } catch (_) {
      // Non-fatal if user already configured or cannot run administrative DDL
    }
  }

  return new Promise((resolve, reject) => {
    const ts = timestamp();
    const filename = `backup_${ts}_full.sql`;
    const filePath = path.join(BACKUP_DIR, filename);

    const passwordArg = password ? `-p"${password.replace(/"/g, '\\"')}"` : '';
    const cmd = `${tool.bin} -h ${host} -P ${port} -u ${user} ${passwordArg} ${tool.sslFlag} --single-transaction --routines --triggers ${database}`;

    console.log(`[Backup] ⏳  Starting database backup (${tool.bin}) → ${filename}`);

    const child = exec(cmd, { maxBuffer: 256 * 1024 * 1024 });

    const writeStream = fs.createWriteStream(filePath);
    child.stdout.pipe(writeStream);

    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));

    child.on('close', (code) => {
      if (code !== 0) {
        // Clean up empty file
        try { fs.unlinkSync(filePath); } catch (_) {}
        return reject(new Error(`${tool.bin} exited ${code}: ${stderr.trim()}`));
      }

      const size = fs.statSync(filePath).size;
      console.log(`[Backup] ✅  Database backup complete → ${filename} (${(size / 1024).toFixed(1)} KB)`);
      rotateBackups();
      resolve({ file: filename, path: filePath, size, type: 'sql', ts });
    });

    child.on('error', (err) => {
      reject(new Error(`${tool.bin} spawn error: ${err.message}`));
    });
  });
};

// ── JSON data export ──────────────────────────────────────────────────────────
/**
 * Export users + concerns as a structured JSON file.
 * Sensitive fields (password_hash, reset_otp*, fcm_token) are stripped.
 * Returns a Promise resolving with { file, size }.
 */
const runJsonExport = async () => {
  const ts = timestamp();
  const filename = `export_${ts}_data.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  console.log(`[Backup] ⏳  Starting JSON export → ${filename}`);

  // Users (strip sensitive columns)
  const [users] = await pool.query(
    `SELECT id, name, email, phone, barangay, role, department,
            verification_status, is_verified, id_type, id_number,
            avatar_url, id_image_url, submitted_at, verified_at,
            rejection_reason, created_at, updated_at
     FROM users
     ORDER BY id`,
  );

  // Concerns
  const [concerns] = await pool.query(
    `SELECT id, user_id, category, description, status, priority,
            location_address, latitude, longitude, image_url,
            resolution_note, created_at, updated_at
     FROM concerns
     ORDER BY id`,
  );

  const payload = {
    exported_at: new Date().toISOString(),
    users_count: users.length,
    concerns_count: concerns.length,
    users,
    concerns,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  const size = fs.statSync(filePath).size;

  console.log(`[Backup] ✅  JSON export complete → ${filename} (${(size / 1024).toFixed(1)} KB)`);
  rotateBackups();
  return { file: filename, path: filePath, size, type: 'json', ts };
};

// ── List existing backups ─────────────────────────────────────────────────────
const listBackups = () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sql') || f.endsWith('.json'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      const type = f.endsWith('.sql') ? 'sql' : 'json';
      return {
        file: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
        type,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ── Scheduled auto-backup ─────────────────────────────────────────────────────
let _scheduledTimer = null;

/**
 * Start the automatic backup scheduler.
 * Runs runMysqldump() every INTERVAL_MS.
 */
const startScheduler = () => {
  if (_scheduledTimer) return; // already running

  console.log(
    `[Backup] 🕐  Auto-backup scheduler started (interval: ${INTERVAL_MS / 1000}s)`,
  );

  const tick = async () => {
    try {
      await runMysqldump();
    } catch (err) {
      console.error('[Backup] Scheduled mysqldump failed:', err.message);
      // Fallback: try JSON export if mysqldump is unavailable
      try {
        await runJsonExport();
      } catch (e2) {
        console.error('[Backup] Fallback JSON export also failed:', e2.message);
      }
    }
  };

  // Run immediately on first start, then on schedule
  tick();
  _scheduledTimer = setInterval(tick, INTERVAL_MS);
};

const stopScheduler = () => {
  if (_scheduledTimer) {
    clearInterval(_scheduledTimer);
    _scheduledTimer = null;
    console.log('[Backup] Scheduler stopped.');
  }
};

module.exports = {
  runMysqldump,
  runJsonExport,
  listBackups,
  startScheduler,
  stopScheduler,
  BACKUP_DIR,
};
