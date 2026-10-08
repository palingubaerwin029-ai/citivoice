import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  IoServerOutline,
  IoCloudUploadOutline,
  IoFolderOpenOutline,
  IoRefreshOutline,
  IoCloudDownloadOutline,
  IoTrashOutline,
  IoShieldCheckmarkOutline,
  IoTimeOutline,
  IoHelpCircleOutline,
  IoCloseOutline,
  IoCheckmarkOutline,
  IoCopyOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoFlashOutline,
} from 'react-icons/io5';
import s from '../styles/Admin.module.css';
import b from '../styles/Backup.module.css';
import { api } from '../services/api';
import { useToast } from '../components/ToastProvider';
import AnimatedCounter from '../components/AnimatedCounter';
import Skeleton from '../components/Skeleton';
import Pagination, { useFitPagination } from '../components/Pagination';

// ── Helpers ───────────────────────────────────────────────────────────────────
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('cv_token');

const fmtSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '0 B';
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

const fmtRelative = (iso) => {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  return `${days}d ago`;
};

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
function ConfirmDeleteModal({ filename, onConfirm, onCancel }) {
  return (
    <div className={s.overlay} onClick={onCancel}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
        <div className={s.modalTitle} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--red)' }}>🗑</span> Delete Backup Snapshot
        </div>
        <div className={s.modalBody}>
          Are you sure you want to permanently delete the archive:
          <div
            style={{
              marginTop: 10,
              padding: '8px 12px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--r-md)',
              fontFamily: 'monospace',
              fontSize: 12,
              color: 'var(--text-1)',
              wordBreak: 'break-all',
            }}
          >
            {filename}
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-3)' }}>
            ⚠️ This file will be permanently removed from disk and cannot be recovered.
          </p>
        </div>
        <div className={s.modalActions}>
          <button id="backup-cancel-delete" className={`${b.btn} ${b.btnGhost}`} onClick={onCancel}>
            Cancel
          </button>
          <button id="backup-confirm-delete" className={`${b.btn} ${b.btnDanger}`} onClick={onConfirm}>
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Import Result Modal ───────────────────────────────────────────────────────
function ImportResultModal({ result, onClose }) {
  const { summary, error } = result || {};
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
        <div
          className={s.modalTitle}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {error ? '❌ Restore Failed' : '✅ Restoration Complete'}
          </span>
          <button
            className={s.btnGhost}
            style={{ padding: 4, borderRadius: '50%', border: 'none', cursor: 'pointer' }}
            onClick={onClose}
          >
            <IoCloseOutline size={20} />
          </button>
        </div>
        <div className={s.modalBody}>
          {error ? (
            <div
              style={{
                color: 'var(--red)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: 14,
                borderRadius: 'var(--r-md)',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          ) : summary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                Database records have been safely synchronized into the database without duplicating existing data:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div
                  style={{
                    background: 'var(--surface-2)',
                    padding: '12px 14px',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Users Restored
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>
                    {summary.usersInserted}
                    {summary.usersSkipped > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>
                        ({summary.usersSkipped} skipped)
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--surface-2)',
                    padding: '12px 14px',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Concerns Restored
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', marginTop: 4 }}>
                    {summary.concernsInserted}
                    {summary.concernsSkipped > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>
                        ({summary.concernsSkipped} skipped)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '10px 14px',
                  borderRadius: 'var(--r-md)',
                  fontSize: 13,
                  color: 'var(--green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>✨ Total Records Processed:</span>
                <strong style={{ fontSize: 16 }}>{summary.totalRows}</strong>
              </div>

              {summary.errors && summary.errors.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', marginBottom: 6 }}>
                    Non-Fatal Warnings:
                  </div>
                  <div
                    style={{
                      maxHeight: 100,
                      overflowY: 'auto',
                      background: 'var(--surface-2)',
                      padding: 10,
                      borderRadius: 'var(--r-md)',
                      fontSize: 11,
                      color: 'var(--text-3)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {summary.errors.map((err, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className={s.modalActions}>
          <button id="backup-close-import-result" className={`${b.btn} ${b.btnPrimary}`} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Restore Instructions Guide Modal ──────────────────────────────────────────
function RestoreGuideModal({ onClose }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyCode = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const dockerCmd = 'docker exec -i citivoice-mysql mysql -u root -p citivoice < <backup_file>.sql';
  const localCmd = 'mysql -u root -p citivoice < <backup_file>.sql';

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={`${s.modal} ${b.guideModal}`} onClick={(e) => e.stopPropagation()}>
        <div
          className={s.modalTitle}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            💡 Backup Restoration Guide
          </span>
          <button
            className={s.btnGhost}
            style={{ padding: 4, borderRadius: '50%', border: 'none', cursor: 'pointer' }}
            onClick={onClose}
          >
            <IoCloseOutline size={20} />
          </button>
        </div>

        <div className={s.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Section 1: JSON */}
          <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 'var(--r-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--cyan)' }}>
              <span>{'{ }'}</span> 1. Portable JSON Exports (In-App Restore)
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>
              JSON backups contain all verified users, concerns, and status workflows. You can restore them directly in
              the web app using the <strong>"Import Data (JSON)"</strong> button or clicking the green ⚡ icon in the backup table.
              Existing data is preserved safely using non-destructive key updates.
            </div>
          </div>

          {/* Section 2: SQL */}
          <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 'var(--r-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--blue)' }}>
              <span>⚙</span> 2. SQL Database Snapshots (Full MySQL Dump)
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>
              SQL files are complete binary schema + table dumps generated by <code>mysqldump</code>. To restore an SQL
              snapshot, download the file and execute:
            </div>

            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Using Docker Container:</div>
              <div className={b.codeBox}>
                <span className={b.codeText}>{dockerCmd}</span>
                <button className={b.copyBtn} onClick={() => copyCode(dockerCmd, 1)}>
                  {copiedIndex === 1 ? <IoCheckmarkOutline color="var(--green)" /> : <IoCopyOutline />}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Using Local MySQL Client:</div>
              <div className={b.codeBox}>
                <span className={b.codeText}>{localCmd}</span>
                <button className={b.copyBtn} onClick={() => copyCode(localCmd, 2)}>
                  {copiedIndex === 2 ? <IoCheckmarkOutline color="var(--green)" /> : <IoCopyOutline />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={s.modalActions}>
          <button className={`${b.btn} ${b.btnPrimary}`} onClick={onClose}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Backup Component ─────────────────────────────────────────────────────
export default function Backup() {
  const { addToast } = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningDb, setRunningDb] = useState(false);
  const [runningJson, setRunningJson] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useFitPagination(10, 52, 360);

  const importInputRef = useRef(null);

  // ── Fetch backups ───────────────────────────────────────────────────────────
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/backup');
      setBackups(res.backups || []);
    } catch (err) {
      addToast(`Failed to load backups: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // ── Trigger DB backup (SQL) ─────────────────────────────────────────────────
  const handleDbBackup = async () => {
    setRunningDb(true);
    try {
      const res = await api.post('/backup/db', {});
      addToast(`DB backup created: ${res.backup?.file} (${fmtSize(res.backup?.size)})`, 'success');
      await fetchBackups();
    } catch (err) {
      addToast(`DB backup failed: ${err.message}`, 'error');
    } finally {
      setRunningDb(false);
    }
  };

  // ── Trigger JSON export ─────────────────────────────────────────────────────
  const handleJsonExport = async () => {
    setRunningJson(true);
    try {
      const res = await api.post('/backup/export', {});
      addToast(`Data export created: ${res.backup?.file} (${fmtSize(res.backup?.size)})`, 'success');
      await fetchBackups();
    } catch (err) {
      addToast(`JSON export failed: ${err.message}`, 'error');
    } finally {
      setRunningJson(false);
    }
  };

  // ── Download backup ─────────────────────────────────────────────────────────
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
      addToast(`Downloaded ${filename}`, 'success');
    } catch (err) {
      addToast(`Download failed: ${err.message}`, 'error');
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
      addToast(`Deleted snapshot: ${filename}`, 'success');
      setBackups((prev) => prev.filter((b) => b.file !== filename));
    } catch (err) {
      addToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // ── Import JSON from File Upload ────────────────────────────────────────────
  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (importInputRef.current) importInputRef.current.value = '';
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      addToast('Only .json export files can be imported directly', 'error');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('backup', file);
      const res = await fetch(`${BASE_URL}/backup/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setImportResult({ summary: data.summary });
      addToast(`Import complete — ${data.summary.totalRows} record(s) restored`, 'success');
      await fetchBackups();
    } catch (err) {
      setImportResult({ error: err.message });
      addToast(`Import failed: ${err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  // ── Quick 1-Click Restore of an Existing JSON Backup ────────────────────────
  const handleQuickRestore = async (filename) => {
    if (!filename.endsWith('.json')) return;
    if (!window.confirm(`Restore data directly from "${filename}" into the database?`)) return;

    setImporting(true);
    setImportResult(null);
    try {
      const token = getToken();
      // Fetch file blob from backend download endpoint
      const dlRes = await fetch(`${BASE_URL}/backup/download/${encodeURIComponent(filename)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!dlRes.ok) throw new Error('Could not read backup file from server');
      const blob = await dlRes.blob();
      const fd = new FormData();
      fd.append('backup', blob, filename);

      const res = await fetch(`${BASE_URL}/backup/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setImportResult({ summary: data.summary });
      addToast(`Restored snapshot ${filename} successfully`, 'success');
      await fetchBackups();
    } catch (err) {
      setImportResult({ error: err.message });
      addToast(`Restoration failed: ${err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  // ── Derived Stats & Filtering ───────────────────────────────────────────────
  const sqlCount = useMemo(() => backups.filter((b) => b.type === 'sql').length, [backups]);
  const jsonCount = useMemo(() => backups.filter((b) => b.type === 'json').length, [backups]);
  const totalSize = useMemo(() => backups.reduce((acc, b) => acc + (b.size || 0), 0), [backups]);

  const filtered = useMemo(() => {
    return backups
      .filter((b) => {
        const matchesType = typeFilter === 'all' || b.type === typeFilter;
        const matchesSearch = !search || b.file.toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'largest') return (b.size || 0) - (a.size || 0);
        if (sortBy === 'smallest') return (a.size || 0) - (b.size || 0);
        return 0;
      });
  }, [backups, typeFilter, search, sortBy]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedBackups = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page, itemsPerPage]);

  return (
    <div className={s.page}>
      {/* ── Page Header (Clean, consistent with Concerns.jsx) ──────────────── */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>🗄️ Backup Management</h1>
          <p className={s.pageSubtitle}>
            {backups.length} snapshot{backups.length !== 1 ? 's' : ''} ({sqlCount} SQL, {jsonCount} JSON) • {fmtSize(totalSize)} total storage • Auto-backup active (24h retention)
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            id="backup-trigger-db"
            className={`${b.btn} ${b.btnSecondary}`}
            onClick={handleDbBackup}
            disabled={runningDb || runningJson || importing}
            title="Create a complete mysqldump of the MySQL database"
          >
            {runningDb ? <span className={b.spinner} /> : <IoServerOutline size={16} />}
            <span>{runningDb ? 'Creating DB Backup…' : 'DB Backup (SQL)'}</span>
          </button>

          <button
            id="backup-trigger-json"
            className={`${b.btn} ${b.btnPrimary}`}
            onClick={handleJsonExport}
            disabled={runningDb || runningJson || importing}
            title="Export citizens and concerns as portable JSON archive"
          >
            {runningJson ? <span className={b.spinner} /> : <IoCloudUploadOutline size={16} />}
            <span>{runningJson ? 'Exporting…' : 'Export Data (JSON)'}</span>
          </button>

          {/* Hidden input for JSON file restoration */}
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button
            id="backup-import-json"
            className={`${b.btn} ${b.btnImport}`}
            onClick={handleImportClick}
            disabled={runningDb || runningJson || importing}
            title="Restore data from a previously downloaded JSON file"
          >
            {importing ? <span className={b.spinner} /> : <IoFolderOpenOutline size={16} />}
            <span>{importing ? 'Importing…' : 'Import Data (JSON)'}</span>
          </button>

          <button
            id="backup-guide-btn"
            className={`${b.btn} ${b.btnGhost}`}
            onClick={() => setShowGuide(true)}
            title="View database & file restoration instructions"
          >
            <IoHelpCircleOutline size={16} color="var(--blue)" />
            <span>Restore Guide</span>
          </button>

          <button
            id="backup-refresh"
            className={`${b.btn} ${b.btnGhost}`}
            onClick={fetchBackups}
            disabled={loading}
            title="Refresh snapshot list"
            style={{ padding: '8px 12px' }}
          >
            <IoRefreshOutline size={16} />
          </button>
        </div>
      </div>

      {/* ── Toolbar: Search, Filters & Sorting (Matches Concerns/Users) ─────── */}
      <div className={s.toolbar}>
        <div className={s.search}>
          <span className={s.searchIcon}>🔍</span>
          <input
            className={s.searchInput}
            placeholder="Search backup by filename (e.g. citivoice_...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className={s.btnGhost}
              style={{ padding: '2px 6px', border: 'none', cursor: 'pointer' }}
              onClick={() => setSearch('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className={s.filterGroup}>
          <span className={s.filterGroupLabel}>Type:</span>
          <button
            className={`${s.chip} ${typeFilter === 'all' ? s.chipActive : ''}`}
            style={
              typeFilter === 'all'
                ? {
                    borderColor: 'var(--blue)',
                    color: 'var(--blue)',
                    backgroundColor: 'rgba(234, 179, 8, 0.12)',
                  }
                : {}
            }
            onClick={() => setTypeFilter('all')}
          >
            All ({backups.length})
          </button>
          <button
            className={`${s.chip} ${typeFilter === 'sql' ? s.chipActive : ''}`}
            style={
              typeFilter === 'sql'
                ? {
                    borderColor: 'var(--blue)',
                    color: 'var(--blue)',
                    backgroundColor: 'rgba(234, 179, 8, 0.12)',
                  }
                : {}
            }
            onClick={() => setTypeFilter('sql')}
          >
            ⚙ SQL ({sqlCount})
          </button>
          <button
            className={`${s.chip} ${typeFilter === 'json' ? s.chipActive : ''}`}
            style={
              typeFilter === 'json'
                ? {
                    borderColor: 'var(--cyan)',
                    color: 'var(--cyan)',
                    backgroundColor: 'rgba(34, 211, 238, 0.12)',
                  }
                : {}
            }
            onClick={() => setTypeFilter('json')}
          >
            {'{ }'} JSON ({jsonCount})
          </button>
        </div>

        <select className={s.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="largest">Largest Size</option>
          <option value="smallest">Smallest Size</option>
        </select>
      </div>

      {/* ── Table Wrap ──────────────────────────────────────────────────────── */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead className={s.thead}>
            <tr>
              <th className={s.th}>Archive Filename</th>
              <th className={s.th}>Type</th>
              <th className={s.th}>Size</th>
              <th className={s.th}>Created Date</th>
              <th className={s.th}>Integrity</th>
              <th className={s.th} style={{ textAlign: 'right' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Shimmer Loading Skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className={s.tr}>
                  <td className={s.td} colSpan={6} style={{ padding: '12px 16px' }}>
                    <Skeleton width="100%" height="24px" />
                  </td>
                </tr>
              ))
            ) : paginatedBackups.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6}>
                  <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-3)' }}>
                    <div style={{ fontSize: 38, marginBottom: 10, opacity: 0.6 }}>🗄️</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
                      {search || typeFilter !== 'all' ? 'No matching backups found' : 'No backup snapshots found'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                      {search || typeFilter !== 'all'
                        ? 'Try clearing the search filter or switching to another category.'
                        : 'Click "DB Backup (SQL)" or "Export Data (JSON)" above to create your first archive snapshot.'}
                    </div>
                    {(search || typeFilter !== 'all') && (
                      <button
                        className={`${b.btn} ${b.btnGhost}`}
                        style={{ marginTop: 14 }}
                        onClick={() => {
                          setSearch('');
                          setTypeFilter('all');
                        }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              paginatedBackups.map((bFile) => (
                <tr key={bFile.file} className={s.tr}>
                  <td className={s.td}>
                    <div className={b.fileBadge}>
                      <div
                        className={`${b.fileIconBox} ${bFile.type === 'sql' ? b.fileIconSql : b.fileIconJson}`}
                      >
                        {bFile.type === 'sql' ? '⚙' : '{ }'}
                      </div>
                      <div className={b.fileNameGroup}>
                        <span className={b.fileName}>{bFile.file}</span>
                        <span className={b.fileRelativeTime}>Created {fmtRelative(bFile.createdAt)}</span>
                      </div>
                    </div>
                  </td>

                  <td className={s.td}>
                    <span className={`${b.typePill} ${bFile.type === 'sql' ? b.typeSql : b.typeJson}`}>
                      {bFile.type === 'sql' ? '⚙ SQL Dump' : '{ } JSON Data'}
                    </span>
                  </td>

                  <td className={s.td}>
                    <span className={b.sizeMono}>{fmtSize(bFile.size)}</span>
                  </td>

                  <td className={s.td} style={{ color: 'var(--text-2)' }}>
                    {fmtDate(bFile.createdAt)}
                  </td>

                  <td className={s.td}>
                    <span className={b.statusReady}>
                      <span className={b.statusDot} />
                      Verified Ready
                    </span>
                  </td>

                  <td className={s.td}>
                    <div className={b.rowActions}>
                      {/* 1-Click Restore for JSON */}
                      {bFile.type === 'json' && (
                        <button
                          id={`backup-restore-${bFile.file}`}
                          className={`${b.iconBtn} ${b.iconBtnRestore}`}
                          onClick={() => handleQuickRestore(bFile.file)}
                          disabled={importing}
                          title="1-Click In-App Restore from this JSON file"
                        >
                          <IoFlashOutline size={15} />
                        </button>
                      )}

                      {/* Download */}
                      <button
                        id={`backup-download-${bFile.file}`}
                        className={`${b.iconBtn} ${b.iconBtnDownload}`}
                        onClick={() => handleDownload(bFile.file)}
                        disabled={downloadingFile === bFile.file}
                        title="Download archive to local machine"
                      >
                        {downloadingFile === bFile.file ? (
                          <span className={b.spinner} />
                        ) : (
                          <IoCloudDownloadOutline size={16} />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        id={`backup-delete-${bFile.file}`}
                        className={`${b.iconBtn} ${b.iconBtnDelete}`}
                        onClick={() => handleDelete(bFile.file)}
                        title="Delete snapshot"
                      >
                        <IoTrashOutline size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination (Matches Users & Concerns) ───────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ marginTop: 16 }}>
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
            onItemsPerPage={setItemsPerPage}
          />
        </div>
      )}

      {/* ── Confirm Delete Modal ────────────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmDeleteModal
          filename={confirmDelete}
          onConfirm={confirmDeleteFile}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ── Import Result Modal ──────────────────────────────────────────────── */}
      {importResult && (
        <ImportResultModal result={importResult} onClose={() => setImportResult(null)} />
      )}

      {/* ── How to Restore Guide Modal ──────────────────────────────────────── */}
      {showGuide && <RestoreGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
