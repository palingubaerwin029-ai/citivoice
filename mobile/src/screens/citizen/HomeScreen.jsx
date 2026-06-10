import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useConcerns } from '../../context/ConcernContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import * as Haptics from 'expo-haptics';
import ConcernCard from '../../components/ConcernCard';
import { EmptyState, StatCard, Skeleton } from '../../components/UI';
import { RADIUS, SHADOWS, STATUS_CONFIG } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

export default function HomeScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { concerns, loading, toggleUpvote, refreshConcerns } = useConcerns();

  const FILTER_COLOR = {
    all: colors.primaryLight,
    Pending: colors.statusPending,
    'In Progress': colors.statusInProgress,
    Resolved: colors.statusResolved,
  };
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'there';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const stats = useMemo(
    () => ({
      total: concerns.length,
      pending: concerns.filter((c) => c.status === 'Pending').length,
      inProgress: concerns.filter((c) => c.status === 'In Progress').length,
      resolved: concerns.filter((c) => c.status === 'Resolved').length,
    }),
    [concerns],
  );

  const filtered = useMemo(
    () =>
      concerns.filter((c) => {
        const match = activeFilter === 'all' || c.status === activeFilter;
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refreshConcerns();
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  const renderSkeletons = () => (
    <View style={{ gap: verticalScale(16), paddingHorizontal: scale(16) }}>
      {[1, 2, 3].map((key) => (
        <View
          key={key}
          style={{
            gap: verticalScale(8),
            paddingVertical: verticalScale(12),
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', gap: scale(12), alignItems: 'center' }}>
            <Skeleton width={scale(40)} height={scale(40)} borderRadius={scale(20)} />
            <View style={{ flex: 1, gap: verticalScale(4) }}>
              <Skeleton width="60%" height={verticalScale(16)} />
              <Skeleton width="40%" height={verticalScale(12)} />
            </View>
          </View>
          <Skeleton width="100%" height={verticalScale(120)} borderRadius={RADIUS.md} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* ── Top bar ── */}
            <View style={[S.topBar, { backgroundColor: colors.bgDark }]}>
              <View>
                <Text
                  style={{
                    fontSize: rf(24),
                    fontWeight: '800',
                    color: colors.primary,
                    marginBottom: verticalScale(4),
                    letterSpacing: -0.5,
                  }}
                >
                  CitiVoice
                </Text>
                <Text style={[S.greeting, { color: colors.textPrimary }]}>
                  {greeting()}, {firstName} 👋
                </Text>
                <Text style={[S.subGreeting, { color: colors.textMuted }]}>
                  {t('communityFeed')}
                </Text>
              </View>
              <View style={S.headerActions}>
                <TouchableOpacity
                  style={S.bellBtn}
                  onPress={() => navigation.navigate('Notifications')}
                >
                  <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
                  {unreadCount > 0 && (
                    <View
                      style={[
                        S.badgeCount,
                        { backgroundColor: colors.statusRejected, borderColor: colors.bgDark },
                      ]}
                    >
                      <Text style={S.badgeCountText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[S.reportBtn, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('SubmitConcern')}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={S.reportBtnText}>{t('report')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Stats strip ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.statsContent}
              style={S.statsScroll}
            >
              {[
                {
                  label: t('all'),
                  value: stats.total,
                  icon: 'apps-outline',
                  color: colors.primaryLight,
                },
                {
                  label: t('pending'),
                  value: stats.pending,
                  icon: 'time-outline',
                  color: colors.statusPending,
                },
                {
                  label: t('active'),
                  value: stats.inProgress,
                  icon: 'refresh-outline',
                  color: colors.statusInProgress,
                },
                {
                  label: t('resolved'),
                  value: stats.resolved,
                  icon: 'checkmark-circle-outline',
                  color: colors.statusResolved,
                },
              ].map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    S.statItem,
                    { backgroundColor: colors.bgCard, borderColor: colors.border },
                  ]}
                  onPress={() =>
                    setActiveFilter(
                      s.label === t('all')
                        ? 'all'
                        : s.label === t('pending')
                          ? 'Pending'
                          : s.label === t('active')
                            ? 'In Progress'
                            : 'Resolved',
                    )
                  }
                  activeOpacity={0.8}
                >
                  <View style={[S.statIconBox, { backgroundColor: s.color + '22' }]}>
                    <Ionicons name={s.icon} size={16} color={s.color} />
                  </View>
                  <View>
                    <Text style={[S.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                    <Text style={[S.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Search ── */}
            <View
              style={[S.searchWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            >
              <Ionicons name="search-outline" size={17} color={colors.textMuted} />
              <TextInput
                style={[S.searchInput, { color: colors.textPrimary }]}
                value={search}
                onChangeText={setSearch}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={17} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[S.resultCount, { color: colors.textMuted }]}>
              {filtered.length} {filtered.length !== 1 ? t('concerns') : t('concern')}
            </Text>
          </>
        }
        ListEmptyComponent={
          loading && concerns.length === 0 ? (
            renderSkeletons()
          ) : (
            <EmptyState
              icon="📭"
              title={t('noConcernsFound')}
              subtitle={t('beFirstToReport')}
              action={() => navigation.navigate('SubmitConcern')}
              actionLabel={t('reportConcern')}
            />
          )
        }
        renderItem={({ item }) => (
          <ConcernCard
            concern={item}
            onPress={() => navigation.navigate('ConcernDetail', { concernId: item.id })}
            onUpvote={() => toggleUpvote(item.id)}
            isUpvoted={false}
          />
        )}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: scale(16), paddingBottom: verticalScale(40) },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
  },
  greeting: {
    fontSize: rf(18),
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subGreeting: { fontSize: rf(12), marginTop: verticalScale(2) },

  headerActions: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  bellBtn: { position: 'relative', padding: scale(4) },
  badgeCount: {
    position: 'absolute',
    top: -scale(2),
    right: -scale(4),
    borderRadius: scale(10),
    paddingHorizontal: scale(4),
    paddingVertical: verticalScale(1),
    minWidth: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeCountText: { color: '#fff', fontSize: rf(9), fontWeight: '900' },

  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    borderRadius: RADIUS.full,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(9),
    ...SHADOWS.button,
  },
  reportBtnText: { color: '#fff', fontSize: rf(13), fontWeight: '700' },

  statsScroll: { marginBottom: verticalScale(16) },
  statsContent: { gap: scale(10), paddingRight: scale(16) },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    minWidth: scale(120),
  },
  statIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: rf(16), fontWeight: '800' },
  statLabel: { fontSize: rf(11), marginTop: -verticalScale(2) },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: RADIUS.lg,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: 1,
    marginBottom: verticalScale(12),
  },
  searchInput: { flex: 1, fontSize: rf(14) },

  filterScroll: { marginBottom: verticalScale(10) },
  filterContent: { gap: scale(8) },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  filterTabText: { fontSize: rf(12), fontWeight: '600' },
  filterBadge: {
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(1),
  },
  filterBadgeText: { fontSize: rf(10), fontWeight: '800' },

  resultCount: { fontSize: rf(12), marginBottom: verticalScale(8) },
});
