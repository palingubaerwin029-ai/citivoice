import React, { useEffect, useState, useRef } from 'react';
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
  KeyboardAvoidingView,
  ActionSheetIOS,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConcerns } from '../../context/ConcernContext';
import { useAuth, resolveImageUrl, mobileApi, BASE_URL } from '../../context/AuthContext';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge, CategoryBadge } from '../../components/UI';
import { getStatusConfig } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

export default function ConcernDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { concernId } = route?.params || {};
  const { concerns, deleteConcern } = useConcerns();
  const { user } = useAuth();
  const { t } = useLanguage();

  const parsedId = Number(concernId);
  const isPositiveIntegerId = Number.isInteger(parsedId) && parsedId > 0;

  const contextConcern = concerns.find(
    (c) => c.id === concernId || String(c.id) === String(concernId)
  );
  const [fetchedConcern, setFetchedConcern] = useState(null);
  const [loadingConcern, setLoadingConcern] = useState(!contextConcern && isPositiveIntegerId);

  const concern = contextConcern || fetchedConcern;
  const isOwner = concern?.user_id === user?.id;
  const canDelete = isOwner && concern?.status === 'Pending';
  const [modalImageUri, setModalImageUri] = useState(null);

  // Workflow state
  const [assignments, setAssignments] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentImageUri, setCommentImageUri] = useState(null);
  const [posting, setPosting] = useState(false);
  const { pickImage, takePhoto } = useImagePicker();

  const handleAttachImage = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            const uri = await takePhoto();
            if (uri) setCommentImageUri(uri);
          } else if (buttonIndex === 2) {
            const uri = await pickImage();
            if (uri) setCommentImageUri(uri);
          }
        }
      );
    } else {
      Alert.alert('Attach Photo', 'Select photo source', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: async () => {
            const uri = await takePhoto();
            if (uri) setCommentImageUri(uri);
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const uri = await pickImage();
            if (uri) setCommentImageUri(uri);
          },
        },
      ]);
    }
  };

  useEffect(() => {
    if (!isPositiveIntegerId) return;
    let isMounted = true;
    const detailCacheKey = `cv_cache_concern_detail_${concernId}`;

    const fetchConcernData = async () => {
      try {
        // 1. Hydrate from local cache first so details & comments appear immediately (even offline)
        const cachedRaw = await AsyncStorage.getItem(detailCacheKey);
        if (cachedRaw && isMounted) {
          try {
            const cached = JSON.parse(cachedRaw);
            if (cached?.concern) setFetchedConcern(cached.concern);
            if (Array.isArray(cached?.assignments)) setAssignments(cached.assignments);
            if (Array.isArray(cached?.comments)) setComments(cached.comments);
            setLoadingConcern(false);
          } catch (_) {}
        } else if (!contextConcern && isMounted) {
          setLoadingConcern(true);
        }

        // 2. Revalidate from server
        const [concernRes, aRes, cRes] = await Promise.allSettled([
          mobileApi.get(`/concerns/${concernId}`),
          mobileApi.get(`/concerns/${concernId}/assignments`),
          mobileApi.get(`/concerns/${concernId}/comments`),
        ]);

        if (isMounted) {
          const nextConcern =
            concernRes.status === 'fulfilled' && concernRes.value ? concernRes.value : null;
          const nextAssignments =
            aRes.status === 'fulfilled' ? aRes.value?.data || aRes.value || [] : null;
          const nextComments =
            cRes.status === 'fulfilled' ? cRes.value?.data || cRes.value || [] : null;

          if (nextConcern) setFetchedConcern(nextConcern);
          if (nextAssignments) setAssignments(nextAssignments);
          if (nextComments) setComments(nextComments);

          if (nextConcern || nextAssignments || nextComments) {
            AsyncStorage.setItem(
              detailCacheKey,
              JSON.stringify({
                concern: nextConcern || contextConcern,
                assignments: nextAssignments || [],
                comments: nextComments || [],
              })
            ).catch(() => {});
          }
        }
      } catch (err) {
        console.log('Failed to fetch concern workflow data', err);
      } finally {
        if (isMounted) setLoadingConcern(false);
      }
    };

    fetchConcernData();
    return () => {
      isMounted = false;
    };
  }, [concernId, isPositiveIntegerId]);

  const postComment = async () => {
    if ((!newComment.trim() && !commentImageUri) || !isPositiveIntegerId) return;
    setPosting(true);
    try {
      const token = await AsyncStorage.getItem('cv_token');
      if (commentImageUri) {
        const uploadResult = await FileSystem.uploadAsync(
          `${BASE_URL}/concerns/${concernId}/comments`,
          commentImageUri,
          {
            httpMethod: 'POST',
            uploadType: 1, // MULTIPART
            fieldName: 'image',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            parameters: {
              comment: newComment.trim(),
            },
          }
        );
        if (uploadResult.status >= 400) {
          let errJson = {};
          try {
            errJson = JSON.parse(uploadResult.body);
          } catch (_) {}
          throw new Error(errJson.error || 'Failed to post comment');
        }
      } else {
        await mobileApi.post(`/concerns/${concernId}/comments`, { comment: newComment.trim() });
      }

      setNewComment('');
      setCommentImageUri(null);
      const cRes = await mobileApi.get(`/concerns/${concernId}/comments`);
      const nextComments = cRes.data || cRes || [];
      setComments(nextComments);
      AsyncStorage.setItem(
        `cv_cache_concern_detail_${concernId}`,
        JSON.stringify({
          concern,
          assignments,
          comments: nextComments,
        })
      ).catch(() => {});
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to post comment');
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
          // navigate back if possible, otherwise go to Feed (root of Home stack)
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Feed');
          }
        },
      },
    ]);
  };


  const timelineSteps = concern ? buildTimeline(concern, t) : [];
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (timelineSteps.length > 0) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: timelineSteps.length,
        duration: timelineSteps.length * 400,
        useNativeDriver: true,
      }).start();
    }
  }, [timelineSteps.length]);

  if (loadingConcern && !concern) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bgDark }]}
        edges={['top', 'bottom']}
      >
        <View
          style={[
            styles.customHeader,
            { backgroundColor: colors.bgCard, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Feed');
              }
            }}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('concernDetail')}
          </Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={[styles.notFound, { backgroundColor: colors.bgDark }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary, marginTop: verticalScale(14) }]}>
            Loading concern details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!concern) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.bgDark }]}
        edges={['top', 'bottom']}
      >
        <View
          style={[
            styles.customHeader,
            { backgroundColor: colors.bgCard, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Feed');
              }
            }}
            style={styles.headerBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('concernDetail')}
          </Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={[styles.notFound, { backgroundColor: colors.bgDark }]}>
          <Text style={{ fontSize: rf(40) }}>🔍</Text>
          <Text style={[styles.notFoundText, { color: colors.textSecondary, marginTop: verticalScale(12) }]}>
            {t('concernNotFound')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = getStatusConfig(colors)[concern.status] || getStatusConfig(colors)['Pending'];

  const fmt = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return isNaN(d)
      ? '—'
      : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const fmtViewedDetail = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d)) return 'First Viewed Just Now';
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMins < 5) return 'First Viewed Just Now';
      return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'First Viewed Just Now';
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Feed');
            }
          }}
          style={styles.headerBtn}
        >
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
        {(() => {
          const imgUri = resolveImageUrl(concern?.image_url);
          return imgUri ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setModalImageUri(imgUri)}>
              <Image source={{ uri: imgUri }} style={styles.heroImage} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: colors.bgCard }]}>
              <Ionicons name="image-outline" size={40} color={colors.textMuted} />
            </View>
          );
        })()}

        <View style={styles.body}>
          {/* Top Meta Row: Badges on left, ADMIN VIEWED in upper right */}
          <View style={styles.topMetaRow}>
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

            {/* In the Upper Right: ADMIN VIEWED card */}
            {concern.admin_viewed_at ? (
              <View
                style={[
                  styles.adminViewedCard,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: (colors.info || '#3B82F6') + '40',
                  },
                ]}
              >
                <Ionicons name="eye" size={16} color={colors.info || '#3B82F6'} />
                <View style={{ marginLeft: scale(6) }}>
                  <Text style={[styles.adminViewedLabel, { color: colors.info || '#3B82F6' }]}>
                    ADMIN VIEWED
                  </Text>
                  <Text style={[styles.adminViewedValue, { color: colors.textPrimary }]}>
                    {fmtViewedDetail(concern.admin_viewed_at)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{concern.title}</Text>

          {/* Date Filed */}
          <View style={[styles.dateRow, { marginBottom: verticalScale(16) }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={{ fontSize: rf(12), color: colors.textMuted, marginLeft: scale(6), fontWeight: '500' }}>
              {t('dateFiled')}: {fmt(concern.created_at)}
            </Text>
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
          {(() => {
            const lat = parseFloat(concern?.location_lat);
            const lng = parseFloat(concern?.location_lng);
            const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
            if (!hasCoords && !concern?.location_address) return null;

            const mapUrl = hasCoords
              ? `https://maps.google.com/?q=${lat},${lng}`
              : `https://maps.google.com/?q=${encodeURIComponent((concern?.location_address || '') + ', Kabankalan City')}`;

            return (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  📍 {t('location')}
                </Text>

                {/* Location Interactive Card */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.locationCard,
                    {
                      backgroundColor: colors.bgCard,
                      borderColor: colors.border,
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      padding: scale(16),
                      gap: verticalScale(12),
                    },
                  ]}
                  onPress={() => Linking.openURL(mapUrl)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                    <View
                      style={{
                        width: scale(40),
                        height: scale(40),
                        borderRadius: scale(20),
                        backgroundColor: colors.primary + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="location-sharp" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.locationAddr, { color: colors.textPrimary, fontSize: rf(14) }]}>
                        {concern?.location_address || 'Kabankalan City, Negros Occidental'}
                      </Text>
                      {hasCoords && (
                        <Text style={[styles.locationCoords, { color: colors.textMuted, fontSize: rf(11), marginTop: verticalScale(2) }]}>
                          GPS: {lat.toFixed(5)}°, {lng.toFixed(5)}°
                        </Text>
                      )}
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scale(6),
                      backgroundColor: colors.primary + '14',
                      paddingVertical: verticalScale(10),
                      borderRadius: moderateScale(10),
                      borderWidth: 1,
                      borderColor: colors.primary + '33',
                    }}
                  >
                    <Ionicons name="map-outline" size={16} color={colors.primary} />
                    <Text style={{ fontSize: rf(12), fontWeight: '700', color: colors.primary }}>
                      {t('tapToOpenMaps') || 'Open in Google Maps'}
                    </Text>
                    <Ionicons name="open-outline" size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          })()}



          {/* Official Response */}
          {(() => {
            const rawNote = concern.admin_note || '';
            const cleanedNote = rawNote
              .replace(/\[(?:Auto-)?Duplicate(?: concern)? of [^\]]+\]\s*/gi, '')
              .trim();
            if (
              !cleanedNote ||
              rawNote.includes('[High-Priority Hazard]') ||
              rawNote.includes('[AI Flag:')
            ) {
              return null;
            }
            return (
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
                  {cleanedNote}
                </Text>
              </View>
            );
          })()}

          {/* Proof Photo — attached by admin */}
          {(() => {
            const proofUri = resolveImageUrl(concern?.resolved_image_url);
            if (!proofUri) return null;
            const isResolved = concern?.status === 'Resolved';
            const proofIcon = isResolved ? 'checkmark-circle' : 'camera';
            const proofIconColor = isResolved ? colors.statusResolved : colors.primary;
            const proofTitle = isResolved ? 'Proof of Completion' : 'Work-in-Progress Photo';
            const proofSub = isResolved
              ? 'The city has confirmed the work is done'
              : 'Photo attached showing current work status';
            return (
              <View style={[styles.section, styles.adminNoteCard, {
                backgroundColor: isResolved
                  ? colors.statusResolved + '11'
                  : colors.bgCard,
                borderColor: isResolved
                  ? colors.statusResolved + '44'
                  : colors.border,
              }]}>
                <View style={styles.adminNoteHeader}>
                  <Ionicons name={proofIcon} size={16} color={proofIconColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.adminNoteTitle, { color: proofIconColor }]}>
                      {proofTitle}
                    </Text>
                    <Text style={{ fontSize: rf(11), color: colors.textMuted, marginTop: verticalScale(1) }}>
                      {proofSub}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setModalImageUri(proofUri)}
                  style={{ position: 'relative' }}
                >
                  <Image
                    source={{ uri: proofUri }}
                    style={{
                      width: '100%',
                      height: verticalScale(200),
                      borderRadius: moderateScale(10),
                      marginTop: verticalScale(4),
                      resizeMode: 'cover',
                    }}
                  />
                  <View style={{
                    position: 'absolute',
                    bottom: moderateScale(8),
                    right: moderateScale(8),
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    paddingHorizontal: scale(8),
                    paddingVertical: verticalScale(3),
                    borderRadius: moderateScale(12),
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(4),
                  }}>
                    <Ionicons name="expand-outline" size={12} color="#fff" />
                    <Text style={{ fontSize: rf(10), color: '#fff', fontWeight: '600' }}>Tap to expand</Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })()}

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


          {/* Public Comments */}
          <View style={[styles.section, { marginTop: verticalScale(20) }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              💬 Discussion
            </Text>
            
            <View style={{ gap: verticalScale(10), marginBottom: verticalScale(14) }}>
              {comments.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: rf(13), textAlign: 'center' }}>No comments yet.</Text>
              ) : (
                comments.map(c => {
                  const commentImgUri = resolveImageUrl(c.image_url);
                  return (
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
                      {c.comment ? (
                        <Text style={{ fontSize: rf(13), color: colors.textSecondary, lineHeight: rf(20) }}>
                          {c.comment}
                        </Text>
                      ) : null}
                      {commentImgUri ? (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => setModalImageUri(commentImgUri)}
                          style={{
                            marginTop: verticalScale(8),
                            borderRadius: moderateScale(8),
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <Image
                            source={{ uri: commentImgUri }}
                            style={{
                              width: '100%',
                              height: verticalScale(160),
                              borderRadius: moderateScale(8),
                              backgroundColor: colors.border,
                            }}
                            resizeMode="cover"
                          />
                          <View
                            style={{
                              position: 'absolute',
                              bottom: moderateScale(6),
                              right: moderateScale(6),
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              paddingHorizontal: scale(8),
                              paddingVertical: verticalScale(3),
                              borderRadius: moderateScale(10),
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: scale(4),
                            }}
                          >
                            <Ionicons name="expand-outline" size={11} color="#fff" />
                            <Text style={{ fontSize: rf(10), color: '#fff', fontWeight: '600' }}>Tap to view</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>

            {/* Attached Image Thumbnail Preview */}
            {commentImageUri ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.bgCard,
                  padding: scale(6),
                  borderRadius: moderateScale(10),
                  marginBottom: verticalScale(8),
                  borderWidth: 1,
                  borderColor: colors.primary + '55',
                  alignSelf: 'flex-start',
                  gap: scale(8),
                }}
              >
                <Image
                  source={{ uri: commentImageUri }}
                  style={{
                    width: scale(52),
                    height: scale(52),
                    borderRadius: moderateScale(6),
                    backgroundColor: colors.border,
                  }}
                />
                <View style={{ paddingRight: scale(6) }}>
                  <Text style={{ fontSize: rf(11), color: colors.textPrimary, fontWeight: '600' }}>
                    Photo attached
                  </Text>
                  <Text style={{ fontSize: rf(10), color: colors.textMuted }}>
                    Ready to post with comment
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCommentImageUri(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    backgroundColor: colors.statusRejected + '22',
                    padding: scale(4),
                    borderRadius: scale(12),
                    marginLeft: scale(4),
                  }}
                >
                  <Ionicons name="close" size={14} color={colors.statusRejected} />
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: scale(8), alignItems: 'center' }}>
              <TouchableOpacity
                onPress={handleAttachImage}
                style={{
                  backgroundColor: commentImageUri ? colors.primary + '22' : colors.bgCard,
                  padding: scale(10),
                  borderRadius: scale(20),
                  borderWidth: 1,
                  borderColor: commentImageUri ? colors.primary : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={commentImageUri ? 'image' : 'camera-outline'}
                  size={19}
                  color={commentImageUri ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>

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
                placeholder={commentImageUri ? "Add a caption (optional)..." : "Add a comment..."}
                placeholderTextColor={colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
              />
              <TouchableOpacity 
                style={{ 
                  backgroundColor: (newComment.trim() || commentImageUri) ? colors.primary : colors.bgCard,
                  padding: scale(10),
                  borderRadius: scale(20),
                  opacity: posting ? 0.7 : 1
                }}
                onPress={postComment}
                disabled={(!newComment.trim() && !commentImageUri) || posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={(newComment.trim() || commentImageUri) ? '#fff' : colors.textMuted}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Fullscreen Image Modal ── */}
      <Modal
        visible={Boolean(modalImageUri)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalImageUri(null)}
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
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: scale(20),
            }}
            onPress={() => setModalImageUri(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View
            style={{
              width: '100%',
              height: '80%',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: scale(16),
            }}
          >
            {modalImageUri ? (
              <Image
                source={{ uri: modalImageUri }}
                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </KeyboardAvoidingView>
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
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(14),
  },
  badgeRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginRight: scale(8),
  },
  adminViewedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  adminViewedLabel: {
    fontSize: rf(8.5),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminViewedValue: {
    fontSize: rf(11),
    fontWeight: '700',
    marginTop: verticalScale(1),
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
    marginBottom: verticalScale(12),
    lineHeight: rf(30),
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
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


  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: rf(16), marginTop: verticalScale(12) },
});
