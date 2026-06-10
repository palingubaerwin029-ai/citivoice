import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConcernService } from '../../services/concernService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

export default function AdminProfileScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const [concerns, setConcerns] = useState([]);

  useEffect(() => {
    const fetchConcerns = async () => {
      try {
        const data = await ConcernService.getConcerns();
        setConcerns(data);
      } catch (err) {}
    };
    fetchConcerns();
  }, []);

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';

  const stats = {
    total: concerns.length,
    pending: concerns.filter((c) => c.status === 'Pending').length,
    inProgress: concerns.filter((c) => c.status === 'In Progress').length,
    resolved: concerns.filter((c) => c.status === 'Resolved').length,
    rejected: concerns.filter((c) => c.status === 'Rejected').length,
  };
  const resolutionRate = stats.total ? Math.round((stats.resolved / stats.total) * 100) : 0;

  const topCategory = (() => {
    const map = concerns.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  })();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const infoRows = [
    { icon: 'person-outline', label: 'Full Name', value: user?.name },
    { icon: 'mail-outline', label: 'Email', value: user?.email },
    { icon: 'shield-checkmark-outline', label: 'Role', value: 'Administrator' },
    { icon: 'call-outline', label: 'Phone', value: user?.phone || '—' },
    {
      icon: 'calendar-outline',
      label: 'Admin since',
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })
        : '—',
    },
  ];

  const systemStats = [
    {
      label: 'Total Concerns',
      value: stats.total,
      icon: '📋',
      color: colors.primary,
    },
    {
      label: 'Resolution Rate',
      value: `${resolutionRate}%`,
      icon: '🎯',
      color: colors.accent,
    },
    {
      label: 'Pending Review',
      value: stats.pending,
      icon: '⏳',
      color: colors.statusPending,
    },
    {
      label: 'Top Category',
      value: topCategory?.split(' ')[0] || '—',
      icon: '🏷️',
      color: colors.accentWarm || colors.primaryLight,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Admin Identity Card */}
        <View
          style={[
            styles.identityCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <View style={styles.avatarWrap}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.accent, shadowColor: colors.accent },
              ]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View
              style={[
                styles.adminBadge,
                { backgroundColor: colors.primary, borderColor: colors.bgCard },
              ]}
            >
              <Ionicons name="shield-checkmark" size={12} color="#fff" />
            </View>
          </View>
          <Text style={[styles.adminName, { color: colors.textPrimary }]}>{user?.name}</Text>
          <Text style={[styles.adminEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View
            style={[
              styles.rolePill,
              { backgroundColor: colors.accent + '22', borderColor: colors.accent + '44' },
            ]}
          >
            <Ionicons name="shield" size={12} color={colors.accent} />
            <Text style={[styles.roleText, { color: colors.accent }]}>
              Administrator · CitiVoice
            </Text>
          </View>
        </View>

        {/* System Stats */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            📊 System Overview
          </Text>
        </View>
        <View style={styles.statsGrid}>
          {systemStats.map((s, i) => (
            <View
              key={i}
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.bgCard,
                  borderColor: colors.border,
                  borderTopColor: s.color,
                },
              ]}
            >
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Status Breakdown */}
        <View
          style={[
            styles.breakdownCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.breakdownTitle, { color: colors.textPrimary }]}>
            📈 Concern Status Breakdown
          </Text>
          {[
            {
              label: 'Pending',
              value: stats.pending,
              color: colors.statusPending,
            },
            {
              label: 'In Progress',
              value: stats.inProgress,
              color: colors.primary,
            },
            { label: 'Resolved', value: stats.resolved, color: colors.accent },
            {
              label: 'Rejected',
              value: stats.rejected,
              color: colors.statusRejected,
            },
          ].map((s) => {
            const pct = stats.total ? Math.round((s.value / stats.total) * 100) : 0;
            return (
              <View key={s.label} style={styles.breakdownRow}>
                <View style={styles.breakdownLeft}>
                  <View style={[styles.breakdownDot, { backgroundColor: s.color }]} />
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                    {s.label}
                  </Text>
                </View>
                <View style={styles.breakdownBarWrap}>
                  <View style={[styles.breakdownBarBg, { backgroundColor: colors.bgCardAlt }]}>
                    <View
                      style={[
                        styles.breakdownBarFill,
                        { width: `${pct}%`, backgroundColor: s.color },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.breakdownCount, { color: s.color }]}>{s.value}</Text>
              </View>
            );
          })}
        </View>

        {/* Account Info */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>👤 Account Info</Text>
        </View>
        <View
          style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        >
          {infoRows.map((row, i) => (
            <View
              key={i}
              style={[
                styles.infoRow,
                i < infoRows.length - 1 && [
                  styles.infoRowBorder,
                  { borderBottomColor: colors.border },
                ],
              ]}
            >
              <View style={styles.infoLeft}>
                <View style={[styles.infoIconWrap, { backgroundColor: colors.bgCardAlt }]}>
                  <Ionicons name={row.icon} size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.statusRejected + '55' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.statusRejected} />
          <Text style={[styles.logoutText, { color: colors.statusRejected }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          CitiVoice Admin v2.0 · Powered by Express API
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: scale(20), paddingBottom: verticalScale(48) },

  identityCard: {
    alignItems: 'center',
    borderRadius: moderateScale(20),
    padding: scale(24),
    borderWidth: 1,
    marginBottom: verticalScale(24),
  },
  avatarWrap: { position: 'relative', marginBottom: verticalScale(14) },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: moderateScale(22),
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: verticalScale(6) },
    shadowOpacity: 0.4,
    shadowRadius: scale(12),
    elevation: 8,
  },
  avatarText: { color: '#fff', fontSize: rf(30), fontWeight: '900' },
  adminBadge: {
    position: 'absolute',
    bottom: verticalScale(-4),
    right: scale(-4),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  adminName: {
    fontSize: rf(22),
    fontWeight: '900',
    marginBottom: verticalScale(4),
  },
  adminEmail: { fontSize: rf(13), marginBottom: verticalScale(10) },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderWidth: 1,
  },
  roleText: { fontSize: rf(12), fontWeight: '700' },

  sectionHeader: { marginBottom: verticalScale(12) },
  sectionTitle: { fontSize: rf(16), fontWeight: '700' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    marginBottom: verticalScale(20),
  },
  statCard: {
    width: '47%',
    borderRadius: moderateScale(14),
    padding: scale(14),
    alignItems: 'center',
    borderWidth: 1,
    borderTopWidth: 3,
  },
  statIcon: { fontSize: rf(20), marginBottom: verticalScale(6) },
  statNum: { fontSize: rf(22), fontWeight: '900' },
  statLabel: {
    fontSize: rf(10),
    marginTop: verticalScale(4),
    textAlign: 'center',
  },

  breakdownCard: {
    borderRadius: moderateScale(16),
    padding: scale(16),
    borderWidth: 1,
    marginBottom: verticalScale(24),
  },
  breakdownTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    marginBottom: verticalScale(14),
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(10),
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    width: scale(90),
  },
  breakdownDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  breakdownLabel: { fontSize: rf(12) },
  breakdownBarWrap: { flex: 1 },
  breakdownBarBg: {
    height: verticalScale(6),
    borderRadius: scale(3),
  },
  breakdownBarFill: { height: verticalScale(6), borderRadius: scale(3) },
  breakdownCount: {
    fontSize: rf(13),
    fontWeight: '800',
    width: scale(28),
    textAlign: 'right',
  },

  infoCard: {
    borderRadius: moderateScale(16),
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: verticalScale(20),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(14),
  },
  infoRowBorder: { borderBottomWidth: 1 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  infoIconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: rf(14) },
  infoValue: {
    fontSize: rf(14),
    fontWeight: '600',
    maxWidth: scale(160),
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    borderWidth: 1,
    borderRadius: moderateScale(14),
    padding: scale(14),
    marginBottom: verticalScale(20),
  },
  logoutText: { fontSize: rf(15), fontWeight: '700' },

  versionText: { fontSize: rf(11), textAlign: 'center' },
});
