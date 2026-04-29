import React, { useEffect, useState } from "react";
import { api, fmtDate, fmtDateShort, resolveImageUrl } from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import s from "../styles/Admin.module.css";

const SC = { Pending: "#F59E0B", "In Progress": "#3B82F6", Resolved: "#10B981", Rejected: "#EF4444" };
const PC = { High: "#EF4444", Medium: "#F59E0B", Low: "#10B981" };
const STATUSES = [
  { key: "Pending",     icon: "⏳", label: "Pending" },
  { key: "In Progress", icon: "🔄", label: "In Progress" },
  { key: "Resolved",    icon: "✅", label: "Resolved" },
  { key: "Rejected",    icon: "❌", label: "Rejected" },
];

export default function ConcernDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [concern,   setConcern]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [selStatus, setSelStatus] = useState("");
  const [note,      setNote]      = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    api.get(`/concerns/${id}`)
      .then((data) => {
        setConcern(data);
        setSelStatus(data.status || "Pending");
        setNote(data.admin_note || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/concerns/${id}`, {
        status:     selStatus,
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

  if (loading)  return <div className={s.loading}>Loading…</div>;
  if (!concern) return <div className={s.loading}>Concern not found.</div>;

  const hasChanges = selStatus !== concern.status || note !== (concern.admin_note || "");

  const buildTimeline = (c) => {
    const steps = [{ event: "Concern submitted", date: fmtDateShort(c.created_at) }];
    if (["In Progress","Resolved","Rejected"].includes(c.status))
      steps.push({ event: "Assigned to team",  date: fmtDateShort(c.updated_at) });
    if (c.status === "Resolved") {
      steps.push({ event: "Work started",       date: fmtDateShort(c.updated_at) });
      steps.push({ event: "Marked as resolved", date: fmtDateShort(c.updated_at) });
    }
    if (c.status === "Rejected")
      steps.push({ event: "Concern rejected",   date: fmtDateShort(c.updated_at) });
    return steps;
  };

  return (
    <div className={s.page}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => navigate("/concerns")}>← Concerns</button>
        <span style={{ color: "var(--text-3)", fontSize: 13 }}>/</span>
        <span style={{ color: "var(--text-2)", fontSize: 13 }}>{concern.title?.slice(0, 40)}…</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontSize: 12, background: "rgba(16,185,129,0.1)", padding: "4px 10px", borderRadius: 99, border: "1px solid rgba(16,185,129,0.2)" }}>
          🛡 Admin Review
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* ── Left ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Title card */}
          <div className={s.card}>
            <div className={s.cardBody}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <span className={s.badge} style={{ background: (SC[concern.status] || "#475569") + "18", color: SC[concern.status] || "#94A3B8", fontSize: 12 }}>{concern.status}</span>
                <span className={s.badge} style={{ background: (PC[concern.priority] || "#475569") + "18", color: PC[concern.priority] || "#94A3B8", fontSize: 12 }}>{concern.priority} Priority</span>
                <span className={s.badge} style={{ background: "rgba(59,130,246,0.1)", color: "var(--blue-light)", fontSize: 12 }}>{concern.category}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.3px", lineHeight: 1.4 }}>{concern.title}</h2>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: "👤", label: "Submitted by",    value: concern.user_name },
              { icon: "📍", label: "Barangay",         value: concern.user_barangay },
              { icon: "📅", label: "Date Filed",       value: fmtDate(concern.created_at) },
              { icon: "👍", label: "Community Votes",  value: `${concern.upvotes || 0} upvotes` },
            ].map((m, i) => (
              <div key={i} className={s.card} style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{m.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className={s.card}>
            <div className={s.cardHeader}><span className={s.cardTitle}>Description</span></div>
            <div className={s.cardBody}><p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{concern.description}</p></div>
          </div>

          {/* Image */}
          {concern.image_url && (
            <div className={s.card}>
              <div className={s.cardHeader}><span className={s.cardTitle}>Attached Photo</span></div>
              <img src={resolveImageUrl(concern.image_url)} alt="Concern" style={{ width: "100%", maxHeight: 280, objectFit: "cover" }} />
            </div>
          )}

          {/* Location */}
          {concern.location_address && (
            <div className={s.card}>
              <div className={s.cardHeader}><span className={s.cardTitle}>Location</span></div>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>📌</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{concern.location_address}</div>
                  {concern.location_lat && (
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>
                      {parseFloat(concern.location_lat).toFixed(5)}, {parseFloat(concern.location_lng).toFixed(5)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className={s.card}>
            <div className={s.cardHeader}><span className={s.cardTitle}>Timeline</span></div>
            <div style={{ padding: "8px 16px 16px" }}>
              {buildTimeline(concern).map((t, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--blue)", flexShrink: 0, marginTop: 3 }} />
                    {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--border)", margin: "4px 0" }} />}
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{t.event}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Admin panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Update status */}
          <div className={s.card}>
            <div className={s.cardHeader}><span className={s.cardTitle}>Update Status</span></div>
            <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {STATUSES.map((st) => {
                const active = selStatus === st.key;
                const c = SC[st.key];
                return (
                  <button key={st.key}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: "var(--r-md)", background: active ? c + "18" : "var(--surface-3)", border: `1px solid ${active ? c : "var(--border)"}`, color: active ? c : "var(--text-2)", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all var(--t)" }}
                    onClick={() => setSelStatus(st.key)}>
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
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>Visible to citizen</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <textarea className={s.textarea} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Road crew dispatched. Expected completion: Dec 15. Thank you for your report." rows={5} />
              <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "right", marginTop: 4 }}>{note.length} chars</div>
              {saved ? (
                <div className={s.successBanner}><span>✅</span> Changes saved successfully!</div>
              ) : (
                <button className={`${s.btn} ${s.btnPrimary}`}
                  style={{ width: "100%", justifyContent: "center", marginTop: 10, opacity: !hasChanges || saving ? 0.5 : 1 }}
                  onClick={handleSave} disabled={!hasChanges || saving}>
                  {saving ? "Saving…" : "💾 Save Changes"}
                </button>
              )}
            </div>
          </div>

          {/* Previous note */}
          {concern.admin_note && (
            <div className={s.card} style={{ borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.04)" }}>
              <div className={s.cardHeader}><span className={s.cardTitle} style={{ color: "var(--green)" }}>Previous Response</span></div>
              <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{concern.admin_note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
