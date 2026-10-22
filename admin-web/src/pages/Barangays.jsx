import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtDateShort } from '../services/api';
import {
  IoBusinessOutline,
  IoPencilOutline,
  IoTrashOutline,
  IoAddOutline,
} from 'react-icons/io5';
import styles from '../styles/Barangays.module.css';
import s from '../styles/Admin.module.css';

const EMPTY = { name: '' };

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

  const filteredBarangays = useMemo(() => {
    if (!search.trim()) return barangays;
    const q = search.toLowerCase();
    return barangays.filter((b) => (b.name || '').toLowerCase().includes(q));
  }, [barangays, search]);

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
                          onClick={() => navigate(`/concerns?barangay=${encodeURIComponent(b.name)}`)}
                          title={`Click to view all concerns in ${b.name} in Concern Management`}
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
    </div>
  );
}
