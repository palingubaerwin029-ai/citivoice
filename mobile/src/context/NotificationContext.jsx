import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { mobileApi, useAuth } from './AuthContext';
import { SocketService } from '../services/socketService';
import Toast from 'react-native-root-toast';
import { navigateToConcern } from '../navigation/navigationRef';

// Remote push was removed from Expo Go on Android (SDK 53+); importing the
// module there throws. Only load it in development/production builds.
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const pushSupported = !(isExpoGo && Platform.OS === 'android');
const Notifications = pushSupported ? require('expo-notifications') : null;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

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
    if (!Notifications) return;

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

    // Poll every 30 seconds for new notifications (fallback)
    let interval;
    if (user) {
      interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);
    }

    // Real-time socket updates
    const handleNewNotification = (data) => {
      const text = `${data?.title || ''} ${data?.message || ''}`.toLowerCase();
      if (text.includes('linked') || text.includes('duplicate')) return;

      setUnreadCount((prev) => prev + 1);
      
      // Show in-app toast for socket notifications
      if (data && data.title) {
        Toast.show(`${data.title}: ${data.message}`, {
          duration: Toast.durations.LONG,
          position: Toast.positions.TOP,
          shadow: true,
          animation: true,
          hideOnPress: true,
          delay: 0,
          onPress: () => {
            const cid = data.concern_id || data.concernId;
            if (cid) {
              navigateToConcern(cid, user?.role === 'admin');
            }
          },
        });
      }
    };
    
    SocketService.on('new_notification', handleNewNotification);
    // Initialize push notifications
    registerForPushNotificationsAsync().then((token) => {
      setExpoPushToken(token);
      if (user && token) {
        // Send token to backend
        mobileApi.put(`/users/${user.id}/fcm-token`, { fcm_token: token }).catch(console.log);
      }
    });

    // Listeners for incoming notifications
    if (Notifications) {
      notificationListener.current = Notifications.addNotificationReceivedListener(() => {
        // Notification received while app is running
        fetchUnreadCount();
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        // User tapped the notification
        fetchUnreadCount();
        const pushData = response?.notification?.request?.content?.data;
        const cid = pushData?.concern_id || pushData?.concernId;
        if (cid) {
          navigateToConcern(cid, user?.role === 'admin');
        }
      });

      // Cold start handling when app was opened by tapping a notification
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          const pushData = response?.notification?.request?.content?.data;
          const cid = pushData?.concern_id || pushData?.concernId;
          if (cid) {
            setTimeout(() => {
              navigateToConcern(cid, user?.role === 'admin');
            }, 600);
          }
        }
      }).catch(() => {});
    }

    return () => {
      SocketService.off('new_notification', handleNewNotification);
      if (interval) clearInterval(interval);
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadCount, fetchUnreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
