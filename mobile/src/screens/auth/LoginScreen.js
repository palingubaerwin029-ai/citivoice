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
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { AuthService } from "../../services/authService";
import { COLORS, RADIUS, SHADOWS } from "../../utils/theme";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "fil", label: "FIL" },
  { code: "hil", label: "HIL" },
];

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { language, changeLanguage } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
      const user = await login(email.trim(), password);

      if (user.verificationStatus === "pending") {
        await AuthService.logout?.();
        Alert.alert(
          "⏳ Pending Approval",
          "Your account is under admin review. Please wait.",
        );
        return;
      }
      if (user.verificationStatus === "rejected") {
        await AuthService.logout?.();
        Alert.alert(
          "❌ Access Denied",
          user.rejectionReason || "Contact the administrator.",
        );
        return;
      }
      // AppNavigator handles redirect automatically
    } catch (err) {
      const map = {
        "auth/invalid-credential": "Wrong email or password.",
        "auth/user-not-found": "No account with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/too-many-requests": "Too many attempts. Try later.",
        "auth/network-request-failed": "No internet connection.",
      };
      Alert.alert("Login Failed", map[err.code] || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.bgDeep, "#080F1E", COLORS.bgDark]}
      style={{ flex: 1 }}
    >
      {/* Glow blob */}
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
          {/* Lang switcher */}
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
              <View style={S.logoInner}>
                <Text style={{ fontSize: 32 }}>📢</Text>
              </View>
            </View>
            <Text style={S.appName}>CitiVoice</Text>
            <Text style={S.appTagline}>Kabankalan City</Text>
          </View>

          {/* Card */}
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

          {/* Security note */}
          <View style={S.securityNote}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color={COLORS.textMuted}
            />
            <Text style={S.securityText}>
              Your data is protected and encrypted
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
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
  },

  glowBlob: {
    position: "absolute",
    top: -100,
    left: "50%",
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primary,
    opacity: 0.08,
  },

  langRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginBottom: 24,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  langText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  langTextActive: { color: "#fff" },

  logoSection: { alignItems: "center", marginBottom: 36 },
  logoRing: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.borderMd,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: COLORS.bgCard,
    ...SHADOWS.card,
  },
  logoInner: { alignItems: "center", justifyContent: "center" },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  appTagline: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS["2xl"],
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },

  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  cardSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 24 },

  field: { marginBottom: 16 },
  label: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: { borderColor: COLORS.danger },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  eyeBtn: { position: "absolute", right: 14 },
  errText: { color: COLORS.danger, fontSize: 11, marginTop: 5 },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 52,
    marginTop: 8,
    ...SHADOWS.button,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: { color: COLORS.textSecondary, fontSize: 14 },
  registerLink: { color: COLORS.primaryLight, fontSize: 14, fontWeight: "700" },

  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  securityText: { color: COLORS.textMuted, fontSize: 12 },
});
