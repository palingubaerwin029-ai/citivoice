import React, { useEffect, useState } from "react";
import { api, fmtDateShort } from "../services/api";
import { IoBusinessOutline, IoLocationOutline, IoPencilOutline, IoTrashOutline, IoAddOutline } from "react-icons/io5";
import styles from "../styles/Barangays.module.css";
import s from "../styles/Admin.module.css";

const EMPTY = { name: "" };

export default function Barangays() {
  const [barangays,     setBarangays]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [editItem,      setEditItem]      = useState(null);
  const [form,          setForm]          = useState(EMPTY);
  const [saving,        setSaving]        = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = () =>
    api.get("/barangays")
       .then(setBarangays)
       .catch(console.error)
       .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const saveBarangay = async () => {
    if (!form.name.trim()) { alert("Barangay name is required."); return; }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/barangays/${editItem.id}`, { name: form.name.trim() });
      } else {
        await api.post("/barangays", { name: form.name.trim() });
      }
      setShowForm(false); setEditItem(null); setForm(EMPTY);
      load();
    } catch (err) { alert(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/barangays/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const openEdit = (item) => {
    setEditItem(item); setForm({ name: item.name }); setShowForm(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}><IoBusinessOutline style={{ marginRight: 8, verticalAlign: "middle" }} /> Barangays</h1>
          <p className={styles.subtitle}>Manage registered barangays for user selection</p>
        </div>
        <button className={styles.addBtn} onClick={() => { setShowForm(true); setEditItem(null); setForm(EMPTY); }}>
          <IoAddOutline size={18} style={{ marginRight: 4, verticalAlign: "middle" }} /> Add Barangay
        </button>
      </div>

      <div className={`${styles.layout} ${showForm ? styles.hasForm : ""}`}>
        <div className={styles.listCol}>
          <div className={s.tableWrap}>
            {loading ? <div className={s.loading}>Loading barangays...</div> :
             barangays.length === 0 ? (
               <div className={s.empty}>
                 <div className={s.emptyIcon}><IoBusinessOutline /></div>
                 <p className={s.emptyTitle}>No barangays found</p>
                 <p className={s.emptyText}>Start by adding a new barangay to the system.</p>
               </div>
             ) : (
               <table className={s.table}>
                 <thead className={s.thead}>
                   <tr>
                     <th className={s.th}>Barangay Name</th>
                     <th className={s.th}>Added On</th>
                     <th className={`${s.th} ${styles.actionCol}`}>Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {barangays.map((b) => (
                     <tr key={b.id} className={s.tr}>
                       <td className={`${s.td} ${s.tdPrimary}`}>
                         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                           <div className={styles.iconBox}><IoLocationOutline size={16} color="#1A6BFF" /></div>
                           {b.name}
                         </div>
                       </td>
                       <td className={s.td}>{fmtDateShort(b.created_at)}</td>
                       <td className={`${s.td} ${styles.actionCol}`}>
                         <div className={styles.actions}>
                           <button className={styles.editBtn} onClick={() => openEdit(b)}><IoPencilOutline size={14} /></button>
                           <button className={styles.deleteBtn} onClick={() => setDeleteConfirm({ id: b.id, name: b.name })}><IoTrashOutline size={14} /></button>
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
              <h3 className={styles.formTitle}>{editItem ? "✏️ Edit" : "➕ New"} Barangay</h3>
              <button className={styles.formClose} onClick={() => { setShowForm(false); setEditItem(null); }}>✕</button>
            </div>
            <div className={styles.form}>
              <label className={styles.label}>Barangay Name *</label>
              <input className={styles.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Barangay San Isidro" autoFocus />
              <button className={styles.saveBtn} style={{ opacity: saving ? 0.6 : 1 }} onClick={saveBarangay} disabled={saving}>
                {saving ? "Saving..." : editItem ? "Update Barangay" : "Add Barangay"}
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div style={{ fontSize: 40, marginBottom: 12, color: "#FF4444" }}><IoTrashOutline /></div>
            <h3 style={{ color: "#fff", margin: "0 0 8px" }}>Delete this?</h3>
            <p style={{ color: "#8899BB", fontSize: 14, marginBottom: 24 }}>"{deleteConfirm.name}" will be permanently deleted.</p>
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
