import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useConcerns } from "../../context/ConcernContext";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useNotifications } from "../../context/NotificationContext";
import ConcernCard from "../../components/ConcernCard";
import { EmptyState, StatCard } from "../../components/UI";
import { COLORS, RADIUS, SHADOWS, STATUS_CONFIG } from "../../utils/theme";
import { scale, verticalScale, rf, moderateScale } from "../../utils/responsive";

const FILTER_KEYS = [
  { key: "all", tKey: "all", icon: "apps-outline" },
  { key: "Pending", tKey: "pending", icon: "time-outline" },
  { key: "In Progress", tKey: "active", icon: "refresh-outline" },
  { key: "Resolved", tKey: "resolved", icon: "checkmark-circle-outline" },
];

const FILTER_COLOR = {
  all: COLORS.primaryLight,
  Pending: "#F59E0B",
  "In Progress": "#3B82F6",
  Resolved: "#10B981",
};

export default function HomeScreen({ navigation }) {
  const { concerns, loading, toggleUpvote, refreshConcerns } = useConcerns();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.name?.split(" ")[0] || "there";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const stats = useMemo(
    () => ({
      total: concerns.length,
      pending: concerns.filter((c) => c.status === "Pending").length,
      inProgress: concerns.filter((c) => c.status === "In Progress").length,
      resolved: concerns.filter((c) => c.status === "Resolved").length,
    }),
    [concerns],
  );

  const filtered = useMemo(
    () =>
      concerns.filter((c) => {
        const match = activeFilter === "all" || c.status === activeFilter;
        const q = search.toLowerCase();
        const text =
          !q ||
          c.title?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.user_barangay?.toLowerCase().includes(q);
        return match && text;
      }),
    [concerns, activeFilter, search],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshConcerns();
    } catch {} finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={S.container} edges={["top"]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* ── Top bar ── */}
            <View style={S.topBar}>
              <View>
                <Text style={S.greeting}>
                  {greeting()}, {firstName} 👋
                </Text>
                <Text style={S.subGreeting}>{t('communityFeed')}</Text>
              </View>
              <View style={S.headerActions}>
                <TouchableOpacity
                  style={S.bellBtn}
                  onPress={() => navigation.navigate("Notifications")}
                >
                  <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
                  {unreadCount > 0 && (
                    <View style={S.badgeCount}>
                      <Text style={S.badgeCountText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={S.reportBtn}
                  onPress={() => navigation.navigate("SubmitConcern")}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={S.reportBtnText}>{t('report')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Stats strip ── */}
            <View style={S.statsRow}>
              <StatCard icon="📋" value={stats.total} label={t('total')} color={COLORS.primary} />
              <StatCard icon="⏳" value={stats.pending} label={t('pending')} color={COLORS.statusPending} />
              <StatCard icon="🔄" value={stats.inProgress} label={t('active')} color={COLORS.primaryLight} />
              <StatCard icon="✅" value={stats.resolved} label={t('resolved')} color={COLORS.accent} />
            </View>

            {/* ── Search ── */}
            <View style={S.searchWrap}>
              <Ionicons
                name="search-outline"
                size={17}
                color={COLORS.textMuted}
              />
              <TextInput
                style={S.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={17}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ── Filter tabs ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={S.filterScroll}
              contentContainerStyle={S.filterContent}
            >
              {FILTER_KEYS.map((f) => {
                const active = activeFilter === f.key;
                const color = FILTER_COLOR[f.key] || COLORS.primary;
                const count = f.key === 'all' ? concerns.length : concerns.filter(c => c.status === f.key).length;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      S.filterTab,
                      active && {
                        backgroundColor: color + "22",
                        borderColor: color,
                      },
                    ]}
                    onPress={() => setActiveFilter(f.key)}
                  >
                    <Ionicons
                      name={f.icon}
                      size={14}
                      color={active ? color : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        S.filterTabText,
                        active && { color, fontWeight: "700" },
                      ]}
                    >
                      {t(f.tKey)}
                    </Text>
                    <View style={[S.filterBadge, active && { backgroundColor: color }]}>
                      <Text style={[S.filterBadgeText, active && { color: '#fff' }]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={S.resultCount}>
              {filtered.length} {filtered.length !== 1 ? t('concerns') : t('concern')}
            </Text>
          </>
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="📭"
              title={t('noConcernsFound')}
              subtitle={t('beFirstToReport')}
              action={() => navigation.navigate("SubmitConcern")}
              actionLabel={t('reportConcern')}
            />
          )
        }
        renderItem={({ item }) => (
          <ConcernCard
            concern={item}
            onPress={() =>
              navigation.navigate("ConcernDetail", { concernId: item.id })
            }
            onUpvote={() => toggleUpvote(item.id)}
            isUpvoted={false} 
          />
        )}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  list: { paddingHorizontal: scale(16), paddingBottom: verticalScale(40) },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
  },
  greeting: {
    color: COLORS.textPrimary,
    fontSize: rf(18),
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subGreeting: { color: COLORS.textMuted, fontSize: rf(12), marginTop: verticalScale(2) },

  headerActions: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  bellBtn: { position: "relative", padding: scale(4) },
  badgeCount: {
    position: "absolute", top: -scale(2), right: -scale(4),
    backgroundColor: COLORS.statusRejected, borderRadius: scale(10),
    paddingHorizontal: scale(4), paddingVertical: verticalScale(1),
    minWidth: scale(16), alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: COLORS.bgDark
  },
  badgeCountText: { color: "#fff", fontSize: rf(9), fontWeight: "900" },

  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(5),
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(9),
    ...SHADOWS.button,
  },
  reportBtnText: { color: "#fff", fontSize: rf(13), fontWeight: "700" },

  statsRow: { flexDirection: 'row', gap: scale(8), marginBottom: verticalScale(14) },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: verticalScale(12),
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: rf(14) },

  filterScroll: { marginBottom: verticalScale(10) },
  filterContent: { gap: scale(8) },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabText: { color: COLORS.textMuted, fontSize: rf(12), fontWeight: "600" },
  filterBadge: { backgroundColor: COLORS.bgCardAlt, borderRadius: moderateScale(10), paddingHorizontal: scale(6), paddingVertical: verticalScale(1) },
  filterBadgeText: { color: COLORS.textMuted, fontSize: rf(10), fontWeight: "800" },

  resultCount: { color: COLORS.textMuted, fontSize: rf(12), marginBottom: verticalScale(8) },
});
