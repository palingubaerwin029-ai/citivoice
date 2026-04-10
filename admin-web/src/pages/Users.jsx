import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import s from "../styles/Admin.module.css";

const AVATARS = [
  "#3B82F6",
  "#10B981",
  "#F97316",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];
const AC = (uid) => AVATARS[(uid?.charCodeAt(0) || 0) % AVATARS.length];
const initials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
const SC = {
  Pending: "#F59E0B",
  "In Progress": "#3B82F6",
  Resolved: "#10B981",
  Rejected: "#EF4444",
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brgyFilter, setBrgyFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(
      query(collection(db, "users"), orderBy("createdAt", "desc")),
      (snap) => {
        setUsers(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((u) => u.role !== "admin"),
        );
        setLoading(false);
      },
    );
    const u2 = onSnapshot(query(collection(db, "concerns")), (snap) => {
      setConcerns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      u1();
      u2();
    };
  }, []);

  const barangays = [
    "All",
    ...new Set(users.map((u) => u.barangay).filter(Boolean)),
  ];
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)) &&
      (brgyFilter === "All" || u.barangay === brgyFilter)
    );
  });

  const count = (uid) => concerns.filter((c) => c.userId === uid).length;
  const resCount = (uid) =>
    concerns.filter((c) => c.userId === uid && c.status === "Resolved").length;

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Citizens</h1>
          <p className={s.pageSubtitle}>{users.length} registered users</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { l: "Total", v: users.length, c: "var(--blue-light)" },
            { l: "Barangays", v: barangays.length - 1, c: "var(--green)" },
            { l: "Reports", v: concerns.length, c: "var(--amber)" },
          ].map((x) => (
            <div
              key={x.l}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)",
                padding: "10px 16px",
                textAlign: "center",
                minWidth: 80,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 800, color: x.c }}>
                {x.v}
              </div>
              <div
                style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}
              >
                {x.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.search}>
          <span className={s.searchIcon}>🔍</span>
          <input
            className={s.searchInput}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--text-3)",
                cursor: "pointer",
              }}
              onClick={() => setSearch("")}
            >
              ✕
            </button>
          )}
        </div>
        <select
          className={s.select}
          value={brgyFilter}
          onChange={(e) => setBrgyFilter(e.target.value)}
        >
          {barangays.map((b) => (
            <option key={b} value={b}>
              {b === "All" ? "All Barangays" : b}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selected ? "1fr 320px" : "1fr",
          gap: 16,
        }}
      >
        {/* Table */}
        <div className={s.tableWrap}>
          {loading ? (
            <div className={s.loading}>Loading…</div>
          ) : (
            <table className={s.table}>
              <thead className={s.thead}>
                <tr>
                  {[
                    "Citizen",
                    "Contact",
                    "Barangay",
                    "Reports",
                    "Resolved",
                    "Member Since",
                    "",
                  ].map((h) => (
                    <th key={h} className={s.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const uid = u.uid || u.id;
                  const isSel = selected?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={`${s.tr} ${s.trClickable} ${isSel ? s.trSelected : ""}`}
                      onClick={() => setSelected(isSel ? null : u)}
                    >
                      <td className={s.td}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "var(--r-md)",
                              background: AC(uid),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {initials(u.name)}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "var(--text-1)",
                                fontSize: 13,
                              }}
                            >
                              {u.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text-3)",
                                marginTop: 1,
                              }}
                            >
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={s.td} style={{ fontSize: 12 }}>
                        {u.phone || "—"}
                      </td>
                      <td className={s.td}>
                        <span
                          className={s.badge}
                          style={{
                            background: "rgba(59,130,246,0.1)",
                            color: "var(--blue-light)",
                          }}
                        >
                          {u.barangay || "—"}
                        </span>
                      </td>
                      <td
                        className={s.td}
                        style={{ fontWeight: 700, color: "var(--text-1)" }}
                      >
                        {count(uid)}
                      </td>
                      <td
                        className={s.td}
                        style={{ fontWeight: 700, color: "var(--green)" }}
                      >
                        {resCount(uid)}
                      </td>
                      <td
                        className={s.td}
                        style={{ fontSize: 11, color: "var(--text-3)" }}
                      >
                        {u.createdAt?.toDate?.()?.toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }) || "—"}
                      </td>
                      <td className={s.td}>
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}>
                          {isSel ? "Close" : "View"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div className={s.empty}>
              <div className={s.emptyIcon}>👤</div>
              <p className={s.emptyTitle}>No citizens found</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <div className={s.card} style={{ alignSelf: "start" }}>
            <div
              style={{
                padding: "16px 16px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "var(--r-xl)",
                  background: AC(selected.uid || selected.id),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 20,
                }}
              >
                {initials(selected.name)}
              </div>
              <button
                className={`${s.btn} ${s.btnGhost} ${s.btnSm}`}
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "0 16px 14px" }}>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: "var(--text-1)",
                  marginBottom: 4,
                }}
              >
                {selected.name}
              </div>
              <span
                className={s.badge}
                style={{
                  background: "rgba(59,130,246,0.1)",
                  color: "var(--blue-light)",
                  fontSize: 11,
                }}
              >
                🏙 Citizen
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                padding: "0 16px 14px",
              }}
            >
              {[
                {
                  l: "Reports",
                  v: count(selected.uid || selected.id),
                  c: "var(--blue-light)",
                },
                {
                  l: "Resolved",
                  v: resCount(selected.uid || selected.id),
                  c: "var(--green)",
                },
              ].map((x) => (
                <div
                  key={x.l}
                  style={{
                    background: "var(--surface-3)",
                    borderRadius: "var(--r-md)",
                    padding: 12,
                    textAlign: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: x.c }}>
                    {x.v}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-3)",
                      marginTop: 3,
                    }}
                  >
                    {x.l}
                  </div>
                </div>
              ))}
            </div>
            <div
              className={s.infoGrid}
              style={{
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
                marginBottom: 12,
              }}
            >
              {[
                { l: "Email", v: selected.email },
                { l: "Phone", v: selected.phone || "—" },
                { l: "Barangay", v: selected.barangay || "—" },
                {
                  l: "Joined",
                  v:
                    selected.createdAt
                      ?.toDate?.()
                      ?.toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }) || "—",
                },
              ].map((x, i) => (
                <div key={i} className={s.infoRow}>
                  <span className={s.infoLabel}>{x.l}</span>
                  <span className={s.infoValue}>{x.v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 16px 16px" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 10,
                }}
              >
                Recent Concerns
              </div>
              {concerns
                .filter((c) => c.userId === (selected.uid || selected.id))
                .slice(0, 5)
                .map((c) => (
                  <a
                    key={c.id}
                    href={`/concerns/${c.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                      textDecoration: "none",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--text-1)",
                        }}
                      >
                        {c.title?.slice(0, 35)}…
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text-3)",
                          marginTop: 2,
                        }}
                      >
                        {c.category?.split(" ")[0]}
                      </div>
                    </div>
                    <span
                      className={s.badge}
                      style={{
                        fontSize: 10,
                        background: (SC[c.status] || "#475569") + "18",
                        color: SC[c.status] || "#94A3B8",
                      }}
                    >
                      {c.status}
                    </span>
                  </a>
                ))}
              {count(selected.uid || selected.id) === 0 && (
                <p
                  style={{
                    color: "var(--text-3)",
                    fontSize: 12,
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  No concerns yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
