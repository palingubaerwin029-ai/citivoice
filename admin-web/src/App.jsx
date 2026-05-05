import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./services/api";

import Sidebar                from "./components/Sidebar";
import Dashboard              from "./pages/Dashboard";
import Concerns               from "./pages/Concerns";
import ConcernDetail          from "./pages/ConcernDetail";
import MapView                from "./pages/MapView";
import Users                  from "./pages/Users";
import Reports                from "./pages/Reports";
import Login                  from "./pages/Login";
import Verification           from "./pages/Verification";
import Barangays              from "./pages/Barangays";

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme]     = useState(localStorage.getItem("cv_theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("cv_theme", theme);
  }, [theme]);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("cv_token");
    const saved = localStorage.getItem("cv_user");
    if (token && saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate token still works
        api.get("/auth/me")
          .then((u) => {
            if (u.role === "admin") { setUser(u); }
            else { localStorage.clear(); }
          })
          .catch(() => { localStorage.removeItem("cv_token"); localStorage.removeItem("cv_user"); })
          .finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem("cv_token", token);
    localStorage.setItem("cv_user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("cv_token");
    localStorage.removeItem("cv_user");
    setUser(null);
  };

  if (loading) return <LoadingScreen />;
  if (!user)   return <Login onLogin={handleLogin} />;

  return (
    <BrowserRouter>
      <div style={styles.layout}>
        <Sidebar user={user} onLogout={handleLogout} theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
        <main style={styles.main}>
          <Routes>
            <Route path="/"                element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard"       element={<Dashboard />} />
            <Route path="/concerns"        element={<Concerns />} />
            <Route path="/concerns/:id"    element={<ConcernDetail />} />
            <Route path="/map"             element={<MapView />} />
            <Route path="/verification"    element={<Verification />} />
            <Route path="/users"           element={<Users />} />
            <Route path="/reports"         element={<Reports />} />
            <Route path="/barangays"       element={<Barangays />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function LoadingScreen() {
  return (
    <div style={styles.loading}>
      <div style={styles.loadingLogo}>
        <span style={{ fontSize: 32 }}>📢</span>
      </div>
      <h2 style={{ color: "var(--text-1)", marginTop: 16 }}>CitiVoice Admin</h2>
      <p style={{ color: "var(--text-2)", marginTop: 8 }}>Loading...</p>
    </div>
  );
}

const styles = {
  layout:  { display: "flex", minHeight: "100vh", backgroundColor: "var(--bg)" },
  main:    { flex: 1, overflowY: "auto", backgroundColor: "var(--bg)" },
  loading: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "100vh", backgroundColor: "var(--bg)",
  },
  loadingLogo: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: "var(--surface-2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px solid var(--border)",
  },
};
