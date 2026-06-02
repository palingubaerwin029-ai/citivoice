import React, { useEffect, useState } from 'react';
import { api, fmtDateShort } from '../services/api';
import { useNavigate } from 'react-router-dom';

import s from '../styles/Admin.module.css';
import Pagination, { useFitPagination } from '../components/Pagination';

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
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
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

  const filteredConcerns = (selectedCitizen?.concerns || [])
    .filter((c) => {
      const s = search.toLowerCase();
      return (
        (!s || c.title?.toLowerCase().includes(s)) &&
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

  if (loading) return <div className={s.loading}>Loading concerns...</div>;

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
              : `${citizensList.length} citizens with active concerns`}
          </p>
        </div>
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
                selectedCitizen ? 'Search concerns...' : 'Search citizens or barangay...'
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
          {selectedCitizen && (
            <select
              className={s.select}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="upvotes">Most Upvoted</option>
              <option value="priority">Highest Priority</option>
            </select>
          )}
        </div>

        {selectedCitizen && (
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
          {!selectedCitizen ? (
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
                {displayedCitizens.map((c) => (
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
                  {['Concern', 'Category', 'Priority', 'Status', 'Upvotes', 'Date', 'Action'].map(
                    (h) => (
                      <th key={h} className={s.th}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {displayedConcerns.map((c) => (
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
                    <td className={s.td} style={{ color: '#00D4AA', fontWeight: 700 }}>
                      👍 {c.upvotes || 0}
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
          page={selectedCitizen ? concernPage : citizenPage}
          totalPages={selectedCitizen ? totalConcernPages : totalCitizenPages}
          onPageChange={selectedCitizen ? setConcernPage : setCitizenPage}
          totalItems={selectedCitizen ? filteredConcerns.length : citizensList.length}
          itemsPerPage={itemsPerPage}
          onItemsPerPage={(n) => { setItemsPerPage(n); setCitizenPage(1); setConcernPage(1); }}
        />
      </div>
    </div>
  );
}
