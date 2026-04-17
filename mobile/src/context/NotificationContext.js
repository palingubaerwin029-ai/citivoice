import React, { createContext, useContext, useState, useEffect } from 'react';
import { mobileApi, useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await mobileApi.get('/notifications/unread-count');
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.log('Failed to fetch unread notification count', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll every 30 seconds for new notifications
    let interval;
    if (user) {
      interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, fetchUnreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
