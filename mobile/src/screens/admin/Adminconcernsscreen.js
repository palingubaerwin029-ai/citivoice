import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ConcernService } from "../../services/concernService";
import { COLORS, STATUS_CONFIG, CATEGORY_CONFIG } from "../../utils/theme";

const FILTERS = ["All", "Pending", "In Progress", "Resolved", "Rejected"];
const SORT_OPTIONS = ["Newest", "Oldest", "Upvotes", "Priority"];

export default function AdminConcernsScreen({ navigation }) {
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [showSort, setShowSort] = useState(false);

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

  const filtered = concerns
    .filter((c) => {
      const s = search.toLowerCase();
      const matchSearch =
        !s ||
        c.title?.toLowerCase().includes(s) ||
        c.user_name?.toLowerCase().includes(s) ||
        c.user_barangay?.toLowerCase().includes(s);
      return (
        matchSearch && (statusFilter === "All" || c.status === statusFilter)
      );
    })
    .sort((a, b) => {
      if (sortBy === "Newest")
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === "Oldest")
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortBy === "Upvotes") return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === "Priority") {
        const p = { High: 3, Medium: 2, Low: 1 };
        return (p[b.priority] || 0) - (p[a.priority] || 0);
      }
      return 0;
    });

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderItem = ({ item: c }) => {
    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG["Pending"];
    const catCfg = CATEGORY_CONFIG[c.category] || CATEGORY_CONFIG["Other"];
    const priorityColors = {
      High: "#FF4444",
      Medium: "#FFB800",
      Low: "#00D4AA",
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("AdminDashboard", {
            screen: "AdminConcernDetail",
            params: { concernId: c.id },
          })
        }
        activeOpacity={0.8}
      >
        {/* Top Row */}
        <View style={styles.cardTop}>
          <View style={[styles.catIcon, { backgroundColor: catCfg.bg }]}>
            <Ionicons name={catCfg.icon} size={18} color={catCfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {c.title}
            </Text>
          </View>
          <View
            style={[
              styles.priorityDot,
              { backgroundColor: priorityColors[c.priority] },
            ]}
          />
        </View>

        {/* Description preview */}
        <Text style={styles.cardDesc} numberOfLines={2}>
          {c.description}
        </Text>

        {/* Bottom Row */}
        <View style={styles.cardBottom}>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>
              {c.status}
            </Text>
          </View>
          <Text style={styles.cardMeta}>{c.user_name}</Text>
          <Text style={styles.cardMeta}>📍 {c.user_barangay}</Text>
          <Text style={styles.upvotes}>👍 {c.upvotes || 0}</Text>
        </View>

        {/* Date */}
        <Text style={styles.cardDate}>
          {c.created_at
            ? new Date(c.created_at).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search concerns..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={16}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowSort(!showSort)}
        >
          <Ionicons name="funnel-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Sort Dropdown */}
      {showSort && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.sortOption,
                sortBy === s && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortBy(s);
                setShowSort(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortBy === s && { color: COLORS.primary },
                ]}
              >
                {s}
              </Text>
              {sortBy === s && (
                <Ionicons name="checkmark" size={16} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Status Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = statusFilter === f;
          const color = STATUS_CONFIG[f]?.color || COLORS.primary;
          const count =
            f === "All"
              ? concerns.length
              : concerns.filter((c) => c.status === f).length;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                active && { backgroundColor: color + "22", borderColor: color },
              ]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterText, active && { color }]}>
                {f === "All" ? "All" : f.split(" ")[0]}
              </Text>
              <Text style={[styles.filterCount, active && { color }]}>
                {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results count */}
      <Text style={styles.resultCount}>
        {filtered.length} of {concerns.length} concerns
      </Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={styles.emptyText}>No concerns found</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },

  searchSection: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  sortBtn: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sortDropdown: {
    marginHorizontal: 16,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 8,
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sortOptionActive: { backgroundColor: COLORS.primary + "11" },
  sortOptionText: { color: COLORS.textSecondary, fontSize: 14 },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  filterCount: { color: COLORS.textMuted, fontSize: 10, fontWeight: "800" },

  resultCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  list: { paddingHorizontal: 16, paddingBottom: 32 },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  cardDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "700" },
  cardMeta: { color: COLORS.textMuted, fontSize: 11 },
  upvotes: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: "auto",
  },
  cardDate: { color: COLORS.textMuted, fontSize: 10, marginTop: 8 },

  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: COLORS.textMuted, marginTop: 12, fontSize: 15 },
});
