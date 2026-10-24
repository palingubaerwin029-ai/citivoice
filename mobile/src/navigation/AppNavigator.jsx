import React from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RADIUS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { verticalScale, rf } from '../utils/responsive';
import NetworkBanner from '../components/NetworkBanner';
import { navigationRef } from './navigationRef';

// ── Auth ───────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyIdentityScreen from '../screens/auth/VerifyIdentityScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import TermsAndPolicyScreen from '../screens/auth/TermsAndPolicyScreen';

// ── Citizen ────────────────────────────────────────────────────────────────
import HomeScreen from '../screens/citizen/HomeScreen';
import SubmitConcernScreen from '../screens/citizen/SubmitConcernScreen';
import ConcernDetailScreen from '../screens/citizen/ConcernDetailScreen';
import MyConcernsScreen from '../screens/citizen/MyConcernsScreen';
import ProfileScreen from '../screens/citizen/ProfileScreen';
import NotificationsScreen from '../screens/citizen/NotificationsScreen';


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
    height: Platform.OS === 'ios' ? verticalScale(82) : verticalScale(62),
    paddingBottom: Platform.OS === 'ios' ? verticalScale(22) : verticalScale(8),
    paddingTop: verticalScale(6),
  },
  tabBarLabelStyle: { fontSize: rf(11), fontWeight: '700', marginBottom: verticalScale(2) },
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
      <Stack.Screen name="TermsAndPolicy" component={TermsAndPolicyScreen} />
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
        name="TermsAndPolicy" 
        component={TermsAndPolicyScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="MyConcerns"
        component={MyConcernsScreen}
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
            Home: focused ? 'document-text' : 'document-text-outline',
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
          const shouldHide = ['ConcernDetail', 'SubmitConcern', 'Notifications'].includes(routeName);
          return {
            headerShown: false,
            tabBarLabel: t('myReports'),
            tabBarStyle: shouldHide
              ? { display: 'none' }
              : tabBarOptions.tabBarStyle,
          };
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false, tabBarLabel: t('profile') }}
      />
    </Tab.Navigator>
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
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {
          !user ? (
            <AuthStack /> // Not logged in
          ) : user._blocked ? (
            <AuthStack /> // Logged in but NOT verified
          ) : (
            <CitizenTabs />
          ) // Verified citizen
        }
      </NavigationContainer>

      {/* Global internet connectivity banner — floats above everything */}
      <NetworkBanner />
    </View>
  );
}
