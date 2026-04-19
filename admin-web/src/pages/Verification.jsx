import React, { useEffect, useState } from "react";
import { api, fmtDateShort, maskEmail } from "../api";
import s from "../styles/Admin.module.css";

const STATUS = {
  unverified: { label:"Unverified", color:"#64748B", bg:"rgba(100,116,139,0.12)", icon:"—",  border:"rgba(100,116,139,0.2)" },
  pending:    { label:"Pending",    color:"#F59E0B", bg:"rgba(245,158,11,0.12)",  icon:"⏳", border:"rgba(245,158,11,0.25)" },
  verified:   { label:"Verified",   color:"#10B981", bg:"rgba(16,185,129,0.12)",  icon:"✓",  border:"rgba(16,185,129,0.25)" },
  rejected:   { label:"Rejected",   color:"#EF4444", bg:"rgba(239,68,68,0.12)",   icon:"✕",  border:"rgba(239,68,68,0.25)" },
};
const TABS = [
  { key:"pending",    label:"Pending Review", urgent:true  },
  { key:"verified",   label:"Verified",       urgent:false },
  { key:"rejected",   label:"Rejected",       urgent:false },
  { key:"unverified", label:"Unverified",     urgent:false },
  { key:"all",        label:"All",            urgent:false },
];
const AVATARS = ["#3B82F6","#10B981","#F97316","#F59E0B","#EF4444","#8B5CF6"];
const avatarColor = (id) => AVATARS[(id || 0) % AVATARS.length];
const initials    = (n)  => n?.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0,2) || "?";

