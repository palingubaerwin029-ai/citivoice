import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, VERIFICATION_STATUS } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { RADIUS, SHADOWS } from "../../utils/theme";
import { useTheme } from "../../context/ThemeContext";
import { scale, verticalScale, rf } from "../../utils/responsive";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "fil", label: "FIL" },
  { code: "hil", label: "HIL" },
];

// ── Blocked status screen ─────────────────────────────────────────────────
function VerificationGate({ user, onLogout, onGoVerify }) {
  const { colors } = useTheme();
  const status = user?.verification_status;

  const CONFIG = {
    [VERIFICATION_STATUS.UNVERIFIED]: {
      icon: "📋",
      color: "#94A3B8",
      title: "Identity Verification Required",
      message:
        "To protect the community, we require all citizens to verify their identity before accessing CitiVoice.",
      action: "Submit My ID",
      actionFn: onGoVerify,
      actionColor: colors.primary,
    },
    [VERIFICATION_STATUS.PENDING]: {
      icon: "⏳",
      color: "#F59E0B",
      title: "Account Under Review",
      message:
        "Your ID has been submitted and is currently being reviewed by the administrator. This usually takes 1–2 business days.",
      action: null, // no action — must wait
      actionColor: null,
    },
    [VERIFICATION_STATUS.REJECTED]: {
      icon: "❌",
      color: "#EF4444",
      title: "Verification Rejected",
      message: user?.rejectionReason
        ? `Reason: ${user.rejectionReason}`
        : "Your verification was rejected by the administrator. Please resubmit with a valid government ID.",
      action: "Resubmit ID",
      actionFn: onGoVerify,
      actionColor: "#EF4444",
    },
  };

  const cfg = CONFIG[status] || CONFIG[VERIFICATION_STATUS.UNVERIFIED];

  return (
    <View style={[G.container, { backgroundColor: colors.bgDark }]}>
      {/* Background glow */}
      <View style={[G.glow, { backgroundColor: cfg.color }]} />

      <View style={[G.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {/* Status icon */}
        <View
          style={[
            G.iconWrap,
            {
              borderColor: cfg.color + "44",
              backgroundColor: cfg.color + "12",
            },
          ]}
        >
          <Text style={G.icon}>{cfg.icon}</Text>
        </View>

        {/* Status badge */}
        <View
          style={[
            G.statusBadge,
            {
              backgroundColor: cfg.color + "1A",
              borderColor: cfg.color + "44",
            },
          ]}
        >
          <View style={[G.statusDot, { backgroundColor: cfg.color }]} />
          <Text style={[G.statusText, { color: cfg.color }]}>
            {status === VERIFICATION_STATUS.UNVERIFIED
              ? "Not Verified"
              : status === VERIFICATION_STATUS.PENDING
                ? "Pending Review"
                : "Rejected"}
          </Text>
        </View>

        <Text style={[G.title, { color: colors.textPrimary }]}>{cfg.title}</Text>
        <Text style={[G.message, { color: colors.textSecondary }]}>{cfg.message}</Text>

        {/* Steps for unverified */}
        {status === VERIFICATION_STATUS.UNVERIFIED && (
          <View style={[G.stepsBox, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}>
            {[
              { n: "1", text: "Submit a valid government ID" },
              { n: "2", text: "Admin reviews your submission" },
              { n: "3", text: "Get verified and access CitiVoice" },
            ].map((step) => (
              <View key={step.n} style={G.step}>
                <View style={[G.stepNum, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
                  <Text style={[G.stepNumText, { color: colors.primaryLight }]}>{step.n}</Text>
                </View>
                <Text style={[G.stepText, { color: colors.textSecondary }]}>{step.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pending info box */}
        {status === VERIFICATION_STATUS.PENDING && (
          <View style={[G.pendingBox, { backgroundColor: colors.statusPending + '14', borderColor: colors.statusPending + '33' }]}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.statusPending}
            />
            <Text style={[G.pendingText, { color: colors.statusPending }]}>
              You will be notified once your account is approved. You may check
              back later.
            </Text>
          </View>
        )}

        {/* Action button */}
        {cfg.action && (
          <TouchableOpacity
            style={[G.actionBtn, { backgroundColor: cfg.actionColor }]}
            onPress={cfg.actionFn}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={G.actionBtnText}>{cfg.action}</Text>
          </TouchableOpacity>
        )}

        {/* Sign out */}
        <TouchableOpacity style={G.signOutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={16} color={colors.textMuted} />
          <Text style={[G.signOutText, { color: colors.textMuted }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Account info pill */}
      <View style={[G.accountPill, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Ionicons
          name="person-circle-outline"
          size={14}
          color={colors.textMuted}
        />
        <Text style={[G.accountEmail, { color: colors.textSecondary }]} numberOfLines={1}>
          {user?.email}
        </Text>
      </View>
    </View>
  );
}

// ── Main Login Screen ──────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { login, logout, user } = useAuth();
  const { t, language, changeLanguage } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Show verification gate if user is blocked ─────────────────────────
  if (user?._blocked) {
    return (
      <VerificationGate
        user={user}
        onLogout={logout}
        onGoVerify={() => navigation.navigate("VerifyIdentity")}
      />
    );
  }

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = t('required');
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t('invalidEmail');
    if (!password) e.password = t('required');
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const userData = await login(email.trim(), password);

      // ── Intercept blocked statuses ──────────────────────────────────
      // onAuthStateChanged will set user._blocked = true automatically,
      // which will trigger the VerificationGate above.
      // But we also handle it here for immediate feedback.

      if (userData.role !== "admin") {
        const st = userData.verification_status;

        if (st === VERIFICATION_STATUS.UNVERIFIED) {
          // Let onAuthStateChanged handle the redirect to gate
          return;
        }
        if (st === VERIFICATION_STATUS.PENDING) {
          return; // gate will show
        }
        if (st === VERIFICATION_STATUS.REJECTED) {
          return; // gate will show with rejection reason
        }
        // st === 'verified' → AppNavigator will route to CitizenTabs
      }
      // admin → AppNavigator routes to AdminTabs
    } catch (err) {
      const map = {
        "auth/invalid-credential": "Wrong email or password.",
        "auth/user-not-found": "No account with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/network-request-failed": "No internet connection.",
        NO_PROFILE: "Account not set up. Please register.",
      };
      Alert.alert(
        t('loginFailed'),
        map[err.code] || map[err.message] || t('error'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.bgDeep, colors.bgDark]}
      style={{ flex: 1 }}
    >
      <View style={[S.glowBlob, { backgroundColor: colors.primary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Language switcher */}
          <View style={S.langRow}>
            {LANGS.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[S.langChip, { borderColor: colors.border }, language === l.code && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => changeLanguage(l.code)}
              >
                <Text
                  style={[S.langText, { color: colors.textMuted }, language === l.code && { color: '#fff' }]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logo */}
          <View style={S.logoSection}>
            <Image
              source={require("../../../assets/logo.png")}
              style={S.logoImage}
              resizeMode="contain"
            />
            <Text style={[S.appName, { color: colors.textPrimary }]}>CitiVoice</Text>
            <Text style={[S.appTagline, { color: colors.primaryLight }]}>Kabankalan City</Text>
            <Text style={[S.cityDescText, { color: colors.textSecondary }]}>
              {t('cityDescription')}
            </Text>
          </View>

          {/* Form card */}
          <View style={[S.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[S.cardTitle, { color: colors.textPrimary }]}>{t('welcomeBack')}</Text>
            <Text style={[S.cardSubtitle, { color: colors.textSecondary }]}>{t('signInSubtitle')}</Text>

            {/* Email */}
            <View style={S.field}>
              <Text style={[S.label, { color: colors.textMuted }]}>{t('email').toUpperCase()}</Text>
              <View style={[S.inputWrap, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }, errors.email && { borderColor: colors.danger }]}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={colors.textMuted}
                />
                <TextInput
                  style={[S.input, { color: colors.textPrimary }]}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErrors((e) => ({ ...e, email: null }));
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && <Text style={[S.errText, { color: colors.danger }]}>⚠ {errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={S.field}>
              <Text style={[S.label, { color: colors.textMuted }]}>{t('password').toUpperCase()}</Text>
              <View style={[S.inputWrap, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }, errors.password && { borderColor: colors.danger }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={colors.textMuted}
                />
                <TextInput
                  style={[S.input, { color: colors.textPrimary, paddingRight: 40 }]}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((e) => ({ ...e, password: null }));
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPw}
                />
                <TouchableOpacity
                  style={S.eyeBtn}
                  onPress={() => setShowPw((p) => !p)}
                >
                  <Ionicons
                    name={showPw ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={[S.errText, { color: colors.danger }]}>⚠ {errors.password}</Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[S.submitBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.65 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={S.submitText}>{t('login')}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <View style={S.registerRow}>
              <Text style={[S.registerText, { color: colors.textSecondary }]}>{t('noAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={[S.registerLink, { color: colors.primaryLight }]}>{t('register')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info note */}
          <View style={S.noteBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={[S.noteText, { color: colors.textMuted }]}>
              {t('adminVerificationNote')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ── Styles: Login Screen ───────────────────────────────────────────────────
const S = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(64),
    paddingBottom: verticalScale(40),
  },

  glowBlob: {
    position: "absolute",
    top: verticalScale(-100),
    left: "50%",
    marginLeft: scale(-150),
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    opacity: 0.08,
  },

  langRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: scale(6),
    marginBottom: verticalScale(24),
  },
  langChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  logoSection: { alignItems: "center", marginBottom: verticalScale(30) },
  logoImage: {
    width: scale(96),
    height: scale(96),
    borderRadius: RADIUS.lg,
    marginBottom: verticalScale(12),
  },
  appName: {
    fontSize: rf(28),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  appTagline: { 
    fontSize: rf(13), 
    fontWeight: "700", 
    marginTop: verticalScale(4) 
  },
  cityDescText: {
    fontSize: rf(12.5),
    textAlign: "center",
    lineHeight: rf(18.5),
    marginTop: verticalScale(8),
    paddingHorizontal: scale(16),
  },

  card: {
    borderRadius: RADIUS["2xl"],
    padding: scale(24),
    borderWidth: 1,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: verticalScale(4),
  },
  cardSubtitle: { fontSize: rf(13), marginBottom: verticalScale(24) },

  field: { marginBottom: verticalScale(16) },
  label: {
    fontSize: rf(10),
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: verticalScale(8),
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: rf(14) },
  eyeBtn: { position: "absolute", right: scale(14) },
  errText: { fontSize: rf(11), marginTop: verticalScale(5) },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    borderRadius: RADIUS.md,
    height: verticalScale(52),
    marginTop: verticalScale(8),
    ...SHADOWS.button,
  },
  submitText: { color: "#fff", fontSize: rf(15), fontWeight: "700" },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: verticalScale(20),
  },
  registerText: { fontSize: rf(14) },
  registerLink: { fontSize: rf(14), fontWeight: "700" },

  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(7),
    marginTop: verticalScale(20),
  },
  noteText: { fontSize: rf(12) },
});

// ── Styles: Verification Gate ──────────────────────────────────────────────
const G = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },

  glow: {
    position: "absolute",
    top: verticalScale(-80),
    width: scale(280),
    height: scale(280),
    borderRadius: scale(140),
    opacity: 0.06,
  },

  card: {
    width: "100%",
    borderRadius: RADIUS["2xl"],
    padding: scale(24),
    borderWidth: 1,
    alignItems: "center",
    ...SHADOWS.card,
  },

  iconWrap: {
    width: scale(80),
    height: scale(80),
    borderRadius: RADIUS["2xl"],
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
  },
  icon: { fontSize: rf(36) },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(7),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginBottom: verticalScale(16),
  },
  statusDot: { width: scale(7), height: scale(7), borderRadius: scale(4) },
  statusText: { fontSize: rf(12), fontWeight: "700" },

  title: {
    fontSize: rf(19),
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: verticalScale(10),
  },
  message: {
    fontSize: rf(14),
    textAlign: "center",
    lineHeight: rf(22),
    marginBottom: verticalScale(20),
  },

  stepsBox: {
    width: "100%",
    borderRadius: RADIUS.lg,
    padding: scale(16),
    borderWidth: 1,
    marginBottom: verticalScale(20),
    gap: verticalScale(12),
  },
  step: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  stepNum: {
    width: scale(26),
    height: scale(26),
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: { fontSize: rf(12), fontWeight: "800" },
  stepText: { fontSize: rf(13), flex: 1 },

  pendingBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(10),
    borderRadius: RADIUS.lg,
    padding: scale(14),
    borderWidth: 1,
    marginBottom: verticalScale(20),
    width: "100%",
  },
  pendingText: { fontSize: rf(13), lineHeight: rf(20), flex: 1 },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    width: "100%",
    height: verticalScale(50),
    borderRadius: RADIUS.md,
    marginBottom: verticalScale(12),
    ...SHADOWS.button,
  },
  actionBtnText: { color: "#fff", fontSize: rf(15), fontWeight: "700" },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(7),
    paddingVertical: verticalScale(10),
  },
  signOutText: { fontSize: rf(14) },

  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: verticalScale(16),
    borderRadius: RADIUS.full,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(7),
    borderWidth: 1,
  },
  accountEmail: { fontSize: rf(12), maxWidth: scale(240) },
});
