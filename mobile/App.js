import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { LanguageProvider } from "./src/context/LanguageContext";
import { AuthProvider } from "./src/context/AuthContext";
import { ConcernProvider } from "./src/context/ConcernContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import AppNavigator from "./src/navigation/AppNavigator";

// ── Root component ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <ConcernProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </ConcernProvider>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
