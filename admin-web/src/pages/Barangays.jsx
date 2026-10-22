import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtDateShort, resolveImageUrl, getCategoryConfig } from '../services/api';
import {
  IoBusinessOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoAddOutline,
} from 'react-icons/io5';
import styles from '../styles/Barangays.module.css';
import s from '../styles/Admin.module.css';

const EMPTY = { name: '' };

const STATUS_COLORS = {
  Pending: { bg: 'rgba(245, 158, 11, 0.14)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  'In Progress': { bg: 'rgba(59, 130, 246, 0.14)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
  Resolved: { bg: 'rgba(16, 185, 129, 0.14)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  Rejected: { bg: 'rgba(239, 68, 68, 0.14)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
};

const PRIORITY_COLORS = {
  High: { bg: 'rgba(239, 68, 68, 0.14)', text: '#EF4444' },
  Medium: { bg: 'rgba(245, 158, 11, 0.14)', text: '#F59E0B' },
  Low: { bg: 'rgba(16, 185, 129, 0.14)', text: '#10B981' },
};

export default function Barangays() {
  const navigate = useNavigate();
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');

  // Selected barangay concerns modal state
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [barangayConcerns, setBarangayConcerns] = useState([]);
  const [concernsLoading, setConcernsLoading] = useState(false);
  const [modalFilter, setModalFilter] = useState('');
  const [modalStatus, setModalStatus] = useState('All');

  const load = () =>
    api
      .get('/barangays')
      .then(setBarangays)
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const saveBarangay = async () => {
    if (!form.name.trim()) {
      alert('Barangay name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/barangays/${editItem.id}`, { name: form.name.trim() });
      } else {
        await api.post('/barangays', { name: form.name.trim() });
      }
      setShowForm(false);
      setEditItem(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/barangays/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name });
    setShowForm(true);
  };

  const handleOpenBarangayConcerns = async (b) => {
    setSelectedBarangay(b);
    setConcernsLoading(true);
    setBarangayConcerns([]);
    setModalFilter('');
    setModalStatus('All');
    try {
      const res = await api.get(`/barangays/${b.id}/concerns`);
      setBarangayConcerns(res.concerns || []);
    } catch (err) {
      console.error('Failed to load concerns for barangay:', err);
    } finally {
      setConcernsLoading(false);
    }
  };

  const filteredBarangays = useMemo(() => {
    if (!search.trim()) return barangays;
    const q = search.toLowerCase();
    return barangays.filter((b) => (b.name || '').toLowerCase().includes(q));
  }, [barangays, search]);

  const filteredModalConcerns = useMemo(() => {
    return barangayConcerns.filter((c) => {
      const matchesStatus = modalStatus === 'All' || c.status === modalStatus;
      const q = modalFilter.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q) ||
        (c.citizen_name || '').toLowerCase().includes(q) ||
        (c.location_address || '').toLowerCase().includes(q) ||
        `#cv-${String(c.id).padStart(4, '0')}`.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [barangayConcerns, modalFilter, modalStatus]);

  return (
    <div className={s.page}>
      {/* Page Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>Barangays</h1>
          <p className={s.pageSubtitle}>
            {barangays.length} registered barangays in Kabankalan City
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Quick Filter */}
          <div className={styles.searchBox}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search barangay..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.clearBtn} onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>

          <button
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={() => {
              setShowForm(true);
              setEditItem(null);
              setForm(EMPTY);
            }}
          >
            <IoAddOutline size={18} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Add
            Barangay
          </button>
        </div>
      </div>

      <div className={`${styles.layout} ${showForm ? styles.hasForm : ''}`}>
        <div className={styles.listCol}>
          <div className={styles.tableContainer}>
            {loading ? (
              <div className={s.loading} style={{ padding: '40px 20px' }}>
                Loading barangays...
              </div>
            ) : filteredBarangays.length === 0 ? (
              <div className={s.empty} style={{ padding: '50px 20px' }}>
                <div className={s.emptyIcon}>
                  <IoBusinessOutline />
                </div>
                <p className={s.emptyTitle}>
                  {search ? 'No matching barangays found' : 'No barangays found'}
                </p>
                <p className={s.emptyText}>
                  {search
                    ? 'Try searching with a different term'
                    : 'Start by adding a new barangay to the system.'}
                </p>
              </div>
            ) : (
              <div className={styles.tableScroll}>
                <table className={s.table}>
                  <thead className={`${s.thead} ${styles.stickyThead}`}>
                    <tr>
                      <th className={`${s.th} ${styles.indexCol}`}>#</th>
                      <th className={s.th}>Barangay Name</th>
                      <th className={s.th}>Total Concerns</th>
                      <th className={s.th}>Added On</th>
                      <th className={`${s.th} ${styles.actionCol}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBarangays.map((b, idx) => {
                      const count = Number(b.concern_count || 0);
                      return (
                        <tr
                          key={b.id}
                          className={`${s.tr} ${styles.compactTr} ${styles.clickableRow}`}
                          onClick={() => handleOpenBarangayConcerns(b)}
                          title={`Click to view concerns in ${b.name}`}
                        >
                          <td className={`${s.td} ${styles.indexCell}`}>{idx + 1}</td>
                          <td className={`${s.td} ${s.tdPrimary}`}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14 }}>📍</span>
                              <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{b.name}</span>
                            </div>
                          </td>
                          <td className={s.td}>
                            <span
                              className={`${styles.concernCountPill} ${count === 0 ? styles.concernCountZero : ''}`}
                            >
                              📋 {count} {count === 1 ? 'concern' : 'concerns'}
                            </span>
                          </td>
                          <td className={s.td} style={{ color: 'var(--text-3)', fontSize: 13 }}>
                            {fmtDateShort(b.created_at)}
                          </td>
                          <td className={`${s.td} ${styles.actionCol}`} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.actions}>
                              <button
                                className={styles.editBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(b);
                                }}
                                title="Edit Barangay"
                              >
                                <IoPencilOutline size={14} />
                              </button>
                              <button
                                className={styles.deleteBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ id: b.id, name: b.name });
                                }}
                                title="Delete Barangay"
                              >
                                <IoTrashOutline size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <div className={styles.formPanel}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>{editItem ? '✏️ Edit' : '➕ New'} Barangay</h3>
              <button
                className={styles.formClose}
                onClick={() => {
                  setShowForm(false);
                  setEditItem(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className={styles.form}>
              <label className={styles.label}>Barangay Name *</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Barangay 1"
                autoFocus
              />
              <button
                className={styles.saveBtn}
                style={{ opacity: saving ? 0.6 : 1 }}
                onClick={saveBarangay}
                disabled={saving}
              >
                {saving ? 'Saving...' : editItem ? 'Update Barangay' : 'Add Barangay'}
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div className={styles.dialogIcon}>
              <IoTrashOutline />
            </div>
            <h3 className={styles.dialogTitle}>Delete this?</h3>
            <p className={styles.dialogText}>"{deleteConfirm.name}" will be permanently deleted.</p>
            <div className={styles.dialogButtons}>
              <button className={styles.dialogCancel} onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className={styles.dialogDelete}
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Concerns by Barangay Modal */}
      {selectedBarangay && (
        <div className={styles.modalOverlay} onClick={() => setSelectedBarangay(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📍</span>
                  <h2 className={styles.modalTitle}>{selectedBarangay.name}</h2>
                  <span className={styles.concernPillCount}>
                    {concernsLoading
                      ? 'Loading...'
                      : `${barangayConcerns.length} concern${barangayConcerns.length === 1 ? '' : 's'}`}
                  </span>
                </div>
                <p className={styles.modalSubtitle}>
                  Citizen concerns submitted within {selectedBarangay.name}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className={styles.viewInConcernsBtn}
                  onClick={() =>
                    navigate(`/concerns?search=${encodeURIComponent(selectedBarangay.name)}`)
                  }
                  title="Open in Concerns Management Table"
                >
                  Open in Concerns Table ↗
                </button>
                <button
                  className={styles.modalCloseBtn}
                  onClick={() => setSelectedBarangay(null)}
                  title="Close (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Filter Toolbar */}
            <div className={styles.modalToolbar}>
              <div className={styles.modalSearchBox}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Filter by title, category, citizen, or docket #..."
                  value={modalFilter}
                  onChange={(e) => setModalFilter(e.target.value)}
                  className={styles.modalSearchInput}
                />
                {modalFilter && (
                  <button className={styles.clearBtn} onClick={() => setModalFilter('')}>
                    ✕
                  </button>
                )}
              </div>

              {/* Status filter chips */}
              <div className={styles.statusChipGroup}>
                {['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'].map((st) => (
                  <button
                    key={st}
                    className={`${styles.statusChip} ${modalStatus === st ? styles.statusChipActive : ''}`}
                    onClick={() => setModalStatus(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Concerns */}
            <div className={styles.modalBody}>
              {concernsLoading ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
                  Loading concerns for {selectedBarangay.name}...
                </div>
              ) : filteredModalConcerns.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <h3 style={{ margin: '0 0 6px', color: 'var(--text-1)' }}>No concerns found</h3>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 13 }}>
                    {barangayConcerns.length === 0
                      ? `There are no concerns reported in ${selectedBarangay.name} yet.`
                      : 'No concerns match your search or filter.'}
                  </p>
                </div>
              ) : (
                <div className={styles.concernList}>
                  {filteredModalConcerns.map((c) => (
                    <div
                      key={c.id}
                      className={styles.concernCard}
                      onClick={() => navigate(`/concerns/${c.id}`)}
                      title="Click to view details"
                    >
                      {/* Thumbnail */}
                      <div className={styles.concernThumbWrap}>
                        {c.image_url ? (
                          <img
                            src={resolveImageUrl(c.image_url)}
                            alt={c.title}
                            className={styles.concernThumb}
                          />
                        ) : (
                          <div className={styles.concernThumbFallback}>📷</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className={styles.concernInfo}>
                        <div className={styles.concernTopRow}>
                          <span className={styles.concernDocket}>
                            #CV-{String(c.id).padStart(4, '0')}
                          </span>
                          <span
                            className={styles.concernStatusBadge}
                            style={{
                              backgroundColor:
                                STATUS_COLORS[c.status]?.bg || 'rgba(255,255,255,0.08)',
                              color: STATUS_COLORS[c.status]?.text || 'var(--text-1)',
                              border: `1px solid ${STATUS_COLORS[c.status]?.border || 'transparent'}`,
                            }}
                          >
                            {c.status}
                          </span>
                          <span
                            className={styles.concernPriorityBadge}
                            style={{
                              backgroundColor: PRIORITY_COLORS[c.priority]?.bg || 'transparent',
                              color: PRIORITY_COLORS[c.priority]?.text || 'var(--text-3)',
                            }}
                          >
                            {c.priority} Priority
                          </span>
                          <span className={styles.concernDate}>{fmtDateShort(c.created_at)}</span>
                        </div>

                        <h4 className={styles.concernCardTitle}>{c.title}</h4>

                        <div className={styles.concernMetaRow}>
                          {(() => {
                            const catCfg = getCategoryConfig(c.category);
                            return (
                              <span
                                className={styles.concernCategoryTag}
                                style={{
                                  backgroundColor: catCfg.bg,
                                  color: catCfg.color,
                                  borderColor: catCfg.border,
                                  fontWeight: 600,
                                }}
                              >
                                {catCfg.icon} {c.category || 'General'}
                              </span>
                            );
                          })()}
                          {c.citizen_name && (
                            <span className={styles.concernCitizenTag}>👤 {c.citizen_name}</span>
                          )}
                          {c.location_address && (
                            <span className={styles.concernAddressTag} title={c.location_address}>
                              📍 {c.location_address}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className={styles.concernActionCol}>
                        <button
                          className={styles.reviewConcernBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/concerns/${c.id}`);
                          }}
                        >
                          Review →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Showing {filteredModalConcerns.length} of {barangayConcerns.length} total concern
                {barangayConcerns.length === 1 ? '' : 's'}
              </span>
              <button
                className={styles.dialogCancel}
                style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={() => setSelectedBarangay(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
