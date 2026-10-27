import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../utils/responsive';

export default function InAppNotification({ notification, onDismiss, onPress }) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef(null);

  const topPadding = Platform.OS === 'ios'
    ? Math.max(insets.top, 14) + 6
    : (insets.top || 10) + 6;

  // Determine notification type & visual accent
  const { iconName, iconColor, iconBg } = useMemo(() => {
    if (!notification) {
      return { iconName: 'notifications', iconColor: colors.primary, iconBg: colors.primaryGlow };
    }
    const combined = `${notification.title || ''} ${notification.message || ''}`.toLowerCase();

    if (combined.includes('resolved') || combined.includes('approved') || combined.includes('success')) {
      return {
        iconName: 'checkmark-circle',
        iconColor: '#10B981',
        iconBg: 'rgba(16, 185, 129, 0.16)',
      };
    }
    if (combined.includes('in progress') || combined.includes('progress') || combined.includes('assigned')) {
      return {
        iconName: 'sync-circle',
        iconColor: '#3B82F6',
        iconBg: 'rgba(59, 130, 246, 0.16)',
      };
    }
    if (combined.includes('reject') || combined.includes('hazard') || combined.includes('alert') || combined.includes('warning')) {
      return {
        iconName: 'alert-circle',
        iconColor: '#EF4444',
        iconBg: 'rgba(239, 68, 68, 0.16)',
      };
    }
    if (combined.includes('comment') || combined.includes('reply') || combined.includes('message')) {
      return {
        iconName: 'chatbubble-ellipses',
        iconColor: '#8B5CF6',
        iconBg: 'rgba(139, 92, 246, 0.16)',
      };
    }

    return {
      iconName: 'notifications',
      iconColor: colors.primary,
      iconBg: colors.primaryGlow || 'rgba(245, 158, 11, 0.18)',
    };
  }, [notification, colors]);

  const triggerDismiss = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -160,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  useEffect(() => {
    if (notification) {
      // Gentle haptic feedback on arrival
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Slide in smoothly with subtle spring
      translateY.setValue(-160);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 4.5s
      dismissTimer.current = setTimeout(() => {
        triggerDismiss();
      }, 4500);
    } else {
      triggerDismiss();
    }

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [notification]);

  // Natural swipe-up to dismiss gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return gesture.dy < -5;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -25 || gesture.vy < -0.4) {
          triggerDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  if (!notification) return null;

  const isDark = theme === 'dark';

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        S.wrapper,
        {
          paddingTop: topPadding,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          if (onPress) onPress(notification);
          else triggerDismiss();
        }}
        style={[
          S.card,
          {
            backgroundColor: isDark ? '#111D30' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
          },
        ]}
      >
        {/* Left Icon Badge */}
        <View style={[S.iconBadge, { backgroundColor: iconBg }]}>
          <Ionicons name={iconName} size={rf(18)} color={iconColor} />
        </View>

        {/* Content */}
        <View style={S.content}>
          <View style={S.headerRow}>
            <Text style={[S.appName, { color: colors.primary }]}>CITIVOICE</Text>
            <View style={[S.dot, { backgroundColor: colors.textMuted }]} />
            <Text style={[S.timeText, { color: colors.textMuted }]}>Just now</Text>
          </View>

          <Text
            style={[S.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>

          {notification.message ? (
            <Text
              style={[S.message, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {notification.message}
            </Text>
          ) : null}
        </View>

        {/* Minimal Dismiss Button */}
        <TouchableOpacity
          onPress={triggerDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={S.closeBtn}
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons name="close" size={rf(15)} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const S = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingHorizontal: scale(12),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(11),
    paddingHorizontal: scale(13),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 9,
  },
  iconBadge: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(11),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(11),
  },
  content: {
    flex: 1,
    paddingRight: scale(6),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(2),
  },
  appName: {
    fontSize: rf(9.5),
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: scale(5),
    opacity: 0.7,
  },
  timeText: {
    fontSize: rf(10),
    fontWeight: '500',
  },
  title: {
    fontSize: rf(12.5),
    fontWeight: '700',
    letterSpacing: 0.1,
    marginBottom: 1,
  },
  message: {
    fontSize: rf(11.5),
    lineHeight: rf(15),
    fontWeight: '400',
  },
  closeBtn: {
    padding: scale(4),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(2),
  },
});
