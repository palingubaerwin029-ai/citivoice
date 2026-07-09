import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { InputField, PrimaryButton } from '../../components/UI';
import { RADIUS, SHADOWS } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { mobileApi } from '../../context/AuthContext';
import { scale, verticalScale, rf } from '../../utils/responsive';
import { useImagePicker } from '../../hooks/useImagePicker';
import { ConcernService } from '../../services/concernService';

const ID_TYPES = [
  'PhilSys (National ID)',
  "Driver's License",
  'Philippine Passport',
  'SSS ID',
  'GSIS ID',
  'Postal ID',
  "Voter's ID",
  'PRC ID',
  'Barangay ID',
];

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const { register } = useAuth();
  const { t, language, changeLanguage } = useLanguage();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    barangay: '',
    idType: '',
    idNumber: '',
    idImage: null,
  });
  const [showPw, setShowPw] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showIdPicker, setShowIdPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [pwFocused, setPwFocused] = useState(false);
  const strengthAnim = useRef(new Animated.Value(0)).current;
  const [availableBarangays, setAvailableBarangays] = useState(['Other']);

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const rows = await mobileApi.get('/barangays');
        const list = rows.map((r) => r.name);
        list.sort((a, b) => a.localeCompare(b));
        setAvailableBarangays([...list, 'Other']);
      } catch (err) {
        console.log('Error fetching barangays', err);
      }
    };
    fetchBarangays();
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const { pickImage: launchImagePicker, takePhoto: launchCamera } = useImagePicker();

  const pickPhoto = async () => {
    const uri = await launchImagePicker();
    if (uri) set('idImage', uri);
  };

  const takePhoto = async () => {
    const uri = await launchCamera();
    if (uri) set('idImage', uri);
  };

  // Password strength analysis
  const passwordAnalysis = useMemo(() => {
    const pw = form.password;
    const checks = {
      minLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasLower: /[a-z]/.test(pw),
      hasNumber: /\d/.test(pw),
      hasSpecial: /[@$!%*?&]/.test(pw),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    let level, label, color;
    if (passed <= 1) {
      level = 0;
      label = 'Weak';
      color = colors.danger;
    } else if (passed <= 2) {
      level = 1;
      label = 'Fair';
      color = colors.warning;
    } else if (passed <= 3) {
      level = 2;
      label = 'Good';
      color = colors.accentWarm;
    } else if (passed <= 4) {
      level = 3;
      label = 'Strong';
      color = colors.accent;
    } else {
      level = 4;
      label = 'Excellent';
      color = colors.success;
    }
    return { checks, passed, level, label, color };
  }, [form.password, colors]);

  // Animate strength bar
  useEffect(() => {
    Animated.spring(strengthAnim, {
      toValue: form.password.length > 0 ? passwordAnalysis.passed / 5 : 0,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [passwordAnalysis.passed, form.password.length]);

  const validate = () => {
    setError(null);
    const e = {};
    if (!form.name.trim()) e.name = t('required');
    if (!form.email.trim()) e.email = t('required');
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('invalidEmail');
    else if (!form.email.trim().toLowerCase().endsWith('@gmail.com')) e.email = 'Email must be a Gmail address (@gmail.com)';
    if (!form.password) e.password = t('required');
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(form.password)
    ) {
      e.password = 'Must include uppercase, lowercase, numbers, and symbols.';
    }
    if (!form.barangay) e.barangay = t('selectBarangay');
    if (!form.idType) e.idType = 'Please select an ID type';
    if (!form.idNumber.trim()) e.idNumber = 'Enter your ID number';
    if (!form.idImage) e.idImage = 'Please upload a photo of your ID';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const idImageUrl = await ConcernService.uploadImage(form.idImage);
      await register({ ...form, idImageUrl });
      navigation.navigate('VerifyIdentity');
    } catch (err) {
      const map = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak.',
      };
      setError(map[err.code] || err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgDeep, colors.bgDark]} style={{ flex: 1 }}>
      <View style={[S.glowBlob, { backgroundColor: colors.primary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Language switcher */}
          <View style={S.langRow}>
            {[
              { code: 'en', label: 'EN' },
              { code: 'fil', label: 'FIL' },
              { code: 'hil', label: 'HIL' },
            ].map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[
                  S.langChip,
                  { borderColor: colors.border },
                  language === l.code && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => changeLanguage(l.code)}
              >
                <Text
                  style={[
                    S.langText,
                    { color: colors.textMuted },
                    language === l.code && { color: '#fff' },
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Back + Logo */}
          <View style={S.topRow}>
            <TouchableOpacity
              style={[S.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Image
              source={require('../../../assets/logo.png')}
              style={S.logoSmallImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[S.pageTitle, { color: colors.textPrimary }]}>{t('register')}</Text>
          <Text style={[S.pageSubtitle, { color: colors.textSecondary }]}>
            {t('joinCommunity')}
          </Text>

          {/* Verification notice */}
          <View
            style={[
              S.noticeBox,
              { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryLight} />
            <View style={{ flex: 1 }}>
              <Text style={[S.noticeTitle, { color: colors.primaryLight }]}>
                {t('verificationRequired')}
              </Text>
              <Text style={[S.noticeText, { color: colors.textSecondary }]}>
                {t('verificationNotice')}
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {error && (
            <View
              style={[
                S.noticeBox,
                {
                  backgroundColor: colors.danger + '14',
                  borderColor: colors.danger + '33',
                  alignItems: 'center',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[S.noticeTitle, { color: colors.danger, marginBottom: 0 }]}>
                  {error}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setError(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={[S.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <InputField
              label={t('fullName').toUpperCase()}
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Juan dela Cruz"
              autoCapitalize="words"
              leftIcon="person-outline"
              error={errors.name}
            />

            <InputField
              label={t('email').toUpperCase()}
              value={form.email}
              onChangeText={(v) => set('email', v)}
              placeholder="you@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={errors.email}
            />

            <InputField
              label={t('password').toUpperCase()}
              value={form.password}
              onChangeText={(v) => set('password', v)}
              placeholder={t('passwordMin')}
              secureTextEntry={!showPw}
              leftIcon="lock-closed-outline"
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPw((p) => !p)}
                  style={{ position: 'absolute', right: 14 }}
                >
                  <Ionicons
                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              }
              error={errors.password}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
            />

            {/* Password Strength Checker */}
            {(form.password.length > 0 || pwFocused) && (
              <View
                style={[
                  S.pwChecker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                ]}
              >
                {/* Strength bar */}
                <View style={S.strengthBarRow}>
                  <View style={[S.strengthBarTrack, { backgroundColor: colors.border }]}>
                    <Animated.View
                      style={[
                        S.strengthBarFill,
                        {
                          backgroundColor: passwordAnalysis.color,
                          width: strengthAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[S.strengthLabel, { color: passwordAnalysis.color }]}>
                    {form.password.length > 0 ? passwordAnalysis.label : ''}
                  </Text>
                </View>

                {/* Requirements checklist */}
                <View style={S.reqList}>
                  {[
                    { key: 'minLength', label: 'At least 8 characters' },
                    { key: 'hasUpper', label: 'Uppercase letter (A-Z)' },
                    { key: 'hasLower', label: 'Lowercase letter (a-z)' },
                    { key: 'hasNumber', label: 'Number (0-9)' },
                    { key: 'hasSpecial', label: 'Special character (@$!%*?&)' },
                  ].map((req) => {
                    const met = passwordAnalysis.checks[req.key];
                    return (
                      <View key={req.key} style={S.reqRow}>
                        <Ionicons
                          name={met ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={met ? colors.success : colors.textMuted}
                        />
                        <Text
                          style={[
                            S.reqText,
                            { color: met ? colors.success : colors.textMuted },
                            met && { fontWeight: '600' },
                          ]}
                        >
                          {req.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <InputField
              label={t('phone').toUpperCase()}
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
              maxLength={11}
              leftIcon="call-outline"
            />

            {/* Barangay picker */}
            <View style={{ marginBottom: 14 }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>
                {t('barangay').toUpperCase()}
              </Text>
              <TouchableOpacity
                style={[
                  S.picker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  errors.barangay && { borderColor: colors.danger },
                ]}
                onPress={() => setShowPicker((p) => !p)}
              >
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text
                  style={[
                    S.pickerText,
                    { color: colors.textPrimary },
                    !form.barangay && { color: colors.textMuted },
                  ]}
                >
                  {form.barangay || t('selectBarangay')}
                </Text>
                <Ionicons
                  name={showPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {errors.barangay && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{errors.barangay}</Text>
                </View>
              )}
              {showPicker && (
                <View
                  style={[
                    S.dropdown,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  ]}
                >
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {availableBarangays.map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[
                          S.dropdownItem,
                          { borderBottomColor: colors.border },
                          form.barangay === b && { backgroundColor: colors.primary + '18' },
                        ]}
                        onPress={() => {
                          set('barangay', b);
                          setShowPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            S.dropdownText,
                            { color: colors.textSecondary },
                            form.barangay === b && {
                              color: colors.primaryLight,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {b}
                        </Text>
                        {form.barangay === b && (
                          <Ionicons name="checkmark-circle" size={16} color={colors.primaryLight} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ID Type picker */}
            <View style={{ marginBottom: 14 }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>ID TYPE *</Text>
              <TouchableOpacity
                style={[
                  S.picker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  errors.idType && { borderColor: colors.danger },
                ]}
                onPress={() => setShowIdPicker((p) => !p)}
              >
                <Ionicons name="card-outline" size={16} color={colors.textMuted} />
                <Text
                  style={[
                    S.pickerText,
                    { color: colors.textPrimary },
                    !form.idType && { color: colors.textMuted },
                  ]}
                >
                  {form.idType || 'Select government ID type…'}
                </Text>
                <Ionicons
                  name={showIdPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {errors.idType && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{errors.idType}</Text>
                </View>
              )}
              {showIdPicker && (
                <View
                  style={[
                    S.dropdown,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  ]}
                >
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {ID_TYPES.map((tItem) => (
                      <TouchableOpacity
                        key={tItem}
                        style={[
                          S.dropdownItem,
                          { borderBottomColor: colors.border },
                          form.idType === tItem && { backgroundColor: colors.primary + '18' },
                        ]}
                        onPress={() => {
                          set('idType', tItem);
                          setShowIdPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            S.dropdownText,
                            { color: colors.textSecondary },
                            form.idType === tItem && {
                              color: colors.primaryLight,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {tItem}
                        </Text>
                        {form.idType === tItem && (
                          <Ionicons name="checkmark-circle" size={16} color={colors.primaryLight} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ID Number */}
            <InputField
              label="ID NUMBER *"
              value={form.idNumber}
              onChangeText={(v) => {
                const cleaned = v.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                let formatted = '';
                for (let i = 0; i < cleaned.length; i++) {
                  if (i > 0 && i % 4 === 0) formatted += '-';
                  formatted += cleaned[i];
                }
                set('idNumber', formatted);
              }}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={25}
              leftIcon="key-outline"
              error={errors.idNumber}
            />

            {/* ID Photo */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>ID PHOTO *</Text>
              {form.idImage ? (
                <View style={{ width: '100%', marginBottom: 16 }}>
                  <Image
                    source={{ uri: form.idImage }}
                    style={{ width: '100%', height: 200, borderRadius: 16 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    onPress={() => set('idImage', null)}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    S.photoBox,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                    errors.idImage && { borderColor: colors.danger },
                  ]}
                >
                  <Ionicons
                    name="id-card-outline"
                    size={rf(40)}
                    color={colors.textSecondary}
                    style={{ marginBottom: verticalScale(10), opacity: 0.6 }}
                  />
                  <Text style={[S.photoBoxTitle, { color: colors.textSecondary }]}>
                    Upload your ID photo
                  </Text>
                  <Text style={[S.photoBoxSub, { color: colors.textMuted }]}>
                    Make sure the photo is clear and well-lit
                  </Text>
                  <View style={S.photoActions}>
                    <TouchableOpacity
                      style={[
                        S.photoBtn,
                        {
                          backgroundColor: colors.primary + '18',
                          borderColor: colors.primary + '44',
                        },
                      ]}
                      onPress={pickPhoto}
                    >
                      <Ionicons name="images-outline" size={18} color={colors.primaryLight} />
                      <Text style={[S.photoBtnText, { color: colors.primaryLight }]}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        S.photoBtn,
                        {
                          backgroundColor: colors.primary + '18',
                          borderColor: colors.primary + '44',
                        },
                      ]}
                      onPress={takePhoto}
                    >
                      <Ionicons name="camera-outline" size={18} color={colors.primaryLight} />
                      <Text style={[S.photoBtnText, { color: colors.primaryLight }]}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {errors.idImage && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{errors.idImage}</Text>
                </View>
              )}
            </View>

            <PrimaryButton
              title={t('register')}
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <View style={S.loginRow}>
              <Text style={{ color: colors.textSecondary, fontSize: rf(14) }}>
                {t('hasAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text
                  style={{
                    color: colors.primaryLight,
                    fontSize: rf(14),
                    fontWeight: '700',
                  }}
                >
                  {t('login')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(40),
  },

  glowBlob: {
    position: 'absolute',
    top: verticalScale(-80),
    left: '50%',
    marginLeft: scale(-140),
    width: scale(280),
    height: scale(280),
    borderRadius: scale(140),
    opacity: 0.07,
  },

  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scale(6),
    marginBottom: verticalScale(16),
  },
  langChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  backBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSmallImage: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.sm,
  },

  pageTitle: {
    fontSize: rf(26),
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: verticalScale(4),
  },
  pageSubtitle: { fontSize: rf(13), marginBottom: verticalScale(20) },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
    borderRadius: RADIUS.lg,
    padding: scale(14),
    borderWidth: 1,
    marginBottom: verticalScale(20),
  },
  noticeTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    marginBottom: verticalScale(4),
  },
  noticeText: { fontSize: rf(12), lineHeight: rf(18) },

  card: {
    borderRadius: RADIUS['2xl'],
    padding: scale(24),
    borderWidth: 1,
    ...SHADOWS.card,
  },

  fieldLabel: {
    fontSize: rf(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: verticalScale(8),
  },

  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    borderWidth: 1,
  },
  pickerText: { flex: 1, fontSize: rf(14) },

  dropdown: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: verticalScale(4),
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(14),
    borderBottomWidth: 1,
  },
  dropdownText: { fontSize: rf(14) },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: verticalScale(20) },

  // Password strength checker
  pwChecker: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: scale(12),
    marginTop: verticalScale(-4),
    marginBottom: verticalScale(10),
  },
  strengthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(10),
  },
  strengthBarTrack: {
    flex: 1,
    height: verticalScale(5),
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  strengthLabel: {
    fontSize: rf(11),
    fontWeight: '700',
    letterSpacing: 0.4,
    minWidth: scale(60),
    textAlign: 'right',
  },
  reqList: {
    gap: verticalScale(6),
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  reqText: {
    fontSize: rf(11),
  },

  photoBox: {
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderStyle: 'solid',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: scale(28),
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  photoBoxTitle: {
    fontSize: rf(14),
    fontWeight: '600',
    marginBottom: verticalScale(4),
  },
  photoBoxSub: {
    fontSize: rf(12),
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  photoActions: { flexDirection: 'row', gap: scale(12) },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  photoBtnText: { fontSize: rf(13), fontWeight: '600' },

  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
