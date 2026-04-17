import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ConcernService } from "../../services/concernService";
import { useAuth, VERIFICATION_STATUS } from "../../context/AuthContext";
import { InputField, PrimaryButton } from "../../components/UI";
import { COLORS, RADIUS, SHADOWS } from "../../utils/theme";
import { scale, verticalScale, rf } from "../../utils/responsive";

const ID_TYPES = [
  "PhilSys (National ID)",
  "Driver's License",
  "Philippine Passport",
  "SSS ID",
  "GSIS ID",
  "Postal ID",
  "Voter's ID",
  "PRC ID",
  "Barangay ID",
];

export default function VerifyIdentityScreen({ navigation }) {
  const { user, storage, submitVerification } = useAuth();

  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idImage, setIdImage] = useState(null); // local URI
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const currentStatus = user?.verificationStatus;
  const alreadyPending = currentStatus === VERIFICATION_STATUS.PENDING;

  // ── Pick ID photo ──────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photos to upload your ID.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setIdImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setIdImage(result.assets[0].uri);
  };

  // ── Validate ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!idType) e.idType = "Please select an ID type";
    if (!idNumber.trim()) e.idNumber = "Enter your ID number";
    if (!idImage) e.idImage = "Please upload a photo of your ID";
    setErrors(e);
    return !Object.keys(e).length;
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setUploading(true);
    try {
      // Upload ID image to backend
      const idImageUrl = await ConcernService.uploadImage(idImage);

      // Update Express user doc to pending
      await submitVerification(user.id, {
        idType,
        idNumber: idNumber.trim(),
        idImageUrl,
      });

      Alert.alert(
        "✅ Submitted Successfully",
        "Your ID has been submitted for verification. The admin will review it within 1–2 business days.",
        [{ text: "OK" }],
      );
    } catch (err) {
      Alert.alert("Submission Failed", err.message || "Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Already pending — show status ──────────────────────────────────────
  if (alreadyPending) {
    return (
      <View style={S.statusContainer}>
        <View style={S.statusCard}>
          <View
            style={[
              S.statusIcon,
              {
                backgroundColor: "rgba(245,158,11,0.12)",
                borderColor: "rgba(245,158,11,0.3)",
              },
            ]}
          >
            <Text style={{ fontSize: 36 }}>⏳</Text>
          </View>
          <Text style={S.statusTitle}>Under Review</Text>
          <Text style={S.statusMessage}>
            Your ID has already been submitted and is being reviewed by the
            administrator. You'll be notified once approved.
          </Text>
          <View style={S.pendingInfo}>
            <InfoRow icon="person-outline" label="Name" value={user?.name} />
            <InfoRow icon="mail-outline" label="Email" value={user?.email} />
            <InfoRow
              icon="card-outline"
              label="ID Type"
              value={user?.idType || "—"}
            />
            <InfoRow
              icon="shield-half-outline"
              label="Status"
              value="Pending Review"
              valueColor="#F59E0B"
            />
          </View>
          <TouchableOpacity
            style={S.logoutBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back-outline"
              size={16}
              color={COLORS.textMuted}
            />
            <Text style={S.logoutText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={S.container}
      contentContainerStyle={S.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={S.header}>
        <View style={S.headerIcon}>
          <Text style={{ fontSize: 28 }}>🪪</Text>
        </View>
        <Text style={S.title}>Verify Your Identity</Text>
        <Text style={S.subtitle}>
          Submit a valid government-issued ID to get verified and access
          CitiVoice.
        </Text>
      </View>

      {/* Steps */}
      <View style={S.stepsRow}>
        {["Select ID", "Enter Number", "Upload Photo", "Submit"].map(
          (step, i) => (
            <View key={i} style={S.step}>
              <View style={S.stepDot}>
                <Text style={S.stepNum}>{i + 1}</Text>
              </View>
              <Text style={S.stepLabel}>{step}</Text>
              {i < 3 && <View style={S.stepLine} />}
            </View>
          ),
        )}
      </View>

      {/* Form */}
      <View style={S.card}>
        {/* ID Type picker */}
        <View style={{ marginBottom: 16 }}>
          <Text style={S.label}>ID TYPE *</Text>
          <TouchableOpacity
            style={[S.picker, errors.idType && { borderColor: COLORS.danger }]}
            onPress={() => setShowPicker((p) => !p)}
          >
            <Ionicons name="card-outline" size={16} color={COLORS.textMuted} />
            <Text
              style={[S.pickerText, !idType && { color: COLORS.textMuted }]}
            >
              {idType || "Select government ID type…"}
            </Text>
            <Ionicons
              name={showPicker ? "chevron-up" : "chevron-down"}
              size={16}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
          {errors.idType && <Text style={S.errText}>⚠ {errors.idType}</Text>}

          {showPicker && (
            <View style={S.dropdown}>
              <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
                {ID_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[S.dropItem, idType === t && S.dropItemActive]}
                    onPress={() => {
                      setIdType(t);
                      setShowPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        S.dropText,
                        idType === t && {
                          color: COLORS.primaryLight,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {t}
                    </Text>
                    {idType === t && (
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

        {/* ID Number */}
        <InputField
          label="ID NUMBER *"
          value={idNumber}
          onChangeText={(v) => {
            setIdNumber(v);
            setErrors((e) => ({ ...e, idNumber: null }));
          }}
          placeholder="Enter the ID number exactly as shown"
          leftIcon="key-outline"
          error={errors.idNumber}
        />

        {/* ID Photo */}
        <View style={{ marginBottom: 16 }}>
          <Text style={S.label}>ID PHOTO *</Text>
          <Text style={S.sublabel}>
            Take a clear photo of your government ID. All 4 corners must be
            visible.
          </Text>

          {idImage ? (
            <View style={S.imagePreviewWrap}>
              <Image
                source={{ uri: idImage }}
                style={S.idPreview}
                resizeMode="cover"
              />
              <View style={S.imageOverlay}>
                <TouchableOpacity
                  style={S.retakeBtn}
                  onPress={() => setIdImage(null)}
                >
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                  >
                    Retake
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View
              style={[
                S.photoBox,
                errors.idImage && { borderColor: COLORS.danger },
              ]}
            >
              <Text style={{ fontSize: 40, marginBottom: 10, opacity: 0.6 }}>
                🪪
              </Text>
              <Text style={S.photoBoxTitle}>Upload your ID photo</Text>
              <Text style={S.photoBoxSub}>
                Make sure the photo is clear and well-lit
              </Text>
              <View style={S.photoActions}>
                <TouchableOpacity style={S.photoBtn} onPress={pickPhoto}>
                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={COLORS.primaryLight}
                  />
                  <Text style={S.photoBtnText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.photoBtn} onPress={takePhoto}>
                  <Ionicons
                    name="camera-outline"
                    size={18}
                    color={COLORS.primaryLight}
                  />
                  <Text style={S.photoBtnText}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {errors.idImage && <Text style={S.errText}>⚠ {errors.idImage}</Text>}
        </View>

        {/* Security note */}
        <View style={S.securityBox}>
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={COLORS.primaryLight}
          />
          <Text style={S.securityText}>
            Your ID is encrypted and stored securely. It is only accessible to
            CitiVoice administrators and will not be shared with third parties.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[S.submitBtn, uploading && { opacity: 0.65 }]}
          onPress={handleSubmit}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={S.submitText}>Uploading…</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#fff"
              />
              <Text style={S.submitText}>Submit for Verification</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={15} color={COLORS.textMuted} />
        <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: valueColor || COLORS.textPrimary,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { padding: scale(20), paddingBottom: verticalScale(48) },

  header: { alignItems: "center", marginBottom: verticalScale(24) },
  headerIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: RADIUS["2xl"],
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
    ...SHADOWS.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: rf(22),
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: verticalScale(8),
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: rf(13),
    textAlign: "center",
    lineHeight: rf(20),
  },

  stepsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(24),
    flexWrap: "wrap",
    gap: scale(4),
  },
  step: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  stepDot: {
    width: scale(22),
    height: scale(22),
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { color: "#fff", fontSize: rf(11), fontWeight: "800" },
  stepLabel: { color: COLORS.textSecondary, fontSize: rf(10), fontWeight: "600" },
  stepLine: {
    width: scale(20),
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: scale(2),
  },

  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS["2xl"],
    padding: scale(20),
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },

  label: {
    color: COLORS.textMuted,
    fontSize: rf(10),
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: verticalScale(8),
  },
  sublabel: {
    color: COLORS.textMuted,
    fontSize: rf(11),
    marginBottom: verticalScale(10),
    marginTop: verticalScale(-4),
  },
  errText: { color: COLORS.danger, fontSize: rf(11), marginTop: verticalScale(5) },

  picker: {
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
  pickerText: { flex: 1, color: COLORS.textPrimary, fontSize: rf(14) },

  dropdown: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: verticalScale(4),
    overflow: "hidden",
  },
  dropItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropItemActive: { backgroundColor: COLORS.primary + "18" },
  dropText: { color: COLORS.textSecondary, fontSize: rf(14) },

  photoBox: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    padding: scale(28),
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  photoBoxTitle: {
    color: COLORS.textSecondary,
    fontSize: rf(14),
    fontWeight: "600",
    marginBottom: verticalScale(4),
  },
  photoBoxSub: {
    color: COLORS.textMuted,
    fontSize: rf(12),
    marginBottom: verticalScale(16),
    textAlign: "center",
  },
  photoActions: { flexDirection: "row", gap: scale(12) },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(7),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + "18",
    borderWidth: 1,
    borderColor: COLORS.primary + "44",
  },
  photoBtnText: { color: COLORS.primaryLight, fontSize: rf(13), fontWeight: "600" },

  imagePreviewWrap: {
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    marginBottom: verticalScale(4),
    position: "relative",
  },
  idPreview: { width: "100%", height: verticalScale(200) },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(10),
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "flex-end",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  securityBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(10),
    backgroundColor: COLORS.primary + "10",
    borderRadius: RADIUS.lg,
    padding: scale(12),
    borderWidth: 1,
    borderColor: COLORS.primary + "25",
    marginBottom: verticalScale(18),
  },
  securityText: {
    color: COLORS.textSecondary,
    fontSize: rf(12),
    lineHeight: rf(18),
    flex: 1,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: verticalScale(52),
    ...SHADOWS.button,
  },
  submitText: { color: "#fff", fontSize: rf(15), fontWeight: "700" },

  // Status screen
  statusContainer: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  statusCard: {
    width: "100%",
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS["2xl"],
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    ...SHADOWS.card,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  statusMessage: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  pendingInfo: {
    width: "100%",
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
  },
  logoutText: { color: COLORS.textMuted, fontSize: 14 },
});
