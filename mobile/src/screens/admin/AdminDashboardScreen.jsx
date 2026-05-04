import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ConcernService } from "../../services/concernService";
import { useAuth } from "../../context/AuthContext";
import { COLORS, STATUS_CONFIG, CATEGORY_CONFIG } from "../../utils/theme";
import { scale, verticalScale, rf, moderateScale } from "../../utils/responsive";

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await ConcernService.getConcerns();
      setConcerns(data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const urgent = concerns.filter(
    (c) => c.priority === "High" && c.status === "Pending",
  );
  const recent = concerns.slice(0, 6);

  const categoryCount = concerns.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.entries(categoryCount).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Panel 🛡️</Text>
            <Text style={styles.adminName}>{user?.name}</Text>
          </View>
          <View style={styles.liveDot}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          {[
            {
              label: "Total",
              value: stats.total,
              icon: "📋",
              color: COLORS.primary,
            },
            {
              label: "Pending",
              value: stats.pending,
              icon: "⏳",
              color: COLORS.statusPending,
            },
            {
              label: "Active",
              value: stats.inProgress,
              icon: "🔄",
              color: COLORS.primaryLight,
            },
            {
              label: "Resolved",
              value: stats.resolved,
              icon: "✅",
              color: COLORS.accent,
            },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { borderTopColor: k.color }]}>
              <Text style={styles.kpiIcon}>{k.icon}</Text>
              <Text style={[styles.kpiNum, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Resolution Rate Bar */}
        <View style={styles.rateCard}>
          <View style={styles.rateHeader}>
            <Text style={styles.rateTitle}>🎯 Resolution Rate</Text>
            <Text
              style={[
                styles.ratePercent,
                {
                  color:
                    resolutionRate > 60 ? COLORS.accent : COLORS.statusPending,
                },
              ]}
            >
              {resolutionRate}%
            </Text>
          </View>
          <View style={styles.rateBarBg}>
            <View
              style={[styles.rateBarFill, { width: `${resolutionRate}%` }]}
            />
          </View>
          <Text style={styles.rateSub}>
            {stats.resolved} resolved of {stats.total} total
          </Text>
        </View>

        {/* Top Category */}
        {topCategory && (
          <View style={styles.topCatCard}>
            <View
              style={[
                styles.topCatIcon,
                {
                  backgroundColor:
                    CATEGORY_CONFIG[topCategory[0]]?.bg || COLORS.bgCard,
                },
              ]}
            >
              <Ionicons
                name={CATEGORY_CONFIG[topCategory[0]]?.icon || "alert-circle"}
                size={22}
                color={CATEGORY_CONFIG[topCategory[0]]?.color || COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.topCatLabel}>Most Reported Category</Text>
              <Text style={styles.topCatName}>{topCategory[0]}</Text>
            </View>
            <Text style={styles.topCatCount}>{topCategory[1]}</Text>
          </View>
        )}

        {/* Urgent Section */}
        {urgent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: COLORS.statusRejected }]}
              >
                🚨 Urgent — Needs Action
              </Text>
              <Text style={styles.sectionCount}>{urgent.length}</Text>
            </View>
            {urgent.slice(0, 3).map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.urgentRow}
                onPress={() =>
                  navigation.navigate("AdminConcernDetail", { concernId: c.id })
                }
              >
                <View style={styles.urgentLeft}>
                  <View style={styles.urgentDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.urgentTitle} numberOfLines={1}>
                      {c.title}
                    </Text>
                    <Text style={styles.urgentMeta}>
                      {c.user_name} · {c.user_barangay}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            ))}
            {urgent.length > 3 && (
              <TouchableOpacity
                onPress={() => navigation.navigate("AdminConcerns")}
              >
                <Text style={styles.seeAll}>
                  See all {urgent.length} urgent →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Recent Concerns */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕐 Recent Concerns</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("AdminConcerns")}
            >
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recent.map((c) => {
            const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG["Pending"];
            const catCfg =
              CATEGORY_CONFIG[c.category] || CATEGORY_CONFIG["Other"];
            return (
              <TouchableOpacity
                key={c.id}
                style={styles.concernRow}
                onPress={() =>
                  navigation.navigate("AdminConcernDetail", { concernId: c.id })
                }
              >
                <View style={[styles.catDot, { backgroundColor: catCfg.bg }]}>
                  <Ionicons name={catCfg.icon} size={16} color={catCfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.concernTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                  <Text style={styles.concernMeta}>
                    {c.user_name} · {c.user_barangay}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.statusPillText, { color: cfg.color }]}>
                    {c.status}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { padding: scale(20), paddingBottom: verticalScale(40) },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(20),
  },
  greeting: { color: COLORS.textSecondary, fontSize: rf(14), fontWeight: "600" },
  adminName: {
    color: COLORS.textPrimary,
    fontSize: rf(20),
    fontWeight: "800",
    marginTop: verticalScale(2),
  },
  liveDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: COLORS.accent + "22",
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderWidth: 1,
    borderColor: COLORS.accent + "44",
  },
  liveIndicator: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: COLORS.accent,
  },
  liveText: { color: COLORS.accent, fontSize: rf(12), fontWeight: "700" },

  kpiGrid: { flexDirection: "row", gap: scale(10), marginBottom: verticalScale(14) },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(14),
    padding: scale(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 3,
  },
  kpiIcon: { fontSize: rf(18), marginBottom: verticalScale(4) },
  kpiNum: { fontSize: rf(22), fontWeight: "900" },
  kpiLabel: { color: COLORS.textMuted, fontSize: rf(10), marginTop: verticalScale(2) },

  rateCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: verticalScale(14),
  },
  rateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  rateTitle: { color: COLORS.textPrimary, fontSize: rf(14), fontWeight: "700" },
  ratePercent: { fontSize: rf(20), fontWeight: "900" },
  rateBarBg: {
    height: verticalScale(8),
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: scale(4),
    marginBottom: verticalScale(8),
  },
  rateBarFill: { height: verticalScale(8), backgroundColor: COLORS.accent, borderRadius: scale(4) },
  rateSub: { color: COLORS.textMuted, fontSize: rf(11) },

  topCatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: verticalScale(20),
  },
  topCatIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  topCatLabel: { color: COLORS.textMuted, fontSize: rf(11) },
  topCatName: {
    color: COLORS.textPrimary,
    fontSize: rf(14),
    fontWeight: "700",
    marginTop: verticalScale(2),
  },
  topCatCount: { color: COLORS.primary, fontSize: rf(24), fontWeight: "900" },

  section: { marginBottom: verticalScale(20) },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: rf(16), fontWeight: "700" },
  sectionCount: {
    backgroundColor: COLORS.statusRejected + "22",
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: rf(13),
    fontWeight: "700",
    marginTop: verticalScale(8),
    textAlign: "right",
  },

  urgentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.statusRejected + "11",
    borderRadius: moderateScale(12),
    padding: scale(12),
    borderWidth: 1,
    borderColor: COLORS.statusRejected + "33",
    marginBottom: verticalScale(8),
  },
  urgentLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: scale(10) },
  urgentDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: COLORS.statusRejected,
  },
  urgentTitle: { color: COLORS.textPrimary, fontSize: rf(14), fontWeight: "600" },
  urgentMeta: { color: COLORS.textMuted, fontSize: rf(11), marginTop: verticalScale(2) },

  concernRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(12),
    padding: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: verticalScale(8),
  },
  catDot: {
    width: scale(38),
    height: scale(38),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  concernTitle: { color: COLORS.textPrimary, fontSize: rf(13), fontWeight: "600" },
  concernMeta: { color: COLORS.textMuted, fontSize: rf(11), marginTop: verticalScale(2) },
  statusPill: { paddingHorizontal: scale(8), paddingVertical: verticalScale(4), borderRadius: moderateScale(20) },
  statusPillText: { fontSize: rf(10), fontWeight: "700" },
});
