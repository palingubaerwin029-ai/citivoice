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
  ActivityIndicator,
  Linking,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { mobileApi, resolveImageUrl } from "../../context/AuthContext";
import { StatusBadge, CategoryBadge } from "../../components/UI";
import { getStatusConfig, RADIUS, SHADOWS } from "../../utils/theme";
import { useTheme } from "../../context/ThemeContext";
import { scale, verticalScale, rf, moderateScale } from "../../utils/responsive";

const STATUSES = ["Pending", "In Progress", "Resolved", "Rejected"];
const STATUS_ICONS = {
  Pending: "time",
  "In Progress": "refresh",
  Resolved: "checkmark-circle",
  Rejected: "close-circle",
};

export default function AdminConcernDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { concernId, concernIds = [] } = route.params;
  const currentIndex = concernIds.indexOf(concernId);
  const hasNext = currentIndex !== -1 && currentIndex < concernIds.length - 1;
  const hasPrev = currentIndex !== -1 && currentIndex > 0;

  const [concern, setConcern] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async (id) => {
    setLoading(true);
    try {
      const data = await mobileApi.get(`/concerns/${id}`);
      setConcern(data);
      setSelectedStatus(data.status || "Pending");
      setAdminNote(data.admin_note || "");
    } catch (err) {
      Alert.alert("Error", "Could not load concern details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail(concernId);
  }, [concernId]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: scale(16), marginRight: scale(4) }}>
          <TouchableOpacity 
            onPress={() => navigation.setParams({ concernId: concernIds[currentIndex - 1] })}
            disabled={!hasPrev}
            style={{ opacity: hasPrev ? 1 : 0.3 }}
          >
            <Ionicons name="chevron-back-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.setParams({ concernId: concernIds[currentIndex + 1] })}
            disabled={!hasNext}
            style={{ opacity: hasNext ? 1 : 0.3 }}
          >
            <Ionicons name="chevron-forward-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [currentIndex, hasNext, hasPrev, colors.primary]);

  const handleUpdate = async () => {
    if (!selectedStatus) return;
    setSaving(true);
    setSaved(false);
    try {
      await mobileApi.put(`/concerns/${concernId}/status`, {
        status: selectedStatus,
        admin_note: adminNote,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      fetchDetail();
    } catch (err) {
      Alert.alert("Error", "Failed to update status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgDark }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!concern) return null;

  const metadata = [
    { label: "CITIZEN", value: concern.user_name, icon: "person" },
    { label: "BARANGAY", value: concern.user_barangay, icon: "location" },
    { label: "POSTED", value: new Date(concern.created_at).toLocaleDateString(), icon: "calendar" },
    { label: "UPVOTES", value: concern.upvotes || 0, icon: "heart" },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bgDark }]} contentContainerStyle={styles.scroll}>
      {/* Photo Section */}
      <View style={[styles.photoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {concern.image_url ? (
          <Image
            source={{ uri: resolveImageUrl(concern.image_url) }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.noPhoto, { backgroundColor: colors.bgCardAlt }]}>
            <Ionicons name="image-outline" size={36} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>No photo attached</Text>
          </View>
        )}
        <View style={styles.badgeOverlay}>
          <StatusBadge status={concern.status} />
          <CategoryBadge category={concern.category} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{concern.title}</Text>
        
        <View style={styles.metaGrid}>
          {metadata.map((m, i) => (
            <View key={i} style={[styles.metaItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name={m.icon} size={14} color={colors.textMuted} />
              <View>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{m.label}</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{m.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
          <Text style={[styles.descText, { color: colors.textPrimary }]}>{concern.description}</Text>
        </View>

        {concern.location_lat != null && concern.location_lng != null && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>LOCATION</Text>
            
            <View style={[styles.mapContainer, { borderColor: colors.border }]}>
              <MapView
                style={styles.miniMap}
                initialRegion={{
                  latitude: Number(concern.location_lat),
                  longitude: Number(concern.location_lng),
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: Number(concern.location_lat),
                    longitude: Number(concern.location_lng),
                  }}
                >
                  <Ionicons name="location" size={30} color={colors.primary} />
                </Marker>
              </MapView>
            </View>

            <TouchableOpacity 
              style={[styles.locationRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${concern.location_lat},${concern.location_lng}`)}
            >
              <Ionicons name="location" size={16} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.locationText, { color: colors.textPrimary }]}>
                  {concern.location_address || "Location coordinates provided"}
                </Text>
                <Text style={{ fontSize: rf(10), color: colors.textMuted }}>
                  {Number(concern.location_lat).toFixed(6)}, {Number(concern.location_lng).toFixed(6)} • Tap for Google Maps
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Admin Actions */}
        <View style={[styles.adminSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.adminSectionTitle, { color: colors.accent }]}>Admin Actions</Text>
          
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Update Status</Text>
          <View style={styles.statusGrid}>
            {STATUSES.map((s) => {
              const active = selectedStatus === s;
              const cfg = getStatusConfig(colors)[s];
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusBtn,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                    active && { borderColor: cfg.color, backgroundColor: cfg.bg },
                  ]}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Ionicons
                    name={active ? STATUS_ICONS[s] : `${STATUS_ICONS[s]}-outline`}
                    size={18}
                    color={active ? cfg.color : colors.textMuted}
                  />
                  <Text style={[
                    styles.statusBtnText,
                    { color: colors.textMuted },
                    active && { color: cfg.color }
                  ]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
            Admin Response / Note
          </Text>
          <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
            Visible to the citizen who reported this concern.
          </Text>
          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.bgCardAlt, color: colors.textPrimary, borderColor: colors.border }]}
            multiline
            numberOfLines={4}
            value={adminNote}
            onChangeText={setAdminNote}
            placeholder="Add internal notes or citizen response..."
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.charCount, { color: colors.textMuted }]}>{adminNote.length} characters</Text>

          {saved && (
            <View style={[styles.savedBanner, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "44" }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              <Text style={[styles.savedText, { color: colors.accent }]}>Changes saved successfully!</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.7 }]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          {concern.admin_note && !saved && (
            <View style={[styles.prevNote, { backgroundColor: colors.accent + "11", borderColor: colors.accent + "33" }]}>
              <Text style={[styles.prevNoteLabel, { color: colors.accent }]}>PREVIOUS RESPONSE</Text>
              <Text style={[styles.prevNoteText, { color: colors.textPrimary }]}>{concern.admin_note}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: verticalScale(40) },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },

  photoCard: {
    height: verticalScale(240),
    borderBottomWidth: 1,
    position: "relative",
  },
  photo: { width: "100%", height: "100%" },
  noPhoto: { flex: 1, alignItems: "center", justifyContent: "center" },
  badgeOverlay: {
    position: "absolute",
    bottom: verticalScale(16),
    left: scale(16),
    flexDirection: "row",
    gap: scale(8),
  },

  content: { padding: scale(16) },
  title: { fontSize: rf(20), fontWeight: "800", marginBottom: verticalScale(16) },

  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: scale(10), marginBottom: verticalScale(20) },
  metaItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    padding: scale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
  },
  metaLabel: { fontSize: rf(9), fontWeight: "700" },
  metaValue: { fontSize: rf(12), fontWeight: "600", marginTop: verticalScale(2) },

  section: { marginBottom: verticalScale(20) },
  sectionLabel: { fontSize: rf(10), fontWeight: "800", letterSpacing: 1, marginBottom: verticalScale(8) },
  descText: { fontSize: rf(14), lineHeight: rf(22) },

  mapContainer: {
    height: verticalScale(160),
    borderRadius: moderateScale(12),
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: verticalScale(10),
  },
  miniMap: { flex: 1 },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    padding: scale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
  },
  locationText: { fontSize: rf(13), flex: 1 },

  adminSection: {
    padding: scale(16),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    marginTop: verticalScale(10),
  },
  adminSectionTitle: { fontSize: rf(16), fontWeight: "700", marginBottom: verticalScale(16) },

  fieldLabel: { fontSize: rf(13), fontWeight: "600", marginBottom: verticalScale(8) },
  fieldHint: { fontSize: rf(11), marginBottom: verticalScale(12) },

  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: scale(8) },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    width: "48%",
  },
  statusBtnText: { fontSize: rf(12), fontWeight: "700" },

  noteInput: {
    borderRadius: moderateScale(12),
    padding: scale(12),
    borderWidth: 1,
    minHeight: verticalScale(100),
    textAlignVertical: "top",
    fontSize: rf(14),
  },
  charCount: { fontSize: rf(10), textAlign: "right", marginTop: verticalScale(4) },

  saveBtn: {
    marginTop: verticalScale(20),
    borderRadius: moderateScale(12),
    padding: scale(14),
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#fff", fontSize: rf(15), fontWeight: "700" },

  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    borderRadius: moderateScale(12),
    padding: scale(14),
    borderWidth: 1,
    marginTop: verticalScale(16),
  },
  savedText: { fontSize: rf(14), fontWeight: "700" },

  prevNote: {
    marginTop: verticalScale(20),
    borderRadius: moderateScale(12),
    padding: scale(14),
    borderWidth: 1,
  },
  prevNoteLabel: {
    fontSize: rf(10),
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: verticalScale(8),
  },
  prevNoteText: { fontSize: rf(13), lineHeight: rf(20) },
});
