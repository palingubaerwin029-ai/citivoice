import React, { useEffect, useState } from 'react';
import { api, fmtDateShort, maskEmail, resolveImageUrl, getCategoryConfig } from '../services/api';
import s from '../styles/Admin.module.css';
import u from '../styles/Users.module.css';
import Pagination, { useFitPagination } from '../components/Pagination';

const AVATARS = ['#3B82F6', '#10B981', '#F97316', '#F59E0B', '#EF4444', '#8B5CF6'];
const AC = (id) => AVATARS[(id || 0) % AVATARS.length];
const initials = (name) =>
  name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
const SC = {
  Pending: '#F59E0B',
  'In Progress': '#3B82F6',
  Resolved: '#10B981',
  Rejected: '#EF4444',
};

const STATUS = {
  unverified: {
    label: 'Unverified',
    color: 'var(--text-3)',
    bg: 'rgba(100, 116, 139, 0.12)',
    icon: '—',
    border: 'rgba(100, 116, 139, 0.2)',
  },
  pending: {
    label: 'Pending',
    color: 'var(--amber)',
    bg: 'rgba(245, 158, 11, 0.12)',
    icon: '⏳',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  verified: {
    label: 'Verified',
    color: 'var(--green)',
    bg: 'rgba(16, 185, 129, 0.12)',
    icon: '✓',
    border: 'rgba(16, 185, 129, 0.25)',
  },
  rejected: {
    label: 'Rejected',
    color: 'var(--red)',
    bg: 'rgba(239, 68, 68, 0.12)',
    icon: '✕',
    border: 'rgba(239, 68, 68, 0.25)',
  },
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userConcerns, setUserConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brgyFilter, setBrgyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [vStats, setVStats] = useState({ pending: 0, verified: 0, rejected: 0, unverified: 0, all: 0 });
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useFitPagination(10, 60, 320);


  const [lightboxImg, setLightboxImg] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [idImgError, setIdImgError] = useState(false);

  // Note: we can't get ALL barangays dynamically without a separate endpoint if we paginate.
  // For now, let's hardcode a few or rely on a static list if needed.
  const barangays = ['All', 'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'];

  const handleDeleteConfirmed = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      if (selected?.id === userToDelete.id) {
        setSelected(null);
      }
      setUserToDelete(null);
      loadUsers();
      loadStats();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const loadStats = () => {
    api.get('/users/verification-stats')
      .then((res) => {
        if (res) setVStats(res);
      })
      .catch(console.error);
  };

  const loadUsers = () => {
    setLoading(true);
    const params = {
      page,
      limit: itemsPerPage,
      search,
      barangay: brgyFilter === 'All' ? '' : brgyFilter,
      status: statusFilter === 'All' ? '' : statusFilter.toLowerCase(),
    };
    api.get('/users', params)
      .then((res) => {
        setUsers(res.data || []);
        setTotalUsers(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [page, itemsPerPage, search, brgyFilter, statusFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (selected) {
      api.get('/concerns', { userId: selected.id, limit: 5 })
        .then(res => setUserConcerns(res.data || []))
        .catch(console.error);
    } else {
      setUserConcerns([]);
    }
  }, [selected]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, brgyFilter, statusFilter]);



  // Pagination
  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  const displayedUsers = users;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>Citizens</h1>
          <p className={s.pageSubtitle}>{users.length} registered users</p>
        </div>
      </div>



      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div className={s.search}>
          <span className={s.searchIcon}>🔍</span>
          <input
            className={s.searchInput}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-3)',
                cursor: 'pointer',
              }}
              onClick={() => setSearch('')}
            >
              ✕
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            className={s.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {['All', 'Verified', 'Pending', 'Unverified', 'Rejected'].map((st) => (
              <option key={st} value={st}>
                {st === 'All' ? 'All Verification' : `${st} Status`}
              </option>
            ))}
          </select>
          <select
            className={s.select}
            value={brgyFilter}
            onChange={(e) => setBrgyFilter(e.target.value)}
          >
            {barangays.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'All Barangays' : b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={selected ? s.mainLayoutWithSide : s.mainLayout}>
        {/* Table */}
        <div className={s.tableWrap}>
          {loading ? (
            <div className={s.loading}>Loading…</div>
          ) : (
            <table className={s.table}>
              <thead className={s.thead}>
                <tr>
                  {[
                    'Citizen',
                    'Contact',
                    'Barangay',
                    'Status',
                    'Reports',
                    'Resolved',
                    'Member Since',
                    'Actions',
                  ].map((h) => (
                    <th key={h} className={s.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => {
                  const isSel = selected?.id === u.id;
                  const statusInfo = STATUS[u.verification_status || 'unverified'] || STATUS.unverified;
                  return (
                    <tr
                      key={u.id}
                      className={`${s.tr} ${s.trClickable} ${isSel ? s.trSelected : ''}`}
                      onClick={() => setSelected(isSel ? null : u)}
                    >
                      <td className={s.td}>
                        <div className={u.tableAvatarWrap}>
                          <div
                            className={`${s.avatar} ${s.avatarSm}`}
                            style={{ background: AC(u.id), overflow: 'hidden' }}
                          >
                            {u.avatar_url ? (
                              <img src={resolveImageUrl(u.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              initials(u.name)
                            )}
                          </div>
                          <div>
                            <div className={u.tableAvatarInfo}>{u.name}</div>
                            <div className={u.tableAvatarEmail}>{maskEmail(u.email)}</div>
                          </div>
                        </div>
                      </td>
                      <td className={s.td} style={{ fontSize: 12 }}>
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
                      <td className={s.td}>
                        <span
                          className={s.badge}
                          style={{
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.border}`,
                            fontSize: 11
                          }}
                        >
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className={s.td} style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                        {u.reports_count || 0}
                      </td>
                      <td className={s.td} style={{ fontWeight: 700, color: 'var(--green)' }}>
                        {u.resolved_count || 0}
                      </td>
                      <td className={s.td} style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {fmtDateShort(u.created_at)}
                      </td>
                      <td className={s.td} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                            onClick={() => {
                              setSelected(isSel ? null : u);
                              setIdImgError(false);
                            }}
                          >
                            {isSel ? 'Close' : 'View'}
                          </button>
                          <button
                            className={`${s.btn} ${s.btnSm}`}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#EF4444',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              borderRadius: 'var(--r-sm)',
                            }}
                            title={`Delete citizen ${u.name}`}
                            onClick={() => setUserToDelete(u)}
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
          {!loading && users.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}>👤</div>
              <p className={s.emptyTitle}>No citizens found</p>
            </div>
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

        {/* Side panel */}
        {selected && (
          <>
            <div className={s.sidePanelOverlay} onClick={() => setSelected(null)} />
            <div className={s.sidePanelWrapper}>
              <div className={s.card} style={{ alignSelf: 'start', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className={u.sidePanelHeader}>
                  <div
                    className={`${s.avatar} ${s.avatarLg}`}
                    style={{ background: AC(selected.id), borderRadius: 'var(--r-xl)', overflow: 'hidden' }}
                  >
                    {selected.avatar_url ? (
                      <img src={resolveImageUrl(selected.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      initials(selected.name)
                    )}
                  </div>
                  <button
                    className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                    onClick={() => setSelected(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className={u.sidePanelNameWrap}>
                  <div className={u.sidePanelName}>{selected.name}</div>
                  <span
                    className={s.badge}
                    style={{
                      background: 'rgba(59,130,246,0.1)',
                      color: 'var(--blue-light)',
                      fontSize: 11,
                    }}
                  >
                    🏙 Citizen
                  </span>
                </div>
                <div className={u.metricsGrid}>
                  {[
                    { l: 'Reports', v: selected.reports_count || 0, c: 'var(--blue-light)' },
                    { l: 'Resolved', v: selected.resolved_count || 0, c: 'var(--green)' },
                  ].map((x) => (
                    <div key={x.l} className={u.metricCard}>
                      <div className={u.metricValue} style={{ color: x.c }}>
                        {x.v}
                      </div>
                      <div className={u.metricLabel}>{x.l}</div>
                    </div>
                  ))}
                </div>
                <div
                  className={s.infoGrid}
                  style={{
                    borderTop: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 12,
                  }}
                >
                  {[
                    { l: 'Email', v: selected.email },
                    { l: 'Phone', v: selected.phone || '—' },
                    { l: 'Barangay', v: selected.barangay || '—' },
                    { l: 'Joined', v: fmtDateShort(selected.created_at) },
                  ].map((x, i) => (
                    <div key={i} className={s.infoRow}>
                      <span className={s.infoLabel}>{x.l}</span>
                      <span className={s.infoValue}>{x.l === 'Email' ? maskEmail(x.v) : x.v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
                  <div className={u.recentTitle} style={{ marginBottom: 8 }}>Identity & Verification</div>
                  <div className={s.infoGrid} style={{ marginBottom: 12 }}>
                    {[
                      {
                        l: 'Status',
                        v: (
                          <span
                            className={s.badge}
                            style={{
                              background: STATUS[selected.verification_status || 'unverified']?.bg,
                              color: STATUS[selected.verification_status || 'unverified']?.color,
                              border: `1px solid ${STATUS[selected.verification_status || 'unverified']?.border}`,
                              fontSize: 10
                            }}
                          >
                            {STATUS[selected.verification_status || 'unverified']?.icon} {STATUS[selected.verification_status || 'unverified']?.label}
                          </span>
                        )
                      },
                      { l: 'ID Type', v: selected.id_type || '—' },
                      { l: 'ID Number', v: selected.id_number || '—' },
                    ].map((x, i) => (
                      <div key={i} className={s.infoRow}>
                        <span className={s.infoLabel}>{x.l}</span>
                        <span className={s.infoValue}>{x.v}</span>
                      </div>
                    ))}
                  </div>

                  {selected.id_image_url ? (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div className={u.recentTitle} style={{ fontSize: 10, margin: 0 }}>Submitted Document</div>
                        <a
                          href={resolveImageUrl(selected.id_image_url)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 11, color: 'var(--blue-light)', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open in tab ↗
                        </a>
                      </div>
                      {!idImgError ? (
                        <div
                          className={u.idImageWrap}
                          style={{ position: 'relative', borderRadius: 'var(--r-md)', overflow: 'hidden', cursor: 'zoom-in', background: 'var(--surface-2)', minHeight: 80 }}
                          onClick={() => setLightboxImg(resolveImageUrl(selected.id_image_url))}
                        >
                          <img
                            src={resolveImageUrl(selected.id_image_url)}
                            alt="ID Preview"
                            style={{ width: '100%', maxHeight: 180, objectFit: 'contain', display: 'block', background: '#000' }}
                            onError={() => setIdImgError(true)}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 11,
                              fontWeight: 600,
                              opacity: 0,
                              transition: 'opacity 0.2s',
                            }}
                            className={u.idImageHoverText}
                          >
                            🔍 Click to preview
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px dashed rgba(239,68,68,0.3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                          <p style={{ margin: '0 0 6px 0', fontSize: 12, color: '#EF4444' }}>Preview failed to load</p>
                          <a
                            href={resolveImageUrl(selected.id_image_url)}
                            target="_blank"
                            rel="noreferrer"
                            className={`${s.btn} ${s.btnSm}`}
                            style={{ fontSize: 11, display: 'inline-block' }}
                          >
                            View Direct Image Link
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-3)', fontSize: 11, fontStyle: 'italic', marginBottom: 12, padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                      No verification document submitted.
                    </div>
                  )}


                </div>

                <div className={u.recentSection}>
                  <div className={u.recentTitle}>Recent Concerns</div>
                  {userConcerns.map((c) => (
                    <a key={c.id} href={`/concerns/${c.id}`} className={u.recentItem}>
                      <div>
                        <div
                          className={u.recentItemMeta}
                          style={{
                            color: getCategoryConfig(c.category).color,
                            fontWeight: 600,
                          }}
                        >
                          {getCategoryConfig(c.category).icon} {c.category?.split(' ')[0] || 'General'}
                        </div>
                      </div>
                      <span
                        className={s.badge}
                        style={{
                          fontSize: 10,
                          background: (SC[c.status] || '#475569') + '18',
                          color: SC[c.status] || '#94A3B8',
                        }}
                      >
                        {c.status}
                      </span>
                    </a>
                  ))}
                  {userConcerns.length === 0 && <p className={u.recentEmpty}>No concerns yet</p>}
                </div>

                {/* Danger Zone: Delete User */}
                <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.04)' }}>
                  <button
                    className={`${s.btn}`}
                    style={{
                      width: '100%',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#EF4444',
                      fontWeight: 600,
                      justifyContent: 'center',
                      gap: 8,
                      padding: '9px 14px',
                    }}
                    onClick={() => setUserToDelete(selected)}
                  >
                    🗑️ Delete Citizen Account
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Enlarged ID Document"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-lg)'
            }}
          />
          <button
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setLightboxImg(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Confirm Delete Citizen Modal */}
      {userToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(3px)',
            padding: 20,
          }}
          onClick={() => !deleting && setUserToDelete(null)}
        >
          <div
            className={s.card}
            style={{
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'var(--surface)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#EF4444',
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                  Delete Citizen Account
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Are you sure you want to delete <strong>{userToDelete.name}</strong> ({userToDelete.email})?
              Their account, ID records, and preferences will be permanently removed.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                className={`${s.btn} ${s.btnGhost}`}
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className={s.btn}
                style={{
                  background: '#EF4444',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  opacity: deleting ? 0.6 : 1,
                }}
                onClick={handleDeleteConfirmed}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
