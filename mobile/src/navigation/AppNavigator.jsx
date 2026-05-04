import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, RADIUS } from "../utils/theme";

// ── Auth ───────────────────────────────────────────────────────────────────
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import VerifyIdentityScreen from "../screens/auth/VerifyIdentityScreen";

// ── Citizen ────────────────────────────────────────────────────────────────
import HomeScreen from "../screens/citizen/HomeScreen";
import SubmitConcernScreen from "../screens/citizen/SubmitConcernScreen";
import ConcernDetailScreen from "../screens/citizen/ConcernDetailScreen";
import MyConcernsScreen from "../screens/citizen/MyConcernsScreen";
import MapScreen from "../screens/citizen/MapScreen";
import ProfileScreen from "../screens/citizen/ProfileScreen";
import EventsScreen from "../screens/citizen/EventsScreen";
import NotificationsScreen from "../screens/citizen/NotificationsScreen";

// ── Admin ──────────────────────────────────────────────────────────────────
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminConcernsScreen from "../screens/admin/AdminConcernsScreen";
import AdminConcernDetailScreen from "../screens/admin/AdminConcernDetailScreen";
import AdminProfileScreen from "../screens/admin/AdminProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HEADER = {
  headerStyle: { backgroundColor: COLORS.bgCard },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: "700", fontSize: 16 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.bgDark },
};

const TAB_BAR = {
  tabBarStyle: {
    backgroundColor: COLORS.bgCard,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.textMuted,
};

// ── Auth Stack ─────────────────────────────────────────────────────────────
// Includes VerifyIdentity so blocked users can submit their ID
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="VerifyIdentity"
        component={VerifyIdentityScreen}
        options={{
          headerShown: true,
          ...HEADER,
          title: "Verify Identity",
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}

// ── Citizen Home Stack ─────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen
        name="Feed"
        component={HomeScreen}
        options={{ title: "CitiVoice" }}
      />
      <Stack.Screen
        name="ConcernDetail"
        component={ConcernDetailScreen}
        options={{ title: "" }}
      />
      <Stack.Screen
        name="SubmitConcern"
        component={SubmitConcernScreen}
        options={{ title: "Report a Concern" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ── Citizen Tabs ───────────────────────────────────────────────────────────
function CitizenTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...TAB_BAR,
        headerStyle: { backgroundColor: COLORS.bgCard },
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? "home" : "home-outline",
            Events: focused ? "megaphone" : "megaphone-outline",
            MyConcerns: focused ? "list" : "list-outline",
            Map: focused ? "map" : "map-outline",
            Profile: focused ? "person" : "person-outline",
          };
          return (
            <Ionicons
              name={icons[route.name] || "ellipse"}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ headerShown: false, tabBarLabel: t('feed') }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ headerShown: false, tabBarLabel: t('events') }}
      />
      <Tab.Screen
        name="MyConcerns"
        component={MyConcernsScreen}
        options={{ title: t('myReports'), tabBarLabel: t('myReports') }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ headerShown: false, tabBarLabel: t('map') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false, tabBarLabel: t('profile') }}
      />
    </Tab.Navigator>
  );
}

// ── Admin Home Stack ───────────────────────────────────────────────────────
function AdminHomeStack() {
  return (
    <Stack.Navigator screenOptions={HEADER}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <Stack.Screen
        name="AdminConcernDetail"
        component={AdminConcernDetailScreen}
        options={{ title: "Review Concern" }}
      />
    </Stack.Navigator>
  );
}

// ── Admin Tabs ─────────────────────────────────────────────────────────────
function AdminTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...TAB_BAR,
        tabBarActiveTintColor: COLORS.accent,
        headerStyle: { backgroundColor: COLORS.bgCard },
        headerTintColor: COLORS.textPrimary,
        headerShadowVisible: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            AdminHome: focused ? "grid" : "grid-outline",
            AdminConcerns: focused ? "clipboard" : "clipboard-outline",
            AdminProfile: focused ? "person" : "person-outline",
          };
          return (
            <Ionicons
              name={icons[route.name] || "ellipse"}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminHomeStack}
        options={{ headerShown: false, tabBarLabel: t('dashboard') }}
      />
      <Tab.Screen
        name="AdminConcerns"
        component={AdminConcernsScreen}
        options={{ title: t('concernsNav'), tabBarLabel: t('concernsNav') }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{ title: t('profile'), tabBarLabel: t('profile') }}
      />
    </Tab.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.bgDark,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 13 }}>
          Loading…
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {
        !user ? (
          <AuthStack /> // Not logged in
        ) : user._blocked ? (
          <AuthStack /> // Logged in but NOT verified → show gate in LoginScreen
        ) : user.role === "admin" ? (
          <AdminTabs /> // Admin
        ) : (
          <CitizenTabs />
        ) // Verified citizen
      }
    </NavigationContainer>
  );
}
