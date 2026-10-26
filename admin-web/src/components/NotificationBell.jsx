import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoNotificationsOutline,
  IoNotifications,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoMusicalNotesOutline,
  IoCheckmarkDoneOutline,
  IoLocationOutline,
  IoChevronForwardOutline,
  IoTimeOutline,
} from 'react-icons/io5';
import { socket } from '../services/socket';
import { api, getCategoryConfig } from '../services/api';
import { playChimeSound, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { useToast } from './ToastProvider';
import s from '../styles/NotificationBell.module.css';

const STORAGE_READ_KEY = 'cv_admin_read_concerns';

export default function NotificationBell() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_READ_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [isRinging, setIsRinging] = useState(false);
  const popoverRef = useRef(null);
  const ringTimeoutRef = useRef(null);

  // Sync read IDs with localStorage
  const markAsRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(next.slice(-200)));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const combined = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(combined.slice(-200)));
      } catch {
        // ignore
      }
      return combined;
    });
  }, [notifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playChimeSound(0.5, true);
    }
  };

  const handleTestRing = () => {
    triggerRingAnimation();
    playChimeSound(0.7, true);
    addToast('🔔 Test chime played successfully!', 'success');
  };

  const triggerRingAnimation = () => {
    setIsRinging(true);
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = setTimeout(() => {
      setIsRinging(false);
    }, 2200);
  };

  // Request browser notification permission once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Initial load of latest concerns
  useEffect(() => {
    let mounted = true;
    api
      .get('/concerns', { limit: 12 })
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data?.concerns || [];
        setNotifications(list);
      })
      .catch((err) => {
        console.warn('[Notifications] Failed to fetch initial concerns:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Real-time socket listener for incoming new concerns
  useEffect(() => {
    const handleNewConcern = (concern) => {
      if (!concern || !concern.id) return;

      console.log('[NotificationBell] 🔔 New concern received:', concern.title);

      // 1. Play real-time chime sound
      playChimeSound(0.65);

      // 2. Trigger bell shake / ring animation
      triggerRingAnimation();

      // 3. Prepend to notification list
      setNotifications((prev) => {
        const filtered = prev.filter((item) => item.id !== concern.id);
        return [concern, ...filtered].slice(0, 30);
      });

      // 4. In-app floating toast with direct link
      addToast(`📢 New Concern: ${concern.title} (${concern.barangay || 'Citywide'})`, 'success', 6000);

      // 5. Native OS notification if permission granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(`New Citizen Concern: ${concern.title}`, {
            body: `${concern.category || 'Issue'} · ${concern.barangay || 'Kabankalan City'} · Priority: ${concern.priority || 'Medium'}`,
            icon: '/logo.png',
          });
          notif.onclick = () => {
            window.focus();
            navigate(`/concerns/${concern.id}`);
          };
        } catch {
          // ignore
        }
      }
    };

    socket.on('new_concern', handleNewConcern);

    return () => {
      socket.off('new_concern', handleNewConcern);
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, [addToast, navigate]);

  // Click outside listener to dismiss popover
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);

  // Compute unread count
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const handleItemClick = (concern) => {
    markAsRead(concern.id);
    setOpen(false);
    navigate(`/concerns/${concern.id}`);
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const past = new Date(dateStr);
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPriorityStyle = (priority) => {
    switch (String(priority).toLowerCase()) {
      case 'high':
        return { background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' };
      case 'medium':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' };
      case 'low':
      default:
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' };
    }
  };

  return (
    <div className={s.wrapper} ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`${s.bellBtn} ${open ? s.bellBtnOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Notifications & Alerts"
        aria-label="Notifications"
      >
        <span className={`${s.bellIcon} ${isRinging ? s.ringing : ''}`}>
          {unreadCount > 0 ? <IoNotifications /> : <IoNotificationsOutline />}
        </span>

        {/* Ringing Ripple Wave Animation */}
        {isRinging && <span className={s.ripplePulse} />}

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className={s.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className={s.popover}>
          {/* Popover Header */}
          <div className={s.header}>
            <div className={s.headerTitleRow}>
              <span className={s.headerTitle}>Notifications</span>
              {unreadCount > 0 && (
                <span className={s.headerBadge}>{unreadCount} unread</span>
              )}
            </div>

            <div className={s.headerActions}>
              {/* Test Ring Chime Button */}
              <button
                type="button"
                className={s.actionBtn}
                onClick={handleTestRing}
                title="Test Bell Ring Chime"
              >
                <IoMusicalNotesOutline />
              </button>

              {/* Mute/Unmute Chime Toggle */}
              <button
                type="button"
                className={`${s.actionBtn} ${soundOn ? s.actionBtnActive : ''}`}
                onClick={toggleSound}
                title={soundOn ? 'Mute Chime Sound' : 'Unmute Chime Sound'}
              >
                {soundOn ? <IoVolumeHighOutline /> : <IoVolumeMuteOutline />}
              </button>

              {/* Mark All as Read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  className={s.actionBtn}
                  onClick={markAllAsRead}
                  title="Mark All as Read"
                >
                  <IoCheckmarkDoneOutline />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className={s.list}>
            {notifications.length === 0 ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>🔕</div>
                <div className={s.emptyTitle}>No Concerns Reported</div>
                <div className={s.emptySub}>
                  When citizens file new reports, you will hear a chime and see them here in real-time.
                </div>
              </div>
            ) : (
              notifications.map((concern) => {
                const isUnread = !readIds.includes(concern.id);
                const catCfg = getCategoryConfig(concern.category);
                const priStyle = getPriorityStyle(concern.priority);

                return (
                  <div
                    key={concern.id}
                    className={`${s.item} ${isUnread ? s.itemUnread : ''}`}
                    onClick={() => handleItemClick(concern)}
                  >
                    {/* Category Icon */}
                    <div
                      className={s.itemIcon}
                      style={{ color: catCfg.color, borderColor: catCfg.color + '33' }}
                    >
                      {catCfg.icon}
                    </div>

                    {/* Concern Info */}
                    <div className={s.itemContent}>
                      <div className={s.itemTitleRow}>
                        <div className={s.itemTitle} title={concern.title}>
                          {concern.title}
                        </div>
                        <div className={s.itemTime}>
                          {formatTimeAgo(concern.created_at)}
                        </div>
                      </div>

                      <div className={s.itemMeta}>
                        {concern.barangay && (
                          <span className={s.metaBarangay}>
                            <IoLocationOutline size={12} />
                            {concern.barangay}
                          </span>
                        )}

                        <span className={s.priorityBadge} style={priStyle}>
                          {concern.priority || 'Medium'}
                        </span>

                        <span style={{ color: 'var(--text-3)' }}>
                          #{concern.id}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className={s.footer}>
            <button
              type="button"
              className={s.footerBtn}
              onClick={() => {
                setOpen(false);
                navigate('/concerns');
              }}
            >
              <span>View All Concerns</span>
              <IoChevronForwardOutline size={13} />
            </button>

            {notifications.length > 0 && (
              <button
                type="button"
                className={s.clearBtn}
                onClick={clearAll}
              >
                Clear list
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
