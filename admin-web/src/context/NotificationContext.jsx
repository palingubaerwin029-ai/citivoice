import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../services/socket';
import { api } from '../services/api';
import { playChimeSound, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import { useToast } from '../components/ToastProvider';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
};

const STORAGE_READ_KEY = 'cv_admin_read_concerns';

export function NotificationProvider({ children }) {
  const { addToast } = useToast();

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
  const ringTimeoutRef = useRef(null);
  const processedConcernsRef = useRef(new Set());

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

  const toggleSound = useCallback(() => {
    setSoundOn((curr) => {
      const next = !curr;
      setSoundEnabled(next);
      if (next) {
        playChimeSound(0.5, true);
      }
      return next;
    });
  }, []);

  const triggerRingAnimation = useCallback(() => {
    setIsRinging(true);
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    ringTimeoutRef.current = setTimeout(() => {
      setIsRinging(false);
    }, 2200);
  }, []);

  const handleTestRing = useCallback(() => {
    triggerRingAnimation();
    playChimeSound(0.7, true);
    addToast('🔔 Test chime played successfully!', 'success');
  }, [triggerRingAnimation, addToast]);

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
      .get('/concerns', { limit: 15 })
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : (data?.data || data?.concerns || []);
        const seen = new Set();
        const unique = [];
        for (const item of list) {
          if (item?.id && !seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        }
        setNotifications(unique);
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

      // De-duplicate: ignore if concern was already processed in the last 10 seconds
      if (processedConcernsRef.current.has(concern.id)) {
        return;
      }
      processedConcernsRef.current.add(concern.id);
      setTimeout(() => {
        processedConcernsRef.current.delete(concern.id);
      }, 10000);

      console.log('[NotificationContext] 🔔 New concern received:', concern.title);

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
            window.location.href = `/concerns/${concern.id}`;
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
  }, [addToast, triggerRingAnimation]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        readIds,
        unreadCount,
        isRinging,
        soundOn,
        toggleSound,
        triggerRingAnimation,
        handleTestRing,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
