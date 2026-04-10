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
import { COLORS } from '../../utils/theme';

const FILTERS = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];
const STATUS_COLORS = { Pending: COLORS.statusPending, 'In Progress': COLORS.primary, Resolved: COLORS.accent, Rejected: COLORS.statusRejected };

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
                const active = activeFilter === f;
                const color = STATUS_COLORS[f] || COLORS.primary;
                const count = f === 'All' ? myConcerns.length : myConcerns.filter(c => c.status === f).length;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterTab, active && { backgroundColor: color + '22', borderColor: color }]}
                    onPress={() => setActiveFilter(f)}
                  >
                    <Text style={[styles.filterTabText, active && { color }]}>
                      {f === 'All' ? t('all') : f === 'In Progress' ? t('inProgress') : t(f.toLowerCase())}
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
  list: { padding: 16, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  filterScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  filterTabText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  filterBadge: { backgroundColor: COLORS.bgCardAlt, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800' },

  resultLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
});