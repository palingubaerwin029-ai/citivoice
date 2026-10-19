import React from 'react';
import Skeleton from './Skeleton';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SHADOWS, getStatusConfig, getCategoryConfig } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { scale, verticalScale, rf } from '../utils/responsive';

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  style,
  variant = 'primary',
  size = 'md',
}) {
  const { colors } = useTheme();
  const V = {
    primary: { bg: colors.primary, text: '#fff' },
    ghost: {
      bg: 'transparent',
      text: colors.textSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    danger: {
      bg: colors.statusRejected + '11',
      text: colors.statusRejected,
      borderWidth: 1,
      borderColor: colors.statusRejected + '22',
    },
  };
  const SZ = {
    sm: { h: verticalScale(38), fs: rf(13) },
    md: { h: verticalScale(48), fs: rf(14.5) },
    lg: { h: verticalScale(54), fs: rf(16) },
  };
  const v = V[variant] || V.primary,
    sz = SZ[size] || SZ.md;
  return (
    <TouchableOpacity
      style={[
        {
          height: sz.h,
          borderRadius: RADIUS.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: scale(8),
          paddingHorizontal: scale(20),
          backgroundColor: v.bg,
          opacity: disabled || loading ? 0.5 : 1,
          ...v,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text
          style={{
            fontSize: sz.fs,
            fontWeight: '700',
            color: v.text,
            letterSpacing: 0.2,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function InputField({ label, error, style, inputStyle, leftIcon, rightElement, ...props }) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: verticalScale(14) }, style]}>
      {label && <Text style={[S.inputLabel, { color: colors.textSecondary }]}>{label}</Text>}
      <View
        style={[
          S.inputRow,
          { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
          error && { borderColor: colors.statusRejected },
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={16}
            color={colors.textMuted}
            style={{ marginRight: scale(8) }}
          />
        )}
        <TextInput
          style={[S.input, { color: colors.textPrimary }, inputStyle]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
        {rightElement}
      </View>
      {error && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: scale(5),
            marginTop: verticalScale(5),
          }}
        >
          <Ionicons name="alert-circle" size={12} color={colors.statusRejected} />
          <Text style={{ color: colors.statusRejected, fontSize: rf(11) }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

export function StatusBadge({ status, style }) {
  const { colors } = useTheme();
  const cfg = getStatusConfig(colors)[status] || getStatusConfig(colors)['Pending'];
  return (
    <View
      style={[S.badge, { backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border }, style]}
    >
      <View
        style={{
          width: scale(5),
          height: scale(5),
          borderRadius: scale(3),
          backgroundColor: cfg.color,
        }}
      />
      <Text style={{ fontSize: rf(11), fontWeight: '600', color: cfg.color }}>
        {cfg.label || status}
      </Text>
    </View>
  );
}

export function CategoryBadge({ category, style }) {
  const { colors } = useTheme();
  const cfg = getCategoryConfig(colors)[category] || getCategoryConfig(colors)['Other'];
  return (
    <View style={[S.badge, { backgroundColor: cfg.bg }, style]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={{ fontSize: rf(11), fontWeight: '600', color: cfg.color }}>
        {cfg.label || category.split(' ')[0]}
      </Text>
    </View>
  );
}

export function StatCard({ icon, value, label, color, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[S.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, style]}
    >
      <Text style={{ fontSize: rf(20), marginBottom: verticalScale(6) }}>{icon}</Text>
      <Text
        style={{
          fontSize: rf(22),
          fontWeight: '800',
          color: color || colors.primary,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: rf(11), marginTop: verticalScale(3) }}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle, action, actionLabel }) {
  const { colors } = useTheme();
  return (
    <View style={S.empty}>
      <Text style={{ fontSize: rf(44), marginBottom: verticalScale(14), opacity: 0.65 }}>
        {icon || '📭'}
      </Text>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: rf(17),
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: rf(13),
            textAlign: 'center',
            marginTop: verticalScale(8),
            lineHeight: rf(20),
          }}
        >
          {subtitle}
        </Text>
      )}
      {action && (
        <TouchableOpacity
          style={[S.emptyAction, { backgroundColor: colors.primary }]}
          onPress={action}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: rf(14) }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export { Skeleton };

export function SectionHeader({ title, right }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(10),
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: rf(15),
          fontWeight: '700',
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

export function CustomAlertModal({
  visible,
  type = 'success', // 'success' | 'error' | 'warning' | 'info'
  title,
  message,
  primaryLabel = 'OK',
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  onClose,
}) {
  const { colors } = useTheme();

  if (!visible) return null;

  const TYPE_CONFIG = {
    success: {
      gradient: ['#10B981', '#059669'],
      ringBg: 'rgba(16, 185, 129, 0.15)',
      ringBorder: 'rgba(16, 185, 129, 0.3)',
      icon: 'checkmark-sharp',
      defaultTitle: 'Success',
    },
    error: {
      gradient: ['#EF4444', '#DC2626'],
      ringBg: 'rgba(239, 68, 68, 0.15)',
      ringBorder: 'rgba(239, 68, 68, 0.3)',
      icon: 'close-sharp',
      defaultTitle: 'Error',
    },
    warning: {
      gradient: ['#F59E0B', '#D97706'],
      ringBg: 'rgba(245, 158, 11, 0.15)',
      ringBorder: 'rgba(245, 158, 11, 0.3)',
      icon: 'warning-outline',
      defaultTitle: 'Notice',
    },
    info: {
      gradient: [colors.primary, colors.purple || '#8B5CF6'],
      ringBg: colors.primary + '1F',
      ringBorder: colors.primary + '3D',
      icon: 'information-sharp',
      defaultTitle: 'Information',
    },
  };

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose || onPrimaryPress}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(5, 10, 20, 0.78)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: scale(24),
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: scale(340),
            backgroundColor: colors.bgCard,
            borderRadius: RADIUS.xl,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: scale(22),
            paddingTop: verticalScale(26),
            paddingBottom: verticalScale(22),
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 24,
            elevation: 16,
          }}
        >
          {/* Glowing concentric icon badge */}
          <View
            style={{
              width: scale(64),
              height: scale(64),
              borderRadius: scale(32),
              backgroundColor: cfg.ringBg,
              borderWidth: 1,
              borderColor: cfg.ringBorder,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: verticalScale(14),
            }}
          >
            <LinearGradient
              colors={cfg.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: scale(46),
                height: scale(46),
                borderRadius: scale(23),
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: cfg.gradient[0],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons name={cfg.icon} size={24} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: rf(18),
              fontWeight: '800',
              textAlign: 'center',
              letterSpacing: -0.3,
            }}
          >
            {title || cfg.defaultTitle}
          </Text>

          {/* Message */}
          {message ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: rf(13.5),
                fontWeight: '500',
                textAlign: 'center',
                marginTop: verticalScale(8),
                lineHeight: rf(20),
                paddingHorizontal: scale(4),
              }}
            >
              {message}
            </Text>
          ) : null}

          {/* Action Button(s) */}
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              gap: scale(10),
              marginTop: verticalScale(22),
            }}
          >
            {secondaryLabel && (
              <TouchableOpacity
                onPress={onSecondaryPress || onClose}
                activeOpacity={0.75}
                style={{
                  flex: 1,
                  height: verticalScale(44),
                  borderRadius: RADIUS.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.bgCardAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: rf(14),
                    fontWeight: '700',
                  }}
                >
                  {secondaryLabel}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onPrimaryPress || onClose}
              activeOpacity={0.82}
              style={{
                flex: secondaryLabel ? 1.3 : 1,
                borderRadius: RADIUS.lg,
                overflow: 'hidden',
                shadowColor: cfg.gradient[0],
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <LinearGradient
                colors={cfg.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: verticalScale(44),
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: scale(16),
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: rf(14.5),
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  {primaryLabel}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  inputLabel: {
    fontSize: rf(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: verticalScale(8),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: 1,
  },
  inputRowError: {},
  input: { flex: 1, fontSize: rf(14) },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: RADIUS.lg,
    padding: scale(14),
    alignItems: 'center',
    borderWidth: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(36),
    borderRadius: RADIUS.lg,
    marginTop: verticalScale(12),
  },
  emptyAction: {
    marginTop: verticalScale(18),
    borderRadius: RADIUS.full,
    paddingHorizontal: scale(22),
    paddingVertical: verticalScale(10),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
