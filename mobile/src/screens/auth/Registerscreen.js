import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { InputField, PrimaryButton } from "../../components/UI";
import { COLORS, RADIUS, SHADOWS } from "../../utils/theme";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { t, language, changeLanguage } = useLanguage();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    barangay: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableBarangays, setAvailableBarangays] = useState(["Other"]);

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const snap = await getDocs(collection(db, "barangays"));
        const list = snap.docs.map(d => d.data().name);
        list.sort((a, b) => a.localeCompare(b));
        setAvailableBarangays([...list, "Other"]);
      } catch (err) {
        console.log("Error fetching barangays", err);
      }
    };
    fetchBarangays();
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "At least 6 characters";
    if (!form.barangay) e.barangay = "Select your barangay";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form);
      // After register, onAuthStateChanged fires and sets user._blocked = true
      // LoginScreen will show the VerificationGate with "submit ID" prompt.
      // But we can also navigate directly to the VerifyIdentity screen.
      // Navigation happens automatically via AppNavigator + LoginScreen gate.
    } catch (err) {
      const map = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Invalid email address.",
        "auth/weak-password": "Password is too weak.",
      };
      Alert.alert(
        "Registration Failed",
        map[err.code] || err.message || "Please try again.",
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
            {[
              { code: "en", label: "EN" },
              { code: "fil", label: "FIL" },
              { code: "hil", label: "HIL" },
            ].map((l) => (
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

          {/* Back + Logo */}
          <View style={S.topRow}>
            <TouchableOpacity
              style={S.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <View style={S.logoSmall}>
              <Text style={{ fontSize: 20 }}>📢</Text>
            </View>
          </View>

          <Text style={S.pageTitle}>Create Account</Text>
          <Text style={S.pageSubtitle}>Join CitiVoice — Kabankalan City</Text>

          {/* Verification notice */}
          <View style={S.noticeBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={COLORS.primaryLight}
            />
            <View style={{ flex: 1 }}>
              <Text style={S.noticeTitle}>Verification Required</Text>
              <Text style={S.noticeText}>
                After registering, you'll need to submit a valid government ID
                for admin approval before accessing the app.
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={S.card}>
            <InputField
              label="FULL NAME"
              value={form.name}
              onChangeText={(v) => set("name", v)}
              placeholder="Juan dela Cruz"
              autoCapitalize="words"
              leftIcon="person-outline"
              error={errors.name}
            />

            <InputField
              label="EMAIL ADDRESS"
              value={form.email}
              onChangeText={(v) => set("email", v)}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={errors.email}
            />

            <InputField
              label="PASSWORD"
              value={form.password}
              onChangeText={(v) => set("password", v)}
              placeholder="At least 6 characters"
              secureTextEntry={!showPw}
              leftIcon="lock-closed-outline"
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPw((p) => !p)}
                  style={{ position: "absolute", right: 14 }}
                >
                  <Ionicons
                    name={showPw ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              }
              error={errors.password}
            />

            <InputField
              label="PHONE NUMBER"
              value={form.phone}
              onChangeText={(v) => set("phone", v)}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
              leftIcon="call-outline"
            />

            {/* Barangay picker */}
            <View style={{ marginBottom: 14 }}>
              <Text style={S.fieldLabel}>BARANGAY</Text>
              <TouchableOpacity
                style={[S.picker, errors.barangay && S.pickerError]}
                onPress={() => setShowPicker((p) => !p)}
              >
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={COLORS.textMuted}
                />
                <Text
                  style={[
                    S.pickerText,
                    !form.barangay && { color: COLORS.textMuted },
                  ]}
                >
                  {form.barangay || "Select your barangay"}
                </Text>
                <Ionicons
                  name={showPicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
              {errors.barangay && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 5,
                  }}
                >
                  <Ionicons
                    name="alert-circle"
                    size={12}
                    color={COLORS.danger}
                  />
                  <Text style={{ color: COLORS.danger, fontSize: 11 }}>
                    {errors.barangay}
                  </Text>
                </View>
              )}
              {showPicker && (
                <View style={S.dropdown}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {availableBarangays.map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[
                          S.dropdownItem,
                          form.barangay === b && S.dropdownItemActive,
                        ]}
                        onPress={() => {
                          set("barangay", b);
                          setShowPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            S.dropdownText,
                            form.barangay === b && {
                              color: COLORS.primaryLight,
                              fontWeight: "700",
                            },
                          ]}
                        >
                          {b}
                        </Text>
                        {form.barangay === b && (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={COLORS.primaryLight}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <PrimaryButton
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <View style={S.loginRow}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text
                  style={{
                    color: COLORS.primaryLight,
                    fontSize: 14,
                    fontWeight: "700",
                  }}
                >
                  Sign In
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  glowBlob: {
    position: "absolute",
    top: -80,
    left: "50%",
    marginLeft: -140,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.primary,
    opacity: 0.07,
  },

  langRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginBottom: 16,
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

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  pageTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  pageSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 20 },

  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(37,99,235,0.08)",
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    marginBottom: 20,
  },
  noticeTitle: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  noticeText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS["2xl"],
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },

  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  picker: {
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
  pickerError: { borderColor: COLORS.danger },
  pickerText: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },

  dropdown: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemActive: { backgroundColor: COLORS.primary + "18" },
  dropdownText: { color: COLORS.textSecondary, fontSize: 14 },

  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
});
