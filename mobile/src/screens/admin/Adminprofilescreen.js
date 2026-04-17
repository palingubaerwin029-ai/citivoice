import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ConcernService } from "../../services/concernService";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../utils/theme";
import { scale, verticalScale, rf, moderateScale } from "../../utils/responsive";

export default function AdminProfileScreen() {
  const { user, logout } = useAuth();
  const [concerns, setConcerns] = useState([]);

  useEffect(() => {
    const fetchConcerns = async () => {
      try {
        const data = await ConcernService.getConcerns();
        setConcerns(data);
      } catch (err) {}
    };
    fetchConcerns();
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const stats = {
    total: concerns.length,
    pending: concerns.filter((c) => c.status === "Pending").length,
    inProgress: concerns.filter((c) => c.status === "In Progress").length,
    resolved: concerns.filter((c) => c.status === "Resolved").length,
    rejected: concerns.filter((c) => c.status === "Rejected").length,
  };
  const resolutionRate = stats.total
    ? Math.round((stats.resolved / stats.total) * 100)
    : 0;

  const topCategory = (() => {
    const map = concerns.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  })();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const infoRows = [
    { icon: "person-outline", label: "Full Name", value: user?.name },
    { icon: "mail-outline", label: "Email", value: user?.email },
    { icon: "shield-checkmark-outline", label: "Role", value: "Administrator" },
    { icon: "call-outline", label: "Phone", value: user?.phone || "—" },
    {
      icon: "calendar-outline",
      label: "Admin since",
      value:
        user?.created_at
          ? new Date(user.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long" })
          : "2024",
    },
  ];

  const systemStats = [
    {
      label: "Total Concerns",
      value: stats.total,
      icon: "📋",
      color: COLORS.primary,
    },
    {
      label: "Resolution Rate",
      value: `${resolutionRate}%`,
      icon: "🎯",
      color: COLORS.accent,
    },
    {
      label: "Pending Review",
      value: stats.pending,
      icon: "⏳",
      color: COLORS.statusPending,
    },
    {
      label: "Top Category",
      value: topCategory?.split(" ")[0] || "—",
      icon: "🏷️",
      color: COLORS.accentWarm,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Admin Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
            </View>
          </View>
          <Text style={styles.adminName}>{user?.name}</Text>
          <Text style={styles.adminEmail}>{user?.email}</Text>
          <View style={styles.rolePill}>
            <Ionicons name="shield" size={12} color={COLORS.accent} />
            <Text style={styles.roleText}>Administrator · CitiVoice</Text>
          </View>
        </View>

        {/* System Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📊 System Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          {systemStats.map((s, i) => (
            <View
              key={i}
              style={[styles.statCard, { borderTopColor: s.color }]}
            >
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statNum, { color: s.color }]}>
                {s.value}
              </Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Status Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>📈 Concern Status Breakdown</Text>
          {[
            {
              label: "Pending",
              value: stats.pending,
              color: COLORS.statusPending,
            },
            {
              label: "In Progress",
              value: stats.inProgress,
              color: COLORS.primary,
            },
            { label: "Resolved", value: stats.resolved, color: COLORS.accent },
            {
              label: "Rejected",
              value: stats.rejected,
              color: COLORS.statusRejected,
            },
          ].map((s) => {
            const pct = stats.total
              ? Math.round((s.value / stats.total) * 100)
              : 0;
            return (
              <View key={s.label} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View
                    style={[styles.breakdownDot, { backgroundColor: s.color }]}
                  />
                  <Text style={styles.breakdownLabel}>{s.label}</Text>
                </View>
                <View style={styles.breakdownBarWrap}>
                  <View style={styles.breakdownBarBg}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        { width: `${pct}%`, backgroundColor: s.color },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.breakdownCount, { color: s.color }]}>
                  {s.value}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Account Info */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👤 Account Info</Text>
        </View>
        <View style={styles.infoCard}>
          {infoRows.map((row, i) => (
            <View
              key={i}
              style={[
                styles.infoRow,
                i < infoRows.length - 1 && styles.infoRowBorder,
              ]}
            >
              <View style={styles.infoLeft}>
                <View style={styles.infoIconWrap}>
                  <Ionicons
                    name={row.icon}
                    size={16}
                    color={COLORS.textMuted}
                  />
                </View>
                <Text style={styles.infoLabel}>{row.label}</Text>
              </View>
              <Text style={styles.infoValue} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={20}
            color={COLORS.statusRejected}
          />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          CitiVoice Admin v2.0 · Powered by Express API
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { padding: scale(20), paddingBottom: verticalScale(48) },

  identityCard: {
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(20),
    padding: scale(24),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: verticalScale(24),
  },
  avatarWrap: { position: "relative", marginBottom: verticalScale(14) },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: moderateScale(22),
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: verticalScale(6) },
    shadowOpacity: 0.4,
    shadowRadius: scale(12),
    elevation: 8,
  },
  avatarText: { color: "#fff", fontSize: rf(30), fontWeight: "900" },
  adminBadge: {
    position: "absolute",
    bottom: verticalScale(-4),
    right: scale(-4),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.bgCard,
  },
  adminName: {
    color: COLORS.textPrimary,
    fontSize: rf(22),
    fontWeight: "900",
    marginBottom: verticalScale(4),
  },
  adminEmail: { color: COLORS.textSecondary, fontSize: rf(13), marginBottom: verticalScale(10) },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: COLORS.accent + "22",
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderWidth: 1,
    borderColor: COLORS.accent + "44",
  },
  roleText: { color: COLORS.accent, fontSize: rf(12), fontWeight: "700" },

  sectionHeader: { marginBottom: verticalScale(12) },
  sectionTitle: { color: COLORS.textPrimary, fontSize: rf(16), fontWeight: "700" },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    marginBottom: verticalScale(20),
  },
  statCard: {
    width: "47%",
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(14),
    padding: scale(14),
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
  },
  statIcon: { fontSize: rf(20), marginBottom: verticalScale(6) },
  statNum: { fontSize: rf(22), fontWeight: "900" },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: rf(10),
    marginTop: verticalScale(4),
    textAlign: "center",
  },

  breakdownCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: verticalScale(24),
  },
  breakdownTitle: {
    color: COLORS.textPrimary,
    fontSize: rf(14),
    fontWeight: "700",
    marginBottom: verticalScale(14),
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    marginBottom: verticalScale(10),
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    width: scale(90),
  },
  breakdownDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  breakdownLabel: { color: COLORS.textSecondary, fontSize: rf(12) },
  breakdownBarWrap: { flex: 1 },
  breakdownBarBg: {
    height: verticalScale(6),
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: scale(3),
  },
  breakdownBarFill: { height: verticalScale(6), borderRadius: scale(3) },
  breakdownCount: {
    fontSize: rf(13),
    fontWeight: "800",
    width: scale(28),
    textAlign: "right",
  },

  infoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: verticalScale(20),
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scale(14),
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  infoIconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: moderateScale(8),
    backgroundColor: COLORS.bgCardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: rf(14) },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: rf(14),
    fontWeight: "600",
    maxWidth: scale(160),
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    borderWidth: 1,
    borderColor: COLORS.statusRejected + "55",
    borderRadius: moderateScale(14),
    padding: scale(14),
    marginBottom: verticalScale(20),
  },
  logoutText: { color: COLORS.statusRejected, fontSize: rf(15), fontWeight: "700" },

  versionText: { color: COLORS.textMuted, fontSize: rf(11), textAlign: "center" },
});
