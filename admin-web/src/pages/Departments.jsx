import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  IoBuildOutline,
  IoFlashOutline,
  IoWaterOutline,
  IoTrashBinOutline,
  IoShieldOutline,
  IoGridOutline,
  IoBusinessOutline,
  IoPeopleOutline,
  IoAlertCircleOutline,
  IoAddOutline,
  IoPencilOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import styles from '../styles/Departments.module.css';
import s from '../styles/Admin.module.css';

const DEPT_ICONS = {
  "City Engineer's Office (CEO)": {
    icon: <IoBuildOutline />,
    class: styles.iconEngineering,
  },
  'City Environment and Natural Resources Office (CENRO)': {
    icon: <IoTrashBinOutline />,
    class: styles.iconSanitation,
  },
  'Negros Occidental Electric Cooperative (NOCECO)': {
    icon: <IoFlashOutline />,
    class: styles.iconElectric,
  },
};

const CATEGORIES = [
  'Road & Infrastructure',
  'Electricity',
  'Drainage',
  'Waste & Sanitation',
];

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  email: '',
  contact_phone: '',
};

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get('/departments')
      .then(setDepartments)
      .catch((err) => console.error('Failed to load departments:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const getIconConfig = (name) => {
    return (
      DEPT_ICONS[name] || {
        icon: <IoGridOutline />,
        class: styles.iconGeneral,
      }
    );
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const saveDepartment = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Department name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || null,
        description: form.description.trim() || null,
        email: form.email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
      };

      if (editItem) {
        await api.put(`/departments/${editItem.id}`, payload);
      } else {
        await api.post('/departments', payload);
      }
      setShowForm(false);
      setEditItem(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      alert(err.message || 'An error occurred while saving the department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/departments/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete department.');
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category || '',
      description: item.description || '',
      email: item.email || '',
      contact_phone: item.contact_phone || '',
    });
    setShowForm(true);
  };

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>
            <IoPeopleOutline style={{ marginRight: 8, verticalAlign: 'middle' }} /> Departments
          </h1>
          <p className={s.pageSubtitle}>
            Manage service departments, category mappings, and view real-time workloads
          </p>
        </div>
        <button
          className={`${s.btn} ${s.btnPrimary}`}
          onClick={() => {
            setShowForm(true);
            setEditItem(null);
            setForm(EMPTY_FORM);
          }}
        >
          <IoAddOutline size={18} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Add Department
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.listCol}>
          {loading ? (
            <div className={s.loading}>Loading departments dashboard...</div>
          ) : departments.length === 0 ? (
            <div className={s.empty}>
              <div className={s.emptyIcon}>
                <IoPeopleOutline />
              </div>
              <p className={s.emptyTitle}>No departments registered</p>
              <p className={s.emptyText}>Add a new department to get started.</p>
            </div>
          ) : (
            <div className={styles.departmentsGrid}>
              {departments.map((dept) => {
                const config = getIconConfig(dept.name);
                return (
                  <div key={dept.id} className={styles.card}>
                    {/* Edit/Delete Actions */}
                    <div className={styles.cardActions}>
                      <button className={styles.actionBtn} onClick={() => openEdit(dept)}>
                        <IoPencilOutline size={14} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => setDeleteConfirm({ id: dept.id, name: dept.name })}
                      >
                        <IoTrashOutline size={14} />
                      </button>
                    </div>

                    <div>
                      <div className={styles.cardHeader}>
                        <div className={`${styles.iconWrapper} ${config.class}`}>
                          {config.icon}
                        </div>
                        <h3 className={styles.deptName}>{dept.name}</h3>
                      </div>
                      <p className={dept.description ? styles.deptDesc : `${styles.deptDesc} ${s.emptyText}`}>
                        {dept.description || 'No description provided.'}
                      </p>

                      {/* Official Contact Info */}
                      <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-2)' }}>
                        {dept.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>📧</span>
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{dept.email}</span>
                          </div>
                        )}
                        {dept.contact_phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>📞</span>
                            <span>{dept.contact_phone}</span>
                          </div>
                        )}
                      </div>

                      {dept.category && (
                        <div style={{ marginBottom: 16 }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#8899BB', marginRight: 8, fontWeight: 700 }}>AI Mapping:</span>
                          <span style={{ fontSize: 13, color: '#1A6BFF', fontWeight: 600 }}>{dept.category}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.adminsSection}>
                      <h4 className={styles.adminsTitle}>Assigned Officers</h4>
                      {dept.admins && dept.admins.length > 0 ? (
                        <div className={styles.adminsList}>
                          {dept.admins.map((admin) => (
                            <div key={admin.id} className={styles.adminRow}>
                              <div className={styles.adminInfo}>
                                <div className={styles.adminAvatar}>
                                  {getInitials(admin.name)}
                                </div>
                                <span className={styles.adminName}>{admin.name}</span>
                              </div>
                              <span className={styles.adminLoad}>
                                {admin.active_assignments} active
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.noAdmins}>
                          <IoAlertCircleOutline size={16} />
                          No active officers in this department
                        </div>
                      )}
                    </div>

                    <div className={styles.statsSection}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Active Workload</span>
                        <span
                          className={`${styles.badge} ${
                            dept.active_assignments_count > 0
                              ? styles.badgeActive
                              : styles.badgeZero
                          }`}
                        >
                          {dept.active_assignments_count} unresolved
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create/Edit Side Panel */}
        {showForm && (
          <div className={styles.formPanel}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>{editItem ? '✏️ Edit' : '➕ New'} Department</h3>
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
            <form className={styles.form} onSubmit={saveDepartment}>
              <label className={styles.label}>Department Name *</label>
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Health & Sanitation Dept"
                autoFocus
                required
              />

              <label className={styles.label}>Official Notification Email</label>
              <input
                type="email"
                className={styles.input}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="e.g. engineering@kabankalancity.gov.ph"
              />
              <small style={{ color: '#8899BB', fontSize: 11, marginTop: -4, marginBottom: 8 }}>
                Approved concerns will automatically dispatch official email notifications to this address.
              </small>

              <label className={styles.label}>Contact Phone Number</label>
              <input
                type="text"
                className={styles.input}
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                placeholder="e.g. (053) 471-2000"
              />

              <label className={styles.label}>AI Auto-Routing Category</label>
              <select
                className={styles.select}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">None (Manual assignment only)</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <small style={{ color: '#8899BB', fontSize: 11, marginTop: 4 }}>
                Concerns classified under this category will automatically route to this department.
              </small>

              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe this department's municipal responsibilities..."
              />

              <button
                className={styles.saveBtn}
                style={{ opacity: saving ? 0.6 : 1 }}
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : editItem ? 'Update Department' : 'Create Department'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div className={styles.dialogIcon}>⚠️</div>
            <h3 className={styles.dialogTitle}>Delete Department</h3>
            <p className={styles.dialogText}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? 
              This action cannot be undone. Active assignments routed here will lose their department association.
            </p>
            <div className={styles.dialogButtons}>
              <button
                className={styles.dialogCancel}
                onClick={() => setDeleteConfirm(null)}
              >
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
