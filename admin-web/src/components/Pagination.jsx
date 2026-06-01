import React, { useState, useEffect } from 'react';
import s from '../styles/Pagination.module.css';

/**
 * Custom hook to dynamically calculate items per page to fit the screen height.
 * @param {number} defaultItems Fallback item count
 * @param {number} rowHeight Estimated height of a single table row (px)
 * @param {number} offset Estimated height of headers, margins, and pagination (px)
 */
export function useFitPagination(defaultItems = 10, rowHeight = 55, offset = 350) {
  const [itemsPerPage, setItemsPerPage] = useState(defaultItems);

  useEffect(() => {
    const calculate = () => {
      const availableHeight = window.innerHeight - offset;
      const count = Math.max(5, Math.floor(availableHeight / rowHeight));
      setItemsPerPage(count);
    };
    calculate();
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
  }, [rowHeight, offset]);

  return [itemsPerPage, setItemsPerPage];
}

/**
 * Pagination
 *
 * Props:
 *   page            – current 1-based page number
 *   totalPages      – total number of pages
 *   onPageChange    – (newPage: number) => void
 *   totalItems      – total record count (for "Showing X–Y of Z" label)
 *   itemsPerPage    – current items-per-page value
 *   onItemsPerPage  – (n: number) => void  (optional; hides selector if absent)
 *   perPageOptions  – number[]             (default: [10, 20, 50])
 */
export default function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems = 0,
  itemsPerPage = 10,
  onItemsPerPage,
  perPageOptions = [10, 20, 50],
}) {
  if (totalPages <= 1 && totalItems <= (perPageOptions?.[0] ?? 10)) return null;

  // Build page-number array with ellipsis markers
  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (page > 4) pages.push('…left');
    const start = Math.max(2, page - 1);
    const end   = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 3) pages.push('…right');
    pages.push(totalPages);
    return pages;
  };

  const from = Math.min((page - 1) * itemsPerPage + 1, totalItems);
  const to   = Math.min(page * itemsPerPage, totalItems);

  return (
    <div className={s.pagination}>
      {/* Left: record range */}
      <span className={s.info}>
        Showing <strong>{from}–{to}</strong> of <strong>{totalItems}</strong>
      </span>

      {/* Centre: page controls */}
      <div className={s.controls}>
        <button
          className={s.btn}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          ← Prev
        </button>

        {getPages().map((p, i) =>
          typeof p === 'string' ? (
            <span key={p + i} className={s.ellipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${s.page} ${p === page ? s.pageActive : ''}`}
              onClick={() => p !== page && onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className={s.btn}
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next →
        </button>
      </div>

      {/* Right: per-page selector */}
      {onItemsPerPage && (
        <div className={s.perPage}>
          <span>Rows</span>
          <select
            className={s.perPageSelect}
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPage(Number(e.target.value));
              onPageChange(1);
            }}
          >
            {perPageOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
