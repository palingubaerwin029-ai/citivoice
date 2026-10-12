import React, { useEffect, useState } from 'react';
import { api, fmtDateShort, resolveImageUrl } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { socket } from '../services/socket';
import { useToast } from '../components/ToastProvider';

import s from '../styles/Admin.module.css';
import cStyles from '../styles/Concerns.module.css';
import Pagination, { useFitPagination } from '../components/Pagination';
import Skeleton from '../components/Skeleton';

const STATUS_COLORS = {
  Pending: '#FFB800',
  'In Progress': '#1A6BFF',
  Resolved: '#00D4AA',
  Rejected: '#FF4444',
};
const PRIORITY_COLORS = { High: '#FF4444', Medium: '#FFB800', Low: '#00D4AA' };
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['All', 'High', 'Medium', 'Low'];

export default function Concerns() {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const [concerns, setConcerns] = useState([]);
  const [totalConcerns, setTotalConcerns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // Note: For full DB sorting, we'd add this to backend. For now, we fetch sorted by newest.
  const [concernPage, setConcernPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useFitPagination(10, 60, 380);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const navigate = useNavigate();

  // Close lightbox on ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxImg(null);
    };
    if (lightboxImg) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxImg]);

  const loadData = () => {
    // We only send status if it's not All
    const params = {
      page: concernPage,
      limit: itemsPerPage,
      search,
      status: statusFilter === 'All' ? '' : statusFilter,
      // For priority/sort we could add backend support later, keeping it lightweight
    };

    api
      .get('/concerns', params)
      .then((res) => {
        setConcerns(res.data || []);
        setTotalConcerns(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    loadData();

    const onNewConcern = (newConcern) => {
      if (statusFilter !== 'All' && newConcern.status !== statusFilter) return;
      if (search && !newConcern.title.toLowerCase().includes(search.toLowerCase())) return;

      addToast(`New concern: ${newConcern.title}`);

      setConcerns((prev) => {
        const newList = [newConcern, ...prev];
        return newList.slice(0, itemsPerPage); // keep pagination size
      });
      setTotalConcerns((prev) => prev + 1);
    };

    const onUpdateConcern = (updatedConcern) => {
      setConcerns((prev) => prev.map((c) => (c.id === updatedConcern.id ? updatedConcern : c)));
    };

    socket.on('new_concern', onNewConcern);
    socket.on('update_concern', onUpdateConcern);

    return () => {
      socket.off('new_concern', onNewConcern);
      socket.off('update_concern', onUpdateConcern);
    };
  }, [concernPage, itemsPerPage, search, statusFilter, priorityFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setConcernPage(1);
  }, [search, statusFilter, priorityFilter, sortBy]);

  const totalConcernPages = Math.ceil(totalConcerns / itemsPerPage);
  
  // Local filtering for priority if not supported in backend yet
  const displayedConcerns = concerns.filter(c => 
    priorityFilter === 'All' || c.priority === priorityFilter
  ).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'upvotes') return (b.upvotes || 0) - (a.upvotes || 0);
    if (sortBy === 'priority')
      return (
        ({ High: 3, Medium: 2, Low: 1 }[b.priority] || 0) -
        ({ High: 3, Medium: 2, Low: 1 }[a.priority] || 0)
      );
    return 0;
  });

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>📋 Concerns Management</h1>
          <p className={s.pageSubtitle}>
            {totalConcerns} concerns city-wide
          </p>
        </div>

      </div>

      {/* Filters */}
      <div className={s.toolbar}>
        <div className={s.filterGroup}>
          <div className={s.search}>
            <span>🔍</span>
            <input
              className={s.searchInput}
              placeholder="Search concerns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={s.btnGhost} onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>
          <select className={s.select} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="upvotes">Most Upvoted</option>
            <option value="priority">Highest Priority</option>
          </select>
        </div>

        <div className={s.filterGroup}>
          <span className={s.filterGroupLabel}>Status:</span>
          {STATUSES.map((status) => (
            <button
              key={status}
              className={`${s.chip} ${statusFilter === status ? s.chipActive : ''}`}
              style={
                statusFilter === status && status !== 'All'
                  ? {
                      borderColor: STATUS_COLORS[status] || 'var(--primary)',
                      color: STATUS_COLORS[status] || 'var(--primary)',
                      backgroundColor: (STATUS_COLORS[status] || '#1A6BFF') + '22',
                    }
                  : {}
              }
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <div className={s.filterGroup}>
          <span className={s.filterGroupLabel}>Priority:</span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              className={`${s.chip} ${priorityFilter === p ? s.chipActive : ''}`}
              style={
                priorityFilter === p && p !== 'All'
                  ? {
                      borderColor: PRIORITY_COLORS[p],
                      color: PRIORITY_COLORS[p],
                      backgroundColor: PRIORITY_COLORS[p] + '22',
                    }
                  : {}
              }
              onClick={() => setPriorityFilter(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <table className={s.table}>
              <thead className={s.thead}>
                <tr>
                  {[
                    'Concern',
                    'Citizen',
                    'Category',
                    'Priority',
                    'Status',
                    'Date',
                    'Action',
                  ].map((h) => (
                    <th key={h} className={s.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [1, 2, 3, 4, 5, 6].map((i) => (
                      <tr key={i} className={s.tr}>
                        <td className={s.td}>
                          <Skeleton height="36px" />
                        </td>
                        <td className={s.td}>
                          <Skeleton height="36px" />
                        </td>
                        <td className={s.td}>
                          <Skeleton height="24px" width="60px" />
                        </td>
                        <td className={s.td}>
                          <Skeleton height="24px" width="80px" />
                        </td>
                        <td className={s.td}>
                          <Skeleton height="24px" width="70px" />
                        </td>
                        <td className={s.td}>
                          <Skeleton height="20px" width="40px" />
                        </td>
                        <td className={s.td}>
                          <Skeleton height="32px" width="90px" />
                        </td>
                      </tr>
                    ))
                  : displayedConcerns.map((c) => (
                      <tr key={c.id} className={s.tr} onClick={() => navigate(`/concerns/${c.id}`)}>
                        <td className={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {c.image_url ? (
                              <div
                                style={{
                                  position: 'relative',
                                  width: 40,
                                  height: 40,
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  cursor: 'zoom-in',
                                  border: '1px solid var(--border)',
                                  background: 'var(--surface-2)',
                                }}
                                title="Click to view attached picture"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxImg(resolveImageUrl(c.image_url));
                                  setLightboxTitle(c.title || 'Concern Photo');
                                }}
                              >
                                <img
                                  src={resolveImageUrl(c.image_url)}
                                  alt="Attachment"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: 10,
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                                >
                                  🔍
                                </div>
                              </div>
                            ) : null}
                            <div style={{ minWidth: 0 }}>
                              <div className={cStyles.ticketTitle}>{c.title}</div>
                              <div className={cStyles.ticketDesc}>{c.description?.slice(0, 55)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className={s.td}>
                          <div className={cStyles.ticketUser}>{c.user_name || 'Anonymous'}</div>
                          <div className={cStyles.ticketBarangay}>{c.user_barangay}</div>
                        </td>
                        <td className={s.td}>
                          <span
                            className={s.badge}
                            style={{
                              background: 'rgba(26,107,255,0.13)',
                              color: 'var(--primary-light)',
                            }}
                          >
                            {c.category}
                          </span>
                        </td>
                        <td className={s.td}>
                          <span
                            className={s.badge}
                            style={{
                              color: PRIORITY_COLORS[c.priority],
                              backgroundColor: (PRIORITY_COLORS[c.priority] || '#8899BB') + '22',
                            }}
                          >
                            {c.priority === 'High' ? '🔴' : c.priority === 'Medium' ? '🟡' : '🟢'}{' '}
                            {c.priority}
                          </span>
                        </td>
                        <td className={s.td}>
                          <span
                            className={s.badge}
                            style={{
                              color: STATUS_COLORS[c.status],
                              backgroundColor: (STATUS_COLORS[c.status] || '#8899BB') + '22',
                            }}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className={s.td} style={{ fontSize: 12 }}>
                          {fmtDateShort(c.created_at)}
                        </td>
                        <td className={s.td}>
                          <button
                            className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                            onClick={() => navigate(`/concerns/${c.id}`)}
                          >
                            Review →
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
        </table>
        {concerns.length === 0 && (
          <div className={s.empty}>
            <div className={s.emptyIcon}>📭</div>
            <p className={s.emptyTitle}>No matches found</p>
          </div>
        )}

        <Pagination
          page={concernPage}
          totalPages={totalConcernPages}
          onPageChange={setConcernPage}
          totalItems={totalConcerns}
          itemsPerPage={itemsPerPage}
        />
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(8, 12, 24, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setLightboxImg(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 960,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📸</span>
              <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: 15, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {lightboxTitle || 'Attached Picture'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a
                href={lightboxImg}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#fff',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
              >
                <span>↗</span> Open Full Tab
              </a>
              <button
                type="button"
                style={{
                  background: 'rgba(255, 255, 255, 0.16)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#fff',
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onClick={() => setLightboxImg(null)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)')}
                title="Close (ESC)"
              >
                ✕
              </button>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '82vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImg}
              alt="Preview"
              style={{
                maxWidth: '92vw',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: 14,
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.6)',
              display: 'flex',
              gap: 16,
            }}
          >
            <span>💡 Click outside or press <strong style={{ color: '#fff' }}>ESC</strong> to close</span>
          </div>
        </div>
      )}
    </div>
  );
}

