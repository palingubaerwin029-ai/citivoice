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
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🏙️ Barangays</h1>
          <p style={S.subtitle}>
            Manage registered barangays for user selection
          </p>
        </div>
        <button
          style={S.addBtn}
          onClick={() => {
            setShowForm(true);
            setEditItem(null);
            setForm(EMPTY_BARANGAY);
          }}
        >
          + Add Category
        </button>
      </div>

      <div style={S.layout}>
        {/* ── List ── */}
        <div style={S.listCol}>
          {loading && <div style={S.loading}>Loading...</div>}

          {!loading &&
            (barangays.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 48 }}>🏙️</div>
                <p style={{ color: "#8899BB" }}>No barangays found</p>
              </div>
            ) : (
              barangays.map((b) => (
                <div key={b.id} style={S.card}>
                  <div style={S.cardTop}>
                    <span style={{ fontSize: 24 }}>📍</span>
                    <div style={{ flex: 1 }}>
                      <div style={S.cardTitle}>{b.name}</div>
                      <div style={S.cardMeta}>
                        <span style={S.metaText}>
                          Added {b.createdAt?.toDate?.()?.toLocaleDateString() || "Recently"}
                        </span>
                      </div>
                    </div>
                    <div style={S.cardActions}>
                      <button style={S.editBtn} onClick={() => openEdit(b)}>
                        ✏️ Edit
                      </button>
                      <button
                        style={S.deleteBtn}
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
          <div style={S.formPanel}>
            <div style={S.formHeader}>
              <h3 style={S.formTitle}>
                {editItem ? "✏️ Edit" : "➕ New"} Barangay
              </h3>
              <button
                style={S.formClose}
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
              >
                ✕
              </button>
            </div>

            <div style={S.form}>
              <label style={S.label}>Barangay Name *</label>
              <input
                style={S.input}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Barangay San Isidro"
              />

              <button
                style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
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
        <div style={S.dialogOverlay}>
          <div style={S.dialog}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ color: "#fff", margin: "0 0 8px" }}>Delete this?</h3>
            <p style={{ color: "#8899BB", fontSize: 14, marginBottom: 24 }}>
              "{deleteConfirm.name}" will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={S.dialogCancel}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                style={S.dialogDelete}
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

const S = {
  page: { padding: 32, maxWidth: 1000, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: { color: "#fff", fontSize: 26, fontWeight: 800, margin: 0 },
  subtitle: { color: "#8899BB", fontSize: 14, marginTop: 4 },
  addBtn: {
    backgroundColor: "#1A6BFF",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 20px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 4px 12px rgba(26,107,255,0.35)",
  },

  layout: { display: "flex", gap: 20, alignItems: "flex-start" },
  listCol: { flex: 1 },
  loading: { color: "#8899BB", padding: 40, textAlign: "center" },
  empty: {
    padding: 80,
    textAlign: "center",
    backgroundColor: "#112240",
    borderRadius: 16,
    border: "1px solid #1E3355",
  },

  card: {
    backgroundColor: "#112240",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    border: "1px solid #1E3355",
    borderLeftWidth: 4,
    borderLeftColor: "#1A6BFF",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
  },
  cardMeta: {
    marginTop: 4,
  },
  metaText: { color: "#8899BB", fontSize: 12 },
  cardActions: { display: "flex", gap: 6, flexShrink: 0 },
  editBtn: {
    backgroundColor: "#1A6BFF22",
    border: "1px solid #1A6BFF44",
    color: "#1A6BFF",
    borderRadius: 8,
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },
  deleteBtn: {
    backgroundColor: "#FF444422",
    border: "1px solid #FF444444",
    color: "#FF4444",
    borderRadius: 8,
    padding: "5px 8px",
    cursor: "pointer",
    fontSize: 14,
  },

  formPanel: {
    width: 340,
    backgroundColor: "#112240",
    borderRadius: 16,
    border: "1px solid #1E3355",
    overflow: "hidden",
    flexShrink: 0,
  },
  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #1E3355",
  },
  formTitle: { color: "#fff", fontSize: 16, fontWeight: 800, margin: 0 },
  formClose: {
    background: "none",
    border: "1px solid #1E3355",
    color: "#8899BB",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
  },
  form: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    color: "#8899BB",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#162B4D",
    border: "1px solid #1E3355",
    borderRadius: 10,
    color: "#fff",
    padding: "10px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    lineHeight: 1.5,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  saveBtn: {
    backgroundColor: "#1A6BFF",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "13px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    marginTop: 16,
    boxShadow: "0 4px 12px rgba(26,107,255,0.35)",
  },

  dialogOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  dialog: {
    backgroundColor: "#112240",
    borderRadius: 20,
    padding: 32,
    border: "1px solid #1E3355",
    textAlign: "center",
    maxWidth: 360,
  },
  dialogCancel: {
    flex: 1,
    padding: 12,
    backgroundColor: "#162B4D",
    border: "1px solid #1E3355",
    color: "#8899BB",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  dialogDelete: {
    flex: 1,
    padding: 12,
    backgroundColor: "#FF444422",
    border: "1px solid #FF4444",
    color: "#FF4444",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
  },
};
