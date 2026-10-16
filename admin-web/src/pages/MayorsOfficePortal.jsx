import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtDate, fmtDateShort, resolveImageUrl } from '../services/api';
import { useToast } from '../components/ToastProvider';
import s from '../styles/MayorPortal.module.css';

const DEFAULT_DEPARTMENTS = [
  "City Engineer's Office (CEO)",
  'City Environment and Natural Resources Office (CENRO)',
  'Negros Occidental Electric Cooperative (NOCECO)',
];

export default function MayorsOfficePortal({ user, onLogout }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [concerns, setConcerns] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'dispatched' | 'all'
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedConcern, setSelectedConcern] = useState(null);

  // Approval modal state
  const [targetDept, setTargetDept] = useState('');
  const [directiveNotes, setDirectiveNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);

  const fetchConcerns = async () => {
    setLoading(true);
    try {
      const [resConcerns, resDepts] = await Promise.all([
        api.get('/concerns', { limit: 1000 }),
        api.get('/departments').catch(() => [])
      ]);
      const list = Array.isArray(resConcerns.data)
        ? resConcerns.data
        : Array.isArray(resConcerns)
          ? resConcerns
          : [];
      setConcerns(list);

      const deptList = Array.isArray(resDepts) && resDepts.length > 0
        ? resDepts.map(d => d.name)
        : DEFAULT_DEPARTMENTS;
      setDepartments(deptList);
    } catch (err) {
      toast?.show('Failed to load concerns: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConcerns();
  }, []);

  // Compute metrics
  const metrics = useMemo(() => {
    const pendingApproval = concerns.filter(c => !c.approved_at && c.status !== 'Rejected');
    const dispatched = concerns.filter(c => c.approved_at);
    const urgent = concerns.filter(c => c.priority === 'High' && !c.approved_at);
    return {
      pending: pendingApproval.length,
      dispatched: dispatched.length,
      urgent: urgent.length,
      total: concerns.length
    };
  }, [concerns]);

  // Filter concerns based on tab and criteria
  const filteredConcerns = useMemo(() => {
    return concerns.filter(c => {
      // Tab filter
      if (activeTab === 'pending' && (c.approved_at || c.status === 'Rejected')) return false;
      if (activeTab === 'dispatched' && !c.approved_at) return false;

      // Category filter
      if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = (c.title || '').toLowerCase().includes(q);
        const citizenMatch = (c.user_name || '').toLowerCase().includes(q);
        const brgyMatch = (c.user_barangay || '').toLowerCase().includes(q);
        const deptMatch = (c.department || '').toLowerCase().includes(q);
        if (!titleMatch && !citizenMatch && !brgyMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [concerns, activeTab, categoryFilter, search]);

  const openReviewModal = (concern) => {
    setSelectedConcern(concern);
    setTargetDept(concern.department || departments[0] || DEFAULT_DEPARTMENTS[0]);
    setDirectiveNotes(
      concern.approval_notes ||
      `Pursuant to official review by the Office of the City Mayor, this citizen concern is officially approved and immediately endorsed to ${concern.department || 'the assigned department'} for prompt action, site verification, and public resolution.`
    );
  };

  const closeReviewModal = () => {
    setSelectedConcern(null);
    setDispatching(false);
  };

  const handleApproveAndDispatch = async () => {
    if (!selectedConcern) return;
    setDispatching(true);

    try {
      const res = await api.post(`/concerns/${selectedConcern.id}/approve`, {
        approval_notes: directiveNotes.trim(),
        target_department: targetDept
      });

      if (res.success || res.concern) {
        toast?.show(`✅ Mayoral Executive Directive dispatched to ${targetDept}!`, 'success');

        // Update item in local list
        setConcerns(prev => prev.map(c => {
          if (c.id === selectedConcern.id) {
            return {
              ...c,
              ...(res.concern || {}),
              approved_at: new Date().toISOString(),
              approved_by_name: user?.name || 'Office of the City Mayor',
              department: targetDept,
              approval_notes: directiveNotes.trim(),
              status: 'In Progress'
            };
          }
          return c;
        }));

        closeReviewModal();
      }
    } catch (err) {
      toast?.show('Failed to dispatch directive: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className={s.container}>
      {/* 🏛️ Official Mayoral Executive Header */}
      <header className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.sealIcon}>🏛️</div>
          <div>
            <div className={s.subNation}>Republic of the Philippines · City of Kabankalan</div>
            <h1 className={s.title}>Office of the Mayor</h1>
            <p className={s.subtitle}>Executive Concern Approval Desk</p>
          </div>
        </div>

        <div className={s.headerRight}>
          <span className={s.badge}>
            ⚖️ Official Mayoral Approval Desk
          </span>

          <button className={s.btnOutline} onClick={fetchConcerns} title="Refresh records">
            🔄 Refresh
          </button>

          <button
            className={s.btnOutline}
            style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            onClick={onLogout}
            title="Sign out of portal"
          >
            🚪 Sign Out
          </button>
        </div>
      </header>

      {/* 📊 Executive Approval Metric Cards */}
      <div className={s.metricsGrid}>
        <div className={s.metricCard} style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className={s.metricTop}>
            <span className={s.metricLabel}>Awaiting Mayoral Approval</span>
            <div className={s.metricIcon} style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>⏳</div>
          </div>
          <div className={s.metricValue}>{metrics.pending}</div>
          <div className={s.metricSub}>Citizen concerns requiring Mayor's official approval</div>
        </div>

        <div className={s.metricCard} style={{ borderLeft: '4px solid #10b981' }}>
          <div className={s.metricTop}>
            <span className={s.metricLabel}>Approved & Dispatched Directives</span>
            <div className={s.metricIcon} style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>⚡</div>
          </div>
          <div className={s.metricValue}>{metrics.dispatched}</div>
          <div className={s.metricSub}>Directives approved & forwarded to city departments</div>
        </div>

        <div className={s.metricCard} style={{ borderLeft: '4px solid #ef4444' }}>
          <div className={s.metricTop}>
            <span className={s.metricLabel}>Urgent Approvals Needed</span>
            <div className={s.metricIcon} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>🔥</div>
          </div>
          <div className={s.metricValue}>{metrics.urgent}</div>
          <div className={s.metricSub}>High-priority concerns awaiting urgent executive action</div>
        </div>
      </div>

      {/* 🧭 Tabs & Filters */}
      <div className={s.filterBar}>
        <div className={s.tabs}>
          <button
            className={`${s.tabBtn} ${activeTab === 'pending' ? s.tabBtnActive : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Pending Mayoral Approval ({metrics.pending})
          </button>
          <button
            className={`${s.tabBtn} ${activeTab === 'dispatched' ? s.tabBtnActive : ''}`}
            onClick={() => setActiveTab('dispatched')}
          >
            ✅ Approved Directives Archive ({metrics.dispatched})
          </button>
        </div>

        <div className={s.filters}>
          <input
            type="text"
            className={s.searchInput}
            placeholder="🔍 Search title, citizen, barangay..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className={s.select}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Road & Infrastructure">Road & Infrastructure</option>
            <option value="Electricity">Electricity</option>
            <option value="Drainage">Drainage</option>
            <option value="Waste & Sanitation">Waste & Sanitation</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* 📋 Table Card */}
      <div className={s.tableCard}>
        {loading ? (
          <div className={s.emptyState}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
            <div>Loading concerns for the Office of the Mayor...</div>
          </div>
        ) : filteredConcerns.length === 0 ? (
          <div className={s.emptyState}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#e2e8f0' }}>No concerns in this view</h3>
            <p style={{ margin: 0 }}>
              {activeTab === 'pending'
                ? 'All citizen concerns have been reviewed and approved.'
                : 'No concerns matched your active filters.'}
            </p>
          </div>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Concern Details</th>
                <th>Citizen & Barangay</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredConcerns.map((c, idx) => {
                const isApproved = !!c.approved_at;
                const isHigh = c.priority === 'High';

                return (
                  <tr key={c.id}>
                    <td style={{ color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                    <td>
                      <span className={s.concernTitle}>{c.title}</span>
                      <span className={s.concernDesc}>{c.description || 'No description provided'}</span>
                      <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                        📅 Filed: {fmtDateShort(c.created_at)} · Category: <strong>{c.category}</strong>
                      </div>
                      {c.is_validated ? (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>🛡️</span>
                          <span>Validated by <strong>{c.validated_by_name || 'Admin'}</strong>{c.validated_at ? ` (${fmtDateShort(c.validated_at)})` : ''}</span>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{c.user_name || 'Anonymous Citizen'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>📍 {c.user_barangay || c.location_address || 'Kabankalan City'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#38bdf8' }}>
                        {c.department || "City Engineer's Office"}
                      </div>
                      {isApproved && (
                        <div style={{ fontSize: 10, color: '#10b981' }}>
                          ✓ Dispatched on {fmtDateShort(c.approved_at)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={s.priorityPill}
                        style={{
                          background: isHigh ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                          color: isHigh ? '#ef4444' : '#94a3b8',
                          border: `1px solid ${isHigh ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`
                        }}
                      >
                        {isHigh ? '🔥 High' : c.priority || 'Normal'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={s.statusPill}
                        style={{
                          background:
                            c.status === 'Resolved' ? 'rgba(16,185,129,0.15)' :
                              c.status === 'In Progress' ? 'rgba(59,130,246,0.15)' :
                                c.status === 'Rejected' ? 'rgba(239,68,68,0.15)' :
                                  'rgba(245,158,11,0.15)',
                          color:
                            c.status === 'Resolved' ? '#10b981' :
                              c.status === 'In Progress' ? '#3b82f6' :
                                c.status === 'Rejected' ? '#ef4444' :
                                  '#f59e0b'
                        }}
                      >
                        ● {c.status}
                      </span>
                    </td>
                    <td>
                      {!isApproved ? (
                        <button
                          className={s.actionBtn}
                          onClick={() => openReviewModal(c)}
                        >
                          ⚡ Review & Approve
                        </button>
                      ) : (
                        <div className={s.dispatchedBadge} onClick={() => openReviewModal(c)} style={{ cursor: 'pointer' }} title="Click to view directive details">
                          <span>🏛️ Mayoral Directive</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 🏛️ Executive Review & Directive Dispatch Modal */}
      {selectedConcern && (
        <div className={s.modalBackdrop} onClick={closeReviewModal}>
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                  Office of the Mayor · Official Review
                </div>
                <h2 style={{ margin: 0, fontSize: 20, color: '#ffffff' }}>
                  {selectedConcern.title}
                </h2>
              </div>
              <button className={s.modalClose} onClick={closeReviewModal}>✕</button>
            </div>

            {/* Directive Alert Banner */}
            <div className={s.directiveAlert}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                <span>📜</span>
                <span>Mayoral Executive Directive</span>
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                Approving this concern officially issues an inter-department directive under the authority of the <strong>Office of the Mayor</strong> and dispatches official email instructions to the assigned department.
              </div>
            </div>

            {/* Concern Details Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedConcern.image_url ? '1fr 140px' : '1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>
                  {selectedConcern.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#94a3b8' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Citizen:</span>{' '}
                    <strong style={{ color: '#ffffff' }}>{selectedConcern.user_name || 'Anonymous'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Barangay:</span>{' '}
                    <strong style={{ color: '#ffffff' }}>{selectedConcern.user_barangay || selectedConcern.location_address || 'Kabankalan City'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Category:</span>{' '}
                    <strong style={{ color: '#38bdf8' }}>{selectedConcern.category}</strong>
                  </div>
                </div>

                {/* GPS Map Coordinates if present */}
                {selectedConcern.location_lat && selectedConcern.location_lng && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <a
                      href={`http://localhost:8080/map?concernId=${selectedConcern.id}&lat=${selectedConcern.location_lat}&lng=${selectedConcern.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}
                    >
                      📍 Open in CitiVoice MapView ↗
                    </a>
                    <span style={{ color: '#64748b' }}>·</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedConcern.location_lat},${selectedConcern.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#fbbf24', textDecoration: 'none', fontWeight: 600 }}
                    >
                      🗺️ Open in Google Maps ↗
                    </a>
                  </div>
                )}
              </div>

              {selectedConcern.image_url && (
                <div style={{ width: 140, height: 110, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <img
                    src={resolveImageUrl(selectedConcern.image_url)}
                    alt="Problem"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>

            {/* Admin Validation Receipt */}
            <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>🛡️</span>
              <div>
                <strong>Admin Validation Confirmed:</strong> Verified and forwarded by <strong>{selectedConcern.validated_by_name || 'System Administrator'}</strong>{selectedConcern.validated_at ? ` on ${fmtDate(selectedConcern.validated_at)}` : ''}.
              </div>
            </div>

            {/* Department Selection */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                Target Department for Action & Dispatch
              </label>
              <select
                className={s.select}
                style={{ width: '100%' }}
                value={targetDept}
                onChange={(e) => setTargetDept(e.target.value)}
              >
                {departments.map((dept, idx) => (
                  <option key={idx} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Executive Notes / Directive Instructions */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                Official Mayoral Directive Instructions
              </label>
              <textarea
                className={s.textarea}
                rows={4}
                value={directiveNotes}
                onChange={(e) => setDirectiveNotes(e.target.value)}
                placeholder="Enter mayoral executive directive instructions for the assigned department..."
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className={s.btnOutline} onClick={closeReviewModal} disabled={dispatching}>
                Cancel
              </button>

              <button
                className={s.btnPrimary}
                onClick={handleApproveAndDispatch}
                disabled={dispatching}
              >
                {dispatching ? '⚙️ Dispatching Mayoral Directive...' : '⚡ Sign & Dispatch Directive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
