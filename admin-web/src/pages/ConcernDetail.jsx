import React, { useEffect, useState } from 'react';
import { api, fmtDate, fmtDateShort, resolveImageUrl } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatbot } from '../context/ChatbotContext';
import s from '../styles/Admin.module.css';
import cd from '../styles/ConcernDetail.module.css';

const SC = {
  Pending: '#F59E0B',
  'In Progress': '#3B82F6',
  Resolved: '#10B981',
  Rejected: '#EF4444',
};
const PC = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };
const STATUSES = [
  { key: 'Pending', icon: '⏳', label: 'Pending' },
  { key: 'In Progress', icon: '🔄', label: 'In Progress' },
  { key: 'Resolved', icon: '✅', label: 'Resolved' },
  { key: 'Rejected', icon: '❌', label: 'Rejected' },
];

const CATEGORIES = [
  'Road & Infrastructure',
  'Electricity',
  'Drainage',
  'Waste & Sanitation',
];
const PRIORITIES = ['High', 'Medium', 'Low'];

export default function ConcernDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [concern, setConcern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selStatus, setSelStatus] = useState('');
  const [selCategory, setSelCategory] = useState('');
  const [selPriority, setSelPriority] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { setContextData } = useChatbot();

  // Proof of resolution states
  const [resolvedFile, setResolvedFile] = useState(null);
  const [resolvedPreview, setResolvedPreview] = useState(null);
  const [clearResolvedImage, setClearResolvedImage] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResolvedFile(file);
      setResolvedPreview(URL.createObjectURL(file));
      setClearResolvedImage(false);
    }
  };

  // AI Features state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [similarConcerns, setSimilarConcerns] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Workflow & Executive Approval state
  const [assignments, setAssignments] = useState([]);
  const [comments, setComments] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(true);
  const [targetDeptComment, setTargetDeptComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Approval & Email state
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalTargetDept, setApprovalTargetDept] = useState('');
  const [approving, setApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(null);

  useEffect(() => {
    if (!id) return;
    Promise.allSettled([
      api.get(`/concerns/${id}`),
      api.get(`/concerns/${id}/assignments`),
      api.get(`/concerns/${id}/comments`),
      api.get(`/concerns/${id}/audit`),
      api.get('/departments')
    ])
      .then(([cRes, aRes, comRes, audRes, deptRes]) => {
        const cData = cRes.status === 'fulfilled' ? cRes.value : null;
        const aData = aRes.status === 'fulfilled' ? aRes.value : [];
        const comData = comRes.status === 'fulfilled' ? comRes.value : [];
        const audData = audRes.status === 'fulfilled' ? audRes.value : [];
        const deptList = deptRes.status === 'fulfilled' ? deptRes.value : [];

        if (!cData) {
          console.error('Failed to load concern:', cRes.reason);
          return;
        }

        setConcern(cData);
        setSelStatus(cData.status || 'Pending');
        setSelCategory(cData.category || 'Other');
        setSelPriority(cData.priority || 'Medium');
        setNote(cData.admin_note || '');
        setApprovalNotes(cData.approval_notes || 'Approved for immediate evaluation and action.');
        setApprovalTargetDept(cData.department || (deptList && deptList[0]?.name) || "City Engineer's Office (CEO)");
        setAssignments(aData || []);
        setComments(comData || []);
        setAuditLog(audData || []);
        setDepartments(deptList || []);

        setContextData({
          page: 'ConcernDetail',
          concern: cData,
          assignments: aData,
          comments: comData
        });

        // After loading concern, load similar ones
        if (cData.id) loadSimilarConcerns(cData.id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    return () => {
      setContextData(null);
    };
  }, [id]);

  const loadSimilarConcerns = (concernId) => {
    setLoadingSimilar(true);
    api
      .get(`/concerns/${concernId}/similar`)
      .then((data) => {
        const all = [...(data.linked || []), ...(data.computed || [])];
        setSimilarConcerns(all.slice(0, 5));
      })
      .catch(() => setSimilarConcerns([]))
      .finally(() => setLoadingSimilar(false));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let body;
      const isMultipart = !!resolvedFile;

      if (isMultipart) {
        body = new FormData();
        body.append('status', selStatus);
        body.append('category', selCategory);
        body.append('priority', selPriority);
        if (note.trim()) {
          body.append('admin_note', note.trim());
        }
        body.append('image', resolvedFile);
      } else {
        body = {
          status: selStatus,
          category: selCategory,
          priority: selPriority,
          admin_note: note.trim() || null,
        };
        if (clearResolvedImage) {
          body.resolved_image_url = null;
        }
      }

      await api.put(`/concerns/${id}`, body);
      setSaved(true);
      setResolvedFile(null);
      setResolvedPreview(null);
      setClearResolvedImage(false);
      setTimeout(() => setSaved(false), 3000);
      // Refetch to sync
      const updated = await api.get(`/concerns/${id}`);
      setConcern(updated);
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    try {
      const result = await api.post(`/concerns/${id}/ai-response`);
      if (result.response) {
        setNote(result.response);
      }
    } catch (err) {
      alert('AI generation failed: ' + err.message);
    }
    setAiGenerating(false);
  };

  const handleApproveAndDispatch = async () => {
    setApproving(true);
    setApprovalSuccess(null);
    try {
      const res = await api.post(`/concerns/${id}/approve`, {
        approval_notes: approvalNotes.trim(),
        target_department: approvalTargetDept
      });
      if (res.success) {
        setConcern(res.concern);
        setSelStatus(res.concern.status || 'In Progress');
        setApprovalSuccess(`✅ Concern Approved! Email notice dispatched to ${res.department_notified}.`);
        
        // Refresh audit log & assignments
        const [newAudit, newAssignments] = await Promise.all([
          api.get(`/concerns/${id}/audit`),
          api.get(`/concerns/${id}/assignments`)
        ]);
        setAuditLog(newAudit || []);
        setAssignments(newAssignments || []);
      }
    } catch (err) {
      alert('Failed to approve concern: ' + (err.message || 'Unknown error'));
    } finally {
      setApproving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await api.post(`/concerns/${id}/comments`, {
        comment: newComment.trim(),
        is_internal: isInternalComment,
        target_department: targetDeptComment || null,
      });
      setNewComment('');
      setTargetDeptComment('');
      const updatedComments = await api.get(`/concerns/${id}/comments`);
      setComments(updatedComments || []);
    } catch (err) {
      alert('Failed to add comment: ' + err.message);
    }
    setAddingComment(false);
  };

  const renderSLA = () => {
    if (!assignments || assignments.length === 0) return null;
    const latest = assignments[0];
    
    const deadline = new Date(latest.sla_deadline);
    const now = new Date();
    const diffHours = (deadline - now) / (1000 * 60 * 60);
    
    let color = 'var(--green)';
    let bg = 'rgba(16,185,129,0.1)';
    if (diffHours < 0) { color = 'var(--red)'; bg = 'rgba(239,68,68,0.1)'; }
    else if (diffHours < 24) { color = 'var(--yellow)'; bg = 'rgba(245,158,11,0.1)'; }

    return (
      <div className={s.card} style={{ padding: '12px 14px', background: bg, border: `1px solid ${color}` }}>
        <div className={s.sectionLabel} style={{ marginBottom: 4, color }}>
          ⏳ SLA Timer
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color }}>
          {diffHours < 0 ? `Breached by ${Math.abs(diffHours).toFixed(1)} hrs` : `${diffHours.toFixed(1)} hrs remaining`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-1)', marginTop: 4 }}>
          Department: {latest.department}
        </div>
        {latest.assignee_name && (
          <div style={{ fontSize: 11, color: 'var(--text-1)', marginTop: 2 }}>
            Assigned to: {latest.assignee_name}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className={s.loading}>Loading…</div>;
  if (!concern) return <div className={s.loading}>Concern not found.</div>;

  const hasChanges =
    selStatus !== concern.status ||
    selCategory !== concern.category ||
    selPriority !== concern.priority ||
    note !== (concern.admin_note || '') ||
    clearResolvedImage ||
    !!resolvedFile;

  const buildTimeline = (c) => {
    const steps = [{ event: 'Concern submitted', date: fmtDateShort(c.created_at) }];
    if (['In Progress', 'Resolved', 'Rejected'].includes(c.status))
      steps.push({ event: 'Assigned to team', date: fmtDateShort(c.updated_at) });
    if (c.status === 'Resolved') {
      steps.push({ event: 'Work started', date: fmtDateShort(c.updated_at) });
      steps.push({ event: 'Marked as resolved', date: fmtDateShort(c.updated_at) });
    }
    if (c.status === 'Rejected')
      steps.push({ event: 'Concern rejected', date: fmtDateShort(c.updated_at) });
    return steps;
  };

  return (
    <div className={s.page}>
      {/* Breadcrumb */}
      <div className={s.breadcrumb}>
        <button
          className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
          onClick={() => navigate('/concerns')}
        >
          ← Concerns
        </button>
        <span className={s.breadcrumbSep}>/</span>
        <span className={s.breadcrumbSep} style={{ color: 'var(--text-2)' }}>
          {concern.title?.slice(0, 40)}…
        </span>
        <span
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--green)',
            fontSize: 12,
            background: 'rgba(16,185,129,0.1)',
            padding: '4px 10px',
            borderRadius: 99,
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          🛡 Admin Review
        </span>
      </div>

      <div className={s.twoColDetail}>
        {/* ── Left ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title card */}
          <div className={s.card}>
            <div className={s.cardBody}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span
                  className={s.badge}
                  style={{
                    background: (SC[concern.status] || '#475569') + '18',
                    color: SC[concern.status] || '#94A3B8',
                    fontSize: 12,
                  }}
                >
                  {concern.status}
                </span>
                <span
                  className={s.badge}
                  style={{
                    background: (PC[concern.priority] || '#475569') + '18',
                    color: PC[concern.priority] || '#94A3B8',
                    fontSize: 12,
                  }}
                >
                  {concern.priority} Priority
                </span>
                <span
                  className={s.badge}
                  style={{
                    background: 'rgba(59,130,246,0.1)',
                    color: 'var(--blue-light)',
                    fontSize: 12,
                  }}
                >
                  {concern.category}
                </span>
              </div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-1)',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.4,
                }}
              >
                {concern.title}
              </h2>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '👤', label: 'Submitted by', value: concern.user_name },
              { icon: '📍', label: 'Barangay', value: concern.user_barangay },
              { icon: '📅', label: 'Date Filed', value: fmtDate(concern.created_at) },
              { icon: '👍', label: 'Community Votes', value: `${concern.upvotes || 0} upvotes` },
            ].map((m, i) => (
              <div key={i} className={`${s.card} ${cd.metaCard}`}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div>
                  <div className={s.sectionLabel} style={{ marginBottom: 3 }}>
                    {m.label}
                  </div>
                  <div className={s.textPrimary} style={{ fontSize: 13 }}>
                    {m.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Workflow SLA */}
          {renderSLA()}

          {/* Description */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Description</span>
            </div>
            <div className={s.cardBody}>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
                {concern.description}
              </p>
            </div>
          </div>

          {/* Image */}
          {concern.image_url && (
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.cardTitle}>Attached Photo</span>
              </div>
              <img
                src={resolveImageUrl(concern.image_url)}
                alt="Concern"
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Proof Photo — admin-attached work/resolution photo */}
          {concern.resolved_image_url && (() => {
            const isResolved = concern.status === 'Resolved';
            const proofIcon = isResolved ? '✅' : '📸';
            const proofLabel = isResolved ? 'Proof of Completion' : 'Work-in-Progress Photo';
            const proofSub = isResolved
              ? 'Photo attached by admin confirming work is done'
              : 'Photo attached by admin showing current work status';
            return (
              <div className={s.card}>
                <div className={s.cardHeader} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{proofIcon}</span>
                  <div style={{ flex: 1 }}>
                    <span className={s.cardTitle}>{proofLabel}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{proofSub}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 99,
                      background: isResolved ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.12)',
                      color: isResolved ? '#10B981' : '#3B82F6',
                      fontWeight: 600,
                    }}
                  >
                    {isResolved ? 'Resolved' : concern.status}
                  </span>
                </div>
                <a href={resolveImageUrl(concern.resolved_image_url)} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                  <img
                    src={resolveImageUrl(concern.resolved_image_url)}
                    alt="Proof Photo"
                    style={{ width: '100%', maxHeight: 300, objectFit: 'cover', cursor: 'zoom-in', transition: 'opacity 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                  />
                </a>
                <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
                  🔗 Click image to open full size · Visible to the citizen in the mobile app
                </div>
              </div>
            );
          })()}


          {/* Location */}
          {concern.location_address && (
            <div className={s.card}>
              <div className={s.cardHeader}>
                <span className={s.cardTitle}>Location</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>📌</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                    {concern.location_address}
                  </div>
                  {concern.location_lat && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                      {parseFloat(concern.location_lat).toFixed(5)},{' '}
                      {parseFloat(concern.location_lng).toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Audit Trail</span>
            </div>
            <div style={{ padding: '8px 16px 16px' }}>
              {auditLog.map((log, i, arr) => (
                <div
                  key={log.id}
                  className={cd.timelineItem}
                  style={{ marginBottom: i < arr.length - 1 ? 0 : 4 }}
                >
                  <div className={cd.timelineLeft}>
                    <div className={cd.timelineDot} />
                    {i < arr.length - 1 && <div className={cd.timelineLine} />}
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div className={cd.timelineEvent}>{log.action.replace(/_/g, ' ')}</div>
                    <div className={cd.timelineDate}>{fmtDateShort(log.created_at)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                      By: {log.changed_by_name || 'System'}
                    </div>
                  </div>
                </div>
              ))}
              {auditLog.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0' }}>
                  No audit history.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Integrated Executive Action Hub ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Integrated Action Hub */}
          <div className={s.card} style={{ border: '1px solid rgba(59,130,246,0.4)', background: 'var(--surface-1)' }}>
            <div className={s.cardHeader} style={{ borderBottom: '1px solid var(--border)' }}>
              <span className={s.cardTitle} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🏛️ Executive Action & Response Hub
              </span>
              <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                Unified Controls
              </span>
            </div>
            <div style={{ padding: '16px' }}>
              
              {/* Executive Approval Badge & Dispatch */}
              {concern.approved_at ? (
                <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '10px 12px', borderRadius: 8, marginBottom: 16, fontSize: 12, color: 'var(--green)' }}>
                  <strong>✅ Officially Approved</strong>
                  <div style={{ marginTop: 2, fontSize: 11, opacity: 0.9 }}>
                    Approved on {fmtDate(concern.approved_at)} by <strong>{concern.approved_by_name || "City Admin"}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', padding: '12px', borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>⚡ Fast-Track Executive Approval</span>
                    <button
                      className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}
                      style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
                      onClick={handleApproveAndDispatch}
                      disabled={approving}
                    >
                      {approving ? 'Processing...' : '⚡ Approve & Email Department'}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
                    Approving automatically alerts the assigned department office email.
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      className={s.select}
                      style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}
                      value={approvalTargetDept}
                      onChange={(e) => setApprovalTargetDept(e.target.value)}
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          Target: {d.name} {d.email ? `(${d.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {approvalSuccess && (
                <div className={s.successBanner} style={{ marginBottom: 14 }}>
                  {approvalSuccess}
                </div>
              )}

              {/* Status Selector */}
              <div style={{ marginBottom: 14 }}>
                <div className={s.sectionLabel} style={{ marginBottom: 6 }}>Set Concern Status</div>
                <div className={cd.statusGrid}>
                  {STATUSES.map((st) => {
                    const active = selStatus === st.key;
                    const c = SC[st.key];
                    return (
                      <button
                        key={st.key}
                        className={`${cd.statusBtn} ${active ? cd.statusBtnActive : ''}`}
                        style={{
                          background: active ? c + '18' : 'var(--surface-3)',
                          border: `1px solid ${active ? c : 'var(--border)'}`,
                          color: active ? c : 'var(--text-2)',
                        }}
                        onClick={() => setSelStatus(st.key)}
                      >
                        <span>{st.icon}</span> {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Official Citizen Response */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className={s.sectionLabel}>Official Response (Visible to citizen)</span>
                  <button
                    onClick={handleAiGenerate}
                    disabled={aiGenerating}
                    className={`${cd.aiDraftBtn} ${aiGenerating ? cd.aiDraftBtnGenerating : ''}`}
                    style={{ fontSize: 11, padding: '3px 8px' }}
                  >
                    {aiGenerating ? '⚙️ Generating...' : '✨ AI Draft'}
                  </button>
                </div>

                <textarea
                  className={s.textarea}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Road crew dispatched. Expected completion: Dec 15. Thank you for your report."
                  rows={4}
                />
              </div>

              {/* Proof of Work Image Upload */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 14 }}>
                <div className={s.sectionLabel} style={{ marginBottom: 4 }}>
                  📸 {selStatus === 'Resolved' ? 'Proof of Completion Photo' : 'Attach Status Photo'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                  Attach proof photo showing work progress or resolution.
                </div>

                {concern.resolved_image_url && !resolvedPreview && !clearResolvedImage && (
                  <div style={{ position: 'relative', marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img
                      src={resolveImageUrl(concern.resolved_image_url)}
                      alt="Resolution Proof"
                      style={{ width: '100%', maxHeight: 150, objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#fff' }}>Current proof uploaded</span>
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                        style={{ color: '#ff4d4d', padding: '2px 6px', fontSize: 10 }}
                        onClick={() => setClearResolvedImage(true)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {resolvedPreview && (
                  <div style={{ position: 'relative', marginBottom: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--primary)' }}>
                    <img
                      src={resolvedPreview}
                      alt="Resolution Proof Preview"
                      style={{ width: '100%', maxHeight: 150, objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#fff' }}>New proof selected</span>
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                        style={{ color: '#ff4d4d', padding: '2px 6px', fontSize: 10 }}
                        onClick={() => {
                          setResolvedFile(null);
                          setResolvedPreview(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    border: '1px dashed var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: 'var(--surface-2)',
                    fontSize: 12,
                  }}
                >
                  <span>📤</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {resolvedFile ? 'Change Photo' : 'Upload Proof Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Single Primary Action Button */}
              {saved ? (
                <div className={s.successBanner}>
                  <span>✅</span> Status and response updated successfully!
                </div>
              ) : (
                <button
                  className={`${s.btn} ${s.btnPrimary}`}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    opacity: !hasChanges || saving ? 0.5 : 1,
                  }}
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                >
                  {saving ? 'Saving...' : '💾 Save Status & Response'}
                </button>
              )}
            </div>
          </div>

          {/* Feature 3: Similar/Duplicate Concerns */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>🔗 Similar Concerns</span>
              {similarConcerns.length > 0 && (
                <span
                  className={s.badge}
                  style={{ background: 'rgba(249,115,22,0.12)', color: '#F97316', fontSize: 11 }}
                >
                  {similarConcerns.length}
                </span>
              )}
            </div>
            <div style={{ padding: '8px 16px 14px' }}>
              {loadingSimilar ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0' }}>
                  Scanning for duplicates...
                </div>
              ) : similarConcerns.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    padding: '10px 0',
                    textAlign: 'center',
                  }}
                >
                  ✅ No similar concerns found
                </div>
              ) : (
                similarConcerns.map((sc, i) => (
                  <div
                    key={sc.id}
                    onClick={() => navigate(`/concerns/${sc.id}`)}
                    className={cd.similarCard}
                    style={{ marginBottom: i < similarConcerns.length - 1 ? 6 : 0 }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-1)',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sc.title}
                      </span>
                      <span
                        className={s.badge}
                        style={{
                          fontSize: 10,
                          marginLeft: 8,
                          flexShrink: 0,
                          background:
                            (sc.link_type || sc.match_type) === 'duplicate'
                              ? 'rgba(239,68,68,0.12)'
                              : 'rgba(59,130,246,0.12)',
                          color:
                            (sc.link_type || sc.match_type) === 'duplicate' ? '#EF4444' : '#3B82F6',
                        }}
                      >
                        {(sc.link_type || sc.match_type) === 'duplicate' ? 'Duplicate' : 'Related'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-3)' }}>
                      <span>{sc.category}</span>
                      <span>·</span>
                      <span style={{ color: SC[sc.status] || 'var(--text-3)' }}>{sc.status}</span>
                      {sc.similarity_score != null && (
                        <>
                          <span>·</span>
                          <span style={{ color: 'var(--blue-light)' }}>
                            {sc.similarity_score}% match
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comments / Inter-Departmental Communication Hub */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>💬 Inter-Department Communication</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {comments.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>No inter-department notes yet.</div>
                )}
                {comments.map(c => (
                  <div key={c.id} style={{ 
                    padding: 10, 
                    background: c.is_internal ? 'rgba(245,158,11,0.08)' : 'var(--surface-3)', 
                    borderLeft: c.target_department ? '3px solid #3b82f6' : c.is_internal ? '3px solid var(--yellow)' : '3px solid var(--blue)',
                    borderRadius: 6 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{c.user_name}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{fmtDateShort(c.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.4 }}>
                      {c.comment}
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {c.target_department && (
                        <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                          🏛️ Directive to: {c.target_department}
                        </span>
                      )}
                      {Boolean(c.is_internal) && (
                        <span style={{ fontSize: 10, color: 'var(--yellow)' }}>🔒 Internal Note</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className={s.select}
                    style={{ fontSize: 11, padding: '4px 8px', flex: 1 }}
                    value={targetDeptComment}
                    onChange={(e) => setTargetDeptComment(e.target.value)}
                  >
                    <option value="">💬 General Internal Note</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        🏛️ Target Directive: {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  className={s.textarea}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type an internal note or inter-department directive..."
                  rows={2}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input 
                      type="checkbox" 
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                    />
                    Internal Note (Admins only)
                  </label>
                  <button 
                    className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}
                    onClick={handleAddComment}
                    disabled={addingComment || !newComment.trim()}
                  >
                    {addingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
