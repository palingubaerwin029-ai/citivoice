import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtDateShort, getPinBarangay, KABANKALAN_BARANGAY_COORDS } from '../services/api';
import s from '../styles/Admin.module.css';
import r from '../styles/Reports.module.css';

const PRIORITY_OPTIONS = ['All', 'High', 'Medium', 'Low'];
const PAGE_SIZE_OPTIONS = [25, 50, 100, 'All'];

const MONTH_OPTIONS = [
  { value: 'All', label: 'All Months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

export default function Reports() {
  const navigate = useNavigate();
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'format' (the exact Date | Pending | In Progress | Resolved | Reject | Total table) or 'detail' (row per concern)
  const [viewMode, setViewMode] = useState('format');

  // Aggregation: 'month' (default: monthly results) or 'day' (daily results)
  const [groupBy, setGroupBy] = useState('month');

  // Filters
  const [yearFilter, setYearFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [barangayFilter, setBarangayFilter] = useState('All');

  // Expanded row for viewing details inline
  const [expandedKey, setExpandedKey] = useState(null);

  // Sorting for detail view
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination for detail view
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedRowId, setSelectedRowId] = useState(null);

  const fetchReports = () => {
    setLoading(true);
    api.get('/concerns', { limit: 5000 })
      .then((res) => {
        setConcerns(res.data || []);
      })
      .catch((err) => {
        console.error('Failed to load reports:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Extract distinct years from data
  const yearOptions = useMemo(() => {
    const years = new Set();
    concerns.forEach((c) => {
      if (!c.created_at) return;
      const d = new Date(c.created_at);
      if (!isNaN(d.getTime())) years.add(String(d.getFullYear()));
    });
    return ['All', ...Array.from(years).sort().reverse()];
  }, [concerns]);

  // Extract distinct categories from data
  const categoryOptions = useMemo(() => {
    const cats = new Set();
    concerns.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return ['All', ...Array.from(cats).sort()];
  }, [concerns]);

  // Extract distinct barangays from data and coords list
  const barangayOptions = useMemo(() => {
    const brgySet = new Set(KABANKALAN_BARANGAY_COORDS.map((b) => b.name));
    concerns.forEach((c) => {
      const b = getPinBarangay(c);
      if (b) brgySet.add(b);
    });
    return ['All', ...Array.from(brgySet).sort()];
  }, [concerns]);

  // Filter raw concerns
  const filteredData = useMemo(() => {
    return concerns.filter((c) => {
      if (!c.created_at) return false;
      const d = new Date(c.created_at);
      if (isNaN(d.getTime())) return false;

      // Year Filter
      if (yearFilter !== 'All') {
        if (String(d.getFullYear()) !== yearFilter) return false;
      }

      // Month Filter
      if (monthFilter !== 'All') {
        if (String(d.getMonth()) !== monthFilter) return false;
      }

      // Priority
      if (priorityFilter !== 'All' && c.priority !== priorityFilter) return false;

      // Category
      if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;

      // Barangay
      if (barangayFilter !== 'All') {
        const brgy = getPinBarangay(c);
        if (brgy !== barangayFilter) return false;
      }

      return true;
    });
  }, [concerns, yearFilter, monthFilter, priorityFilter, categoryFilter, barangayFilter]);

  // ── Aggregated Table in User's Exact Format: Date | Pending | In Progress | Resolved | Reject | Total ──
  const aggregatedRows = useMemo(() => {
    const groups = {};

    filteredData.forEach((c) => {
      const d = new Date(c.created_at);
      let key, label;

      if (groupBy === 'day') {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        key = `${y}-${m}-${day}`;
        label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        key = `${y}-${m}`;
        label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          label,
          pending: 0,
          inProgress: 0,
          resolved: 0,
          reject: 0,
          total: 0,
          items: [],
        };
      }

      const st = (c.status || '').toLowerCase();
      if (st === 'pending') groups[key].pending++;
      else if (st === 'in progress') groups[key].inProgress++;
      else if (st === 'resolved') groups[key].resolved++;
      else if (st === 'rejected' || st === 'reject') groups[key].reject++;

      groups[key].total++;
      groups[key].items.push(c);
    });

    return Object.values(groups).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [filteredData, groupBy]);


  // Sorted concerns for detail view
  const sortedData = useMemo(() => {
    const list = [...filteredData];
    list.sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'created_at':
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
          break;
        case 'title':
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
          break;
        case 'category':
          valA = (a.category || '').toLowerCase();
          valB = (b.category || '').toLowerCase();
          break;
        case 'barangay':
          valA = getPinBarangay(a).toLowerCase();
          valB = getPinBarangay(b).toLowerCase();
          break;
        case 'status':
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
          break;
        default:
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredData, sortField, sortOrder]);

  // Export CSV matching user's exact format: Date, Pending, In Progress, Resolved, Reject, Total
  const exportToCSV = () => {
    const headers = ['Date', 'Pending', 'In Progress', 'Resolved', 'Reject', 'Total'];
    const rows = aggregatedRows.map((r) => [
      `"${r.label}"`,
      r.pending,
      r.inProgress,
      r.resolved,
      r.reject,
      r.total,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `citivoice-concerns-report-${groupBy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setGroupBy('month');
    setYearFilter('All');
    setMonthFilter('All');
    setPriorityFilter('All');
    setCategoryFilter('All');
    setBarangayFilter('All');
    setExpandedKey(null);
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    groupBy !== 'month' ||
    yearFilter !== 'All' ||
    monthFilter !== 'All' ||
    priorityFilter !== 'All' ||
    categoryFilter !== 'All' ||
    barangayFilter !== 'All'
  );

  // Pagination for detail view
  const effectivePageSize = pageSize === 'All' ? sortedData.length || 1 : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedData.length / effectivePageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    if (pageSize === 'All') return sortedData;
    const start = (safeCurrentPage - 1) * effectivePageSize;
    return sortedData.slice(start, start + effectivePageSize);
  }, [sortedData, safeCurrentPage, effectivePageSize, pageSize]);

  return (
    <div className={s.page}>
      {/* ── Official Print Header (Visible only when printing) ── */}
      <div className={`${s.printOnly} ${r.printHeader}`}>
        <div className={r.printHeaderInner}>
          <div className={r.printLogoBlock}>
            <div className={r.printEmblem}>🏛️</div>
            <div>
              <div className={r.printGovTitle}>Republic of the Philippines · Province of Negros Occidental</div>
              <h1 className={r.printCityTitle}>CITY GOVERNMENT OF KABANKALAN</h1>
              <div className={r.printSystemTitle}>CITIVOICE CONCERNS SUMMARY REPORT</div>
            </div>
          </div>
          <div className={r.printMetaBlock}>
            <div className={r.printMetaBadge}>OFFICIAL SUMMARY REPORT</div>
            <div className={r.printMetaDate}>
              <strong>Format:</strong> {groupBy === 'month' ? 'Monthly Results' : 'Daily Results'}
            </div>
            <div className={r.printMetaDate}>
              <strong>Generated:</strong> {new Date().toLocaleString('en-US')}
            </div>
            <div className={r.printMetaDate}>
              <strong>Total Concerns:</strong> {filteredData.length} records
            </div>
          </div>
        </div>
      </div>

      {/* ── Screen Header / Action Toolbar ── */}
      <div className={`${r.excelTopBar} ${s.noPrint}`}>
        <div className={r.excelBrandGroup}>
          <div className={r.excelBadge}>
            <span className={r.excelIcon}>📊</span>
            <span className={r.excelExt}>XLS</span>
          </div>
          <div>
            <h1 className={r.excelTitle}>Concerns Report</h1>
            <p className={r.excelSubtitle}>
              {groupBy === 'month' ? 'Monthly summary results' : 'Daily breakdown results'} &middot; {filteredData.length} total concerns
            </p>
          </div>
        </div>

        <div className={r.excelActionGroup}>
          {/* Format / Detailed View Switcher */}
          <div className={r.toggleGroup}>
            <button
              className={`${r.toggleBtn} ${viewMode === 'format' ? r.toggleBtnActive : ''}`}
              onClick={() => setViewMode('format')}
              title="Standard summary table (Date | Pending | In Progress | Resolved | Reject | Total)"
            >
              📊 Summary Table
            </button>
            <button
              className={`${r.toggleBtn} ${viewMode === 'detail' ? r.toggleBtnActive : ''}`}
              onClick={() => setViewMode('detail')}
              title="Individual concern records"
            >
              📋 Detailed Records
            </button>
          </div>

          <button className={r.btnExport} onClick={exportToCSV} title="Download CSV in exact table format">
            <span className={r.btnIcon}>📥</span>
            <span>Export CSV</span>
          </button>
          <button className={r.btnPrint} onClick={() => window.print()} title="Print or Save as PDF">
            <span className={r.btnIcon}>🖨️</span>
            <span>Print Report</span>
          </button>
          <button className={r.btnRefresh} onClick={fetchReports} title="Reload records">
            <span className={r.btnIcon}>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className={`${r.filterToolbar} ${s.noPrint}`}>
        <div className={r.filterDropdownGroup}>
          {/* Display Mode (Month / Day) */}
          <div className={r.filterItem}>
            <label className={r.filterLabel}>Display by:</label>
            <div className={r.toggleGroup}>
              <button
                className={`${r.toggleBtn} ${groupBy === 'month' ? r.toggleBtnActive : ''}`}
                onClick={() => setGroupBy('month')}
              >
                📅 Month
              </button>
              <button
                className={`${r.toggleBtn} ${groupBy === 'day' ? r.toggleBtnActive : ''}`}
                onClick={() => setGroupBy('day')}
              >
                📆 Day
              </button>
            </div>
          </div>

          {/* Year Filter */}
          <div className={r.filterItem}>
            <label className={r.filterLabel}>Year:</label>
            <select
              className={r.filterSelect}
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className={r.filterItem}>
            <label className={r.filterLabel}>Month:</label>
            <select
              className={r.filterSelect}
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className={r.filterItem}>
            <label className={r.filterLabel}>Priority:</label>
            <select
              className={r.filterSelect}
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className={r.filterItem}>
            <label className={r.filterLabel}>Category:</label>
            <select
              className={r.filterSelect}
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Barangay */}
          <div className={r.filterItem}>
            <label className={r.filterLabel}>Barangay:</label>
            <select
              className={r.filterSelect}
              value={barangayFilter}
              onChange={(e) => {
                setBarangayFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {barangayOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button className={r.resetBtn} onClick={resetFilters} title="Reset all filters">
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Grid Container ── */}
      <div className={r.gridContainer}>
        {loading ? (
          <div className={r.loadingState}>
            <span className={r.loadingSpinner}>⏳</span>
            <span>Loading records...</span>
          </div>
        ) : viewMode === 'format' ? (
          /* ══════════════════════════════════════════════════════════════
             THE EXACT FORMAT REQUESTED BY THE USER:
             Date | Pending | In Progress | Resolved | Reject | Total
             ══════════════════════════════════════════════════════════════ */
          <div className={r.tableWrapper}>
            <table className={r.excelFormatTable}>
              <thead>
                <tr className={r.excelFormatHeader}>
                  <th style={{ width: '30%', textAlign: 'left', paddingLeft: 24 }}>Date</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>Pending</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>In Progress</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>Resolved</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>Reject</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
                      No matching records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  <>
                    {aggregatedRows.map((row) => {
                      const isExpanded = expandedKey === row.key;
                      return (
                        <React.Fragment key={row.key}>
                          <tr
                            className={`${r.excelFormatRow} ${isExpanded ? r.rowActive : ''}`}
                            onClick={() => setExpandedKey(isExpanded ? null : row.key)}
                            title="Click to view/hide concern items"
                          >
                            <td style={{ fontWeight: 700, paddingLeft: 24 }}>
                              <span style={{ marginRight: 8, fontSize: 11, opacity: 0.6 }}>
                                {isExpanded ? '▼' : '▶'}
                              </span>
                              {row.label}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={row.pending > 0 ? r.cellPending : r.cellZero}>
                                {row.pending}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={row.inProgress > 0 ? r.cellInProgress : r.cellZero}>
                                {row.inProgress}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={row.resolved > 0 ? r.cellResolved : r.cellZero}>
                                {row.resolved}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={row.reject > 0 ? r.cellReject : r.cellZero}>
                                {row.reject}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={r.cellTotal}>{row.total}</span>
                            </td>
                          </tr>

                          {/* Inline Expanded Items for this Date / Month */}
                          {isExpanded && (
                            <tr className={s.noPrint}>
                              <td colSpan={6} style={{ padding: '16px 24px', background: 'var(--surface-2)' }}>
                                <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 12.5, color: 'var(--text-2)' }}>
                                  Concerns filed in {row.label} ({row.items.length}):
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {row.items.map((item) => (
                                    <div
                                      key={item.id}
                                      onClick={() => navigate(`/concerns/${item.id}`)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 14px',
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                                          #{item.id} {item.title}
                                        </span>
                                        <span style={{ color: 'var(--text-3)', fontSize: 11 }}>
                                          &middot; {item.category} &middot; {getPinBarangay(item)}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span
                                          style={{
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            background:
                                              item.status === 'Resolved'
                                                ? 'rgba(16, 185, 129, 0.15)'
                                                : item.status === 'In Progress'
                                                  ? 'rgba(59, 130, 246, 0.15)'
                                                  : item.status === 'Rejected'
                                                    ? 'rgba(239, 68, 68, 0.15)'
                                                    : 'rgba(245, 158, 11, 0.15)',
                                            color:
                                              item.status === 'Resolved'
                                                ? '#059669'
                                                : item.status === 'In Progress'
                                                  ? '#2563eb'
                                                  : item.status === 'Rejected'
                                                    ? '#dc2626'
                                                    : '#d97706',
                                          }}
                                        >
                                          {item.status}
                                        </span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Open ↗</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Detailed records view */
          <div className={r.tableWrapper}>
            <table className={r.excelTable}>
              <thead>
                <tr className={r.headerRow}>
                  <th className={r.thIndex}>#</th>
                  <th className={r.thSortable} onClick={() => setSortField('created_at')}>
                    <span>Date Reported</span>
                  </th>
                  <th className={r.thSortable} onClick={() => setSortField('title')}>
                    <span>Concern Title</span>
                  </th>
                  <th className={r.th}>Category</th>
                  <th className={r.th}>Barangay</th>
                  <th className={r.th}>Priority</th>
                  <th className={r.th}>Status</th>
                  <th className={r.th}>Reporter</th>
                  <th className={`${r.thAction} ${s.noPrint}`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={`${r.excelRow} ${selectedRowId === c.id ? r.rowSelected : ''}`}
                    onClick={() => setSelectedRowId(c.id)}
                  >
                    <td className={r.rowIndexCell}>
                      {pageSize === 'All' ? idx + 1 : (safeCurrentPage - 1) * effectivePageSize + idx + 1}
                    </td>
                    <td className={r.dateCell}>{fmtDateShort(c.created_at)}</td>
                    <td className={r.titleCell}>
                      <span className={r.cellTextClamp}>{c.title || 'Untitled'}</span>
                    </td>
                    <td className={r.categoryCell}>{c.category || 'General'}</td>
                    <td className={r.brgyCell}>
                      <span className={r.brgyTag}>{getPinBarangay(c)}</span>
                    </td>
                    <td className={r.priorityCell}>{c.priority || 'Medium'}</td>
                    <td className={r.statusCell}>{c.status || 'Pending'}</td>
                    <td className={r.reporterCell}>{c.user_name || 'Anonymous'}</td>
                    <td className={`${r.actionCell} ${s.noPrint}`}>
                      <button
                        className={r.btnViewRecord}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/concerns/${c.id}`);
                        }}
                      >
                        Open ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Official Print Certification / Signature Block ── */}
      <div className={`${s.printOnly} ${r.printCertification}`}>
        <div className={r.certCol}>
          <div className={r.certLabel}>Prepared by:</div>
          <div className={r.certLine}></div>
          <div className={r.certName}>System Administrator</div>
          <div className={r.certSub}>CitiVoice Kabankalan MIS</div>
        </div>
        <div className={r.certCol}>
          <div className={r.certLabel}>Verified by:</div>
          <div className={r.certLine}></div>
          <div className={r.certName}>Public Information & Concerns Office</div>
          <div className={r.certSub}>City Government of Kabankalan</div>
        </div>
        <div className={r.certCol}>
          <div className={r.certLabel}>Noted by:</div>
          <div className={r.certLine}></div>
          <div className={r.certName}>Office of the City Mayor</div>
          <div className={r.certSub}>Kabankalan City, Negros Occidental</div>
        </div>
      </div>
    </div>
  );
}
