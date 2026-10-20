import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api, fmtDate, fmtDateShort, resolveImageUrl } from '../services/api';
import { useToast } from '../components/ToastProvider';
import {
  IoRefreshOutline,
  IoLogOutOutline,
  IoTimeOutline,
  IoLocationOutline,
  IoPersonOutline,
  IoBusinessOutline,
  IoDocumentTextOutline,
  IoCloseOutline,
  IoShieldCheckmarkOutline,
  IoEyeOutline,
  IoFlameOutline,
  IoFlashOutline,
} from 'react-icons/io5';
import s from '../styles/MayorPortal.module.css';
import { socket, connectSocket } from '../services/socket';

const DEFAULT_DEPARTMENTS = [
  "City Engineer's Office (CEO)",
  'City Environment and Natural Resources Office (CENRO)',
  'Negros Occidental Electric Cooperative (NOCECO)',
];


export default function MayorsOfficePortal({ user, onLogout }) {
  const { addToast } = useToast();
  const toast = useMemo(() => ({ show: (msg, type) => addToast(msg, type) }), [addToast]);

  const [concerns, setConcerns] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // View states
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'dispatched' | 'urgent' | 'all'
  const [sortField, setSortField] = useState('created_at'); // 'created_at' | 'title' | 'category' | 'priority' | 'status'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'title' || field === 'category' ? 'asc' : 'desc');
    }
  };

  // Clean citizen name formatter (Title Case)
  const fmtName = (str) => {
    if (!str) return 'Citizen';
    return str
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Parse department into main entity and division
  const parseDept = (dept) => {
    if (!dept) return { main: 'Unassigned', sub: '' };
    const parts = dept.split('—');
    if (parts.length > 1) {
      return { main: parts[0].trim(), sub: parts[1].trim() };
    }
    return { main: dept, sub: '' };
  };

  // Subtle clean sort indicator
  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.25, fontSize: 10, marginLeft: 4 }}>↕</span>;
    }
    return (
      <span style={{ color: '#fbbf24', fontSize: 10, marginLeft: 4 }}>
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  // Directive Modal state
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [targetDept, setTargetDept] = useState('');
  const [directiveNotes, setDirectiveNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Lightbox Modal state
  const [lightboxImage, setLightboxImage] = useState(null);

  // Live Philippine Standard Time clock
  const [liveTime, setLiveTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) +
          ' PST · ' +
          now.toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch concerns from API
  const fetchConcerns = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
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
      // Exclude Rejected concerns from Mayor's portal
      const nonRejected = list.filter((c) => c.status !== 'Rejected');
      setConcerns(nonRejected);

      const deptList =
        Array.isArray(resDepts) && resDepts.length > 0
          ? resDepts.map((d) => d.name)
          : DEFAULT_DEPARTMENTS;
      setDepartments(deptList);
      setLastRefreshed(new Date());
    } catch (err) {
      if (!isBackground) toast?.show('Failed to load concerns: ' + err.message, 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    connectSocket();
    fetchConcerns();

    // Auto-refresh concerns every 30 seconds silently
    const interval = setInterval(() => {
      fetchConcerns(true);
    }, 30000);

    // Real-time instant auto-refresh when receiving new concerns or updates
    const handleNewConcern = (newConcern) => {
      if (newConcern && newConcern.title) {
        addToast(`📢 New Citizen Concern Received: "${newConcern.title}"`, 'success');
      }
      fetchConcerns(true);
    };

    const handleSocketUpdate = () => {
      fetchConcerns(true);
    };

    socket.on('new_concern', handleNewConcern);
    socket.on('update_concern', handleSocketUpdate);
    socket.on('concern_status_changed', handleSocketUpdate);
    socket.on('concern_updated', handleSocketUpdate);
    socket.on('concern_stats_updated', handleSocketUpdate);

    return () => {
      clearInterval(interval);
      socket.off('new_concern', handleNewConcern);
      socket.off('update_concern', handleSocketUpdate);
      socket.off('concern_status_changed', handleSocketUpdate);
      socket.off('concern_updated', handleSocketUpdate);
      socket.off('concern_stats_updated', handleSocketUpdate);
    };
  }, [addToast]);

  // Compute key executive metrics
  const metrics = useMemo(() => {
    const valid = concerns.filter((c) => c.status !== 'Rejected');
    const pendingApproval = valid.filter((c) => !c.approved_at);
    const dispatched = valid.filter((c) => c.approved_at);
    const urgent = valid.filter((c) => c.priority === 'High');
    const total = valid.length;
    const rate = total > 0 ? Math.round((dispatched.length / total) * 100) : 0;

    return {
      pending: pendingApproval.length,
      dispatched: dispatched.length,
      urgent: urgent.length,
      total,
      rate,
    };
  }, [concerns]);


  // Filter and sort concerns by active executive tab and sort criteria
  const filteredConcerns = useMemo(() => {
    return concerns
      .filter((c) => {
        if (c.status === 'Rejected') return false;
        if (activeTab === 'pending' && c.approved_at) return false;
        if (activeTab === 'dispatched' && !c.approved_at) return false;
        if (activeTab === 'urgent' && c.priority !== 'High') return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'created_at') {
          const aTime = new Date(a.created_at || 0).getTime();
          const bTime = new Date(b.created_at || 0).getTime();
          cmp = aTime - bTime;
        } else if (sortField === 'priority') {
          const weight = (p) => (p === 'High' ? 3 : p === 'Medium' ? 2 : 1);
          cmp = weight(a.priority) - weight(b.priority);
        } else if (sortField === 'title') {
          cmp = (a.title || '').localeCompare(b.title || '');
        } else if (sortField === 'category') {
          cmp = (a.category || '').localeCompare(b.category || '');
        } else if (sortField === 'status') {
          const aStat = a.approved_at ? 1 : 0;
          const bStat = b.approved_at ? 1 : 0;
          cmp = aStat - bStat;
        }

        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [concerns, activeTab, sortField, sortDirection]);

  // Open directive action modal
  const openReviewModal = (concern) => {
    setSelectedConcern(concern);
    setTargetDept(concern.department || departments[0] || DEFAULT_DEPARTMENTS[0]);
    setDirectiveNotes(
      concern.approval_notes ||
        `Pursuant to official review by the Office of the City Mayor, this citizen concern is officially endorsed to ${
          concern.department || 'the assigned department'
        } for prompt on-site action and resolution.`
    );
  };

  const closeReviewModal = () => {
    setSelectedConcern(null);
    setDispatching(false);
  };

  // Handle Approve and Dispatch API call
  const handleApproveAndDispatch = async () => {
    if (!selectedConcern) return;

    if (!directiveNotes.trim()) {
      toast?.show('Please enter directive notes before dispatching.', 'error');
      return;
    }

    setDispatching(true);
    const isAlreadyDispatched = !!selectedConcern.approved_at;

    try {
      const res = await api.post(`/concerns/${selectedConcern.id}/approve`, {
        approval_notes: directiveNotes.trim(),
        target_department: targetDept,
      });

      if (res.success || res.concern) {
        toast?.show(
          isAlreadyDispatched
            ? `✅ Official Mayoral Directive updated for Docket #CV-${String(selectedConcern.id).padStart(4, '0')}!`
            : `✅ Executive Directive issued! Docket #CV-${String(selectedConcern.id).padStart(4, '0')} dispatched to ${targetDept}.`,
          'success'
        );

        setConcerns((prev) =>
          prev.map((c) => {
            if (c.id === selectedConcern.id) {
              return {
                ...c,
                ...(res.concern || {}),
                approved_at: c.approved_at || new Date().toISOString(),
                approved_by_name:
                  c.approved_by_name || user?.name || 'Office of the City Mayor',
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
      toast?.show(
        'Failed to issue Mayoral Directive: ' + (err.message || 'Unknown error'),
        'error'
      );
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className={s.container}>
      {/* 🏛️ 1. Distinguished Executive Header */}
      <header className={s.header}>
        <div className={s.headerLeft}>
          <div className={s.sealRing}>
            <div className={s.sealPulse} />
            <span>🏛️</span>
          </div>

          <div>
            <div className={s.jurisdiction}>
              <span>Republic of the Philippines</span>
              <span className={s.jurisdictionDot} />
              <span>City of Kabankalan</span>
            </div>
            <h1 className={s.title}>Office of the City Mayor</h1>
            <div className={s.subtitle}>
              <span>Executive Directives & Concern Action Desk</span>
              {liveTime && (
                <div className={s.liveClockBadge}>
                  <span className={s.liveDot} />
                  <span>{liveTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={s.headerRight}>
          {/* Sorting Dropdown (Newest / Oldest) */}
          <select
            className={s.filterSelect}
            style={{ padding: '6px 14px', fontSize: '13px', height: '36px', cursor: 'pointer' }}
            value={sortDirection}
            onChange={(e) => {
              setSortField('created_at');
              setSortDirection(e.target.value);
            }}
            title="Sort by date"
          >
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>

          <div
            className={s.autoRefreshBadge}
            title={`Auto-refreshes every 30 seconds. Last updated: ${lastRefreshed ? lastRefreshed.toLocaleTimeString() : 'Just now'}`}
          >
            <span className={s.livePulseDot} />
            <span>Auto-Refresh 30s</span>
          </div>

          <button
            type="button"
            className={s.btnOutline}
            onClick={() => fetchConcerns(false)}
            disabled={loading}
            title="Refresh concern feed manually"
          >
            <span className={loading ? s.spinningIcon : ''}>
              <IoRefreshOutline />
            </span>
            Refresh
          </button>

          <button
            type="button"
            className={s.btnSignOut}
            onClick={() => (onLogout ? onLogout('/mayor/login') : null)}
            title="Sign out of Mayoral Portal"
          >
            <IoLogOutOutline /> Exit
          </button>
        </div>
      </header>

      {/* 🏛️ 2. Main Executive Workspace: 4 Cards on the Side + Scrollable Concerns Table */}
      <div className={s.portalWorkspace}>
        {/* Left Side: 4 KPI Intelligence Cards (Vertical Executive Strip) */}
        <aside className={s.sidebarCards}>
          <div className={s.sidebarTitle}>
            <span>Executive Queue</span>
            <span className={s.sidebarBadge}>{metrics.total} Total</span>
          </div>

          {/* Card 1: Pending Directives */}
          <div
            className={`${s.metricCard} ${s.cardAmber} ${activeTab === 'pending' ? s.metricCardActive : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <div className={s.metricHeader}>
              <span className={s.metricLabel}>Awaiting Directive</span>
              <div className={s.metricIconWrap}>
                <IoTimeOutline />
              </div>
            </div>
            <div>
              <div className={s.metricValueRow}>
                <span className={s.metricValue}>{metrics.pending}</span>
                <span className={s.metricBadge}>Action Required</span>
              </div>
              <div className={s.metricDescription}>
                Citizen reports pending Mayoral executive review & endorsement
              </div>
            </div>
          </div>

          {/* Card 2: Done Dispatch */}
          <div
            className={`${s.metricCard} ${s.cardEmerald} ${activeTab === 'dispatched' ? s.metricCardActive : ''}`}
            onClick={() => setActiveTab('dispatched')}
          >
            <div className={s.metricHeader}>
              <span className={s.metricLabel}>Done Dispatch</span>
              <div className={s.metricIconWrap}>
                <IoShieldCheckmarkOutline />
              </div>
            </div>
            <div>
              <div className={s.metricValueRow}>
                <span className={s.metricValue}>{metrics.dispatched}</span>
                <span className={s.metricBadge}>Endorsed</span>
              </div>
              <div className={s.metricDescription}>
                Official directives dispatched to municipal departments
              </div>
            </div>
          </div>

          {/* Card 3: High-Risk Hazards */}
          <div
            className={`${s.metricCard} ${s.cardRose} ${activeTab === 'urgent' ? s.metricCardActive : ''}`}
            onClick={() => setActiveTab('urgent')}
          >
            <div className={s.metricHeader}>
              <span className={s.metricLabel}>High-Risk Hazards</span>
              <div className={s.metricIconWrap}>
                <IoFlameOutline />
              </div>
            </div>
            <div>
              <div className={s.metricValueRow}>
                <span className={s.metricValue}>{metrics.urgent}</span>
                <span className={s.metricBadge}>Urgent Attention</span>
              </div>
              <div className={s.metricDescription}>
                Severe civic hazards requiring expedited remediation
              </div>
            </div>
          </div>

          {/* Card 4: Executive Directives Rate */}
          <div
            className={`${s.metricCard} ${s.cardIndigo} ${activeTab === 'all' ? s.metricCardActive : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <div className={s.metricHeader}>
              <span className={s.metricLabel}>Directives Rate</span>
              <div className={s.metricIconWrap}>
                <IoDocumentTextOutline />
              </div>
            </div>
            <div>
              <div className={s.metricValueRow}>
                <span className={s.metricValue}>{metrics.rate}%</span>
                <span className={s.metricBadge}>{metrics.total} Docketed</span>
              </div>
              <div className={s.metricProgressBar}>
                <div
                  className={s.metricProgressFill}
                  style={{ width: `${Math.min(metrics.rate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Content: Scrollable Concerns Table */}
        <main className={s.feedContent}>
          <div className={s.feedHeader}>
            <div className={s.feedTitle}>
              <span>
                {activeTab === 'pending'
                  ? 'Awaiting Directive Queue'
                  : activeTab === 'dispatched'
                  ? 'Done Dispatch Records'
                  : activeTab === 'urgent'
                  ? 'High-Risk Incident Queue'
                  : 'Complete Concern Docket'}
              </span>
              <span className={s.feedCountBadge}>{filteredConcerns.length}</span>
            </div>
          </div>

          {loading ? (
            <div className={s.loadingContainer}>
              <div className={s.loadingSpinner} />
              <div className={s.loadingText}>Accessing Executive Concern Records...</div>
            </div>
          ) : filteredConcerns.length === 0 ? (
            <div className={s.emptyState}>
              <div className={s.emptyIcon}>🏛️</div>
              <div className={s.emptyTitle}>No Matching Concerns in Docket</div>
              <p className={s.emptyText}>
                {activeTab === 'pending'
                  ? 'All citizen concerns have been reviewed. The Mayoral executive inbox is clear.'
                  : 'No concerns found in this queue. Click another executive card on the side to inspect other records.'}
              </p>
            </div>
          ) : (
            <div className={s.tableContainer}>
              <table className={s.docketTable}>
                <colgroup>
                  <col style={{ width: '46%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort('title')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by Concern"
                    >
                      Concern & Citizen {renderSortIcon('title')}
                    </th>
                    <th
                      onClick={() => handleSort('priority')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by Priority"
                    >
                      Priority {renderSortIcon('priority')}
                    </th>
                    <th
                      onClick={() => handleSort('status')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by Directive Status"
                    >
                      Directive Status {renderSortIcon('status')}
                    </th>
                    <th
                      onClick={() => handleSort('created_at')}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by Date"
                    >
                      Date {renderSortIcon('created_at')}
                    </th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConcerns.map((c) => {
                    const isApproved = !!c.approved_at;
                    const isHigh = c.priority === 'High';

                    return (
                      <tr
                        key={c.id}
                        className={s.docketRow}
                        onClick={() => openReviewModal(c)}
                      >
                        <td>
                          <div className={s.tableTitleCell} title={c.title}>
                            {c.title}
                          </div>
                          <div className={s.tableMetaRow}>
                            <span className={s.tableCategoryBadge}>{c.category}</span>
                            <span className={s.tableMetaDivider}>·</span>
                            <span className={s.tableCitizenName}>{fmtName(c.user_name)}</span>
                          </div>
                        </td>
                        <td>
                          {isHigh ? (
                            <span className={s.priorityBadgeHigh}>
                              <span className={s.priorityDotHigh} />
                              High
                            </span>
                          ) : (
                            <span className={s.priorityBadgeNormal}>
                              <span className={s.priorityDotNormal} />
                              Normal
                            </span>
                          )}
                        </td>
                        <td>
                          {isApproved ? (
                            <span
                              className={s.statusBadgeDone}
                              title={`Dispatched on ${fmtDateShort(c.approved_at)}`}
                            >
                              <span className={s.statusDotDone} />
                              Dispatched
                            </span>
                          ) : (
                            <span className={s.statusBadgePending}>
                              <span className={s.statusDotPending} />
                              Pending
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={s.dateCell}>
                            {fmtDateShort(c.created_at)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={!isApproved ? s.btnActionPrimary : s.btnActionOutline}
                            onClick={() => openReviewModal(c)}
                          >
                            {!isApproved ? 'Review' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* 🏛️ 6. Mayoral Executive Directive Action Modal */}
      {selectedConcern && (
        <div className={s.modalBackdrop} onClick={closeReviewModal}>
          <div className={s.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={s.modalHeader}>
              <div>
                <div className={s.modalOrderTitle}>
                  <span>🏛️ Office of the City Mayor</span>
                  <span>·</span>
                  <span>Executive Directive Order</span>
                </div>
                <h2 className={s.modalSubject}>{selectedConcern.title}</h2>
              </div>
              <button
                type="button"
                className={s.modalCloseBtn}
                onClick={closeReviewModal}
                title="Close"
              >
                <IoCloseOutline />
              </button>
            </div>

            {/* Modal Body */}
            <div className={s.modalBody}>
              {/* Left Column: Citizen Dossier */}
              <div className={s.dossierCol}>
                <div className={s.sectionHeader}>
                  <IoDocumentTextOutline /> Citizen Incident Evidence
                </div>

                {selectedConcern.image_url ? (
                  <div
                    className={s.modalPhotoBox}
                    onClick={() => setLightboxImage(resolveImageUrl(selectedConcern.image_url))}
                    title="Click to view full photo evidence"
                  >
                    <img
                      src={resolveImageUrl(selectedConcern.image_url)}
                      alt="Incident Evidence"
                    />
                    <div className={s.photoZoomOverlay}>
                      <IoEyeOutline style={{ fontSize: 16 }} />
                      <span>Click for Fullscreen Inspection</span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      height: 80,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      fontSize: 12,
                    }}
                  >
                    No photo evidence submitted by citizen
                  </div>
                )}

                <div className={s.citizenStatementBox}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Citizen Statement:
                  </div>
                  {selectedConcern.description}
                </div>

                <div className={s.citizenInfoGrid}>
                  <div className={`${s.citizenField} ${s.citizenFieldFull}`}>
                    <div className={s.citizenFieldLabel}>Reporting Citizen</div>
                    <div className={s.citizenFieldValue}>
                      {selectedConcern.user_name || 'Anonymous Citizen'}
                    </div>
                  </div>


                  <div className={s.citizenField}>
                    <div className={s.citizenFieldLabel}>Category</div>
                    <div className={s.citizenFieldValue}>{selectedConcern.category}</div>
                  </div>

                  <div className={s.citizenField}>
                    <div className={s.citizenFieldLabel}>Priority Rating</div>
                    <div
                      className={s.citizenFieldValue}
                      style={{
                        color: selectedConcern.priority === 'High' ? '#ef4444' : '#10b981',
                      }}
                    >
                      {selectedConcern.priority === 'High' ? '🚨 High Risk' : 'Normal'}
                    </div>
                  </div>
                </div>

                {selectedConcern.approved_by_name &&
                  (selectedConcern.approved_by_name.includes('Bypassed') ||
                    selectedConcern.approved_by_name.includes('Emergency')) && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.14)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        fontSize: 12,
                        color: '#fca5a5',
                        lineHeight: 1.5,
                      }}
                    >
                      <strong style={{ display: 'block', color: '#f87171', marginBottom: 2 }}>
                        ⚡ Emergency Protocol Dispatched
                      </strong>
                      Validated by Admin and dispatched directly to{' '}
                      <strong>{selectedConcern.department}</strong> due to critical emergency status.
                    </div>
                  )}
              </div>

              {/* Right Column: Mayoral Executive Directive Workspace */}
              <div className={s.directiveCol}>
                <div className={s.sectionHeader}>
                  <IoBusinessOutline /> Executive Action Directives
                </div>

                {/* Target Department Selection */}
                <div>
                  <label className={s.formLabel}>
                    <span>Assign Target Department *</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                      Responsible City Entity
                    </span>
                  </label>
                  <select
                    className={s.filterSelect}
                    style={{ width: '100%', padding: '11px 14px', fontSize: 13.5 }}
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

                {/* Directive Note */}
                <div className={s.directiveFormGroup}>
                  <label className={s.formLabel}>
                    <span>Official Directive & Instructions *</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                      Will be attached to official docket
                    </span>
                  </label>

                  <textarea
                    className={s.directiveTextarea}
                    value={directiveNotes}
                    onChange={(e) => setDirectiveNotes(e.target.value)}
                    placeholder="Enter formal executive instructions, deployment orders, or priority directives..."
                  />
                  <div className={s.directiveCharCountRow}>
                    <span>
                      {selectedConcern.approved_at
                        ? 'Editing this note updates the official municipal record.'
                        : `Directs ${targetDept} to take on-site action.`}
                    </span>
                    <span>{directiveNotes.length} chars</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className={s.modalFooter}>
              <div className={s.sealStampNotice}>
                <span>⚖️</span>
                <span>
                  Official endorsement signed under authority of the Office of the City Mayor.
                </span>
              </div>

              <div className={s.modalFooterBtns}>
                <button
                  type="button"
                  className={s.btnOutline}
                  onClick={closeReviewModal}
                  disabled={dispatching}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={s.btnActionPrimary}
                  style={{
                    background: selectedConcern.approved_at
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                    borderColor: selectedConcern.approved_at ? '#10B981' : '#f59e0b',
                    padding: '10px 20px',
                    fontSize: 13.5,
                  }}
                  onClick={handleApproveAndDispatch}
                  disabled={dispatching || !directiveNotes.trim()}
                >
                  {dispatching ? (
                    <>
                      <span className={s.spinningIcon}>⏳</span>
                      <span>Endorsing...</span>
                    </>
                  ) : selectedConcern.approved_at ? (
                    <>
                      <span>💾 Save & Update Directive Note</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Issue Directive & Done Dispatch →</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 7. Fullscreen Image Inspection Lightbox */}
      {lightboxImage && (
        <div className={s.lightboxBackdrop} onClick={() => setLightboxImage(null)}>
          <button
            type="button"
            className={s.lightboxCloseBtn}
            onClick={() => setLightboxImage(null)}
            title="Close Lightbox"
          >
            <IoCloseOutline />
          </button>
          <img
            src={lightboxImage}
            alt="Inspection Evidence"
            className={s.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
          <div className={s.lightboxCaption}>
            Citizen Photo Evidence · Office of the City Mayor Case Dossier
          </div>
        </div>
      )}
    </div>
  );
}
