import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { mobileApi, useAuth } from './AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NotificationContext = createContext();

export const useNotifications = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
      } catch (e) {
        token = `${e}`;
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

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
    // Initialize push notifications
    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      if (user && token) {
        // Send token to backend
        mobileApi.put(`/users/${user.id}/fcm-token`, { fcm_token: token }).catch(console.log);
      }
    });

    // Listeners for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Notification received while app is running
      fetchUnreadCount();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // User tapped the notification
      // We could navigate to the specific concern here if we had access to navigation
      fetchUnreadCount();
    });

    return () => {
      if (interval) clearInterval(interval);
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, fetchUnreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
