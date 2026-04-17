import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  RADIUS,
  SHADOWS,
  CATEGORY_CONFIG,
  STATUS_CONFIG,
} from "../utils/theme";
import { scale, verticalScale, rf } from "../utils/responsive";

const PRIORITY_COLORS = {
  High: { color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  Medium: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  Low: { color: "#10B981", bg: "rgba(16,185,129,0.12)" },
};

export default function ConcernCard({ concern, onPress, onUpvote, isUpvoted }) {
  const cat = CATEGORY_CONFIG[concern.category] || CATEGORY_CONFIG["Other"];
  const status = STATUS_CONFIG[concern.status] || STATUS_CONFIG["Pending"];
  const prio = PRIORITY_COLORS[concern.priority] || PRIORITY_COLORS["Low"];
  const isHigh = concern.priority === "High";

  const fmt = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "";

  return (
    <TouchableOpacity
      style={[S.card, isHigh && S.cardUrgent]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Urgent strip */}
      {isHigh && <View style={S.urgentStrip} />}

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
        <Text style={S.dateText}>{fmt(concern.created_at)}</Text>
      </View>

      {/* Title */}
      <Text style={S.title} numberOfLines={2}>
        {concern.title}
      </Text>

      {/* Description */}
      <Text style={S.desc} numberOfLines={2}>
        {concern.description}
      </Text>

      {/* Footer */}
      <View style={S.footer}>
        {/* Avatar + name */}
        <View style={S.authorRow}>
          <View style={S.authorAvatar}>
            <Text style={S.authorInitial}>
              {concern.user_name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <View>
            <Text style={S.authorName} numberOfLines={1}>
              {concern.user_name}
            </Text>
            <Text style={S.authorSub} numberOfLines={1}>
              📍 {concern.user_barangay}
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
            style={[S.upvoteBtn, isUpvoted && S.upvoteBtnActive]}
            onPress={onUpvote}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
              size={15}
              color={isUpvoted ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[S.upvoteNum, isUpvoted && { color: COLORS.primary }]}>
              {concern.upvotes || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Image strip if present */}
      {concern.image_url && (
        <Image source={{ uri: concern.image_url }} style={S.imageStrip} />
      )}
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    overflow: "hidden",
    ...SHADOWS.card,
  },
  cardUrgent: { borderColor: "rgba(239,68,68,0.3)" },

  urgentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: scale(3),
    backgroundColor: "#EF4444",
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

  dateText: { color: COLORS.textMuted, fontSize: rf(11) },

  title: {
    color: COLORS.textPrimary,
    fontSize: rf(15),
    fontWeight: "700",
    lineHeight: rf(22),
    letterSpacing: -0.2,
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(6),
  },

  desc: {
    color: COLORS.textSecondary,
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
    borderTopColor: COLORS.border,
  },

  authorRow: { flexDirection: "row", alignItems: "center", gap: scale(8), flex: 1 },
  authorAvatar: {
    width: scale(26),
    height: scale(26),
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: {
    color: COLORS.primaryLight,
    fontSize: rf(12),
    fontWeight: "700",
  },
  authorName: { color: COLORS.textSecondary, fontSize: rf(12), fontWeight: "600" },
  authorSub: { color: COLORS.textMuted, fontSize: rf(10), marginTop: verticalScale(1) },

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
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  upvoteBtnActive: {
    backgroundColor: COLORS.primary + "18",
    borderColor: COLORS.primary + "44",
  },
  upvoteNum: { color: COLORS.textMuted, fontSize: rf(12), fontWeight: "700" },

  imageStrip: { width: "100%", height: verticalScale(160), marginTop: verticalScale(2) },
});
