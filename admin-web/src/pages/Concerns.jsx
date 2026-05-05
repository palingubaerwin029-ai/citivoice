import React, { useEffect, useState } from "react";
import { api, fmtDateShort } from "../services/api";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Table.module.css";
import s from "../styles/Admin.module.css";

const STATUS_COLORS   = { Pending: "#FFB800", "In Progress": "#1A6BFF", Resolved: "#00D4AA", Rejected: "#FF4444" };
const PRIORITY_COLORS = { High: "#FF4444", Medium: "#FFB800", Low: "#00D4AA" };
const STATUSES        = ["All","Pending","In Progress","Resolved","Rejected"];
const PRIORITIES      = ["All","High","Medium","Low"];

export default function Concerns() {
  const [concerns,         setConcerns]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState("");
  const [selectedCitizen,  setSelectedCitizen]  = useState(null);
  const [statusFilter,     setStatusFilter]     = useState("All");
  const [priorityFilter,   setPriorityFilter]   = useState("All");
  const [sortBy,           setSortBy]           = useState("newest");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = () => {
      api.get("/concerns")
        .then(setConcerns)
        .catch(console.error)
        .finally(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Grouping by Citizen
  const citizensMap = concerns.reduce((acc, c) => {
    const key = c.user_id || c.user_name || "Anonymous";
    if (!acc[key]) {
      acc[key] = {
        id: c.user_id,
        name: c.user_name || "Anonymous",
        barangay: c.user_barangay || "N/A",
        total: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        latest: c.created_at,
        concerns: []
      };
    }
    acc[key].total++;
    if (c.priority) acc[key][c.priority]++;
    acc[key].concerns.push(c);
    if (new Date(c.created_at) > new Date(acc[key].latest)) {
      acc[key].latest = c.created_at;
    }
    return acc;
  }, {});

  const citizensList = Object.values(citizensMap).filter(c => {
    const s = search.toLowerCase();
    return !s || c.name.toLowerCase().includes(s) || c.barangay.toLowerCase().includes(s);
  }).sort((a, b) => new Date(b.latest) - new Date(a.latest));

  const filteredConcerns = (selectedCitizen?.concerns || [])
    .filter((c) => {
      const s = search.toLowerCase();
      return (
        (!s || c.title?.toLowerCase().includes(s)) &&
        (statusFilter   === "All" || c.status   === statusFilter) &&
        (priorityFilter === "All" || c.priority === priorityFilter)
      );
    })
    .sort((a, b) => {
      if (sortBy === "newest")   return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "oldest")   return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "upvotes")  return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === "priority") return (({ High: 3, Medium: 2, Low: 1 }[b.priority] || 0) - ({ High: 3, Medium: 2, Low: 1 }[a.priority] || 0));
      return 0;
    });

  if (loading) return <div className={styles.loading}>Loading concerns...</div>;

  return (
    <div className={styles.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>
            {selectedCitizen ? `👤 Concerns of ${selectedCitizen.name}` : "📋 Concerns Management"}
          </h1>
          <p className={s.pageSubtitle}>
            {selectedCitizen 
              ? `${filteredConcerns.length} concerns found for this citizen` 
              : `${citizensList.length} citizens with active concerns`}
          </p>
        </div>
        {selectedCitizen && (
          <button className={`${s.btn} ${s.btnGhost}`} onClick={() => { setSelectedCitizen(null); setSearch(""); }}>
            ← Back to Citizens
          </button>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filtersCard}>
        <div className={styles.filterRow}>
          <div className={styles.searchBox}>
            <span>🔍</span>
            <input 
              className={styles.searchInput} 
              placeholder={selectedCitizen ? "Search concerns..." : "Search citizens or barangay..."} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            {search && <button className={styles.clearBtn} onClick={() => setSearch("")}>✕</button>}
          </div>
          {selectedCitizen && (
            <select className={styles.selectFilter} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="upvotes">Most Upvoted</option>
              <option value="priority">Highest Priority</option>
            </select>
          )}
        </div>
        
        {selectedCitizen && (
          <>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Status:</span>
              {STATUSES.map((s) => (
                <button key={s} className={`${styles.chip} ${statusFilter === s ? styles.chipActive : ""}`}
                  style={statusFilter === s ? { borderColor: STATUS_COLORS[s] || "var(--primary)", color: STATUS_COLORS[s] || "var(--primary)", backgroundColor: (STATUS_COLORS[s] || "#1A6BFF") + "22" } : {}}
                  onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Priority:</span>
              {PRIORITIES.map((p) => (
                <button key={p} className={`${styles.chip} ${priorityFilter === p ? styles.chipActive : ""}`}
                  style={priorityFilter === p && p !== "All" ? { borderColor: PRIORITY_COLORS[p], color: PRIORITY_COLORS[p], backgroundColor: PRIORITY_COLORS[p] + "22" } : {}}
                  onClick={() => setPriorityFilter(p)}>{p}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          {!selectedCitizen ? (
            <>
              <thead className={styles.thead}>
                <tr>{["Citizen","Barangay","Total","High","Medium","Low","Latest","Action"].map((h) => <th key={h} className={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {citizensList.map((c) => (
                  <tr key={c.id || c.name} className={styles.tr} onClick={() => { setSelectedCitizen(c); setSearch(""); }}>
                    <td className={styles.td} style={{ color: "var(--text-1)", fontWeight: 600 }}>{c.name}</td>
                    <td className={styles.td}>{c.barangay}</td>
                    <td className={styles.td} style={{ fontWeight: 700 }}>{c.total}</td>
                    <td className={styles.td}><span style={{ color: PRIORITY_COLORS.High }}>🔴 {c.High}</span></td>
                    <td className={styles.td}><span style={{ color: PRIORITY_COLORS.Medium }}>🟡 {c.Medium}</span></td>
                    <td className={styles.td}><span style={{ color: PRIORITY_COLORS.Low }}>🟢 {c.Low}</span></td>
                    <td className={styles.td} style={{ fontSize: 12 }}>{fmtDateShort(c.latest)}</td>
                    <td className={styles.td}><button className={styles.actionBtn}>View Concerns →</button></td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <thead className={styles.thead}>
                <tr>{["Concern","Category","Priority","Status","Upvotes","Date","Action"].map((h) => <th key={h} className={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredConcerns.map((c) => (
                  <tr key={c.id} className={styles.tr} onClick={() => navigate(`/concerns/${c.id}`)}>
                    <td className={styles.td}>
                      <div style={{ color: "var(--text-1)", fontWeight: 600, marginBottom: 2 }}>{c.title}</div>
                      <div style={{ color: "var(--text-3)", fontSize: 11 }}>{c.description?.slice(0, 55)}...</div>
                    </td>
                    <td className={styles.td}><span className={styles.catTag}>{c.category?.split(" ")[0]}</span></td>
                    <td className={styles.td}>
                      <span className={styles.priorityTag} style={{ color: PRIORITY_COLORS[c.priority], backgroundColor: (PRIORITY_COLORS[c.priority] || "#8899BB") + "22" }}>
                        {c.priority === "High" ? "🔴" : c.priority === "Medium" ? "🟡" : "🟢"} {c.priority}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.statusTag} style={{ color: STATUS_COLORS[c.status], backgroundColor: (STATUS_COLORS[c.status] || "#8899BB") + "22" }}>{c.status}</span>
                    </td>
                    <td className={styles.td} style={{ color: "#00D4AA", fontWeight: 700 }}>👍 {c.upvotes || 0}</td>
                    <td className={styles.td} style={{ fontSize: 12 }}>{fmtDateShort(c.created_at)}</td>
                    <td className={styles.td}><button className={styles.actionBtn} onClick={() => navigate(`/concerns/${c.id}`)}>Review →</button></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
        {(selectedCitizen ? filteredConcerns : citizensList).length === 0 && (
          <div className={styles.emptyState}><div className={styles.emptyIcon}>📭</div><p className={styles.emptyText}>No matches found</p></div>
        )}
      </div>
    </div>
  );
}

