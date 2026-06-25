import React, { useEffect, useState } from 'react';
import { api, fmtDateShort, maskEmail, resolveImageUrl } from '../services/api';
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

export default function Users() {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userConcerns, setUserConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brgyFilter, setBrgyFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useFitPagination(10, 60, 320);

  // Note: we can't get ALL barangays dynamically without a separate endpoint if we paginate.
  // For now, let's hardcode a few or rely on a static list if needed.
  const barangays = ['All', 'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4'];

  useEffect(() => {
    setLoading(true);
    const params = {
      page,
      limit: itemsPerPage,
      search,
      barangay: brgyFilter === 'All' ? '' : brgyFilter
    };
    api.get('/users', params)
      .then((res) => {
        setUsers(res.data || []);
        setTotalUsers(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, itemsPerPage, search, brgyFilter]);

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
  }, [search, brgyFilter]);

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
        <div className={u.statRow}>
          {[
            { l: 'Total', v: totalUsers, c: 'var(--blue-light)' },
            { l: 'Barangays', v: barangays.length - 1, c: 'var(--green)' },
          ].map((x) => (
            <div key={x.l} className={s.miniStat}>
              <div className={s.miniStatValue} style={{ color: x.c }}>
                {x.v}
              </div>
              <div className={s.miniStatLabel}>{x.l}</div>
            </div>
          ))}
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
                      <td className={s.td} style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                        {u.reports_count || 0}
                      </td>
                      <td className={s.td} style={{ fontWeight: 700, color: 'var(--green)' }}>
                        {u.resolved_count || 0}
                      </td>
                      <td className={s.td} style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {fmtDateShort(u.created_at)}
                      </td>
                      <td className={s.td}>
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}>
                          {isSel ? 'Close' : 'View'}
                        </button>
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
              <div className={s.card} style={{ alignSelf: 'start' }}>
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
            <div className={u.recentSection}>
              <div className={u.recentTitle}>Recent Concerns</div>
              {userConcerns.map((c) => (
                  <a key={c.id} href={`/concerns/${c.id}`} className={u.recentItem}>
                    <div>
                      <div className={u.recentItemTitle}>{c.title?.slice(0, 35)}…</div>
                      <div className={u.recentItemMeta}>{c.category?.split(' ')[0]}</div>
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
          </div>
        </div>
      </>
    )}
  </div>
    </div>
  );
}
