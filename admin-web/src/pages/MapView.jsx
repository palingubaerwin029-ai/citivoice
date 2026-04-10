// MapView.jsx
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

const STATUS_COLORS = { Pending: '#FFB800', 'In Progress': '#1A6BFF', Resolved: '#00D4AA', Rejected: '#FF4444' };

export function MapView() {
  const [concerns, setConcerns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'concerns')), snap => {
      setConcerns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const filtered = concerns.filter(c => c.location?.latitude && (filter === 'All' || c.status === filter));

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>🗺️ Concerns Map</h1>
      <p style={{ color: '#8899BB', marginBottom: 20 }}>Geographic distribution of {filtered.length} concerns</p>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            backgroundColor: filter === s ? '#1A6BFF' : '#162B4D',
            color: filter === s ? '#fff' : '#8899BB',
            border: `1px solid ${filter === s ? '#1A6BFF' : '#1E3355'}`,
          }}>{s}</button>
        ))}
      </div>

      {/* Map placeholder — in production use react-leaflet */}
      <div style={{ backgroundColor: '#112240', borderRadius: 16, border: '1px solid #1E3355', overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#0D2137', height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, position: 'relative' }}>
          <div style={{ fontSize: 48 }}>🗺️</div>
          <p style={{ color: '#8899BB', fontSize: 15 }}>Interactive map — powered by Leaflet + OpenStreetMap</p>
          <p style={{ color: '#4A5A7A', fontSize: 13 }}>Install react-leaflet and configure to show {filtered.length} concern markers</p>
          {/* Concern pins preview */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600 }}>
            {filtered.slice(0, 10).map(c => (
              <div key={c.id} onClick={() => setSelected(c)} style={{
                backgroundColor: (STATUS_COLORS[c.status] || '#8899BB') + '33',
                border: `1px solid ${STATUS_COLORS[c.status] || '#8899BB'}`,
                borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
                color: STATUS_COLORS[c.status] || '#8899BB', fontSize: 11, fontWeight: 600,
              }}>📍 {c.title?.slice(0, 25)}...</div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, padding: 16, borderTop: '1px solid #1E3355' }}>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} />
              <span style={{ color: '#8899BB', fontSize: 12 }}>{s}: {concerns.filter(x => x.status === s).length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Concern */}
      {selected && (
        <div style={{ backgroundColor: '#112240', borderRadius: 14, padding: 20, border: '1px solid #1E3355', marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ color: '#fff', margin: 0 }}>{selected.title}</h3>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#8899BB', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <p style={{ color: '#8899BB', fontSize: 13, marginTop: 8 }}>{selected.description?.slice(0, 150)}...</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <span style={{ color: STATUS_COLORS[selected.status], backgroundColor: STATUS_COLORS[selected.status] + '22', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{selected.status}</span>
            <span style={{ color: '#8899BB', fontSize: 12 }}>📍 {selected.location?.address}</span>
          </div>
          <a href={`/concerns/${selected.id}`} style={{ display: 'inline-block', marginTop: 12, color: '#1A6BFF', fontSize: 13, fontWeight: 700 }}>View Full Details →</a>
        </div>
      )}
    </div>
  );
}

// Users.jsx
export function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'users')), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role !== 'admin'));
    });
    return unsub;
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>👥 Registered Citizens</h1>
      <p style={{ color: '#8899BB', marginBottom: 24 }}>{users.length} citizens registered</p>

      <div style={{ backgroundColor: '#112240', borderRadius: 16, border: '1px solid #1E3355', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#162B4D' }}>
              {['Citizen', 'Email', 'Phone', 'Barangay', 'Joined'].map(h => (
                <th key={h} style={{ color: '#8899BB', fontSize: 11, fontWeight: 700, textAlign: 'left', padding: '12px 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #1E3355' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: '#1A6BFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>
                      {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#8899BB', fontSize: 13 }}>{u.email}</td>
                <td style={{ padding: '12px 16px', color: '#8899BB', fontSize: 13 }}>{u.phone || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ backgroundColor: '#1A6BFF22', color: '#4D8FFF', padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{u.barangay}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#4A5A7A', fontSize: 12 }}>
                  {u.createdAt?.toDate?.()?.toLocaleDateString('en-PH') || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#8899BB' }}>No citizens registered yet.</div>}
      </div>
    </div>
  );
}

// Reports.jsx
export function Reports() {
  const [concerns, setConcerns] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'concerns')), snap => {
      setConcerns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const total = concerns.length;
  const resolved = concerns.filter(c => c.status === 'Resolved').length;
  const rate = total ? Math.round((resolved / total) * 100) : 0;
  const avgUpvotes = total ? Math.round(concerns.reduce((s, c) => s + (c.upvotes || 0), 0) / total) : 0;

  const byBarangay = Object.entries(
    concerns.reduce((acc, c) => { if (c.userBarangay) acc[c.userBarangay] = (acc[c.userBarangay] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>📈 Reports & Analytics</h1>
      <p style={{ color: '#8899BB', marginBottom: 24 }}>Summary of CitiVoice concern data</p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Concerns', value: total, icon: '📋', color: '#1A6BFF' },
          { label: 'Resolution Rate', value: `${rate}%`, icon: '🎯', color: '#00D4AA' },
          { label: 'Avg Upvotes/Concern', value: avgUpvotes, icon: '👍', color: '#FFB800' },
          { label: 'Active Concerns', value: concerns.filter(c => c.status === 'In Progress').length, icon: '🔄', color: '#FF6B35' },
        ].map((k, i) => (
          <div key={i} style={{ backgroundColor: '#112240', borderRadius: 14, padding: 20, border: '1px solid #1E3355', borderTopWidth: 3, borderTopColor: k.color, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{k.icon}</div>
            <div style={{ color: k.color, fontSize: 28, fontWeight: 800 }}>{k.value}</div>
            <div style={{ color: '#8899BB', fontSize: 12, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* By Barangay */}
      <div style={{ backgroundColor: '#112240', borderRadius: 16, padding: 20, border: '1px solid #1E3355' }}>
        <h3 style={{ color: '#fff', fontWeight: 700, marginTop: 0, marginBottom: 16 }}>📍 Concerns by Barangay</h3>
        {byBarangay.map(([brgy, count]) => {
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={brgy} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ color: '#fff', fontSize: 13 }}>{brgy}</span>
                <span style={{ color: '#1A6BFF', fontSize: 13, fontWeight: 700 }}>{count} ({pct}%)</span>
              </div>
              <div style={{ height: 6, backgroundColor: '#1E3355', borderRadius: 3 }}>
                <div style={{ height: 6, backgroundColor: '#1A6BFF', borderRadius: 3, width: `${pct}%`, transition: 'width 1s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MapView;