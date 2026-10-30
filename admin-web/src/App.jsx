import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './services/api';
import { connectSocket, disconnectSocket } from './services/socket';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Concerns from './pages/Concerns';
import ConcernDetail from './pages/ConcernDetail';
import MapView from './pages/MapView';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Verification from './pages/Verification';
import Barangays from './pages/Barangays';
import Backup from './pages/Backup';
import Account from './pages/Account';
import ToastProvider from './components/ToastProvider';
import { NotificationProvider } from './context/NotificationContext';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('cv_token');
      const saved = localStorage.getItem('cv_user');
      if (token && saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'admin' || parsed.id)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('cv_token');
    return !!token;
  });

  const [theme, setTheme] = useState(localStorage.getItem('cv_theme') || 'dark');

  const handleToggleTheme = () => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');

    const next = theme === 'dark' ? 'light' : 'dark';
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setTheme(next);
      });
    } else {
      setTheme(next);
    }

    setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 450);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cv_theme', theme);
  }, [theme]);

  // Validate session in background without blocking initial paint
  useEffect(() => {
    const token = localStorage.getItem('cv_token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Connect socket immediately
    connectSocket();

    // Silently verify token with backend
    api
      .get('/auth/me')
      .then((u) => {
        if (u && u.role === 'admin') {
          setUser(u);
          localStorage.setItem('cv_user', JSON.stringify(u));
        } else {
          localStorage.clear();
          setUser(null);
        }
      })
      .catch((err) => {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token')) {
          localStorage.removeItem('cv_token');
          localStorage.removeItem('cv_user');
          setUser(null);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('cv_token', token);
    localStorage.setItem('cv_user', JSON.stringify(userData));
    setUser(userData);
    connectSocket();
  };

  const handleUserUpdate = (updatedUser, newToken) => {
    if (newToken) {
      localStorage.setItem('cv_token', newToken);
    }
    localStorage.setItem('cv_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('cv_token');
    localStorage.removeItem('cv_user');
    setUser(null);
    disconnectSocket();
    window.location.href = '/login';
  };

  if (loading) return <LoadingScreen />;

  const isAdminUser = user && user.role === 'admin';

  return (
    <ToastProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Civic Landing Page & Mobile App Portal */}
            <Route
              path="/"
              element={
                isAdminUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Landing
                    theme={theme}
                    onThemeToggle={handleToggleTheme}
                  />
                )
              }
            />
            <Route
              path="/welcome"
              element={
                <Landing
                  theme={theme}
                  onThemeToggle={handleToggleTheme}
                />
              }
            />

            {/* Legacy Mayor routes redirect to Admin */}
            <Route path="/mayor/*" element={<Navigate to="/login" replace />} />
            <Route path="/mayor" element={<Navigate to="/login" replace />} />
            <Route path="/mayors-office" element={<Navigate to="/login" replace />} />

            {/* ⚙️ CitiVoice Administrator Console Routes */}
            <Route
              path="/login"
              element={
                isAdminUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              }
            />
            <Route
              path="/*"
              element={
                isAdminUser ? (
                  <AdminLayout
                    user={user}
                    onUserUpdate={handleUserUpdate}
                    onLogout={handleLogout}
                    theme={theme}
                    onThemeToggle={handleToggleTheme}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ToastProvider>
  );
}

function AdminLayout({ user, onUserUpdate, onLogout, theme, onThemeToggle }) {
  return (
    <div style={styles.layout}>
      <Sidebar
        user={user}
        onLogout={onLogout}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/concerns" element={<Concerns />} />
          <Route path="/concerns/:id" element={<ConcernDetail />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/verification" element={<Verification />} />
          <Route path="/users" element={<Users />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/barangays" element={<Barangays />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/account" element={<Account user={user} onUserUpdate={onUserUpdate} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={styles.loading}>
      <div style={styles.loadingLogo}>
        <span style={{ fontSize: 32 }}>📢</span>
      </div>
      <h2 style={{ color: 'var(--text-1)', marginTop: 16 }}>CitiVoice</h2>
      <p style={{ color: 'var(--text-2)', marginTop: 8 }}>Loading portal...</p>
    </div>
  );
}

const styles = {
  layout: { display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg)' },
  main: { flex: 1, height: '100vh', overflowY: 'auto', backgroundColor: 'var(--bg)' },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'var(--bg)',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'var(--surface-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border)',
  },
};
