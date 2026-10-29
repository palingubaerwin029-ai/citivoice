import React, { useEffect } from "react";
import { StatusBar as RNStatusBar, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LanguageProvider } from "./src/context/LanguageContext";
import { AuthProvider } from "./src/context/AuthContext";
import { ConcernProvider } from "./src/context/ConcernContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { NetworkProvider } from "./src/context/NetworkContext";

// ── Root component ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <AppContent />
      </NetworkProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    RNStatusBar.setBarStyle(isDark ? "light-content" : "dark-content", true);
    if (Platform.OS === "android") {
      RNStatusBar.setBackgroundColor(colors.bgDark, true);
    }
  }, [isDark, colors.bgDark]);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <ConcernProvider>
              <AppNavigator />
              <StatusBar
                style={isDark ? "light" : "dark"}
                backgroundColor={colors.bgDark}
              />
            </ConcernProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
