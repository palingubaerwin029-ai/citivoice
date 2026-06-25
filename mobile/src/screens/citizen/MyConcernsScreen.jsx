import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import ConcernCard from '../../components/ConcernCard';
import { EmptyState, StatCard } from '../../components/UI';
import { RADIUS } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

const FILTER_KEYS = [
  { key: 'All', tKey: 'all', icon: 'apps-outline' },
  { key: 'Pending', tKey: 'pending', icon: 'time-outline' },
  { key: 'In Progress', tKey: 'active', icon: 'refresh-outline' },
  { key: 'Resolved', tKey: 'resolved', icon: 'checkmark-circle-outline' },
];

export default function MyConcernsScreen({ navigation }) {
  const { colors } = useTheme();

  const STATUS_COLORS = {
    All: colors.primaryLight,
    Pending: colors.statusPending,
    'In Progress': colors.primary,
    Resolved: colors.accent,
    Rejected: colors.statusRejected,
  };

  const { myConcerns, loadMyConcerns, loading } = useConcerns();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = async (p, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingMore(true);
    
    await loadMyConcerns(p, 10, isRefresh);
    
    if (isRefresh) setRefreshing(false);
    else setLoadingMore(false);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPage(nextPage, false);
    }
  };

  const onRefresh = () => {
    setPage(1);
    fetchPage(1, true);
  };

  const filtered =
    activeFilter === 'All' ? myConcerns : myConcerns.filter((c) => c.status === activeFilter);

  const stats = {
    total: myConcerns.length,
    pending: myConcerns.filter((c) => c.status === 'Pending').length,
    inProgress: myConcerns.filter((c) => c.status === 'In Progress').length,
    resolved: myConcerns.filter((c) => c.status === 'Resolved').length,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
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
        ListHeaderComponent={() => (
          <>
            {/* ── Stats strip ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsContent}
              style={styles.statsScroll}
            >
              {[
                {
                  label: 'All',
                  tKey: 'all',
                  value: stats.total,
                  icon: 'apps-outline',
                  color: colors.primaryLight,
                },
                {
                  label: 'Pending',
                  tKey: 'pending',
                  value: stats.pending,
                  icon: 'time-outline',
                  color: colors.statusPending,
                },
                {
                  label: 'In Progress',
                  tKey: 'active',
                  value: stats.inProgress,
                  icon: 'refresh-outline',
                  color: colors.statusInProgress,
                },
                {
                  label: 'Resolved',
                  tKey: 'resolved',
                  value: stats.resolved,
                  icon: 'checkmark-circle-outline',
                  color: colors.statusResolved,
                },
              ].map((s, i) => {
                const isActive = activeFilter === s.label;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.statItem,
                      { backgroundColor: colors.bgCard, borderColor: colors.border },
                      isActive && { backgroundColor: s.color + '22', borderColor: s.color },
                    ]}
                    onPress={() => setActiveFilter(s.label)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.statIconBox,
                        { backgroundColor: s.color + '22' },
                        isActive && { backgroundColor: s.color },
                      ]}
                    >
                      <Ionicons name={s.icon} size={16} color={isActive ? '#fff' : s.color} />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.statValue,
                          { color: colors.textPrimary },
                          isActive && { color: s.color },
                        ]}
                      >
                        {s.value}
                      </Text>
                      <Text
                        style={[
                          styles.statLabel,
                          { color: colors.textSecondary },
                          isActive && { color: s.color },
                        ]}
                      >
                        {t(s.tKey)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.resultLabel, { color: colors.textMuted }]}>
              {filtered.length} {t('reports')}
            </Text>
          </>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={myConcerns.length === 0 ? '📝' : '🔍'}
            title={myConcerns.length === 0 ? t('noConcernsFound') : t('noConcernsFound')}
            subtitle={myConcerns.length === 0 ? t('beFirstToReport') : t('tryAdjusting')}
            action={
              myConcerns.length === 0
                ? () => navigation.navigate('Home', { screen: 'SubmitConcern' })
                : null
            }
            actionLabel={t('reportConcern')}
          />
        }
        renderItem={({ item }) => (
          <ConcernCard
            concern={item}
            onPress={() =>
              navigation.navigate('Home', {
                screen: 'ConcernDetail',
                params: { concernId: item.id },
              })
            }
            showOwnerActions
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: scale(16), paddingBottom: verticalScale(32) },

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

  resultLabel: { fontSize: rf(12), marginBottom: verticalScale(8) },
});
