import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
} from 'react-icons/io5';
import s from '../styles/MayorLogin.module.css';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

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

export default function MayorLogin({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const completeLogin = useCallback(
    ({ token, user }) => {
      if (user.role !== 'mayor') {
        setError(
          'Access restricted to the Office of the City Mayor. System Administrators please sign in at the Admin Console.'
        );
        return;
      }
      onLogin(user, token);
      navigate('/mayor');
    },
    [onLogin, navigate]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      completeLogin(res);
    } catch (err) {
      setError(err.message || 'Invalid executive credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = useCallback(
    async ({ credential }) => {
      setLoading(true);
      setError('');
      try {
        completeLogin(await api.post('/auth/google', { idToken: credential }));
      } catch (err) {
        setError(err.message || 'Google authentication failed.');
      } finally {
        setLoading(false);
      }
    },
    [completeLogin]
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
          theme: 'filled_black',
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
      <div className={s.ambientGlow} />

      <div className={s.card}>
        {/* Executive Header */}
        <div className={s.header}>
          <div className={s.sealWrap}>
            <span className={s.sealIcon}>🏛️</span>
          </div>
          <div className={s.nationText}>Republic of the Philippines · City of Kabankalan</div>
          <h1 className={s.title}>Office of the City Mayor</h1>
          <p className={s.subtitle}>Executive Directives & Concern Approval Desk</p>
        </div>

        {/* Login Box */}
        <div className={s.formBox}>
          <div className={s.formBadge}>
            ⚖️ Executive Access Only
          </div>

          <h2 className={s.formTitle}>Executive Sign In</h2>
          <p className={s.formSubtitle}>Sign in with your mayoral executive credentials to review and dispatch directives</p>

          {error && (
            <div className={s.error}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={s.field}>
              <label className={s.label}>Official Executive Email</label>
              <div className={s.inputWrap}>
                <IoMailOutline className={s.fieldIcon} />
                <input
                  className={s.input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mayor@kabankalancity.gov.ph"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={s.field}>
              <label className={s.label}>Security Password</label>
              <div className={s.inputWrap}>
                <IoLockClosedOutline className={s.fieldIcon} />
                <input
                  className={s.input}
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className={s.eyeBtn}
                  onClick={() => setShowPw((p) => !p)}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
            </div>

            <button type="submit" className={s.submitBtn} disabled={loading}>
              {loading ? 'Authenticating Executive...' : 'Access Executive Desk →'}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className={s.divider}>
                <span>or continue with Google</span>
              </div>
              <div ref={googleBtnRef} className={s.googleBtn} />
            </>
          )}

          <div className={s.lockNotice}>
            🔒 Official Government System · Authorized Personnel Only
          </div>
        </div>

        {/* Switch Link */}
        <div className={s.footer}>
          <Link to="/login" className={s.switchLink}>
            ⚙️ CitiVoice Administrator? Switch to Admin Console →
          </Link>
        </div>
      </div>
    </div>
  );
}
