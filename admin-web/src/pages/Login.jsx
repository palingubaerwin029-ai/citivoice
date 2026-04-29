import React, { useState } from "react";
import { api } from "../services/api";
import { IoMailOutline, IoLockClosedOutline, IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";
import s from "../styles/Login.module.css";

export default function Login({ onLogin }) {
  const [email,   setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token, user } = await api.post("/auth/login", { email, password });
      if (user.role !== "admin") {
        setError("Access denied. Administrator accounts only.");
        return;
      }
      onLogin(user, token);
    } catch (err) {
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.card}>
        {/* Header */}
        <div className={s.header}>
          <div className={s.logo}>📢</div>
          <h1 className={s.title}>CitiVoice</h1>
          <p className={s.subtitle}>Kabankalan City — Admin Console</p>
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
                  type={showPw ? "text" : "password"}
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
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        </div>

        <div className={s.footer}>🔒 Restricted to authorized administrators</div>
      </div>
    </div>
  );
}
