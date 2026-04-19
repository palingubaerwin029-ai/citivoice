import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, CATEGORY_CONFIG, STATUS_CONFIG } from "../../utils/theme";
import { scale, verticalScale, rf, moderateScale } from "../../utils/responsive";
import { resolveImageUrl } from "../../context/AuthContext";

export default function ConcernCard({
  concern,
  onPress,
  showActions,
  onUpvote,
  currentUserId,
}) {
  const catCfg = CATEGORY_CONFIG[concern.category] || CATEGORY_CONFIG["Other"];
  const statusCfg = STATUS_CONFIG[concern.status] || STATUS_CONFIG["Pending"];
  const isUpvoted = concern.upvotedBy?.includes(currentUserId);

  const timeAgo = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d)) return "";
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top Row */}
      <View style={styles.topRow}>
        {/* Category Icon */}
        <View style={[styles.catIcon, { backgroundColor: catCfg.bg }]}>
          <Ionicons name={catCfg.icon} size={18} color={catCfg.color} />
        </View>
        <View style={styles.topMeta}>
          <Text style={styles.categoryText}>{concern.category}</Text>
          <Text style={styles.timeText}>{timeAgo(concern.createdAt)}</Text>
        </View>
        {/* Status */}
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>
            {concern.status}
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {concern.title}
      </Text>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {concern.description}
      </Text>

      {/* Image preview */}
      {concern.imageUrl ? (
        <Image
          source={{ uri: resolveImageUrl(concern.imageUrl) }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : null}

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        {/* Author */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorInitial}>
              {concern.userName?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
          <View>
            <Text style={styles.authorName}>{concern.userName}</Text>
            <Text style={styles.authorBarangay}>📍 {concern.userBarangay}</Text>
          </View>
        </View>

        {/* Upvote */}
        {showActions ? (
          <TouchableOpacity
            style={[styles.upvoteBtn, isUpvoted && styles.upvoteBtnActive]}
            onPress={() => onUpvote?.(concern.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isUpvoted ? "arrow-up-circle" : "arrow-up-circle-outline"}
              size={16}
              color={isUpvoted ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.upvoteCount,
                isUpvoted && styles.upvoteCountActive,
              ]}
            >
              {concern.upvotes || 0}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.upvoteDisplay}>
            <Ionicons
              name="arrow-up-circle-outline"
              size={14}
              color={COLORS.textMuted}
            />
            <Text style={styles.upvoteCountMuted}>{concern.upvotes || 0}</Text>
          </View>
        )}
      </View>

      {/* Admin Note */}
      {concern.adminNote ? (
        <View style={styles.adminNote}>
          <Ionicons name="shield-checkmark" size={13} color={COLORS.accent} />
          <Text style={styles.adminNoteText} numberOfLines={2}>
            {concern.adminNote}
          </Text>
        </View>
      ) : null}

      {/* Priority Indicator */}
      {concern.priority === "High" ? (
        <View style={styles.priorityStrip} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(16),
    padding: scale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(10) },
  catIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  topMeta: { flex: 1, marginLeft: scale(10) },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: rf(11),
    fontWeight: "600",
  },
  timeText: { color: COLORS.textMuted, fontSize: rf(11), marginTop: verticalScale(1) },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(20),
  },
  statusText: { fontSize: rf(10), fontWeight: "700" },

  title: {
    color: COLORS.textPrimary,
    fontSize: rf(15),
    fontWeight: "700",
    lineHeight: rf(21),
    marginBottom: verticalScale(6),
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: rf(13),
    lineHeight: rf(18),
    marginBottom: verticalScale(10),
  },

  image: { width: "100%", height: verticalScale(160), borderRadius: moderateScale(10), marginBottom: verticalScale(10) },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: scale(8) },
  authorAvatar: {
    width: scale(28),
    height: scale(28),
    borderRadius: moderateScale(8),
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: { color: "#fff", fontSize: rf(12), fontWeight: "800" },
  authorName: { color: COLORS.textPrimary, fontSize: rf(12), fontWeight: "600" },
  authorBarangay: { color: COLORS.textMuted, fontSize: rf(11) },

  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  upvoteBtnActive: {
    backgroundColor: `${COLORS.primary}22`,
    borderColor: COLORS.primary,
  },
  upvoteCount: { color: COLORS.textSecondary, fontSize: rf(13), fontWeight: "700" },
  upvoteCountActive: { color: COLORS.primary },
  upvoteDisplay: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  upvoteCountMuted: { color: COLORS.textMuted, fontSize: rf(12) },

  adminNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(6),
    backgroundColor: `${COLORS.accent}15`,
    borderRadius: moderateScale(8),
    padding: scale(8),
    marginTop: verticalScale(10),
  },
  adminNoteText: {
    flex: 1,
    color: COLORS.accent,
    fontSize: rf(12),
    lineHeight: rf(16),
  },

  priorityStrip: {
    position: "absolute",
    top: 0,
    right: 0,
    width: scale(4),
    height: "100%",
    backgroundColor: COLORS.statusRejected,
    borderTopRightRadius: moderateScale(16),
    borderBottomRightRadius: moderateScale(16),
  },
});
