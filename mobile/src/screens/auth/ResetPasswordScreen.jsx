import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { BASE_URL } from '../../context/AuthContext';
import { RADIUS, SHADOWS } from '../../utils/theme';
import { scale, verticalScale, rf } from '../../utils/responsive';

const OTP_LENGTH = 6;

export default function ResetPasswordScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const email = route.params?.email || '';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (success) {
      Animated.spring(successScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [success]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ── OTP input handlers ──────────────────────────────────────────────────
  const handleOtpChange = (value, index) => {
    if (error) setError(null);

    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, OTP_LENGTH);
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + digits.length, OTP_LENGTH - 1);
      otpRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ── Password strength ───────────────────────────────────────────────────
  const getPasswordStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: colors.textMuted };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[@$!%*?&]/.test(pw)) score++;

    if (score <= 2) return { level: score, label: t('weak') || 'Weak', color: colors.danger };
    if (score <= 3) return { level: score, label: t('fair') || 'Fair', color: colors.warning };
    if (score <= 4) return { level: score, label: t('good') || 'Good', color: colors.info };
    return { level: score, label: t('strong') || 'Strong', color: colors.success };
  };

  const pwStrength = getPasswordStrength(newPassword);

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    const otpStr = otp.join('');
    if (otpStr.length !== OTP_LENGTH) errs.otp = t('enterFullCode') || 'Enter the full 6-digit code';
    if (!newPassword) {
      errs.password = t('required');
    } else {
      const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!complexityRegex.test(newPassword)) {
        errs.password = t('passwordComplexity') || 'Must be 8+ chars with uppercase, lowercase, number & symbol';
      }
    }
    if (newPassword !== confirmPassword) {
      errs.confirm = t('passwordsMismatch') || 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: otp.join(''),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setSuccess(true);
    } catch (err) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to resend');
      setCountdown(60);
      setOtp(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
    } catch (err) {
      Alert.alert(t('error'), err.message);
    } finally {
      setResending(false);
    }
  };

  // ── Success view ────────────────────────────────────────────────────────
  if (success) {
    return (
      <LinearGradient colors={[colors.bgDeep, colors.bgDark]} style={{ flex: 1 }}>
        <View style={[S.glowBlob, { backgroundColor: colors.success }]} />
        <View style={S.successContainer}>
          <Animated.View
            style={[S.successCard, { backgroundColor: colors.bgCard, borderColor: colors.border, transform: [{ scale: successScale }] }]}
          >
            <View
              style={[S.successIconWrap, { backgroundColor: colors.success + '18', borderColor: colors.success + '44' }]}
            >
              <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            </View>
            <Text style={[S.successTitle, { color: colors.textPrimary }]}>
              {t('passwordResetSuccess')}
            </Text>
            <Text style={[S.successMsg, { color: colors.textSecondary }]}>
              {t('passwordResetSuccessDesc')}
            </Text>
            <TouchableOpacity
              style={[S.submitBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={S.submitText}>{t('backToLogin')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgDeep, colors.bgDark]} style={{ flex: 1 }}>
      <View style={[S.glowBlob, { backgroundColor: colors.primary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={[S.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            {/* Header */}
            <View style={S.header}>
              <View
                style={[S.iconCircle, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
              >
                <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[S.title, { color: colors.textPrimary }]}>{t('resetPassword')}</Text>
              <Text style={[S.subtitle, { color: colors.textSecondary }]}>
                {t('resetPasswordDesc')}
              </Text>
            </View>

            {/* Form card */}
            <View style={[S.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {/* Error banner */}
              {error && (
                <View
                  style={[S.errorBanner, { backgroundColor: colors.danger + '14', borderColor: colors.danger + '33' }]}
                >
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={[S.errorBannerText, { color: colors.danger }]}>{error}</Text>
                  <TouchableOpacity onPress={() => setError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Email badge */}
              <View
                style={[S.emailBadge, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}
              >
                <Ionicons name="mail" size={14} color={colors.primary} />
                <Text style={[S.emailBadgeText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {email}
                </Text>
              </View>

              {/* OTP input */}
              <View style={S.field}>
                <Text style={[S.label, { color: colors.textMuted }]}>
                  {(t('verificationCode') || 'VERIFICATION CODE').toUpperCase()}
                </Text>
                <View style={S.otpRow}>
                  {otp.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={(ref) => (otpRefs.current[idx] = ref)}
                      style={[
                        S.otpBox,
                        {
                          backgroundColor: colors.bgCardAlt,
                          borderColor: digit ? colors.primary : colors.border,
                          color: colors.textPrimary,
                        },
                        errors.otp && !digit && { borderColor: colors.danger },
                      ]}
                      value={digit}
                      onChangeText={(v) => handleOtpChange(v, idx)}
                      onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={idx === 0 ? OTP_LENGTH : 1}
                      selectTextOnFocus
                    />
                  ))}
                </View>
                {errors.otp && (
                  <Text style={[S.errText, { color: colors.danger }]}>⚠ {errors.otp}</Text>
                )}
              </View>

              {/* Resend row */}
              <View style={S.resendRow}>
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={countdown > 0 || resending}
                  style={S.resendBtn}
                >
                  {resending ? (
                    <ActivityIndicator size="small" color={colors.primaryLight} />
                  ) : (
                    <Text
                      style={[
                        S.resendText,
                        { color: countdown > 0 ? colors.textMuted : colors.primaryLight },
                      ]}
                    >
                      {countdown > 0
                        ? `${t('resendCode') || 'Resend code'} (${countdown}s)`
                        : t('resendCode') || 'Resend code'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <View style={S.field}>
                <Text style={[S.label, { color: colors.textMuted }]}>
                  {(t('newPassword') || 'NEW PASSWORD').toUpperCase()}
                </Text>
                <View
                  style={[
                    S.inputWrap,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                    errors.password && { borderColor: colors.danger },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={17} color={colors.textMuted} />
                  <TextInput
                    style={[S.input, { color: colors.textPrimary, paddingRight: 40 }]}
                    value={newPassword}
                    onChangeText={(v) => {
                      setNewPassword(v);
                      if (errors.password) setErrors((p) => ({ ...p, password: null }));
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPw}
                  />
                  <TouchableOpacity style={S.eyeBtn} onPress={() => setShowPw((p) => !p)}>
                    <Ionicons
                      name={showPw ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={[S.errText, { color: colors.danger }]}>⚠ {errors.password}</Text>
                )}

                {/* Password strength meter */}
                {newPassword.length > 0 && (
                  <View style={S.strengthRow}>
                    <View style={S.strengthBar}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <View
                          key={i}
                          style={[
                            S.strengthSegment,
                            {
                              backgroundColor: i <= pwStrength.level ? pwStrength.color : colors.bgCardAlt,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[S.strengthLabel, { color: pwStrength.color }]}>
                      {pwStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Confirm Password */}
              <View style={S.field}>
                <Text style={[S.label, { color: colors.textMuted }]}>
                  {(t('confirmPassword') || 'CONFIRM PASSWORD').toUpperCase()}
                </Text>
                <View
                  style={[
                    S.inputWrap,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                    errors.confirm && { borderColor: colors.danger },
                  ]}
                >
                  <Ionicons name="lock-open-outline" size={17} color={colors.textMuted} />
                  <TextInput
                    style={[S.input, { color: colors.textPrimary, paddingRight: 40 }]}
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      if (errors.confirm) setErrors((p) => ({ ...p, confirm: null }));
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPw}
                  />
                  <TouchableOpacity style={S.eyeBtn} onPress={() => setShowConfirmPw((p) => !p)}>
                    <Ionicons
                      name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirm && (
                  <Text style={[S.errText, { color: colors.danger }]}>⚠ {errors.confirm}</Text>
                )}
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[
                  S.submitBtn,
                  { backgroundColor: colors.primary },
                  loading && { opacity: 0.65 },
                ]}
                onPress={handleReset}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="key-outline" size={18} color="#fff" />
                    <Text style={S.submitText}>{t('resetPassword')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(56),
    paddingBottom: verticalScale(40),
  },

  glowBlob: {
    position: 'absolute',
    top: verticalScale(-100),
    left: '50%',
    marginLeft: scale(-150),
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    opacity: 0.08,
  },

  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(24),
  },

  header: {
    alignItems: 'center',
    marginBottom: verticalScale(28),
  },
  iconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: rf(24),
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: verticalScale(8),
  },
  subtitle: {
    fontSize: rf(14),
    textAlign: 'center',
    lineHeight: rf(21),
    paddingHorizontal: scale(8),
  },

  card: {
    borderRadius: RADIUS['2xl'],
    padding: scale(24),
    borderWidth: 1,
    ...SHADOWS.card,
  },

  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(9),
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginBottom: verticalScale(20),
    alignSelf: 'center',
  },
  emailBadgeText: {
    fontSize: rf(12),
    maxWidth: scale(220),
  },

  field: { marginBottom: verticalScale(16) },
  label: {
    fontSize: rf(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: verticalScale(8),
  },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(8),
  },
  otpBox: {
    width: scale(44),
    height: verticalScale(52),
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: rf(20),
    fontWeight: '800',
  },

  resendRow: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  resendBtn: {
    paddingVertical: verticalScale(6),
  },
  resendText: {
    fontSize: rf(13),
    fontWeight: '600',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: rf(14) },
  eyeBtn: { position: 'absolute', right: scale(14) },
  errText: { fontSize: rf(11), marginTop: verticalScale(5) },

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(8),
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: scale(4),
    height: verticalScale(4),
  },
  strengthSegment: {
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: rf(11),
    fontWeight: '700',
    width: scale(48),
    textAlign: 'right',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: scale(12),
    marginBottom: verticalScale(16),
  },
  errorBannerText: {
    flex: 1,
    fontSize: rf(12),
    fontWeight: '600',
    lineHeight: rf(18),
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    borderRadius: RADIUS.md,
    height: verticalScale(52),
    marginTop: verticalScale(8),
    ...SHADOWS.button,
  },
  submitText: { color: '#fff', fontSize: rf(15), fontWeight: '700' },

  // Success view
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(24),
  },
  successCard: {
    width: '100%',
    borderRadius: RADIUS['2xl'],
    padding: scale(32),
    borderWidth: 1,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  successIconWrap: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  successTitle: {
    fontSize: rf(22),
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: verticalScale(10),
    textAlign: 'center',
  },
  successMsg: {
    fontSize: rf(14),
    textAlign: 'center',
    lineHeight: rf(21),
    marginBottom: verticalScale(24),
  },
});
