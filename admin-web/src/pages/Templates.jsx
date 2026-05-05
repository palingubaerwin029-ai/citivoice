import React, { useEffect, useState } from "react";
import { api, fmtDateShort } from "../services/api";
import { IoDocumentTextOutline, IoPencilOutline, IoTrashOutline, IoAddOutline, IoCheckmarkCircleOutline } from "react-icons/io5";
import styles from "../styles/Templates.module.css";
import s from "../styles/Admin.module.css";

const EMPTY = { category: "", priority: "Medium", quick_title: "", template_body: "" };
const CATEGORIES = ["Waste Management", "Infrastructure", "Security", "Health", "Traffic", "Environment", "Others"];

export default function Templates() {
  const [templates,     setTemplates]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [editItem,      setEditItem]      = useState(null);
  const [form,          setForm]          = useState(EMPTY);
  const [saving,        setSaving]        = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = () =>
    api.get("/templates")
       .then(setTemplates)
       .catch(console.error)
       .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const saveTemplate = async () => {
    if (!form.category || !form.quick_title.trim() || !form.template_body.trim()) {
      alert("Category, Title, and Body are required.");
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/templates/${editItem.id}`, form);
      } else {
        await api.post("/templates", form);
      }
      setShowForm(false); setEditItem(null); setForm(EMPTY);
      load();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/templates/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      category: item.category,
      priority: item.priority,
      quick_title: item.quick_title,
      template_body: item.template_body,
    });
    setShowForm(true);
  };

  return (
    <div className={styles.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}><IoDocumentTextOutline style={{ marginRight: 8, verticalAlign: "middle" }} /> Concern Templates</h1>
          <p className={s.pageSubtitle}>Manage quick-selection templates for the mobile app</p>
        </div>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => { setShowForm(true); setEditItem(null); setForm(EMPTY); }}>
          <IoAddOutline size={18} style={{ marginRight: 4, verticalAlign: "middle" }} /> Add Template
        </button>
      </div>

      <div className={`${styles.layout} ${showForm ? styles.hasForm : ""}`}>
        <div className={styles.listCol}>
          <div className={s.tableWrap}>
            {loading ? <div className={s.loading}>Loading templates...</div> :
             templates.length === 0 ? (
               <div className={s.empty}>
                 <div className={s.emptyIcon}><IoDocumentTextOutline /></div>
                 <p className={s.emptyTitle}>No templates found</p>
                 <p className={s.emptyText}>Templates help citizens file reports faster on the mobile app.</p>
               </div>
             ) : (
               <table className={s.table}>
                 <thead className={s.thead}>
                   <tr>
                     <th className={s.th}>Category & Title</th>
                     <th className={s.th}>Priority</th>
                     <th className={s.th}>Preview</th>
                     <th className={`${s.th} ${styles.actionCol}`}>Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {templates.map((t) => (
                     <tr key={t.id} className={s.tr}>
                       <td className={`${s.td} ${s.tdPrimary}`}>
                         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                           <div className={styles.iconBox}><IoCheckmarkCircleOutline size={16} color="#1A6BFF" /></div>
                           <div>
                             <div style={{ fontSize: 11, color: "var(--blue-light)", fontWeight: 700, textTransform: "uppercase" }}>{t.category}</div>
                           <div style={{ color: "var(--text-1)", fontWeight: 600 }}>{t.quick_title}</div>
                           </div>
                         </div>
                       </td>
                       <td className={s.td}>
                         <span className={s.badge} style={{ 
                            background: t.priority === 'High' ? 'rgba(239,68,68,0.1)' : t.priority === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                            color: t.priority === 'High' ? '#EF4444' : t.priority === 'Medium' ? '#F59E0B' : '#10B981'
                         }}>
                           {t.priority}
                         </span>
                       </td>
                       <td className={s.td} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                         {t.template_body}
                       </td>
                       <td className={`${s.td} ${styles.actionCol}`}>
                         <div className={styles.actions}>
                           <button className={styles.editBtn} onClick={() => openEdit(t)}><IoPencilOutline size={14} /></button>
                           <button className={styles.deleteBtn} onClick={() => setDeleteConfirm({ id: t.id, name: t.quick_title })}><IoTrashOutline size={14} /></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
          </div>
        </div>

        {showForm && (
          <div className={styles.formPanel}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>{editItem ? "✏️ Edit" : "➕ New"} Template</h3>
              <button className={styles.formClose} onClick={() => { setShowForm(false); setEditItem(null); }}>✕</button>
            </div>
            <div className={styles.form}>
              <label className={styles.label}>Category *</label>
              <select className={styles.select} value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <label className={styles.label}>Priority *</label>
              <select className={styles.select} value={form.priority} onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>

              <label className={styles.label}>Quick Title *</label>
              <input className={styles.input} value={form.quick_title} onChange={(e) => setForm(f => ({ ...f, quick_title: e.target.value }))} placeholder="e.g. Uncollected Garbage" />

              <label className={styles.label}>Template Body (Standard Description) *</label>
              <textarea className={styles.textarea} value={form.template_body} onChange={(e) => setForm(f => ({ ...f, template_body: e.target.value }))} placeholder="Describe the issue clearly..." />

              <button className={styles.saveBtn} style={{ opacity: saving ? 0.6 : 1 }} onClick={saveTemplate} disabled={saving}>
                {saving ? "Saving..." : editItem ? "Update Template" : "Add Template"}
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div style={{ fontSize: 40, marginBottom: 12, color: "#FF4444" }}><IoTrashOutline /></div>
            <h3 style={{ color: "var(--text-1)", margin: "0 0 8px" }}>Delete Template?</h3>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 24 }}>"{deleteConfirm.name}" will be removed from the mobile app options.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className={styles.dialogCancel} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className={styles.dialogDelete} onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
