import { StatusBar } from "expo-status-bar";
import { LanguageProvider } from "./src/context/LanguageContext";
import { AuthProvider } from "./src/context/AuthContext";
import { ConcernProvider } from "./src/context/ConcernContext";
import { NotificationProvider } from "./src/context/NotificationContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { NetworkProvider } from "./src/context/NetworkContext";

import { RootSiblingParent } from 'react-native-root-siblings';

// ── Root component ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <RootSiblingParent>
      <ThemeProvider>
        <NetworkProvider>
          <AppContent />
        </NetworkProvider>
      </ThemeProvider>
    </RootSiblingParent>
  );
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <ConcernProvider>
              <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
              <AppNavigator />
            </ConcernProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
