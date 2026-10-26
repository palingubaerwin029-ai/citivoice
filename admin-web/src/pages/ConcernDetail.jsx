import React, { useEffect, useState, useRef } from 'react';
import { api, fmtDate, fmtDateShort, resolveImageUrl, getPinBarangay, getCategoryConfig } from '../services/api';
import { socket } from '../services/socket';
import { useParams, useNavigate } from 'react-router-dom';
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

  // Proof of resolution states
  const [resolvedFile, setResolvedFile] = useState(null);
  const [resolvedPreview, setResolvedPreview] = useState(null);
  const [clearResolvedImage, setClearResolvedImage] = useState(false);

  // Lightbox viewer state for attached pictures
  const [lightboxImg, setLightboxImg] = useState(null);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [imgError, setImgError] = useState(false);

  // Close lightbox on ESC key press & lock background scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxImg(null);
      }
    };
    if (lightboxImg) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxImg]);

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
  const [addingComment, setAddingComment] = useState(false);

  const [selDept, setSelDept] = useState('');

  // Auto-resize Official Response textarea so all text is visible
  const noteRef = useRef(null);
  useEffect(() => {
    if (noteRef.current) {
      noteRef.current.style.height = 'auto';
      noteRef.current.style.height = `${Math.max(130, noteRef.current.scrollHeight + 6)}px`;
    }
  }, [note]);

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
        if (!cData.admin_viewed_at) {
          api.post(`/concerns/${id}/view`)
            .then((vRes) => {
              if (vRes?.admin_viewed_at) {
                setConcern((prev) => (prev ? { ...prev, admin_viewed_at: vRes.admin_viewed_at } : prev));
              }
            })
            .catch(() => {});
        }
        setSelStatus(cData.status || 'Pending');
        setSelCategory(cData.category || 'Other');
        setSelPriority(cData.priority || 'Medium');
        const rawNote = cData.admin_note || '';
        const initialNote = (rawNote && !rawNote.includes('[High-Priority Hazard]') && !rawNote.includes('[AI Flag:'))
          ? rawNote.replace(/\[(?:Auto-)?Duplicate(?: concern)? of [^\]]+\]\s*/gi, '').trim()
          : '';
        setNote(initialNote);
        setAuditLog((audData || []).filter(l => !['auto_assigned', 'reassigned', 'auto assigned', 're-assigned'].includes(l.action?.toLowerCase())));
        setDepartments(deptList || []);
        setSelDept(cData.department || (deptList[0]?.name || ''));

        // After loading concern, load similar ones
        if (cData.id) loadSimilarConcerns(cData.id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

  }, [id]);

  useEffect(() => {
    const handleNewComment = (payload) => {
      if (payload && Number(payload.concern_id) === Number(id)) {
        setComments((prev) => {
          if (prev.some((c) => c.id === payload.id)) return prev;
          return [...prev, payload];
        });
      }
    };

    socket.on('new_comment', handleNewComment);
    socket.on('concern_comment_added', handleNewComment);

    return () => {
      socket.off('new_comment', handleNewComment);
      socket.off('concern_comment_added', handleNewComment);
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
        if (selDept) body.append('department', selDept);
        if (note.trim()) {
          body.append('admin_note', note.trim());
        }
        body.append('image', resolvedFile);
      } else {
        body = {
          status: selStatus,
          category: selCategory,
          priority: selPriority,
          department: selDept || null,
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await api.post(`/concerns/${id}/comments`, {
        comment: newComment.trim(),
      });
      setNewComment('');
      const updatedComments = await api.get(`/concerns/${id}/comments`);
      setComments(updatedComments || []);
    } catch (err) {
      alert('Failed to send reply: ' + err.message);
    }
    setAddingComment(false);
  };



  if (loading) return <div className={s.loading}>Loading…</div>;
  if (!concern) return <div className={s.loading}>Concern not found.</div>;

  const hasChanges =
    selStatus !== concern.status ||
    selCategory !== concern.category ||
    selPriority !== concern.priority ||
    selDept !== (concern.department || '') ||
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
                {(() => {
                  const catCfg = getCategoryConfig(concern.category);
                  return (
                    <span
                      className={s.badge}
                      style={{
                        background: catCfg.bg,
                        color: catCfg.color,
                        border: `1px solid ${catCfg.border}`,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontWeight: 600,
                      }}
                    >
                      <span>{catCfg.icon}</span>
                      <span>{concern.category}</span>
                    </span>
                  );
                })()}

                {concern.admin_viewed_at && (
                  <span
                    className={s.badge}
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3B82F6',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      fontSize: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontWeight: 600,
                    }}
                    title={`Admin viewed on ${fmtDate(concern.admin_viewed_at)}`}
                  >
                    <span>👁️</span>
                    <span>Viewed {fmtDateShort(concern.admin_viewed_at)}</span>
                  </span>
                )}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {[
              {
                icon: '👤',
                label: 'Submitted by',
                value: concern.user_name || 'Citizen',
                subtext: concern.user_barangay ? `Resident of Brgy. ${concern.user_barangay}` : null,
              },
              {
                icon: '📍',
                label: 'Incident Barangay (Click for Map)',
                value: getPinBarangay(concern),
                clickable: true,
                onClick: () =>
                  navigate(
                    `/map?concernId=${concern.id}&lat=${concern.location_lat || ''}&lng=${concern.location_lng || ''}`
                  ),
              },
              { icon: '📅', label: 'Date Filed', value: fmtDate(concern.created_at) },
              {
                icon: '👁️',
                label: 'Admin Viewed',
                value: concern.admin_viewed_at ? fmtDate(concern.admin_viewed_at) : 'First Viewed Just Now',
              },
            ].map((m, i) => (
              <div
                key={i}
                className={`${s.card} ${cd.metaCard}`}
                style={m.clickable ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}}
                onClick={m.onClick}
                title={m.clickable ? 'Click to view on MapView' : undefined}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div>
                  <div className={s.sectionLabel} style={{ marginBottom: 3 }}>
                    {m.label}
                  </div>
                  <div
                    className={s.textPrimary}
                    style={{ fontSize: 13, color: m.clickable ? 'var(--blue-light, #3b82f6)' : undefined }}
                  >
                    {m.value} {m.clickable && '↗'}
                  </div>
                  {m.subtext && (
                    <div style={{ fontSize: 11, color: 'var(--text-3, #94a3b8)', marginTop: 2 }}>
                      {m.subtext}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

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
              <div className={s.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>📷</span>
                  <span className={s.cardTitle}>Attached Citizen Photo</span>
                </div>
              </div>

              <div
                style={{
                  position: 'relative',
                  cursor: imgError ? 'default' : 'zoom-in',
                  overflow: 'hidden',
                  background: 'var(--surface-2)',
                }}
                onClick={() => {
                  if (imgError) return;
                  setLightboxImg(resolveImageUrl(concern.image_url));
                  setLightboxTitle('Attached Citizen Photo');
                }}
                title={imgError ? undefined : 'Click to view full size'}
              >
                {imgError ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      background: 'rgba(239, 68, 68, 0.04)',
                    }}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 14, marginBottom: 4 }}>
                      Photo File Not Found on Server (404)
                    </div>
                    <p style={{ margin: '0 auto', maxWidth: 440, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                      The file was cleared during a Render server restart (ephemeral disk storage). To persist photos permanently in production, use a Render persistent disk or cloud storage (e.g. S3 / Cloudinary).
                    </p>
                  </div>
                ) : (
                  <img
                    src={resolveImageUrl(concern.image_url)}
                    alt="Concern Attachment"
                    loading="lazy"
                    decoding="async"
                    onError={() => setImgError(true)}
                    style={{
                      width: '100%',
                      maxHeight: 320,
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.25s ease, filter 0.25s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.filter = 'brightness(0.92)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.filter = 'none';
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: '9px 16px',
                  fontSize: 12,
                  color: 'var(--text-3)',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Photo uploaded by citizen during submission</span>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: 0,
                  }}
                  onClick={() => {
                    setLightboxImg(resolveImageUrl(concern.image_url));
                    setLightboxTitle('Attached Citizen Photo');
                  }}
                >
                  Expand ↗
                </button>
              </div>
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
                <div
                  style={{ position: 'relative', cursor: 'zoom-in', overflow: 'hidden' }}
                  onClick={() => {
                    setLightboxImg(resolveImageUrl(concern.resolved_image_url));
                    setLightboxTitle(proofLabel);
                  }}
                  title="Click to view full size"
                >
                  <img
                    src={resolveImageUrl(concern.resolved_image_url)}
                    alt="Proof Photo"
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      maxHeight: 320,
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.25s ease, filter 0.25s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.filter = 'brightness(0.92)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.filter = 'none';
                    }}
                  />
                </div>
                <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Visible to the citizen in the mobile app</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0 }}
                    onClick={() => {
                      setLightboxImg(resolveImageUrl(concern.resolved_image_url));
                      setLightboxTitle(proofLabel);
                    }}
                  >
                    Expand ↗
                  </button>
                </div>
              </div>
            );
          })()}


          {/* Location */}
          {(concern.location_address || concern.location_lat || concern.user_barangay) && (
            <div
              className={s.card}
              onClick={() => {
                navigate(
                  `/map?concernId=${concern.id}&lat=${concern.location_lat || ''}&lng=${concern.location_lng || ''}`
                );
              }}
              style={{
                cursor: 'pointer',
                border: '1px solid var(--border)',
                transition: 'all 0.2s ease',
              }}
              title="Click to view and navigate on MapView"
            >
              <div
                className={s.cardHeader}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <span className={s.cardTitle}>Location</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--primary)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>Open in MapView</span>
                  <span>↗</span>
                </span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: 'rgba(26, 107, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                    border: '1px solid rgba(26, 107, 255, 0.25)',
                  }}
                >
                  📌
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.4 }}>
                    {concern.location_address || `Barangay ${getPinBarangay(concern)}`}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--blue-light, #3b82f6)',
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#60a5fa' }}>
                      📍 {getPinBarangay(concern)}
                    </span>
                    {concern.location_lat && concern.location_lng && (
                      <>
                        <span style={{ color: 'var(--text-3)' }}>&bull;</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {parseFloat(concern.location_lat).toFixed(5)},{' '}
                          {parseFloat(concern.location_lng).toFixed(5)}
                        </span>
                      </>
                    )}
                    <span style={{ color: 'var(--text-3)' }}>&bull; Click to open interactive map &amp; route</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Citizen Comments & Admin Replies */}
          <div className={s.card}>
            <div className={s.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>💬</span>
                <span className={s.cardTitle}>Citizen Comments</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--primary, #3b82f6)',
                }}>
                  {comments.length}
                </span>
              </div>
            </div>

            <div style={{ padding: '16px' }}>
              {/* Comment thread */}
              {comments.length === 0 ? (
                <div style={{
                  padding: '22px 16px',
                  textAlign: 'center',
                  color: 'var(--text-3, #94a3b8)',
                  fontSize: 13,
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 8,
                  border: '1px dashed var(--border, #334155)',
                  marginBottom: 16
                }}>
                  No comments from the citizen yet. Any comments posted from the mobile app will appear here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 380, overflowY: 'auto' }}>
                  {comments.map((c) => {
                    const isAdmin = c.user_role === 'admin' || c.user_name?.toLowerCase().includes('admin');
                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          background: isAdmin ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card-subtle, rgba(255,255,255,0.03))',
                          border: isAdmin ? '1px solid rgba(59, 130, 246, 0.25)' : '1px solid var(--border, rgba(255,255,255,0.08))',
                          borderLeft: isAdmin ? '4px solid #3b82f6' : '4px solid #10b981',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1, #f8fafc)' }}>
                              {c.user_name || (isAdmin ? 'City Admin' : 'Citizen')}
                            </span>
                            <span style={{
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '2px 7px',
                              borderRadius: 6,
                              background: isAdmin ? '#2563eb' : 'rgba(16, 185, 129, 0.2)',
                              color: isAdmin ? '#ffffff' : '#34d399',
                            }}>
                              {isAdmin ? '🛡️ Admin Reply' : '👤 Citizen'}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-3, #94a3b8)' }}>
                            {fmtDateShort(c.created_at)}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-2, #cbd5e1)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                          {c.comment}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Admin Reply Composer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border, rgba(255,255,255,0.08))', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2, #cbd5e1)' }}>
                  Reply to Citizen
                </div>
                <textarea
                  className={s.textarea}
                  rows={3}
                  placeholder="Write an official response or update to the citizen..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    fontSize: 13,
                    borderRadius: 8,
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={addingComment || !newComment.trim()}
                    style={{
                      background: 'var(--primary, #2563eb)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 22px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: addingComment || !newComment.trim() ? 'not-allowed' : 'pointer',
                      opacity: addingComment || !newComment.trim() ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                    }}
                  >
                    {addingComment ? 'Sending…' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Audit Trail</span>
            </div>
            <div style={{ padding: '8px 16px 16px' }}>
              {(() => {
                const visibleLogs = auditLog.filter(
                  (l) =>
                    !['auto_assigned', 'reassigned', 'auto assigned', 're-assigned'].includes(
                      l.action?.toLowerCase()
                    )
                );
                if (visibleLogs.length === 0) {
                  return (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0' }}>
                      No audit history.
                    </div>
                  );
                }
                return visibleLogs.map((log, i, arr) => (
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
                ));
              })()}
            </div>
          </div>
        </div>

        {/* ── Right: Action Hub ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status & Citizen Response Card */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Set Concern Status & Response</span>
            </div>
            <div style={{ padding: '16px' }}>



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
                  ref={noteRef}
                  className={s.textarea}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                  }}
                  placeholder="e.g. Road crew dispatched. Expected completion: Dec 15. Thank you for your report."
                  rows={5}
                  style={{
                    minHeight: 130,
                    lineHeight: 1.6,
                    resize: 'vertical',
                    width: '100%',
                    boxSizing: 'border-box',
                    overflowY: 'hidden',
                    padding: '10px 14px',
                  }}
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
                  <div
                    style={{
                      position: 'relative',
                      marginBottom: 8,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                      cursor: 'zoom-in',
                    }}
                    onClick={() => {
                      setLightboxImg(resolveImageUrl(concern.resolved_image_url));
                      setLightboxTitle('Current Proof Photo');
                    }}
                    title="Click to view full preview"
                  >
                    <img
                      src={resolveImageUrl(concern.resolved_image_url)}
                      alt="Resolution Proof"
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', maxHeight: 150, objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.65)',
                        padding: '4px 8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        style={{ fontSize: 11, color: '#fff', cursor: 'pointer' }}
                        onClick={() => {
                          setLightboxImg(resolveImageUrl(concern.resolved_image_url));
                          setLightboxTitle('Current Proof Photo');
                        }}
                      >
                        🔍 Click to preview
                      </span>
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
                  <div
                    style={{
                      position: 'relative',
                      marginBottom: 8,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid var(--primary)',
                      cursor: 'zoom-in',
                    }}
                    onClick={() => {
                      setLightboxImg(resolvedPreview);
                      setLightboxTitle('New Proof Preview');
                    }}
                    title="Click to view full preview"
                  >
                    <img
                      src={resolvedPreview}
                      alt="Resolution Proof Preview"
                      style={{ width: '100%', maxHeight: 150, objectFit: 'cover', display: 'block' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.65)',
                        padding: '4px 8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        style={{ fontSize: 11, color: '#fff', cursor: 'pointer' }}
                        onClick={() => {
                          setLightboxImg(resolvedPreview);
                          setLightboxTitle('New Proof Preview');
                        }}
                      >
                        🔍 Click to preview
                      </span>
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
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-3)', alignItems: 'center' }}>
                      <span style={{ color: getCategoryConfig(sc.category).color, fontWeight: 600 }}>
                        {getCategoryConfig(sc.category).icon} {sc.category}
                      </span>
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


        </div>
      </div>

      {/* Lightbox Modal for Attached Photos */}
      {lightboxImg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(8, 12, 24, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setLightboxImg(null)}
        >
          {/* Top Bar with Title, Open In Tab, and Close button */}
          <div
            style={{
              width: '100%',
              maxWidth: 960,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📸</span>
              <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: 15, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {lightboxTitle || 'Photo Preview'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <a
                href={lightboxImg}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#fff',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
              >
                <span>↗</span> Open Full Tab
              </a>
              <button
                type="button"
                style={{
                  background: 'rgba(255, 255, 255, 0.16)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#fff',
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onClick={() => setLightboxImg(null)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)')}
                title="Close (ESC)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Centered Image with subtle drop shadow and border */}
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '82vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImg}
              alt="Full Preview"
              style={{
                maxWidth: '92vw',
                maxHeight: '82vh',
                objectFit: 'contain',
                borderRadius: 14,
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />
          </div>

          {/* Footer hint */}
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.6)',
              display: 'flex',
              gap: 16,
            }}
          >
            <span>💡 Click outside or press <strong style={{ color: '#fff' }}>ESC</strong> to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
