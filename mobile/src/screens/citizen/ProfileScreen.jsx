import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Modal, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, resolveImageUrl, BASE_URL } from '../../context/AuthContext';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import { RADIUS, SHADOWS, STATUS_CONFIG } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';
import { LANGUAGES } from '../../i18n/translations';

export default function ProfileScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout, updateUserLocal } = useAuth();
  const { myConcerns } = useConcerns();
  const { t, language, changeLanguage } = useLanguage();
  const [showLang, setShowLang] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error') || 'Error', 'Permission to access gallery is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert(t('error') || 'Error', 'Failed to pick image');
    }
  };

  const uploadAvatar = async (uri) => {
    setUploadingAvatar(true);
    try {
      const token = await AsyncStorage.getItem('cv_token');
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('avatar', {
        uri,
        name: filename || 'avatar.jpg',
        type,
      });

      const res = await fetch(`${BASE_URL}/users/${user.id}/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload avatar');

      await updateUserLocal(data);
    } catch (err) {
      console.error('Avatar upload error:', err);
      Alert.alert(t('error') || 'Error', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };
  const stats = {
    total: myConcerns.length,
    pending: myConcerns.filter((c) => c.status === 'Pending').length,
    inProgress: myConcerns.filter((c) => c.status === 'In Progress').length,
    resolved: myConcerns.filter((c) => c.status === 'Resolved').length,
  };
  const memberSince = (user?.created_at ? new Date(user.created_at) : null)?.toLocaleDateString(
    'en-PH',
    { year: 'numeric', month: 'long' },
  );
  const handleLogout = () =>
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: logout },
    ]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(48) }}
      >
        <LinearGradient
          colors={[colors.primary + '22', colors.bgDark]}
          style={{
            alignItems: 'center',
            paddingHorizontal: scale(24),
            paddingTop: verticalScale(20),
            paddingBottom: verticalScale(28),
          }}
        >
          <View style={{ position: 'relative', marginBottom: verticalScale(14) }}>
            <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.primary, colors.purple || '#8B5CF6']}
                style={{
                  width: scale(80),
                  height: scale(80),
                  borderRadius: moderateScale(24),
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {user?.avatar_url ? (
                  <Image
                    source={{ uri: resolveImageUrl(user.avatar_url) }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ color: '#fff', fontSize: rf(30), fontWeight: '900' }}>{initials}</Text>
                )}
                
                {uploadingAvatar && (
                  <View style={{ position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </LinearGradient>
              <View
                style={{
                  position: 'absolute',
                  bottom: scale(-2),
                  right: scale(-2),
                  width: scale(26),
                  height: scale(26),
                  borderRadius: scale(13),
                  backgroundColor: colors.bgCard,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: colors.bgDark,
                }}
              >
                <Ionicons name="camera" size={12} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: rf(22),
              fontWeight: '800',
              letterSpacing: -0.4,
              marginBottom: verticalScale(3),
            }}
          >
            {user?.name}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: rf(13),
              marginBottom: verticalScale(10),
            }}
          >
            {user?.email}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: scale(5),
              backgroundColor: colors.bgCard,
              borderRadius: RADIUS.full,
              paddingHorizontal: scale(12),
              paddingVertical: verticalScale(5),
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: verticalScale(8),
            }}
          >
            <Ionicons name="location-outline" size={12} color={colors.primaryLight} />
            <Text
              style={{
                color: colors.primaryLight,
                fontSize: rf(12),
                fontWeight: '600',
              }}
            >
              {user?.barangay}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: rf(11) }}>
            {t('memberSince')} {memberSince}
          </Text>
        </LinearGradient>

        {myConcerns.length > 0 && (
          <View style={{ paddingHorizontal: scale(16), marginBottom: verticalScale(20) }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: rf(11),
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginBottom: verticalScale(10),
              }}
            >
              {t('myRecentReports')}
            </Text>
            {myConcerns.slice(0, 3).map((c) => {
              const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG['Pending'];
              return (
                <View
                  key={c.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(10),
                    backgroundColor: colors.bgCard,
                    borderRadius: RADIUS.lg,
                    padding: scale(12),
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: verticalScale(8),
                  }}
                >
                  <View
                    style={{
                      width: scale(8),
                      height: scale(8),
                      borderRadius: scale(4),
                      flexShrink: 0,
                      backgroundColor: cfg.color,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: rf(13),
                        fontWeight: '600',
                      }}
                      numberOfLines={1}
                    >
                      {c.title}
                    </Text>
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: rf(11),
                        marginTop: verticalScale(2),
                      }}
                    >
                      {c.category?.split(' ')[0]} · {c.userBarangay}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: scale(8),
                      paddingVertical: verticalScale(3),
                      borderRadius: RADIUS.full,
                      borderWidth: 1,
                      backgroundColor: cfg.bg,
                      borderColor: cfg.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: rf(10),
                        fontWeight: '700',
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ paddingHorizontal: scale(16), marginBottom: verticalScale(20) }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: rf(11),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: verticalScale(10),
            }}
          >
            {t('accountInfo')}
          </Text>
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: RADIUS.xl,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            {[
              { icon: 'person-outline', label: t('fullName'), value: user?.name },
              { icon: 'mail-outline', label: t('email'), value: user?.email },
              {
                icon: 'call-outline',
                label: t('phone'),
                value: user?.phone || '—',
              },
              {
                icon: 'location-outline',
                label: t('barangay'),
                value: user?.barangay,
              },
            ].map((item, i, arr) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: scale(14),
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(10),
                  }}
                >
                  <View
                    style={{
                      width: scale(30),
                      height: scale(30),
                      borderRadius: moderateScale(8),
                      backgroundColor: colors.bgCardAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={item.icon} size={15} color={colors.textSecondary} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: rf(14) }}>
                    {item.label}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: rf(13),
                    fontWeight: '600',
                    maxWidth: scale(180),
                  }}
                  numberOfLines={1}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ paddingHorizontal: scale(16), marginBottom: verticalScale(20) }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: rf(11),
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: verticalScale(10),
            }}
          >
            {t('settings')}
          </Text>
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: RADIUS.xl,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: scale(14),
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
              onPress={() => setShowLang(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                <View
                  style={{
                    width: scale(30),
                    height: scale(30),
                    borderRadius: moderateScale(8),
                    backgroundColor: colors.bgCardAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="language-outline" size={15} color={colors.textSecondary} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: rf(14) }}>
                  {t('language')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                <Text
                  style={{
                    color: colors.primaryLight,
                    fontSize: rf(13),
                    fontWeight: '600',
                  }}
                >
                  {LANGUAGES.find((l) => l.code === language)?.label || 'English'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: scale(14),
              }}
              onPress={toggleTheme}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                <View
                  style={{
                    width: scale(30),
                    height: scale(30),
                    borderRadius: moderateScale(8),
                    backgroundColor: colors.bgCardAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'}
                    size={15}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: rf(14) }}>{t('theme')}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                <Text
                  style={{
                    color: colors.primaryLight,
                    fontSize: rf(13),
                    fontWeight: '600',
                  }}
                >
                  {theme === 'dark' ? t('darkMode') : t('lightMode')}
                </Text>
                <Ionicons name="repeat-outline" size={14} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: scale(8),
            marginHorizontal: scale(16),
            padding: scale(14),
            borderWidth: 1,
            borderColor: 'rgba(239,68,68,0.2)',
            borderRadius: RADIUS.xl,
            marginBottom: verticalScale(16),
            backgroundColor: 'rgba(239,68,68,0.06)',
          }}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger || '#EF4444'} />
          <Text
            style={{
              color: colors.danger || '#EF4444',
              fontSize: rf(15),
              fontWeight: '700',
            }}
          >
            {t('signOut')}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textMuted, fontSize: rf(11), textAlign: 'center' }}>
          CitiVoice v2.0 · Kabankalan City
        </Text>
      </ScrollView>
      <Modal
        visible={showLang}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLang(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: moderateScale(24),
              borderTopRightRadius: moderateScale(24),
              padding: scale(20),
              paddingBottom: verticalScale(40),
              borderTopWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: scale(36),
                height: verticalScale(4),
                backgroundColor: colors.border,
                borderRadius: scale(2),
                alignSelf: 'center',
                marginBottom: verticalScale(16),
              }}
            />
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: rf(18),
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: verticalScale(16),
              }}
            >
              {t('selectLanguage')}
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale(14),
                  padding: scale(14),
                  borderRadius: RADIUS.lg,
                  marginBottom: verticalScale(8),
                  backgroundColor: language === lang.code ? colors.primary + '1A' : 'transparent',
                }}
                onPress={() => {
                  changeLanguage(lang.code);
                  setShowLang(false);
                }}
              >
                <Text style={{ fontSize: rf(22) }}>{lang.flag}</Text>
                <Text
                  style={{
                    color: language === lang.code ? colors.primaryLight : colors.textPrimary,
                    fontSize: rf(16),
                    fontWeight: '600',
                  }}
                >
                  {lang.label}
                </Text>
                {language === lang.code && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primaryLight}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={{ padding: scale(14), alignItems: 'center', marginTop: verticalScale(4) }}
              onPress={() => setShowLang(false)}
            >
              <Text style={{ color: colors.textMuted, fontSize: rf(15) }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
