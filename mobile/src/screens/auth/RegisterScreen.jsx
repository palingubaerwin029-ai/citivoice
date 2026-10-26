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
  TextInput,
  ActivityIndicator,
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
import { getGoogleIdToken } from '../../services/googleAuth';

export const DEFAULT_BARANGAYS = [
  'Bantayan', 'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4',
  'Barangay 5', 'Barangay 6', 'Barangay 7', 'Barangay 8', 'Barangay 9',
  'Binicuil', 'Camansi', 'Camingawan', 'Camugao', 'Carol-an', 'Daan Banua',
  'Hilamonan', 'Inapoy', 'Linao', 'Locotan', 'Magballo', 'Oringao',
  'Orong', 'Pinaguinpinan', 'Salong', 'Tabugon', 'Tagoc', 'Tagukon',
  'Talubangi', 'Tampalon', 'Tan-Awan', 'Tapi',
];

export default function RegisterScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { register, loginWithGoogle } = useAuth();
  const { t, language, changeLanguage } = useLanguage();

  // Pre-filled when redirected from "Continue with Google" with an unregistered Gmail
  const prefill = route?.params || {};
  const isGooglePreVerified = Boolean(prefill?.isGoogleVerified || (prefill?.email && prefill?.name));

  const [form, setForm] = useState({
    name: prefill.name || '',
    email: prefill.email || '',
    password: '',
    phone: prefill.phone || '',
    barangay: '',
  });

  const [isGoogleVerified, setIsGoogleVerified] = useState(isGooglePreVerified);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [pwFocused, setPwFocused] = useState(false);
  const strengthAnim = useRef(new Animated.Value(0)).current;
  const [availableBarangays, setAvailableBarangays] = useState(DEFAULT_BARANGAYS);
  const [barangaySearch, setBarangaySearch] = useState('');

  // Email verification state
  const [emailVerified, setEmailVerified] = useState(isGooglePreVerified);
  const [verificationToken, setVerificationToken] = useState(prefill?.verificationToken || (isGooglePreVerified ? 'google_verified' : null));
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState(null);
  const [otpSuccess, setOtpSuccess] = useState(null);

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Sync route params when navigated with prefill data
  useEffect(() => {
    if (route?.params?.email) {
      setForm((prev) => ({
        ...prev,
        email: route.params.email,
        name: route.params.name || prev.name,
      }));
      if (route.params.isGoogleVerified) {
        setIsGoogleVerified(true);
        setEmailVerified(true);
        setVerificationToken(route.params.verificationToken || 'google_verified');
      }
    }
  }, [route?.params]);

  const handleGooglePreVerify = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) {
        setGoogleLoading(false);
        return;
      }
      try {
        await loginWithGoogle(idToken);
        navigation.navigate('Login');
      } catch (err) {
        if (err?.code === 'auth/not-registered' || err?.data?.error === 'auth/not-registered') {
          const gEmail = err?.data?.email || '';
          const gName = err?.data?.name || '';
          const vToken = err?.data?.verificationToken || 'google_verified';
          setForm((prev) => ({
            ...prev,
            email: gEmail || prev.email,
            name: prev.name || gName,
          }));
          setIsGoogleVerified(true);
          setEmailVerified(true);
          setVerificationToken(vToken);
          setOtpSent(false);
          setOtpCode('');
          setOtpError(null);
          setOtpSuccess(null);
          setErrors((prev) => {
            const next = { ...prev };
            delete next.email;
            if (gName) delete next.name;
            return next;
          });
          Alert.alert(
            t('googleEmailVerified'),
            `${t('welcomeBack')}, ${gEmail}. ${t('googleEmailVerifiedNotice')}`
          );
          return;
        }
        setError(err?.data?.message || err?.message || 'Google verification failed.');
      }
    } catch (err) {
      setError(err?.message || 'Google verification failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const cleanEmail = form.email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrors((prev) => ({ ...prev, email: t('required') }));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setErrors((prev) => ({ ...prev, email: t('invalidEmail') }));
      return;
    }
    if (!cleanEmail.endsWith('@gmail.com')) {
      setErrors((prev) => ({ ...prev, email: 'Email must be a Gmail address (@gmail.com)' }));
      return;
    }

    setSendingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await mobileApi.post('/auth/send-registration-otp', { email: cleanEmail });
      setOtpSent(true);
      setOtpCooldown(60);
      setOtpCode('');
      setOtpSuccess(res?.message || `Verification code sent to ${cleanEmail}. Please check your Inbox and Spam folder.`);
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Failed to send verification code.';
      setOtpError(msg);
      setErrors((prev) => ({ ...prev, email: msg }));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await mobileApi.post('/auth/verify-registration-otp', {
        email: form.email.trim().toLowerCase(),
        otp: otpCode.trim(),
      });
      setEmailVerified(true);
      setVerificationToken(res.verificationToken || 'verified');
      setOtpSent(false);
      setOtpSuccess(null);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    } catch (err) {
      const msg = err?.data?.error || err?.data?.message || err?.message || 'Invalid or expired code.';
      setOtpError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.trim().toLowerCase();
    if (!q) return availableBarangays;
    const starts = availableBarangays.filter((b) => b.toLowerCase().startsWith(q));
    const contains = availableBarangays.filter(
      (b) => !b.toLowerCase().startsWith(q) && b.toLowerCase().includes(q),
    );
    return [...starts, ...contains];
  }, [availableBarangays, barangaySearch]);

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
        console.log('Error fetching barangays', err);
      }
    };
    fetchBarangays();
    return () => {
      isMounted = false;
    };
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

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
      label = t('weak');
      color = colors.danger;
    } else if (passed <= 2) {
      level = 1;
      label = t('fair');
      color = colors.warning;
    } else if (passed <= 3) {
      level = 2;
      label = t('good');
      color = colors.accentWarm;
    } else if (passed <= 4) {
      level = 3;
      label = t('strong');
      color = colors.accent;
    } else {
      level = 4;
      label = t('excellent');
      color = colors.success;
    }
    return { checks, passed, level, label, color };
  }, [form.password, colors, t]);

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
    const nameRegex = /^[a-zA-ZñÑ\u00C0-\u024F\s\-\.']+$/;
    if (!form.name.trim()) {
      e.name = t('required');
    } else if (form.name.trim().split(/[\s-]+/).filter(Boolean).length < 2) {
      e.name = t('fullNameRequired');
    } else if (!nameRegex.test(form.name)) {
      e.name = t('nameLettersOnly');
    }
    if (!form.email.trim()) e.email = t('required');
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('invalidEmail');
    else if (!form.email.trim().toLowerCase().endsWith('@gmail.com')) e.email = t('gmailRequired');
    else if (!emailVerified) e.email = t('verifyEmailBeforeRegister');
    if (!form.password) e.password = t('required');
    else if (form.password.length < 8) e.password = t('pwReqLength');
    else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(form.password)
    ) {
      e.password = t('min8CharsComplexity');
    }
    if (!form.barangay) e.barangay = t('selectBarangay');
    if (!agreeToTerms) e.agreeToTerms = t('agreeTermsRequired');
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    if (!emailVerified) {
      setError('Please verify your email address first.');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        barangay: form.barangay,
        verificationToken,
      });

      Alert.alert(
        t('accountCreatedSuccess'),
        t('accountCreatedMsg'),
        [
          {
            text: t('signInNow'),
            onPress: () => {
              navigation.navigate('Login', {
                registeredEmail: form.email.trim(),
              });
            },
          },
        ]
      );
    } catch (err) {
      const errField = err?.data?.field || (
        err?.code === 'auth/email-already-in-use' || err?.code === 'auth/invalid-email' ? 'email' :
        err?.code === 'auth/weak-password' ? 'password' :
        err?.code === 'auth/name-already-in-use' ? 'name' :
        err?.code === 'auth/phone-already-in-use' ? 'phone' : null
      );
      const map = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak.',
        'auth/name-already-in-use': 'Name is already registered.',
        'auth/phone-already-in-use': 'Phone number is already registered.',
      };
      const errorMsg = map[err?.code] || err?.data?.message || err?.message || t('error');
      if (errField) {
        setErrors((prev) => ({ ...prev, [errField]: errorMsg }));
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgDeep, colors.bgDark]} style={{ flex: 1 }}>
      <View style={[S.glowBlob, { backgroundColor: colors.primary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

          {/* Profile Notice Callout */}
          <View
            style={[
              S.noticeBox,
              { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryLight} />
            <View style={{ flex: 1 }}>
              <Text style={[S.noticeTitle, { color: colors.primaryLight }]}>
                {t('quickSignUpTitle')}
              </Text>
              <Text style={[S.noticeText, { color: colors.textSecondary }]}>
                {t('quickSignUpNotice')}
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
            {/* Google Quick Pre-Verification Button */}
            {!emailVerified && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: scale(10),
                  backgroundColor: colors.bgCardAlt,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: RADIUS.md,
                  height: verticalScale(48),
                  marginBottom: verticalScale(16),
                }}
                onPress={handleGooglePreVerify}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryLight} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#EA4335" />
                    <Text style={{ fontSize: rf(13.5), fontWeight: '700', color: colors.textPrimary }}>
                      {t('verifyEmailGoogle')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isGoogleVerified && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale(10),
                  backgroundColor: (colors.statusResolved || '#10B981') + '15',
                  borderColor: (colors.statusResolved || '#10B981') + '40',
                  borderWidth: 1,
                  borderRadius: RADIUS.md,
                  padding: scale(12),
                  marginBottom: verticalScale(16),
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.statusResolved || '#10B981'} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(12.5), fontWeight: '700', color: colors.statusResolved || '#10B981' }}>
                    {t('emailPreVerifiedGoogle')}
                  </Text>
                  <Text style={{ fontSize: rf(11), color: colors.textSecondary }} numberOfLines={1}>
                    {form.email} · {t('otpSkipped')}
                  </Text>
                </View>
              </View>
            )}

            {/* Name */}
            <View style={{ marginBottom: verticalScale(14) }}>
              <Text style={[S.fieldLabel, { color: colors.textSecondary }]}>
                {`${t('fullName').toUpperCase()}`} *
              </Text>
              <InputField
                value={form.name}
                onChangeText={(v) => set('name', v)}
                placeholder={t('namePlaceholder') || 'Example: Juan M. Dela Cruz'}
                autoCapitalize="words"
                leftIcon="person-outline"
                error={errors.name}
                style={{ marginBottom: 0 }}
              />
            </View>

            {/* Email Field with Inline Verification Action */}
            <View style={{ marginBottom: verticalScale(16) }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: verticalScale(6),
                }}
              >
                <Text style={[S.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                  {t('email').toUpperCase()} *
                </Text>

                {emailVerified ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={{ fontSize: rf(11), fontWeight: '700', color: colors.success }}>
                      {isGoogleVerified ? t('verifiedByGoogle') : t('emailVerifiedSuccess')}
                    </Text>
                    {!isGoogleVerified && (
                      <TouchableOpacity
                        onPress={() => {
                          setEmailVerified(false);
                          setVerificationToken(null);
                          setOtpSent(false);
                          setOtpCode('');
                          setOtpSuccess(null);
                          setOtpError(null);
                        }}
                        style={{ marginLeft: scale(6) }}
                      >
                        <Text
                          style={{
                            fontSize: rf(11),
                            color: colors.primaryLight,
                            textDecorationLine: 'underline',
                          }}
                        >
                          {t('changeEmail')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={sendingOtp || otpCooldown > 0}
                    style={{
                      paddingHorizontal: scale(10),
                      paddingVertical: verticalScale(4),
                      backgroundColor: otpCooldown > 0 ? colors.bgCardAlt : colors.primary + '22',
                      borderColor: otpCooldown > 0 ? colors.border : colors.primary,
                      borderWidth: 1,
                      borderRadius: RADIUS.sm,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: rf(11),
                        fontWeight: '700',
                        color: otpCooldown > 0 ? colors.textMuted : colors.primaryLight,
                      }}
                    >
                      {sendingOtp
                        ? t('sendingCode')
                        : otpCooldown > 0
                        ? `${t('resendCodeIn')} (${otpCooldown}s)`
                        : otpSent
                        ? t('resendCode')
                        : t('verifyEmail')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View
                style={[
                  S.inputWrap,
                  {
                    backgroundColor: colors.bgCardAlt,
                    borderColor: errors.email
                      ? colors.danger
                      : emailVerified
                      ? colors.success
                      : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={emailVerified ? colors.success : colors.textMuted}
                  style={{ marginRight: scale(8) }}
                />
                <TextInput
                  style={[
                    S.input,
                    { color: colors.textPrimary },
                    emailVerified && { opacity: 0.8 },
                  ]}
                  value={form.email}
                  editable={!emailVerified}
                  onChangeText={(v) => {
                    set('email', v);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    if (otpError) setOtpError(null);
                  }}
                  placeholder="you@gmail.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailVerified && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                )}
              </View>
              {errors.email && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.statusRejected} />
                  <Text style={{ color: colors.statusRejected, fontSize: rf(11) }}>
                    {errors.email}
                  </Text>
                </View>
              )}

              {/* Inline OTP Verification Card */}
              {otpSent && !emailVerified && (
                <View
                  style={{
                    marginTop: verticalScale(10),
                    padding: scale(14),
                    borderRadius: RADIUS.md,
                    backgroundColor: colors.bgCardAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: rf(12), color: colors.textPrimary, fontWeight: '700', marginBottom: verticalScale(4) }}>
                    Enter 6-Digit Code
                  </Text>
                  <Text style={{ fontSize: rf(11), color: colors.textMuted, marginBottom: verticalScale(8) }}>
                    A verification code was sent to {form.email}.
                  </Text>

                  {otpSuccess && (
                    <Text style={{ color: colors.success, fontSize: rf(11), marginBottom: verticalScale(6) }}>
                      {otpSuccess}
                    </Text>
                  )}
                  {otpError && (
                    <Text style={{ color: colors.danger, fontSize: rf(11), marginBottom: verticalScale(6) }}>
                      {otpError}
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', gap: scale(8), alignItems: 'center' }}>
                    <TextInput
                      style={[
                        S.inputWrap,
                        {
                          flex: 1,
                          fontSize: rf(16),
                          fontWeight: '800',
                          letterSpacing: 6,
                          textAlign: 'center',
                          backgroundColor: colors.bgDark,
                          borderColor: otpError ? colors.danger : colors.border,
                          paddingVertical: verticalScale(8),
                          color: colors.textPrimary,
                        },
                      ]}
                      value={otpCode}
                      onChangeText={(v) => {
                        setOtpCode(v.replace(/\D/g, '').slice(0, 6));
                        if (otpError) setOtpError(null);
                      }}
                      placeholder="••••••"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      onPress={handleVerifyOtp}
                      disabled={verifyingOtp || otpCode.length !== 6}
                      style={{
                        paddingHorizontal: scale(16),
                        paddingVertical: verticalScale(12),
                        backgroundColor: otpCode.length === 6 ? colors.primary : colors.bgCard,
                        borderRadius: RADIUS.md,
                        opacity: otpCode.length === 6 ? 1 : 0.6,
                        borderWidth: 1,
                        borderColor: otpCode.length === 6 ? colors.primary : colors.border,
                      }}
                    >
                      {verifyingOtp ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: otpCode.length === 6 ? '#fff' : colors.textMuted, fontWeight: '700', fontSize: rf(12) }}>
                          {t('verifyBtn')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Password */}
            <View style={{ marginBottom: verticalScale(14) }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>{t('password').toUpperCase()} *</Text>
              <View
                style={[
                  S.inputWrap,
                  {
                    backgroundColor: colors.bgCardAlt,
                    borderColor: errors.password
                      ? colors.danger
                      : pwFocused
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={pwFocused ? colors.primary : colors.textMuted}
                  style={{ marginRight: scale(8) }}
                />
                <TextInput
                  style={[S.input, { color: colors.textPrimary }]}
                  value={form.password}
                  onChangeText={(v) => {
                    set('password', v);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                  }}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  placeholder={t('min8Chars')}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPw}
                />
                <TouchableOpacity onPress={() => setShowPw((p) => !p)}>
                  <Ionicons
                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{errors.password}</Text>
                </View>
              )}
            </View>

            {/* Password strength & requirements */}
            {(pwFocused || form.password.length > 0) && (
              <View
                style={[
                  S.pwChecker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                ]}
              >
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
                    { key: 'minLength', label: t('pwReqLength') },
                    { key: 'hasUpper', label: t('pwReqUpper') },
                    { key: 'hasLower', label: t('pwReqLower') },
                    { key: 'hasNumber', label: t('pwReqNumber') },
                    { key: 'hasSpecial', label: t('pwReqSpecial') },
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

            {/* Optional Phone */}
            <InputField
              label={`${t('phoneOptional').toUpperCase()}`}
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
              placeholder={t('phonePlaceholderOptional')}
              keyboardType="phone-pad"
              maxLength={11}
              leftIcon="call-outline"
            />

            {/* Barangay picker */}
            <View style={{ marginBottom: verticalScale(14) }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>
                {t('barangay').toUpperCase()} *
              </Text>
              <TouchableOpacity
                style={[
                  S.picker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  errors.barangay && { borderColor: colors.danger },
                ]}
                onPress={() => {
                  setShowPicker((p) => !p);
                  setBarangaySearch('');
                }}
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
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                    <TextInput
                      value={barangaySearch}
                      onChangeText={setBarangaySearch}
                      placeholder={t('searchBarangay')}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1, paddingVertical: 10, color: colors.textPrimary, fontSize: rf(13) }}
                    />
                    {barangaySearch.length > 0 && (
                      <TouchableOpacity onPress={() => setBarangaySearch('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {filteredBarangays.length === 0 && (
                      <Text style={{ padding: 14, color: colors.textMuted, fontSize: rf(12) }}>
                        {t('noBarangayFound')}
                      </Text>
                    )}
                    {filteredBarangays.map((b) => (
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
                          setBarangaySearch('');
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

            {/* Profile Completion Callout */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: scale(10),
                backgroundColor: colors.primary + '12',
                borderColor: colors.primary + '30',
                borderWidth: 1,
                borderRadius: RADIUS.md,
                padding: scale(12),
                marginBottom: verticalScale(16),
                marginTop: verticalScale(4),
              }}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.primaryLight} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rf(12), fontWeight: '700', color: colors.primaryLight, marginBottom: 2 }}>
                  {t('idVerificationInProfile')}
                </Text>
                <Text style={{ fontSize: rf(11), color: colors.textSecondary, lineHeight: rf(15) }}>
                  {t('idVerificationInProfileNotice')}
                </Text>
              </View>
            </View>

            {/* Terms & Privacy */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 4 }}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={agreeToTerms ? "checkbox" : "square-outline"} 
                size={22} 
                color={agreeToTerms ? colors.primaryLight : colors.textMuted} 
              />
              <Text style={{ marginLeft: 10, color: colors.textSecondary, fontSize: rf(13), flex: 1, lineHeight: rf(18) }}>
                {t('agreeTermsPrefix')} <Text style={{ color: colors.primaryLight, fontWeight: '700' }} onPress={() => navigation.navigate('TermsAndPolicy')}>{t('termsOfService')}</Text> {t('andWord')} <Text style={{ color: colors.primaryLight, fontWeight: '700' }} onPress={() => navigation.navigate('TermsAndPolicy')}>{t('privacyPolicy')}</Text>
              </Text>
            </TouchableOpacity>
            {errors.agreeToTerms && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale(5),
                  marginBottom: 16,
                }}
              >
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={{ color: colors.danger, fontSize: rf(12) }}>{errors.agreeToTerms}</Text>
              </View>
            )}

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

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: rf(14),
    padding: 0,
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
});
