import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useConcerns } from "../../context/ConcernContext";
import { useLanguage } from "../../context/LanguageContext";
import { StatusBadge } from "../../components/UI";
import { COLORS, CATEGORY_CONFIG, STATUS_CONFIG } from "../../utils/theme";

const STATUS_FILTERS = ["All", "Pending", "In Progress", "Resolved"];

const PIN_COLORS = {
  Pending: "#FFB800",
  "In Progress": "#1A6BFF",
  Resolved: "#00D4AA",
  Rejected: "#FF4444",
};

// Default center: Himamaylan, Negros Occidental
const DEFAULT_REGION = {
  latitude: 10.0996,
  longitude: 122.8694,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen({ navigation }) {
  const { concerns } = useConcerns();
  const { t } = useLanguage();
  const mapRef = useRef(null);

  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Filter concerns that have a location
  const pinnable = concerns.filter(
    (c) =>
      c.location?.latitude &&
      c.location?.longitude &&
      (statusFilter === "All" || c.status === statusFilter),
  );

  // ── Go to my location ─────────────────────────────────────────────────────
  const goToMyLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please allow location access in your settings.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setUserLocation(loc.coords);
      mapRef.current?.animateToRegion(region, 600);
    } catch (err) {
      Alert.alert("Error", "Could not get your location.");
    } finally {
      setLoadingLocation(false);
    }
  };

  // ── Tap a marker ──────────────────────────────────────────────────────────
  const handleMarkerPress = (concern) => {
    setSelectedConcern(concern);
    mapRef.current?.animateToRegion(
      {
        latitude: concern.location.latitude - 0.002, // offset so bottom sheet doesn't cover pin
        longitude: concern.location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      400,
    );
  };

  // ── View full detail ──────────────────────────────────────────────────────
  const handleViewDetail = () => {
    if (!selectedConcern) return;
    setSelectedConcern(null);
    navigation.navigate("ConcernDetail", { concernId: selectedConcern.id });
  };

  const filterCount = (f) =>
    f === "All"
      ? concerns.filter((c) => c.location?.latitude).length
      : concerns.filter((c) => c.status === f && c.location?.latitude).length;

  return (
    <View style={styles.container}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelectedConcern(null)}
      >
        {mapReady &&
          pinnable.map((c) => {
            const color = PIN_COLORS[c.status] || "#8899BB";
            const catCfg =
              CATEGORY_CONFIG[c.category] || CATEGORY_CONFIG["Other"];
            return (
              <Marker
                key={c.id}
                coordinate={{
                  latitude: c.location.latitude,
                  longitude: c.location.longitude,
                }}
                onPress={() => handleMarkerPress(c)}
              >
                <View style={[styles.markerOuter, { borderColor: color }]}>
                  <View
                    style={[styles.markerInner, { backgroundColor: color }]}
                  >
                    <Ionicons
                      name={catCfg.icon || "alert-circle"}
                      size={13}
                      color="#fff"
                    />
                  </View>
                </View>
              </Marker>
            );
          })}
      </MapView>

      {/* ── Filter chips (top) ── */}
      <SafeAreaView style={styles.topOverlay} edges={["top"]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f;
            const color = STATUS_CONFIG[f]?.color || COLORS.primary;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: color, borderColor: color },
                ]}
                onPress={() => setStatusFilter(f)}
              >
                <Text style={[styles.filterText, active && { color: "#fff" }]}>
                  {f === "All" ? "All" : f === "In Progress" ? "Active" : f}
                </Text>
                <View
                  style={[
                    styles.filterBadge,
                    active && { backgroundColor: "rgba(255,255,255,0.3)" },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      active && { color: "#fff" },
                    ]}
                  >
                    {filterCount(f)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── My location button ── */}
      <TouchableOpacity
        style={styles.locationBtn}
        onPress={goToMyLocation}
        disabled={loadingLocation}
      >
        {loadingLocation ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Ionicons name="locate" size={22} color={COLORS.primary} />
        )}
      </TouchableOpacity>

      {/* ── Legend ── */}
      <View style={styles.legend}>
        {Object.entries(PIN_COLORS).map(([status, color]) => (
          <View key={status} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              {status === "In Progress" ? "Active" : status}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Empty state ── */}
      {mapReady && pinnable.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>
            📍 No concerns with location data
          </Text>
        </View>
      )}

      {/* ── Bottom sheet for selected concern ── */}
      {selectedConcern && (
        <View style={styles.bottomSheet}>
          <View style={styles.handle} />

          <View style={styles.bsContent}>
            {/* Category icon */}
            <View
              style={[
                styles.bsIcon,
                {
                  backgroundColor:
                    CATEGORY_CONFIG[selectedConcern.category]?.bg ||
                    COLORS.bgCard,
                },
              ]}
            >
              <Ionicons
                name={
                  CATEGORY_CONFIG[selectedConcern.category]?.icon ||
                  "alert-circle"
                }
                size={24}
                color={
                  CATEGORY_CONFIG[selectedConcern.category]?.color ||
                  COLORS.primary
                }
              />
            </View>

            {/* Info */}
            <View style={styles.bsInfo}>
              <Text style={styles.bsTitle} numberOfLines={2}>
                {selectedConcern.title}
              </Text>
              <View style={styles.bsMetaRow}>
                <StatusBadge status={selectedConcern.status} />
                <Text style={styles.bsUpvotes}>
                  👍 {selectedConcern.upvotes || 0}
                </Text>
              </View>
              <Text style={styles.bsBy} numberOfLines={1}>
                👤 {selectedConcern.userName} · {selectedConcern.userBarangay}
              </Text>
              {selectedConcern.location?.address ? (
                <Text style={styles.bsAddress} numberOfLines={1}>
                  📍 {selectedConcern.location.address}
                </Text>
              ) : null}
            </View>

            {/* Buttons */}
            <View style={styles.bsButtons}>
              <TouchableOpacity
                style={styles.bsViewBtn}
                onPress={handleViewDetail}
              >
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bsCloseBtn}
                onPress={() => setSelectedConcern(null)}
              >
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  map: { flex: 1 },

  // ── Marker ──
  markerOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  markerInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Top overlay ──
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard + "F0",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: "700" },
  filterBadge: {
    backgroundColor: COLORS.bgCardAlt,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterBadgeText: { color: COLORS.textMuted, fontSize: 10, fontWeight: "800" },

  // ── Location button ──
  locationBtn: {
    position: "absolute",
    right: 14,
    bottom: 220,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // ── Legend ──
  legend: {
    position: "absolute",
    right: 14,
    bottom: 280,
    backgroundColor: COLORS.bgCard + "F0",
    borderRadius: 12,
    padding: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: "600" },

  // ── Empty ──
  emptyOverlay: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  emptyText: {
    backgroundColor: COLORS.bgCard + "F0",
    color: COLORS.textSecondary,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ── Bottom sheet ──
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 30,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  bsContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    gap: 12,
  },
  bsIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bsInfo: { flex: 1 },
  bsTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  bsMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  bsUpvotes: { color: COLORS.textMuted, fontSize: 12 },
  bsBy: { color: COLORS.textMuted, fontSize: 11, marginBottom: 2 },
  bsAddress: { color: COLORS.textMuted, fontSize: 11 },
  bsButtons: { gap: 8, flexShrink: 0 },
  bsViewBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  bsCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
