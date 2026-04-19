import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApi } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { EmptyState } from '../../components/UI';
import { useLanguage } from '../../context/LanguageContext';
import { COLORS, RADIUS, SHADOWS } from '../../utils/theme';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

export default function NotificationsScreen({ navigation }) {
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
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      fetchUnreadCount();
    } catch (err) {
      console.log('Error marking as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await mobileApi.put(`/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      fetchUnreadCount();
    } catch (err) {
      console.log('Error marking all as read', err);
    }
  };

  const hasUnread = notifications.some(n => !n.is_read);

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return t('justNow');
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>{t('notifications')}</Text>
        {hasUnread ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={S.markAllText}>{t('markAllRead')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: scale(60) }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={S.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          !refreshing && (
            <EmptyState
              icon="📭"
              title={t('allCaughtUp')}
              subtitle={t('noNotifications')}
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[S.card, !item.is_read && S.cardUnread]}
            onPress={() => !item.is_read && handleMarkAsRead(item.id)}
            activeOpacity={0.8}
          >
            <View style={S.iconBox}>
              <Ionicons name="notifications" size={20} color={!item.is_read ? COLORS.primary : COLORS.textMuted} />
            </View>
            <View style={S.content}>
              <View style={S.titleRow}>
                <Text style={[S.title, !item.is_read && S.titleUnread]}>{item.title}</Text>
                <Text style={S.time}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={S.message} numberOfLines={3}>{item.message}</Text>
            </View>
            {!item.is_read && <View style={S.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: verticalScale(12),
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  backBtn: { padding: scale(4) },
  headerTitle: { color: COLORS.textPrimary, fontSize: rf(18), fontWeight: '800' },
  markAllText: { color: COLORS.primary, fontSize: rf(13), fontWeight: '600' },
  
  list: { paddingHorizontal: scale(16), paddingTop: verticalScale(16), paddingBottom: verticalScale(40), gap: verticalScale(10) },

  card: {
    flexDirection: 'row', gap: scale(12), padding: scale(14),
    backgroundColor: COLORS.bgCardAlt, borderRadius: moderateScale(14),
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardUnread: {
    backgroundColor: COLORS.bgCard,
    borderColor: COLORS.primary + '33',
  },
  iconBox: {
    width: scale(36), height: scale(36), borderRadius: scale(18),
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center'
  },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(4) },
  title: { color: COLORS.textSecondary, fontSize: rf(14), fontWeight: '600', flex: 1, marginRight: scale(8) },
  titleUnread: { color: COLORS.textPrimary, fontWeight: '800' },
  time: { color: COLORS.textMuted, fontSize: rf(11) },
  message: { color: COLORS.textPrimary, fontSize: rf(13), lineHeight: rf(19) },
  unreadDot: { width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: COLORS.primary, alignSelf: 'center', marginLeft: scale(8) }
});
