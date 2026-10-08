import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { scale, verticalScale, rf } from '../utils/responsive';
import * as Haptics from 'expo-haptics';

export default function NetworkBanner() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const {
    isOffline,
    justReconnected,
    isChecking,
    bannerDismissed,
    setBannerDismissed,
    checkConnection,
  } = useNetwork();

  const slideAnim = useRef(new Animated.Value(-120)).current;

  const isVisible = (isOffline && !bannerDismissed) || justReconnected;

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  if (!isVisible) return null;

  const isReconnectedMode = justReconnected && !isOffline;

  const handleCheck = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await checkConnection();
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBannerDismissed(true);
  };

  const topPadding = Platform.OS === 'ios' ? Math.max(insets.top, 24) : insets.top || 12;

  return (
    <Animated.View
      style={[
        S.wrapper,
        {
          paddingTop: topPadding,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          S.container,
          isReconnectedMode
            ? { backgroundColor: '#059669', borderColor: '#10B981' }
            : { backgroundColor: '#B45309', borderColor: '#F59E0B' },
        ]}
      >
        {/* Left Icon */}
        <View style={S.iconBox}>
          <Ionicons
            name={isReconnectedMode ? 'checkmark-circle' : 'cloud-offline'}
            size={rf(18)}
            color="#FFFFFF"
          />
        </View>

        {/* Text info */}
        <View style={S.textBox}>
          <Text style={S.title} numberOfLines={1}>
            {isReconnectedMode
              ? t('backOnline') || 'Back Online'
              : t('noInternetConnection') || 'No Internet Connection'}
          </Text>
          <Text style={S.subtitle} numberOfLines={1}>
            {isReconnectedMode
              ? t('backOnlineNotice') || 'Internet connection restored.'
              : t('offlineModeActive') || 'Offline mode • Reports will sync when reconnected.'}
          </Text>
        </View>

        {/* Actions */}
        {!isReconnectedMode && (
          <View style={S.actionsRow}>
            <TouchableOpacity
              style={S.checkBtn}
              onPress={handleCheck}
              disabled={isChecking}
              activeOpacity={0.8}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={S.checkBtnText}>{t('checkConnection') || 'Check'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={S.closeBtn}
              onPress={handleDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={rf(16)} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingBottom: verticalScale(6),
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconBox: {
    marginRight: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBox: {
    flex: 1,
    paddingRight: scale(8),
  },
  title: {
    fontSize: rf(12),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: rf(10.5),
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  checkBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(4),
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: scale(50),
  },
  checkBtnText: {
    fontSize: rf(11),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: scale(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