export default function Verification() {
  const [users,    setUsers]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState("pending");
  const [reason,   setReason]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [search,   setSearch]   = useState("");

  const load = () => api.get("/users").then(setUsers).catch(console.error);
  useEffect(() => { load(); }, []);

  const counts = {
    all:        users.length,
    pending:    users.filter((u) => u.verification_status === "pending").length,
    verified:   users.filter((u) => u.verification_status === "verified").length,
    rejected:   users.filter((u) => u.verification_status === "rejected").length,
    unverified: users.filter((u) => !u.verification_status || u.verification_status === "unverified").length,
  };

  const filtered = users
    .filter((u) => {
      const matchTab    = filter === "all" || (u.verification_status || "unverified") === filter;
      const q           = search.toLowerCase();
      const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
      return matchTab && matchSearch;
    })
    .sort((a, b) => {
      const order = { pending:0, unverified:1, rejected:2, verified:3 };
      return (order[a.verification_status] ?? 9) - (order[b.verification_status] ?? 9);
    });

  const act = async (fn) => { setSaving(true); try { await fn(); await load(); } catch(e){ alert(e.message); } setSaving(false); };

  const handleApprove = () => act(async () => {
    await api.patch(`/users/${selected.id}/verify`);
    setFeedback("approved");
    setTimeout(() => { setFeedback(null); setSelected(null); setReason(""); }, 2500);
  });

  const handleReject = () => {
    if (!reason.trim()) { alert("Please enter a rejection reason."); return; }
    act(async () => {
      await api.patch(`/users/${selected.id}/reject`, { reason: reason.trim() });
      setFeedback("rejected");
      setTimeout(() => { setFeedback(null); setSelected(null); setReason(""); }, 2500);
    });
  };

  const handleRevoke = () => {
    if (!window.confirm(`Revoke verification for ${selected.name}?`)) return;
    act(async () => { await api.patch(`/users/${selected.id}/revoke`); setSelected(null); });
  };

  const quickApprove = (u) => act(async () => { await api.patch(`/users/${u.id}/verify`); });

  const currentStatus = selected?.verification_status || "unverified";
  const cfg           = STATUS[currentStatus] || STATUS.unverified;

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Identity Verification</h1>
          <p className={s.pageSubtitle}>Review and approve citizen identity submissions</p>
        </div>
        {counts.pending > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, backgroundColor:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)", borderRadius:12, padding:"10px 16px" }}>
            <span style={{ fontSize:18 }}>⚠️</span>
            <div>
              <div style={{ color:"#F59E0B", fontWeight:800, fontSize:15 }}>{counts.pending} Pending</div>
              <div style={{ color:"var(--text-3)", fontSize:12 }}>Awaiting your review</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={s.statsRow} style={{ "--cols": "repeat(4,1fr)" }}>
        {[
          { label:"Pending Review", value:counts.pending,    color:"#F59E0B" },
          { label:"Verified",       value:counts.verified,   color:"#10B981" },
          { label:"Rejected",       value:counts.rejected,   color:"#EF4444" },
          { label:"Unverified",     value:counts.unverified, color:"#64748B" },
        ].map((x,i) => (
          <div key={i} className={s.statCard} style={{ "--accent-color": x.color }}>
            <div className={s.statValue}>{x.value}</div>
            <div className={s.statLabel}>{x.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {TABS.map((tab) => {
            const active = filter === tab.key;
            const sc = STATUS[tab.key];
            return (
              <button key={tab.key}
                style={{ padding:"7px 14px", borderRadius:99, fontSize:12, fontWeight:active?700:500, cursor:"pointer",
                  backgroundColor: active ? (sc?.color||"var(--blue)")+"20" : "transparent",
                  border: `1px solid ${active ? sc?.color||"var(--blue)" : "var(--border)"}`,
                  color: active ? sc?.color||"var(--blue-light)" : "var(--text-2)",
                  display:"flex", alignItems:"center", gap:6 }}
                onClick={() => { setFilter(tab.key); setSelected(null); }}>
                {tab.urgent && counts.pending > 0 && tab.key === "pending" && <span style={{ width:6, height:6, borderRadius:3, background:"#F59E0B", display:"inline-block" }} />}
                {tab.label}
                <span style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, padding:"1px 7px", fontSize:11 }}>{counts[tab.key]}</span>
              </button>
            );
          })}
        </div>
        <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:8, background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:10, padding:"8px 12px" }}>
          <span style={{ color:"var(--text-3)" }}>🔍</span>
          <input style={{ flex:1, background:"none", border:"none", outline:"none", color:"var(--text-1)", fontSize:13 }} placeholder="Search citizens…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 380px" : "1fr", gap:16 }}>
        {/* Table */}
        <div className={s.tableWrap}>
          {filtered.length === 0 ? (
            <div className={s.empty}><div className={s.emptyIcon}>✅</div><p className={s.emptyTitle}>No {filter === "all" ? "" : filter} submissions</p></div>
          ) : (
            <table className={s.table}>
              <thead className={s.thead}>
                <tr>{["Citizen","Contact","Barangay","ID Type","Status","Submitted","Actions"].map((h) => <th key={h} className={s.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const st = STATUS[u.verification_status || "unverified"];
                  const isSel = selected?.id === u.id;
                  return (
                    <tr key={u.id} className={`${s.tr} ${s.trClickable} ${isSel ? s.trSelected : ""}`}
                      onClick={() => { setSelected(isSel ? null : u); setReason(""); setFeedback(null); }}>
                      <td className={s.td}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:10, backgroundColor:avatarColor(u.id), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:12, flexShrink:0 }}>{initials(u.name)}</div>
                          <div>
                            <div style={{ fontWeight:600, color:"var(--text-1)", fontSize:13 }}>{u.name}</div>
                            <div style={{ fontSize:11, color:"var(--text-3)", marginTop:1 }}>{maskEmail(u.email)}</div>
                          </div>
                        </div>
                      </td>
                      <td className={s.td} style={{ fontSize:12 }}>{u.phone || "—"}</td>
                      <td className={s.td}><span className={s.badge} style={{ background:"rgba(59,130,246,0.1)", color:"var(--blue-light)" }}>{u.barangay || "—"}</span></td>
                      <td className={s.td} style={{ fontSize:12, color: u.id_type ? "var(--text-1)" : "var(--text-3)" }}>{u.id_type || <em>Not submitted</em>}</td>
                      <td className={s.td}><span className={s.badge} style={{ backgroundColor:st.bg, color:st.color, border:`1px solid ${st.border}` }}>{st.icon} {st.label}</span></td>
                      <td className={s.td} style={{ fontSize:11, color:"var(--text-3)", whiteSpace:"nowrap" }}>{fmtDateShort(u.submitted_at)}</td>
                      <td className={s.td}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => { setSelected(isSel ? null : u); setReason(""); setFeedback(null); }}>{isSel ? "Close" : "Review"}</button>
                          {(u.verification_status === "pending" || u.verification_status === "unverified") && !isSel && (
                            <button style={{ padding:"5px 8px", borderRadius:"var(--r-sm)", background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.25)", color:"#10B981", cursor:"pointer", fontSize:13 }}
                              title="Quick approve" onClick={(e) => { e.stopPropagation(); quickApprove(u); }}>✓</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className={s.card} style={{ alignSelf:"start", padding:0, overflow:"hidden" }}>
            <div style={{ padding:"16px 18px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text-1)", marginBottom:6 }}>Review Submission</div>
                <span className={s.badge} style={{ backgroundColor:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, fontSize:11 }}>{cfg.icon} {cfg.label}</span>
              </div>
              <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Citizen info */}
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ width:52, height:52, borderRadius:16, backgroundColor:avatarColor(selected.id), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:900, fontSize:20, flexShrink:0 }}>{initials(selected.name)}</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:"var(--text-1)" }}>{selected.name}</div>
                  <div style={{ fontSize:12, color:"var(--text-3)", marginTop:2 }}>{maskEmail(selected.email)}</div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:0, background:"var(--surface-2)", borderRadius:"var(--r-lg)", border:"1px solid var(--border)", overflow:"hidden" }}>
                {[
                  { label:"Phone",      value: selected.phone || "—" },
                  { label:"Barangay",   value: selected.barangay || "—" },
                  { label:"ID Type",    value: selected.id_type || "Not submitted" },
                  { label:"ID No.",     value: selected.id_number || "—" },
                  { label:"Submitted",  value: fmtDateShort(selected.submitted_at) },
                  { label:"Registered", value: fmtDateShort(selected.created_at) },
                ].map((x,i,arr) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 14px", borderBottom: i < arr.length-1 ? "1px solid var(--border)" : "none", fontSize:13 }}>
                    <span style={{ color:"var(--text-3)" }}>{x.label}</span>
                    <span style={{ color:"var(--text-1)", fontWeight:500 }}>{x.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ID Photo */}
            <div style={{ padding:"14px 18px", borderBottom:"1px solid var(--border)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Submitted ID Photo</span>
                {selected.id_image_url && <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={() => window.open(selected.id_image_url, "_blank")}>View Full ↗</button>}
              </div>
              {selected.id_image_url ? (
                <div style={{ position:"relative", borderRadius:"var(--r-md)", overflow:"hidden", cursor:"pointer" }} onClick={() => window.open(selected.id_image_url, "_blank")}>
                  <img src={selected.id_image_url} alt="ID" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }} />
                </div>
              ) : (
                <div style={{ padding:24, textAlign:"center", background:"var(--surface-2)", borderRadius:"var(--r-md)", border:"1px dashed var(--border)" }}>
                  <div style={{ fontSize:32, marginBottom:8, opacity:0.4 }}>📂</div>
                  <p style={{ color:"var(--text-3)", fontSize:13, margin:0 }}>{selected.verification_status === "unverified" ? "Citizen has not submitted an ID yet" : "No ID photo available"}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ padding:"16px 18px" }}>
              {feedback === "approved" && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:"var(--r-md)", marginBottom:14 }}><span style={{ fontSize:20 }}>✅</span><div><div style={{ color:"#10B981", fontWeight:700 }}>Verification Approved</div><div style={{ color:"var(--text-3)", fontSize:12 }}>Citizen has been verified</div></div></div>}
              {feedback === "rejected" && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"var(--r-md)", marginBottom:14 }}><span style={{ fontSize:20 }}>❌</span><div><div style={{ color:"#EF4444", fontWeight:700 }}>Verification Rejected</div><div style={{ color:"var(--text-3)", fontSize:12 }}>Citizen has been notified</div></div></div>}

              {!feedback && currentStatus !== "verified" && (
                <>
                  <label style={{ fontSize:11, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:8 }}>Rejection Reason (required to reject)</label>
                  <textarea className={s.textarea} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. ID photo is blurry or does not match" rows={3} style={{ marginBottom:12 }} />
                  <div style={{ display:"flex", gap:8 }}>
                    <button className={`${s.btn} ${s.btnPrimary}`} style={{ flex:1, justifyContent:"center", opacity:saving?0.5:1 }} onClick={handleApprove} disabled={saving}>✓ Approve</button>
                    <button className={`${s.btn}`} style={{ flex:1, justifyContent:"center", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", color:"#EF4444", opacity:saving?0.5:1 }} onClick={handleReject} disabled={saving}>✕ Reject</button>
                  </div>
                </>
              )}
              {!feedback && currentStatus === "verified" && (
                <button className={`${s.btn}`} style={{ width:"100%", justifyContent:"center", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", color:"#EF4444" }} onClick={handleRevoke} disabled={saving}>Revoke Verification</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
