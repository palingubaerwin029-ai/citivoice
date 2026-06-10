import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConcernService } from '../../services/concernService';
import { getStatusConfig, getCategoryConfig, RADIUS, SHADOWS } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

const FILTERS = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const SORT_OPTIONS = ['Newest', 'Oldest', 'Upvotes', 'Priority'];

export default function AdminConcernsScreen({ navigation }) {
  const { colors } = useTheme();
  const [concerns, setConcerns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [showSort, setShowSort] = useState(false);
  const [viewMode, setViewMode] = useState('concerns'); // 'concerns' or 'citizens'
  const [selectedCitizen, setSelectedCitizen] = useState(null);

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
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
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
        matchSearch &&
        (statusFilter === 'All' || c.status === statusFilter) &&
        (!selectedCitizen || c.user_name === selectedCitizen)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'Newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === 'Oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortBy === 'Upvotes') return (b.upvotes || 0) - (a.upvotes || 0);
      if (sortBy === 'Priority') {
        const p = { High: 3, Medium: 2, Low: 1 };
        return (p[b.priority] || 0) - (p[a.priority] || 0);
      }
      return 0;
    });

  const citizens = useMemo(() => {
    const map = concerns.reduce((acc, c) => {
      if (!acc[c.user_name]) {
        acc[c.user_name] = {
          name: c.user_name,
          barangay: c.user_barangay,
          count: 0,
          pending: 0,
          resolved: 0,
        };
      }
      acc[c.user_name].count++;
      if (c.status === 'Pending') acc[c.user_name].pending++;
      if (c.status === 'Resolved') acc[c.user_name].resolved++;
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [concerns]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderItem = ({ item: c }) => {
    const cfg = getStatusConfig(colors)[c.status] || getStatusConfig(colors)['Pending'];
    const catCfg = getCategoryConfig(colors)[c.category] || getCategoryConfig(colors)['Other'];
    const priorityColors = {
      High: colors.statusRejected,
      Medium: colors.statusPending,
      Low: colors.accent,
    };

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() =>
          navigation.navigate('AdminConcernDetail', {
            concernId: c.id,
            concernIds: filtered.map((f) => f.id),
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={[styles.catIcon, { backgroundColor: catCfg.bg }]}>
            <Ionicons name={catCfg.icon} size={18} color={catCfg.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {c.title}
            </Text>
          </View>
          <View
            style={[
              styles.priorityDot,
              { backgroundColor: priorityColors[c.priority] || colors.border },
            ]}
          />
        </View>

        <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>
          {c.description}
        </Text>

        <View style={styles.cardBottom}>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{c.status}</Text>
          </View>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
            {c.user_name}
          </Text>
          <Text style={[styles.upvotes, { color: colors.accent }]}>👍 {c.upvotes || 0}</Text>
        </View>

        <Text style={[styles.cardDate, { color: colors.textMuted }]}>
          {c.created_at
            ? new Date(c.created_at).toLocaleDateString('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCitizenItem = ({ item: cit }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      onPress={() => {
        setSelectedCitizen(cit.name);
        setViewMode('concerns');
      }}
    >
      <View style={styles.cardTop}>
        <View style={[styles.catIcon, { backgroundColor: colors.accent + '11' }]}>
          <Ionicons name="person" size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{cit.name}</Text>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
            📍 {cit.barangay || 'Unknown'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.primary + '11' }]}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: rf(11) }}>
            {cit.count} Reports
          </Text>
        </View>
      </View>
      <View style={[styles.cardBottom, { marginTop: verticalScale(4) }]}>
        <Text style={[styles.cardMeta, { color: colors.statusPending }]}>
          ⏳ {cit.pending} Pending
        </Text>
        <Text style={[styles.cardMeta, { color: colors.accent }]}>✅ {cit.resolved} Resolved</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, viewMode === 'concerns' && { backgroundColor: colors.primary }]}
          onPress={() => setViewMode('concerns')}
        >
          <Text
            style={[
              styles.modeText,
              { color: colors.textSecondary },
              viewMode === 'concerns' && { color: '#fff' },
            ]}
          >
            Concerns
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, viewMode === 'citizens' && { backgroundColor: colors.primary }]}
          onPress={() => {
            setViewMode('citizens');
            setSelectedCitizen(null);
          }}
        >
          <Text
            style={[
              styles.modeText,
              { color: colors.textSecondary },
              viewMode === 'citizens' && { color: '#fff' },
            ]}
          >
            Citizens
          </Text>
        </TouchableOpacity>
      </View>

      {selectedCitizen && viewMode === 'concerns' && (
        <View
          style={[
            styles.activeFilter,
            { backgroundColor: colors.accent + '11', borderColor: colors.accent + '33' },
          ]}
        >
          <Text style={[styles.activeFilterText, { color: colors.accent }]}>
            Showing concerns for: <Text style={{ fontWeight: '800' }}>{selectedCitizen}</Text>
          </Text>
          <TouchableOpacity onPress={() => setSelectedCitizen(null)}>
            <Ionicons name="close-circle" size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'concerns' && (
        <>
          <View style={styles.searchSection}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search concerns..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[
                styles.sortBtn,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
              onPress={() => setShowSort(!showSort)}
            >
              <Ionicons name="funnel-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showSort && (
            <View
              style={[
                styles.sortDropdown,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
            >
              {SORT_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.sortOption,
                    { borderBottomColor: colors.border },
                    sortBy === s && { backgroundColor: colors.primary + '11' },
                  ]}
                  onPress={() => {
                    setSortBy(s);
                    setShowSort(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: colors.textSecondary },
                      sortBy === s && { color: colors.primary },
                    ]}
                  >
                    {s}
                  </Text>
                  {sortBy === s && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: scale(8) }}
            >
              {FILTERS.map((f) => {
                const active = statusFilter === f;
                const color = getStatusConfig(colors)[f]?.color || colors.primary;
                const count =
                  f === 'All' ? concerns.length : concerns.filter((c) => c.status === f).length;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.bgCard, borderColor: colors.border },
                      active && { backgroundColor: color + '22', borderColor: color },
                    ]}
                    onPress={() => setStatusFilter(f)}
                  >
                    <Text
                      style={[styles.filterText, { color: colors.textMuted }, active && { color }]}
                    >
                      {f}
                    </Text>
                    <Text
                      style={[styles.filterCount, { color: colors.textMuted }, active && { color }]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <Text style={[styles.resultCount, { color: colors.textMuted }]}>
            {filtered.length} of {concerns.length} concerns
          </Text>
        </>
      )}

      <FlatList
        data={viewMode === 'concerns' ? filtered : citizens}
        renderItem={viewMode === 'concerns' ? renderItem : renderCitizenItem}
        keyExtractor={(item, index) => (item.id ? String(item.id) : item.name || String(index))}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {viewMode === 'concerns' ? 'No concerns found' : 'No citizens found'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: scale(16),
    marginTop: verticalScale(12),
    borderRadius: moderateScale(10),
    padding: scale(4),
  },
  modeBtn: {
    flex: 1,
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  modeText: { fontSize: rf(13), fontWeight: '700' },

  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: scale(16),
    marginTop: verticalScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    borderWidth: 1,
  },
  activeFilterText: { fontSize: rf(12) },

  searchSection: {
    flexDirection: 'row',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: rf(14) },
  sortBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  sortDropdown: {
    marginHorizontal: scale(16),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: verticalScale(8),
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(12),
    borderBottomWidth: 1,
  },
  sortOptionText: { fontSize: rf(14) },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(8),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(20),
    borderWidth: 1,
  },
  filterText: { fontSize: rf(11), fontWeight: '700' },
  filterCount: { fontSize: rf(10), fontWeight: '800' },

  resultCount: {
    fontSize: rf(11),
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(8),
  },

  list: { paddingHorizontal: scale(16), paddingBottom: verticalScale(32) },

  card: {
    borderRadius: moderateScale(14),
    padding: scale(14),
    borderWidth: 1,
    marginBottom: verticalScale(10),
  },
  cardTop: {
    flexDirection: 'row',
    gap: scale(10),
    alignItems: 'flex-start',
    marginBottom: verticalScale(8),
  },
  catIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    flex: 1,
  },
  priorityDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    marginTop: verticalScale(4),
    flexShrink: 0,
  },
  cardDesc: {
    fontSize: rf(12),
    lineHeight: rf(18),
    marginBottom: verticalScale(10),
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  statusPill: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(20),
  },
  statusText: { fontSize: rf(10), fontWeight: '700' },
  cardMeta: { fontSize: rf(11) },
  upvotes: {
    fontSize: rf(11),
    fontWeight: '700',
    marginLeft: 'auto',
  },
  cardDate: { fontSize: rf(10), marginTop: verticalScale(8) },
  badge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(10),
  },

  empty: { alignItems: 'center', paddingVertical: verticalScale(60) },
  emptyText: { marginTop: verticalScale(12), fontSize: rf(15) },
});
