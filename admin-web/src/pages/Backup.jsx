import React, { useEffect, useState, useCallback } from 'react';
import {
  IoCloudUploadOutline,
  IoCloudDownloadOutline,
  IoTrashOutline,
  IoRefreshOutline,
  IoDocumentTextOutline,
  IoServerOutline,
  IoTimeOutline,
  IoShieldCheckmarkOutline,
  IoWarningOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
} from 'react-icons/io5';
import s from '../styles/Backup.module.css';
import { api } from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('cv_token');

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`${s.toast} ${type === 'success' ? s.toastSuccess : s.toastError}`}>
      {type === 'success' ? <IoCheckmarkCircleOutline size={18} /> : <IoAlertCircleOutline size={18} />}
      <span>{message}</span>
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ filename, onConfirm, onCancel }) {
  return (
    <div className={s.overlay}>
      <div className={s.modal}>
        <div className={s.modalTitle}>🗑 Delete Backup</div>
        <div className={s.modalBody}>
          Are you sure you want to permanently delete <strong>{filename}</strong>?
          <br />
          This action cannot be undone.
        </div>
        <div className={s.modalActions}>
          <button id="backup-cancel-delete" className={`${s.btn} ${s.btnGhost}`} onClick={onCancel}>
            Cancel
          </button>
          <button id="backup-confirm-delete" className={`${s.btn} ${s.btnDanger}`} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Backup() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningDb, setRunningDb] = useState(false);
  const [runningJson, setRunningJson] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [downloadingFile, setDownloadingFile] = useState(null);

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/backup');
      setBackups(res.backups || []);
    } catch (err) {
      showToast(`Failed to load backups: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // ── Toast helper ────────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  // ── Trigger DB backup ───────────────────────────────────────────────────────
  const handleDbBackup = async () => {
    setRunningDb(true);
    try {
      const res = await api.post('/backup/db', {});
      showToast(
        `✅ DB backup created: ${res.backup?.file} (${fmtSize(res.backup?.size)})`,
        'success',
      );
      await fetchBackups();
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    } finally {
      setRunningDb(false);
    }
  };

  // ── Trigger JSON export ─────────────────────────────────────────────────────
  const handleJsonExport = async () => {
    setRunningJson(true);
    try {
      const res = await api.post('/backup/export', {});
      showToast(
        `✅ Data export created: ${res.backup?.file} (${fmtSize(res.backup?.size)})`,
        'success',
      );
      await fetchBackups();
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    } finally {
      setRunningJson(false);
    }
  };

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = async (filename) => {
    setDownloadingFile(filename);
    try {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/backup/download/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${filename}`, 'success');
    } catch (err) {
      showToast(`Download failed: ${err.message}`, 'error');
    } finally {
      setDownloadingFile(null);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (filename) => setConfirmDelete(filename);

  const confirmDeleteFile = async () => {
    const filename = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/backup/${encodeURIComponent(filename)}`);
      showToast(`Deleted ${filename}`, 'success');
      setBackups((prev) => prev.filter((b) => b.file !== filename));
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // ── Derived stats ───────────────────────────────────────────────────────────
  const sqlCount = backups.filter((b) => b.type === 'sql').length;
  const jsonCount = backups.filter((b) => b.type === 'json').length;
  const totalSize = backups.reduce((acc, b) => acc + (b.size || 0), 0);
  const latestBackup = backups[0];

  return (
    <div className={s.page}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={s.header}>
        <div className={s.titleGroup}>
          <div className={s.titleIcon}>🗄️</div>
          <div>
            <div className={s.title}>Backup Management</div>
            <div className={s.subtitle}>
              Protect your CitiVoice data — users, concerns, and more
            </div>
          </div>
        </div>

        <div className={s.actionBar}>
          <button
            id="backup-trigger-db"
            className={`${s.btn} ${s.btnSecondary}`}
            onClick={handleDbBackup}
            disabled={runningDb || runningJson}
            title="Run a full mysqldump of the database"
          >
            {runningDb ? (
              <span className={`${s.spinner} ${s.spinnerLight}`} />
            ) : (
              <IoServerOutline size={15} />
            )}
            {runningDb ? 'Backing up…' : 'DB Backup (SQL)'}
          </button>

          <button
            id="backup-trigger-json"
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={handleJsonExport}
            disabled={runningDb || runningJson}
            title="Export users and concerns as a JSON file"
          >
            {runningJson ? (
              <span className={s.spinner} />
            ) : (
              <IoCloudUploadOutline size={15} />
            )}
            {runningJson ? 'Exporting…' : 'Export Data (JSON)'}
          </button>

          <button
            id="backup-refresh"
            className={`${s.btn} ${s.btnGhost}`}
            onClick={fetchBackups}
            disabled={loading}
            title="Refresh backup list"
          >
            <IoRefreshOutline size={15} />
          </button>
        </div>
      </div>

      {/* ── Scheduler Status ────────────────────────────────────────────────── */}
      <div className={s.scheduleCard}>
        <div className={s.scheduleDot} />
        <div className={s.scheduleText}>
          <div className={s.scheduleTitle}>Auto-Backup Scheduler Active</div>
          <div className={s.scheduleDetail}>
            Database is automatically backed up every 24 hours. Up to 10 backups are retained
            (older ones are rotated out automatically).
          </div>
        </div>
        <IoShieldCheckmarkOutline size={22} color="var(--green)" />
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────────────── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(139,92,246,0.12)' }}>🗃️</div>
          <div className={s.statInfo}>
            <div className={s.statValue}>{sqlCount}</div>
            <div className={s.statLabel}>SQL Backups</div>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(34,211,238,0.1)' }}>📋</div>
          <div className={s.statInfo}>
            <div className={s.statValue}>{jsonCount}</div>
            <div className={s.statLabel}>JSON Exports</div>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(16,185,129,0.1)' }}>💾</div>
          <div className={s.statInfo}>
            <div className={s.statValue}>{fmtSize(totalSize)}</div>
            <div className={s.statLabel}>Total Storage</div>
          </div>
        </div>

        <div className={s.statCard}>
          <div className={s.statIcon} style={{ background: 'rgba(234,179,8,0.1)' }}>🕐</div>
          <div className={s.statInfo}>
            <div className={s.statValue} style={{ fontSize: 13, fontWeight: 600 }}>
              {latestBackup ? fmtDate(latestBackup.createdAt) : '—'}
            </div>
            <div className={s.statLabel}>Last Backup</div>
          </div>
        </div>
      </div>

      {/* ── Backup List ─────────────────────────────────────────────────────── */}
      <div className={s.sectionTitle}>Backup Files</div>
      <div className={s.tableWrap}>
        {loading ? (
          <div className={s.empty}>
            <div className={`${s.spinner} ${s.spinnerLight}`} style={{ width: 28, height: 28 }} />
            <div className={s.emptyText}>Loading backups…</div>
          </div>
        ) : backups.length === 0 ? (
          <div className={s.empty}>
            <div className={s.emptyIcon}>🗄️</div>
            <div className={s.emptyText}>No backups yet</div>
            <div className={s.emptySubtext}>
              Click "DB Backup (SQL)" or "Export Data (JSON)" to create your first backup.
            </div>
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Type</th>
                <th>Size</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.file}>
                  <td>
                    <div className={s.fileBadge}>
                      <span className={s.fileIcon}>{b.type === 'sql' ? '🗃️' : '📋'}</span>
                      {b.file}
                    </div>
                  </td>
                  <td>
                    <span className={`${s.typePill} ${b.type === 'sql' ? s.typeSql : s.typeJson}`}>
                      {b.type === 'sql' ? '⚙ SQL' : '{ } JSON'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{fmtSize(b.size)}</td>
                  <td style={{ color: 'var(--text-3)' }}>{fmtDate(b.createdAt)}</td>
                  <td>
                    <div className={s.rowActions} style={{ justifyContent: 'flex-end' }}>
                      <button
                        id={`backup-download-${b.file}`}
                        className={`${s.iconBtn} ${s.iconBtnDownload}`}
                        onClick={() => handleDownload(b.file)}
                        disabled={downloadingFile === b.file}
                        title="Download"
                      >
                        {downloadingFile === b.file ? (
                          <span className={`${s.spinner} ${s.spinnerLight}`} style={{ width: 13, height: 13 }} />
                        ) : (
                          <IoCloudDownloadOutline size={15} />
                        )}
                      </button>
                      <button
                        id={`backup-delete-${b.file}`}
                        className={`${s.iconBtn} ${s.iconBtnDelete}`}
                        onClick={() => handleDelete(b.file)}
                        title="Delete"
                      >
                        <IoTrashOutline size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Confirm Modal ───────────────────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmModal
          filename={confirmDelete}
          onConfirm={confirmDeleteFile}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
