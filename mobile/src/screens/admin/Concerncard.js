import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, CATEGORY_CONFIG, STATUS_CONFIG } from "../utils/theme";

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
    if (!ts?.toDate) return "";
    const diff = Date.now() - ts.toDate().getTime();
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
          source={{ uri: concern.imageUrl }}
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  topMeta: { flex: 1, marginLeft: 10 },
  categoryText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  timeText: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 10, fontWeight: "700" },

  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginBottom: 6,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },

  image: { width: "100%", height: 160, borderRadius: 10, marginBottom: 10 },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: { color: "#fff", fontSize: 12, fontWeight: "800" },
  authorName: { color: COLORS.textPrimary, fontSize: 12, fontWeight: "600" },
  authorBarangay: { color: COLORS.textMuted, fontSize: 11 },

  upvoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  upvoteBtnActive: {
    backgroundColor: `${COLORS.primary}22`,
    borderColor: COLORS.primary,
  },
  upvoteCount: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "700" },
  upvoteCountActive: { color: COLORS.primary },
  upvoteDisplay: { flexDirection: "row", alignItems: "center", gap: 4 },
  upvoteCountMuted: { color: COLORS.textMuted, fontSize: 12 },

  adminNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: `${COLORS.accent}15`,
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  adminNoteText: {
    flex: 1,
    color: COLORS.accent,
    fontSize: 12,
    lineHeight: 16,
  },

  priorityStrip: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 4,
    height: "100%",
    backgroundColor: COLORS.statusRejected,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
});
