import React, { useState, useEffect, useMemo } from 'react';
import { api, fmtDate, fmtDateShort, resolveImageUrl } from '../services/api';
import { useToast } from '../components/ToastProvider';
import s from '../styles/MayorPortal.module.css';

const DEFAULT_DEPARTMENTS = [
  "City Engineer's Office (CEO)",
  'City Environment and Natural Resources Office (CENRO)',
  'Negros Occidental Electric Cooperative (NOCECO)',
];

export default function MayorsOfficePortal({ user, onLogout }) {
  const toast = useToast();

  const [concerns, setConcerns] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'dispatched'
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedConcern, setSelectedConcern] = useState(null);

  // Directive modal state
  const [targetDept, setTargetDept] = useState('');
  const [directiveNotes, setDirectiveNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);

  const fetchConcerns = async () => {
    setLoading(true);
    try {
      const [resConcerns, resDepts] = await Promise.all([
        api.get('/concerns', { limit: 1000 }),
        api.get('/departments').catch(() => []),
      ]);
      const list = Array.isArray(resConcerns.data)
        ? resConcerns.data
        : Array.isArray(resConcerns)
          ? resConcerns
          : [];
      setConcerns(list);

      const deptList =
        Array.isArray(resDepts) && resDepts.length > 0
          ? resDepts.map((d) => d.name)
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
    const pendingApproval = concerns.filter((c) => !c.approved_at && c.status !== 'Rejected');
    const dispatched = concerns.filter((c) => c.approved_at);
    const urgent = concerns.filter((c) => c.priority === 'High');
    return {
      pending: pendingApproval.length,
      dispatched: dispatched.length,
      urgent: urgent.length,
      total: concerns.length,
    };
  }, [concerns]);

  // Filter concerns based on tab and criteria
  const filteredConcerns = useMemo(() => {
    return concerns.filter((c) => {
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
        `Pursuant to official review by the Office of the City Mayor, this citizen concern is officially endorsed to ${concern.department || 'the assigned department'} for prompt on-site action and resolution.`
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
        target_department: targetDept,
      });

      if (res.success || res.concern) {
        toast?.show(`✅ Executive Directive dispatched to ${targetDept}!`, 'success');

        setConcerns((prev) =>
          prev.map((c) => {
            if (c.id === selectedConcern.id) {
              return {
                ...c,
                ...(res.concern || {}),
                approved_at: new Date().toISOString(),
                approved_by_name: user?.name || 'Office of the City Mayor',
                department: targetDept,
                approval_notes: directiveNotes.trim(),
                status: 'In Progress',
              };
            }
            return c;
          })
        );

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
      {/* 🏛️ Clean Executive Header */}
      <header className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.sealIcon}>🏛️</div>
          <div>
            <h1 className={s.title}>Office of the City Mayor</h1>
            <p className={s.subtitle}>Kabankalan City · Executive Concern Approval Desk</p>
          </div>
        </div>

        <div className={s.headerRight}>
          <button className={s.btnOutline} onClick={fetchConcerns} title="Refresh records">
            🔄 Refresh
          </button>

          <button
            className={s.btnOutline}
            style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            onClick={() => (onLogout ? onLogout('/mayor/login') : null)}
            title="Sign out of portal"
          >
            🚪 Sign Out
          </button>
        </div>
      </header>

      {/* 📊 Simple KPI Stats */}
      <div className={s.metricsGrid}>
        <div className={s.metricCard} style={{ borderLeft: '3px solid #f59e0b' }}>
          <div>
            <div className={s.metricLabel}>Awaiting Review</div>
            <div className={s.metricValue}>{metrics.pending}</div>
          </div>
        </div>

        <div className={s.metricCard} style={{ borderLeft: '3px solid #10b981' }}>
          <div>
            <div className={s.metricLabel}>Dispatched Directives</div>
            <div className={s.metricValue}>{metrics.dispatched}</div>
          </div>
        </div>

        <div className={s.metricCard} style={{ borderLeft: '3px solid #ef4444' }}>
          <div>
            <div className={s.metricLabel}>High-Risk Hazards</div>
            <div className={s.metricValue}>{metrics.urgent}</div>
          </div>
        </div>
      </div>

      {/* 🧭 Tabs & Search */}
      <div className={s.filterBar}>
        <div className={s.tabs}>
          <button
            className={`${s.tabBtn} ${activeTab === 'pending' ? s.tabBtnActive : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Review ({metrics.pending})
          </button>
          <button
            className={`${s.tabBtn} ${activeTab === 'dispatched' ? s.tabBtnActive : ''}`}
            onClick={() => setActiveTab('dispatched')}
          >
            Dispatched ({metrics.dispatched})
          </button>
        </div>

        <div className={s.filters}>
          <input
            type="text"
            className={s.searchInput}
            placeholder="🔍 Search concern or citizen..."
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

      {/* 📋 Simplified Concern Card List */}
      <div className={s.listContainer}>
        {loading ? (
          <div className={s.emptyState}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚙️</div>
            <div>Loading concerns...</div>
          </div>
        ) : filteredConcerns.length === 0 ? (
          <div className={s.emptyState}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>No concerns found</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              {activeTab === 'pending'
                ? 'All citizen reports are currently reviewed.'
                : 'No dispatched concerns match your filter.'}
            </div>
          </div>
        ) : (
          filteredConcerns.map((c) => {
            const isApproved = !!c.approved_at;
            const isHigh = c.priority === 'High';

            return (
              <div key={c.id} className={s.concernRow} onClick={() => openReviewModal(c)}>
                <div className={s.concernMain}>
                  <div className={s.concernRowHeader}>
                    <span className={s.concernId}>#{c.id}</span>
                    <span className={s.concernTitle}>{c.title}</span>
                    {isHigh && <span className={s.priorityHighTag}>High</span>}
                  </div>

                  <div className={s.concernSubline}>
                    <span>{c.category}</span>
                    <span className={s.sublineDot}>·</span>
                    <span>{c.user_barangay || c.location_address || 'Kabankalan City'}</span>
                    <span className={s.sublineDot}>·</span>
                    <span>{c.user_name || 'Citizen'}</span>
                    <span className={s.sublineDot}>·</span>
                    <span>{fmtDateShort(c.created_at)}</span>
                  </div>
                </div>

                <div className={s.concernAction} onClick={(e) => e.stopPropagation()}>
                  {!isApproved ? (
                    <button className={s.actionBtn} onClick={() => openReviewModal(c)}>
                      Review & Dispatch
                    </button>
                  ) : (
                    <span className={s.dispatchedBadge} onClick={() => openReviewModal(c)}>
                      Dispatched ({fmtDateShort(c.approved_at)})
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 🏛️ Simplified Review Modal */}
      {selectedConcern && (
        <div className={s.modalBackdrop} onClick={closeReviewModal}>
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 2 }}>
                  Mayoral Executive Directive
                </div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#ffffff' }}>
                  {selectedConcern.title}
                </h2>
              </div>
              <button className={s.modalClose} onClick={closeReviewModal}>✕</button>
            </div>

            {/* Concern Details Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedConcern.image_url ? '1fr 100px' : '1fr', gap: 14, marginBottom: 16 }}>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: 13, color: '#cbd5e1', lineHeight: 1.4 }}>
                  {selectedConcern.description}
                </p>

                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  <strong>{selectedConcern.user_name || 'Citizen'}</strong> · {selectedConcern.user_barangay || selectedConcern.location_address || 'Kabankalan City'}
                </div>
              </div>

              {selectedConcern.image_url && (
                <div style={{ width: 100, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <img
                    src={resolveImageUrl(selectedConcern.image_url)}
                    alt="Problem"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>

            {/* Department Selection */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>
                Assigned Department
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
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 5 }}>
                Mayoral Directive Instructions
              </label>
              <textarea
                className={s.textarea}
                rows={3}
                value={directiveNotes}
                onChange={(e) => setDirectiveNotes(e.target.value)}
                placeholder="Enter executive directive instructions for the department..."
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className={s.btnOutline} onClick={closeReviewModal} disabled={dispatching}>
                Cancel
              </button>

              <button
                className={s.btnPrimary}
                onClick={handleApproveAndDispatch}
                disabled={dispatching}
              >
                {dispatching ? 'Dispatching...' : '⚡ Sign & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
