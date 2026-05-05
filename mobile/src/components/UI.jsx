import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  RADIUS,
  SHADOWS,
  getStatusConfig,
  getCategoryConfig,
} from "../utils/theme";
import { useTheme } from "../context/ThemeContext";
import { scale, verticalScale, rf } from "../utils/responsive";

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  style,
  variant = "primary",
  size = "md",
}) {
  const { colors } = useTheme();
  const V = {
    primary: { bg: colors.primary, text: "#fff" },
    ghost: {
      bg: "transparent",
      text: colors.textSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    danger: {
      bg: colors.statusRejected + "11",
      text: colors.statusRejected,
      borderWidth: 1,
      borderColor: colors.statusRejected + "22",
    },
  };
  const SZ = {
    sm: { h: verticalScale(38), fs: rf(13) },
    md: { h: verticalScale(50), fs: rf(15) },
    lg: { h: verticalScale(56), fs: rf(16) },
  };
  const v = V[variant] || V.primary,
    sz = SZ[size] || SZ.md;
  return (
    <TouchableOpacity
      style={[
        {
          height: sz.h,
          borderRadius: RADIUS.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
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
            fontWeight: "600",
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

export function InputField({
  label,
  error,
  style,
  inputStyle,
  leftIcon,
  rightElement,
  ...props
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: verticalScale(14) }, style]}>
      {label && <Text style={[S.inputLabel, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[S.inputRow, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }, error && { borderColor: colors.statusRejected }]}>
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
            flexDirection: "row",
            alignItems: "center",
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
  const cfg = getStatusConfig(colors)[status] || getStatusConfig(colors)["Pending"];
  return (
    <View
      style={[
        S.badge,
        { backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border },
        style,
      ]}
    >
      <View
        style={{
          width: scale(5),
          height: scale(5),
          borderRadius: scale(3),
          backgroundColor: cfg.color,
        }}
      />
      <Text style={{ fontSize: rf(11), fontWeight: "600", color: cfg.color }}>
        {cfg.label || status}
      </Text>
    </View>
  );
}

export function CategoryBadge({ category, style }) {
  const { colors } = useTheme();
  const cfg = getCategoryConfig(colors)[category] || getCategoryConfig(colors)["Other"];
  return (
    <View style={[S.badge, { backgroundColor: cfg.bg }, style]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.color} />
      <Text style={{ fontSize: rf(11), fontWeight: "600", color: cfg.color }}>
        {cfg.label || category.split(" ")[0]}
      </Text>
    </View>
  );
}

export function StatCard({ icon, value, label, color, style }) {
  const { colors } = useTheme();
  return (
    <View style={[S.statCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, style]}>
      <Text style={{ fontSize: rf(20), marginBottom: verticalScale(6) }}>{icon}</Text>
      <Text
        style={{
          fontSize: rf(22),
          fontWeight: "800",
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
        {icon || "📭"}
      </Text>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: rf(17),
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: rf(13),
            textAlign: "center",
            marginTop: verticalScale(8),
            lineHeight: rf(20),
          }}
        >
          {subtitle}
        </Text>
      )}
      {action && (
        <TouchableOpacity style={[S.emptyAction, { backgroundColor: colors.primary }]} onPress={action}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: rf(14) }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function SectionHeader({ title, right }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: verticalScale(10),
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: rf(15),
          fontWeight: "700",
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

const S = StyleSheet.create({
  inputLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: verticalScale(8),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: 1,
  },
  inputRowError: {},
  input: { flex: 1, fontSize: rf(14) },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.full,
    alignSelf: "flex-start",
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: scale(14),
    alignItems: "center",
    borderWidth: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(40),
  },
  emptyAction: {
    marginTop: verticalScale(20),
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(11),
  },
});
