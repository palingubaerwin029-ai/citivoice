import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

// ── Auth ───────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyIdentityScreen from '../screens/auth/VerifyIdentityScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// ── Citizen ────────────────────────────────────────────────────────────────
import HomeScreen from '../screens/citizen/HomeScreen';
import SubmitConcernScreen from '../screens/citizen/SubmitConcernScreen';
import ConcernDetailScreen from '../screens/citizen/ConcernDetailScreen';
import MyConcernsScreen from '../screens/citizen/MyConcernsScreen';
import MapScreen from '../screens/citizen/MapScreen';
import ProfileScreen from '../screens/citizen/ProfileScreen';
import NotificationsScreen from '../screens/citizen/NotificationsScreen';
import ChatScreen from '../screens/citizen/ChatScreen';

// ── Admin ──────────────────────────────────────────────────────────────────
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminConcernsScreen from '../screens/admin/AdminConcernsScreen';
import AdminConcernDetailScreen from '../screens/admin/AdminConcernDetailScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Dynamic style generators
const getHeaderOptions = (colors) => ({
  headerStyle: { backgroundColor: colors.bgCard },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700', fontSize: 16 },
  headerTitleAlign: 'left',
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bgDark },
});

const getTabBarOptions = (colors) => ({
  tabBarStyle: {
    backgroundColor: colors.bgCard,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarHideOnKeyboard: true,
});

// ── Auth Stack ─────────────────────────────────────────────────────────────
function AuthStack() {
  const { colors } = useTheme();
  const headerOptions = getHeaderOptions(colors);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen
        name="VerifyIdentity"
        component={VerifyIdentityScreen}
        options={{
          headerShown: true,
          ...headerOptions,
          title: 'Verify Identity',
        }}
      />
    </Stack.Navigator>
  );
}

// ── Citizen Home Stack ─────────────────────────────────────────────────────
function HomeStack() {
  const { colors } = useTheme();
  const headerOptions = getHeaderOptions(colors);

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Feed" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ConcernDetail"
        component={ConcernDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SubmitConcern"
        component={SubmitConcernScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// ── Citizen Tabs ───────────────────────────────────────────────────────────
function CitizenTabs() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarOptions,
        headerStyle: { backgroundColor: colors.bgCard },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            MyConcerns: focused ? 'list' : 'list-outline',
            Map: focused ? 'map' : 'map-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Feed';
          const shouldHide = ['Chat', 'ConcernDetail', 'SubmitConcern', 'Notifications'].includes(routeName);
          return {
            headerShown: false,
            tabBarLabel: t('feed'),
            tabBarStyle: shouldHide
              ? { display: 'none' }
              : {
                  backgroundColor: colors.bgCard,
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                },
          };
        }}
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
  const { colors } = useTheme();
  const headerOptions = getHeaderOptions(colors);

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
    </Stack.Navigator>
  );
}

// ── Admin Tabs ─────────────────────────────────────────────────────────────
function AdminTabs() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const tabBarOptions = getTabBarOptions(colors);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...tabBarOptions,
        tabBarActiveTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.bgCard },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 16 },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            AdminHome: focused ? 'grid' : 'grid-outline',
            AdminConcerns: focused ? 'clipboard' : 'clipboard-outline',
            AdminProfile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
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

// ── Admin Root Stack ───────────────────────────────────────────────────────
function AdminStack() {
  const { colors } = useTheme();
  const headerOptions = getHeaderOptions(colors);

  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="AdminConcernDetail"
        component={AdminConcernDetailScreen}
        options={{ title: 'Review Concern' }}
      />
    </Stack.Navigator>
  );
}

// ── Root Navigator ─────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bgDark,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>Loading…</Text>
      </View>
    );
  }

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bgDark,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {
        !user ? (
          <AuthStack /> // Not logged in
        ) : user._blocked ? (
          <AuthStack /> // Logged in but NOT verified
        ) : user.role === 'admin' ? (
          <AdminStack /> // Admin
        ) : (
          <CitizenTabs />
        ) // Verified citizen
      }
    </NavigationContainer>
  );
}
