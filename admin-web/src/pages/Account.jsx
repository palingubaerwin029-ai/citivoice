import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  IoPersonOutline,
  IoMailOutline,
  IoLockClosedOutline,
  IoShieldCheckmarkOutline,
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoCameraOutline,
  IoSaveOutline,
  IoKeyOutline,
  IoCalendarOutline,
  IoAlertCircleOutline,
  IoRefreshOutline,
  IoPersonAddOutline,
  IoPeopleOutline,
  IoTrashOutline,
  IoCloseOutline,
} from 'react-icons/io5';
import s from '../styles/Admin.module.css';
import a from '../styles/Account.module.css';
import { api, resolveImageUrl, getApiHost } from '../services/api';
import { useToast } from '../components/ToastProvider';

export default function Account({ user, onUserUpdate }) {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);
  const registerCardRef = useRef(null);

  // ── Profile Form State (Name & Email) ──────────────────────────────────────
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});

  // ── Password Form State ────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  // ── Avatar Upload State ────────────────────────────────────────────────────
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarErr, setAvatarErr] = useState(false);

  // ── Register New Admin & Admin Directory State ─────────────────────────────
  const [adminsList, setAdminsList] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirmPw, setNewAdminConfirmPw] = useState('');
  const [showNewAdminPw, setShowNewAdminPw] = useState(false);
  const [showNewAdminConfirmPw, setShowNewAdminConfirmPw] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [newAdminErrors, setNewAdminErrors] = useState({});
  const [adminToDelete, setAdminToDelete] = useState(null);
  const [deletingAdmin, setDeletingAdmin] = useState(false);

  // Sync local form when `user` prop updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatarErr(false);
    }
  }, [user]);

  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      const res = await api.get('/auth/admin/list');
      setAdminsList(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading administrators:', err);
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const isEmailChanged =
    email.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase();
  const isNameChanged = name.trim() !== (user?.name || '').trim();
  const hasProfileChanges = isNameChanged || isEmailChanged;

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AD';

  const memberSince = useMemo(() => {
    if (!user?.created_at) return 'Active Administrator';
    const d = new Date(user.created_at);
    if (isNaN(d.getTime())) return 'Active Administrator';
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [user?.created_at]);

  // ── Password Strength Helper ───────────────────────────────────────────────
  const analyzePassword = (pwStr) => {
    const pw = pwStr || '';
    const checks = {
      minLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasLower: /[a-z]/.test(pw),
      hasNumber: /\d/.test(pw),
      hasSpecial: /[^A-Za-z0-9\s]/.test(pw),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    let label = 'Weak';
    let color = 'var(--red, #ef4444)';
    if (passed === 2) {
      label = 'Fair';
      color = 'var(--amber, #f59e0b)';
    } else if (passed === 3) {
      label = 'Good';
      color = '#eab308';
    } else if (passed === 4) {
      label = 'Strong';
      color = 'var(--blue, #3b82f6)';
    } else if (passed === 5) {
      label = 'Excellent';
      color = 'var(--green, #10b981)';
    }
    return {
      checks,
      passed,
      percent: pw.length === 0 ? 0 : (passed / 5) * 100,
      label: pw.length === 0 ? '' : label,
      color,
    };
  };

  const passwordStrength = useMemo(() => analyzePassword(newPassword), [newPassword]);
  const newAdminPwStrength = useMemo(
    () => analyzePassword(newAdminPassword),
    [newAdminPassword]
  );

  // ── Handle Avatar Upload ───────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const token = localStorage.getItem('cv_token');
      const res = await fetch(`${getApiHost()}/api/users/${user.id}/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload profile photo.');
      }
      if (onUserUpdate) onUserUpdate(data);
      setAvatarErr(false);
      fetchAdmins();
      addToast('Administrator profile photo updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Could not upload profile photo.', 'error');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Handle Profile (Name & Email) Save ─────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (isEmailChanged && !emailCurrentPassword) {
      errs.emailCurrentPassword =
        'Enter your current password to confirm changing your email address.';
    }

    setProfileErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingProfile(true);
    try {
      const payload = {
        name: cleanName,
        email: cleanEmail,
      };
      if (isEmailChanged) {
        payload.currentPassword = emailCurrentPassword;
      }

      const res = await api.put('/auth/admin/account', payload);
      if (res?.user && onUserUpdate) {
        onUserUpdate(res.user, res.token);
      }
      setEmailCurrentPassword('');
      setProfileErrors({});
      fetchAdmins();
      addToast(res?.message || 'Account profile updated successfully.', 'success');
    } catch (err) {
      const msg = err.message || 'Failed to update profile.';
      if (msg.toLowerCase().includes('password')) {
        setProfileErrors({ emailCurrentPassword: msg });
      } else if (msg.toLowerCase().includes('email')) {
        setProfileErrors({ email: msg });
      } else {
        setProfileErrors({ general: msg });
      }
      addToast(msg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Handle Password Update ─────────────────────────────────────────────────
  const handleSavePassword = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!currentPassword) {
      errs.currentPassword = 'Current password is required.';
    }
    if (!newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'New password must be at least 8 characters long.';
    } else if (newPassword === currentPassword) {
      errs.newPassword = 'New password must be different from your current password.';
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'Please confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setPwErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSavingPassword(true);
    try {
      const res = await api.put('/auth/admin/account', {
        name: user?.name,
        email: user?.email,
        currentPassword,
        newPassword,
      });

      if (res?.user && onUserUpdate) {
        onUserUpdate(res.user, res.token);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwErrors({});
      addToast('Your administrator password has been updated.', 'success');
    } catch (err) {
      const msg = err.message || 'Failed to update password.';
      if (msg.toLowerCase().includes('current password')) {
        setPwErrors({ currentPassword: msg });
      } else {
        setPwErrors({ newPassword: msg });
      }
      addToast(msg, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Handle Register New Administrator ──────────────────────────────────────
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    const errs = {};
    const cleanName = newAdminName.trim();
    const cleanEmail = newAdminEmail.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      errs.name = 'Name must be at least 2 characters.';
    }
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!newAdminPassword) {
      errs.password = 'Password is required.';
    } else if (newAdminPassword.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }
    if (!newAdminConfirmPw) {
      errs.confirmPassword = 'Please confirm the password.';
    } else if (newAdminPassword !== newAdminConfirmPw) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setNewAdminErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCreatingAdmin(true);
    try {
      const res = await api.post('/auth/admin/create', {
        name: cleanName,
        email: cleanEmail,
        password: newAdminPassword,
      });

      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminConfirmPw('');
      setNewAdminErrors({});
      fetchAdmins();
      addToast(
        res?.message || `Administrator "${cleanName}" registered successfully.`,
        'success'
      );
    } catch (err) {
      const msg = err.message || 'Failed to register new administrator.';
      if (msg.toLowerCase().includes('email')) {
        setNewAdminErrors({ email: msg });
      } else if (msg.toLowerCase().includes('name')) {
        setNewAdminErrors({ name: msg });
      } else {
        setNewAdminErrors({ password: msg });
      }
      addToast(msg, 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // ── Handle Delete Administrator ────────────────────────────────────────────
  const handleConfirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    setDeletingAdmin(true);
    try {
      const res = await api.delete(`/auth/admin/${adminToDelete.id}`);
      addToast(
        res?.message || `Administrator "${adminToDelete.name}" removed.`,
        'success'
      );
      setAdminToDelete(null);
      fetchAdmins();
    } catch (err) {
      addToast(err.message || 'Failed to remove administrator.', 'error');
    } finally {
      setDeletingAdmin(false);
    }
  };

  return (
    <div className={s.page}>
      {/* Page Header */}
      <div className={s.pageHeader}>
        <div className={s.pageTitleGroup}>
          <h1 className={s.pageTitle}>Account Management</h1>
          <p className={s.pageSubtitle}>
            Manage your administrator profile, password, and register new administrator accounts
          </p>
        </div>
        <button
          type="button"
          className={`${a.btn} ${a.btnPrimary}`}
          onClick={() =>
            registerCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          <IoPersonAddOutline size={16} />
          Register New Admin
        </button>
      </div>

      <div className={a.grid}>
        {/* ── Left Column: Administrator Profile Summary Card ── */}
        <div className={a.profileCard}>
          <div className={a.profileBanner} />
          <div className={a.profileBody}>
            <div className={a.avatarWrap}>
              <div className={a.avatarCircle}>
                {user?.avatar_url && !avatarErr ? (
                  <img
                    src={resolveImageUrl(user.avatar_url)}
                    alt={user?.name || 'Admin'}
                    className={a.avatarImg}
                    onError={() => setAvatarErr(true)}
                  />
                ) : (
                  initials
                )}
              </div>
              <button
                type="button"
                className={a.avatarUploadBtn}
                title="Change profile photo"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                <IoCameraOutline size={15} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>

            <div className={a.profileName}>{user?.name || 'Administrator'}</div>
            <div className={a.profileEmail}>{user?.email}</div>
            <div className={a.rolePill}>
              <IoShieldCheckmarkOutline size={14} />
              System Administrator
            </div>

            <div className={a.metaList}>
              <div className={a.metaItem}>
                <span className={a.metaLabel}>
                  <IoShieldCheckmarkOutline size={15} />
                  Two-Factor Auth (2FA)
                </span>
                <span className={a.metaValue} style={{ color: 'var(--green, #10b981)' }}>
                  ● Active (Email OTP)
                </span>
              </div>
              <div className={a.metaItem}>
                <span className={a.metaLabel}>
                  <IoCalendarOutline size={15} />
                  Account Created
                </span>
                <span className={a.metaValue}>{memberSince}</span>
              </div>
              <div className={a.metaItem}>
                <span className={a.metaLabel}>
                  <IoPeopleOutline size={15} />
                  Total Admins
                </span>
                <span className={a.metaValue}>{adminsList.length || 1} Active</span>
              </div>
            </div>

            <div className={a.securityCallout}>
              <IoShieldCheckmarkOutline className={a.securityCalloutIcon} />
              <div>
                <div className={a.securityCalloutTitle}>2FA Email Protection</div>
                <div className={a.securityCalloutText}>
                  Every login to the CitiVoice Admin Console sends a 6-digit security code to{' '}
                  <strong>{user?.email}</strong>. Make sure your email is active and accessible.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Profile, Password & Admin Registration Forms ── */}
        <div className={a.formsStack}>
          {/* 1. Profile & Email Settings */}
          <form className={a.sectionCard} onSubmit={handleSaveProfile}>
            <div className={a.sectionHeader}>
              <div className={a.sectionHeaderLeft}>
                <div
                  className={a.sectionIcon}
                  style={{
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: 'var(--blue)',
                  }}
                >
                  <IoPersonOutline />
                </div>
                <div>
                  <div className={a.sectionTitle}>Profile & Email Information</div>
                  <div className={a.sectionSubtitle}>
                    Update your display name and the email address used for sign-in and 2FA codes
                  </div>
                </div>
              </div>
            </div>

            <div className={a.sectionBody}>
              <div className={a.formGrid}>
                {/* Full Name */}
                <div className={a.fieldGroup}>
                  <label className={a.fieldLabel} htmlFor="admin-name">
                    <span>Full Name</span>
                  </label>
                  <div className={a.inputWrap}>
                    <span className={a.inputIcon}>
                      <IoPersonOutline />
                    </span>
                    <input
                      id="admin-name"
                      type="text"
                      className={`${a.input} ${profileErrors.name ? a.inputError : ''}`}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (profileErrors.name) {
                          setProfileErrors((prev) => ({ ...prev, name: null }));
                        }
                      }}
                      placeholder="Enter administrator name"
                    />
                  </div>
                  {profileErrors.name ? (
                    <div className={a.fieldError}>
                      <IoAlertCircleOutline size={14} />
                      {profileErrors.name}
                    </div>
                  ) : (
                    <div className={a.fieldHint}>
                      Displayed on official municipal responses, comments, and audit logs.
                    </div>
                  )}
                </div>

                {/* Email Address */}
                <div className={a.fieldGroup}>
                  <label className={a.fieldLabel} htmlFor="admin-email">
                    <span>Email Address</span>
                  </label>
                  <div className={a.inputWrap}>
                    <span className={a.inputIcon}>
                      <IoMailOutline />
                    </span>
                    <input
                      id="admin-email"
                      type="email"
                      className={`${a.input} ${profileErrors.email ? a.inputError : ''}`}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (profileErrors.email) {
                          setProfileErrors((prev) => ({ ...prev, email: null }));
                        }
                      }}
                      placeholder="admin@citivoice.gov.ph"
                    />
                  </div>
                  {profileErrors.email ? (
                    <div className={a.fieldError}>
                      <IoAlertCircleOutline size={14} />
                      {profileErrors.email}
                    </div>
                  ) : (
                    <div className={a.fieldHint}>
                      Used for administrator login and 6-digit 2FA OTP verification codes.
                    </div>
                  )}
                </div>
              </div>

              {/* Require Current Password if Email is modified */}
              {isEmailChanged && (
                <div
                  className={a.fieldGroup}
                  style={{
                    marginTop: 4,
                    padding: '14px 16px',
                    borderRadius: 'var(--r-md)',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.28)',
                  }}
                >
                  <label className={a.fieldLabel} htmlFor="admin-email-current-pw">
                    <span style={{ color: 'var(--amber, #f59e0b)' }}>
                      Confirm Current Password to Change Email
                    </span>
                  </label>
                  <div className={a.inputWrap}>
                    <span className={a.inputIcon}>
                      <IoLockClosedOutline />
                    </span>
                    <input
                      id="admin-email-current-pw"
                      type={showEmailPw ? 'text' : 'password'}
                      className={`${a.input} ${
                        profileErrors.emailCurrentPassword ? a.inputError : ''
                      }`}
                      value={emailCurrentPassword}
                      onChange={(e) => {
                        setEmailCurrentPassword(e.target.value);
                        if (profileErrors.emailCurrentPassword) {
                          setProfileErrors((prev) => ({
                            ...prev,
                            emailCurrentPassword: null,
                          }));
                        }
                      }}
                      placeholder="Enter your current password to authorize email change"
                    />
                    <button
                      type="button"
                      className={a.eyeBtn}
                      onClick={() => setShowEmailPw((v) => !v)}
                    >
                      {showEmailPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                    </button>
                  </div>
                  {profileErrors.emailCurrentPassword && (
                    <div className={a.fieldError}>
                      <IoAlertCircleOutline size={14} />
                      {profileErrors.emailCurrentPassword}
                    </div>
                  )}
                </div>
              )}

              <div className={a.actionsRow}>
                {hasProfileChanges && (
                  <button
                    type="button"
                    className={`${a.btn} ${a.btnGhost}`}
                    disabled={savingProfile}
                    onClick={() => {
                      setName(user?.name || '');
                      setEmail(user?.email || '');
                      setEmailCurrentPassword('');
                      setProfileErrors({});
                    }}
                  >
                    <IoRefreshOutline size={15} />
                    Reset
                  </button>
                )}
                <button
                  type="submit"
                  className={`${a.btn} ${a.btnPrimary}`}
                  disabled={!hasProfileChanges || savingProfile}
                >
                  <IoSaveOutline size={16} />
                  {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </div>
          </form>

          {/* 2. Change Password Section */}
          <form className={a.sectionCard} onSubmit={handleSavePassword}>
            <div className={a.sectionHeader}>
              <div className={a.sectionHeaderLeft}>
                <div
                  className={a.sectionIcon}
                  style={{
                    background: 'rgba(139, 92, 246, 0.14)',
                    color: '#8b5cf6',
                  }}
                >
                  <IoKeyOutline />
                </div>
                <div>
                  <div className={a.sectionTitle}>Change Password</div>
                  <div className={a.sectionSubtitle}>
                    Update your password regularly to keep the municipal console secure
                  </div>
                </div>
              </div>
            </div>

            <div className={a.sectionBody}>
              {/* Current Password */}
              <div className={a.fieldGroup}>
                <label className={a.fieldLabel} htmlFor="admin-current-pw">
                  <span>Current Password</span>
                </label>
                <div className={a.inputWrap}>
                  <span className={a.inputIcon}>
                    <IoLockClosedOutline />
                  </span>
                  <input
                    id="admin-current-pw"
                    type={showCurrentPw ? 'text' : 'password'}
                    className={`${a.input} ${pwErrors.currentPassword ? a.inputError : ''}`}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (pwErrors.currentPassword) {
                        setPwErrors((prev) => ({ ...prev, currentPassword: null }));
                      }
                    }}
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    className={a.eyeBtn}
                    onClick={() => setShowCurrentPw((v) => !v)}
                  >
                    {showCurrentPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                  </button>
                </div>
                {pwErrors.currentPassword && (
                  <div className={a.fieldError}>
                    <IoAlertCircleOutline size={14} />
                    {pwErrors.currentPassword}
                  </div>
                )}
              </div>

              <div className={a.formGrid}>
                {/* New Password */}
                <div className={a.fieldGroup}>
                  <label className={a.fieldLabel} htmlFor="admin-new-pw">
                    <span>New Password</span>
                  </label>
                  <div className={a.inputWrap}>
                    <span className={a.inputIcon}>
                      <IoKeyOutline />
                    </span>
                    <input
                      id="admin-new-pw"
                      type={showNewPw ? 'text' : 'password'}
                      className={`${a.input} ${pwErrors.newPassword ? a.inputError : ''}`}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (pwErrors.newPassword) {
                          setPwErrors((prev) => ({ ...prev, newPassword: null }));
                        }
                      }}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className={a.eyeBtn}
                      onClick={() => setShowNewPw((v) => !v)}
                    >
                      {showNewPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                    </button>
                  </div>
                  {pwErrors.newPassword && (
                    <div className={a.fieldError}>
                      <IoAlertCircleOutline size={14} />
                      {pwErrors.newPassword}
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className={a.fieldGroup}>
                  <label className={a.fieldLabel} htmlFor="admin-confirm-pw">
                    <span>Confirm New Password</span>
                  </label>
                  <div className={a.inputWrap}>
                    <span className={a.inputIcon}>
                      <IoKeyOutline />
                    </span>
                    <input
                      id="admin-confirm-pw"
                      type={showConfirmPw ? 'text' : 'password'}
                      className={`${a.input} ${pwErrors.confirmPassword ? a.inputError : ''}`}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (pwErrors.confirmPassword) {
                          setPwErrors((prev) => ({ ...prev, confirmPassword: null }));
                        }
                      }}
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      className={a.eyeBtn}
                      onClick={() => setShowConfirmPw((v) => !v)}
                    >
                      {showConfirmPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                    </button>
                  </div>
                  {pwErrors.confirmPassword ? (
                    <div className={a.fieldError}>
                      <IoAlertCircleOutline size={14} />
                      {pwErrors.confirmPassword}
                    </div>
                  ) : (
                    confirmPassword.length > 0 &&
                    newPassword === confirmPassword && (
                      <div
                        className={a.fieldHint}
                        style={{
                          color: 'var(--green, #10b981)',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <IoCheckmarkCircle size={14} /> Passwords match
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div className={a.strengthBox}>
                  <div className={a.strengthBarHeader}>
                    <span style={{ color: 'var(--text-2)' }}>Password Strength</span>
                    <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                  </div>
                  <div className={a.strengthTrack}>
                    <div
                      className={a.strengthFill}
                      style={{
                        width: `${passwordStrength.percent}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                  <div className={a.reqGrid}>
                    {[
                      { key: 'minLength', label: '8+ characters' },
                      { key: 'hasUpper', label: 'Uppercase letter (A-Z)' },
                      { key: 'hasLower', label: 'Lowercase letter (a-z)' },
                      { key: 'hasNumber', label: 'Number (0-9)' },
                      { key: 'hasSpecial', label: 'Symbol (!@#$...)' },
                    ].map((req) => {
                      const met = passwordStrength.checks[req.key];
                      return (
                        <div
                          key={req.key}
                          className={`${a.reqItem} ${met ? a.reqMet : ''}`}
                        >
                          {met ? (
                            <IoCheckmarkCircle size={14} />
                          ) : (
                            <IoEllipseOutline size={14} />
                          )}
                          <span>{req.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={a.actionsRow} style={{ marginTop: 18 }}>
                {(currentPassword || newPassword || confirmPassword) && (
                  <button
                    type="button"
                    className={`${a.btn} ${a.btnGhost}`}
                    disabled={savingPassword}
                    onClick={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPwErrors({});
                    }}
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  className={`${a.btn} ${a.btnPrimary}`}
                  disabled={
                    !currentPassword || !newPassword || !confirmPassword || savingPassword
                  }
                >
                  <IoLockClosedOutline size={15} />
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </div>
          </form>

          {/* 3. Register New Administrator & Administrator Directory */}
          <div className={a.sectionCard} ref={registerCardRef}>
            <div className={a.sectionHeader}>
              <div className={a.sectionHeaderLeft}>
                <div
                  className={a.sectionIcon}
                  style={{
                    background: 'rgba(16, 185, 129, 0.14)',
                    color: 'var(--green, #10b981)',
                  }}
                >
                  <IoPersonAddOutline />
                </div>
                <div>
                  <div className={a.sectionTitle}>Register New Administrator</div>
                  <div className={a.sectionSubtitle}>
                    Create a new administrator account with full console access and 2FA email login
                  </div>
                </div>
              </div>
            </div>

            <div className={a.sectionBody}>
              <form onSubmit={handleCreateAdmin}>
                <div className={a.formGrid}>
                  {/* New Admin Full Name */}
                  <div className={a.fieldGroup}>
                    <label className={a.fieldLabel} htmlFor="new-admin-name">
                      <span>Administrator Full Name</span>
                    </label>
                    <div className={a.inputWrap}>
                      <span className={a.inputIcon}>
                        <IoPersonOutline />
                      </span>
                      <input
                        id="new-admin-name"
                        type="text"
                        className={`${a.input} ${newAdminErrors.name ? a.inputError : ''}`}
                        value={newAdminName}
                        onChange={(e) => {
                          setNewAdminName(e.target.value);
                          if (newAdminErrors.name) {
                            setNewAdminErrors((prev) => ({ ...prev, name: null }));
                          }
                        }}
                        placeholder="e.g. Juan Dela Cruz"
                      />
                    </div>
                    {newAdminErrors.name ? (
                      <div className={a.fieldError}>
                        <IoAlertCircleOutline size={14} />
                        {newAdminErrors.name}
                      </div>
                    ) : (
                      <div className={a.fieldHint}>
                        Full name of the city official or system administrator.
                      </div>
                    )}
                  </div>

                  {/* New Admin Email Address */}
                  <div className={a.fieldGroup}>
                    <label className={a.fieldLabel} htmlFor="new-admin-email">
                      <span>Email Address (for Login & 2FA OTP)</span>
                    </label>
                    <div className={a.inputWrap}>
                      <span className={a.inputIcon}>
                        <IoMailOutline />
                      </span>
                      <input
                        id="new-admin-email"
                        type="email"
                        className={`${a.input} ${newAdminErrors.email ? a.inputError : ''}`}
                        value={newAdminEmail}
                        onChange={(e) => {
                          setNewAdminEmail(e.target.value);
                          if (newAdminErrors.email) {
                            setNewAdminErrors((prev) => ({ ...prev, email: null }));
                          }
                        }}
                        placeholder="official@gmail.com"
                      />
                    </div>
                    {newAdminErrors.email ? (
                      <div className={a.fieldError}>
                        <IoAlertCircleOutline size={14} />
                        {newAdminErrors.email}
                      </div>
                    ) : (
                      <div className={a.fieldHint}>
                        Must be an active email inbox to receive 6-digit 2FA login codes.
                      </div>
                    )}
                  </div>
                </div>

                <div className={a.formGrid}>
                  {/* Initial Password */}
                  <div className={a.fieldGroup}>
                    <label className={a.fieldLabel} htmlFor="new-admin-pw">
                      <span>Initial Password</span>
                    </label>
                    <div className={a.inputWrap}>
                      <span className={a.inputIcon}>
                        <IoLockClosedOutline />
                      </span>
                      <input
                        id="new-admin-pw"
                        type={showNewAdminPw ? 'text' : 'password'}
                        className={`${a.input} ${newAdminErrors.password ? a.inputError : ''}`}
                        value={newAdminPassword}
                        onChange={(e) => {
                          setNewAdminPassword(e.target.value);
                          if (newAdminErrors.password) {
                            setNewAdminErrors((prev) => ({ ...prev, password: null }));
                          }
                        }}
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        className={a.eyeBtn}
                        onClick={() => setShowNewAdminPw((v) => !v)}
                      >
                        {showNewAdminPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                      </button>
                    </div>
                    {newAdminErrors.password && (
                      <div className={a.fieldError}>
                        <IoAlertCircleOutline size={14} />
                        {newAdminErrors.password}
                      </div>
                    )}
                  </div>

                  {/* Confirm Initial Password */}
                  <div className={a.fieldGroup}>
                    <label className={a.fieldLabel} htmlFor="new-admin-confirm-pw">
                      <span>Confirm Password</span>
                    </label>
                    <div className={a.inputWrap}>
                      <span className={a.inputIcon}>
                        <IoLockClosedOutline />
                      </span>
                      <input
                        id="new-admin-confirm-pw"
                        type={showNewAdminConfirmPw ? 'text' : 'password'}
                        className={`${a.input} ${
                          newAdminErrors.confirmPassword ? a.inputError : ''
                        }`}
                        value={newAdminConfirmPw}
                        onChange={(e) => {
                          setNewAdminConfirmPw(e.target.value);
                          if (newAdminErrors.confirmPassword) {
                            setNewAdminErrors((prev) => ({
                              ...prev,
                              confirmPassword: null,
                            }));
                          }
                        }}
                        placeholder="Re-enter password"
                      />
                      <button
                        type="button"
                        className={a.eyeBtn}
                        onClick={() => setShowNewAdminConfirmPw((v) => !v)}
                      >
                        {showNewAdminConfirmPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                      </button>
                    </div>
                    {newAdminErrors.confirmPassword ? (
                      <div className={a.fieldError}>
                        <IoAlertCircleOutline size={14} />
                        {newAdminErrors.confirmPassword}
                      </div>
                    ) : (
                      newAdminConfirmPw.length > 0 &&
                      newAdminPassword === newAdminConfirmPw && (
                        <div
                          className={a.fieldHint}
                          style={{
                            color: 'var(--green, #10b981)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          <IoCheckmarkCircle size={14} /> Passwords match
                        </div>
                      )
                    )}
                  </div>
                </div>

                {newAdminPassword.length > 0 && (
                  <div className={a.strengthBox} style={{ marginBottom: 14 }}>
                    <div className={a.strengthBarHeader}>
                      <span style={{ color: 'var(--text-2)' }}>Password Strength</span>
                      <span style={{ color: newAdminPwStrength.color }}>
                        {newAdminPwStrength.label}
                      </span>
                    </div>
                    <div className={a.strengthTrack} style={{ marginBottom: 0 }}>
                      <div
                        className={a.strengthFill}
                        style={{
                          width: `${newAdminPwStrength.percent}%`,
                          backgroundColor: newAdminPwStrength.color,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className={a.actionsRow}>
                  {(newAdminName ||
                    newAdminEmail ||
                    newAdminPassword ||
                    newAdminConfirmPw) && (
                    <button
                      type="button"
                      className={`${a.btn} ${a.btnGhost}`}
                      disabled={creatingAdmin}
                      onClick={() => {
                        setNewAdminName('');
                        setNewAdminEmail('');
                        setNewAdminPassword('');
                        setNewAdminConfirmPw('');
                        setNewAdminErrors({});
                      }}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`${a.btn} ${a.btnPrimary}`}
                    disabled={
                      !newAdminName.trim() ||
                      !newAdminEmail.trim() ||
                      !newAdminPassword ||
                      !newAdminConfirmPw ||
                      creatingAdmin
                    }
                  >
                    <IoPersonAddOutline size={16} />
                    {creatingAdmin ? 'Registering Admin...' : 'Register New Admin'}
                  </button>
                </div>
              </form>

              {/* Active Administrator Accounts Directory */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>
                    Registered Administrators ({adminsList.length})
                  </div>
                </div>

                {loadingAdmins ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '8px 0' }}>
                    Loading administrators...
                  </div>
                ) : (
                  <div className={a.adminList}>
                    {adminsList.map((adm) => {
                      const isSelf = Number(adm.id) === Number(user?.id);
                      const admInitials =
                        adm.name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) || 'AD';
                      return (
                        <div key={adm.id} className={a.adminRow}>
                          <div className={a.adminRowLeft}>
                            <div className={a.adminAvatar}>
                              {adm.avatar_url ? (
                                <img
                                  src={resolveImageUrl(adm.avatar_url)}
                                  alt={adm.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                admInitials
                              )}
                            </div>
                            <div className={a.adminInfo}>
                              <div className={a.adminNameRow}>
                                <span className={a.adminName}>{adm.name}</span>
                                {isSelf && <span className={a.youBadge}>You</span>}
                              </div>
                              <div className={a.adminEmail}>{adm.email}</div>
                            </div>
                          </div>

                          <div className={a.adminRowRight}>
                            <span className={a.mfaBadge}>
                              <IoShieldCheckmarkOutline size={13} />
                              2FA Enabled
                            </span>
                            {!isSelf && adminsList.length > 1 && (
                              <button
                                type="button"
                                className={`${a.btn} ${a.btnDanger}`}
                                style={{ padding: '6px 12px', fontSize: 12 }}
                                onClick={() => setAdminToDelete(adm)}
                                title="Remove Administrator"
                              >
                                <IoTrashOutline size={14} />
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Remove Administrator Modal */}
      {adminToDelete && (
        <div className={s.overlay} onClick={() => !deletingAdmin && setAdminToDelete(null)}>
          <div
            className={s.modal}
            onClick={(e) => e.stopPropagation()}
            style={{ width: 420, maxWidth: '92vw' }}
          >
            <div
              className={s.modalTitle}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>Remove Administrator</span>
              <button
                type="button"
                onClick={() => setAdminToDelete(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                <IoCloseOutline />
              </button>
            </div>
            <div className={s.modalBody}>
              Are you sure you want to remove administrator access for{' '}
              <strong style={{ color: 'var(--text-1)' }}>{adminToDelete.name}</strong> (
              {adminToDelete.email})?
              <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
                This account will no longer be able to sign in to the CitiVoice Admin Console.
              </p>
            </div>
            <div className={s.modalActions}>
              <button
                type="button"
                className={`${a.btn} ${a.btnGhost}`}
                disabled={deletingAdmin}
                onClick={() => setAdminToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${a.btn} ${a.btnDanger}`}
                disabled={deletingAdmin}
                onClick={handleConfirmDeleteAdmin}
              >
                <IoTrashOutline size={14} />
                {deletingAdmin ? 'Removing...' : 'Yes, Remove Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
