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

const { exec, execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('../db');

// ── Config ────────────────────────────────────────────────────────────────────
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(__dirname, '../../backups/db');
const MAX_BACKUPS = parseInt(process.env.BACKUP_MAX_FILES, 10) || 10; // keep last N
const INTERVAL_MS =
  parseInt(process.env.BACKUP_INTERVAL_MS, 10) || 24 * 60 * 60 * 1000; // default 24 h
const STATE_FILE = path.join(BACKUP_DIR, '.backup_state.json');

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
 * Ignores dotfiles such as .backup_state.json.
 */
const rotateBackups = () => {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => !f.startsWith('.') && (f.endsWith('.sql') || f.endsWith('.json')))
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

// ── Database State & Change Detection ─────────────────────────────────────────

const getSavedBackupState = () => {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('[Backup] Error reading state file:', e.message);
  }
  return null;
};

const saveBackupState = (state) => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.error('[Backup] Failed to save backup state:', e.message);
  }
};

/**
 * Query current database statistics and compute a signature hash.
 */
const getCurrentDataSnapshot = async () => {
  try {
    const [rows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COALESCE(MAX(id), 0) FROM users) AS max_user_id,
        (SELECT COALESCE(MAX(updated_at), '1970-01-01 00:00:00') FROM users) AS max_user_updated,
        (SELECT COUNT(*) FROM concerns) AS concerns_count,
        (SELECT COALESCE(MAX(id), 0) FROM concerns) AS max_concern_id,
        (SELECT COALESCE(MAX(updated_at), '1970-01-01 00:00:00') FROM concerns) AS max_concern_updated,
        (SELECT COUNT(*) FROM concern_comments) AS comments_count,
        (SELECT COALESCE(MAX(id), 0) FROM concern_comments) AS max_comment_id,
        (SELECT COUNT(*) FROM concern_upvotes) AS upvotes_count,
        (SELECT COUNT(*) FROM audit_log) AS audit_count,
        (SELECT COALESCE(MAX(id), 0) FROM audit_log) AS max_audit_id
    `);

    const r = rows[0] || {};
    const snapshot = {
      users_count: Number(r.users_count || 0),
      max_user_id: Number(r.max_user_id || 0),
      max_user_updated: r.max_user_updated ? new Date(r.max_user_updated).toISOString() : '1970-01-01T00:00:00.000Z',
      concerns_count: Number(r.concerns_count || 0),
      max_concern_id: Number(r.max_concern_id || 0),
      max_concern_updated: r.max_concern_updated ? new Date(r.max_concern_updated).toISOString() : '1970-01-01T00:00:00.000Z',
      comments_count: Number(r.comments_count || 0),
      max_comment_id: Number(r.max_comment_id || 0),
      upvotes_count: Number(r.upvotes_count || 0),
      audit_count: Number(r.audit_count || 0),
      max_audit_id: Number(r.max_audit_id || 0),
    };

    const signature = crypto
      .createHash('md5')
      .update(JSON.stringify(snapshot))
      .digest('hex');

    return { snapshot, signature };
  } catch (err) {
    console.error('[Backup] Error fetching data snapshot:', err.message);
    return null;
  }
};

/**
 * Determine if any new records or modifications have occurred since the last backup.
 */
const checkForNewData = async () => {
  const backups = listBackups();
  if (backups.length === 0) {
    return {
      hasNewData: true,
      reason: 'No backups exist yet. Initial backup required.',
      lastBackupFile: null,
      lastBackupAt: null,
      changes: { newUsers: 0, newConcerns: 0, updatedUsers: false, updatedConcerns: false, totalChanges: 0 },
      currentStats: null,
    };
  }

  const latestBackup = backups[0];
  const current = await getCurrentDataSnapshot();
  if (!current) {
    return { hasNewData: true, reason: 'Unable to check database state; allowing backup.' };
  }

  let savedState = getSavedBackupState();

  // If no saved state exists yet, or referenced file was deleted:
  if (!savedState || (savedState.lastBackupFile && !fs.existsSync(path.join(BACKUP_DIR, savedState.lastBackupFile)))) {
    const latestBackupTime = new Date(latestBackup.createdAt).getTime();
    const latestUserTime = new Date(current.snapshot.max_user_updated).getTime();
    const latestConcernTime = new Date(current.snapshot.max_concern_updated).getTime();

    // If latest backup file on disk is newer than latest modifications in DB:
    if (latestBackupTime >= latestUserTime && latestBackupTime >= latestConcernTime) {
      savedState = {
        lastBackupFile: latestBackup.file,
        lastBackupAt: latestBackup.createdAt,
        dataSignature: current.signature,
        snapshot: current.snapshot,
      };
      saveBackupState(savedState);
    }
  }

  if (!savedState) {
    return {
      hasNewData: true,
      reason: 'New backup required to establish baseline snapshot state.',
      lastBackupFile: latestBackup.file,
      lastBackupAt: latestBackup.createdAt,
      changes: { totalChanges: 1 },
      currentStats: current.snapshot,
    };
  }

  const prev = savedState.snapshot || {};
  const cur = current.snapshot;

  const newUsers = Math.max(0, cur.users_count - (prev.users_count || 0));
  const newConcerns = Math.max(0, cur.concerns_count - (prev.concerns_count || 0));
  const newComments = Math.max(0, cur.comments_count - (prev.comments_count || 0));
  const newAudit = Math.max(0, cur.audit_count - (prev.audit_count || 0));
  const newUpvotes = Math.max(0, cur.upvotes_count - (prev.upvotes_count || 0));

  const updatedUsers = cur.max_user_updated > (prev.max_user_updated || '1970-01-01');
  const updatedConcerns = cur.max_concern_updated > (prev.max_concern_updated || '1970-01-01');

  const signatureChanged = current.signature !== savedState.dataSignature;

  const hasNewData =
    signatureChanged ||
    newUsers > 0 ||
    newConcerns > 0 ||
    newComments > 0 ||
    newAudit > 0 ||
    newUpvotes > 0 ||
    updatedUsers ||
    updatedConcerns;

  const reasons = [];
  if (newUsers > 0) reasons.push(`${newUsers} new citizen(s)`);
  if (newConcerns > 0) reasons.push(`${newConcerns} new concern(s)`);
  if (updatedConcerns) reasons.push('concern updates or status changes');
  if (updatedUsers) reasons.push('user profile or verification updates');
  if (newComments > 0) reasons.push(`${newComments} new internal comment(s)`);
  if (newUpvotes > 0) reasons.push(`${newUpvotes} new upvote(s)`);
  if (newAudit > 0) reasons.push(`${newAudit} audit log record(s)`);

  const reasonStr = hasNewData
    ? reasons.length > 0
      ? `New data detected: ${reasons.join(', ')}`
      : 'Database changes detected since last backup snapshot'
    : 'Database is up to date (no new records or updates)';

  return {
    hasNewData,
    reason: reasonStr,
    lastBackupFile: savedState.lastBackupFile || latestBackup.file,
    lastBackupAt: savedState.lastBackupAt || latestBackup.createdAt,
    changes: {
      newUsers,
      newConcerns,
      newComments,
      newAudit,
      newUpvotes,
      updatedUsers,
      updatedConcerns,
      totalChanges: newUsers + newConcerns + newComments + (updatedConcerns ? 1 : 0) + (updatedUsers ? 1 : 0),
    },
    currentStats: cur,
  };
};

// ── mysqldump / mariadb-dump ──────────────────────────────────────────────────
let _dumpToolConfig = null;

const getDumpToolConfig = () => {
  if (_dumpToolConfig) return _dumpToolConfig;

  // Detect which binary is available.
  const candidates = ['mariadb-dump', 'mysqldump'];
  for (const bin of candidates) {
    try {
      const ver = execSync(`${bin} --version`, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
      const isMaria = /mariadb/i.test(ver);
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
 */
const runMysqldump = async () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'citivoice';

  const tool = getDumpToolConfig();

  // If using MariaDB dump against MySQL 8+, ensure user has mysql_native_password
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

    const args = [
      '-h', host,
      '-P', String(port),
      '-u', user,
      tool.sslFlag,
      '--single-transaction',
      '--routines',
      '--triggers',
      database,
    ];

    console.log(`[Backup] ⏳  Starting database backup (${tool.bin}) → ${filename}`);

    const env = { ...process.env };
    if (password) env.MYSQL_PWD = password;

    const child = spawn(tool.bin, args, { env });

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

      // Update baseline state upon successful backup
      getCurrentDataSnapshot().then((st) => {
        if (st) {
          saveBackupState({
            lastBackupFile: filename,
            lastBackupAt: new Date().toISOString(),
            lastBackupType: 'sql',
            dataSignature: st.signature,
            snapshot: st.snapshot,
          });
        }
      });

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
    `SELECT id, user_id, title, category, description, status, priority,
            location_address, location_lat, location_lng,
            location_lat AS latitude, location_lng AS longitude,
            image_url, resolved_image_url, user_name, user_barangay,
            admin_note, approval_notes, approved_by_name, approved_at,
            upvotes, department, created_at, updated_at
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

  // Update baseline state upon successful backup
  const st = await getCurrentDataSnapshot();
  if (st) {
    saveBackupState({
      lastBackupFile: filename,
      lastBackupAt: new Date().toISOString(),
      lastBackupType: 'json',
      dataSignature: st.signature,
      snapshot: st.snapshot,
    });
  }

  return { file: filename, path: filePath, size, type: 'json', ts };
};

// ── List existing backups ─────────────────────────────────────────────────────
const listBackups = () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => !f.startsWith('.') && (f.endsWith('.sql') || f.endsWith('.json')))
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
 * Runs only if new data is entered.
 */
const startScheduler = () => {
  if (_scheduledTimer) return; // already running

  console.log(
    `[Backup] 🕐  Auto-backup scheduler started (interval: ${INTERVAL_MS / 1000}s, condition: on-new-data-only)`,
  );

  const tick = async () => {
    try {
      const status = await checkForNewData();
      if (!status.hasNewData) {
        console.log(`[Backup] ⏭️  Auto-backup skipped: ${status.reason}`);
        return;
      }

      console.log(`[Backup] 🆕  New data detected (${status.reason}). Starting scheduled backup...`);
      await runMysqldump();
    } catch (err) {
      console.error('[Backup] Scheduled mysqldump failed:', err.message);
      // Fallback: try JSON export if mysqldump is unavailable and new data exists
      try {
        const status = await checkForNewData();
        if (status.hasNewData) {
          console.log('[Backup] Attempting fallback JSON export for new data...');
          await runJsonExport();
        }
      } catch (e2) {
        console.error('[Backup] Fallback JSON export also failed:', e2.message);
      }
    }
  };

  // Run on startup (only backs up if new data exists), then on schedule
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
  checkForNewData,
  getCurrentDataSnapshot,
  startScheduler,
  stopScheduler,
  BACKUP_DIR,
};
