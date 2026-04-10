import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import s from "../styles/Admin.module.css";

const SC = {
  Pending: "#F59E0B",
  "In Progress": "#3B82F6",
  Resolved: "#10B981",
  Rejected: "#EF4444",
};
const CC = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#F97316"];

const TT = {
  contentStyle: {
    background: "#0D1B2E",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#F1F5F9",
    fontSize: 12,
  },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

const PriorityLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  if (percent < 0.07) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text
      x={cx + r * Math.cos(-midAngle * R)}
      y={cy + r * Math.sin(-midAngle * R)}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Reports() {
  const [concerns, setConcerns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("all");

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "concerns")), (snap) => {
      setConcerns(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const u2 = onSnapshot(query(collection(db, "users")), (snap) => {
      setUsers(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role !== "admin"),
      );
    });
    return () => {
      u1();
      u2();
    };
  }, []);

  const filtered = concerns.filter((c) => {
    if (range === "all" || !c.createdAt?.toDate) return true;
    const ms = { "7d": 7, "30d": 30, "90d": 90 }[range] * 86400000;
    return Date.now() - c.createdAt.toDate().getTime() <= ms;
  });

  const total = filtered.length;
  const resolved = filtered.filter((c) => c.status === "Resolved").length;
  const inProgress = filtered.filter((c) => c.status === "In Progress").length;
  const pending = filtered.filter((c) => c.status === "Pending").length;
  const rejected = filtered.filter((c) => c.status === "Rejected").length;
  const rate = total ? Math.round((resolved / total) * 100) : 0;
  const avgUp = total
    ? (filtered.reduce((s, c) => s + (c.upvotes || 0), 0) / total).toFixed(1)
    : 0;
  const hiPrio = filtered.filter((c) => c.priority === "High").length;
  const totalUp = filtered.reduce((s, c) => s + (c.upvotes || 0), 0);

  const catData = Object.entries(
    filtered.reduce((a, c) => {
      const k = c.category || "Other";
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: name.split(" ")[0], full: name, value }));

  const statusData = Object.entries(SC).map(([name, color]) => ({
    name,
    value: filtered.filter((c) => c.status === name).length,
    color,
  }));

  const prioData = [
    {
      name: "High",
      value: filtered.filter((c) => c.priority === "High").length,
      color: "#EF4444",
    },
    {
      name: "Medium",
      value: filtered.filter((c) => c.priority === "Medium").length,
      color: "#F59E0B",
    },
    {
      name: "Low",
      value: filtered.filter((c) => c.priority === "Low").length,
      color: "#10B981",
    },
  ];

  const monthly = (() => {
    const m = {};
    concerns.forEach((c) => {
      if (!c.createdAt?.toDate) return;
      const d = c.createdAt.toDate();
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!m[k]) m[k] = { month: k, submitted: 0, resolved: 0 };
      m[k].submitted++;
      if (c.status === "Resolved") m[k].resolved++;
    });
    return Object.values(m)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  })();

  const brgData = Object.entries(
    filtered.reduce((a, c) => {
      if (c.userBarangay) a[c.userBarangay] = (a[c.userBarangay] || 0) + 1;
      return a;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topUp = [...filtered]
    .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))
    .slice(0, 5);

  if (loading) return <div className={s.loading}>Loading analytics…</div>;

  const KPIS = [
    {
      label: "Total Concerns",
      value: total,
      color: "#3B82F6",
      sub: range === "all" ? "All time" : "In range",
    },
    {
      label: "Resolution Rate",
      value: `${rate}%`,
      color: "#10B981",
      sub: `${resolved} resolved`,
    },
    {
      label: "Avg Upvotes",
      value: avgUp,
      color: "#F59E0B",
      sub: `${totalUp} total votes`,
    },
    {
      label: "High Priority",
      value: hiPrio,
      color: "#EF4444",
      sub: `${total ? Math.round((hiPrio / total) * 100) : 0}% of total`,
    },
    {
      label: "In Progress",
      value: inProgress,
      color: "#60A5FA",
      sub: "Active now",
    },
    {
      label: "Citizens",
      value: users.length,
      color: "#8B5CF6",
      sub: "Registered",
    },
  ];

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Reports & Analytics</h1>
          <p className={s.pageSubtitle}>CitiVoice performance overview</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { l: "All Time", v: "all" },
            { l: "7 days", v: "7d" },
            { l: "30 days", v: "30d" },
            { l: "90 days", v: "90d" },
          ].map((r) => (
            <button
              key={r.v}
              className={s.chip}
              style={
                range === r.v
                  ? {
                      background: "rgba(37,99,235,0.2)",
                      borderColor: "var(--blue)",
                      color: "var(--blue-light)",
                      fontWeight: 600,
                    }
                  : {}
              }
              onClick={() => setRange(r.v)}
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className={s.statsRow}>
        {KPIS.map((k, i) => (
          <div
            key={i}
            className={s.statCard}
            style={{ "--accent-color": k.color }}
          >
            <div className={s.statValue}>{k.value}</div>
            <div className={s.statLabel}>{k.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <div className={s.card} style={{ flex: 2 }}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Monthly Submission Trend</span>
          </div>
          <div style={{ padding: "12px 12px 8px" }}>
            {monthly.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-3)",
                  fontSize: 13,
                }}
              >
                No trend data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="month"
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
                  <Legend wrapperStyle={{ color: "#94A3B8", fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="submitted"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: "#3B82F6", r: 3 }}
                    name="Submitted"
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: "#10B981", r: 3 }}
                    name="Resolved"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className={s.card} style={{ flex: 1 }}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Status Distribution</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
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
              padding: "0 16px 14px",
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
                    width: 7,
                    height: 7,
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

      {/* Row 2 */}
      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <div className={s.card} style={{ flex: 2 }}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Concerns by Category</span>
          </div>
          <div style={{ padding: "12px 12px 8px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catData} layout="vertical" barSize={14}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#475569"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#475569"
                  fontSize={11}
                  width={65}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip {...TT} formatter={(v, n, p) => [v, p.payload.full]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill={CC[i % CC.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={s.card} style={{ flex: 1 }}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Priority Breakdown</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={prioData}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={68}
                dataKey="value"
                paddingAngle={3}
                labelLine={false}
                label={<PriorityLabel />}
              >
                {prioData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                {...TT}
                formatter={(v, n) => [`${v} concerns`, `${n} Priority`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              padding: "0 16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {prioData.map((p) => {
              const pct = total ? Math.round((p.value / total) * 100) : 0;
              return (
                <div
                  key={p.name}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-2)",
                      minWidth: 52,
                    }}
                  >
                    {p.name}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 5,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: 5,
                        background: p.color,
                        width: `${pct}%`,
                        borderRadius: 99,
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: p.color,
                      minWidth: 22,
                      textAlign: "right",
                    }}
                  >
                    {p.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
        <div className={s.card} style={{ flex: 1 }}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Top Barangays by Reports</span>
          </div>
          <div style={{ padding: "8px 16px 16px" }}>
            {brgData.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-3)",
                  fontSize: 13,
                }}
              >
                No data yet
              </div>
            ) : (
              brgData.map(([brgy, count], i) => {
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={brgy} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--text-1)" }}>
                        <span
                          style={{
                            color: "var(--text-3)",
                            marginRight: 8,
                            fontSize: 11,
                          }}
                        >
                          #{i + 1}
                        </span>
                        {brgy}
                      </span>
                      <span
                        style={{ color: "var(--blue-light)", fontWeight: 700 }}
                      >
                        {count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 99,
                      }}
                    >
                      <div
                        style={{
                          height: 5,
                          background: CC[i % CC.length],
                          width: `${pct}%`,
                          borderRadius: 99,
                          transition: "width 0.8s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className={s.card} style={{ flex: 1 }}>
          <div className={s.cardHeader}>
            <span className={s.cardTitle}>Most Upvoted Concerns</span>
          </div>
          <div>
            {topUp.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-3)",
                  fontSize: 13,
                }}
              >
                No data yet
              </div>
            ) : (
              topUp.map((c, i) => (
                <a
                  key={c.id}
                  href={`/concerns/${c.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "11px 16px",
                    borderBottom: "1px solid var(--border)",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "var(--surface-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-3)",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        marginTop: 2,
                      }}
                    >
                      {c.category?.split(" ")[0]} · {c.userBarangay}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      flexShrink: 0,
                    }}
                  >
                    <span>👍</span>
                    <span
                      style={{
                        color: "#F59E0B",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {c.upvotes || 0}
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resolution summary */}
      <div className={s.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <h3
              style={{
                color: "var(--text-1)",
                fontSize: 16,
                fontWeight: 700,
                margin: "0 0 6px",
              }}
            >
              Overall Resolution Performance
            </h3>
            <p
              style={{
                color: "var(--text-3)",
                fontSize: 13,
                margin: "0 0 16px",
              }}
            >
              {resolved} of {total} concerns resolved
            </p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { l: "Pending", v: pending, c: "#F59E0B" },
                { l: "In Progress", v: inProgress, c: "#3B82F6" },
                { l: "Resolved", v: resolved, c: "#10B981" },
                { l: "Rejected", v: rejected, c: "#EF4444" },
              ].map((x) => (
                <div
                  key={x.l}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: x.c,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ color: "var(--text-3)", fontSize: 13 }}>
                    {x.l}:{" "}
                  </span>
                  <span style={{ color: x.c, fontWeight: 700, fontSize: 13 }}>
                    {x.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", minWidth: 160 }}>
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                color: "#10B981",
                lineHeight: 1,
              }}
            >
              {rate}%
            </div>
            <div
              style={{
                color: "var(--text-3)",
                fontSize: 13,
                marginTop: 6,
                marginBottom: 12,
              }}
            >
              Resolution Rate
            </div>
            <div
              style={{
                height: 8,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 99,
              }}
            >
              <div
                style={{
                  height: 8,
                  background: "#10B981",
                  width: `${rate}%`,
                  borderRadius: 99,
                  transition: "width 1s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
