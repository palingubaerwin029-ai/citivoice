import React, { useEffect, useState } from 'react';
import { api, fmtDate, fmtDateShort, resolveImageUrl } from '../services/api';
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
  'Water & Drainage',
  'Waste & Sanitation',
  'Public Safety',
  'Other',
];
const PRIORITIES = ['High', 'Medium', 'Low'];

const SENTIMENT_CONFIG = {
  urgent: { emoji: '🔴', label: 'Urgent', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  frustrated: { emoji: '😤', label: 'Frustrated', color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  concerned: { emoji: '😟', label: 'Concerned', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  neutral: { emoji: '😐', label: 'Neutral', color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
};

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

  // AI Features state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [similarConcerns, setSimilarConcerns] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    api
      .get(`/concerns/${id}`)
      .then((data) => {
        setConcern(data);
        setSelStatus(data.status || 'Pending');
        setSelCategory(data.category || 'Other');
        setSelPriority(data.priority || 'Medium');
        setNote(data.admin_note || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Load similar concerns
  useEffect(() => {
    if (!id) return;
    setLoadingSimilar(true);
    api
      .get(`/concerns/${id}/similar`)
      .then((data) => {
        const all = [...(data.linked || []), ...(data.computed || [])];
        setSimilarConcerns(all.slice(0, 5));
      })
      .catch(() => setSimilarConcerns([]))
      .finally(() => setLoadingSimilar(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/concerns/${id}`, {
        status: selStatus,
        category: selCategory,
        priority: selPriority,
        admin_note: note.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Refetch to sync
      const updated = await api.get(`/concerns/${id}`);
      setConcern(updated);
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  // ─── Feature 1: AI Response Generation ──────────────────────────────────
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

  if (loading) return <div className={s.loading}>Loading…</div>;
  if (!concern) return <div className={s.loading}>Concern not found.</div>;

  const hasChanges =
    selStatus !== concern.status ||
    selCategory !== concern.category ||
    selPriority !== concern.priority ||
    note !== (concern.admin_note || '');

  const sentimentCfg = SENTIMENT_CONFIG[concern.sentiment] || SENTIMENT_CONFIG.neutral;
  const urgencyScore = concern.urgency_score || 50;

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
                {/* Feature 2: Sentiment Badge */}
                <span
                  className={s.badge}
                  style={{
                    background: sentimentCfg.bg,
                    color: sentimentCfg.color,
                    fontSize: 12,
                    border: `1px solid ${sentimentCfg.color}25`,
                  }}
                >
                  {sentimentCfg.emoji} {sentimentCfg.label}
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

          {/* Feature 2: Urgency Score + Feature 4: Department Routing */}
          <div className={s.grid2}>
            <div className={s.card} style={{ padding: '12px 14px' }}>
              <div className={s.sectionLabel} style={{ marginBottom: 8 }}>
                🎯 AI Urgency Score
              </div>
              <div className={s.flexRow}>
                <div className={s.progressTrack} style={{ flex: 1 }}>
                  <div
                    className={s.progressFill}
                    style={{
                      width: `${urgencyScore}%`,
                      background:
                        urgencyScore >= 80 ? '#EF4444' : urgencyScore >= 60 ? '#F59E0B' : '#10B981',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color:
                      urgencyScore >= 80 ? '#EF4444' : urgencyScore >= 60 ? '#F59E0B' : '#10B981',
                  }}
                >
                  {urgencyScore}
                </span>
              </div>
            </div>
            {concern.department && (
              <div className={s.card} style={{ padding: '12px 14px' }}>
                <div className={s.sectionLabel} style={{ marginBottom: 8 }}>
                  🏢 Auto-Routed To
                </div>
                <div className={s.textPrimary} style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {concern.department}
                </div>
              </div>
            )}
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

          {/* Timeline */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Timeline</span>
            </div>
            <div style={{ padding: '8px 16px 16px' }}>
              {buildTimeline(concern).map((t, i, arr) => (
                <div
                  key={i}
                  className={cd.timelineItem}
                  style={{ marginBottom: i < arr.length - 1 ? 0 : 4 }}
                >
                  <div className={cd.timelineLeft}>
                    <div className={cd.timelineDot} />
                    {i < arr.length - 1 && <div className={cd.timelineLine} />}
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div className={cd.timelineEvent}>{t.event}</div>
                    <div className={cd.timelineDate}>{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Admin panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Update status */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Update Status</span>
            </div>
            <div style={{ padding: '14px 16px' }} className={cd.statusGrid}>
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

          {/* Official response */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.cardTitle}>Official Response</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Visible to citizen</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              {/* Feature 1: AI Generate Button */}
              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating}
                className={`${cd.aiDraftBtn} ${aiGenerating ? cd.aiDraftBtnGenerating : ''}`}
              >
                {aiGenerating ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                      ⚙️
                    </span>{' '}
                    Generating...
                  </>
                ) : (
                  <>✨ AI Draft Response</>
                )}
              </button>

              <textarea
                className={s.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Road crew dispatched. Expected completion: Dec 15. Thank you for your report."
                rows={5}
              />
              <div
                style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: 4 }}
              >
                {note.length} chars
              </div>
              {saved ? (
                <div className={s.successBanner}>
                  <span>✅</span> Changes saved successfully!
                </div>
              ) : (
                <button
                  className={`${s.btn} ${s.btnPrimary}`}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: 10,
                    opacity: !hasChanges || saving ? 0.5 : 1,
                  }}
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                >
                  {saving ? 'Saving…' : '💾 Save Changes'}
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

          {/* Previous note */}
          {concern.admin_note && (
            <div className={cd.prevNote}>
              <div className={cd.prevNoteHeader}>Previous Response</div>
              <div className={cd.prevNoteText}>{concern.admin_note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
