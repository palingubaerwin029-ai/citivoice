import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SHADOWS, getCategoryConfig, getStatusConfig } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { scale, verticalScale, rf } from '../utils/responsive';
import { resolveImageUrl } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';

export default function ConcernCard({ concern, onPress }) {
  const { colors } = useTheme();

  const PRIORITY_CONFIG = {
    High: { color: colors.danger, bg: colors.danger + '18', border: colors.danger + '35' },
    Medium: { color: colors.warning, bg: colors.warning + '18', border: colors.warning + '35' },
    Low: { color: colors.success, bg: colors.success + '18', border: colors.success + '35' },
  };

  const cat = getCategoryConfig(colors)[concern.category] || getCategoryConfig(colors)['Other'];
  const status = getStatusConfig(colors)[concern.status] || getStatusConfig(colors)['Pending'];
  const prio = PRIORITY_CONFIG[concern.priority] || PRIORITY_CONFIG['Low'];
  const isHigh = concern.priority === 'High';

  const fmt = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const fmtViewed = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d)) return '';
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMins < 5) return 'Just now';
      return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <TouchableOpacity
      style={[
        S.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: isHigh ? colors.danger + '45' : colors.border,
        },
        isHigh && S.highPrioBorder,
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* ── Top Meta Bar ── */}
      <View style={S.header}>
        {/* Status Badge */}
        <View style={[S.statusChip, { backgroundColor: status.bg, borderColor: status.border }]}>
          <View style={[S.statusDot, { backgroundColor: status.color }]} />
          <Text style={[S.statusText, { color: status.color }]}>{status.label}</Text>
        </View>

        {/* Category Pill */}
        <View style={[S.catPill, { backgroundColor: cat.bg }]}>
          <Ionicons name={cat.icon} size={12} color={cat.color} />
          <Text style={[S.catText, { color: cat.color }]}>{cat.label}</Text>
        </View>

        {/* Priority Badge (if High or Medium) */}
        {concern.priority && concern.priority !== 'Low' && (
          <View style={[S.prioBadge, { backgroundColor: prio.bg, borderColor: prio.border }]}>
            <View style={[S.prioDot, { backgroundColor: prio.color }]} />
            <Text style={[S.prioText, { color: prio.color }]}>{concern.priority}</Text>
          </View>
        )}

        {/* ── Inside Red Rectangle: Admin Viewed Badge ── */}
        {concern.admin_viewed_at ? (
          <View
            style={[
              S.viewedBadge,
              {
                backgroundColor: (colors.info || '#3B82F6') + '1A',
                borderColor: (colors.info || '#3B82F6') + '40',
              },
            ]}
          >
            <Ionicons name="eye" size={10} color={colors.info || '#3B82F6'} />
            <Text style={[S.viewedText, { color: colors.info || '#3B82F6' }]}>
              Viewed {fmtViewed(concern.admin_viewed_at)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Title & Content ── */}
      <Text style={[S.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {concern.title}
      </Text>

      {concern.description ? (
        <Text style={[S.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {concern.description}
        </Text>
      ) : null}

      {/* ── Media Preview (Cleanly placed in card body) ── */}
      {(() => {
        const imgUri = resolveImageUrl(concern?.image_url);
        if (!imgUri) return null;
        return (
          <View style={[S.imageContainer, { borderColor: colors.border }]}>
            <Image
              source={{ uri: imgUri }}
              style={S.image}
              resizeMode="cover"
            />
          </View>
        );
      })()}

      {/* ── Bottom Location ── */}
      <View style={[S.footer, { borderTopColor: colors.border }]}>
        <View style={S.locationRow}>
          <Ionicons name="location-sharp" size={13} color={colors.primary} />
          <Text style={[S.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {concern.location_address || 'Kabankalan City'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: verticalScale(14),
    overflow: 'hidden',
  },
  highPrioBorder: {
    borderLeftWidth: scale(3.5),
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(10),
  },

  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.full,
  },
  catText: {
    fontSize: rf(11),
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  prioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  prioDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(2.5),
  },
  prioText: {
    fontSize: rf(10),
    fontWeight: '700',
  },

  viewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(3),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  viewedText: {
    fontSize: rf(9.5),
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  dateText: {
    fontSize: rf(11),
    fontWeight: '500',
  },

  title: {
    fontSize: rf(15.5),
    fontWeight: '700',
    lineHeight: rf(22),
    letterSpacing: -0.3,
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(6),
  },

  desc: {
    fontSize: rf(13.5),
    lineHeight: rf(19),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
  },

  imageContainer: {
    marginHorizontal: scale(16),
    marginBottom: verticalScale(12),
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: verticalScale(170),
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderTopWidth: 1,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    flex: 1,
    paddingRight: scale(8),
  },
  locationText: {
    fontSize: rf(11.5),
    fontWeight: '500',
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(4),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusDot: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(2.5),
  },
  statusText: {
    fontSize: rf(10.5),
    fontWeight: '700',
  },
});

