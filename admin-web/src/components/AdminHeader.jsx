import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IoSunnyOutline,
  IoMoonOutline,
  IoMegaphoneOutline,
  IoChevronForwardOutline,
} from 'react-icons/io5';
import NotificationBell from './NotificationBell';
import { socket } from '../services/socket';
import { resolveImageUrl } from '../services/api';
import s from '../styles/AdminHeader.module.css';

const ROUTE_LABELS = {
  '/dashboard': 'Dashboard Overview',
  '/concerns': 'Concerns Management',
  '/verification': 'Identity Verification',
  '/users': 'Citizens & Personnel',
  '/barangays': 'Barangay Registry',
  '/map': 'Geospatial Map View',
  '/reports': 'Analytical Reports',
  '/backup': 'System Backup & Export',
};

export default function AdminHeader({ user, theme, onThemeToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    setSocketConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const getPageLabel = () => {
    const path = location.pathname;
    if (path.startsWith('/concerns/')) {
      return 'Concern Investigation';
    }
    return ROUTE_LABELS[path] || 'Admin Console';
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AD';

  return (
    <header className={s.topbar}>
      {/* Breadcrumb & Live Socket Status */}
      <div className={s.leftSection}>
        <div className={s.breadcrumb}>
          <span>CitiVoice</span>
          <IoChevronForwardOutline size={12} color="var(--text-3)" />
          <span className={s.breadcrumbCurrent}>{getPageLabel()}</span>
        </div>

        <div className={s.liveIndicator} title={socketConnected ? 'Connected to real-time event stream' : 'Reconnecting to server...'}>
          <span
            className={s.liveDot}
            style={{
              background: socketConnected ? 'var(--green)' : 'var(--amber)',
              boxShadow: socketConnected ? '0 0 8px var(--green)' : '0 0 8px var(--amber)',
            }}
          />
          <span>{socketConnected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Right Actions: Quick Concerns, Notification Bell, Theme, User Pill */}
      <div className={s.rightSection}>
        {location.pathname !== '/concerns' && (
          <button
            type="button"
            className={s.quickNavBtn}
            onClick={() => navigate('/concerns')}
            title="Open Concerns Management"
          >
            <IoMegaphoneOutline size={15} />
            <span>Concerns</span>
          </button>
        )}

        {/* 🔔 The Real-time Notification Bell & Ringing System */}
        <NotificationBell />

        {/* Theme Toggle (Light / Dark) */}
        <button
          type="button"
          className={s.themeBtn}
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <IoSunnyOutline /> : <IoMoonOutline />}
        </button>

        {/* User Mini Pill */}
        <div className={s.userPill}>
          <div className={s.userAvatarMini}>
            {user?.avatar_url ? (
              <img
                src={resolveImageUrl(user.avatar_url)}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>
          <span>{user?.name?.split(' ')[0] || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
