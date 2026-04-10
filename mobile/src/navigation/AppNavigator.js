import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

// ── Auth screens ───────────────────────────────────────────────────────────
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/Registerscreen";

// ── Citizen screens ────────────────────────────────────────────────────────
import HomeScreen from "../screens/citizen/HomeScreen";
import SubmitConcernScreen from "../screens/citizen/SubmitConcernScreen";
import ConcernDetailScreen from "../screens/citizen/Concerndetailscreen";
import MyConcernsScreen from "../screens/citizen/Myconcernsscreen";
import MapScreen from "../screens/citizen/Mapscreen";
import ProfileScreen from "../screens/citizen/Profilescreen";
import EventsScreen from "../screens/citizen/Eventsscreen";

// ── Admin screens ──────────────────────────────────────────────────────────
import AdminDashboardScreen from "../screens/admin/Admindashboardscreen";
import AdminConcernsScreen from "../screens/admin/Adminconcernsscreen";
import AdminConcernDetailScreen from "../screens/admin/Adminconcerndetailscreen";
import AdminProfileScreen from "../screens/admin/Adminprofilescreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HEADER = {
  headerStyle: { backgroundColor: "#112240" },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700" },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: "#0A1628" },
};

const TAB_BAR = {
  tabBarStyle: {
    backgroundColor: "#112240",
    borderTopColor: "#1E3355",
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
};

// ── Auth Stack ─────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
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
        options={{ title: "Concern Detail" }}
      />
      <Stack.Screen
        name="SubmitConcern"
        component={SubmitConcernScreen}
        options={{ title: "Report a Concern" }}
      />
    </Stack.Navigator>
  );
}

// ── Citizen Tabs ───────────────────────────────────────────────────────────
function CitizenTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...TAB_BAR,
        headerStyle: { backgroundColor: "#112240" },
        headerTintColor: "#fff",
        headerShadowVisible: false,
        tabBarActiveTintColor: "#1A6BFF",
        tabBarInactiveTintColor: "#4A5A7A",
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
        options={{ headerShown: false, tabBarLabel: "Feed" }}
      />
      <Tab.Screen
        name="Events"
        component={EventsScreen}
        options={{ headerShown: false, tabBarLabel: "Events" }}
      />
      <Tab.Screen
        name="MyConcerns"
        component={MyConcernsScreen}
        options={{ title: "My Reports", tabBarLabel: "My Reports" }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: "Map", tabBarLabel: "Map", headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          headerShown: false,
        }}
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...TAB_BAR,
        headerStyle: { backgroundColor: "#112240" },
        headerTintColor: "#fff",
        headerShadowVisible: false,
        tabBarActiveTintColor: "#00D4AA",
        tabBarInactiveTintColor: "#4A5A7A",
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
        options={{ headerShown: false, tabBarLabel: "Dashboard" }}
      />
      <Tab.Screen
        name="AdminConcerns"
        component={AdminConcernsScreen}
        options={{ title: "Concerns", tabBarLabel: "Concerns" }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{ title: "Profile", tabBarLabel: "Profile" }}
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
          backgroundColor: "#0A1628",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#1A6BFF" size="large" />
        <Text style={{ color: "#8899BB", marginTop: 12, fontSize: 14 }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : user.role === "admin" ? (
        <AdminTabs />
      ) : (
        <CitizenTabs />
      )}
    </NavigationContainer>
  );
}
