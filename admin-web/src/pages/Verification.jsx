import React, { useEffect, useState } from 'react';
import { api, fmtDateShort, maskEmail, resolveImageUrl } from '../services/api';
import s from '../styles/Admin.module.css';
import v from '../styles/Verification.module.css';
import Pagination, { useFitPagination } from '../components/Pagination';

const STATUS = {
  unverified: {
    label: 'Unverified',
    color: '#64748B',
    bg: 'rgba(100,116,139,0.12)',
    icon: '—',
    border: 'rgba(100,116,139,0.2)',
  },
  pending: {
    label: 'Pending',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
    icon: '⏳',
    border: 'rgba(245,158,11,0.25)',
  },
  verified: {
    label: 'Verified',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
    icon: '✓',
    border: 'rgba(16,185,129,0.25)',
  },
  rejected: {
    label: 'Rejected',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    icon: '✕',
    border: 'rgba(239,68,68,0.25)',
  },
};
const TABS = [
  { key: 'pending', label: 'Pending Review', urgent: true },
  { key: 'verified', label: 'Verified', urgent: false },
  { key: 'rejected', label: 'Rejected', urgent: false },
  { key: 'unverified', label: 'No ID Submitted', urgent: false },
  { key: 'all', label: 'All', urgent: false },
];
const REJECTION_REASONS = ['Blurry Photo', 'Expired ID', 'Name Mismatch', 'Invalid ID Type'];
const AVATARS = ['#3B82F6', '#10B981', '#F97316', '#F59E0B', '#EF4444', '#8B5CF6'];
const avatarColor = (id) => AVATARS[(id || 0) % AVATARS.length];
const initials = (n) =>
  n
    ?.split(' ')
    .map((x) => x[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

function UserAvatar({ user, className, style }) {
  const [imgErr, setImgErr] = useState(false);
  const showImg = user?.avatar_url && !imgErr;

  return (
    <div
      className={className}
      style={{
        backgroundColor: avatarColor(user?.id),
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {showImg ? (
        <img
          src={resolveImageUrl(user.avatar_url)}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgErr(true)}
        />
      ) : (
        initials(user?.name)
      )}
    </div>
  );
}

export default function Verification() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [idImgError, setIdImgError] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useFitPagination(10, 60, 350);

  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0, unverified: 0, all: 0 });
  const [totalUsers, setTotalUsers] = useState(0);

  const loadData = () => {
    // Load stats
    api.get('/users/verification-stats').then(setCounts).catch(console.error);

    // Load paginated users
    const params = {
      page,
      limit: itemsPerPage,
      search,
      status: filter === 'all' ? '' : filter
    };
    api.get('/users', params)
      .then((res) => {
        setUsers(res.data || []);
        setTotalUsers(res.total || 0);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, [page, itemsPerPage, search, filter]);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  const displayedUsers = users;

  const act = async (fn) => {
    setSaving(true);
    try {
      await fn();
      await loadData();
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const autoAdvanceOrClose = () => {
    const pendingOnly = displayedUsers.filter(
      (u) => u.verification_status === 'pending' && u.id !== selected.id,
    );
    if (pendingOnly.length > 0) {
      setSelected(pendingOnly[0]);
    } else {
      setSelected(null);
    }
    setReason('');
  };

  const handleApprove = () =>
    act(async () => {
      await api.patch(`/users/${selected.id}/verify`);
      showToast(`✅ Verification Approved`, 'success');
      autoAdvanceOrClose();
    });

  const handleReject = () => {
    if (!reason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    act(async () => {
      await api.patch(`/users/${selected.id}/reject`, { reason: reason.trim() });
      showToast(`❌ Verification Rejected`, 'error');
      autoAdvanceOrClose();
    });
  };

  const handleRevoke = () => {
    if (!window.confirm(`Revoke verification for ${selected.name}?`)) return;
    act(async () => {
      await api.patch(`/users/${selected.id}/revoke`);
      setSelected(null);
    });
  };

  const handleDeleteUser = (u = selected) => {
    if (!u) return;
    if (!window.confirm(`Permanently delete citizen "${u.name}" (${u.email})? This action cannot be undone.`)) return;
    act(async () => {
      await api.delete(`/users/${u.id}`);
      showToast(`🗑️ Citizen account deleted`, 'success');
      if (selected?.id === u.id) setSelected(null);
    });
  };

  const quickApprove = (u) =>
    act(async () => {
      await api.patch(`/users/${u.id}/verify`);
    });

  const currentStatus = selected?.verification_status || 'unverified';
  const cfg = STATUS[currentStatus] || STATUS.unverified;

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>Identity Verification</h1>
          <p className={s.pageSubtitle}>Review and approve citizen identity submissions</p>
        </div>
        {counts.pending > 0 && (
          <div
            className={s.alertBanner}
            style={{
              backgroundColor: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ color: '#F59E0B', fontWeight: 800, fontSize: 15 }}>
                {counts.pending} Pending
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Awaiting your review</div>
            </div>
          </div>
        )}
      </div>



      {/* Tabs + Search */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((tab) => {
            const active = filter === tab.key;
            const sc = STATUS[tab.key];
            return (
              <button
                key={tab.key}
                className={`${v.filterTab} ${active ? v.filterTabActive : ''}`}
                style={{
                  backgroundColor: active ? (sc?.color || 'var(--blue)') + '20' : 'transparent',
                  borderColor: active ? sc?.color || 'var(--blue)' : 'var(--border)',
                  color: active ? sc?.color || 'var(--blue-light)' : 'var(--text-2)',
                }}
                onClick={() => {
                  setFilter(tab.key);
                  setSelected(null);
                  setPage(1);
                }}
              >
                {tab.urgent && counts.pending > 0 && tab.key === 'pending' && (
                  <span className={s.statusDot} style={{ background: '#F59E0B' }} />
                )}
                {tab.label}
                <span
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 99,
                    padding: '1px 7px',
                    fontSize: 11,
                  }}
                >
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>
        <div className={s.search}>
          <span className={s.searchIcon}>🔍</span>
          <input
            className={s.searchInput}
            placeholder="Search citizens…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main layout */}
      <div className={selected ? s.mainLayoutWithSide : s.mainLayout}>
        {/* Table */}
        <div className={s.tableWrap}>
          {users.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}>✅</div>
              <p className={s.emptyTitle}>No {filter === 'all' ? '' : filter} submissions</p>
            </div>
          ) : (
            <table className={s.table}>
              <thead className={s.thead}>
                <tr>
                  {[
                    { label: 'Citizen', key: 'Citizen' },
                    { label: 'Contact', key: 'Contact', hideOnSide: true },
                    { label: 'Barangay', key: 'Barangay' },
                    { label: 'ID Type', key: 'ID Type' },
                    { label: 'Status', key: 'Status' },
                    { label: 'Submitted', key: 'Submitted', hideOnSide: true },
                    { label: 'Actions', key: 'Actions', isAction: true },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`${s.th} ${col.hideOnSide ? s.hideOnSideOpen : ''} ${
                        col.isAction ? s.thActions : ''
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => {
                  const st = STATUS[u.verification_status || 'unverified'];
                  const isSel = selected?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={`${s.tr} ${s.trClickable} ${isSel ? s.trSelected : ''}`}
                      onClick={() => {
                        setSelected(isSel ? null : u);
                        setReason('');
                      }}
                    >
                      <td className={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <UserAvatar user={u} className={s.avatar} style={{ borderRadius: 10 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>
                              {u.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                              {maskEmail(u.email)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`${s.td} ${s.hideOnSideOpen}`} style={{ fontSize: 12 }}>
                        {u.phone || '—'}
                      </td>
                      <td className={s.td}>
                        <span
                          className={s.badge}
                          style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue-light)' }}
                        >
                          {u.barangay || '—'}
                        </span>
                      </td>
                      <td
                        className={s.td}
                        style={{
                          fontSize: 12,
                          color: u.id_type ? 'var(--text-1)' : 'var(--text-3)',
                        }}
                      >
                        {u.id_type || <em>Not submitted</em>}
                      </td>
                      <td className={s.td}>
                        <span
                          className={s.badge}
                          style={{
                            backgroundColor: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                          }}
                        >
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td
                        className={`${s.td} ${s.hideOnSideOpen}`}
                        style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                      >
                        {fmtDateShort(u.submitted_at)}
                      </td>
                      <td className={`${s.td} ${s.tdActions}`} onClick={(e) => e.stopPropagation()}>
                        <div className={s.actionsGroup}>
                          <button
                            className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                            onClick={() => {
                              setSelected(isSel ? null : u);
                              setReason('');
                            }}
                          >
                            {isSel ? 'Close' : 'Review'}
                          </button>
                          {(u.verification_status === 'pending' ||
                            u.verification_status === 'unverified') &&
                            !isSel && (
                              <button
                                className={v.quickApproveBtn}
                                title="Quick approve"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  quickApprove(u);
                                }}
                              >
                                ✓
                              </button>
                            )}
                          <button
                            className={`${s.btn} ${s.btnSm}`}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#EF4444',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              borderRadius: 'var(--r-sm)',
                              flexShrink: 0,
                            }}
                            title={`Delete citizen ${u.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(u);
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              setPage(p);
              setSelected(null);
            }}
            totalItems={totalUsers}
            itemsPerPage={itemsPerPage}
          />
        </div>

        {/* Detail panel */}
        {selected && (
          <>
            <div className={s.sidePanelOverlay} onClick={() => setSelected(null)} />
            <div className={s.sidePanelWrapper}>
              <div
                className={s.card}
                style={{ alignSelf: 'start', padding: 0, overflow: 'hidden' }}
              >
                <div
                  style={{
                    padding: '16px 18px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-1)',
                        marginBottom: 6,
                      }}
                    >
                      Review Submission
                    </div>
                    <span
                      className={s.badge}
                      style={{
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.border}`,
                        fontSize: 11,
                      }}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <button
                    className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                    onClick={() => setSelected(null)}
                  >
                    ✕
                  </button>
                </div>

                {/* Citizen info */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <UserAvatar
                      user={selected}
                      className={`${s.avatar} ${s.avatarLg}`}
                      style={{ borderRadius: 16 }}
                    />
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>
                        {selected.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        {maskEmail(selected.email)}
                      </div>
                    </div>
                  </div>
                  <div className={v.infoGrid}>
                    {[
                      { label: 'Phone', value: selected.phone || '—' },
                      { label: 'Barangay', value: selected.barangay || '—' },
                      { label: 'ID Type', value: selected.id_type || 'Not submitted' },
                      { label: 'ID No.', value: selected.id_number || '—' },
                      { label: 'Submitted', value: fmtDateShort(selected.submitted_at) },
                      { label: 'Registered', value: fmtDateShort(selected.created_at) },
                    ].map((x, i) => (
                      <div key={i} className={v.infoRow}>
                        <span className={s.textMuted} style={{ fontSize: 13 }}>
                          {x.label}
                        </span>
                        <span className={s.textPrimary} style={{ fontSize: 13, fontWeight: 500 }}>
                          {x.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature 6: AI Verification Status */}
                {selected.verification_status === 'verified' &&
                  selected.verified_at &&
                  selected.submitted_at && (
                    <div className={v.aiBanner} style={{ background: 'rgba(16,185,129,0.04)' }}>
                      <div
                        className={v.aiBannerInner}
                        style={{
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.2)',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>🤖</span>
                        <div>
                          <div className={v.aiBannerTitle} style={{ color: '#10B981' }}>
                            AI Auto-Verified
                          </div>
                          <div className={v.aiBannerDesc}>
                            AI matched the citizen's name on their submitted ID
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                {selected.verification_status === 'pending' && selected.id_image_url && (
                  <div className={v.aiBanner} style={{ background: 'rgba(245,158,11,0.04)' }}>
                    <div
                      className={v.aiBannerInner}
                      style={{
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.2)',
                      }}
                    >
                      <span style={{ fontSize: 16 }}>🔍</span>
                      <div>
                        <div className={v.aiBannerTitle} style={{ color: '#F59E0B' }}>
                          AI Needs Manual Review
                        </div>
                        <div className={v.aiBannerDesc}>
                          AI could not confidently match the name — please verify manually
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ID Photo */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--text-3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Submitted ID Photo
                    </span>
                    {selected.id_image_url && (
                      <button
                        className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                        onClick={() => setLightboxImg(resolveImageUrl(selected.id_image_url))}
                      >
                        Expand ↗
                      </button>
                    )}
                  </div>
                  {selected.id_image_url ? (
                    <div>
                      {!idImgError ? (
                        <div
                          className={v.idPhotoWrap}
                          style={{ minHeight: 90, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => setLightboxImg(resolveImageUrl(selected.id_image_url))}
                        >
                          <img
                            src={resolveImageUrl(selected.id_image_url)}
                            alt="ID"
                            loading="lazy"
                            decoding="async"
                            className={v.idPhotoImg}
                            onError={() => setIdImgError(true)}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed rgba(239, 68, 68, 0.3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#EF4444' }}>⚠️ Image preview could not be loaded</p>
                          <a
                            href={resolveImageUrl(selected.id_image_url)}
                            target="_blank"
                            rel="noreferrer"
                            className={`${s.btn} ${s.btnSm}`}
                            style={{ fontSize: 11, display: 'inline-block' }}
                          >
                            Open Direct Image Link ↗
                          </a>
                        </div>
                      )}
                      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                        <a
                          href={resolveImageUrl(selected.id_image_url)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 11, color: 'var(--blue-light)', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open original in new tab ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className={v.idPhotoEmpty}>
                      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📂</div>
                      <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>
                        {selected.verification_status === 'unverified'
                          ? 'Citizen has not submitted an ID yet'
                          : 'No ID photo available'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding: '16px 18px' }}>
                  {currentStatus !== 'verified' && (
                    <>
                      <label
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--text-3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Rejection Reason (required to reject)
                      </label>
                      <div style={{ marginBottom: 8 }}>
                        {REJECTION_REASONS.map((r) => (
                          <span
                            key={r}
                            className={s.quickChip}
                            onClick={() => setReason((prev) => (prev ? `${prev}, ${r}` : r))}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                      <textarea
                        className={s.textarea}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. ID photo is blurry or does not match"
                        rows={3}
                        style={{ marginBottom: 12 }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className={`${s.btn} ${s.btnPrimary}`}
                          style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.5 : 1 }}
                          onClick={handleApprove}
                          disabled={saving}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className={`${s.btn}`}
                          style={{
                            flex: 1,
                            justifyContent: 'center',
                            background: 'rgba(239,68,68,0.12)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#EF4444',
                            opacity: saving ? 0.5 : 1,
                          }}
                          onClick={handleReject}
                          disabled={saving}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </>
                  )}

                  {/* Delete User */}
                  <div style={{ marginTop: currentStatus !== 'verified' ? 14 : 0, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <button
                      className={s.btn}
                      style={{
                        width: '100%',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#EF4444',
                        fontSize: 12,
                        fontWeight: 600,
                        justifyContent: 'center',
                        gap: 6,
                        padding: '8px 12px',
                      }}
                      onClick={() => handleDeleteUser(selected)}
                      disabled={saving}
                    >
                      🗑️ Delete Citizen Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={s.toastContainer}>
          <div
            className={s.toast}
            style={{ background: toast.type === 'success' ? '#10B981' : '#EF4444' }}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className={s.lightboxOverlay} onClick={() => setLightboxImg(null)}>
          <button className={s.lightboxClose} onClick={() => setLightboxImg(null)}>
            ✕
          </button>
          <img
            src={lightboxImg}
            className={s.lightboxImage}
            alt="Full ID"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
