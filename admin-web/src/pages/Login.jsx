import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { IoMailOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';
import s from '../styles/Login.module.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

// Load the Google Identity Services script once
const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    let script = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Failed to load Google sign-in.')));
  });

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

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

  // ── Google Sign-In: backend only accepts already-registered emails ──────
  const handleGoogleCredential = useCallback(
    async ({ credential }) => {
      setLoading(true);
      setError('');
      try {
        completeLogin(await api.post('/auth/google', { idToken: credential }));
      } catch (err) {
        const map = {
          'auth/not-registered': 'This Google account is not registered as a CitiVoice administrator.',
          'auth/invalid-google-token': 'Google sign-in failed. Please try again.',
          'auth/unverified-google-email': 'Your Google email is not verified.',
        };
        setError(map[err.message] || err.message || 'Google sign-in failed.');
      } finally {
        setLoading(false);
      }
    },
    [completeLogin],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleBtnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: document.documentElement.getAttribute('data-theme') === 'light' ? 'outline' : 'filled_black',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: googleBtnRef.current.offsetWidth || 350,
        });
      })
      .catch((e) => !cancelled && console.warn(e.message));
    return () => {
      cancelled = true;
    };
  }, [handleGoogleCredential]);

  return (
    <div className={s.page}>
      <div className={s.particles} />
      <div className={s.card}>
        {/* Header */}
        <div className={s.header}>
          <img src="/logo.png?v=3" className={s.logo} alt="CitiVoice Logo" />
          <h1 className={s.title}>CitiVoice</h1>
          <p className={s.subtitle}>Kabankalan City — Admin Console</p>
          <p className={s.description}>
            Inspired by the golden sun of our democracy and the green growth of the Bangkal tree,
            CitiVoice connects Kabankalanons to unity, progress, and sustainable civic action.
          </p>
        </div>

        {/* Form */}
        <div className={s.form}>
          <p className={s.formTitle}>Sign in to your account</p>
          <p className={s.formSubtitle}>Enter your administrator credentials to continue</p>

          {error && (
            <div className={s.error}>
              <span>⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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

          {GOOGLE_CLIENT_ID && (
            <>
              <div className={s.divider}>
                <span>or</span>
              </div>
              <div ref={googleBtnRef} className={s.googleBtn} id="google-signin-button" />
            </>
          )}
        </div>

        <div className={s.footer}>🔒 Restricted to authorized administrators</div>


      </div>
    </div>
  );
}
