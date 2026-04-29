import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, Alert, StyleSheet, Linking, Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useConcerns } from '../../context/ConcernContext';
import { useAuth, resolveImageUrl } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge, CategoryBadge } from '../../components/UI';
import { COLORS, STATUS_CONFIG } from '../../utils/theme';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

export default function ConcernDetailScreen({ route, navigation }) {
  const { concernId } = route.params;
  const { concerns, toggleUpvote, deleteConcern } = useConcerns();
  const { user } = useAuth();
  const { t } = useLanguage();

  const concern = concerns.find(c => c.id === concernId);
  const isOwner = concern?.user_id === user?.id;
  const isUpvoted = false;

  useEffect(() => {
    navigation.setOptions({
      title: t('concernDetail'),
      headerRight: isOwner
        ? () => (
          <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={20} color={COLORS.statusRejected} />
          </TouchableOpacity>
        )
        : null,
    });
  }, [concern, isOwner]);

  const handleDelete = () => {
    Alert.alert(t('deleteConcern'), t('deleteConfirm'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteConcern(concernId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleUpvote = async () => {
    try { await toggleUpvote(concernId); } catch { }
  };

  if (!concern) {
    return (
      <View style={styles.notFound}>
        <Text style={{ fontSize: 40 }}>🔍</Text>
        <Text style={styles.notFoundText}>{t('concernNotFound')}</Text>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[concern.status] || STATUS_CONFIG['Pending'];
  const timelineSteps = buildTimeline(concern, t);
  const fmt = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return isNaN(d) ? '—' : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>

      {/* Image */}
      {concern.image_url ? (
        <Image source={{ uri: resolveImageUrl(concern.image_url) }} style={styles.heroImage} />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Ionicons name="image-outline" size={40} color={COLORS.textMuted} />
        </View>
      )}

      <View style={styles.body}>
        {/* Status + Category */}
        <View style={styles.badgeRow}>
          <StatusBadge status={concern.status} />
          <CategoryBadge category={concern.category} />
          <View style={[styles.priorityBadge, { backgroundColor: concern.priority === 'High' ? '#FF444422' : concern.priority === 'Medium' ? '#FFB80022' : '#00D4AA22' }]}>
            <Text style={[styles.priorityText, { color: concern.priority === 'High' ? '#FF4444' : concern.priority === 'Medium' ? '#FFB800' : '#00D4AA' }]}>
              {concern.priority === 'High' ? '🔴' : concern.priority === 'Medium' ? '🟡' : '🟢'} {concern.priority}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{concern.title}</Text>

        {/* Meta */}
        <View style={styles.metaGrid}>
          <MetaItem icon="person-outline" label={t('submittedBy')} value={concern.user_name || "Anonymous Citizen"} />
          <MetaItem icon="location-outline" label={t('barangay')} value={concern.user_barangay || "Location Protected"} />
          <MetaItem icon="calendar-outline" label={t('dateFiled')} value={fmt(concern.created_at)} />
          <MetaItem icon="thumbs-up-outline" label={t('communityUpvotes')} value={`${concern.upvotes || 0} votes`} />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 {t('description')}</Text>
          <Text style={styles.description}>{concern.description}</Text>
        </View>

        {/* Location */}
        {concern.location_lat && concern.location_lng && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 {t('location')}</Text>

            {/* Mini Map */}
            <View style={styles.miniMapContainer}>
              <MapView
                style={styles.miniMap}
                initialRegion={{
                  latitude: Number(concern.location_lat),
                  longitude: Number(concern.location_lng),
                  latitudeDelta: 0.006,
                  longitudeDelta: 0.006,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: Number(concern.location_lat),
                    longitude: Number(concern.location_lng),
                  }}
                  tracksViewChanges={false}
                >
                  <View style={styles.miniMapPin}>
                    <Ionicons name="location" size={24} color={COLORS.primary} />
                  </View>
                </Marker>
              </MapView>
            </View>

            {/* Address + Open in Maps */}
            <TouchableOpacity
              style={styles.locationCard}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${concern.location_lat},${concern.location_lng}`)}
            >
              <Ionicons name="location" size={20} color={COLORS.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationAddr}>
                  {concern.location_address || `${Number(concern.location_lat).toFixed(5)}, ${Number(concern.location_lng).toFixed(5)}`}
                </Text>
                <Text style={styles.locationCoords}>{t('tapToOpenMaps')}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Official Response */}
        {concern.admin_note && (
          <View style={[styles.section, styles.adminNoteCard]}>
            <View style={styles.adminNoteHeader}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.accent} />
              <Text style={styles.adminNoteTitle}>{t('officialResponse')}</Text>
            </View>
            <Text style={styles.adminNoteText}>{concern.admin_note}</Text>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 {t('timeline')}</Text>
          {timelineSteps.map((step, i) => (
            <View key={i} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: statusCfg.color }]} />
                {i < timelineSteps.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineEvent}>{step.event}</Text>
                <Text style={styles.timelineDate}>{step.date}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Upvote Button */}
        <TouchableOpacity
          style={[styles.upvoteBtn, isUpvoted && styles.upvoteBtnActive]}
          onPress={handleUpvote}
        >
          <Ionicons
            name={isUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
            size={20}
            color={isUpvoted ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.upvoteBtnText, isUpvoted && { color: COLORS.primary }]}>
            {isUpvoted ? t('youUpvoted') : t('upvoteThis')} · {concern.upvotes || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MetaItem({ icon, label, value }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={16} color={COLORS.textMuted} />
      <View>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

function buildTimeline(c, t) {
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const steps = [{ event: t('concernSubmitted'), date: fmt(c.created_at) }];
  if (c.status === 'In Progress' || c.status === 'Resolved' || c.status === 'Rejected') {
    steps.push({ event: t('assignedToTeam'), date: fmt(c.updated_at) });
  }
  if (c.status === 'Resolved') {
    steps.push({ event: t('workStarted'), date: fmt(c.updated_at) });
    steps.push({ event: t('concernResolved'), date: fmt(c.updated_at) });
  }
  if (c.status === 'Rejected') {
    steps.push({ event: t('concernRejected'), date: fmt(c.updated_at) });
  }
  return steps;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { paddingBottom: verticalScale(40) },

  heroImage: { width: '100%', height: verticalScale(220) },
  heroPlaceholder: { height: verticalScale(120), backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center' },

  body: { padding: scale(20) },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: verticalScale(14) },
  priorityBadge: { paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: moderateScale(20) },
  priorityText: { fontSize: rf(11), fontWeight: '700' },

  title: { color: COLORS.textPrimary, fontSize: rf(22), fontWeight: '800', marginBottom: verticalScale(16), lineHeight: rf(30) },

  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginBottom: verticalScale(20) },
  metaItem: { flexDirection: 'row', gap: scale(8), alignItems: 'flex-start', width: '47%', backgroundColor: COLORS.bgCard, borderRadius: moderateScale(10), padding: scale(10), borderWidth: 1, borderColor: COLORS.border },
  metaLabel: { color: COLORS.textMuted, fontSize: rf(10), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { color: COLORS.textPrimary, fontSize: rf(13), fontWeight: '600', marginTop: verticalScale(2) },

  section: { marginBottom: verticalScale(20) },
  sectionTitle: { color: COLORS.textSecondary, fontSize: rf(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: verticalScale(10) },
  description: { color: COLORS.textPrimary, fontSize: rf(15), lineHeight: rf(24) },

  locationCard: { flexDirection: 'row', alignItems: 'center', gap: scale(10), backgroundColor: COLORS.bgCard, borderRadius: moderateScale(12), padding: scale(14), borderWidth: 1, borderColor: COLORS.border },
  locationAddr: { color: COLORS.textPrimary, fontSize: rf(14), fontWeight: '600' },
  locationCoords: { color: COLORS.textMuted, fontSize: rf(11), marginTop: verticalScale(2) },

  miniMapContainer: {
    height: verticalScale(160), borderRadius: moderateScale(12), overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: verticalScale(10),
  },
  miniMap: { flex: 1 },
  miniMapPin: { alignItems: 'center', justifyContent: 'center' },

  adminNoteCard: { backgroundColor: COLORS.accent + '11', borderRadius: moderateScale(14), padding: scale(14), borderWidth: 1, borderColor: COLORS.accent + '44' },
  adminNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: verticalScale(8) },
  adminNoteTitle: { color: COLORS.accent, fontSize: rf(12), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  adminNoteText: { color: COLORS.textPrimary, fontSize: rf(14), lineHeight: rf(22) },

  timelineItem: { flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(4) },
  timelineLeft: { alignItems: 'center', width: scale(16) },
  timelineDot: { width: scale(12), height: scale(12), borderRadius: scale(6), marginTop: verticalScale(3) },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: verticalScale(4) },
  timelineContent: { flex: 1, paddingBottom: verticalScale(16) },
  timelineEvent: { color: COLORS.textPrimary, fontSize: rf(13), fontWeight: '600' },
  timelineDate: { color: COLORS.textMuted, fontSize: rf(11), marginTop: verticalScale(3) },

  upvoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    borderWidth: 1, borderColor: COLORS.border, borderRadius: moderateScale(14), padding: scale(14),
  },
  upvoteBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  upvoteBtnText: { color: COLORS.textMuted, fontSize: rf(15), fontWeight: '700' },

  notFound: { flex: 1, backgroundColor: COLORS.bgDark, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: COLORS.textSecondary, fontSize: rf(16), marginTop: verticalScale(12) },
});