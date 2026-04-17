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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, VERIFICATION_STATUS } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { COLORS, RADIUS, SHADOWS } from "../../utils/theme";
import { scale, verticalScale, rf } from "../../utils/responsive";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "fil", label: "FIL" },
  { code: "hil", label: "HIL" },
];

// ── Blocked status screen ─────────────────────────────────────────────────
function VerificationGate({ user, onLogout, onGoVerify }) {
  const status = user?.verificationStatus;

  const CONFIG = {
    [VERIFICATION_STATUS.UNVERIFIED]: {
      icon: "📋",
      color: "#94A3B8",
      title: "Identity Verification Required",
      message:
        "To protect the community, we require all citizens to verify their identity before accessing CitiVoice.",
      action: "Submit My ID",
      actionFn: onGoVerify,
      actionColor: COLORS.primary,
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
    <View style={G.container}>
      {/* Background glow */}
      <View style={[G.glow, { backgroundColor: cfg.color }]} />

      <View style={G.card}>
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

        <Text style={G.title}>{cfg.title}</Text>
        <Text style={G.message}>{cfg.message}</Text>

        {/* Steps for unverified */}
        {status === VERIFICATION_STATUS.UNVERIFIED && (
          <View style={G.stepsBox}>
            {[
              { n: "1", text: "Submit a valid government ID" },
              { n: "2", text: "Admin reviews your submission" },
              { n: "3", text: "Get verified and access CitiVoice" },
            ].map((step) => (
              <View key={step.n} style={G.step}>
                <View style={G.stepNum}>
                  <Text style={G.stepNumText}>{step.n}</Text>
                </View>
                <Text style={G.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pending info box */}
        {status === VERIFICATION_STATUS.PENDING && (
          <View style={G.pendingBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#F59E0B"
            />
            <Text style={G.pendingText}>
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
          <Ionicons name="log-out-outline" size={16} color={COLORS.textMuted} />
          <Text style={G.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Account info pill */}
      <View style={G.accountPill}>
        <Ionicons
          name="person-circle-outline"
          size={14}
          color={COLORS.textMuted}
        />
        <Text style={G.accountEmail} numberOfLines={1}>
          {user?.email}
        </Text>
      </View>
    </View>
  );
}

// ── Main Login Screen ──────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { login, logout, user } = useAuth();
  const { language, changeLanguage } = useLanguage();

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
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
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
        const st = userData.verificationStatus;

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
        "Login Failed",
        map[err.code] || map[err.message] || "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.bgDeep, "#080F1E", COLORS.bgDark]}
      style={{ flex: 1 }}
    >
      <View style={S.glowBlob} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                style={[S.langChip, language === l.code && S.langChipActive]}
                onPress={() => changeLanguage(l.code)}
              >
                <Text
                  style={[S.langText, language === l.code && S.langTextActive]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logo */}
          <View style={S.logoSection}>
            <View style={S.logoRing}>
              <Text style={{ fontSize: 32 }}>📢</Text>
            </View>
            <Text style={S.appName}>CitiVoice</Text>
            <Text style={S.appTagline}>Kabankalan City</Text>
          </View>

          {/* Form card */}
          <View style={S.card}>
            <Text style={S.cardTitle}>Welcome back</Text>
            <Text style={S.cardSubtitle}>Sign in to your account</Text>

            {/* Email */}
            <View style={S.field}>
              <Text style={S.label}>EMAIL ADDRESS</Text>
              <View style={[S.inputWrap, errors.email && S.inputError]}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={COLORS.textMuted}
                />
                <TextInput
                  style={S.input}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErrors((e) => ({ ...e, email: null }));
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {errors.email && <Text style={S.errText}>⚠ {errors.email}</Text>}
            </View>

            {/* Password */}
            <View style={S.field}>
              <Text style={S.label}>PASSWORD</Text>
              <View style={[S.inputWrap, errors.password && S.inputError]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={COLORS.textMuted}
                />
                <TextInput
                  style={[S.input, { paddingRight: 40 }]}
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((e) => ({ ...e, password: null }));
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPw}
                />
                <TouchableOpacity
                  style={S.eyeBtn}
                  onPress={() => setShowPw((p) => !p)}
                >
                  <Ionicons
                    name={showPw ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={S.errText}>⚠ {errors.password}</Text>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[S.submitBtn, loading && { opacity: 0.65 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={S.submitText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <View style={S.registerRow}>
              <Text style={S.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={S.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info note */}
          <View style={S.noteBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={COLORS.textMuted}
            />
            <Text style={S.noteText}>
              New accounts require admin verification before access
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
    backgroundColor: COLORS.primary,
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
    borderColor: COLORS.border,
  },
  langChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  langText: { color: COLORS.textMuted, fontSize: rf(11), fontWeight: "700" },
  langTextActive: { color: "#fff" },

  logoSection: { alignItems: "center", marginBottom: verticalScale(36) },
  logoRing: {
    width: scale(88),
    height: scale(88),
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderMd,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
    backgroundColor: COLORS.bgCard,
    ...SHADOWS.card,
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: rf(28),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  appTagline: { color: COLORS.textMuted, fontSize: rf(13), marginTop: verticalScale(4) },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS["2xl"],
    padding: scale(24),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: rf(20),
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: verticalScale(4),
  },
  cardSubtitle: { color: COLORS.textSecondary, fontSize: rf(13), marginBottom: verticalScale(24) },

  field: { marginBottom: verticalScale(16) },
  label: {
    color: COLORS.textMuted,
    fontSize: rf(10),
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: verticalScale(8),
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: { borderColor: COLORS.danger },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: rf(14) },
  eyeBtn: { position: "absolute", right: scale(14) },
  errText: { color: COLORS.danger, fontSize: rf(11), marginTop: verticalScale(5) },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: COLORS.primary,
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
  registerText: { color: COLORS.textSecondary, fontSize: rf(14) },
  registerLink: { color: COLORS.primaryLight, fontSize: rf(14), fontWeight: "700" },

  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(7),
    marginTop: verticalScale(20),
  },
  noteText: { color: COLORS.textMuted, fontSize: rf(12) },
});

// ── Styles: Verification Gate ──────────────────────────────────────────────
const G = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
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
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS["2xl"],
    padding: scale(24),
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.textPrimary,
    fontSize: rf(19),
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: verticalScale(10),
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: rf(14),
    textAlign: "center",
    lineHeight: rf(22),
    marginBottom: verticalScale(20),
  },

  stepsBox: {
    width: "100%",
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.lg,
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: verticalScale(20),
    gap: verticalScale(12),
  },
  step: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  stepNum: {
    width: scale(26),
    height: scale(26),
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary + "22",
    borderWidth: 1,
    borderColor: COLORS.primary + "44",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumText: { color: COLORS.primaryLight, fontSize: rf(12), fontWeight: "800" },
  stepText: { color: COLORS.textSecondary, fontSize: rf(13), flex: 1 },

  pendingBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(10),
    backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: RADIUS.lg,
    padding: scale(14),
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    marginBottom: verticalScale(20),
    width: "100%",
  },
  pendingText: { color: "#FCD34D", fontSize: rf(13), lineHeight: rf(20), flex: 1 },

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
  signOutText: { color: COLORS.textMuted, fontSize: rf(14) },

  accountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: verticalScale(16),
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.full,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(7),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountEmail: { color: COLORS.textSecondary, fontSize: rf(12), maxWidth: scale(240) },
});
