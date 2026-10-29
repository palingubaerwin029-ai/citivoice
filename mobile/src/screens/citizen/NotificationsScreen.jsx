import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi, useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useConcerns } from '../../context/ConcernContext';
import { EmptyState } from '../../components/UI';
import { useLanguage } from '../../context/LanguageContext';
import { RADIUS, SHADOWS } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { fetchUnreadCount } = useNotifications();
  const { concerns } = useConcerns();
  const { t } = useLanguage();

  const cacheKey = user?.id ? `cv_cache_notifications_${user.id}` : 'cv_cache_notifications';

  const saveNotificationsCache = (list) => {
    AsyncStorage.setItem(cacheKey, JSON.stringify(list)).catch(() => {});
  };

  const isExcludedNotification = (n) => {
    const text = `${n.title || ''} ${n.message || ''}`.toLowerCase();
    return (
      text.includes('linked') ||
      text.includes('duplicate') ||
      text.includes('auto-verified') ||
      text.includes('automatically verified by ai')
    );
  };

  const loadNotifications = async () => {
    try {
      const res = await mobileApi.get('/notifications');
      const filtered = (res || []).filter((n) => !isExcludedNotification(n));
      setNotifications(filtered);
      saveNotificationsCache(filtered);
      // After loading, we update the app badge
      fetchUnreadCount();
    } catch (err) {
      console.log('Error fetching notifications', err);
    }
  };

  useEffect(() => {
    // 1. Hydrate from cache immediately
    AsyncStorage.getItem(cacheKey)
      .then((cached) => {
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setNotifications(parsed.filter((n) => !isExcludedNotification(n)));
          }
        }
      })
      .catch(() => {});

    // 2. Revalidate from server
    loadNotifications();
  }, [cacheKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id) => {
    try {
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n));
        saveNotificationsCache(next);
        return next;
      });
      await mobileApi.put(`/notifications/${id}/read`);
      fetchUnreadCount();
    } catch (err) {
      console.log('Error marking as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => {
        const next = prev.map((n) => ({ ...n, is_read: 1 }));
        saveNotificationsCache(next);
        return next;
      });
      await mobileApi.put(`/notifications/read-all`);
      fetchUnreadCount();
    } catch (err) {
      console.log('Error marking all as read', err);
    }
  };

  const handleDeleteSingle = (id) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileApi.delete(`/notifications/${id}`);
              setNotifications((prev) => {
                const next = prev.filter((n) => n.id !== id);
                saveNotificationsCache(next);
                return next;
              });
              fetchUnreadCount();
            } catch (err) {
              console.log('Error deleting notification', err);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await mobileApi.delete('/notifications');
              setNotifications([]);
              saveNotificationsCache([]);
              fetchUnreadCount();
            } catch (err) {
              console.log('Error deleting all notifications', err);
            }
          },
        },
      ]
    );
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  const resolveConcernId = (item) => {
    // Explicitly exclude linked or duplicate concern notifications
    const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();
    if (text.includes('linked') || text.includes('duplicate')) {
      return null;
    }

    if (item.concern_id) return item.concern_id;
    if (item.concernId) return item.concernId;

    // Only match user's own concern: "Your concern \"<Title>\""
    const ownConcernMatch = item.message?.match(/Your concern ["“]([^"”]+)["”]/i);
    if (ownConcernMatch && concerns && concerns.length) {
      const matched = concerns.find(
        (c) => c.title?.trim().toLowerCase() === ownConcernMatch[1]?.trim().toLowerCase()
      );
      if (matched) return matched.id;
    }

    return null;
  };

  const handleNotificationPress = async (item) => {
    // 1. Mark as read immediately if not yet read
    if (!item.is_read) {
      handleMarkAsRead(item.id);
    }

    // 2. Resolve concern ID (only for citizen's own concern, not linked concerns)
    const targetConcernId = resolveConcernId(item);

    // 3. Navigate directly to the citizen's concern
    if (targetConcernId) {
      navigation.navigate('ConcernDetail', { concernId: targetConcernId });
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return t('justNow');
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const getNotificationIcon = (title, isRead) => {
    const tLower = title?.toLowerCase() || '';
    let icon = 'notifications';
    let color = isRead ? colors.textMuted : colors.primary;
    let bg = isRead ? colors.border : colors.primary + '22';

    if (tLower.includes('resolved') || tLower.includes('completed')) {
      icon = 'checkmark-circle';
      if (!isRead) {
        color = colors.statusResolved;
        bg = colors.statusResolved + '22';
      }
    } else if (
      tLower.includes('progress') ||
      tLower.includes('assigned') ||
      tLower.includes('update')
    ) {
      icon = 'construct';
      if (!isRead) {
        color = colors.statusInProgress;
        bg = colors.statusInProgress + '22';
      }
    } else if (tLower.includes('rejected') || tLower.includes('declined')) {
      icon = 'close-circle';
      if (!isRead) {
        color = colors.statusRejected;
        bg = colors.statusRejected + '22';
      }
    } else if (tLower.includes('comment') || tLower.includes('message')) {
      icon = 'chatbubble-ellipses';
      if (!isRead) {
        color = colors.info;
        bg = colors.info + '22';
      }
    }

    return { icon, color, bg };
  };

  return (
    <SafeAreaView style={[S.container, { backgroundColor: colors.bgDark }]} edges={['top']}>
      {/* Header */}
      <View style={[S.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.textPrimary }]}>{t('notifications')}</Text>

        <View style={S.headerRight}>
          {hasUnread ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={S.markAllBtn}>
              <Text style={[S.markAllText, { color: colors.primary }]}>{t('markAllRead')}</Text>
            </TouchableOpacity>
          ) : null}

          {notifications.length > 0 ? (
            <TouchableOpacity
              onPress={handleClearAll}
              style={S.deleteHeaderBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger || '#ef4444'} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: scale(24) }} />
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={S.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !refreshing && (
            <EmptyState icon="📭" title={t('allCaughtUp')} subtitle={t('noNotifications')} />
          )
        }
        renderItem={({ item }) => {
          const { icon, color, bg } = getNotificationIcon(item.title, item.is_read);

          return (
            <TouchableOpacity
              style={[
                S.card,
                { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                !item.is_read && { backgroundColor: colors.bgCard, borderColor: color + '44' },
              ]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.7}
            >
              <View style={[S.iconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>

              <View style={S.content}>
                <View style={S.titleRow}>
                  <Text
                    style={[
                      S.title,
                      { color: colors.textSecondary },
                      !item.is_read && { color: colors.textPrimary, fontWeight: '800' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>

                  <View style={S.metaRow}>
                    <Text style={[S.time, { color: colors.textMuted }]}>
                      {timeAgo(item.created_at)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteSingle(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={S.deleteSingleBtn}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text
                  style={[
                    S.message,
                    { color: colors.textPrimary },
                    item.is_read && { color: colors.textSecondary },
                  ]}
                  numberOfLines={3}
                >
                  {item.message}
                </Text>
              </View>

              {!item.is_read ? (
                <View style={[S.unreadDot, { backgroundColor: color }]} />
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
  },
  backBtn: { padding: scale(4) },
  headerTitle: { fontSize: rf(18), fontWeight: '800' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  markAllBtn: {
    paddingVertical: verticalScale(4),
  },
  markAllText: { fontSize: rf(13), fontWeight: '600' },
  deleteHeaderBtn: {
    padding: scale(4),
  },

  list: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(40),
    gap: verticalScale(10),
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    padding: scale(14),
    borderRadius: moderateScale(14),
    borderWidth: 1,
  },
  iconBox: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: verticalScale(2),
  },
  content: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  title: { fontSize: rf(14), fontWeight: '600', flex: 1, marginRight: scale(8) },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  time: { fontSize: rf(11) },
  deleteSingleBtn: {
    padding: scale(2),
  },
  message: { fontSize: rf(13), lineHeight: rf(19) },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
});
