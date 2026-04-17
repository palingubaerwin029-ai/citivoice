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
  scroll: { padding: 20, paddingBottom: 48 },

  identityCard: {
    alignItems: "center",
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "900" },
  adminBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.bgCard,
  },
  adminName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  adminEmail: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accent + "22",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.accent + "44",
  },
  roleText: { color: COLORS.accent, fontSize: 12, fontWeight: "700" },

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: "47%",
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
  },
  statIcon: { fontSize: 20, marginBottom: 6 },
  statNum: { fontSize: 22, fontWeight: "900" },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },

  breakdownCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  breakdownTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 14,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 90,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { color: COLORS.textSecondary, fontSize: 12 },
  breakdownBarWrap: { flex: 1 },
  breakdownBarBg: {
    height: 6,
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: 3,
  },
  breakdownBarFill: { height: 6, borderRadius: 3 },
  breakdownCount: {
    fontSize: 13,
    fontWeight: "800",
    width: 28,
    textAlign: "right",
  },

  infoCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.bgCardAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 14 },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 160,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.statusRejected + "55",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  logoutText: { color: COLORS.statusRejected, fontSize: 15, fontWeight: "700" },

  versionText: { color: COLORS.textMuted, fontSize: 11, textAlign: "center" },
});
