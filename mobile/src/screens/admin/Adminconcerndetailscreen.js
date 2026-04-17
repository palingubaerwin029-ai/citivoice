import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { mobileApi } from "../../context/AuthContext";
import { StatusBadge, CategoryBadge } from "../../components/UI";
import { COLORS, STATUS_CONFIG } from "../../utils/theme";
import { scale, verticalScale, rf, moderateScale } from "../../utils/responsive";

const STATUSES = ["Pending", "In Progress", "Resolved", "Rejected"];
const STATUS_ICONS = {
  Pending: "time",
  "In Progress": "refresh",
  Resolved: "checkmark-circle",
  Rejected: "close-circle",
};

export default function AdminConcernDetailScreen({ route, navigation }) {
  const { concernId } = route.params;
  const [concern, setConcern] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchDetail = async () => {
    try {
      const data = await mobileApi.get(`/concerns/${concernId}`);
      setConcern(data);
      setSelectedStatus(data.status || "Pending");
      setAdminNote(data.admin_note || "");
    } catch {}
  };

  useEffect(() => {
    fetchDetail();
  }, [concernId]);

  navigation.setOptions({ title: "Review Concern" });

  const handleSave = async () => {
    setSaving(true);
    try {
      await mobileApi.put(`/concerns/${concernId}`, {
        status: selectedStatus,
        admin_note: adminNote.trim() || null,
      });
      fetchDetail();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!concern) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  const hasChanges =
    selectedStatus !== concern.status ||
    adminNote !== (concern.admin_note || "");
  const fmt = (ts) =>
    ts
      ? new Date(ts).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";
  const priorityColors = { High: "#FF4444", Medium: "#FFB800", Low: "#00D4AA" };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {/* Photo */}
      {concern.image_url ? (
        <Image source={{ uri: concern.image_url }} style={styles.heroImage} />
      ) : (
        <View style={styles.heroPlaceholder}>
          <Ionicons name="image-outline" size={36} color={COLORS.textMuted} />
        </View>
      )}

      <View style={styles.body}>
        {/* Badges */}
        <View style={styles.badgeRow}>
          <StatusBadge status={concern.status} />
          <CategoryBadge category={concern.category} />
          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor:
                  (priorityColors[concern.priority] || "#8899BB") + "22",
              },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: priorityColors[concern.priority] || "#8899BB" },
              ]}
            >
              {concern.priority === "High"
                ? "🔴"
                : concern.priority === "Medium"
                  ? "🟡"
                  : "🟢"}{" "}
              {concern.priority}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{concern.title}</Text>

        {/* Meta Grid */}
        <View style={styles.metaGrid}>
          {[
            {
              icon: "person-outline",
              label: "Citizen",
              value: concern.user_name,
            },
            {
              icon: "location-outline",
              label: "Barangay",
              value: concern.user_barangay,
            },
            {
              icon: "calendar-outline",
              label: "Filed on",
              value: fmt(concern.created_at),
            },
            {
              icon: "thumbs-up-outline",
              label: "Upvotes",
              value: `${concern.upvotes || 0}`,
            },
          ].map((m, i) => (
            <View key={i} style={styles.metaItem}>
              <Ionicons name={m.icon} size={14} color={COLORS.textMuted} />
              <View>
                <Text style={styles.metaLabel}>{m.label}</Text>
                <Text style={styles.metaValue}>{m.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📝 DESCRIPTION</Text>
          <Text style={styles.descText}>{concern.description}</Text>
        </View>

        {/* Location */}
        {concern.location && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📍 LOCATION</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.accent} />
              <Text style={styles.locationText}>
                {concern.location.address}
              </Text>
            </View>
          </View>
        )}

        {/* ── Admin Actions ── */}
        <View style={styles.adminSection}>
          <Text style={styles.adminSectionTitle}>🛡️ Admin Actions</Text>

          {/* Status Picker */}
          <Text style={styles.fieldLabel}>Update Status</Text>
          <View style={styles.statusGrid}>
            {STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s] || STATUS_CONFIG["Pending"];
              const active = selectedStatus === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusBtn,
                    active && {
                      backgroundColor: cfg.bg,
                      borderColor: cfg.color,
                    },
                  ]}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Ionicons
                    name={STATUS_ICONS[s]}
                    size={16}
                    color={active ? cfg.color : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.statusBtnText,
                      active && { color: cfg.color },
                    ]}
                  >
                    {s === "In Progress" ? "Active" : s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Admin Note */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Official Response
          </Text>
          <Text style={styles.fieldHint}>
            Visible to the citizen who filed this concern
          </Text>
          <TextInput
            style={styles.noteInput}
            value={adminNote}
            onChangeText={setAdminNote}
            placeholder="e.g. Road crew dispatched. Expected completion: Dec 15..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{adminNote.length} characters</Text>

          {/* Save Button */}
          {saved ? (
            <View style={styles.savedBanner}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.accent}
              />
              <Text style={styles.savedText}>Changes saved successfully!</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!hasChanges || saving) && { opacity: 0.4 },
              ]}
              onPress={handleSave}
              disabled={!hasChanges || saving}
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Previous Admin Note Preview */}
        {concern.admin_note && (
          <View style={styles.prevNote}>
            <Text style={styles.prevNoteLabel}>📋 PREVIOUS RESPONSE</Text>
            <Text style={styles.prevNoteText}>{concern.admin_note}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scroll: { paddingBottom: verticalScale(40) },
  loading: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    alignItems: "center",
    justifyContent: "center",
  },

  heroImage: { width: "100%", height: verticalScale(200) },
  heroPlaceholder: {
    height: verticalScale(100),
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },

  body: { padding: scale(20) },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  priorityBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(20),
  },
  priorityText: { fontSize: rf(11), fontWeight: "700" },

  title: {
    color: COLORS.textPrimary,
    fontSize: rf(20),
    fontWeight: "800",
    marginBottom: verticalScale(16),
    lineHeight: rf(28),
  },

  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginBottom: verticalScale(20),
  },
  metaItem: {
    flexDirection: "row",
    gap: scale(8),
    alignItems: "flex-start",
    width: "47%",
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(10),
    padding: scale(10),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: rf(10),
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metaValue: {
    color: COLORS.textPrimary,
    fontSize: rf(13),
    fontWeight: "600",
    marginTop: verticalScale(2),
  },

  section: { marginBottom: verticalScale(16) },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: rf(10),
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: verticalScale(8),
  },
  descText: { color: COLORS.textPrimary, fontSize: rf(14), lineHeight: rf(22) },
  locationRow: {
    flexDirection: "row",
    gap: scale(8),
    alignItems: "flex-start",
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(10),
    padding: scale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationText: { color: COLORS.textPrimary, fontSize: rf(13), flex: 1 },

  adminSection: {
    backgroundColor: COLORS.bgCard,
    borderRadius: moderateScale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: verticalScale(8),
    marginBottom: verticalScale(16),
  },
  adminSectionTitle: {
    color: COLORS.accent,
    fontSize: rf(14),
    fontWeight: "800",
    marginBottom: verticalScale(16),
  },

  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: rf(12),
    fontWeight: "700",
    marginBottom: verticalScale(8),
  },
  fieldHint: {
    color: COLORS.textMuted,
    fontSize: rf(11),
    marginBottom: verticalScale(10),
    marginTop: verticalScale(-4),
  },

  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: scale(8) },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(10),
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBtnText: { color: COLORS.textMuted, fontSize: rf(12), fontWeight: "700" },

  noteInput: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: moderateScale(12),
    padding: scale(14),
    color: COLORS.textPrimary,
    fontSize: rf(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: verticalScale(100),
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: rf(10),
    textAlign: "right",
    marginTop: verticalScale(4),
    marginBottom: verticalScale(14),
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(12),
    padding: scale(14),
  },
  saveBtnText: { color: "#fff", fontSize: rf(15), fontWeight: "700" },

  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: COLORS.accent + "22",
    borderRadius: moderateScale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.accent + "44",
  },
  savedText: { color: COLORS.accent, fontSize: rf(14), fontWeight: "700" },

  prevNote: {
    backgroundColor: COLORS.accent + "11",
    borderRadius: moderateScale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: COLORS.accent + "33",
  },
  prevNoteLabel: {
    color: COLORS.accent,
    fontSize: rf(10),
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: verticalScale(8),
  },
  prevNoteText: { color: COLORS.textPrimary, fontSize: rf(13), lineHeight: rf(20) },
});
