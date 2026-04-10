import React, { useState } from "react";
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
import { InputField, PrimaryButton } from "../../components/UI.js";
import { COLORS, BARANGAYS } from "../../utils/theme";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";

export default function Registerscreen({ navigation }) {
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
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [philId, setPhilId] = useState(null);
  const [voterId, setVoterId] = useState(null);
  const [idType, setIdType] = useState("");
  const [showIdDropdown, setShowIdDropdown] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const takePhoto = async (setImage) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  const getUploadedIdType = () => {
    if (philId) return "PhilID";
    if (voterId) return "Voter's ID";
    return null;
  };

  const validate = () => {
    const e = {};

    if (!form.name.trim()) e.name = t("required");
    if (!form.email.trim()) e.email = t("required");
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t("invalidEmail");
    if (!form.password) e.password = t("required");
    else if (form.password.length < 6) e.password = t("passwordMin");
    if (!form.barangay) e.barangay = t("required");

    // ✅ ONLY ONE ID REQUIRED
    if (!philId && !voterId) {
      e.id = "Please provide at least one valid ID";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        ...form,
        philId,
        voterId,
        idType,
      });
    } catch (err) {
      Alert.alert(t("registrationFailed"), err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.bgDark, "#0D2137", COLORS.bgDark]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Language Picker */}
          <View style={styles.langRow}>
            {[
              { code: "en", label: "EN" },
              { code: "fil", label: "FIL" },
              { code: "hil", label: "HIL" },
            ].map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.langBtn,
                  language === l.code && styles.langBtnActive,
                ]}
                onPress={() => changeLanguage(l.code)}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    language === l.code && styles.langBtnTextActive,
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.logoSmall}>
              <Text style={{ fontSize: 22 }}>📢</Text>
            </View>
          </View>

          <Text style={styles.pageTitle}>{t("register")}</Text>
          <Text style={styles.pageSubtitle}>{t("tagline")}</Text>

          {/* Form Card */}
          <View style={styles.card}>
            <InputField
              label={t("fullName")}
              value={form.name}
              onChangeText={(v) => set("name", v)}
              placeholder="Juan dela Cruz"
              autoCapitalize="words"
              error={errors.name}
            />

            <InputField
              label={t("email")}
              value={form.email}
              onChangeText={(v) => set("email", v)}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <View style={styles.passwordWrapper}>
              <InputField
                label={t("password")}
                value={form.password}
                onChangeText={(v) => set("password", v)}
                placeholder="At least 6 characters"
                secureTextEntry={!showPw}
                error={errors.password}
                style={{ marginBottom: 0 }}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPw(!showPw)}
              >
                <Ionicons
                  name={showPw ? "eye-off" : "eye"}
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>

            <InputField
              label={t("phone")}
              value={form.phone}
              onChangeText={(v) => set("phone", v)}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
              error={errors.phone}
            />
            {/* ID ERROR */}
            {errors.id && <Text style={styles.errorText}>{errors.id}</Text>}

            {/* AUTO DETECT */}
            {getUploadedIdType() && (
              <Text style={{ color: COLORS.primary, marginBottom: 10 }}>
                Selected ID: {getUploadedIdType()}
              </Text>
            )}
            {/* ID TYPE DROPDOWN */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Select ID Type</Text>

              <TouchableOpacity
                style={[styles.pickerBtn, errors.idType && styles.pickerError]}
                onPress={() => setShowIdDropdown(!showIdDropdown)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    !idType && styles.pickerPlaceholder,
                  ]}
                >
                  {idType === "philId"
                    ? "PhilID"
                    : idType === "voterId"
                      ? "Voter's ID"
                      : "Choose ID"}
                </Text>

                <Ionicons
                  name={showIdDropdown ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>

              {errors.idType && (
                <Text style={styles.errorText}>{errors.idType}</Text>
              )}

              {showIdDropdown && (
                <View style={styles.dropdown}>
                  {[
                    { label: "PhilID", value: "philId" },
                    { label: "Voter's ID", value: "voterId" },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setIdType(item.value);
                        setShowIdDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ID CAPTURE */}
            {errors.id && <Text style={styles.errorText}>{errors.id}</Text>}

            {idType === "philId" && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>PhilID</Text>

                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => takePhoto(setPhilId)}
                >
                  <Text style={styles.pickerText}>
                    {philId ? "PhilID Captured" : "Capture PhilID"}
                  </Text>
                  <Ionicons name="camera" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {philId && (
                  <>
                    <Image
                      source={{ uri: philId }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => takePhoto(setPhilId)}
                    >
                      <Text style={styles.retakeText}>Retake Photo</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {idType === "voterId" && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Voter's ID</Text>

                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => takePhoto(setVoterId)}
                >
                  <Text style={styles.pickerText}>
                    {voterId ? "Voter ID Captured" : "Capture Voter's ID"}
                  </Text>
                  <Ionicons name="camera" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {voterId && (
                  <>
                    <Image
                      source={{ uri: voterId }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.retakeBtn}
                      onPress={() => takePhoto(setVoterId)}
                    >
                      <Text style={styles.retakeText}>Retake Photo</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Barangay Picker */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t("barangay")}</Text>
              <TouchableOpacity
                style={[
                  styles.pickerBtn,
                  errors.barangay && styles.pickerError,
                ]}
                onPress={() => setShowBarangayPicker(!showBarangayPicker)}
              >
                <Text
                  style={[
                    styles.pickerText,
                    !form.barangay && styles.pickerPlaceholder,
                  ]}
                >
                  {form.barangay || t("selectBarangay")}
                </Text>
                <Ionicons
                  name={showBarangayPicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
              {errors.barangay ? (
                <Text style={styles.errorText}>{errors.barangay}</Text>
              ) : null}

              {showBarangayPicker && (
                <View style={styles.dropdown}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {BARANGAYS.map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[
                          styles.dropdownItem,
                          form.barangay === b && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          set("barangay", b);
                          setShowBarangayPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownText,
                            form.barangay === b && styles.dropdownTextActive,
                          ]}
                        >
                          {b}
                        </Text>
                        {form.barangay === b && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={COLORS.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <PrimaryButton
              title={t("register")}
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.switchText}>{t("hasAccount")} </Text>
              <Text style={styles.switchLink}>{t("login")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },

  previewImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginTop: 10,
  },

  retakeBtn: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary + "22",
    alignItems: "center",
  },

  retakeText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
    marginBottom: 16,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  langBtnText: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  langBtnTextActive: { color: "#fff" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: { padding: 6 },
  logoSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  pageTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 4,
  },
  pageSubtitle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 24 },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  passwordWrapper: { position: "relative", marginBottom: 16 },
  eyeBtn: { position: "absolute", right: 14, bottom: 14 },

  inputWrapper: { marginBottom: 16 },
  inputLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  errorText: { color: COLORS.statusRejected, fontSize: 11, marginTop: 4 },

  pickerBtn: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerError: { borderColor: COLORS.statusRejected },
  pickerText: { color: COLORS.textPrimary, fontSize: 15 },
  pickerPlaceholder: { color: COLORS.textMuted },

  dropdown: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 100,
    elevation: 5,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  dropdownItemActive: { backgroundColor: COLORS.primary + "22" },
  dropdownText: { color: COLORS.textSecondary, fontSize: 14 },
  dropdownTextActive: { color: COLORS.primary, fontWeight: "700" },

  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  switchText: { color: COLORS.textSecondary, fontSize: 14 },
  switchLink: { color: COLORS.primary, fontSize: 14, fontWeight: "700" },
});
