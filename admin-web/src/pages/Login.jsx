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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      completeLogin(await api.post('/auth/login', { email, password }));
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
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
          <div className={s.logoWrap}>
            <img src="/logo192.png" alt="CitiVoice Logo" className={s.logoImg} />
          </div>
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
              <div className={s.inputWrap}>
                <IoMailOutline className={s.reactIcon} />
                <input
                  className={s.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@citivoice.gov.ph"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={s.field}>
              <label className={s.label}>Password</label>
              <div className={s.inputWrap}>
                <IoLockClosedOutline className={s.reactIcon} />
                <input
                  className={s.input}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" className={s.eyeBtn} onClick={() => setShowPw((p) => !p)}>
                  {showPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
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
