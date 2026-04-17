import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://10.0.2.2:5000/api";

// ── Handle incoming notifications while app is open ────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationService = {
  // ── Register device for push notifications ────────────────────────────────
  async registerForPushNotifications(userId) {
    try {
      // Must be a real device (not emulator) for push tokens
      if (!Device.isDevice) {
        console.log("Push notifications require a physical device.");
        return null;
      }

      // Request permission
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permission denied.");
        return null;
      }

      // Set Android notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("citivoice", {
          name: "CitiVoice Alerts",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#1A6BFF",
          sound: true,
        });
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: "your-expo-project-id", // Replace with your EAS project ID
      });
      const token = tokenData.data;

      // Save token to backend API
      if (userId && token) {
        const jwt = await AsyncStorage.getItem("cv_token");
        await fetch(`${BASE_URL}/users/${userId}/fcm-token`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
          body:    JSON.stringify({ fcm_token: token }),
        });
        console.log("Push token saved:", token);
      }

      return token;
    } catch (err) {
      console.log("Notification registration error:", err.message);
      return null;
    }
  },

  // ── Send local notification (for testing) ─────────────────────────────────
  async sendLocalNotification({ title, body, data = {} }) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null, // null = show immediately
    });
  },

  // ── Listen for incoming notifications ─────────────────────────────────────
  addNotificationListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  // ── Listen for notification taps ──────────────────────────────────────────
  addResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  // ── Remove a listener ─────────────────────────────────────────────────────
  removeListener(subscription) {
    Notifications.removeNotificationSubscription(subscription);
  },

  // ── Get last notification (app opened from notification) ──────────────────
  async getLastNotificationResponse() {
    return await Notifications.getLastNotificationResponseAsync();
  },
};
