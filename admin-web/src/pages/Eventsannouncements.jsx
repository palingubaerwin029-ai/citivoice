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
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const EVENT_CATEGORIES = [
  "meeting",
  "maintenance",
  "health",
  "emergency",
  "celebration",
  "other",
];
const ANNOUNCEMENT_TYPES = ["info", "warning", "urgent", "success"];
const BARANGAYS = [
  "All Barangays",
  "Barangay San Isidro",
  "Barangay Poblacion",
  "Barangay Molo",
  "Barangay Jaro",
  "Barangay La Paz",
  "Other",
];

const CAT_COLORS = {
  meeting: "#1A6BFF",
  maintenance: "#FFB800",
  health: "#00D4AA",
  emergency: "#FF4444",
  celebration: "#FF6B35",
  other: "#8899BB",
};
const TYPE_COLORS = {
  info: "#1A6BFF",
  warning: "#FFB800",
  urgent: "#FF4444",
  success: "#00D4AA",
};
const CAT_ICONS = {
  meeting: "👥",
  maintenance: "🔧",
  health: "🏥",
  emergency: "⚠️",
  celebration: "🎉",
  other: "📅",
};
const TYPE_ICONS = { info: "ℹ️", warning: "⚠️", urgent: "📢", success: "✅" };

const EMPTY_EVENT = {
  title: "",
  description: "",
  category: "meeting",
  date: "",
  time: "",
  location: "",
  organizer: "",
  link: "",
};
const EMPTY_ANNOUNCEMENT = {
  title: "",
  body: "",
  type: "info",
  author: "",
  barangay: "All Barangays",
  link: "",
};

