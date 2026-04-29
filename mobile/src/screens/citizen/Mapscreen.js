import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../hooks/useLocation';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge } from '../../components/UI';
import { COLORS, CATEGORY_CONFIG, STATUS_CONFIG } from '../../utils/theme';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

const { width, height } = Dimensions.get('window');

const STATUS_FILTER_KEYS = [
  { key: 'All', tKey: 'all' },
  { key: 'Pending', tKey: 'pending' },
  { key: 'In Progress', tKey: 'inProgress' },
  { key: 'Resolved', tKey: 'resolved' },
];

const PIN_COLORS = {
  Pending: '#FFB800',
  'In Progress': '#1A6BFF',
  Resolved: '#00D4AA',
  Rejected: '#FF4444',
};

// Default center: Kabankalan City, Negros Occidental
const DEFAULT_REGION = {
  latitude: 9.5847,
  longitude: 122.8164,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// Safely parse a lat/lng value to a number; returns null if invalid
const safeCoord = (val) => {
  if (val == null || val === '') return null;
  const n = Number(val);
  return isFinite(n) ? n : null;
};

export default function MapScreen({ navigation }) {
  const { concerns, refreshConcerns, loading: dataLoading } = useConcerns();
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const { loadingLocation, getCurrentLocation } = useLocation();
  const [mapReady, setMapReady] = useState(false);

  // Ask permission and pinpoint exactly where user is
  const goToMyLocation = async () => {
    const loc = await getCurrentLocation(true);
    if (!loc) return;
    
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 800);
  };

  // Filter and validate concerns that have valid coordinates
  const pinnable = concerns.filter(c => {
    const lat = safeCoord(c.location_lat);
    const lng = safeCoord(c.location_lng);
    if (lat === null || lng === null) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    return true;
  });

  const handleMarkerPress = useCallback((concern) => {
    setSelectedConcern(concern);
    const lat = safeCoord(concern.location_lat);
    const lng = safeCoord(concern.location_lng);
    if (lat !== null && lng !== null) {
      mapRef.current?.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 400);
    }
  }, []);

  const handleViewDetail = () => {
    if (selectedConcern) {
      navigation.navigate('Home', {
        screen: 'ConcernDetail',
        params: { concernId: selectedConcern.id },
      });
    }
  };

  const handleDismiss = () => setSelectedConcern(null);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        mapType={mapType}
        onMapReady={() => setMapReady(true)}
        onPress={handleDismiss}
      >
        {mapReady && pinnable.map(c => {
          const lat = safeCoord(c.location_lat);
          const lng = safeCoord(c.location_lng);
          if (lat === null || lng === null) return null;
          return (
            <Marker
              key={c.id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => handleMarkerPress(c)}
              tracksViewChanges={false}
            >
              <View style={[styles.markerPin, { backgroundColor: PIN_COLORS[c.status] || '#8899BB' }]}>
                <Ionicons
                  name={CATEGORY_CONFIG[c.category]?.icon || 'alert-circle'}
                  size={14}
                  color="#fff"
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Header overlay (safe from notch) ── */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']} pointerEvents="box-none">
        {/* Filter Pills */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {STATUS_FILTER_KEYS.map(f => {
              const active = statusFilter === f.key;
              const color = STATUS_CONFIG[f.key]?.color || COLORS.primary;
              const count = f.key === 'All'
                ? concerns.filter(c => safeCoord(c.location_lat) !== null).length
                : concerns.filter(c => c.status === f.key && safeCoord(c.location_lat) !== null).length;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => { setStatusFilter(f.key); setSelectedConcern(null); }}
                >
                  <Text style={[styles.filterText, active && { color: '#fff' }]}>
                    {t(f.tKey)}
                  </Text>
                  <View style={[styles.filterCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Text style={[styles.filterCountText, active && { color: '#fff' }]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Pinnable Count Badge */}
        <View style={styles.countBadge}>
          <Ionicons name="location" size={14} color={COLORS.primary} />
          <Text style={styles.countText}>
            {pinnable.length} {t('reports')}
          </Text>
        </View>
      </SafeAreaView>

      {/* 🗺️ Map Type Toggle */}
      <TouchableOpacity
        style={styles.mapTypeToggle}
        onPress={() => setMapType(prev => prev === 'standard' ? 'satellite' : 'standard')}
      >
        <Ionicons name={mapType === 'standard' ? 'earth' : 'map'} size={22} color={COLORS.primary} />
        <Text style={styles.mapTypeToggleText}>
          {mapType === 'standard' ? t('satellite') : t('standard')}
        </Text>
      </TouchableOpacity>

      {/* 📍 Pinpoint Location Button */}
      <TouchableOpacity
        style={styles.myLocationBtn}
        onPress={goToMyLocation}
        disabled={loadingLocation}
      >
        {loadingLocation
          ? <ActivityIndicator color={COLORS.primary} size="small" />
          : <Ionicons name="locate" size={22} color={COLORS.primary} />
        }
      </TouchableOpacity>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(PIN_COLORS).slice(0, 3).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              {status === 'In Progress' ? t('inProgress') : t(status.toLowerCase())}
            </Text>
          </View>
        ))}
      </View>

      {/* Selected Concern Bottom Sheet */}
      {selectedConcern && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.bottomSheetContent}>
            <View style={styles.bsLeft}>
              <View style={[styles.bsIcon, { backgroundColor: (CATEGORY_CONFIG[selectedConcern.category]?.bg || COLORS.bgCard) }]}>
                <Ionicons
                  name={CATEGORY_CONFIG[selectedConcern.category]?.icon || 'alert-circle'}
                  size={22}
                  color={CATEGORY_CONFIG[selectedConcern.category]?.color || COLORS.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bsTitle} numberOfLines={2}>{selectedConcern.title}</Text>
                <View style={styles.bsMeta}>
                  <StatusBadge status={selectedConcern.status} />
                  <Text style={styles.bsVotes}>👍 {selectedConcern.upvotes || 0}</Text>
                </View>
                {selectedConcern.location_address ? (
                  <Text style={styles.bsLocation} numberOfLines={1}>
                    📍 {selectedConcern.location_address}
                  </Text>
                ) : null}
                {selectedConcern.user_barangay ? (
                  <Text style={styles.bsBarangay} numberOfLines={1}>
                    🏘️ {selectedConcern.user_barangay}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.bsActions}>
              <TouchableOpacity style={styles.viewBtn} onPress={handleViewDetail}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
                <Ionicons name="close" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Loading overlay */}
      {dataLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  map: { flex: 1 },

  markerPin: {
    width: scale(32), height: scale(32), borderRadius: scale(16),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },

  // ── Header overlay ──
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    pointerEvents: 'box-none',
  },
  filterContainer: {
    marginTop: verticalScale(8),
    marginHorizontal: scale(12),
  },
  filterRow: { flexDirection: 'row', gap: scale(8), paddingRight: scale(12) },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(14), paddingVertical: verticalScale(9), borderRadius: moderateScale(22),
    backgroundColor: COLORS.bgCard + 'F0', borderWidth: 1, borderColor: COLORS.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  filterText: { color: COLORS.textPrimary, fontSize: rf(12), fontWeight: '700' },
  filterCount: { backgroundColor: COLORS.bgCardAlt, borderRadius: moderateScale(10), paddingHorizontal: scale(7), paddingVertical: verticalScale(1) },
  filterCountText: { color: COLORS.textMuted, fontSize: rf(10), fontWeight: '800' },

  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(5),
    alignSelf: 'flex-start',
    marginLeft: scale(14), marginTop: verticalScale(10),
    backgroundColor: COLORS.bgCard + 'F0', borderRadius: moderateScale(16),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(6),
    borderWidth: 1, borderColor: COLORS.border,
  },
  countText: { color: COLORS.textPrimary, fontSize: rf(12), fontWeight: '700' },

  // ── Controls ──
  mapTypeToggle: {
    position: 'absolute', top: verticalScale(140), right: scale(12),
    backgroundColor: COLORS.bgCard + 'F0', borderRadius: moderateScale(14),
    padding: scale(10), alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    gap: verticalScale(3),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  mapTypeToggleText: {
    color: COLORS.primary, fontSize: rf(9), fontWeight: '800', textTransform: 'uppercase',
  },

  myLocationBtn: {
    position: 'absolute', top: verticalScale(200), right: scale(12),
    backgroundColor: COLORS.bgCard + 'F0', borderRadius: moderateScale(14),
    width: moderateScale(46), height: moderateScale(46),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },

  // ── Legend ──
  legend: {
    position: 'absolute', bottom: verticalScale(24), left: scale(12),
    backgroundColor: COLORS.bgCard + 'F5', borderRadius: moderateScale(14),
    paddingHorizontal: scale(12), paddingVertical: scale(10), gap: scale(6),
    borderWidth: 1, borderColor: COLORS.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 5 },
    }),
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  legendDot: {
    width: scale(10), height: scale(10), borderRadius: scale(5),
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
  },
  legendText: { color: COLORS.textPrimary, fontSize: rf(11), fontWeight: '600' },

  // ── Bottom Sheet ──
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgCard,
    borderTopLeftRadius: moderateScale(20), borderTopRightRadius: moderateScale(20),
    borderTopWidth: 1, borderColor: COLORS.border,
    paddingBottom: verticalScale(36), paddingTop: verticalScale(12),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 10 },
    }),
  },
  bottomSheetHandle: {
    width: scale(36), height: verticalScale(4), backgroundColor: COLORS.border,
    borderRadius: scale(2), alignSelf: 'center', marginBottom: verticalScale(14),
  },
  bottomSheetContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(16), gap: scale(12),
  },
  bsLeft: { flex: 1, flexDirection: 'row', gap: scale(12), alignItems: 'flex-start' },
  bsIcon: {
    width: scale(44), height: scale(44), borderRadius: moderateScale(12),
    alignItems: 'center', justifyContent: 'center',
  },
  bsTitle: { color: COLORS.textPrimary, fontSize: rf(15), fontWeight: '700', marginBottom: verticalScale(5) },
  bsMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(4) },
  bsVotes: { color: COLORS.textMuted, fontSize: rf(12) },
  bsLocation: { color: COLORS.textMuted, fontSize: rf(11), marginBottom: verticalScale(2) },
  bsBarangay: { color: COLORS.textSecondary, fontSize: rf(11) },
  bsActions: { gap: verticalScale(8) },
  viewBtn: {
    width: scale(38), height: scale(38), borderRadius: moderateScale(10),
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: scale(38), height: scale(38), borderRadius: moderateScale(10),
    backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  // ── Loading ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
});