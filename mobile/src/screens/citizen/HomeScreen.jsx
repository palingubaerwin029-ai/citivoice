import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
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
  const { concerns, myStats, fetchStats, loading, loadFeed } = useConcerns();

  const FILTER_COLOR = {
    all: colors.primaryLight,
    Pending: colors.statusPending,
    'In Progress': colors.statusInProgress,
    Resolved: colors.statusResolved,
    Rejected: colors.statusRejected,
  };
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();

  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Refresh exact concern stats whenever HomeScreen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (fetchStats) fetchStats();
    }, [fetchStats])
  );

  const firstName = user && user.name ? user.name.split(' ')[0] : 'there';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const safeConcerns = Array.isArray(concerns) ? concerns : [];

  const stats = useMemo(
    () => ({
      total: myStats?.total ?? safeConcerns.length,
      pending: myStats?.pending ?? safeConcerns.filter((c) => c.status === 'Pending').length,
      inProgress: myStats?.inProgress ?? safeConcerns.filter((c) => c.status === 'In Progress').length,
      resolved: myStats?.resolved ?? safeConcerns.filter((c) => c.status === 'Resolved').length,
      rejected: myStats?.rejected ?? safeConcerns.filter((c) => c.status === 'Rejected').length,
    }),
    [myStats, safeConcerns],
  );

  const fetchPage = async (p, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    
    const res = await loadFeed(p, 10, isRefresh);
    
    // Stop pagination when we've reached the last page or got no data
    if (res && res.totalPages) {
      setHasMore(p < res.totalPages);
    } else if (!res || !res.data || res.data.length === 0) {
      setHasMore(false);
    }

    if (isRefresh) setRefreshing(false);
    else setLoadingMore(false);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && !refreshing && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPage(nextPage, false);
    }
  };

  const filtered = useMemo(
    () =>
      safeConcerns.filter((c) => {
        return activeFilter === 'all' || c.status === activeFilter;
      }),
    [safeConcerns, activeFilter],
  );

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(1);
    fetchPage(1, true);
    if (fetchStats) fetchStats();
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <Text style={{ textAlign: 'center', padding: 10, color: colors.textMuted }}>Loading more...</Text> : null}
        ListHeaderComponent={
          <>
            {/* ── Top bar ── */}
            {/* ── Top bar ── */}
            <View style={[S.topBar, { backgroundColor: 'transparent' }]}>
              <View style={{ flex: 1 }}>
                <View style={S.brandRow}>
                  <Text style={[S.brandTitle, { color: colors.primary }]}>
                    CitiVoice
                  </Text>
                  <View style={[S.civicBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '33' }]}>
                    <Text style={[S.civicBadgeText, { color: colors.primary }]}>KABANKALAN</Text>
                  </View>
                </View>
                <Text style={[S.greeting, { color: colors.textPrimary }]}>
                  {greeting()}, {firstName} 👋
                </Text>
                <Text style={[S.subGreeting, { color: colors.textMuted }]}>
                  {t('myReports')} • {stats.total} {stats.total === 1 ? t('concern') : t('concerns')}
                </Text>
              </View>

              <View style={S.headerActions}>
                <TouchableOpacity
                  style={[S.bellBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Notifications')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
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
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={S.reportBtnText}>{t('report')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Metric / Status Filter Strip ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={S.statsContent}
              style={S.statsScroll}
            >
              {[
                {
                  key: 'all',
                  label: t('all'),
                  value: stats.total,
                  icon: 'apps-outline',
                  color: colors.primary,
                },
                {
                  key: 'Pending',
                  label: t('pending'),
                  value: stats.pending,
                  icon: 'time-outline',
                  color: colors.statusPending,
                },
                {
                  key: 'In Progress',
                  label: t('active'),
                  value: stats.inProgress,
                  icon: 'refresh-outline',
                  color: colors.statusInProgress,
                },
                {
                  key: 'Resolved',
                  label: t('resolved'),
                  value: stats.resolved,
                  icon: 'checkmark-circle-outline',
                  color: colors.statusResolved,
                },
                {
                  key: 'Rejected',
                  label: t('rejected'),
                  value: stats.rejected,
                  icon: 'close-circle-outline',
                  color: colors.statusRejected,
                },
              ].map((s, i) => {
                const isActive = activeFilter === s.key;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      S.statItem,
                      {
                        backgroundColor: isActive ? s.color + '15' : colors.bgCard,
                        borderColor: isActive ? s.color : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveFilter(s.key);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[S.statIconBox, { backgroundColor: s.color + (isActive ? '25' : '15') }]}>
                      <Ionicons name={s.icon} size={16} color={s.color} />
                    </View>
                    <View>
                      <Text style={[S.statValue, { color: colors.textPrimary }]}>{s.value}</Text>
                      <Text style={[S.statLabel, { color: isActive ? colors.textPrimary : colors.textSecondary }]}>
                        {s.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={S.resultRow}>
              <Text style={[S.resultCount, { color: colors.textSecondary }]}>
                {activeFilter === 'all'
                  ? `${stats.total} ${stats.total !== 1 ? t('concerns') : t('concern')}`
                  : activeFilter === 'Pending'
                    ? `${stats.pending} ${stats.pending !== 1 ? t('concerns') : t('concern')}`
                    : activeFilter === 'In Progress'
                      ? `${stats.inProgress} ${stats.inProgress !== 1 ? t('concerns') : t('concern')}`
                      : activeFilter === 'Resolved'
                        ? `${stats.resolved} ${stats.resolved !== 1 ? t('concerns') : t('concern')}`
                        : `${stats.rejected} ${stats.rejected !== 1 ? t('concerns') : t('concern')}`}
              </Text>
              {activeFilter !== 'all' && (
                <TouchableOpacity
                  onPress={() => setActiveFilter('all')}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[S.clearFiltersText, { color: colors.primary }]}>{t('showAll') || 'Show All'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          loading && concerns.length === 0 ? (
            renderSkeletons()
          ) : (
            <EmptyState
              icon={safeConcerns.length === 0 ? '📝' : '🔍'}
              title={t('noConcernsFound')}
              subtitle={
                safeConcerns.length === 0
                  ? t('beFirstToReport')
                  : (t('tryAdjusting') || 'Try adjusting your search or filters')
              }
              action={
                safeConcerns.length === 0
                  ? () => navigation.navigate('SubmitConcern')
                  : () => setActiveFilter('all')
              }
              actionLabel={safeConcerns.length === 0 ? t('reportConcern') : (t('showAll') || 'Show All')}
            />
          )
        }
        renderItem={({ item }) => (
          <ConcernCard
            concern={item}
            onPress={() => navigation.navigate('ConcernDetail', { concernId: item.id })}
          />
        )}
      />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: scale(16), paddingBottom: verticalScale(40) },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(14),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(4),
  },
  brandTitle: {
    fontSize: rf(22),
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  civicBadge: {
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(2),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  civicBadgeText: {
    fontSize: rf(9.5),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: rf(16.5),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subGreeting: {
    fontSize: rf(12),
    marginTop: verticalScale(2),
    fontWeight: '500',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  bellBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: -scale(2),
    right: -scale(3),
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
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(9),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  reportBtnText: { color: '#fff', fontSize: rf(13), fontWeight: '700' },

  statsScroll: { marginBottom: verticalScale(14) },
  statsContent: { gap: scale(10), paddingRight: scale(16) },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    minWidth: scale(115),
  },
  statIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: rf(16), fontWeight: '800' },
  statLabel: { fontSize: rf(11), marginTop: -verticalScale(1), fontWeight: '600' },


  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    paddingHorizontal: scale(2),
  },
  resultCount: { fontSize: rf(12), fontWeight: '600' },
  clearFiltersText: { fontSize: rf(12), fontWeight: '700' },
});
