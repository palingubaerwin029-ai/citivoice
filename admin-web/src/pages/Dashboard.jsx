import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import s from "../styles/Admin.module.css";

const STATUS_COLORS = {
  Pending: "#F59E0B",
  "In Progress": "#3B82F6",
  Resolved: "#10B981",
  Rejected: "#EF4444",
};
const CAT_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#F97316",
];

const TT = {
  contentStyle: {
    background: "#0D1B2E",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    color: "#F1F5F9",
    fontSize: 12,
  },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

const STAT_CONFIGS = [
  { key: "total", label: "Total Concerns", icon: "◉", color: "#3B82F6" },
  { key: "pending", label: "Pending Review", icon: "◷", color: "#F59E0B" },
  { key: "inProgress", label: "In Progress", icon: "◌", color: "#60A5FA" },
  { key: "resolved", label: "Resolved", icon: "◉", color: "#10B981" },
  { key: "rejected", label: "Rejected", icon: "◎", color: "#EF4444" },
  {
    key: "rate",
    label: "Resolution Rate",
    icon: "◑",
    color: "#10B981",
    isRate: true,
  },
];

export default function Dashboard() {
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "concerns"), orderBy("createdAt", "desc")),
      (snap) => {
        setConcerns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );
  }, []);

  const total = concerns.length;
  const pending = concerns.filter((c) => c.status === "Pending").length;
  const inProgress = concerns.filter((c) => c.status === "In Progress").length;
  const resolved = concerns.filter((c) => c.status === "Resolved").length;
  const rejected = concerns.filter((c) => c.status === "Rejected").length;
  const rate = total ? Math.round((resolved / total) * 100) : 0;

  const stats = { total, pending, inProgress, resolved, rejected, rate };

  const catData = Object.entries(
    concerns.reduce((a, c) => {
      a[c.category] = (a[c.category] || 0) + 1;
      return a;
    }, {}),
  ).map(([name, value]) => ({ name: name.split(" ")[0], value }));

  const statusData = Object.entries(STATUS_COLORS).map(([name, color]) => ({
    name,
    value: concerns.filter((c) => c.status === name).length,
    color,
  }));

  const urgent = concerns
    .filter((c) => c.priority === "High" && c.status === "Pending")
    .slice(0, 5);
  const recent = concerns.slice(0, 10);

  if (loading) return <div className={s.loading}>Loading dashboard…</div>;

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>Dashboard</h1>
          <p className={s.pageSubtitle}>
            {new Date().toLocaleDateString("en-PH", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--green)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--green)",
              animation: "pulse 2s infinite",
              display: "inline-block",
            }}
          />
          Live data
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsRow}>
        {STAT_CONFIGS.map((cfg) => (
          <div
            key={cfg.key}
            className={s.statCard}
            style={{ "--accent-color": cfg.color }}
          >
            <div className={s.statIconWrap}>{cfg.icon}</div>
            <div className={s.statValue}>
              {cfg.isRate ? `${stats[cfg.key]}%` : stats[cfg.key]}
            </div>
            <div className={s.statLabel}>{cfg.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr",
          gap: 14,
          marginBottom: 16,
        }}
      >
        {/* Category bar */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Concerns by Category</span>
          </div>
          <div style={{ padding: "16px 16px 8px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catData} barSize={22}>
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#475569"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip {...TT} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status donut */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Status Breakdown</span>
          </div>
          <div style={{ padding: "8px 0" }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {statusData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip {...TT} />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                padding: "0 16px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {statusData.map((s2) => (
                <div
                  key={s2.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: s2.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "var(--text-2)", flex: 1 }}>
                    {s2.name}
                  </span>
                  <span style={{ color: s2.color, fontWeight: 700 }}>
                    {s2.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resolution */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Resolution Rate</span>
          </div>
          <div style={{ padding: "20px 20px 16px", textAlign: "center" }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                color: "var(--green)",
                lineHeight: 1,
              }}
            >
              {rate}%
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                marginTop: 6,
                marginBottom: 18,
              }}
            >
              of concerns resolved
            </div>
            <div
              style={{
                height: 6,
                background: "var(--surface-3)",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 6,
                  background: "var(--green)",
                  width: `${rate}%`,
                  borderRadius: 99,
                  transition: "width 1s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 12,
                fontSize: 12,
              }}
            >
              <span style={{ color: "var(--green)" }}>
                ✓ {resolved} resolved
              </span>
              <span style={{ color: "var(--amber)" }}>
                ⏳ {pending} pending
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 14 }}
      >
        {/* Urgent */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle} style={{ color: "var(--red)" }}>
              🔴 Urgent — High Priority
            </span>
            <span
              className={s.badge}
              style={{
                background: "rgba(239,68,68,0.12)",
                color: "var(--red)",
                fontSize: 11,
              }}
            >
              {urgent.length}
            </span>
          </div>
          <div>
            {urgent.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>✅</div>
                <p className={s.emptyTitle}>All clear</p>
              </div>
            ) : (
              urgent.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-1)",
                        marginBottom: 2,
                      }}
                    >
                      {c.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {c.userName} · {c.userBarangay}
                    </div>
                  </div>
                  <a
                    href={`/concerns/${c.id}`}
                    style={{
                      fontSize: 12,
                      color: "var(--blue-light)",
                      fontWeight: 600,
                    }}
                  >
                    Review →
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent */}
        <div className={s.card}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Recent Submissions</span>
          </div>
          <table
            className={s.table}
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead className={s.thead}>
              <tr>
                {["Concern", "Category", "Status", "Filed"].map((h) => (
                  <th key={h} className={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr
                  key={c.id}
                  className={`${s.tr} ${s.trClickable}`}
                  onClick={() => (window.location = `/concerns/${c.id}`)}
                >
                  <td className={s.td}>
                    <span
                      style={{
                        color: "var(--text-1)",
                        fontWeight: 500,
                        fontSize: 13,
                      }}
                    >
                      {c.title?.slice(0, 40)}
                      {c.title?.length > 40 ? "…" : ""}
                    </span>
                  </td>
                  <td className={s.td}>
                    <span
                      className={s.badge}
                      style={{
                        background: "rgba(59,130,246,0.1)",
                        color: "var(--blue-light)",
                      }}
                    >
                      {c.category?.split(" ")[0]}
                    </span>
                  </td>
                  <td className={s.td}>
                    <span
                      className={s.badge}
                      style={{
                        background:
                          (STATUS_COLORS[c.status] || "#475569") + "22",
                        color: STATUS_COLORS[c.status] || "#94A3B8",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td
                    className={s.td}
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.createdAt?.toDate?.()?.toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    }) || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
