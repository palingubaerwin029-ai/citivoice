import React, { useEffect, useState } from "react";
import { api, fmtDateShort } from "../api";
import {
  IoMegaphoneOutline, IoCalendarOutline, IoAddOutline,
  IoTrashOutline, IoPencilOutline, IoCloseOutline,
} from "react-icons/io5";
import s from "../styles/Admin.module.css";

const TYPE_COLORS = { info:"#3B82F6", warning:"#F59E0B", urgent:"#EF4444", success:"#10B981" };
const CAT_COLORS  = { meeting:"#3B82F6", maintenance:"#F97316", health:"#10B981", emergency:"#EF4444", celebration:"#8B5CF6", other:"#64748B" };

const EMPTY_ANN  = { title:"", body:"", type:"info",  author:"", barangay:"All Barangays", link:"" };
const EMPTY_EVT  = { title:"", description:"", category:"other", date:"", location:"", organizer:"", link:"" };

export default function EventsAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [events,        setEvents]        = useState([]);
  const [tab,           setTab]           = useState("announcements");
  const [showForm,      setShowForm]      = useState(false);
  const [editItem,      setEditItem]      = useState(null);
  const [form,          setForm]          = useState(EMPTY_ANN);
  const [saving,        setSaving]        = useState(false);
  const [delConfirm,    setDelConfirm]    = useState(null);

  const loadAll = () => Promise.all([
    api.get("/announcements").then(setAnnouncements),
    api.get("/events").then(setEvents),
  ]).catch(console.error);

  useEffect(() => { loadAll(); }, []);

  const isAnn = tab === "announcements";

  const openNew = () => {
    setEditItem(null);
    setForm(isAnn ? EMPTY_ANN : EMPTY_EVT);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (isAnn) {
      setForm({ title:item.title||"", body:item.body||"", type:item.type||"info", author:item.author||"", barangay:item.barangay||"All Barangays", link:item.link||"" });
    } else {
      // Format date to datetime-local format
      const d = item.date ? new Date(item.date).toISOString().slice(0,16) : "";
      setForm({ title:item.title||"", description:item.description||"", category:item.category||"other", date:d, location:item.location||"", organizer:item.organizer||"", link:item.link||"" });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { alert("Title is required."); return; }
    setSaving(true);
    try {
      if (isAnn) {
        if (!form.body?.trim()) { alert("Body is required."); return; }
        editItem ? await api.put(`/announcements/${editItem.id}`, form) : await api.post("/announcements", form);
      } else {
        if (!form.date) { alert("Date is required."); return; }
        editItem ? await api.put(`/events/${editItem.id}`, form) : await api.post("/events", form);
      }
      await loadAll();
      setShowForm(false); setEditItem(null);
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!delConfirm) return;
    try {
      isAnn ? await api.delete(`/announcements/${delConfirm.id}`) : await api.delete(`/events/${delConfirm.id}`);
      await loadAll();
    } catch (err) { alert(err.message); }
    setDelConfirm(null);
  };

  const items = isAnn ? announcements : events;

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Events & Announcements</h1>
          <p className={s.pageSubtitle}>Manage city communications and scheduled events</p>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={openNew}>
          <IoAddOutline size={16} /> New {isAnn ? "Announcement" : "Event"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[
          { key:"announcements", icon:<IoMegaphoneOutline/>, label:"Announcements", count:announcements.length },
          { key:"events",        icon:<IoCalendarOutline/>,  label:"Events",         count:events.length },
        ].map((t) => (
          <button key={t.key}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:"var(--r-lg)", border:"1px solid", cursor:"pointer", fontSize:13, fontWeight:600, transition:"all var(--t)",
              background: tab===t.key ? "rgba(37,99,235,0.15)" : "transparent",
              borderColor: tab===t.key ? "var(--blue)" : "var(--border)",
              color: tab===t.key ? "var(--blue-light)" : "var(--text-2)" }}
            onClick={() => { setTab(t.key); setShowForm(false); setEditItem(null); }}>
            {t.icon} {t.label}
            <span style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, padding:"1px 7px", fontSize:11 }}>{t.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns: showForm ? "1fr 380px" : "1fr", gap:16 }}>
        {/* Items list */}
        <div className={s.tableWrap}>
          {items.length===0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}>{isAnn ? "📢" : "📅"}</div>
              <p className={s.emptyTitle}>No {tab} yet</p>
              <button className={`${s.btn} ${s.btnPrimary}`} style={{ marginTop:12 }} onClick={openNew}>Create First {isAnn?"Announcement":"Event"}</button>
            </div>
          ) : (
            <table className={s.table}>
              <thead className={s.thead}>
                <tr>
                  {isAnn
                    ? ["Title","Type","Author","Barangay","Date","Actions"].map((h)=><th key={h} className={s.th}>{h}</th>)
                    : ["Title","Category","Date","Location","Organizer","Actions"].map((h)=><th key={h} className={s.th}>{h}</th>)
                  }
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const color = isAnn ? TYPE_COLORS[item.type] : CAT_COLORS[item.category];
                  return (
                    <tr key={item.id} className={s.tr}>
                      <td className={s.td}>
                        <div style={{ fontWeight:600, color:"var(--text-1)", fontSize:13 }}>{item.title}</div>
                        {isAnn && <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{item.body?.slice(0,60)}…</div>}
                      </td>
                      {isAnn ? <>
                        <td className={s.td}><span className={s.badge} style={{ background:(color||"#475569")+"18", color:color||"#94A3B8", border:`1px solid ${color||"#475569"}30` }}>{item.type}</span></td>
                        <td className={s.td} style={{ fontSize:12 }}>{item.author||"—"}</td>
                        <td className={s.td}><span className={s.badge} style={{ background:"rgba(59,130,246,0.1)", color:"var(--blue-light)" }}>{item.barangay||"All"}</span></td>
                      </> : <>
                        <td className={s.td}><span className={s.badge} style={{ background:(color||"#475569")+"18", color:color||"#94A3B8" }}>{item.category}</span></td>
                        <td className={s.td} style={{ fontSize:12, whiteSpace:"nowrap" }}>{item.date ? new Date(item.date).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}</td>
                        <td className={s.td} style={{ fontSize:12 }}>{item.location||"—"}</td>
                        <td className={s.td} style={{ fontSize:12 }}>{item.organizer||"—"}</td>
                      </>}
                      <td className={s.td} style={{ fontSize:11, color:"var(--text-3)", whiteSpace:"nowrap" }}>{isAnn && fmtDateShort(item.created_at)}</td>
                      <td className={s.td}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={()=>openEdit(item)}><IoPencilOutline size={13}/></button>
                          <button style={{ padding:"5px 7px", borderRadius:"var(--r-sm)", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#EF4444", cursor:"pointer" }} onClick={()=>setDelConfirm(item)}><IoTrashOutline size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Form panel */}
        {showForm && (
          <div className={s.card} style={{ alignSelf:"start", padding:0, overflow:"hidden" }}>
            <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontWeight:700, color:"var(--text-1)", fontSize:14 }}>
                {editItem ? "✏️ Edit" : "➕ New"} {isAnn ? "Announcement" : "Event"}
              </span>
              <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`} onClick={()=>{ setShowForm(false); setEditItem(null); }}><IoCloseOutline/></button>
            </div>
            <div style={{ padding:16, display:"flex", flexDirection:"column", gap:14 }}>
              {/* Shared: title */}
              <div>
                <label className={s.formLabel}>Title *</label>
                <input className={s.input} value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))} placeholder={isAnn?"Announcement title…":"Event title…"} />
              </div>

              {isAnn ? <>
                <div>
                  <label className={s.formLabel}>Body *</label>
                  <textarea className={s.textarea} rows={4} value={form.body} onChange={(e)=>setForm(f=>({...f,body:e.target.value}))} placeholder="Announcement details…" />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label className={s.formLabel}>Type</label>
                    <select className={s.formSelect} value={form.type} onChange={(e)=>setForm(f=>({...f,type:e.target.value}))}>
                      {["info","warning","urgent","success"].map((t)=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={s.formLabel}>Author</label>
                    <input className={s.input} value={form.author} onChange={(e)=>setForm(f=>({...f,author:e.target.value}))} placeholder="Admin" />
                  </div>
                </div>
                <div>
                  <label className={s.formLabel}>Barangay</label>
                  <input className={s.input} value={form.barangay} onChange={(e)=>setForm(f=>({...f,barangay:e.target.value}))} placeholder="All Barangays" />
                </div>
              </> : <>
                <div>
                  <label className={s.formLabel}>Description</label>
                  <textarea className={s.textarea} rows={3} value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))} placeholder="Event details…" />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label className={s.formLabel}>Category</label>
                    <select className={s.formSelect} value={form.category} onChange={(e)=>setForm(f=>({...f,category:e.target.value}))}>
                      {["meeting","maintenance","health","emergency","celebration","other"].map((c)=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={s.formLabel}>Date & Time *</label>
                    <input type="datetime-local" className={s.input} value={form.date} onChange={(e)=>setForm(f=>({...f,date:e.target.value}))} />
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label className={s.formLabel}>Location</label>
                    <input className={s.input} value={form.location} onChange={(e)=>setForm(f=>({...f,location:e.target.value}))} placeholder="Venue or address" />
                  </div>
                  <div>
                    <label className={s.formLabel}>Organizer</label>
                    <input className={s.input} value={form.organizer} onChange={(e)=>setForm(f=>({...f,organizer:e.target.value}))} placeholder="Department or office" />
                  </div>
                </div>
              </>}

              <div>
                <label className={s.formLabel}>Link (optional)</label>
                <input className={s.input} value={form.link} onChange={(e)=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://…" />
              </div>

              <button className={`${s.btn} ${s.btnPrimary}`} style={{ justifyContent:"center", opacity:saving?0.5:1 }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {delConfirm && (
        <div className={s.overlay}>
          <div className={s.dialog}>
            <div style={{ fontSize:36, marginBottom:12 }}>🗑️</div>
            <h3 style={{ color:"var(--text-1)", margin:"0 0 8px", fontSize:16 }}>Delete {isAnn?"Announcement":"Event"}?</h3>
            <p style={{ color:"var(--text-3)", fontSize:13, margin:"0 0 22px" }}>"{delConfirm.title}" will be permanently removed.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button className={`${s.btn} ${s.btnGhost}`} style={{ flex:1, justifyContent:"center" }} onClick={()=>setDelConfirm(null)}>Cancel</button>
              <button className={`${s.btn}`} style={{ flex:1, justifyContent:"center", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.25)", color:"#EF4444" }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
