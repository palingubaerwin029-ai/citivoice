import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
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
  { key: "All", tKey: "all", icon: "apps-outline" },
  { key: "Pending", tKey: "pending", icon: "time-outline" },
  { key: "In Progress", tKey: "active", icon: "refresh-outline" },
  { key: "Resolved", tKey: "resolved", icon: "checkmark-circle-outline" },
];

export default function MyConcernsScreen({ navigation }) {
  const { colors } = useTheme();
  
  const STATUS_COLORS = { 
    All: colors.primaryLight, 
    Pending: colors.statusPending, 
    'In Progress': colors.primary, 
    Resolved: colors.accent, 
    Rejected: colors.statusRejected 
  };

  const { myConcerns } = useConcerns();
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? myConcerns
    : myConcerns.filter(c => c.status === activeFilter);

  const stats = {
    total: myConcerns.length,
    pending: myConcerns.filter(c => c.status === 'Pending').length,
    inProgress: myConcerns.filter(c => c.status === 'In Progress').length,
    resolved: myConcerns.filter(c => c.status === 'Resolved').length,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard icon="📋" value={stats.total} label={t('total')} color={colors.primary} />
              <StatCard icon="⏳" value={stats.pending} label={t('pending')} color={colors.statusPending} />
              <StatCard icon="🔄" value={stats.inProgress} label={t('inProgress')} color={colors.primary} />
              <StatCard icon="✅" value={stats.resolved} label={t('done')} color={colors.accent} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterScroll}>
              {FILTER_KEYS.map(f => {
                const active = activeFilter === f.key;
                const color = STATUS_COLORS[f.key] || colors.primary;
                const count = f.key === 'All' ? myConcerns.length : myConcerns.filter(c => c.status === f.key).length;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterTab, { backgroundColor: colors.bgCard, borderColor: colors.border }, active && { backgroundColor: color + '22', borderColor: color }]}
                    onPress={() => setActiveFilter(f.key)}
                  >
                    <Ionicons
                      name={f.icon}
                      size={14}
                      color={active ? color : colors.textMuted}
                    />
                    <Text style={[styles.filterTabText, { color: colors.textMuted }, active && { color }]}>
                      {t(f.tKey)}
                    </Text>
                    <View style={[styles.filterBadge, { backgroundColor: colors.bgCardAlt }, active && { backgroundColor: color }]}>
                      <Text style={[styles.filterBadgeText, { color: colors.textMuted }, active && { color: '#fff' }]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.resultLabel, { color: colors.textMuted }]}>{filtered.length} {t('reports')}</Text>
          </>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={myConcerns.length === 0 ? '📝' : '🔍'}
            title={myConcerns.length === 0 ? t('noConcernsFound') : t('noConcernsFound')}
            subtitle={myConcerns.length === 0 ? t('beFirstToReport') : t('tryAdjusting')}
            action={myConcerns.length === 0 ? () => navigation.navigate('Home', { screen: 'SubmitConcern' }) : null}
            actionLabel={t('reportConcern')}
          />
        }
        renderItem={({ item }) => (
          <ConcernCard
            concern={item}
            onPress={() => navigation.navigate('Home', { screen: 'ConcernDetail', params: { concernId: item.id } })}
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

  statsRow: { flexDirection: 'row', gap: scale(8), marginBottom: verticalScale(16) },

  filterScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: verticalScale(12) },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(7), borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  filterTabText: { fontSize: rf(12), fontWeight: '600' },
  filterBadge: { borderRadius: moderateScale(10), paddingHorizontal: scale(6), paddingVertical: verticalScale(1) },
  filterBadgeText: { fontSize: rf(10), fontWeight: '800' },

  resultLabel: { fontSize: rf(12), marginBottom: verticalScale(8) },
});