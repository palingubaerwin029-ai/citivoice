import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtDateShort, getPinBarangay, KABANKALAN_BARANGAY_COORDS } from '../services/api';
import s from '../styles/Admin.module.css';
import r from '../styles/Reports.module.css';

const STATUS_OPTIONS = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITY_OPTIONS = ['All', 'High', 'Medium', 'Low'];
const PAGE_SIZE_OPTIONS = [25, 50, 100, 'All'];

export default function Reports() {
  const navigate = useNavigate();
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [barangayFilter, setBarangayFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Pagination
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

  // Filtered concerns
  const filteredData = useMemo(() => {
    return concerns.filter((c) => {
      // Date filter
      if (startDate || endDate) {
        if (!c.created_at) return false;
        const d = new Date(c.created_at).getTime();
        if (startDate) {
          const start = new Date(startDate).setHours(0, 0, 0, 0);
          if (d < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate).setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
      }

      // Status
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;

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
  }, [concerns, startDate, endDate, statusFilter, priorityFilter, categoryFilter, barangayFilter]);

  // Sorted concerns
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
        case 'priority': {
          const rank = { High: 3, Medium: 2, Low: 1 };
          valA = rank[a.priority] || 0;
          valB = rank[b.priority] || 0;
          break;
        }
        case 'status':
          valA = (a.status || '').toLowerCase();
          valB = (b.status || '').toLowerCase();
          break;
        case 'user_name':
          valA = (a.user_name || '').toLowerCase();
          valB = (b.user_name || '').toLowerCase();
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

  // KPI Calculations
  const totalCount = sortedData.length;
  const resolvedCount = sortedData.filter((c) => c.status === 'Resolved').length;
  const inProgressCount = sortedData.filter((c) => c.status === 'In Progress').length;
  const pendingCount = sortedData.filter((c) => c.status === 'Pending').length;
  const rejectedCount = sortedData.filter((c) => c.status === 'Rejected').length;
  const highPrioCount = sortedData.filter((c) => c.priority === 'High').length;
  const resolutionRate = totalCount ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Pagination
  const effectivePageSize = pageSize === 'All' ? sortedData.length || 1 : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedData.length / effectivePageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (pageSize === 'All') return sortedData;
    const start = (safeCurrentPage - 1) * effectivePageSize;
    return sortedData.slice(start, start + effectivePageSize);
  }, [sortedData, safeCurrentPage, effectivePageSize, pageSize]);

  // Handle column header click for sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return <span className={r.sortMuted}>↕</span>;
    return sortOrder === 'asc' ? <span className={r.sortActive}>▲</span> : <span className={r.sortActive}>▼</span>;
  };

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('All');
    setPriorityFilter('All');
    setCategoryFilter('All');
    setBarangayFilter('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    statusFilter !== 'All' ||
    priorityFilter !== 'All' ||
    categoryFilter !== 'All' ||
    barangayFilter !== 'All' ||
    startDate ||
    endDate
  );

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
              <div className={r.printSystemTitle}>CITIVOICE CITIZEN CONCERNS REPORT</div>
            </div>
          </div>
          <div className={r.printMetaBlock}>
            <div className={r.printMetaBadge}>OFFICIAL CONCERNS REPORT</div>
            <div className={r.printMetaDate}>
              <strong>Generated:</strong> {new Date().toLocaleString('en-US')}
            </div>
            <div className={r.printMetaDate}>
              <strong>Records:</strong> {sortedData.length} records
            </div>
            {(startDate || endDate) && (
              <div className={r.printMetaDate}>
                <strong>Date Range:</strong> {startDate || 'Start'} to {endDate || 'Present'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Screen Header / Action Toolbar ── */}
      <div className={`${r.excelTopBar} ${s.noPrint}`}>
        <div className={r.excelBrandGroup}>
          <div>
            <h1 className={r.excelTitle}>Reports</h1>
            <p className={r.excelSubtitle}>
              Citizen concerns report &middot; {totalCount} total records
            </p>
          </div>
        </div>

        <div className={r.excelActionGroup}>
          <button className={r.btnPrint} onClick={() => window.print()} title="Print or Save as PDF">
            <span className={r.btnIcon}>🖨️</span>
            <span>Print</span>
          </button>
          <button className={r.btnRefresh} onClick={fetchReports} title="Reload records">
            <span className={r.btnIcon}>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Quick KPI Summary Ribbon (Excel Formula Style) ── */}
      <div className={`${r.summaryRibbon} ${s.noPrint}`}>
        <div className={r.ribbonCell}>
          <span className={r.ribbonLabel}>TOTAL ROWS</span>
          <span className={r.ribbonValue}>{totalCount}</span>
        </div>
        <div className={r.ribbonDivider} />
        <div className={r.ribbonCell}>
          <span className={r.ribbonLabel}>🟢 RESOLVED</span>
          <span className={`${r.ribbonValue} ${r.valSuccess}`}>{resolvedCount}</span>
        </div>
        <div className={r.ribbonDivider} />
        <div className={r.ribbonCell}>
          <span className={r.ribbonLabel}>🔵 IN PROGRESS</span>
          <span className={`${r.ribbonValue} ${r.valInfo}`}>{inProgressCount}</span>
        </div>
        <div className={r.ribbonDivider} />
        <div className={r.ribbonCell}>
          <span className={r.ribbonLabel}>🟡 PENDING</span>
          <span className={`${r.ribbonValue} ${r.valWarning}`}>{pendingCount}</span>
        </div>
        <div className={r.ribbonDivider} />
        <div className={r.ribbonCell}>
          <span className={r.ribbonLabel}>🔴 REJECTED</span>
          <span className={`${r.ribbonValue} ${r.valDanger}`}>{rejectedCount}</span>
        </div>
        <div className={r.ribbonDivider} />
        <div className={r.ribbonCell}>
          <span className={r.ribbonLabel}>⚡ HIGH PRIO</span>
          <span className={`${r.ribbonValue} ${r.valHigh}`}>{highPrioCount}</span>
        </div>
        <div className={r.ribbonDivider} />
        <div className={r.ribbonCell}>
          <span className={r.ribbonLabel}>RATE</span>
          <span className={r.ribbonValue}>{resolutionRate}%</span>
        </div>
      </div>

      {/* ── Excel Filter Toolbar ── */}
      <div className={`${r.filterToolbar} ${s.noPrint}`}>
        <div className={r.filterDropdownGroup}>
          <div className={r.filterItem}>
            <label className={r.filterLabel}>Status:</label>
            <select
              className={r.filterSelect}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

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

          <div className={r.dateRangeGroup}>
            <label className={r.filterLabel}>Date:</label>
            <input
              type="date"
              className={r.filterDate}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              title="From date"
            />
            <span className={r.dateDash}>—</span>
            <input
              type="date"
              className={r.filterDate}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              title="To date"
            />
          </div>

          {hasActiveFilters && (
            <button className={r.resetBtn} onClick={resetFilters} title="Clear all active filters">
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Excel Grid Container ── */}
      <div className={r.gridContainer}>
        {loading ? (
          <div className={r.loadingState}>
            <span className={r.loadingSpinner}>⏳</span>
            <span>Loading records...</span>
          </div>
        ) : sortedData.length === 0 ? (
          <div className={r.emptyState}>
            <div className={r.emptyIcon}>📋</div>
            <div className={r.emptyTitle}>No matching records found</div>
            <div className={r.emptySubtitle}>Try adjusting your dates or filter selections</div>
            {hasActiveFilters && (
              <button className={r.btnResetEmpty} onClick={resetFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className={r.tableWrapper}>
            <table className={r.excelTable}>
              <thead>
                {/* Main Header Row */}
                <tr className={r.headerRow}>
                  <th className={r.thIndex}>#</th>
                  <th className={r.thSortable} onClick={() => handleSort('created_at')}>
                    <span>Date Reported</span> {getSortIndicator('created_at')}
                  </th>
                  <th className={r.thSortable} onClick={() => handleSort('title')}>
                    <span>Concern Title</span> {getSortIndicator('title')}
                  </th>
                  <th className={r.th}>Description Preview</th>
                  <th className={r.thSortable} onClick={() => handleSort('category')}>
                    <span>Category</span> {getSortIndicator('category')}
                  </th>
                  <th className={r.thSortable} onClick={() => handleSort('barangay')}>
                    <span>Barangay</span> {getSortIndicator('barangay')}
                  </th>
                  <th className={r.thSortable} onClick={() => handleSort('priority')}>
                    <span>Priority</span> {getSortIndicator('priority')}
                  </th>
                  <th className={r.thSortable} onClick={() => handleSort('status')}>
                    <span>Status</span> {getSortIndicator('status')}
                  </th>
                  <th className={r.thSortable} onClick={() => handleSort('user_name')}>
                    <span>Reporter</span> {getSortIndicator('user_name')}
                  </th>
                  <th className={`${r.thAction} ${s.noPrint}`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((c, idx) => {
                  const globalRowIndex =
                    pageSize === 'All' ? idx + 1 : (safeCurrentPage - 1) * effectivePageSize + idx + 1;
                  const isSelected = selectedRowId === c.id;

                  return (
                    <tr
                      key={c.id}
                      className={`${r.excelRow} ${isSelected ? r.rowSelected : ''}`}
                      onClick={() => setSelectedRowId(c.id)}
                    >
                      {/* Excel Row Number Index */}
                      <td className={r.rowIndexCell}>{globalRowIndex}</td>

                      {/* Date Reported */}
                      <td className={r.dateCell} title={c.created_at}>
                        {fmtDateShort(c.created_at)}
                      </td>

                      {/* Title */}
                      <td className={r.titleCell} title={c.title}>
                        <span className={r.cellTextClamp}>{c.title || 'Untitled'}</span>
                      </td>

                      {/* Description */}
                      <td className={r.descCell} title={c.description}>
                        <span className={r.cellTextClamp}>{c.description || '—'}</span>
                      </td>

                      {/* Category */}
                      <td className={r.categoryCell}>
                        {c.category || 'General'}
                      </td>

                      {/* Barangay */}
                      <td className={r.brgyCell}>
                        <span className={r.brgyTag}>{getPinBarangay(c)}</span>
                      </td>

                      {/* Priority */}
                      <td className={r.priorityCell}>
                        <span
                          className={
                            c.priority === 'High'
                              ? r.prioTextHigh
                              : c.priority === 'Medium'
                                ? r.prioTextMed
                                : r.prioTextLow
                          }
                        >
                          {c.priority || 'Medium'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className={r.statusCell}>
                        <span
                          className={
                            c.status === 'Resolved'
                              ? r.statusTextResolved
                              : c.status === 'In Progress'
                                ? r.statusTextInProgress
                                : c.status === 'Rejected'
                                  ? r.statusTextRejected
                                  : r.statusTextPending
                          }
                        >
                          {c.status || 'Pending'}
                        </span>
                      </td>

                      {/* Reporter */}
                      <td className={r.reporterCell} title={c.user_name || 'Anonymous'}>
                        {c.user_name || 'Anonymous'}
                      </td>

                      {/* Action */}
                      <td className={`${r.actionCell} ${s.noPrint}`}>
                        <button
                          className={r.btnViewRecord}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/concerns/${c.id}`);
                          }}
                          title="Open Concern Details"
                        >
                          Open ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Excel Bottom Status & Pagination Bar ── */}
        {!loading && sortedData.length > 0 && (
          <div className={`${r.excelFooter} ${s.noPrint}`}>
            <div className={r.footerLeft}>
              <span className={r.recordCountText}>
                Showing <strong>{pageSize === 'All' ? 1 : (safeCurrentPage - 1) * effectivePageSize + 1}</strong> to{' '}
                <strong>
                  {pageSize === 'All'
                    ? sortedData.length
                    : Math.min(safeCurrentPage * effectivePageSize, sortedData.length)}
                </strong>{' '}
                of <strong>{sortedData.length}</strong> records
                {hasActiveFilters && ` (filtered from ${concerns.length} total)`}
              </span>
              {selectedRowId && (
                <span className={r.selectionInfo}>
                  &middot; Row selected
                </span>
              )}
            </div>

            <div className={r.footerRight}>
              <div className={r.pageSizeSelector}>
                <span className={r.pageSizeLabel}>Rows per page:</span>
                <select
                  className={r.pageSizeSelect}
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {pageSize !== 'All' && totalPages > 1 && (
                <div className={r.paginationButtons}>
                  <button
                    className={r.pgBtn}
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="First Page"
                  >
                    «
                  </button>
                  <button
                    className={r.pgBtn}
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Previous Page"
                  >
                    ‹
                  </button>
                  <span className={r.pageIndicator}>
                    Page {safeCurrentPage} of {totalPages}
                  </span>
                  <button
                    className={r.pgBtn}
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="Next Page"
                  >
                    ›
                  </button>
                  <button
                    className={r.pgBtn}
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Last Page"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
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
