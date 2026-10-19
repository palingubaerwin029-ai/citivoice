import React, { useState, useEffect, useMemo } from 'react';
import { api, fmtDate, fmtDateShort, resolveImageUrl } from '../services/api';
import { useToast } from '../components/ToastProvider';
import s from '../styles/MayorPortal.module.css';

const DEFAULT_DEPARTMENTS = [
  "City Engineer's Office (CEO)",
  'City Environment and Natural Resources Office (CENRO)',
  'Negros Occidental Electric Cooperative (NOCECO)',
];

const DONE_DISPATCH_PRESETS = [
  "Endorsed for prompt field inspection and immediate remedial action.",
  "Mobilize maintenance crew immediately; coordinate with barangay officials upon arrival.",
  "Priority executive directive issued for immediate resolution and progress report submission.",
  "Approved for inclusion in current weekly municipal public works schedule.",
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
  const [confirmingDoneDispatch, setConfirmingDoneDispatch] = useState(false);

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
    setConfirmingDoneDispatch(false);
    setTargetDept(concern.department || departments[0] || DEFAULT_DEPARTMENTS[0]);
    setDirectiveNotes(
      concern.approval_notes ||
      `Pursuant to official review by the Office of the City Mayor, this citizen concern is officially endorsed to ${concern.department || 'the assigned department'} for prompt on-site action and resolution.`
    );
  };

  const closeReviewModal = () => {
    setSelectedConcern(null);
    setConfirmingDoneDispatch(false);
    setDispatching(false);
  };

  const handleApproveAndDispatch = async () => {
    if (!selectedConcern) return;

    const isAlreadyDispatched = !!selectedConcern.approved_at;

    // Prompt for confirmation note if not yet dispatched and not in confirmation step
    if (!isAlreadyDispatched && !confirmingDoneDispatch) {
      setConfirmingDoneDispatch(true);
      return;
    }

    if (!directiveNotes.trim()) {
      toast?.show('Please enter a note for Done Dispatch.', 'error');
      return;
    }

    setDispatching(true);

    try {
      const res = await api.post(`/concerns/${selectedConcern.id}/approve`, {
        approval_notes: directiveNotes.trim(),
        target_department: targetDept,
      });

      if (res.success || res.concern) {
        toast?.show(
          isAlreadyDispatched
            ? `✅ Done Dispatch note updated for Concern #${selectedConcern.id}!`
            : `✅ Done Dispatch! Concern #${selectedConcern.id} dispatched to ${targetDept} with note.`,
          'success'
        );

        setConcerns((prev) =>
          prev.map((c) => {
            if (c.id === selectedConcern.id) {
              return {
                ...c,
                ...(res.concern || {}),
                approved_at: c.approved_at || new Date().toISOString(),
                approved_by_name: c.approved_by_name || user?.name || 'Office of the City Mayor',
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
      toast?.show('Failed to complete Done Dispatch: ' + (err.message || 'Unknown error'), 'error');
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
          <button
            className={s.btnOutline}
            onClick={fetchConcerns}
            disabled={loading}
            title="Refresh records"
          >
            <span className={loading ? s.spinningIcon : ''}>🔄</span> Refresh
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
            <div className={s.metricLabel}>Done Dispatch</div>
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
            Done Dispatch ({metrics.dispatched})
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
          <div className={s.loadingContainer}>
            <div className={s.loadingSpinner} />
            <div className={s.loadingText}>Loading concerns...</div>
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

                  {/* 📝 Note displayed when concern is done dispatched */}
                  {isApproved && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '7px 11px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: 12,
                        color: '#cbd5e1',
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13 }}>📝</span>
                        <strong style={{ color: '#10B981', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Done Dispatch Note:
                        </strong>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>
                          To: {c.department || 'Assigned Department'}
                        </span>
                      </div>
                      <div style={{ color: '#f1f5f9', fontStyle: 'italic', paddingLeft: 19 }}>
                        "{c.approval_notes || 'Approved for immediate evaluation and action.'}"
                      </div>
                    </div>
                  )}
                </div>

                <div className={s.concernAction} onClick={(e) => e.stopPropagation()}>
                  {!isApproved ? (
                    <button className={s.actionBtn} onClick={() => openReviewModal(c)}>
                      Review & Dispatch
                    </button>
                  ) : (
                    <span
                      className={s.dispatchedBadge}
                      style={
                        c.approved_by_name?.includes('Bypassed') || c.approved_by_name?.includes('Emergency')
                          ? {
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.35)',
                              cursor: 'pointer',
                            }
                          : {
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10B981',
                              borderColor: 'rgba(16, 185, 129, 0.3)',
                              cursor: 'pointer',
                            }
                      }
                      onClick={() => openReviewModal(c)}
                    >
                      {c.approved_by_name?.includes('Bypassed') || c.approved_by_name?.includes('Emergency')
                        ? `⚡ Emergency Done Dispatch (${fmtDateShort(c.approved_at)})`
                        : `✓ Done Dispatch (${fmtDateShort(c.approved_at)})`}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 🏛️ Review & Done Dispatch Modal */}
      {selectedConcern && (
        <div className={s.modalBackdrop} onClick={closeReviewModal}>
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 2 }}>
                  {confirmingDoneDispatch ? 'Prompt: Add Done Dispatch Note' : 'Mayoral Executive Directive'}
                </div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#ffffff' }}>
                  {selectedConcern.title}
                </h2>
              </div>
              <button className={s.modalClose} onClick={closeReviewModal}>✕</button>
            </div>

            {/* Emergency Protocol Bypass Banner */}
            {selectedConcern.approved_by_name && (selectedConcern.approved_by_name.includes('Bypassed') || selectedConcern.approved_by_name.includes('Emergency')) && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 12,
                  color: '#fca5a5',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span>⚡</span>
                  <span>Emergency Protocol: Direct Response Dispatched</span>
                </div>
                Validated by Admin <strong>{selectedConcern.validated_by_name || 'System Admin'}</strong> and expedited directly to <strong>{selectedConcern.department || 'the emergency team'}</strong> for urgent on-site response (bypassed mayoral directive review).
              </div>
            )}

            {/* Prompt Screen for Adding Done Dispatch Confirmation Note */}
            {confirmingDoneDispatch ? (
              <div style={{ padding: '4px 0' }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>📝</span>
                    <strong style={{ fontSize: 14, color: '#10b981' }}>
                      Add "Done Dispatch" Note
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                    Please enter your executive instructions/note before marking this concern as <strong>"Done Dispatch"</strong> to <strong>{targetDept}</strong>.
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>
                    Done Dispatch Note *
                  </label>
                  <textarea
                    className={s.textarea}
                    rows={4}
                    value={directiveNotes}
                    onChange={(e) => setDirectiveNotes(e.target.value)}
                    placeholder="Enter required Done Dispatch note (e.g. mobilization instructions, directives)..."
                    style={{ borderColor: 'rgba(16, 185, 129, 0.5)', width: '100%' }}
                    autoFocus
                  />
                </div>

                {/* Quick note presets */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
                    Quick Note Suggestions:
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DONE_DISPATCH_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDirectiveNotes(preset)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 4,
                          padding: '4px 8px',
                          fontSize: 11,
                          color: '#38bdf8',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        + {preset.slice(0, 36)}…
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className={s.btnOutline}
                    onClick={() => setConfirmingDoneDispatch(false)}
                    disabled={dispatching}
                  >
                    ← Back to Details
                  </button>

                  <button
                    type="button"
                    className={s.btnPrimary}
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      borderColor: '#10B981',
                      fontWeight: 700,
                    }}
                    onClick={handleApproveAndDispatch}
                    disabled={dispatching || !directiveNotes.trim()}
                  >
                    {dispatching ? 'Dispatching...' : '✅ Confirm "Done Dispatch"'}
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                      {selectedConcern.approved_at ? '📝 "Done Dispatch" Note (Editable)' : '📝 "Done Dispatch" Note'}
                    </label>
                    {selectedConcern.approved_at && (
                      <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                        ✓ Done Dispatch on {fmtDateShort(selectedConcern.approved_at)}
                      </span>
                    )}
                  </div>
                  <textarea
                    className={s.textarea}
                    rows={3}
                    value={directiveNotes}
                    onChange={(e) => setDirectiveNotes(e.target.value)}
                    placeholder="Enter Done Dispatch note or instructions for the department..."
                  />
                  <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#64748b' }}>
                    {selectedConcern.approved_at
                      ? 'You can edit or append notes to this concern to update the official record.'
                      : `Clicking Done Dispatch will prompt for confirmation and attach this note to the concern for ${targetDept}.`}
                  </p>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className={s.btnOutline} onClick={closeReviewModal} disabled={dispatching}>
                    {selectedConcern.approved_at ? 'Close' : 'Cancel'}
                  </button>

                  <button
                    className={s.btnPrimary}
                    onClick={handleApproveAndDispatch}
                    disabled={dispatching}
                  >
                    {dispatching ? (
                      <>
                        <span className={s.spinningIcon} style={{ marginRight: 6 }}>⏳</span>
                        Saving...
                      </>
                    ) : selectedConcern.approved_at ? (
                      '💾 Save & Update Note'
                    ) : (
                      '⚡ Done Dispatch →'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
