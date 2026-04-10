import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, Alert, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConcerns } from '../../context/ConcernContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge, CategoryBadge } from '../../components/UI';
import { COLORS, STATUS_CONFIG } from '../../utils/theme';

export default function ConcernDetailScreen({ route, navigation }) {
  const { concernId } = route.params;
  const { concerns, toggleUpvote, deleteConcern } = useConcerns();
  const { user } = useAuth();
  const { t } = useLanguage();

  const concern = concerns.find(c => c.id === concernId);
  const isOwner = concern?.userId === user?.uid;
  const isUpvoted = concern?.upvotedBy?.includes(user?.uid);

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
        <Text style={styles.notFoundText}>Concern not found</Text>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[concern.status] || STATUS_CONFIG['Pending'];
  const timelineSteps = buildTimeline(concern, t);
  const fmt = (ts) => ts?.toDate?.()?.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) || '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>

      {/* Image */}
      {concern.imageUrl ? (
        <Image source={{ uri: concern.imageUrl }} style={styles.heroImage} />
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
          <MetaItem icon="person-outline" label={t('submittedBy')} value={concern.userName} />
          <MetaItem icon="location-outline" label="Barangay" value={concern.userBarangay} />
          <MetaItem icon="calendar-outline" label={t('dateFiled')} value={fmt(concern.createdAt)} />
          <MetaItem icon="thumbs-up-outline" label={t('communityUpvotes')} value={`${concern.upvotes || 0} votes`} />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <Text style={styles.description}>{concern.description}</Text>
        </View>

        {/* Location */}
        {concern.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Location</Text>
            <TouchableOpacity
              style={styles.locationCard}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${concern.location.latitude},${concern.location.longitude}`)}
            >
              <Ionicons name="location" size={20} color={COLORS.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationAddr}>{concern.location.address}</Text>
                <Text style={styles.locationCoords}>Tap to open in Maps</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Official Response */}
        {concern.adminNote && (
          <View style={[styles.section, styles.adminNoteCard]}>
            <View style={styles.adminNoteHeader}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.accent} />
              <Text style={styles.adminNoteTitle}>{t('officialResponse')}</Text>
            </View>
            <Text style={styles.adminNoteText}>{concern.adminNote}</Text>
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
  const fmt = (d) => d?.toDate?.()?.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) || '—';
  const steps = [{ event: t('concernSubmitted'), date: fmt(c.createdAt) }];
  if (c.status === 'In Progress' || c.status === 'Resolved' || c.status === 'Rejected') {
    steps.push({ event: t('assignedToTeam'), date: fmt(c.updatedAt) });
  }
  if (c.status === 'Resolved') {
    steps.push({ event: t('workStarted'), date: fmt(c.updatedAt) });
    steps.push({ event: t('concernResolved'), date: fmt(c.updatedAt) });
  }
  if (c.status === 'Rejected') {
    steps.push({ event: t('concernRejected'), date: fmt(c.updatedAt) });
  }
  return steps;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { paddingBottom: 40 },

  heroImage: { width: '100%', height: 220 },
  heroPlaceholder: { height: 120, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center' },

  body: { padding: 20 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  priorityText: { fontSize: 11, fontWeight: '700' },

  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 16, lineHeight: 30 },

  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  metaItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', width: '47%', backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  metaLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 },
  description: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 24 },

  locationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  locationAddr: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  locationCoords: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  adminNoteCard: { backgroundColor: COLORS.accent + '11', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.accent + '44' },
  adminNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  adminNoteTitle: { color: COLORS.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  adminNoteText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 22 },

  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineEvent: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  timelineDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },

  upvoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14,
  },
  upvoteBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  upvoteBtnText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '700' },

  notFound: { flex: 1, backgroundColor: COLORS.bgDark, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: COLORS.textSecondary, fontSize: 16, marginTop: 12 },
});