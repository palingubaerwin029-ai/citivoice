import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { EmptyState } from '../../components/UI';
import { useLanguage } from '../../context/LanguageContext';
import { RADIUS, SHADOWS } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { fetchUnreadCount } = useNotifications();
  const { t } = useLanguage();

  const loadNotifications = async () => {
    try {
      const res = await mobileApi.get('/notifications');
      setNotifications(res);
      // After loading, we update the app badge
      fetchUnreadCount();
    } catch (err) {
      console.log('Error fetching notifications', err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await mobileApi.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      fetchUnreadCount();
    } catch (err) {
      console.log('Error marking as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await mobileApi.put(`/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      fetchUnreadCount();
    } catch (err) {
      console.log('Error marking all as read', err);
    }
  };

  const hasUnread = notifications.some((n) => !n.is_read);

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
        {hasUnread ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[S.markAllText, { color: colors.primary }]}>{t('markAllRead')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: scale(60) }} />
        )}
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
              onPress={() => !item.is_read && handleMarkAsRead(item.id)}
              activeOpacity={0.8}
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
                  <Text style={[S.time, { color: colors.textMuted }]}>
                    {timeAgo(item.created_at)}
                  </Text>
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
              {!item.is_read && <View style={[S.unreadDot, { backgroundColor: color }]} />}
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
  markAllText: { fontSize: rf(13), fontWeight: '600' },

  list: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(40),
    gap: verticalScale(10),
  },

  card: {
    flexDirection: 'row',
    gap: scale(12),
    padding: scale(14),
    borderRadius: moderateScale(14),
    borderWidth: 1,
  },
  cardUnread: {},
  iconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  title: { fontSize: rf(14), fontWeight: '600', flex: 1, marginRight: scale(8) },
  titleUnread: {},
  time: { fontSize: rf(11) },
  message: { fontSize: rf(13), lineHeight: rf(19) },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    alignSelf: 'center',
    marginLeft: scale(8),
  },
});
