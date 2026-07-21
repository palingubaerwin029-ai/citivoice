import React, { useEffect, useState } from 'react';
import { api, fmtDateShort, getPinBarangay } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import s from '../styles/Admin.module.css';
import r from '../styles/Reports.module.css';

const SC = {
  Pending: '#F59E0B',
  'In Progress': '#3B82F6',
  Resolved: '#10B981',
  Rejected: '#EF4444',
};
const CC = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];
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

const PriorityLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.07) return null;
  const R = Math.PI / 180,
    r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text
      x={cx + r * Math.cos(-midAngle * R)}
      y={cy + r * Math.sin(-midAngle * R)}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >{`${(percent * 100).toFixed(0)}%`}</text>
  );
};

export default function Reports() {
  const [concerns, setConcerns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const defaultStart = new Date();
  defaultStart.setDate(1); // First day of current month
  const [startDate, setStartDate] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const user = JSON.parse(localStorage.getItem('cv_user') || '{}');

  useEffect(() => {
    Promise.all([api.get('/concerns'), api.get('/users')])
      .then(([c, u]) => {
        setConcerns(c.data || []);
        setUsers(u.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = concerns.filter((c) => {
    if (!c.created_at) return true;
    const d = new Date(c.created_at).getTime();
    const start = new Date(startDate).setHours(0, 0, 0, 0);
    const end = new Date(endDate).setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  });

  const total = filtered.length;
  const resolved = filtered.filter((c) => c.status === 'Resolved').length;
  const inProgress = filtered.filter((c) => c.status === 'In Progress').length;
  const pending = filtered.filter((c) => c.status === 'Pending').length;
  const rejected = filtered.filter((c) => c.status === 'Rejected').length;
  const rate = total ? Math.round((resolved / total) * 100) : 0;
  const avgUp = total ? (filtered.reduce((s, c) => s + (c.upvotes || 0), 0) / total).toFixed(1) : 0;
  const hiPrio = filtered.filter((c) => c.priority === 'High').length;
  const medPrio = filtered.filter((c) => c.priority === 'Medium').length;
  const lowPrio = filtered.filter((c) => c.priority === 'Low').length;
  const totalUp = filtered.reduce((s, c) => s + (c.upvotes || 0), 0);

  const catData = Object.entries(
    filtered.reduce((a, c) => {
      const k = c.category || 'Other';
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: name.split(' ')[0], full: name, value }));

  const statusData = Object.entries(SC).map(([name, color]) => ({
    name,
    value: filtered.filter((c) => c.status === name).length,
    color,
  }));

  const prioData = [
    { name: 'High', value: hiPrio, color: '#EF4444' },
    { name: 'Medium', value: medPrio, color: '#F59E0B' },
    { name: 'Low', value: lowPrio, color: '#10B981' },
  ];

  const monthly = (() => {
    const m = {};
    concerns.forEach((c) => {
      if (!c.created_at) return;
      const d = new Date(c.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!m[k]) m[k] = { month: k, submitted: 0, completed: 0, pending: 0, inProgress: 0 };
      m[k].submitted++;
      if (c.status === 'Resolved') m[k].completed++;
      if (c.status === 'Pending') m[k].pending++;
      if (c.status === 'In Progress') m[k].inProgress++;
    });
    return Object.values(m)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  })();

  const brgData = Object.entries(
    filtered.reduce((a, c) => {
      const brgy = getPinBarangay(c);
      if (brgy) a[brgy] = (a[brgy] || 0) + 1;
      return a;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const brgPrintData = Object.entries(
    filtered.reduce((a, c) => {
      const b = getPinBarangay(c);
      if (!a[b]) a[b] = { total: 0, resolved: 0, pending: 0, inProgress: 0, high: 0 };
      a[b].total++;
      if (c.status === 'Resolved') a[b].resolved++;
      if (c.status === 'Pending') a[b].pending++;
      if (c.status === 'In Progress') a[b].inProgress++;
      if (c.priority === 'High') a[b].high++;
      return a;
    }, {}),
  ).sort((a, b) => b[1].total - a[1].total);

  const catPrintData = Object.entries(
    filtered.reduce((a, c) => {
      const cat = c.category || 'Other';
      if (!a[cat]) a[cat] = { total: 0, resolved: 0, high: 0 };
      a[cat].total++;
      if (c.status === 'Resolved') a[cat].resolved++;
      if (c.priority === 'High') a[cat].high++;
      return a;
    }, {}),
  ).sort((a, b) => b[1].total - a[1].total);

  const topUp = [...filtered].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)).slice(0, 5);

  if (loading) return <div className={s.loading}>Loading analytics…</div>;

  const KPIS = [
    { label: 'Total Concerns', value: total, color: '#3B82F6', sub: 'In date range' },
    { label: 'Resolution Rate', value: `${rate}%`, color: '#10B981', sub: `${resolved} resolved` },
    { label: 'Avg Upvotes', value: avgUp, color: '#F59E0B', sub: `${totalUp} total votes` },
    {
      label: 'High Priority',
      value: hiPrio,
      color: '#EF4444',
      sub: `${total ? Math.round((hiPrio / total) * 100) : 0}% of total`,
    },
    { label: 'In Progress', value: inProgress, color: '#60A5FA', sub: 'Active now' },
    { label: 'Citizens', value: users.length, color: '#8B5CF6', sub: 'Registered' },
  ];

  return (
    <div className={s.page}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* OFFICIAL PRINT REPORT DOCUMENT (Only visible when printing window.print) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className={s.printOnly} style={{ padding: '10px 15px', background: '#fff', color: '#0f172a' }}>
        {/* Letterhead */}
        <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: '2px solid #0f172a', paddingBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#475569' }}>
            Republic of the Philippines · City of Kabankalan
          </h3>
          <h1 style={{ margin: '4px 0', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
            CITIVOICE COMMUNITY CONCERNS & ANALYTICS REPORT
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
            Official Civic Issue Tracking & Administrative Summary
          </p>
        </div>

        {/* Metadata Header */}
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            fontSize: 11,
            color: '#334155',
            marginBottom: 16,
            background: '#f8fafc',
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid #cbd5e1',
          }}
        >
          <div>
            <strong>Date Generated:</strong> {new Date().toLocaleString()}
          </div>
          <div>
            <strong>Reporting Filter:</strong> {startDate} to {endDate}
          </div>
          <div>
            <strong>Prepared By:</strong> {user?.name || 'Administrator'}
          </div>
        </div>

        {/* Executive Summary Metrics Table */}
        <div style={{ marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '1px solid #94a3b8',
              paddingBottom: 4,
              color: '#0f172a',
              marginBottom: 8,
            }}
          >
            Executive Summary Metrics
          </h3>
          <table className={r.printTable} style={{ border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e1' }}>Metric Name</th>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>
                  Value
                </th>
                <th style={{ padding: '6px 10px', borderBottom: '1px solid #cbd5e1' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Total Concerns Filed</td>
                <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{total}</td>
                <td style={{ padding: '6px 10px', color: '#475569' }}>Total concerns reported in date range</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Resolution Rate</td>
                <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                  {rate}%
                </td>
                <td style={{ padding: '6px 10px', color: '#475569' }}>{resolved} resolved out of {total} total</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Active / In Progress</td>
                <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                  {inProgress}
                </td>
                <td style={{ padding: '6px 10px', color: '#475569' }}>Currently under active department resolution</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>Pending Triage</td>
                <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#d97706' }}>
                  {pending}
                </td>
                <td style={{ padding: '6px 10px', color: '#475569' }}>Awaiting admin review & assignment</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 10px', fontWeight: 600 }}>High Priority / Urgent</td>
                <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
                  {hiPrio}
                </td>
                <td style={{ padding: '6px 10px', color: '#475569' }}>High urgency concerns requiring priority action</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Monthly Submission Trend Table */}
        <div style={{ marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '1px solid #94a3b8',
              paddingBottom: 4,
              color: '#0f172a',
              marginBottom: 8,
            }}
          >
            Monthly Submission & Resolution Trend
          </h3>
          <table className={r.printTable} style={{ border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px 10px' }}>Month</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Submitted</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Completed</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>In Progress</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Pending</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{m.month}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{m.submitted}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: '#059669', fontWeight: 700 }}>
                    {m.completed}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: '#2563eb', fontWeight: 700 }}>
                    {m.inProgress}
                  </td>
                  <td style={{ padding: '6px 10px', textAlign: 'center', color: '#d97706', fontWeight: 700 }}>
                    {m.pending}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Barangays Breakdown Table */}
        <div style={{ marginBottom: 16 }}>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '1px solid #94a3b8',
              paddingBottom: 4,
              color: '#0f172a',
              marginBottom: 8,
            }}
          >
            Barangays Breakdown (By Issue Location)
          </h3>
          <table className={r.printTable} style={{ border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px 10px' }}>Rank</th>
                <th style={{ padding: '6px 10px' }}>Barangay Name</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Total Reports</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Resolved</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>In Progress</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Pending</th>
                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Share (%)</th>
              </tr>
            </thead>
            <tbody>
              {brgPrintData.map(([brgy, data], i) => {
                const pct = total ? Math.round((data.total / total) * 100) : 0;
                return (
                  <tr key={brgy} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>#{i + 1}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{brgy}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}>{data.total}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#059669' }}>{data.resolved}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#2563eb' }}>{data.inProgress}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#d97706' }}>{data.pending}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detailed Concerns Registry */}
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderBottom: '1px solid #94a3b8',
              paddingBottom: 4,
              color: '#0f172a',
              marginBottom: 8,
            }}
          >
            Reported Concerns Registry
          </h3>
          <table className={r.printTable} style={{ border: '1px solid #cbd5e1' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '6px 8px' }}>ID</th>
                <th style={{ padding: '6px 8px' }}>Title</th>
                <th style={{ padding: '6px 8px' }}>Category</th>
                <th style={{ padding: '6px 8px' }}>Barangay</th>
                <th style={{ padding: '6px 8px' }}>Priority</th>
                <th style={{ padding: '6px 8px' }}>Status</th>
                <th style={{ padding: '6px 8px' }}>Date Filed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>#{c.id}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>{c.title}</td>
                  <td style={{ padding: '6px 8px' }}>{c.category}</td>
                  <td style={{ padding: '6px 8px' }}>{getPinBarangay(c)}</td>
                  <td
                    style={{
                      padding: '6px 8px',
                      fontWeight: 600,
                      color: c.priority === 'High' ? '#dc2626' : c.priority === 'Medium' ? '#d97706' : '#059669',
                    }}
                  >
                    {c.priority}
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      fontWeight: 700,
                      color:
                        c.status === 'Resolved'
                          ? '#059669'
                          : c.status === 'In Progress'
                          ? '#2563eb'
                          : c.status === 'Pending'
                          ? '#d97706'
                          : '#dc2626',
                    }}
                  >
                    {c.status}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 11 }}>{fmtDateShort(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Official Signatures */}
        <div
          style={{
            display: 'flex',
            justify: 'space-between',
            marginTop: 30,
            paddingTop: 16,
            borderTop: '1px solid #cbd5e1',
            fontSize: 11,
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Prepared By:</p>
            <div
              style={{
                marginTop: 30,
                borderTop: '1px solid #94a3b8',
                width: 180,
                paddingTop: 4,
                textAlign: 'center',
              }}
            >
              <strong>{user?.name || 'Administrator'}</strong>
              <div style={{ fontSize: 10, color: '#64748b' }}>CitiVoice System Admin</div>
            </div>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>Approved & Noted By:</p>
            <div
              style={{
                marginTop: 30,
                borderTop: '1px solid #94a3b8',
                width: 180,
                paddingTop: 4,
                textAlign: 'center',
              }}
            >
              <strong>City Administration Office</strong>
              <div style={{ fontSize: 10, color: '#64748b' }}>Kabankalan City, Negros Occidental</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* WEB DASHBOARD UI (Hidden when printing window.print) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className={s.noPrint}>
        <div className={s.pageHeader}>
          <div className={s.pageTitleGroup}>
            <h1 className={s.pageTitle}>Reports & Analytics</h1>
            <p className={s.pageSubtitle}>CitiVoice performance overview</p>
          </div>
          <div className={r.dateFilterRow}>
            <div className={r.dateFilterGroup}>
              <span className={r.dateFilterLabel}>From:</span>
              <input
                type="date"
                className={s.input}
                style={{ padding: '6px 10px', width: 'auto', margin: 0 }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className={r.dateFilterLabel} style={{ marginLeft: 4 }}>
                To:
              </span>
              <input
                type="date"
                className={s.input}
                style={{ padding: '6px 10px', width: 'auto', margin: 0 }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => window.print()}>
              🖨️ Print Report
            </button>
          </div>
        </div>

        <div className={s.statsRow}>
          {KPIS.map((k, i) => (
            <div key={i} className={s.statCard} style={{ '--accent-color': k.color }}>
              <div className={s.statValue}>{k.value}</div>
              <div className={s.statLabel}>{k.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Row 1 */}
        <div className={r.flexLayout}>
          <div className={`${s.card} ${r.flex2}`}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Monthly Submission Trend</span>
            </div>
            <div className={r.cardContent}>
              {monthly.length === 0 ? (
                <div className={r.emptyState}>No trend data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="month"
                      stroke="var(--text-2)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--text-2)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ color: 'var(--text-2)', fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="submitted"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6', r: 3 }}
                      name="Submitted"
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981', r: 3 }}
                      name="Completed"
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      dot={{ fill: '#F59E0B', r: 3 }}
                      name="Pending"
                    />
                    <Line
                      type="monotone"
                      dataKey="inProgress"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 3 }}
                      name="In Progress"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className={`${s.card} ${r.flex1}`}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Status Distribution</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip {...TT} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ padding: '0 16px 14px', gap: 6 }} className={s.flexCol}>
              {statusData.map((s2) => (
                <div key={s2.name} className={r.legendRow}>
                  <span className={s.statusDot} style={{ background: s2.color }} />
                  <span className={r.legendName}>{s2.name}</span>
                  <span className={r.legendValue} style={{ color: s2.color }}>
                    {s2.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className={r.flexLayout}>
          <div className={`${s.card} ${r.flex2}`}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Concerns by Category</span>
            </div>
            <div className={r.cardContent}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--text-2)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="var(--text-2)"
                    fontSize={11}
                    width={65}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip {...TT} formatter={(v, n, p) => [v, p.payload.full]} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {catData.map((_, i) => (
                      <Cell key={i} fill={CC[i % CC.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={`${s.card} ${r.flex1}`}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Priority Breakdown</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={prioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={68}
                  dataKey="value"
                  paddingAngle={3}
                  labelLine={false}
                  label={<PriorityLabel />}
                >
                  {prioData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip {...TT} formatter={(v, n) => [`${v} concerns`, `${n} Priority`]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ padding: '0 16px 14px', gap: 8 }} className={s.flexCol}>
              {prioData.map((p) => {
                const pct = total ? Math.round((p.value / total) * 100) : 0;
                return (
                  <div key={p.name} className={r.prioLegendRow}>
                    <span className={r.prioName}>{p.name}</span>
                    <div className={s.progressTrack} style={{ flex: 1, height: 5 }}>
                      <div
                        className={s.progressFill}
                        style={{ height: 5, background: p.color, width: `${pct}%` }}
                      />
                    </div>
                    <span className={r.prioValue} style={{ color: p.color }}>
                      {p.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 3 */}
        <div className={r.flexLayout}>
          <div className={`${s.card} ${r.flex1}`}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Top Barangays</span>
            </div>
            <div style={{ padding: '8px 16px 16px' }}>
              {brgData.length === 0 ? (
                <div className={r.emptyState}>No data yet</div>
              ) : (
                brgData.map(([brgy, count], i) => {
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={brgy} className={r.rankItem}>
                      <div className={r.rankHeader}>
                        <span className={r.rankName}>
                          <span className={r.rankNumber}>#{i + 1}</span>
                          {brgy}
                        </span>
                        <span className={r.rankValue}>{count}</span>
                      </div>
                      <div className={s.progressTrack} style={{ height: 5 }}>
                        <div
                          className={s.progressFill}
                          style={{ height: 5, background: CC[i % CC.length], width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className={`${s.card} ${r.flex1}`}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Most Upvoted Concerns</span>
            </div>
            <div>
              {topUp.length === 0 ? (
                <div className={r.emptyState}>No data yet</div>
              ) : (
                topUp.map((c, i) => (
                  <a key={c.id} href={`/concerns/${c.id}`} className={r.upvotedItem}>
                    <div className={r.upvotedRank}>#{i + 1}</div>
                    <div className={r.upvotedInfo}>
                      <div className={r.upvotedTitle}>{c.title}</div>
                      <div className={r.upvotedMeta}>
                        {c.category?.split(' ')[0]} · {getPinBarangay(c)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span>👍</span>
                      <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: 13 }}>
                        {c.upvotes || 0}
                      </span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className={s.card}>
          <div className={r.summaryFooter}>
            <div className={r.summaryLeft}>
              <h3 className={r.summaryTitle}>Overall Resolution Performance</h3>
              <p className={r.summaryDesc}>
                {resolved} of {total} concerns resolved
              </p>
              <div className={r.summaryLegendList}>
                {[
                  { l: 'Pending', v: pending, c: '#F59E0B' },
                  { l: 'In Progress', v: inProgress, c: '#3B82F6' },
                  { l: 'Resolved', v: resolved, c: '#10B981' },
                  { l: 'Rejected', v: rejected, c: '#EF4444' },
                ].map((x) => (
                  <div key={x.l} className={r.summaryLegendItem}>
                    <span className={s.statusDot} style={{ background: x.c }} />
                    <span className={r.summaryLegendLabel}>{x.l}: </span>
                    <span className={r.summaryLegendValue} style={{ color: x.c }}>
                      {x.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className={r.summaryRight}>
              <div className={r.summaryRate}>{rate}%</div>
              <div className={r.summaryRateLabel}>Resolution Rate</div>
              <div className={s.progressTrack} style={{ height: 8 }}>
                <div
                  className={s.progressFill}
                  style={{ height: 8, background: '#10B981', width: `${rate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
