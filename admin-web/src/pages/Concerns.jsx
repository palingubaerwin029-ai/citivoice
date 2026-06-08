import React, { useEffect, useState } from 'react';
import { api, fmtDateShort } from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

import s from '../styles/Admin.module.css';
import Pagination, { useFitPagination } from '../components/Pagination';
import Skeleton from '../components/Skeleton';

const STATUS_COLORS = {
  Pending: '#FFB800',
  'In Progress': '#1A6BFF',
  Resolved: '#00D4AA',
  Rejected: '#FF4444',
};
const PRIORITY_COLORS = { High: '#FF4444', Medium: '#FFB800', Low: '#00D4AA' };
const SENTIMENT_EMOJI = { urgent: '🔴', frustrated: '😤', concerned: '😟', neutral: '😐' };
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['All', 'High', 'Medium', 'Low'];

export default function Concerns() {
  const [searchParams] = useSearchParams();
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('tickets');
  const [citizenPage, setCitizenPage] = useState(1);
  const [concernPage, setConcernPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useFitPagination(10, 60, 380);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = () => {
      api
        .get('/concerns')
        .then(setConcerns)
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Grouping by Citizen
  const citizensMap = concerns.reduce((acc, c) => {
    const key = c.user_id || c.user_name || 'Anonymous';
    if (!acc[key]) {
      acc[key] = {
        id: c.user_id,
        name: c.user_name || 'Anonymous',
        barangay: c.user_barangay || 'N/A',
        total: 0,
        Resolved: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        latest: c.created_at,
        concerns: [],
      };
    }
    acc[key].total++;
    if (c.status === 'Resolved') acc[key].Resolved++;
    if (c.priority) acc[key][c.priority]++;
    acc[key].concerns.push(c);
    if (new Date(c.created_at) > new Date(acc[key].latest)) {
      acc[key].latest = c.created_at;
    }
    return acc;
  }, {});

  const citizensList = Object.values(citizensMap)
    .filter((c) => {
      const s = search.toLowerCase();
      return !s || c.name.toLowerCase().includes(s) || c.barangay.toLowerCase().includes(s);
    })
    .sort((a, b) => new Date(b.latest) - new Date(a.latest));

  const filteredConcerns = (viewMode === 'tickets' ? concerns : (selectedCitizen?.concerns || []))
    .filter((c) => {
      const s = search.toLowerCase();
      const matchesSearch = !s || 
        c.title?.toLowerCase().includes(s) || 
        c.category?.toLowerCase().includes(s) ||
        (viewMode === 'tickets' && (c.user_name?.toLowerCase().includes(s) || c.user_barangay?.toLowerCase().includes(s)));

      return (
        matchesSearch &&
        (statusFilter === 'All' || c.status === statusFilter) &&
        (priorityFilter === 'All' || c.priority === priorityFilter)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'upvotes') return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === 'priority')
        return (
          ({ High: 3, Medium: 2, Low: 1 }[b.priority] || 0) -
          ({ High: 3, Medium: 2, Low: 1 }[a.priority] || 0)
        );
      if (sortBy === 'urgency') return (b.urgency_score || 50) - (a.urgency_score || 50);
      return 0;
    });

  // Pagination logic
  const displayedCitizens = citizensList.slice(
    (citizenPage - 1) * itemsPerPage,
    citizenPage * itemsPerPage,
  );
  const totalCitizenPages = Math.ceil(citizensList.length / itemsPerPage);

  const displayedConcerns = filteredConcerns.slice(
    (concernPage - 1) * itemsPerPage,
    concernPage * itemsPerPage,
  );
  const totalConcernPages = Math.ceil(filteredConcerns.length / itemsPerPage);

  // Remove early return, we will handle loading inline
  // if (loading) return <div className={s.loading}>Loading concerns...</div>;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>
            {selectedCitizen ? `👤 Concerns of ${selectedCitizen.name}` : '📋 Concerns Management'}
          </h1>
          <p className={s.pageSubtitle}>
            {selectedCitizen
              ? `${filteredConcerns.length} concerns found for this citizen`
              : viewMode === 'tickets' ? `${filteredConcerns.length} concerns city-wide` : `${citizensList.length} citizens with active concerns`}
          </p>
        </div>
        
        {!selectedCitizen && (
          <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <button className={`${s.btn} ${viewMode === 'tickets' ? s.btnPrimary : s.btnGhost}`} style={{ padding: '6px 16px', border: 'none', minWidth: 100 }} onClick={() => { setViewMode('tickets'); setConcernPage(1); }}>All Tickets</button>
            <button className={`${s.btn} ${viewMode === 'citizens' ? s.btnPrimary : s.btnGhost}`} style={{ padding: '6px 16px', border: 'none', minWidth: 100 }} onClick={() => { setViewMode('citizens'); setCitizenPage(1); }}>By Citizen</button>
          </div>
        )}

        {selectedCitizen && (
          <button
            className={`${s.btn} ${s.btnGhost}`}
            onClick={() => {
              setSelectedCitizen(null);
              setSearch('');
            }}
          >
            ← Back to Citizens
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={s.toolbar}>
        <div className={s.filterGroup}>
          <div className={s.search}>
            <span>🔍</span>
            <input
              className={s.searchInput}
              placeholder={
                viewMode === 'tickets' || selectedCitizen ? 'Search concerns or citizens...' : 'Search citizens or barangay...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={s.btnGhost} onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>
          { (selectedCitizen || viewMode === 'tickets') && (
            <select
              className={s.select}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="upvotes">Most Upvoted</option>
              <option value="priority">Highest Priority</option>
              <option value="urgency">🎯 Highest Urgency</option>
            </select>
          )}
        </div>

        { (selectedCitizen || viewMode === 'tickets') && (
          <>
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
          </>
        )}
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          {!selectedCitizen && viewMode === 'citizens' ? (
            <>
              <thead className={s.thead}>
                <tr>
                  {[
                    'Citizen',
                    'Barangay',
                    'High',
                    'Medium',
                    'Low',
                    'Total',
                    'Resolved',
                    'Latest',
                    'Action',
                  ].map((h) => (
                    <th key={h} className={s.th} style={['High', 'Medium', 'Low', 'Total', 'Resolved'].includes(h) ? { textAlign: 'center' } : {}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5,6].map(i => (
                    <tr key={i} className={s.tr}>
                      <td className={s.td}><Skeleton height="20px" /></td>
                      <td className={s.td}><Skeleton height="20px" /></td>
                      <td className={s.td}><Skeleton height="20px" /></td>
                      <td className={s.td}><Skeleton height="20px" /></td>
                      <td className={s.td}><Skeleton height="20px" /></td>
                      <td className={s.td}><Skeleton height="20px" /></td>
                      <td className={s.td}><Skeleton height="20px" /></td>
                      <td className={s.td}><Skeleton height="20px" /></td>
                      <td className={s.td}><Skeleton height="32px" /></td>
                    </tr>
                  ))
                ) : displayedCitizens.map((c) => (
                  <tr
                    key={c.id || c.name}
                    className={s.tr}
                    onClick={() => {
                      setSelectedCitizen(c);
                      setSearch('');
                      setConcernPage(1);
                    }}
                  >
                    <td className={s.td} style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                      {c.name}
                    </td>
                    <td className={s.td}>{c.barangay}</td>
                    <td className={s.td} style={{ textAlign: 'center' }}>
                      <span style={{ color: PRIORITY_COLORS.High }}>🔴 {c.High}</span>
                    </td>
                    <td className={s.td} style={{ textAlign: 'center' }}>
                      <span style={{ color: PRIORITY_COLORS.Medium }}>🟡 {c.Medium}</span>
                    </td>
                    <td className={s.td} style={{ textAlign: 'center' }}>
                      <span style={{ color: PRIORITY_COLORS.Low }}>🟢 {c.Low}</span>
                    </td>
                    <td className={s.td} style={{ fontWeight: 700, textAlign: 'center' }}>
                      {c.total - c.Resolved}
                    </td>
                    <td className={s.td} style={{ fontWeight: 700, color: '#00D4AA', textAlign: 'center' }}>
                      {c.Resolved}
                    </td>
                    <td className={s.td} style={{ fontSize: 12 }}>
                      {fmtDateShort(c.latest)}
                    </td>
                    <td className={s.td}>
                      <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}>View Concerns →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <thead className={s.thead}>
                <tr>
                  {['Concern', ...(!selectedCitizen ? ['Citizen'] : []), 'Category', 'Priority', 'Status', 'Urgency', 'Date', 'Action'].map(
                    (h) => (
                      <th key={h} className={s.th}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5,6].map(i => (
                    <tr key={i} className={s.tr}>
                      <td className={s.td}><Skeleton height="36px" /></td>
                      {!selectedCitizen && <td className={s.td}><Skeleton height="36px" /></td>}
                      <td className={s.td}><Skeleton height="24px" width="60px" /></td>
                      <td className={s.td}><Skeleton height="24px" width="80px" /></td>
                      <td className={s.td}><Skeleton height="24px" width="70px" /></td>
                      <td className={s.td}><Skeleton height="20px" width="40px" /></td>
                      <td className={s.td}><Skeleton height="20px" width="80px" /></td>
                      <td className={s.td}><Skeleton height="32px" width="90px" /></td>
                    </tr>
                  ))
                ) : displayedConcerns.map((c) => (
                  <tr
                    key={c.id}
                    className={s.tr}
                    onClick={() => navigate(`/concerns/${c.id}`)}
                  >
                    <td className={s.td}>
                      <div style={{ color: 'var(--text-1)', fontWeight: 600, marginBottom: 2 }}>
                        {c.title}
                      </div>
                      <div style={{ color: 'var(--text-3)', fontSize: 11 }}>
                        {c.description?.slice(0, 55)}...
                      </div>
                    </td>
                    {!selectedCitizen && (
                      <td className={s.td}>
                        <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{c.user_name || 'Anonymous'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.user_barangay}</div>
                      </td>
                    )}
                    <td className={s.td}>
                      <span className={s.badge} style={{ background: "rgba(26,107,255,0.13)", color: "var(--primary-light)" }}>{c.category?.split(' ')[0]}</span>
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
                    <td className={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>{SENTIMENT_EMOJI[c.sentiment] || '😐'}</span>
                        <div style={{ width: 40, height: 5, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: 5, borderRadius: 99, width: `${c.urgency_score || 50}%`, background: (c.urgency_score || 50) >= 80 ? '#FF4444' : (c.urgency_score || 50) >= 60 ? '#FFB800' : '#00D4AA' }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: (c.urgency_score || 50) >= 80 ? '#FF4444' : (c.urgency_score || 50) >= 60 ? '#FFB800' : '#00D4AA' }}>{c.urgency_score || 50}</span>
                      </div>
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
            </>
          )}
        </table>
        {(selectedCitizen ? filteredConcerns : citizensList).length === 0 && (
          <div className={s.empty}>
            <div className={s.emptyIcon}>📭</div>
            <p className={s.emptyTitle}>No matches found</p>
          </div>
        )}

        <Pagination
          page={!selectedCitizen && viewMode === 'citizens' ? citizenPage : concernPage}
          totalPages={!selectedCitizen && viewMode === 'citizens' ? totalCitizenPages : totalConcernPages}
          onPageChange={!selectedCitizen && viewMode === 'citizens' ? setCitizenPage : setConcernPage}
          totalItems={!selectedCitizen && viewMode === 'citizens' ? citizensList.length : filteredConcerns.length}
          itemsPerPage={itemsPerPage}
        />
      </div>
    </div>
  );
}
