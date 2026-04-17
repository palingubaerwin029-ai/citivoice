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
import { COLORS, RADIUS } from '../../utils/theme';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

const FILTERS = [
  { key: "All", label: "All", icon: "apps-outline" },
  { key: "Pending", label: "Pending", icon: "time-outline" },
  { key: "In Progress", label: "Active", icon: "refresh-outline" },
  { key: "Resolved", label: "Resolved", icon: "checkmark-circle-outline" },
];
const STATUS_COLORS = { All: COLORS.primaryLight, Pending: COLORS.statusPending, 'In Progress': COLORS.primary, Resolved: COLORS.accent, Rejected: COLORS.statusRejected };

export default function MyConcernsScreen({ navigation }) {
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              <StatCard icon="📋" value={stats.total} label={t('total')} color={COLORS.primary} />
              <StatCard icon="⏳" value={stats.pending} label={t('pending')} color={COLORS.statusPending} />
              <StatCard icon="🔄" value={stats.inProgress} label={t('inProgress')} color={COLORS.primary} />
              <StatCard icon="✅" value={stats.resolved} label={t('done')} color={COLORS.accent} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterScroll}>
              {FILTERS.map(f => {
                const active = activeFilter === f.key;
                const color = STATUS_COLORS[f.key] || COLORS.primary;
                const count = f.key === 'All' ? myConcerns.length : myConcerns.filter(c => c.status === f.key).length;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterTab, active && { backgroundColor: color + '22', borderColor: color }]}
                    onPress={() => setActiveFilter(f.key)}
                  >
                    <Ionicons
                      name={f.icon}
                      size={14}
                      color={active ? color : COLORS.textMuted}
                    />
                    <Text style={[styles.filterTabText, active && { color }]}>
                      {f.label}
                    </Text>
                    <View style={[styles.filterBadge, active && { backgroundColor: color }]}>
                      <Text style={[styles.filterBadgeText, active && { color: '#fff' }]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.resultLabel}>{filtered.length} reports</Text>
          </>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={myConcerns.length === 0 ? '📝' : '🔍'}
            title={myConcerns.length === 0 ? 'No reports yet' : 'No concerns found'}
            subtitle={myConcerns.length === 0 ? 'Start reporting issues in your community.' : 'Try a different filter.'}
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
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  list: { padding: scale(16), paddingBottom: verticalScale(32) },

  statsRow: { flexDirection: 'row', gap: scale(8), marginBottom: verticalScale(16) },

  filterScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: verticalScale(12) },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(7), borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  filterTabText: { color: COLORS.textMuted, fontSize: rf(12), fontWeight: '600' },
  filterBadge: { backgroundColor: COLORS.bgCardAlt, borderRadius: moderateScale(10), paddingHorizontal: scale(6), paddingVertical: verticalScale(1) },
  filterBadgeText: { color: COLORS.textMuted, fontSize: rf(10), fontWeight: '800' },

  resultLabel: { color: COLORS.textMuted, fontSize: rf(12), marginBottom: verticalScale(8) },
});