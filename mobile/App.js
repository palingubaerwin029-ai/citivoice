import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { LanguageProvider } from "./src/context/LanguageContext";
import { AuthProvider } from "./src/context/AuthContext";
import { ConcernProvider } from "./src/context/ConcernContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { NotificationService } from "./src/services/notificationService";
import { useAuth } from "./src/context/AuthContext";

// ── Inner component so it can use useAuth ──────────────────────────────────
function AppInner() {
  const { user } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Register for push notifications when user logs in
    if (user?.uid) {
      NotificationService.registerForPushNotifications(user.uid);
    }

    // Listen for notifications received while app is open
    notificationListener.current = NotificationService.addNotificationListener(
      (notification) => {
        console.log(
          "Notification received:",
          notification.request.content.title,
        );
      },
    );

    // Listen for notification taps
    responseListener.current = NotificationService.addResponseListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("Notification tapped, data:", data);
        // You can navigate to a specific concern here using data.concernId
      },
    );

    return () => {
      if (notificationListener.current) {
        NotificationService.removeListener(notificationListener.current);
      }
      if (responseListener.current) {
        NotificationService.removeListener(responseListener.current);
      }
    };
  }, [user?.uid]);

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}

// ── Root component ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ConcernProvider>
          <AppInner />
        </ConcernProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
