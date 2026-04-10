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
import ConcernCard from "../../components/ConcernCard";
import { EmptyState } from "../../components/UI";
import { COLORS, RADIUS, SHADOWS } from "../../utils/theme";

const FILTERS = [
  { key: "all", label: "All", icon: "apps-outline" },
  { key: "Pending", label: "Pending", icon: "time-outline" },
  { key: "In Progress", label: "Active", icon: "refresh-outline" },
  { key: "Resolved", label: "Resolved", icon: "checkmark-circle-outline" },
];

const FILTER_COLOR = {
  all: COLORS.primaryLight,
  Pending: "#F59E0B",
  "In Progress": "#3B82F6",
  Resolved: "#10B981",
};

export default function HomeScreen({ navigation }) {
  const { concerns, loading, toggleUpvote } = useConcerns();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.name?.split(" ")[0] || "there";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return `Good morning`;
    if (h < 18) return `Good afternoon`;
    return `Good evening`;
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
          c.userBarangay?.toLowerCase().includes(q);
        return match && text;
      }),
    [concerns, activeFilter, search],
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <SafeAreaView style={S.container} edges={["top"]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={() => (
          <>
            {/* ── Top bar ── */}
            <View style={S.topBar}>
              <View>
                <Text style={S.greeting}>
                  {greeting()}, {firstName} 👋
                </Text>
                <Text style={S.subGreeting}>CitiVoice Community Feed</Text>
              </View>
              <TouchableOpacity
                style={S.reportBtn}
                onPress={() => navigation.navigate("SubmitConcern")}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={S.reportBtnText}>Report</Text>
              </TouchableOpacity>
            </View>

            {/* ── Stats strip ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={S.statsScroll}
              contentContainerStyle={S.statsContent}
            >
              {[
                {
                  label: "Total",
                  value: stats.total,
                  color: "#60A5FA",
                  icon: "◉",
                },
                {
                  label: "Pending",
                  value: stats.pending,
                  color: "#F59E0B",
                  icon: "⏳",
                },
                {
                  label: "Active",
                  value: stats.inProgress,
                  color: "#3B82F6",
                  icon: "🔄",
                },
                {
                  label: "Resolved",
                  value: stats.resolved,
                  color: "#10B981",
                  icon: "✓",
                },
              ].map((s, i) => (
                <View key={i} style={S.statChip}>
                  <Text style={[S.statNum, { color: s.color }]}>{s.value}</Text>
                  <Text style={S.statLabel}>{s.label}</Text>
                </View>
              ))}
            </ScrollView>

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
                placeholder="Search concerns, categories, barangays…"
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
              {FILTERS.map((f) => {
                const active = activeFilter === f.key;
                const color = FILTER_COLOR[f.key];
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      S.filterTab,
                      active && {
                        backgroundColor: color + "1A",
                        borderColor: color,
                      },
                    ]}
                    onPress={() => setActiveFilter(f.key)}
                  >
                    <Ionicons
                      name={f.icon}
                      size={13}
                      color={active ? color : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        S.filterTabText,
                        active && { color, fontWeight: "700" },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={S.resultCount}>
              {filtered.length} concern{filtered.length !== 1 ? "s" : ""}
            </Text>
          </>
        )}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              icon="📭"
              title="No concerns found"
              subtitle="Be the first to report an issue in your community."
              action={() => navigation.navigate("SubmitConcern")}
              actionLabel="Report a Concern"
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
            isUpvoted={item.upvotedBy?.includes(user?.uid)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  list: { paddingHorizontal: 16, paddingBottom: 40 },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subGreeting: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...SHADOWS.button,
  },
  reportBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  statsScroll: { marginBottom: 14 },
  statsContent: { gap: 10 },
  statChip: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 76,
  },
  statNum: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },

  filterScroll: { marginBottom: 10 },
  filterContent: { gap: 8 },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "500" },

  resultCount: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
});
