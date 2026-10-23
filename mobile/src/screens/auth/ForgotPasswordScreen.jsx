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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { BASE_URL } from '../../context/AuthContext';
import { RADIUS, SHADOWS } from '../../utils/theme';
import { scale, verticalScale, rf } from '../../utils/responsive';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  // Animations
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
    if (sent) {
      Animated.spring(successScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }
  }, [sent]);

  const validateEmail = (value) => {
    if (!value.trim()) return t('required');
    if (!/\S+@\S+\.\S+/.test(value)) return t('invalidEmail');
    return null;
  };

  const handleSendCode = async () => {
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setSent(true);
    } catch (err) {
      setError(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('ResetPassword', { email: email.trim() });
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
          {/* Back button */}
          <TouchableOpacity
            style={[S.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Header */}
            <View style={S.header}>
              <View
                style={[S.iconCircle, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
              >
                <Ionicons name="key-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[S.title, { color: colors.textPrimary }]}>{t('forgotPassword')}</Text>
              <Text style={[S.subtitle, { color: colors.textSecondary }]}>
                {t('forgotPasswordDesc')}
              </Text>
            </View>

            {/* Form card */}
            <View style={[S.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {!sent ? (
                <>
                  {/* Error banner */}
                  {error && (
                    <View
                      style={[
                        S.errorBanner,
                        { backgroundColor: colors.danger + '14', borderColor: colors.danger + '33' },
                      ]}
                    >
                      <Ionicons name="alert-circle" size={18} color={colors.danger} />
                      <Text style={[S.errorBannerText, { color: colors.danger }]}>{error}</Text>
                    </View>
                  )}

                  {/* Email field */}
                  <View style={S.field}>
                    <Text style={[S.label, { color: colors.textMuted }]}>
                      {t('email').toUpperCase()}
                    </Text>
                    <View
                      style={[
                        S.inputWrap,
                        { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                        error && { borderColor: colors.danger },
                      ]}
                    >
                      <Ionicons name="mail-outline" size={17} color={colors.textMuted} />
                      <TextInput
                        style={[S.input, { color: colors.textPrimary }]}
                        value={email}
                        onChangeText={(v) => {
                          setEmail(v);
                          if (error) setError(null);
                        }}
                        placeholder="you@gmail.com"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                      />
                    </View>
                  </View>

                  {/* Send button */}
                  <TouchableOpacity
                    style={[
                      S.submitBtn,
                      { backgroundColor: colors.primary },
                      loading && { opacity: 0.65 },
                    ]}
                    onPress={handleSendCode}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send-outline" size={18} color="#fff" />
                        <Text style={S.submitText}>{t('sendResetCode')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                /* Success state */
                <Animated.View
                  style={[S.successSection, { transform: [{ scale: successScale }] }]}
                >
                  <View
                    style={[
                      S.successIcon,
                      { backgroundColor: colors.success + '18', borderColor: colors.success + '44' },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  </View>
                  <Text style={[S.successTitle, { color: colors.textPrimary }]}>
                    {t('codeSent')}
                  </Text>
                  <Text style={[S.successMsg, { color: colors.textSecondary }]}>
                    {t('codeSentDesc')}
                  </Text>

                  {/* Email badge */}
                  <View
                    style={[
                      S.emailBadge,
                      { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="mail" size={14} color={colors.primary} />
                    <Text style={[S.emailBadgeText, { color: colors.textPrimary }]}>
                      {email.trim()}
                    </Text>
                  </View>

                  {/* Continue to reset */}
                  <TouchableOpacity
                    style={[S.submitBtn, { backgroundColor: colors.primary }]}
                    onPress={handleContinue}
                    activeOpacity={0.85}
                  >
                    <Text style={S.submitText}>{t('enterResetCode')}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>

                  {/* Resend */}
                  <TouchableOpacity
                    style={S.resendBtn}
                    onPress={() => {
                      setSent(false);
                      setError(null);
                    }}
                  >
                    <Text style={[S.resendText, { color: colors.textMuted }]}>
                      {t('didntReceiveCode')}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {/* Back to login link */}
              <View style={S.backRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  style={S.backLink}
                >
                  <Ionicons name="arrow-back-outline" size={16} color={colors.primaryLight} />
                  <Text style={[S.backLinkText, { color: colors.primaryLight }]}>
                    {t('backToLogin')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Security note */}
          <View style={S.noteBox}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
            <Text style={[S.noteText, { color: colors.textMuted }]}>
              {t('resetCodeExpiry')}
            </Text>
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

  field: { marginBottom: verticalScale(20) },
  label: {
    fontSize: rf(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: verticalScale(8),
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
    marginTop: verticalScale(4),
    ...SHADOWS.button,
  },
  submitText: { color: '#fff', fontSize: rf(15), fontWeight: '700' },

  successSection: {
    alignItems: 'center',
    paddingVertical: verticalScale(8),
  },
  successIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  successTitle: {
    fontSize: rf(20),
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: verticalScale(8),
  },
  successMsg: {
    fontSize: rf(14),
    textAlign: 'center',
    lineHeight: rf(21),
    marginBottom: verticalScale(16),
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginBottom: verticalScale(20),
  },
  emailBadgeText: {
    fontSize: rf(13),
    fontWeight: '600',
  },

  resendBtn: {
    marginTop: verticalScale(16),
    paddingVertical: verticalScale(8),
  },
  resendText: {
    fontSize: rf(13),
    fontWeight: '600',
  },

  backRow: {
    alignItems: 'center',
    marginTop: verticalScale(20),
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(4),
  },
  backLinkText: {
    fontSize: rf(14),
    fontWeight: '700',
  },

  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(7),
    marginTop: verticalScale(20),
  },
  noteText: { fontSize: rf(12) },
});
