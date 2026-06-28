import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  Linking,
  Platform,
  Modal,
  Animated,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useConcerns } from '../../context/ConcernContext';
import { useAuth, resolveImageUrl, mobileApi } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge, CategoryBadge } from '../../components/UI';
import { getStatusConfig } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

export default function ConcernDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { concernId } = route.params;
  const { concerns, toggleUpvote, deleteConcern } = useConcerns();
  const { user } = useAuth();
  const { t } = useLanguage();

  const concern = concerns.find((c) => c.id === concernId);
  const isOwner = concern?.user_id === user?.id;
  const canDelete = isOwner && concern?.status === 'Pending';
  const isUpvoted = false;
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Workflow state
  const [assignments, setAssignments] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const fetchWorkflowData = async () => {
      try {
        const [aRes, cRes] = await Promise.all([
          mobileApi.get(`/concerns/${concernId}/assignments`),
          mobileApi.get(`/concerns/${concernId}/comments`),
        ]);
        setAssignments(aRes.data || aRes || []);
        setComments(cRes.data || cRes || []);
      } catch (err) {
        console.log('Failed to fetch workflow data', err);
      }
    };
    fetchWorkflowData();
  }, [concernId]);

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await mobileApi.post(`/concerns/${concernId}/comments`, { comment: newComment.trim() });
      setNewComment('');
      const cRes = await mobileApi.get(`/concerns/${concernId}/comments`);
      setComments(cRes.data || cRes || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to post comment');
    }
    setPosting(false);
  };

  // Custom header replaces navigation.setOptions

  const handleDelete = () => {
    Alert.alert(t('deleteConcern'), t('deleteConfirm'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConcern(concernId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleUpvote = async () => {
    try {
      await toggleUpvote(concernId);
    } catch {}
  };

  if (!concern) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.bgDark }]}>
        <Text style={{ fontSize: 40 }}>🔍</Text>
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
          {t('concernNotFound')}
        </Text>
      </View>
    );
  }

  const statusCfg = getStatusConfig(colors)[concern.status] || getStatusConfig(colors)['Pending'];
  const timelineSteps = buildTimeline(concern, t);

  const [anim] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, {
      toValue: timelineSteps.length,
      duration: timelineSteps.length * 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const fmt = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return isNaN(d)
      ? '—'
      : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgDark }]}
      edges={['top', 'bottom']}
    >
      {/* ── Custom Header ── */}
      <View
        style={[
          styles.customHeader,
          { backgroundColor: colors.bgCard, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('concernDetail')}
        </Text>
        {canDelete ? (
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.statusRejected} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Image */}
        {concern.image_url ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setImageModalVisible(true)}>
            <Image source={{ uri: resolveImageUrl(concern.image_url) }} style={styles.heroImage} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: colors.bgCard }]}>
            <Ionicons name="image-outline" size={40} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.body}>
          {/* Status + Category */}
          <View style={styles.badgeRow}>
            <StatusBadge status={concern.status} />
            <CategoryBadge category={concern.category} />
            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor:
                    concern.priority === 'High'
                      ? colors.statusRejected + '22'
                      : concern.priority === 'Medium'
                        ? colors.statusPending + '22'
                        : colors.statusResolved + '22',
                },
              ]}
            >
              <Text
                style={[
                  styles.priorityText,
                  {
                    color:
                      concern.priority === 'High'
                        ? colors.statusRejected
                        : concern.priority === 'Medium'
                          ? colors.statusPending
                          : colors.statusResolved,
                  },
                ]}
              >
                {concern.priority === 'High' ? '🔴' : concern.priority === 'Medium' ? '🟡' : '🟢'}{' '}
                {concern.priority}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{concern.title}</Text>

          {/* Meta */}
          <View style={styles.metaGrid}>
            <MetaItem
              icon="person-outline"
              label={t('submittedBy')}
              value={concern.user_name || 'Anonymous Citizen'}
              colors={colors}
            />
            <MetaItem
              icon="location-outline"
              label={t('barangay')}
              value={concern.user_barangay || 'Location Protected'}
              colors={colors}
            />
            <MetaItem
              icon="calendar-outline"
              label={t('dateFiled')}
              value={fmt(concern.created_at)}
              colors={colors}
            />
            <MetaItem
              icon="thumbs-up-outline"
              label={t('communityUpvotes')}
              value={`${concern.upvotes || 0} votes`}
              colors={colors}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              📝 {t('description')}
            </Text>
            <Text style={[styles.description, { color: colors.textPrimary }]}>
              {concern.description}
            </Text>
          </View>

          {/* Location */}
          {concern.location_lat && concern.location_lng && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                📍 {t('location')}
              </Text>

              {/* Mini Map */}
              <View style={[styles.miniMapContainer, { borderColor: colors.border }]}>
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
                  >
                    <View style={styles.miniMapPin}>
                      <Ionicons name="location" size={24} color={colors.primary} />
                    </View>
                  </Marker>
                </MapView>
              </View>

              {/* Address + Open in Maps */}
              <TouchableOpacity
                style={[
                  styles.locationCard,
                  { backgroundColor: colors.bgCard, borderColor: colors.border },
                ]}
                onPress={() =>
                  Linking.openURL(
                    `https://maps.google.com/?q=${concern.location_lat},${concern.location_lng}`,
                  )
                }
              >
                <Ionicons name="location" size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locationAddr, { color: colors.textPrimary }]}>
                    {concern.location_address ||
                      `${Number(concern.location_lat).toFixed(5)}, ${Number(concern.location_lng).toFixed(5)}`}
                  </Text>
                  <Text style={[styles.locationCoords, { color: colors.textMuted }]}>
                    {t('tapToOpenMaps')}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Workflow SLA Timer */}
          {assignments?.length > 0 && (
            <View style={[styles.section, styles.adminNoteCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.adminNoteHeader}>
                <Ionicons name="timer-outline" size={16} color={colors.primary} />
                <Text style={[styles.adminNoteTitle, { color: colors.primary }]}>
                  {t('SLA Timer') || 'SLA TIMER'}
                </Text>
              </View>
              {(() => {
                const latest = assignments[0];
                const deadline = new Date(latest.sla_deadline);
                const diffHours = (deadline - new Date()) / (1000 * 60 * 60);
                const color = diffHours < 0 ? colors.statusRejected : (diffHours < 24 ? colors.statusPending : colors.statusResolved);
                
                return (
                  <View>
                    <Text style={{ fontSize: rf(14), fontWeight: '700', color }}>
                      {diffHours < 0 ? `Breached by ${Math.abs(diffHours).toFixed(1)} hrs` : `${diffHours.toFixed(1)} hrs remaining`}
                    </Text>
                    <Text style={{ fontSize: rf(12), color: colors.textSecondary, marginTop: 4 }}>
                      Department: {latest.department}
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* Official Response */}
          {concern.admin_note && (
            <View
              style={[
                styles.section,
                styles.adminNoteCard,
                { backgroundColor: colors.accent + '11', borderColor: colors.accent + '44' },
              ]}
            >
              <View style={styles.adminNoteHeader}>
                <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
                <Text style={[styles.adminNoteTitle, { color: colors.accent }]}>
                  {t('officialResponse')}
                </Text>
              </View>
              <Text style={[styles.adminNoteText, { color: colors.textPrimary }]}>
                {concern.admin_note}
              </Text>
            </View>
          )}

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              📅 {t('timeline')}
            </Text>
            {timelineSteps.map((step, i) => {
              const opacity = anim.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0, 1, 1],
                extrapolate: 'clamp',
              });
              const translateY = anim.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [15, 0, 0],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={i}
                  style={[styles.timelineItem, { opacity, transform: [{ translateY }] }]}
                >
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: statusCfg.color }]} />
                    {i < timelineSteps.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineEvent, { color: colors.textPrimary }]}>
                      {step.event}
                    </Text>
                    <Text style={[styles.timelineDate, { color: colors.textMuted }]}>
                      {step.date}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* Upvote Button */}
          <TouchableOpacity
            style={[
              styles.upvoteBtn,
              { borderColor: colors.border },
              isUpvoted && { borderColor: colors.primary, backgroundColor: colors.primary + '11' },
            ]}
            onPress={handleUpvote}
          >
            <Ionicons
              name={isUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
              size={20}
              color={isUpvoted ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.upvoteBtnText,
                { color: colors.textMuted },
                isUpvoted && { color: colors.primary },
              ]}
            >
              {isUpvoted ? t('youUpvoted') : t('upvoteThis')} · {concern.upvotes || 0}
            </Text>
          </TouchableOpacity>

          {/* Public Comments */}
          <View style={[styles.section, { marginTop: verticalScale(20) }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              💬 Discussion
            </Text>
            
            <View style={{ gap: verticalScale(10), marginBottom: verticalScale(14) }}>
              {comments.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: rf(13), textAlign: 'center' }}>No comments yet.</Text>
              ) : (
                comments.map(c => (
                  <View key={c.id} style={{ 
                    padding: scale(12), 
                    backgroundColor: colors.bgCard, 
                    borderRadius: moderateScale(8),
                    borderLeftWidth: 3,
                    borderLeftColor: colors.primary
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(4) }}>
                      <Text style={{ fontSize: rf(12), fontWeight: '600', color: colors.textPrimary }}>{c.user_name}</Text>
                      <Text style={{ fontSize: rf(10), color: colors.textMuted }}>{fmt(c.created_at)}</Text>
                    </View>
                    <Text style={{ fontSize: rf(13), color: colors.textSecondary, lineHeight: rf(20) }}>
                      {c.comment}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: scale(8), alignItems: 'center' }}>
              <TextInput 
                style={{ 
                  flex: 1, 
                  backgroundColor: colors.bgCard, 
                  color: colors.textPrimary,
                  borderRadius: moderateScale(20),
                  paddingHorizontal: scale(14),
                  paddingVertical: verticalScale(10),
                  fontSize: rf(13),
                  borderWidth: 1,
                  borderColor: colors.border
                }}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity 
                style={{ 
                  backgroundColor: newComment.trim() ? colors.primary : colors.bgCard,
                  padding: scale(10),
                  borderRadius: scale(20),
                  opacity: posting ? 0.7 : 1
                }}
                onPress={postComment}
                disabled={!newComment.trim() || posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color={newComment.trim() ? '#fff' : colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Fullscreen Image Modal ── */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.95)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: verticalScale(50),
              right: scale(20),
              zIndex: 10,
              padding: scale(10),
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: scale(20),
            }}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
          >
            <Image
              source={{ uri: resolveImageUrl(concern.image_url) }}
              style={{ width: scale(350), height: verticalScale(500), resizeMode: 'contain' }}
            />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MetaItem({ icon, label, value, colors }) {
  return (
    <View style={[styles.metaItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <View>
        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

function buildTimeline(c, t) {
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
      : '—';
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
  container: { flex: 1 },
  scroll: { paddingBottom: verticalScale(40) },

  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: rf(16),
    fontWeight: '700',
  },

  heroImage: { width: '100%', height: verticalScale(220) },
  heroPlaceholder: { height: verticalScale(120), alignItems: 'center', justifyContent: 'center' },

  body: { padding: scale(20) },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: verticalScale(14),
  },
  priorityBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(20),
  },
  priorityText: { fontSize: rf(11), fontWeight: '700' },

  title: {
    fontSize: rf(22),
    fontWeight: '800',
    marginBottom: verticalScale(16),
    lineHeight: rf(30),
  },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    marginBottom: verticalScale(20),
  },
  metaItem: {
    flexDirection: 'row',
    gap: scale(8),
    alignItems: 'flex-start',
    width: '47%',
    borderRadius: moderateScale(10),
    padding: scale(10),
    borderWidth: 1,
  },
  metaLabel: {
    fontSize: rf(10),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: { fontSize: rf(13), fontWeight: '600', marginTop: verticalScale(2) },

  section: { marginBottom: verticalScale(20) },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: verticalScale(10),
  },
  description: { fontSize: rf(15), lineHeight: rf(24) },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: moderateScale(12),
    padding: scale(14),
    borderWidth: 1,
  },
  locationAddr: { fontSize: rf(14), fontWeight: '600' },
  locationCoords: { fontSize: rf(11), marginTop: verticalScale(2) },

  miniMapContainer: {
    height: verticalScale(160),
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: verticalScale(10),
  },
  miniMap: { flex: 1 },
  miniMapPin: { alignItems: 'center', justifyContent: 'center' },

  adminNoteCard: { borderRadius: moderateScale(14), padding: scale(14), borderWidth: 1 },
  adminNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(8),
  },
  adminNoteTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  adminNoteText: { fontSize: rf(14), lineHeight: rf(22) },

  timelineItem: { flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(4) },
  timelineLeft: { alignItems: 'center', width: scale(16) },
  timelineDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    marginTop: verticalScale(3),
  },
  timelineLine: { width: 2, flex: 1, marginVertical: verticalScale(4) },
  timelineContent: { flex: 1, paddingBottom: verticalScale(16) },
  timelineEvent: { fontSize: rf(13), fontWeight: '600' },
  timelineDate: { fontSize: rf(11), marginTop: verticalScale(3) },

  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    borderWidth: 1,
    borderRadius: moderateScale(14),
    padding: scale(14),
  },
  upvoteBtnActive: {},
  upvoteBtnText: { fontSize: rf(15), fontWeight: '700' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: rf(16), marginTop: verticalScale(12) },
});
