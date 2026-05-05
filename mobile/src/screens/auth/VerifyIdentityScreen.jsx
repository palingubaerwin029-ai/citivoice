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
import { useImagePicker } from "../../hooks/useImagePicker";
import { ConcernService } from "../../services/concernService";
import { useAuth, VERIFICATION_STATUS, resolveImageUrl } from "../../context/AuthContext";
import { InputField, PrimaryButton } from "../../components/UI";
import { RADIUS, SHADOWS } from "../../utils/theme";
import { useTheme } from "../../context/ThemeContext";
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
  const { colors } = useTheme();
  const { user, storage, submitVerification } = useAuth();

  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idImage, setIdImage] = useState(null); // local URI
  const [showPicker, setShowPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const currentStatus = user?.verificationStatus;
  const alreadyPending = currentStatus === VERIFICATION_STATUS.PENDING;

  const { pickImage: launchImagePicker, takePhoto: launchCamera } = useImagePicker();

  // ── Pick ID photo ──────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const uri = await launchImagePicker({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (uri) setIdImage(uri);
  };

  const takePhoto = async () => {
    const uri = await launchCamera({ allowsEditing: true, quality: 0.85 });
    if (uri) setIdImage(uri);
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
        [{ text: "OK", onPress: () => navigation.navigate("Login") }],
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
      <View style={[S.statusContainer, { backgroundColor: colors.bgDark }]}>
        <View style={[S.statusCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View
            style={[
              S.statusIcon,
              {
                backgroundColor: colors.statusPending + "1F",
                borderColor: colors.statusPending + "4D",
              },
            ]}
          >
            <Text style={{ fontSize: 36 }}>⏳</Text>
          </View>
          <Text style={[S.statusTitle, { color: colors.textPrimary }]}>Under Review</Text>
          <Text style={[S.statusMessage, { color: colors.textSecondary }]}>
            Your ID has already been submitted and is being reviewed by the
            administrator. You'll be notified once approved.
          </Text>
          <View style={[S.pendingInfo, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}>
            <InfoRow icon="person-outline" label="Name" value={user?.name} colors={colors} />
            <InfoRow icon="mail-outline" label="Email" value={user?.email} colors={colors} />
            <InfoRow
              icon="card-outline"
              label="ID Type"
              value={user?.idType || "—"}
              colors={colors}
            />
            <InfoRow
              icon="shield-half-outline"
              label="Status"
              value="Pending Review"
              valueColor={colors.statusPending}
              colors={colors}
            />
          </View>
          
          {user?.id_image_url && (
            <View style={{ width: "100%", marginBottom: 20 }}>
              <Text style={{ color: colors.textMuted, fontSize: rf(11), fontWeight: "700", marginBottom: 8, letterSpacing: 0.5 }}>SUBMITTED ID</Text>
              <Image 
                source={{ uri: resolveImageUrl(user.id_image_url) }} 
                style={{ width: "100%", height: verticalScale(160), borderRadius: RADIUS.md, borderWidth: 1, borderColor: colors.border }}
                resizeMode="cover"
              />
            </View>
          )}
          <TouchableOpacity
            style={S.logoutBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={[S.logoutText, { color: colors.textMuted }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[S.container, { backgroundColor: colors.bgDark }]}
      contentContainerStyle={S.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={S.header}>
        <View style={[S.headerIcon, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={{ fontSize: 28 }}>🪪</Text>
        </View>
        <Text style={[S.title, { color: colors.textPrimary }]}>Verify Your Identity</Text>
        <Text style={[S.subtitle, { color: colors.textSecondary }]}>
          Submit a valid government-issued ID to get verified and access
          CitiVoice.
        </Text>
      </View>

      {/* Steps */}
      <View style={S.stepsRow}>
        {["Select ID", "Enter Number", "Upload Photo", "Submit"].map(
          (step, i) => (
            <View key={i} style={S.step}>
              <View style={[S.stepDot, { backgroundColor: colors.primary }]}>
                <Text style={S.stepNum}>{i + 1}</Text>
              </View>
              <Text style={[S.stepLabel, { color: colors.textSecondary }]}>{step}</Text>
              {i < 3 && <View style={[S.stepLine, { backgroundColor: colors.border }]} />}
            </View>
          ),
        )}
      </View>

      {/* Form */}
      <View style={[S.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {/* ID Type picker */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[S.label, { color: colors.textMuted }]}>ID TYPE *</Text>
          <TouchableOpacity
            style={[S.picker, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }, errors.idType && { borderColor: colors.danger }]}
            onPress={() => setShowPicker((p) => !p)}
          >
            <Ionicons name="card-outline" size={16} color={colors.textMuted} />
            <Text
              style={[S.pickerText, { color: colors.textPrimary }, !idType && { color: colors.textMuted }]}
            >
              {idType || "Select government ID type…"}
            </Text>
            <Ionicons
              name={showPicker ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {errors.idType && <Text style={[S.errText, { color: colors.danger }]}>⚠ {errors.idType}</Text>}

          {showPicker && (
            <View style={[S.dropdown, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
                {ID_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[S.dropItem, { borderBottomColor: colors.border }, idType === t && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => {
                      setIdType(t);
                      setShowPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        S.dropText,
                        { color: colors.textSecondary },
                        idType === t && {
                          color: colors.primaryLight,
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
                        color={colors.primaryLight}
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
            const cleaned = v.replace(/[^A-Z0-9]/gi, "").toUpperCase();
            let formatted = "";
            for (let i = 0; i < cleaned.length; i++) {
              if (i > 0 && i % 4 === 0) formatted += "-";
              formatted += cleaned[i];
            }
            setIdNumber(formatted);
            setErrors((e) => ({ ...e, idNumber: null }));
          }}
          placeholder="XXXX-XXXX-XXXX"
          maxLength={25}
          leftIcon="key-outline"
          error={errors.idNumber}
        />

        {/* ID Photo */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[S.label, { color: colors.textMuted }]}>ID PHOTO *</Text>
          <Text style={[S.sublabel, { color: colors.textMuted }]}>
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
                    style={{ color: "#fff", fontSize: rf(12), fontWeight: "600" }}
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
                { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                errors.idImage && { borderColor: colors.danger },
              ]}
            >
              <Text style={{ fontSize: 40, marginBottom: 10, opacity: 0.6 }}>
                🪪
              </Text>
              <Text style={[S.photoBoxTitle, { color: colors.textSecondary }]}>Upload your ID photo</Text>
              <Text style={[S.photoBoxSub, { color: colors.textMuted }]}>
                Make sure the photo is clear and well-lit
              </Text>
              <View style={S.photoActions}>
                <TouchableOpacity style={[S.photoBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]} onPress={pickPhoto}>
                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={colors.primaryLight}
                  />
                  <Text style={[S.photoBtnText, { color: colors.primaryLight }]}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.photoBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]} onPress={takePhoto}>
                  <Ionicons
                    name="camera-outline"
                    size={18}
                    color={colors.primaryLight}
                  />
                  <Text style={[S.photoBtnText, { color: colors.primaryLight }]}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {errors.idImage && <Text style={[S.errText, { color: colors.danger }]}>⚠ {errors.idImage}</Text>}
        </View>

        {/* Security note */}
        <View style={[S.securityBox, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' }]}>
          <Ionicons
            name="lock-closed-outline"
            size={16}
            color={colors.primaryLight}
          />
          <Text style={[S.securityText, { color: colors.textSecondary }]}>
            Your ID is encrypted and stored securely. It is only accessible to
            CitiVoice administrators and will not be shared with third parties.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[S.submitBtn, { backgroundColor: colors.primary }, uploading && { opacity: 0.65 }]}
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

function InfoRow({ icon, label, value, valueColor, colors }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={15} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: valueColor || colors.textPrimary,
          fontSize: rf(13),
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: scale(20), paddingBottom: verticalScale(48) },

  header: { alignItems: "center", marginBottom: verticalScale(24) },
  headerIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
    ...SHADOWS.sm,
  },
  title: {
    fontSize: rf(22),
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: verticalScale(8),
  },
  subtitle: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { color: "#fff", fontSize: rf(11), fontWeight: "800" },
  stepLabel: { fontSize: rf(10), fontWeight: "600" },
  stepLine: {
    width: scale(20),
    height: 1,
    marginHorizontal: scale(2),
  },

  card: {
    borderRadius: RADIUS["2xl"],
    padding: scale(20),
    borderWidth: 1,
    ...SHADOWS.card,
  },

  label: {
    fontSize: rf(10),
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: verticalScale(8),
  },
  sublabel: {
    fontSize: rf(11),
    marginBottom: verticalScale(10),
    marginTop: verticalScale(-4),
  },
  errText: { fontSize: rf(11), marginTop: verticalScale(5) },

  picker: {
    flexDirection: "row",
    alignItems: "center",
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
    overflow: "hidden",
  },
  dropItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scale(14),
    borderBottomWidth: 1,
  },
  dropText: { fontSize: rf(14) },

  photoBox: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: scale(28),
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  photoBoxTitle: {
    fontSize: rf(14),
    fontWeight: "600",
    marginBottom: verticalScale(4),
  },
  photoBoxSub: {
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
    borderWidth: 1,
  },
  photoBtnText: { fontSize: rf(13), fontWeight: "600" },

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
    borderRadius: RADIUS.lg,
    padding: scale(12),
    borderWidth: 1,
    marginBottom: verticalScale(18),
  },
  securityText: {
    fontSize: rf(12),
    lineHeight: rf(18),
    flex: 1,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    borderRadius: RADIUS.md,
    height: verticalScale(52),
    ...SHADOWS.button,
  },
  submitText: { color: "#fff", fontSize: rf(15), fontWeight: "700" },

  // Status screen
  statusContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  statusCard: {
    width: "100%",
    borderRadius: RADIUS["2xl"],
    padding: 24,
    borderWidth: 1,
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
    fontSize: rf(20),
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: rf(14),
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  pendingInfo: {
    width: "100%",
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 10,
  },
  logoutText: { fontSize: rf(14) },
});
