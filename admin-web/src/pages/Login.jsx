import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  IoMailOutline,
  IoLockClosedOutline,
  IoEyeOutline,
  IoEyeOffOutline,
  IoShieldCheckmarkOutline,
  IoArrowBackOutline,
  IoCheckmarkCircleOutline,
} from 'react-icons/io5';
import s from '../styles/Login.module.css';

export default function Login({ onLogin }) {
  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // 2FA state
  const [mfaToken, setMfaToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 2FA Resend Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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

  // Step 1: Submit email & password
  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setFieldErrors({});

    try {
      const res = await api.post('/auth/login', { email, password });

      if (res.requires2FA) {
        setStep('2fa');
        setMfaToken(res.mfaToken);
        setMaskedEmail(res.email || email);
        setOtp('');
        setError('');
        setFieldErrors({});
        setCooldown(45);
        return;
      }

      completeLogin(res);
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

  // Step 2: Submit 6-digit 2FA code
  const handleVerify2FA = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim().replace(/\s+/g, '');
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      setFieldErrors({ otp: '6-digit code required' });
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setFieldErrors({});

    try {
      const res = await api.post('/auth/verify-admin-2fa', { mfaToken, otp: cleanOtp });
      completeLogin(res);
    } catch (err) {
      const msg = err.data?.message || err.message || 'Incorrect verification code. Please check your email.';
      setError(msg);
      setFieldErrors({ otp: msg });
    } finally {
      setLoading(false);
    }
  };

  // Resend 2FA code
  const handleResend2FA = async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError('');
    setSuccessMsg('');
    setFieldErrors({});

    try {
      const res = await api.post('/auth/resend-admin-2fa', { mfaToken });
      setSuccessMsg(res.message || 'A new 6-digit verification code has been sent to your email.');
      setCooldown(45);
    } catch (err) {
      const msg = err.data?.message || err.message || 'Failed to resend code. Please try again.';
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  // Return to email & password input
  const handleBackToCredentials = () => {
    setStep('credentials');
    setMfaToken('');
    setOtp('');
    setError('');
    setSuccessMsg('');
    setFieldErrors({});
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
          {step === 'credentials' ? (
            <>
              <div className={s.formHeader}>
                <h2 className={s.formTitle}>Sign in to your account</h2>
                <p className={s.formSubtitle}>Enter your administrator credentials to continue</p>
              </div>

              {error && <div className={s.error}>{error}</div>}

              <form onSubmit={handleSubmitCredentials} className={s.form}>
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
                  {loading ? 'Authenticating…' : 'Continue →'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: 2FA Email OTP Verification */}
              <div className={s.twoFaHeader}>
                <div className={s.twoFaIconBadge}>
                  <IoShieldCheckmarkOutline />
                </div>
                <div>
                  <h2 className={s.formTitle}>Two-Factor Authentication</h2>
                  <p className={s.formSubtitle}>Email security code verification</p>
                </div>
              </div>

              <div className={s.twoFaNotice}>
                A 6-digit security code was sent to <strong>{maskedEmail}</strong>. Enter it below to authorize this session:
              </div>

              {error && <div className={s.error}>{error}</div>}
              {successMsg && (
                <div className={s.successNotice}>
                  <IoCheckmarkCircleOutline size={18} />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleVerify2FA} className={s.form}>
                <div className={s.field}>
                  <label className={s.label}>6-Digit Security Code</label>
                  <div className={`${s.otpInputWrap} ${fieldErrors.otp ? s.inputWrapError : ''}`}>
                    <input
                      className={s.otpInput}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setOtp(val);
                        if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
                        if (error) setError('');
                      }}
                      placeholder="••••••"
                      autoFocus
                      required
                    />
                  </div>
                  {fieldErrors.otp && <span className={s.fieldErrorText}>⚠ {fieldErrors.otp}</span>}
                </div>

                <button type="submit" className={s.submit} disabled={loading || otp.length < 6}>
                  {loading ? 'Verifying Code…' : 'Verify & Sign In 🔐'}
                </button>

                <div className={s.resendRow}>
                  <button
                    type="button"
                    className={s.backBtn}
                    onClick={handleBackToCredentials}
                    disabled={loading}
                  >
                    <IoArrowBackOutline />
                    <span>Back to Password</span>
                  </button>

                  <button
                    type="button"
                    className={s.resendBtn}
                    onClick={handleResend2FA}
                    disabled={cooldown > 0 || resendLoading || loading}
                  >
                    {resendLoading
                      ? 'Sending…'
                      : cooldown > 0
                      ? `Resend in ${cooldown}s`
                      : 'Resend Code'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className={s.footer}>🔒 Protected with End-to-End Administrator 2FA</div>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Link
            to="/welcome"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 600,
              color: 'var(--blue)',
            }}
          >
            <IoArrowBackOutline />
            <span>Back to Public Portal & Mobile App Download</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