export default function EventsAnnouncements() {
  const [activeTab, setActiveTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState(EMPTY_ANNOUNCEMENT);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const unsubA = onSnapshot(
      query(collection(db, "announcements"), orderBy("createdAt", "desc")),
      (snap) => {
        setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );
    const unsubE = onSnapshot(
      query(collection(db, "events"), orderBy("date", "desc")),
      (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
    return () => {
      unsubA();
      unsubE();
    };
  }, []);

  // ── Save Announcement ──────────────────────────────────────────────────────
  const saveAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
      alert("Title and body are required.");
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await updateDoc(doc(db, "announcements", editItem.id), {
          ...announcementForm,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "announcements"), {
          ...announcementForm,
          createdAt: serverTimestamp(),
        });
      }
      setShowForm(false);
      setEditItem(null);
      setAnnouncementForm(EMPTY_ANNOUNCEMENT);
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  // ── Save Event ─────────────────────────────────────────────────────────────
  const saveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) {
      alert("Title and date are required.");
      return;
    }
    setSaving(true);
    try {
      const dateTime = new Date(
        `${eventForm.date}T${eventForm.time || "00:00"}`,
      );
      const data = {
        title: eventForm.title,
        description: eventForm.description,
        category: eventForm.category,
        date: Timestamp.fromDate(dateTime),
        location: eventForm.location,
        organizer: eventForm.organizer,
        link: eventForm.link,
      };
      if (editItem) {
        await updateDoc(doc(db, "events", editItem.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "events"), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setShowForm(false);
      setEditItem(null);
      setEventForm(EMPTY_EVENT);
    } catch (err) {
      alert("Error: " + err.message);
    }
    setSaving(false);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id, col) => {
    await deleteDoc(doc(db, col, id));
    setDeleteConfirm(null);
  };

  // ── Open edit ─────────────────────────────────────────────────────────────
  const openEdit = (item) => {
    setEditItem(item);
    if (activeTab === "announcements") {
      setAnnouncementForm({
        title: item.title,
        body: item.body,
        type: item.type || "info",
        author: item.author || "",
        barangay: item.barangay || "All Barangays",
        link: item.link || "",
      });
    } else {
      const d = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      setEventForm({
        title: item.title,
        description: item.description || "",
        category: item.category || "meeting",
        date: d.toISOString().split("T")[0],
        time: d.toTimeString().slice(0, 5),
        location: item.location || "",
        organizer: item.organizer || "",
        link: item.link || "",
      });
    }
    setShowForm(true);
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const formatTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const timeAgo = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📣 Events & Announcements</h1>
          <p style={S.subtitle}>
            Manage community events and public announcements
          </p>
        </div>
        <button
          style={S.addBtn}
          onClick={() => {
            setShowForm(true);
            setEditItem(null);
            setAnnouncementForm(EMPTY_ANNOUNCEMENT);
            setEventForm(EMPTY_EVENT);
          }}
        >
          + {activeTab === "announcements" ? "New Announcement" : "New Event"}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabs}>
        {[
          {
            key: "announcements",
            label: `📢 Announcements`,
            count: announcements.length,
          },
          { key: "events", label: `📅 Events`, count: events.length },
        ].map((t) => (
          <button
            key={t.key}
            style={{ ...S.tab, ...(activeTab === t.key ? S.tabActive : {}) }}
            onClick={() => {
              setActiveTab(t.key);
              setShowForm(false);
            }}
          >
            {t.label}
            <span
              style={{
                ...S.tabCount,
                ...(activeTab === t.key
                  ? { backgroundColor: "#fff3", color: "#fff" }
                  : {}),
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div style={S.layout}>
        {/* ── List ── */}
        <div style={S.listCol}>
          {loading && <div style={S.loading}>Loading...</div>}

          {/* Announcements list */}
          {activeTab === "announcements" &&
            !loading &&
            (announcements.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 48 }}>📢</div>
                <p style={{ color: "#8899BB" }}>No announcements yet</p>
              </div>
            ) : (
              announcements.map((a) => {
                const color = TYPE_COLORS[a.type] || "#1A6BFF";
                return (
                  <div key={a.id} style={{ ...S.card, borderLeftColor: color }}>
                    <div style={S.cardTop}>
                      <span style={{ fontSize: 24 }}>
                        {TYPE_ICONS[a.type] || "ℹ️"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={S.cardTitle}>{a.title}</div>
                        <div style={S.cardMeta}>
                          <span
                            style={{
                              ...S.badge,
                              backgroundColor: color + "22",
                              color,
                            }}
                          >
                            {a.type || "info"}
                          </span>
                          <span style={S.metaText}>{a.author || "Admin"}</span>
                          <span style={S.metaText}>·</span>
                          <span style={S.metaText}>{timeAgo(a.createdAt)}</span>
                          {a.barangay && (
                            <>
                              <span style={S.metaText}>·</span>
                              <span style={S.metaText}>{a.barangay}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={S.cardActions}>
                        <button style={S.editBtn} onClick={() => openEdit(a)}>
                          ✏️ Edit
                        </button>
                        <button
                          style={S.deleteBtn}
                          onClick={() =>
                            setDeleteConfirm({
                              id: a.id,
                              col: "announcements",
                              title: a.title,
                            })
                          }
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p style={S.cardBody}>{a.body}</p>
                  </div>
                );
              })
            ))}

          {/* Events list */}
          {activeTab === "events" &&
            !loading &&
            (events.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 48 }}>📅</div>
                <p style={{ color: "#8899BB" }}>No events yet</p>
              </div>
            ) : (
              events.map((e) => {
                const color = CAT_COLORS[e.category] || "#8899BB";
                const isPast = e.date?.toDate
                  ? e.date.toDate() < new Date()
                  : false;
                return (
                  <div
                    key={e.id}
                    style={{
                      ...S.card,
                      borderLeftColor: color,
                      opacity: isPast ? 0.7 : 1,
                    }}
                  >
                    <div style={S.cardTop}>
                      <span style={{ fontSize: 24 }}>
                        {CAT_ICONS[e.category] || "📅"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={S.cardTitle}>
                          {e.title}
                          {isPast && <span style={S.pastBadge}>Past</span>}
                        </div>
                        <div style={S.cardMeta}>
                          <span
                            style={{
                              ...S.badge,
                              backgroundColor: color + "22",
                              color,
                            }}
                          >
                            {e.category}
                          </span>
                          <span style={S.metaText}>
                            📅 {formatDate(e.date)}
                          </span>
                          <span style={S.metaText}>
                            🕐 {formatTime(e.date)}
                          </span>
                          {e.location && (
                            <span style={S.metaText}>📍 {e.location}</span>
                          )}
                        </div>
                      </div>
                      <div style={S.cardActions}>
                        <button style={S.editBtn} onClick={() => openEdit(e)}>
                          ✏️ Edit
                        </button>
                        <button
                          style={S.deleteBtn}
                          onClick={() =>
                            setDeleteConfirm({
                              id: e.id,
                              col: "events",
                              title: e.title,
                            })
                          }
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {e.description && <p style={S.cardBody}>{e.description}</p>}
                  </div>
                );
              })
            ))}
        </div>

        {/* ── Form Panel ── */}
        {showForm && (
          <div style={S.formPanel}>
            <div style={S.formHeader}>
              <h3 style={S.formTitle}>
                {editItem ? "✏️ Edit" : "➕ New"}{" "}
                {activeTab === "announcements" ? "Announcement" : "Event"}
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

            {/* ── Announcement Form ── */}
            {activeTab === "announcements" && (
              <div style={S.form}>
                <label style={S.label}>Title *</label>
                <input
                  style={S.input}
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm((f) => ({
                      ...f,
                      title: e.target.value,
                    }))
                  }
                  placeholder="e.g. Road closure notice"
                />

                <label style={S.label}>Type *</label>
                <div style={S.typeGrid}>
                  {ANNOUNCEMENT_TYPES.map((t) => {
                    const color = TYPE_COLORS[t];
                    const active = announcementForm.type === t;
                    return (
                      <button
                        key={t}
                        style={{
                          ...S.typeBtn,
                          ...(active
                            ? {
                                backgroundColor: color + "33",
                                borderColor: color,
                                color,
                              }
                            : {}),
                        }}
                        onClick={() =>
                          setAnnouncementForm((f) => ({ ...f, type: t }))
                        }
                      >
                        {TYPE_ICONS[t]} {t}
                      </button>
                    );
                  })}
                </div>

                <label style={S.label}>Body *</label>
                <textarea
                  style={S.textarea}
                  value={announcementForm.body}
                  onChange={(e) =>
                    setAnnouncementForm((f) => ({ ...f, body: e.target.value }))
                  }
                  placeholder="Write your announcement here..."
                  rows={5}
                />

                <label style={S.label}>Author</label>
                <input
                  style={S.input}
                  value={announcementForm.author}
                  onChange={(e) =>
                    setAnnouncementForm((f) => ({
                      ...f,
                      author: e.target.value,
                    }))
                  }
                  placeholder="e.g. Barangay Captain Juan"
                />

                <label style={S.label}>Barangay</label>
                <select
                  style={S.select}
                  value={announcementForm.barangay}
                  onChange={(e) =>
                    setAnnouncementForm((f) => ({
                      ...f,
                      barangay: e.target.value,
                    }))
                  }
                >
                  {BARANGAYS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>

                <label style={S.label}>Link (optional)</label>
                <input
                  style={S.input}
                  value={announcementForm.link}
                  onChange={(e) =>
                    setAnnouncementForm((f) => ({ ...f, link: e.target.value }))
                  }
                  placeholder="https://..."
                />

                <button
                  style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
                  onClick={saveAnnouncement}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editItem
                      ? "💾 Update Announcement"
                      : "📢 Post Announcement"}
                </button>
              </div>
            )}

            {/* ── Event Form ── */}
            {activeTab === "events" && (
              <div style={S.form}>
                <label style={S.label}>Event Title *</label>
                <input
                  style={S.input}
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Barangay Clean-up Drive"
                />

                <label style={S.label}>Category *</label>
                <div style={S.typeGrid}>
                  {EVENT_CATEGORIES.map((c) => {
                    const color = CAT_COLORS[c];
                    const active = eventForm.category === c;
                    return (
                      <button
                        key={c}
                        style={{
                          ...S.typeBtn,
                          ...(active
                            ? {
                                backgroundColor: color + "33",
                                borderColor: color,
                                color,
                              }
                            : {}),
                        }}
                        onClick={() =>
                          setEventForm((f) => ({ ...f, category: c }))
                        }
                      >
                        {CAT_ICONS[c]} {c}
                      </button>
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <label style={S.label}>Date *</label>
                    <input
                      style={S.input}
                      type="date"
                      value={eventForm.date}
                      onChange={(e) =>
                        setEventForm((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label style={S.label}>Time</label>
                    <input
                      style={S.input}
                      type="time"
                      value={eventForm.time}
                      onChange={(e) =>
                        setEventForm((f) => ({ ...f, time: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <label style={S.label}>Location</label>
                <input
                  style={S.input}
                  value={eventForm.location}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="e.g. Barangay Hall"
                />

                <label style={S.label}>Organizer</label>
                <input
                  style={S.input}
                  value={eventForm.organizer}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, organizer: e.target.value }))
                  }
                  placeholder="e.g. Barangay Health Center"
                />

                <label style={S.label}>Description</label>
                <textarea
                  style={S.textarea}
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Describe the event..."
                  rows={4}
                />

                <label style={S.label}>Link (optional)</label>
                <input
                  style={S.input}
                  value={eventForm.link}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, link: e.target.value }))
                  }
                  placeholder="https://..."
                />

                <button
                  style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}
                  onClick={saveEvent}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editItem
                      ? "💾 Update Event"
                      : "📅 Create Event"}
                </button>
              </div>
            )}
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
              "{deleteConfirm.title}" will be permanently deleted.
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
                onClick={() =>
                  handleDelete(deleteConfirm.id, deleteConfirm.col)
                }
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
  page: { padding: 32, maxWidth: 1400, margin: "0 auto" },
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

  tabs: { display: "flex", gap: 8, marginBottom: 20 },
  tab: {
    padding: "10px 20px",
    borderRadius: 12,
    border: "1px solid #1E3355",
    backgroundColor: "#162B4D",
    color: "#8899BB",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tabActive: {
    backgroundColor: "#1A6BFF",
    borderColor: "#1A6BFF",
    color: "#fff",
  },
  tabCount: {
    backgroundColor: "#1E3355",
    borderRadius: 10,
    padding: "1px 8px",
    fontSize: 12,
    fontWeight: 800,
    color: "#8899BB",
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
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cardMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
    alignItems: "center",
  },
  cardBody: { color: "#8899BB", fontSize: 13, margin: 0, lineHeight: 1.6 },
  badge: {
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
  },
  metaText: { color: "#8899BB", fontSize: 12 },
  pastBadge: {
    backgroundColor: "#8899BB22",
    color: "#8899BB",
    padding: "1px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 700,
  },
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
    width: 380,
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
    maxHeight: "75vh",
    overflowY: "auto",
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
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  textarea: {
    backgroundColor: "#162B4D",
    border: "1px solid #1E3355",
    borderRadius: 10,
    color: "#fff",
    padding: "10px 12px",
    fontSize: 14,
    resize: "vertical",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    backgroundColor: "#162B4D",
    border: "1px solid #1E3355",
    borderRadius: 10,
    color: "#fff",
    padding: "10px 12px",
    fontSize: 14,
    width: "100%",
    cursor: "pointer",
  },
  typeGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  typeBtn: {
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid #1E3355",
    backgroundColor: "#162B4D",
    color: "#8899BB",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
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
