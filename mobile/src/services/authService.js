import AsyncStorage from "@react-native-async-storage/async-storage";

import { BASE_URL } from "../context/AuthContext";

// ── Update FCM push token on the API ────────────────────────────────────────
export const AuthService = {
  async updateFcmToken(userId, fcmToken) {
    try {
      const token = await AsyncStorage.getItem("cv_token");
      const res = await fetch(`${BASE_URL}/users/${userId}/fcm-token`, {
        method:  "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fcm_token: fcmToken }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update FCM token");
      }
      return true;
    } catch (err) {
      console.log("FCM token update error:", err.message);
      return false;
    }
  },
};
