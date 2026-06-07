import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  RADIUS,
  SHADOWS,
  getCategoryConfig,
  getStatusConfig,
} from "../utils/theme";
import { useTheme } from "../context/ThemeContext";
import { scale, verticalScale, rf } from "../utils/responsive";
import { resolveImageUrl } from "../context/AuthContext";
import * as Haptics from "expo-haptics";

export default function ConcernCard({ concern, onPress, onUpvote, isUpvoted }) {
  const { colors } = useTheme();
  
  const PRIORITY_COLORS = {
    High: { color: colors.danger, bg: colors.danger + "22" },
    Medium: { color: colors.warning, bg: colors.warning + "22" },
    Low: { color: colors.success, bg: colors.success + "22" },
  };

  const cat = getCategoryConfig(colors)[concern.category] || getCategoryConfig(colors)["Other"];
  const status = getStatusConfig(colors)[concern.status] || getStatusConfig(colors)["Pending"];
  const prio = PRIORITY_COLORS[concern.priority] || PRIORITY_COLORS["Low"];
  const isHigh = concern.priority === "High";

  const fmt = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "";

  return (
    <TouchableOpacity
      style={[S.card, { backgroundColor: colors.bgCard, borderColor: colors.border }, isHigh && { borderColor: colors.danger + '44' }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Urgent strip */}
      {isHigh && <View style={[S.urgentStrip, { backgroundColor: colors.danger }]} />}

      {/* Header row */}
      <View style={S.header}>
        {/* Category pill */}
        <View style={[S.catPill, { backgroundColor: cat.bg }]}>
          <Ionicons name={cat.icon} size={13} color={cat.color} />
          <Text style={[S.catText, { color: cat.color }]}>{cat.label}</Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Priority */}
        <View style={[S.prioBadge, { backgroundColor: prio.bg }]}>
          <Text style={[S.prioText, { color: prio.color }]}>
            {concern.priority}
          </Text>
        </View>

        {/* Date */}
        <Text style={[S.dateText, { color: colors.textMuted }]}>{fmt(concern.created_at)}</Text>
      </View>

      {/* Title */}
      <Text style={[S.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {concern.title}
      </Text>

      {/* Description */}
      <Text style={[S.desc, { color: colors.textSecondary }]} numberOfLines={2}>
        {concern.description}
      </Text>

      {/* Footer */}
      <View style={[S.footer, { borderTopColor: colors.border }]}>
        {/* Avatar + name */}
        <View style={S.authorRow}>
          <View style={[S.authorAvatar, { backgroundColor: colors.bgCardAlt }]}>
            <Text style={[S.authorInitial, { color: colors.textSecondary }]}>
              {concern.user_name ? concern.user_name.charAt(0).toUpperCase() : "A"}
            </Text>
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[S.authorName, { color: colors.textPrimary }]} numberOfLines={1}>
              {concern.user_name || "Anonymous Citizen"}
            </Text>
            <Text style={[S.authorSub, { color: colors.textMuted }]} numberOfLines={1}>
              📍 {concern.location_address || "Location unknown"}
            </Text>
          </View>
        </View>

        <View style={S.footerRight}>
          {/* Status */}
          <View
            style={[
              S.statusChip,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}
          >
            <View style={[S.statusDot, { backgroundColor: status.color }]} />
            <Text style={[S.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>

          {/* Upvote */}
          <TouchableOpacity
            style={[S.upvoteBtn, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }, isUpvoted && { backgroundColor: colors.primary + "22", borderColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onUpvote();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
              size={15}
              color={isUpvoted ? colors.primary : colors.textMuted}
            />
            <Text style={[S.upvoteNum, { color: colors.textMuted }, isUpvoted && { color: colors.primary }]}>
              {concern.upvotes || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image strip if present */}
      {concern.image_url && (
        <Image source={{ uri: resolveImageUrl(concern.image_url) }} style={S.imageStrip} />
      )}
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardUrgent: {},

  urgentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(3),
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(10),
  },

  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.full,
  },
  catText: { fontSize: rf(11), fontWeight: "700" },

  prioBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: RADIUS.full,
  },
  prioText: { fontSize: rf(10), fontWeight: "700" },

  dateText: { fontSize: rf(11) },

  title: {
    fontSize: rf(15),
    fontWeight: "700",
    lineHeight: rf(22),
    letterSpacing: -0.2,
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(6),
  },

  desc: {
    fontSize: rf(13),
    lineHeight: rf(19),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderTopWidth: 1,
  },

  authorRow: { flexDirection: "row", alignItems: "center", gap: scale(8), flex: 1 },
  authorAvatar: {
    width: scale(26),
    height: scale(26),
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  authorName: { fontSize: rf(12), fontWeight: "600" },
  authorSub: { fontSize: rf(10), marginTop: verticalScale(1) },

  footerRight: { flexDirection: "row", alignItems: "center", gap: scale(8) },

  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusDot: { width: scale(5), height: scale(5), borderRadius: scale(3) },
  statusText: { fontSize: rf(10), fontWeight: "700" },

  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  upvoteBtnActive: {},
  upvoteNum: { fontSize: rf(12), fontWeight: "700" },

  imageStrip: { width: "100%", height: verticalScale(160), marginTop: verticalScale(2) },
});
