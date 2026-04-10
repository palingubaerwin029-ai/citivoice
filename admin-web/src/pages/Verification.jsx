import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const STATUS_COLORS = {
  unverified: "#8899BB",
  pending: "#FFB800",
  verified: "#00D4AA",
  rejected: "#FF4444",
};

const STATUS_ICONS = {
  unverified: "⚪",
  pending: "🟡",
  verified: "🟢",
  rejected: "🔴",
};

export default function Verification() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("pending");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionDone, setActionDone] = useState(null); // 'approved' | 'rejected'

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "users"), where("role", "==", "citizen")),
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return unsub;
  }, []);

  const filtered = users.filter((u) =>
    filter === "all" ? true : (u.verificationStatus || "unverified") === filter,
  );

  const counts = {
    all: users.length,
    pending: users.filter((u) => u.verificationStatus === "pending").length,
    verified: users.filter((u) => u.verificationStatus === "verified").length,
    rejected: users.filter((u) => u.verificationStatus === "rejected").length,
    unverified: users.filter(
      (u) => !u.verificationStatus || u.verificationStatus === "unverified",
    ).length,
  };

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selected.id), {
        isVerified: true,
        verificationStatus: "verified",
        verifiedAt: serverTimestamp(),
        rejectionReason: null,
      });
      setActionDone("approved");
      setTimeout(() => {
        setActionDone(null);
        setSelected(null);
      }, 2000);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!selected) return;
    if (!rejectionReason.trim()) {
      alert("Please enter a reason for rejection.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selected.id), {
        isVerified: false,
        verificationStatus: "rejected",
        rejectionReason: rejectionReason.trim(),
        verifiedAt: null,
      });
      setActionDone("rejected");
      setTimeout(() => {
        setActionDone(null);
        setSelected(null);
        setRejectionReason("");
      }, 2000);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentStatus = selected?.verificationStatus || "unverified";

  return (
    <div style={S.page}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🪪 Identity Verification</h1>
          <p style={S.subtitle}>
            Review and verify citizen-submitted government IDs
          </p>
        </div>
        {counts.pending > 0 && (
          <div style={S.pendingAlert}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ color: "#FFB800", fontWeight: 800, fontSize: 16 }}>
                {counts.pending} Pending
              </div>
              <div style={{ color: "#8899BB", fontSize: 12 }}>
                Awaiting your review
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter Tabs ── */}
      <div style={S.tabs}>
        {[
          { key: "pending", label: "Pending" },
          { key: "verified", label: "Verified" },
          { key: "rejected", label: "Rejected" },
          { key: "unverified", label: "Unverified" },
          { key: "all", label: "All" },
        ].map((f) => {
          const color = STATUS_COLORS[f.key] || "#1A6BFF";
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              style={{
                ...S.tab,
                ...(active
                  ? {
                      backgroundColor: color + "22",
                      borderColor: color,
                      color,
                    }
                  : {}),
              }}
              onClick={() => {
                setFilter(f.key);
                setSelected(null);
              }}
            >
              {STATUS_ICONS[f.key] || "📋"} {f.label}
              <span
                style={{
                  ...S.tabCount,
                  backgroundColor: active ? color + "33" : "#1E3355",
                  color: active ? color : "#8899BB",
                }}
              >
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Layout ── */}
      <div
        style={{
          ...S.layout,
          gridTemplateColumns: selected ? "1fr 420px" : "1fr",
        }}
      >
        {/* ── Citizens List ── */}
        <div style={S.listCard}>
          {filtered.length === 0 ? (
            <div style={S.empty}>
              <div style={{ fontSize: 48 }}>
                {filter === "pending"
                  ? "✅"
                  : filter === "verified"
                    ? "🏆"
                    : "📭"}
              </div>
              <p style={{ color: "#8899BB", marginTop: 12, fontSize: 15 }}>
                No {filter} submissions
              </p>
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr style={{ backgroundColor: "#162B4D" }}>
                  {[
                    "Citizen",
                    "Barangay",
                    "ID Type",
                    "ID Number",
                    "Status",
                    "Submitted",
                    "Action",
                  ].map((h) => (
                    <th key={h} style={S.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const status = u.verificationStatus || "unverified";
                  const color = STATUS_COLORS[status];
                  const isSelected = selected?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      style={{
                        ...S.tr,
                        ...(isSelected
                          ? {
                              backgroundColor: "#1A6BFF11",
                              borderLeftColor: "#1A6BFF",
                            }
                          : {}),
                      }}
                    >
                      {/* Citizen */}
                      <td style={S.td}>
                        <div style={S.citizenCell}>
                          <div style={S.avatar}>
                            {u.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div style={S.citizenName}>
                              {u.name}
                              {u.isVerified && (
                                <span style={S.verifiedBadge}>✓ Verified</span>
                              )}
                            </div>
                            <div style={S.citizenEmail}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={S.barangayTag}>{u.barangay || "—"}</span>
                      </td>
                      <td style={{ ...S.td, color: "#fff" }}>
                        {u.idType || (
                          <span style={{ color: "#4A5A7A" }}>
                            Not submitted
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          ...S.td,
                          color: "#8899BB",
                          fontFamily: "monospace",
                        }}
                      >
                        {u.idNumber || "—"}
                      </td>
                      <td style={S.td}>
                        <span
                          style={{
                            ...S.statusBadge,
                            backgroundColor: color + "22",
                            color,
                          }}
                        >
                          {STATUS_ICONS[status]} {status}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: "#8899BB", fontSize: 12 }}>
                        {u.submittedAt
                          ?.toDate?.()
                          ?.toLocaleDateString("en-PH") || "—"}
                      </td>
                      {/* Action Buttons inline */}
                      <td style={S.td}>
                        <div style={S.inlineActions}>
                          <button
                            style={S.reviewBtn}
                            onClick={() => {
                              setSelected(isSelected ? null : u);
                              setRejectionReason("");
                              setActionDone(null);
                            }}
                          >
                            {isSelected ? "Close" : "🔍 Review"}
                          </button>
                          {/* Quick Accept/Reject for pending */}
                          {status === "pending" && !isSelected && (
                            <>
                              <button
                                style={S.quickAcceptBtn}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateDoc(doc(db, "users", u.id), {
                                    isVerified: true,
                                    verificationStatus: "verified",
                                    verifiedAt: serverTimestamp(),
                                    rejectionReason: null,
                                  });
                                }}
                              >
                                ✅
                              </button>
                              <button
                                style={S.quickRejectBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(u);
                                }}
                              >
                                ❌
                              </button>
                            </>
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

        {/* ── Detail Panel ── */}
        {selected && (
          <div style={S.panel}>
            {/* Panel Header */}
            <div style={S.panelHeader}>
              <div>
                <h3 style={S.panelTitle}>📋 Review Submission</h3>
                <span
                  style={{
                    ...S.statusBadge,
                    backgroundColor: STATUS_COLORS[currentStatus] + "22",
                    color: STATUS_COLORS[currentStatus],
                  }}
                >
                  {STATUS_ICONS[currentStatus]} {currentStatus}
                </span>
              </div>
              <button
                style={S.closeBtn}
                onClick={() => {
                  setSelected(null);
                  setActionDone(null);
                }}
              >
                ✕
              </button>
            </div>

            {/* Citizen Info */}
            <div style={S.infoCard}>
              <div style={S.panelAvatar}>
                {selected.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div style={S.panelName}>{selected.name}</div>
              <div style={S.panelEmail}>{selected.email}</div>
            </div>

            <div style={S.infoGrid}>
              {[
                { label: "📞 Phone", value: selected.phone || "—" },
                { label: "📍 Barangay", value: selected.barangay || "—" },
                {
                  label: "🪪 ID Type",
                  value: selected.idType || "Not submitted",
                },
                { label: "🔢 ID Number", value: selected.idNumber || "—" },
              ].map((item, i) => (
                <div key={i} style={S.infoRow}>
                  <div style={S.infoLabel}>{item.label}</div>
                  <div style={S.infoValue}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* ID Photo */}
            {selected.idImageUrl ? (
              <div style={{ marginBottom: 20 }}>
                <div style={S.idPhotoHeader}>
                  <span style={S.sectionLabel}>📷 SUBMITTED ID PHOTO</span>
                  <button
                    style={S.viewFullBtn}
                    onClick={() => window.open(selected.idImageUrl, "_blank")}
                  >
                    View Full ↗
                  </button>
                </div>
                <img src={selected.idImageUrl} alt="ID" style={S.idPhoto} />
              </div>
            ) : (
              <div style={S.noIdPhoto}>
                <span style={{ fontSize: 32 }}>📂</span>
                <p style={{ color: "#8899BB", margin: 0, fontSize: 13 }}>
                  No ID photo uploaded yet
                </p>
              </div>
            )}

            {/* ════════════════════════════════
                  ACCEPT / REJECT BUTTONS
                ════════════════════════════════ */}

            {/* Success feedback */}
            {actionDone === "approved" && (
              <div style={S.successBanner}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div>
                  <div
                    style={{ color: "#00D4AA", fontWeight: 800, fontSize: 16 }}
                  >
                    Approved!
                  </div>
                  <div style={{ color: "#8899BB", fontSize: 12 }}>
                    Citizen is now verified
                  </div>
                </div>
              </div>
            )}
            {actionDone === "rejected" && (
              <div style={S.rejectedFeedback}>
                <span style={{ fontSize: 24 }}>❌</span>
                <div>
                  <div
                    style={{ color: "#FF4444", fontWeight: 800, fontSize: 16 }}
                  >
                    Rejected
                  </div>
                  <div style={{ color: "#8899BB", fontSize: 12 }}>
                    Citizen has been notified
                  </div>
                </div>
              </div>
            )}

            {!actionDone && (
              <div style={S.actionBox}>
                <div style={S.actionBoxTitle}>⚖️ Admin Decision</div>

                {/* ── ACCEPT BUTTON ── */}
                <button
                  style={{
                    ...S.acceptBtn,
                    opacity: saving ? 0.6 : 1,
                    ...(currentStatus === "verified"
                      ? S.acceptBtnDisabled
                      : {}),
                  }}
                  onClick={handleAccept}
                  disabled={saving || currentStatus === "verified"}
                >
                  <span style={{ fontSize: 20 }}>✅</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>
                      {currentStatus === "verified"
                        ? "Already Verified"
                        : "Accept & Verify"}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                      {currentStatus === "verified"
                        ? "This citizen is already verified"
                        : "Approve ID and grant verified status"}
                    </div>
                  </div>
                </button>

                {/* Divider */}
                <div style={S.orDivider}>
                  <div style={S.orLine} />
                  <span style={S.orText}>OR</span>
                  <div style={S.orLine} />
                </div>

                {/* ── REJECT SECTION ── */}
                <div style={S.rejectBox}>
                  <label style={S.rejectLabel}>
                    ❌ Reject — Reason{" "}
                    <span style={{ color: "#FF4444" }}>*</span>
                  </label>
                  <textarea
                    style={S.rejectTextarea}
                    placeholder="e.g. ID photo is blurry. Please resubmit a clearer photo."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                  <button
                    style={{
                      ...S.rejectBtn,
                      opacity: saving || !rejectionReason.trim() ? 0.5 : 1,
                    }}
                    onClick={handleReject}
                    disabled={saving || !rejectionReason.trim()}
                  >
                    <span style={{ fontSize: 18 }}>❌</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>
                        Reject Submission
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                        Citizen will be asked to resubmit
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Previous rejection reason */}
            {currentStatus === "rejected" &&
              selected.rejectionReason &&
              !actionDone && (
                <div style={S.prevRejection}>
                  <div style={S.sectionLabel}>📝 PREVIOUS REJECTION REASON</div>
                  <p
                    style={{
                      color: "#FF6666",
                      fontSize: 13,
                      margin: "8px 0 0",
                    }}
                  >
                    {selected.rejectionReason}
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
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
  pendingAlert: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFB80022",
    border: "1px solid #FFB80055",
    borderRadius: 14,
    padding: "12px 18px",
  },

  tabs: { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  tab: {
    padding: "8px 16px",
    borderRadius: 20,
    border: "1px solid #1E3355",
    backgroundColor: "#162B4D",
    color: "#8899BB",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tabCount: {
    borderRadius: 10,
    padding: "1px 7px",
    fontSize: 11,
    fontWeight: 800,
  },

  layout: { display: "grid", gap: 20 },

  listCard: {
    backgroundColor: "#112240",
    borderRadius: 16,
    border: "1px solid #1E3355",
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    color: "#8899BB",
    fontSize: 11,
    fontWeight: 700,
    textAlign: "left",
    padding: "12px 16px",
    borderBottom: "1px solid #1E3355",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tr: {
    borderBottom: "1px solid #1E3355",
    borderLeft: "3px solid transparent",
    transition: "background 0.1s",
  },
  td: {
    padding: "12px 16px",
    fontSize: 13,
    color: "#8899BB",
    verticalAlign: "middle",
  },

  citizenCell: { display: "flex", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1A6BFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    flexShrink: 0,
  },
  citizenName: {
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  citizenEmail: { color: "#4A5A7A", fontSize: 11, marginTop: 2 },
  verifiedBadge: {
    backgroundColor: "#00D4AA22",
    color: "#00D4AA",
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 6px",
    borderRadius: 10,
  },
  barangayTag: {
    backgroundColor: "#1A6BFF22",
    color: "#4D8FFF",
    padding: "3px 8px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    display: "inline-block",
  },

  inlineActions: { display: "flex", gap: 6, alignItems: "center" },
  reviewBtn: {
    backgroundColor: "#1A6BFF22",
    border: "1px solid #1A6BFF44",
    color: "#1A6BFF",
    borderRadius: 8,
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  quickAcceptBtn: {
    backgroundColor: "#00D4AA22",
    border: "1px solid #00D4AA44",
    borderRadius: 8,
    padding: "5px 8px",
    cursor: "pointer",
    fontSize: 14,
  },
  quickRejectBtn: {
    backgroundColor: "#FF444422",
    border: "1px solid #FF444444",
    borderRadius: 8,
    padding: "5px 8px",
    cursor: "pointer",
    fontSize: 14,
  },

  empty: { padding: 80, textAlign: "center" },

  // ── Panel ──
  panel: {
    backgroundColor: "#112240",
    borderRadius: 16,
    border: "1px solid #1E3355",
    padding: 22,
    alignSelf: "start",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  panelTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: 800,
    margin: "0 0 6px",
  },
  closeBtn: {
    background: "none",
    border: "1px solid #1E3355",
    color: "#8899BB",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 14,
  },

  infoCard: {
    backgroundColor: "#162B4D",
    borderRadius: 14,
    padding: 16,
    border: "1px solid #1E3355",
    textAlign: "center",
    marginBottom: 14,
  },
  panelAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#1A6BFF",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 900,
    fontSize: 22,
    marginBottom: 10,
  },
  panelName: { color: "#fff", fontSize: 17, fontWeight: 800 },
  panelEmail: { color: "#8899BB", fontSize: 13, marginTop: 3 },

  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    backgroundColor: "#162B4D",
    borderRadius: 12,
    border: "1px solid #1E3355",
    overflow: "hidden",
    marginBottom: 16,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderBottom: "1px solid #1E3355",
  },
  infoLabel: { color: "#8899BB", fontSize: 12 },
  infoValue: { color: "#fff", fontSize: 13, fontWeight: 600 },

  idPhotoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    color: "#8899BB",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  viewFullBtn: {
    background: "none",
    border: "1px solid #1E3355",
    color: "#1A6BFF",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },
  idPhoto: {
    width: "100%",
    borderRadius: 12,
    objectFit: "cover",
    maxHeight: 200,
    border: "1px solid #1E3355",
  },
  noIdPhoto: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#162B4D",
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    border: "1px solid #1E3355",
  },

  // ── Action Box ──
  actionBox: {
    backgroundColor: "#0D1F3C",
    borderRadius: 16,
    padding: 18,
    border: "2px solid #1E3355",
  },
  actionBoxTitle: {
    color: "#8899BB",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },

  acceptBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    backgroundColor: "#00D4AA",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,212,170,0.35)",
    transition: "opacity 0.2s",
    marginBottom: 4,
  },
  acceptBtnDisabled: {
    backgroundColor: "#1E3355",
    boxShadow: "none",
    color: "#8899BB",
  },

  orDivider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "14px 0",
  },
  orLine: { flex: 1, height: 1, backgroundColor: "#1E3355" },
  orText: { color: "#4A5A7A", fontSize: 11, fontWeight: 700 },

  rejectBox: { display: "flex", flexDirection: "column", gap: 10 },
  rejectLabel: { color: "#8899BB", fontSize: 12, fontWeight: 700 },
  rejectTextarea: {
    width: "100%",
    backgroundColor: "#162B4D",
    border: "1px solid #1E3355",
    borderRadius: 10,
    color: "#fff",
    padding: "10px 12px",
    fontSize: 13,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  rejectBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
    backgroundColor: "#FF444422",
    color: "#FF4444",
    border: "2px solid #FF444455",
    borderRadius: 14,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },

  successBanner: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#00D4AA22",
    border: "2px solid #00D4AA55",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  rejectedFeedback: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FF444422",
    border: "2px solid #FF444455",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },

  prevRejection: {
    backgroundColor: "#FF444411",
    border: "1px solid #FF444433",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
};
