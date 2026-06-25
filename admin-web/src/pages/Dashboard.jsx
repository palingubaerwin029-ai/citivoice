import { useEffect, useState } from 'react';
import { api, fmtDateShort } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import s from '../styles/Admin.module.css';
import d from '../styles/Dashboard.module.css';
import Skeleton from '../components/Skeleton';
import AnimatedCounter from '../components/AnimatedCounter';

const STATUS_COLORS = {
  Pending: '#F59E0B',
  'In Progress': '#3B82F6',
  Resolved: '#10B981',
  Rejected: '#EF4444',
};
const CAT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];
const TT = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-1)',
    fontSize: 12,
  },
  cursor: { fill: 'rgba(120,150,200,0.05)' },
};
const STAT_CONFIGS = [
  { key: 'total', label: 'Total Concerns', icon: '◉', color: '#3B82F6' },
  { key: 'pending', label: 'Pending Review', icon: '◷', color: '#F59E0B' },
  { key: 'inProgress', label: 'In Progress', icon: '◌', color: '#60A5FA' },
  { key: 'resolved', label: 'Resolved', icon: '◉', color: '#10B981' },
  { key: 'rejected', label: 'Rejected', icon: '◎', color: '#EF4444' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);

  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getLocalDate();
  const [filterMode, setFilterMode] = useState(() => localStorage.getItem('dashboardFilterMode') || 'daily');
  const [singleDate, setSingleDate] = useState(() => localStorage.getItem('dashboardSingleDate') || todayStr);
  const [singleMonth, setSingleMonth] = useState(() => localStorage.getItem('dashboardSingleMonth') || todayStr.slice(0, 7));
  const [startDate, setStartDate] = useState(() => localStorage.getItem('dashboardStartDate') || todayStr);
  const [endDate, setEndDate] = useState(() => localStorage.getItem('dashboardEndDate') || todayStr);

  useEffect(() => {
    localStorage.setItem('dashboardFilterMode', filterMode);
    localStorage.setItem('dashboardSingleDate', singleDate);
    localStorage.setItem('dashboardSingleMonth', singleMonth);
    localStorage.setItem('dashboardStartDate', startDate);
    localStorage.setItem('dashboardEndDate', endDate);
  }, [filterMode, singleDate, singleMonth, startDate, endDate]);

  // Auto-reset date filters when the day changes (e.g., app left open overnight)
  useEffect(() => {
    const checkDayChange = () => {
      const now = getLocalDate();
      if (now !== singleDate) {
        setSingleDate(now);
        setSingleMonth(now.slice(0, 7));
        setStartDate(now);
        setEndDate(now);
      }
    };

    const dayCheck = setInterval(checkDayChange, 60000); // Check every 60 seconds
    return () => clearInterval(dayCheck);
  }, [singleDate]);

  useEffect(() => {
    const fetchData = () => {
      api
        .get('/concerns')
        .then((res) => setConcerns(res.data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredConcerns = concerns.filter((c) => {
    if (!c.created_at) return true;
    if (filterMode === 'all-time') return true;

    const d = new Date(c.created_at).getTime();
    let start, end;

    if (filterMode === 'daily') {
      start = new Date(singleDate).setHours(0, 0, 0, 0);
      end = new Date(singleDate).setHours(23, 59, 59, 999);
    } else if (filterMode === 'monthly') {
      const [y, m] = singleMonth.split('-');
      start = new Date(y, m - 1, 1).getTime();
      end = new Date(y, m, 0, 23, 59, 59, 999).getTime();
    } else {
      start = new Date(startDate).setHours(0, 0, 0, 0);
      end = new Date(endDate).setHours(23, 59, 59, 999);
    }

    return d >= start && d <= end;
  });

  const total = filteredConcerns.length;
  const pending = filteredConcerns.filter((c) => c.status === 'Pending').length;
  const inProgress = filteredConcerns.filter((c) => c.status === 'In Progress').length;
  const resolved = filteredConcerns.filter((c) => c.status === 'Resolved').length;
  const rejected = filteredConcerns.filter((c) => c.status === 'Rejected').length;
  const rate = total ? Math.round((resolved / total) * 100) : 0;
  const stats = { total, pending, inProgress, resolved, rejected, rate };

  const catData = Object.entries(
    filteredConcerns.reduce((a, c) => {
      a[c.category] = (a[c.category] || 0) + 1;
      return a;
    }, {}),
  ).map(([name, value]) => ({ name: name.split(' ')[0], value }));

  const statusData = Object.entries(STATUS_COLORS).map(([name, color]) => ({
    name,
    value: filteredConcerns.filter((c) => c.status === name).length,
    color,
  }));

  const urgent = filteredConcerns
    .filter((c) => c.priority === 'High' && c.status === 'Pending')
    .slice(0, 5);
  const recent = filteredConcerns.slice(0, 10);

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>Dashboard</h1>
          <p className={s.pageSubtitle}>
            {new Date().toLocaleDateString('en-PH', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className={d.dateFilterRow}>
          <div className={d.dateFilterGroup}>
            <select
              className={s.select}
              style={{ padding: '6px 10px', width: 'auto', minWidth: 100 }}
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Range</option>
              <option value="all-time">All Time</option>
            </select>

            {filterMode === 'daily' && (
              <input
                type="date"
                className={s.input}
                style={{ padding: '6px 10px', width: 'auto', margin: 0 }}
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
              />
            )}

            {filterMode === 'monthly' && (
              <input
                type="month"
                className={s.input}
                style={{ padding: '6px 10px', width: 'auto', margin: 0 }}
                value={singleMonth}
                onChange={(e) => setSingleMonth(e.target.value)}
              />
            )}

            {filterMode === 'custom' && (
              <>
                <span style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 600 }}>From:</span>
                <input
                  type="date"
                  className={s.input}
                  style={{ padding: '6px 10px', width: 'auto', margin: 0 }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span
                  style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 600, marginLeft: 4 }}
                >
                  To:
                </span>
                <input
                  type="date"
                  className={s.input}
                  style={{ padding: '6px 10px', width: 'auto', margin: 0 }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </>
            )}
          </div>
          <div className={d.liveIndicator}>
            <span className={d.liveDot} />
            Live data
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={`${s.statsRow} stagger-1`}>
        {STAT_CONFIGS.map((cfg) => (
          <div
            key={cfg.key}
            className={s.statCard}
            style={{ '--accent-color': cfg.color, cursor: 'pointer', transition: 'transform 0.2s' }}
            onClick={() => {
              if (cfg.key === 'total') navigate('/concerns');
              else if (cfg.key === 'pending') navigate('/concerns?status=Pending');
              else if (cfg.key === 'inProgress') navigate('/concerns?status=In Progress');
              else if (cfg.key === 'resolved') navigate('/concerns?status=Resolved');
              else if (cfg.key === 'rejected') navigate('/concerns?status=Rejected');
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div className={s.statIconWrap}>{cfg.icon}</div>
            <div className={s.statValue}>
              {loading ? (
                <Skeleton height="30px" width="60px" />
              ) : (
                <AnimatedCounter value={stats[cfg.key]} suffix={cfg.isRate ? '%' : ''} />
              )}
            </div>
            <div className={s.statLabel}>{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className={`stagger-2 ${s.grid3}`} style={{ marginBottom: 16 }}>
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Concerns by Category</span>
          </div>
          <div style={{ padding: '16px 16px 8px' }}>
            {loading ? (
              <Skeleton height="200px" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catData} barSize={22}>
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-2)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="var(--text-2)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Bar
                    dataKey="value"
                    radius={[5, 5, 0, 0]}
                    onClick={(data) =>
                      navigate(`/concerns?search=${encodeURIComponent(data.name)}`)
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    {catData.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Status Breakdown</span>
          </div>
          <div style={{ padding: '8px 0' }}>
            {loading ? (
              <Skeleton height="160px" style={{ margin: 16 }} />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={70}
                    dataKey="value"
                    paddingAngle={3}
                    onClick={(data) =>
                      navigate(`/concerns?status=${encodeURIComponent(data.name)}`)
                    }
                    style={{ cursor: 'pointer' }}
                  >
                    {statusData.map((e, i) => (
                      <Cell key={i} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TT} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className={s.flexCol} style={{ padding: '0 16px 12px', gap: 6 }}>
              {statusData.map((s2) => (
                <div key={s2.name} className={d.legendRow}>
                  <span className={s.statusDot} style={{ background: s2.color }} />
                  <span style={{ color: 'var(--text-2)', flex: 1 }}>{s2.name}</span>
                  <span style={{ color: s2.color, fontWeight: 700 }}>
                    {loading ? <Skeleton width="20px" height="12px" /> : s2.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Resolution Rate</span>
          </div>
          <div className={d.resolutionCard}>
            <div className={d.resolutionValue}>
              {loading ? (
                <Skeleton height="50px" width="100px" style={{ margin: '0 auto' }} />
              ) : (
                <AnimatedCounter value={rate} suffix="%" />
              )}
            </div>
            <div className={d.resolutionLabel}>of concerns resolved</div>
            <div className={s.progressTrack}>
              <div
                className={s.progressFill}
                style={{ background: 'var(--green)', width: `${rate}%` }}
              />
            </div>
            <div className={d.resolutionStats}>
              <span style={{ color: 'var(--green)' }}>✓ {loading ? '...' : resolved} resolved</span>
              <span style={{ color: 'var(--amber)' }}>⏳ {loading ? '...' : pending} pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div
        className="stagger-3"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 14 }}
      >
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle} style={{ color: 'var(--red)' }}>
              🔴 Urgent — High Priority
            </span>
            <span
              className={s.badge}
              style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)', fontSize: 11 }}
            >
              {urgent.length}
            </span>
          </div>
          <div>
            {loading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height="40px" />
                ))}
              </div>
            ) : urgent.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>✅</div>
                <p className={s.emptyTitle}>All clear</p>
              </div>
            ) : (
              urgent.map((c) => (
                <div key={c.id} className={d.infoRow}>
                  <div>
                    <div className={s.textPrimary} style={{ fontSize: 13, marginBottom: 2 }}>
                      {c.title}
                    </div>
                    <div className={s.textMuted}>
                      {c.user_name} · {c.user_barangay}
                    </div>
                  </div>
                  <a
                    href={`/concerns/${c.id}`}
                    style={{ fontSize: 12, color: 'var(--blue-light)', fontWeight: 600 }}
                  >
                    Review →
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Recent Submissions</span>
          </div>
          <table className={s.table} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead className={s.thead}>
              <tr>
                {['Concern', 'Category', 'Status', 'Filed'].map((h) => (
                  <th key={h} className={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className={s.tr}>
                      <td className={s.td}>
                        <Skeleton height="20px" />
                      </td>
                      <td className={s.td}>
                        <Skeleton height="20px" />
                      </td>
                      <td className={s.td}>
                        <Skeleton height="20px" />
                      </td>
                      <td className={s.td}>
                        <Skeleton height="20px" />
                      </td>
                    </tr>
                  ))
                : recent.map((c) => (
                    <tr
                      key={c.id}
                      className={`${s.tr} ${s.trClickable}`}
                      onClick={() => (window.location = `/concerns/${c.id}`)}
                    >
                      <td className={s.td}>
                        <span style={{ color: 'var(--text-1)', fontWeight: 500, fontSize: 13 }}>
                          {c.title?.slice(0, 40)}
                          {c.title?.length > 40 ? '…' : ''}
                        </span>
                      </td>
                      <td className={s.td}>
                        <span
                          className={s.badge}
                          style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue-light)' }}
                        >
                          {c.category?.split(' ')[0]}
                        </span>
                      </td>
                      <td className={s.td}>
                        <span
                          className={s.badge}
                          style={{
                            background: (STATUS_COLORS[c.status] || '#475569') + '22',
                            color: STATUS_COLORS[c.status] || '#94A3B8',
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td
                        className={s.td}
                        style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                      >
                        {fmtDateShort(c.created_at)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
