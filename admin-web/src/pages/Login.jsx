import React, { useState, useCallback } from 'react';
import { api } from '../services/api';
import { IoMailOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import s from '../styles/Login.module.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const completeLogin = useCallback(
    ({ token, user }) => {
      if (user.role !== 'admin') {
        setError('Access denied. Administrator credentials required.');
        return;
      }
      onLogin(user, token);
    },
    [onLogin],
  );

  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      completeLogin(await api.post('/auth/login', { email, password }));
    } catch (err) {
      const errKey = err.code || err.data?.error || err.message || '';
      const errField = err.field || err.data?.field;
      let msg = err.data?.message || err.message || 'Invalid email or password.';

      if (msg === 'auth/invalid-credential' || errKey === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again.';
      }

      if (errField === 'email' || errKey === 'auth/user-not-found') {
        const text = msg.startsWith('auth/') ? 'No administrator account found with this email.' : msg;
        setError(text);
        setFieldErrors({ email: text });
      } else if (errField === 'password' || errKey === 'auth/wrong-password') {
        const text = msg.startsWith('auth/') ? 'Incorrect password. Please try again.' : msg;
        setError(text);
        setFieldErrors({ password: text });
      } else {
        setError(msg);
        setFieldErrors({});
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.particles} />
      <div className={s.card}>
        {/* Header */}
        <div className={s.header}>
          <img src="/logo.png" alt="CitiVoice Logo" className={s.logo} />
          <h1 className={s.title}>CitiVoice</h1>
          <p className={s.subtitle}>Kabankalan City — Admin Console</p>
          <p className={s.sealMotto}>
            Inspired by the golden sun of our democracy and the green growth of the Bangkal tree,
            CitiVoice connects Kabankalanons to unity, progress, and sustainable civic action.
          </p>
        </div>

        {/* Form Container */}
        <div className={s.formBox}>
          <div className={s.formHeader}>
            <h2 className={s.formTitle}>Sign in to your account</h2>
            <p className={s.formSubtitle}>Enter your administrator credentials to continue</p>
          </div>

          {error && <div className={s.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={s.form}>
            <div className={s.field}>
              <label className={s.label}>Email Address</label>
              <div className={`${s.inputWrap} ${fieldErrors.email ? s.inputWrapError : ''}`}>
                <IoMailOutline className={s.reactIcon} />
                <input
                  className={s.input}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    if (error) setError('');
                  }}
                  placeholder="admin@citivoice.gov.ph"
                  autoComplete="email"
                  required
                />
              </div>
              {fieldErrors.email && <span className={s.fieldErrorText}>⚠ {fieldErrors.email}</span>}
            </div>

            <div className={s.field}>
              <label className={s.label}>Password</label>
              <div className={`${s.inputWrap} ${fieldErrors.password ? s.inputWrapError : ''}`}>
                <IoLockClosedOutline className={s.reactIcon} />
                <input
                  className={s.input}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" className={s.eyeBtn} onClick={() => setShowPw((p) => !p)}>
                  {showPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
              {fieldErrors.password && <span className={s.fieldErrorText}>⚠ {fieldErrors.password}</span>}
            </div>

            <button type="submit" className={s.submit} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <div className={s.footer}>🔒 Restricted to authorized administrators</div>
      </div>
    </div>
  );
}
