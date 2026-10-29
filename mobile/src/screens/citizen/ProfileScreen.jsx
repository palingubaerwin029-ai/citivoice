import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, resolveImageUrl, BASE_URL, mobileApi } from '../../context/AuthContext';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import { RADIUS, SHADOWS, STATUS_CONFIG, getCategoryConfig } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';
import { LANGUAGES } from '../../i18n/translations';
import { CustomAlertModal } from '../../components/UI';

const DEFAULT_BARANGAYS = [
  'Bantayan', 'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4',
  'Barangay 5', 'Barangay 6', 'Barangay 7', 'Barangay 8', 'Barangay 9',
  'Binicuil', 'Camansi', 'Camingawan', 'Camugao', 'Carol-an', 'Daan Banua',
  'Hilamonan', 'Inapoy', 'Linao', 'Locotan', 'Magballo', 'Oringao',
  'Orong', 'Pinaguinpinan', 'Salong', 'Tabugon', 'Tagoc', 'Tagukon',
  'Talubangi', 'Tampalon', 'Tan-Awan', 'Tapi',
];

export default function ProfileScreen({ navigation }) {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout, updateUserLocal } = useAuth();
  const { myConcerns, myStats, fetchStats } = useConcerns();
  const { t, language, changeLanguage } = useLanguage();
  const [showLang, setShowLang] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editBarangay, setEditBarangay] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');
  const [availableBarangays, setAvailableBarangays] = useState(DEFAULT_BARANGAYS);

  // Custom alert modal state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    primaryLabel: 'OK',
    onPrimaryPress: null,
    secondaryLabel: null,
    onSecondaryPress: null,
  });

  const showAlert = ({
    type = 'success',
    title,
    message = '',
    primaryLabel,
    onPrimaryPress = null,
    secondaryLabel = null,
    onSecondaryPress = null,
  }) => {
    setAlertConfig({
      visible: true,
      type,
      title: title || (type === 'success' ? t('success') || 'Success' : t('error') || 'Error'),
      message,
      primaryLabel: primaryLabel || t('ok') || 'OK',
      onPrimaryPress: onPrimaryPress || (() => setAlertConfig((prev) => ({ ...prev, visible: false }))),
      secondaryLabel,
      onSecondaryPress: onSecondaryPress || (() => setAlertConfig((prev) => ({ ...prev, visible: false }))),
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    let isMounted = true;
    const fetchBarangays = async () => {
      try {
        const rows = await mobileApi.get('/barangays');
        if (isMounted && Array.isArray(rows) && rows.length > 0) {
          const list = rows.map((r) => r.name);
          list.sort((a, b) => a.localeCompare(b));
          setAvailableBarangays(list);
        }
      } catch (err) {
        console.log('Error fetching barangays:', err);
      }
    };
    fetchBarangays();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.trim().toLowerCase();
    if (!q) return availableBarangays;
    return availableBarangays.filter((b) => b.toLowerCase().includes(q));
  }, [availableBarangays, barangaySearch]);

  const handleOpenEdit = () => {
    setEditPhone(user?.phone || '');
    setEditBarangay(user?.barangay || availableBarangays[0] || 'Barangay 1');
    setEditAddress(user?.address || '');
    setBarangaySearch('');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    const cleanPhone = editPhone.trim();
    const cleanAddress = editAddress.trim();
    const cleanBarangay = editBarangay.trim();

    if (cleanPhone) {
      const phoneRegex = /^(\+?\d{10,15}|09\d{9})$/;
      if (!phoneRegex.test(cleanPhone)) {
        showAlert({
          type: 'error',
          title: t('error') || 'Invalid Number',
          message: t('phoneHelper') || 'Please enter a valid Philippine mobile number (e.g. 09123456789 or +639123456789)',
        });
        return;
      }
    }

    setSavingProfile(true);
    try {
      const payload = {
        phone: cleanPhone,
        barangay: cleanBarangay,
        address: cleanAddress,
      };
      const updatedUser = await mobileApi.put(`/users/${user.id}`, payload);
      await updateUserLocal(updatedUser);
      setIsEditingProfile(false);
      showAlert({
        type: 'success',
        title: t('success') || 'Profile Updated',
        message: t('profileUpdated') || 'Profile updated successfully!',
        primaryLabel: t('ok') || 'OK',
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      showAlert({
        type: 'error',
        title: t('error') || 'Update Failed',
        message: err.message || 'Failed to update profile',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Refresh exact stats on focus
  useFocusEffect(
    useCallback(() => {
      if (fetchStats) fetchStats();
    }, [fetchStats])
  );

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
        showAlert({
          type: 'warning',
          title: t('error') || 'Permission Required',
          message: 'Permission to access gallery is required.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      showAlert({
        type: 'error',
        title: t('error') || 'Error',
        message: 'Failed to pick image',
      });
    }
  };

  const uploadAvatar = async (uri) => {
    setUploadingAvatar(true);
    try {
      const token = await AsyncStorage.getItem('cv_token');
      const uploadResult = await FileSystem.uploadAsync(
        `${BASE_URL}/users/${user.id}/avatar`,
        uri,
        {
          httpMethod: 'POST',
          uploadType: 1, // FileSystemUploadType.MULTIPART
          fieldName: 'avatar',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      let data = {};
      try {
        data = JSON.parse(uploadResult.body);
      } catch (_) {}
      if (uploadResult.status >= 400) throw new Error(data.error || 'Failed to upload avatar');

      await updateUserLocal(data);
      showAlert({
        type: 'success',
        title: t('success') || 'Avatar Updated',
        message: 'Your profile picture has been updated.',
      });
    } catch (err) {
      console.error('Avatar upload error:', err);
      showAlert({
        type: 'error',
        title: t('error') || 'Upload Failed',
        message: err.message,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };
  const safeMyConcerns = Array.isArray(myConcerns) ? myConcerns : [];
  const stats = {
    total: myStats?.total ?? safeMyConcerns.length,
    pending: myStats?.pending ?? safeMyConcerns.filter((c) => c.status === 'Pending').length,
    inProgress: myStats?.inProgress ?? safeMyConcerns.filter((c) => c.status === 'In Progress').length,
    resolved: myStats?.resolved ?? safeMyConcerns.filter((c) => c.status === 'Resolved').length,
    rejected: myStats?.rejected ?? safeMyConcerns.filter((c) => c.status === 'Rejected').length,
  };
  const memberSince = (user?.created_at ? new Date(user.created_at) : null)?.toLocaleDateString(
    'en-PH',
    { year: 'numeric', month: 'long' },
  );
  const handleLogout = () =>
    showAlert({
      type: 'warning',
      title: t('signOut') || 'Sign Out',
      message: t('signOutConfirm') || 'Are you sure you want to sign out?',
      primaryLabel: t('signOut') || 'Sign Out',
      onPrimaryPress: () => {
        hideAlert();
        logout();
      },
      secondaryLabel: t('cancel') || 'Cancel',
      onSecondaryPress: hideAlert,
    });
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

        {/* Profile Completion & Verification Alert Banner */}
        {(!user?.phone || user?.verification_status !== 'verified') && (
          <View
            style={{
              marginHorizontal: scale(16),
              marginTop: verticalScale(14),
              marginBottom: verticalScale(14),
              backgroundColor: colors.warning + '14',
              borderColor: colors.warning + '44',
              borderWidth: 1,
              borderRadius: RADIUS.lg,
              padding: scale(14),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scale(10) }}>
              <Ionicons name="alert-circle" size={22} color={colors.warning} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: rf(14), fontWeight: '700', marginBottom: verticalScale(3) }}>
                  {t('completeYourProfile')}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: rf(12), lineHeight: rf(17), marginBottom: verticalScale(10) }}>
                  {!user?.phone && user?.verification_status !== 'verified'
                    ? t('profileIncompleteNoticeBoth')
                    : !user?.phone
                    ? t('profileIncompleteNoticePhone')
                    : t('profileIncompleteNoticeId')}
                </Text>
                <View style={{ flexDirection: 'row', gap: scale(8), flexWrap: 'wrap' }}>
                  {!user?.phone && (
                    <TouchableOpacity
                      onPress={handleOpenEdit}
                      style={{
                        backgroundColor: colors.primary,
                        paddingHorizontal: scale(12),
                        paddingVertical: verticalScale(7),
                        borderRadius: RADIUS.sm,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: scale(5),
                      }}
                    >
                      <Ionicons name="call-outline" size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: rf(12), fontWeight: '700' }}>{t('addPhoneNumber')}</Text>
                    </TouchableOpacity>
                  )}
                  {user?.verification_status !== 'verified' && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('VerifyIdentity')}
                      style={{
                        backgroundColor: colors.bgCardAlt,
                        borderColor: colors.border,
                        borderWidth: 1,
                        paddingHorizontal: scale(12),
                        paddingVertical: verticalScale(7),
                        borderRadius: RADIUS.sm,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: scale(5),
                      }}
                    >
                      <Ionicons name="shield-checkmark-outline" size={14} color={colors.primaryLight} />
                      <Text style={{ color: colors.primaryLight, fontSize: rf(12), fontWeight: '700' }}>{t('verifyId')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

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
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(2), gap: scale(4) }}>
                      <Text
                        style={{
                          color: getCategoryConfig(colors)[c.category]?.color || colors.primary,
                          fontSize: rf(11),
                          fontWeight: '600',
                        }}
                      >
                        {c.category?.split(' ')[0]}
                      </Text>
                      {c.userBarangay && (
                        <Text style={{ color: colors.textMuted, fontSize: rf(11) }}>
                          · {c.userBarangay}
                        </Text>
                      )}
                    </View>
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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: verticalScale(10),
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: rf(11),
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              {t('accountInfo')}
            </Text>
            <TouchableOpacity
              onPress={handleOpenEdit}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: scale(5),
                paddingHorizontal: scale(11),
                paddingVertical: verticalScale(5),
                borderRadius: RADIUS.full,
                backgroundColor: colors.primary + '18',
                borderWidth: 1,
                borderColor: colors.primary + '33',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={13} color={colors.primaryLight} />
              <Text
                style={{
                  color: colors.primaryLight,
                  fontSize: rf(12),
                  fontWeight: '700',
                }}
              >
                {t('edit') || 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
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
                value: user?.barangay || '—',
              },
              {
                icon: 'home-outline',
                label: t('address') || 'Street / Address',
                value: user?.address || '—',
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
              onPress={() => setShowLang((prev) => !prev)}
              activeOpacity={0.7}
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
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale(6),
                  backgroundColor: colors.bgCardAlt,
                  paddingHorizontal: scale(10),
                  paddingVertical: verticalScale(5),
                  borderRadius: RADIUS.md,
                  borderWidth: 1,
                  borderColor: showLang ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    color: colors.primaryLight,
                    fontSize: rf(13),
                    fontWeight: '600',
                  }}
                >
                  {LANGUAGES.find((l) => l.code === language)?.label || 'English'}
                </Text>
                <Ionicons
                  name={showLang ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={showLang ? colors.primaryLight : colors.textMuted}
                />
              </View>
            </TouchableOpacity>
            {showLang && (
              <View
                style={{
                  backgroundColor: colors.bgCardAlt,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingHorizontal: scale(12),
                  paddingVertical: verticalScale(6),
                }}
              >
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: verticalScale(10),
                        paddingHorizontal: scale(12),
                        borderRadius: RADIUS.md,
                        marginVertical: verticalScale(2),
                        backgroundColor: isSelected ? colors.primary + '1A' : 'transparent',
                      }}
                      onPress={() => {
                        changeLanguage(lang.code);
                        setShowLang(false);
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? colors.primaryLight : colors.textPrimary,
                          fontSize: rf(13.5),
                          fontWeight: isSelected ? '700' : '500',
                        }}
                      >
                        {lang.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={colors.primaryLight}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
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
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: scale(14),
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
              onPress={() => navigation.navigate('TermsAndPolicy')}
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
                  <Ionicons name="document-text-outline" size={15} color={colors.textSecondary} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: rf(14) }}>Terms & Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
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

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditingProfile}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingProfile) setIsEditingProfile(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: moderateScale(28),
              borderTopRightRadius: moderateScale(28),
              paddingHorizontal: scale(20),
              paddingTop: verticalScale(16),
              paddingBottom: verticalScale(Platform.OS === 'ios' ? 36 : 24),
              borderTopWidth: 1,
              borderColor: colors.border,
              maxHeight: '90%',
            }}
          >
            {/* Grab handle */}
            <View
              style={{
                width: scale(38),
                height: verticalScale(4),
                backgroundColor: colors.border,
                borderRadius: scale(2),
                alignSelf: 'center',
                marginBottom: verticalScale(14),
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: verticalScale(18),
              }}
            >
              <View>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: rf(18),
                    fontWeight: '800',
                    letterSpacing: -0.3,
                  }}
                >
                  {t('editProfile') || 'Edit Profile'}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: rf(12),
                    marginTop: verticalScale(2),
                  }}
                >
                  Update your contact phone and address
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => !savingProfile && setIsEditingProfile(false)}
                disabled={savingProfile}
                style={{
                  width: scale(32),
                  height: scale(32),
                  borderRadius: scale(16),
                  backgroundColor: colors.bgCardAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Full Name (Read-only verified identifier) */}
              <View style={{ marginBottom: verticalScale(14) }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: rf(12),
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: verticalScale(6),
                  }}
                >
                  {t('fullName')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(10),
                    backgroundColor: colors.bgDark + '99',
                    borderRadius: RADIUS.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: scale(14),
                    paddingVertical: verticalScale(12),
                  }}
                >
                  <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                  <Text
                    style={{
                      flex: 1,
                      color: colors.textSecondary,
                      fontSize: rf(14),
                      fontWeight: '600',
                    }}
                  >
                    {user?.name}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: scale(8),
                      paddingVertical: verticalScale(2),
                      borderRadius: RADIUS.full,
                      backgroundColor: colors.primary + '18',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primaryLight,
                        fontSize: rf(10),
                        fontWeight: '700',
                      }}
                    >
                      ID Locked
                    </Text>
                  </View>
                </View>
              </View>

              {/* Phone Number Field */}
              <View style={{ marginBottom: verticalScale(14) }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: rf(12),
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: verticalScale(6),
                  }}
                >
                  {t('phone')}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(10),
                    backgroundColor: colors.bgCardAlt,
                    borderRadius: RADIUS.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: scale(14),
                    paddingVertical: verticalScale(10),
                  }}
                >
                  <Ionicons name="call-outline" size={16} color={colors.primaryLight} />
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder={t('phonePlaceholder') || '09123456789'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={15}
                    style={{
                      flex: 1,
                      color: colors.textPrimary,
                      fontSize: rf(14),
                      fontWeight: '600',
                      padding: 0,
                    }}
                  />
                  {editPhone.length > 0 && (
                    <TouchableOpacity onPress={() => setEditPhone('')}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: rf(11),
                    marginTop: verticalScale(4),
                  }}
                >
                  {t('phoneHelper') || 'Must be a valid 11-digit Philippine mobile number'}
                </Text>
              </View>

              {/* Barangay Selector */}
              <View style={{ marginBottom: verticalScale(14) }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: rf(12),
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: verticalScale(6),
                  }}
                >
                  {t('barangay')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowBarangayPicker(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: colors.bgCardAlt,
                    borderRadius: RADIUS.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: scale(14),
                    paddingVertical: verticalScale(13),
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                    <Ionicons name="location-outline" size={16} color={colors.primaryLight} />
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: rf(14),
                        fontWeight: '600',
                      }}
                    >
                      {editBarangay || t('selectBarangay') || 'Select Barangay'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Address / Street / Purok Field */}
              <View style={{ marginBottom: verticalScale(22) }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: rf(12),
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: verticalScale(6),
                  }}
                >
                  {t('address') || 'Street / Address'}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(10),
                    backgroundColor: colors.bgCardAlt,
                    borderRadius: RADIUS.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: scale(14),
                    paddingVertical: verticalScale(10),
                  }}
                >
                  <Ionicons name="home-outline" size={16} color={colors.primaryLight} />
                  <TextInput
                    value={editAddress}
                    onChangeText={setEditAddress}
                    placeholder={t('addressPlaceholder') || 'e.g. Purok 3, Rizal St.'}
                    placeholderTextColor={colors.textMuted}
                    maxLength={100}
                    style={{
                      flex: 1,
                      color: colors.textPrimary,
                      fontSize: rf(14),
                      fontWeight: '600',
                      padding: 0,
                    }}
                  />
                  {editAddress.length > 0 && (
                    <TouchableOpacity onPress={() => setEditAddress('')}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(10) }}>
                <TouchableOpacity
                  onPress={() => !savingProfile && setIsEditingProfile(false)}
                  disabled={savingProfile}
                  style={{
                    flex: 1,
                    paddingVertical: verticalScale(13),
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: RADIUS.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.bgCardAlt,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: rf(14),
                      fontWeight: '700',
                    }}
                  >
                    {t('cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  style={{
                    flex: 2,
                    borderRadius: RADIUS.lg,
                    overflow: 'hidden',
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.purple || '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: verticalScale(13),
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: scale(6),
                    }}
                  >
                    {savingProfile ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: rf(14),
                            fontWeight: '700',
                          }}
                        >
                          {t('saveChanges') || 'Save Changes'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Barangay Selector Modal */}
      <Modal
        visible={showBarangayPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBarangayPicker(false)}
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
              maxHeight: '80%',
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
                marginBottom: verticalScale(14),
              }}
            >
              {t('selectBarangayHeader') || 'Select Barangay'}
            </Text>

            {/* Search Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: scale(8),
                backgroundColor: colors.bgCardAlt,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: scale(12),
                paddingVertical: verticalScale(8),
                marginBottom: verticalScale(14),
              }}
            >
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                value={barangaySearch}
                onChangeText={setBarangaySearch}
                placeholder={t('searchBarangay') || 'Search barangay...'}
                placeholderTextColor={colors.textMuted}
                style={{
                  flex: 1,
                  color: colors.textPrimary,
                  fontSize: rf(14),
                  padding: 0,
                }}
              />
              {barangaySearch.length > 0 && (
                <TouchableOpacity onPress={() => setBarangaySearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: verticalScale(320) }}>
              {filteredBarangays.map((b) => {
                const isSelected = editBarangay === b;
                return (
                  <TouchableOpacity
                    key={b}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: scale(13),
                      borderRadius: RADIUS.lg,
                      marginBottom: verticalScale(6),
                      backgroundColor: isSelected ? colors.primary + '1A' : 'transparent',
                    }}
                    onPress={() => {
                      setEditBarangay(b);
                      setShowBarangayPicker(false);
                      setBarangaySearch('');
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? colors.primaryLight : colors.textPrimary,
                        fontSize: rf(15),
                        fontWeight: isSelected ? '700' : '500',
                      }}
                    >
                      {b}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.primaryLight}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
              {filteredBarangays.length === 0 && (
                <View style={{ paddingVertical: verticalScale(20), alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: rf(13) }}>
                    No barangay found matching "{barangaySearch}"
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={{
                padding: scale(14),
                alignItems: 'center',
                marginTop: verticalScale(8),
              }}
              onPress={() => setShowBarangayPicker(false)}
            >
              <Text style={{ color: colors.textMuted, fontSize: rf(15) }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Styled Custom Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        primaryLabel={alertConfig.primaryLabel}
        onPrimaryPress={alertConfig.onPrimaryPress}
        secondaryLabel={alertConfig.secondaryLabel}
        onSecondaryPress={alertConfig.onSecondaryPress}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
}
