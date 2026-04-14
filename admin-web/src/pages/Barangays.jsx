import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import styles from "../styles/Barangays.module.css";

const EMPTY_BARANGAY = { name: "" };

export default function Barangays() {
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_BARANGAY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "barangays"), orderBy("name", "asc")),
      (snap) => {
        setBarangays(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const saveBarangay = async () => {
    if (!form.name.trim()) {
      alert("Barangay name is required.");
      return;
    }
    
    // Check if it already exists
    if (barangays.some((b) => b.name.toLowerCase() === form.name.trim().toLowerCase() && b.id !== editItem?.id)) {
      alert("This barangay already exists!");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
      };
      
      if (editItem) {
        await updateDoc(doc(db, "barangays", editItem.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "barangays"), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setShowForm(false);
      setEditItem(null);
      setForm(EMPTY_BARANGAY);
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "barangays", id));
    setDeleteConfirm(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name,
    });
    setShowForm(true);
  };

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🏙️ Barangays</h1>
          <p className={styles.subtitle}>
            Manage registered barangays for user selection
          </p>
        </div>
        <button
          className={styles.addBtn}
          onClick={() => {
            setShowForm(true);
            setEditItem(null);
            setForm(EMPTY_BARANGAY);
          }}
        >
          + Add Category
        </button>
      </div>

      <div className={styles.layout}>
        {/* ── List ── */}
        <div className={styles.listCol}>
          {loading && <div className={styles.loading}>Loading...</div>}

          {!loading &&
            (barangays.length === 0 ? (
              <div className={styles.empty}>
                <div style={{ fontSize: 48 }}>🏙️</div>
                <p style={{ color: "#8899BB" }}>No barangays found</p>
              </div>
            ) : (
              barangays.map((b) => (
                <div key={b.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span style={{ fontSize: 24 }}>📍</span>
                    <div style={{ flex: 1 }}>
                      <div className={styles.cardTitle}>{b.name}</div>
                      <div className={styles.cardMeta}>
                        <span className={styles.metaText}>
                          Added {b.createdAt?.toDate?.()?.toLocaleDateString() || "Recently"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.editBtn} onClick={() => openEdit(b)}>
                        ✏️ Edit
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() =>
                          setDeleteConfirm({
                            id: b.id,
                            name: b.name,
                          })
                        }
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ))}
        </div>

        {/* ── Form Panel ── */}
        {showForm && (
          <div className={styles.formPanel}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>
                {editItem ? "✏️ Edit" : "➕ New"} Barangay
              </h3>
              <button
                className={styles.formClose}
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
              >
                ✕
              </button>
            </div>

            <div className={styles.form}>
              <label className={styles.label}>Barangay Name *</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Barangay San Isidro"
              />

              <button
                className={styles.saveBtn} style={{ opacity: saving ? 0.6 : 1 }}
                onClick={saveBarangay}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editItem
                    ? "💾 Update Barangay"
                    : "🏙️ Add Barangay"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Dialog ── */}
      {deleteConfirm && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: "#fff", margin: "0 0 8px" }}>Delete this?</h3>
            <p style={{ color: "#8899BB", fontSize: 14, marginBottom: 24 }}>
              "{deleteConfirm.name}" will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className={styles.dialogCancel}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className={styles.dialogDelete}
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

