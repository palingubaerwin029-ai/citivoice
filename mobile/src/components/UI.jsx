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
  COLORS,
  RADIUS,
  SHADOWS,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
} from "../utils/theme";
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
  const V = {
    primary: { bg: COLORS.primary, text: "#fff", ...SHADOWS.button },
    ghost: {
      bg: "transparent",
      text: COLORS.textSecondary,
      borderWidth: 1,
      borderColor: COLORS.borderMd,
    },
    danger: {
      bg: "rgba(239,68,68,0.1)",
      text: COLORS.danger,
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.2)",
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
  return (
    <View style={[{ marginBottom: verticalScale(14) }, style]}>
      {label && <Text style={S.inputLabel}>{label}</Text>}
      <View style={[S.inputRow, error && S.inputRowError]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={16}
            color={COLORS.textMuted}
            style={{ marginRight: scale(8) }}
          />
        )}
        <TextInput
          style={[S.input, inputStyle]}
          placeholderTextColor={COLORS.textMuted}
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
          <Ionicons name="alert-circle" size={12} color={COLORS.danger} />
          <Text style={{ color: COLORS.danger, fontSize: rf(11) }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

export function StatusBadge({ status, style }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
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
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG["Other"];
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
  return (
    <View style={[S.statCard, style]}>
      <Text style={{ fontSize: rf(20), marginBottom: verticalScale(6) }}>{icon}</Text>
      <Text
        style={{
          fontSize: rf(22),
          fontWeight: "800",
          color: color || COLORS.primary,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text style={{ color: COLORS.textMuted, fontSize: rf(11), marginTop: verticalScale(3) }}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle, action, actionLabel }) {
  return (
    <View style={S.empty}>
      <Text style={{ fontSize: rf(44), marginBottom: verticalScale(14), opacity: 0.65 }}>
        {icon || "📭"}
      </Text>
      <Text
        style={{
          color: COLORS.textPrimary,
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
            color: COLORS.textSecondary,
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
        <TouchableOpacity style={S.emptyAction} onPress={action}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: rf(14) }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function SectionHeader({ title, right }) {
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
          color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
    fontSize: rf(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: verticalScale(8),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputRowError: { borderColor: COLORS.danger },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: rf(14) },
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
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: scale(14),
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(40),
  },
  emptyAction: {
    marginTop: verticalScale(20),
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(11),
    ...SHADOWS.button,
  },
});
