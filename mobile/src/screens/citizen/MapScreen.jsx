import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  Linking,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Marker } from 'react-native-maps';
import MapView from 'react-native-map-clustering';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../hooks/useLocation';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge } from '../../components/UI';
import { getCategoryConfig, getStatusConfig } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

const { width, height } = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: 10.0242,
  longitude: 122.8122,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{"color": "#242f3e"}] },
  { "elementType": "labels.text.fill", "stylers": [{"color": "#746855"}] },
  { "elementType": "labels.text.stroke", "stylers": [{"color": "#242f3e"}] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{"color": "#d59563"}] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{"color": "#d59563"}] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{"color": "#263c3f"}] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{"color": "#6b9a76"}] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{"color": "#38414e"}] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{"color": "#212a37"}] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{"color": "#9ca5b3"}] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{"color": "#746855"}] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{"color": "#1f2835"}] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{"color": "#f3d19c"}] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{"color": "#2f3948"}] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{"color": "#d59563"}] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{"color": "#17263c"}] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{"color": "#515c6d"}] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{"color": "#17263c"}] }
];

const safeCoord = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
};

// Adds a deterministic offset (~150m) based on ID to prevent markers from stacking perfectly
const getJitteredCoord = (lat, lng, id) => {
  if (lat === null || lng === null || !id) return { lat, lng };
  const angle = id * 2.39996; // 137.5 degrees (Golden Angle) in radians
  const radius = 0.0015; // Increased to 150m so it's visible even when zoomed out
  return {
    lat: lat + Math.sin(angle) * radius,
    lng: lng + Math.cos(angle) * radius,
  };
};

const STATUS_FILTER_KEYS = [
  { key: 'All', tKey: 'all' },
  { key: 'Pending', tKey: 'pending' },
  { key: 'In Progress', tKey: 'inProgress' },
  { key: 'Resolved', tKey: 'resolved' },
];

const CATEGORY_FILTER_KEYS = [
  { key: 'All', icon: 'apps-outline', label: 'All' },
  { key: 'Road & Infrastructure', icon: 'construct-outline', label: 'Roads' },
  { key: 'Electricity', icon: 'flash-outline', label: 'Electricity' },
  { key: 'Drainage', icon: 'water-outline', label: 'Drainage' },
  { key: 'Waste & Sanitation', icon: 'trash-outline', label: 'Sanitation' },
];

const computeDistanceStr = (lat1, lon1, lat2, lon2) => {
  const n1 = safeCoord(lat1);
  const n2 = safeCoord(lon1);
  const n3 = safeCoord(lat2);
  const n4 = safeCoord(lon2);
  if (n1 === null || n2 === null || n3 === null || n4 === null) return null;
  const R = 6371; // km
  const dLat = (n3 - n1) * (Math.PI / 180);
  const dLon = (n4 - n2) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(n1 * (Math.PI / 180)) * Math.cos(n3 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  if (d < 1) {
    return `${Math.round(d * 1000)}m away`;
  }
  return `${d.toFixed(1)}km away`;
};

const openDirections = (lat, lng) => {
  const nLat = safeCoord(lat);
  const nLng = safeCoord(lng);
  if (nLat === null || nLng === null) return;
  const destination = `${nLat},${nLng}`;
  const url = Platform.OS === 'ios'
    ? `http://maps.apple.com/?daddr=${destination}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  Linking.openURL(url).catch((err) => console.log('Could not open maps', err));
};

export default function MapScreen({ navigation }) {
  const { colors, theme } = useTheme();

  const PIN_COLORS = {
    Pending: colors.statusPending,
    'In Progress': colors.statusInProgress,
    Resolved: colors.statusResolved,
    Rejected: colors.statusRejected,
  };

  const { loadMapData, toggleUpvote: toggleConcernUpvote } = useConcerns();
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const { loadingLocation, getCurrentLocation, location: userLocation } = useLocation();
  const [mapReady, setMapReady] = useState(false);
  const [mapConcerns, setMapConcerns] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const MAP_TYPE_KEY = '@map_type';

  useEffect(() => {
    let isMounted = true;
    const fetchData = () => {
      setDataLoading(true);
      loadMapData().then(data => {
        if (isMounted) {
          setMapConcerns(data || []);
          setDataLoading(false);
        }
      });
    };

    fetchData(); // initial load

    // Reload when screen is focused (e.g. after submitting a new concern)
    const unsubscribe = navigation.addListener('focus', fetchData);
    return () => { isMounted = false; unsubscribe(); };
  }, [navigation]);

  useEffect(() => {
    const loadMapType = async () => {
      try {
        const saved = await AsyncStorage.getItem(MAP_TYPE_KEY);
        if (saved) setMapType(saved);
      } catch {}
    };
    loadMapType();
  }, []);

  const toggleMapType = async () => {
    const next = mapType === 'standard' ? 'satellite' : 'standard';
    setMapType(next);
    try {
      await AsyncStorage.setItem(MAP_TYPE_KEY, next);
    } catch {}
  };

  // Ask permission and pinpoint exactly where user is
  const goToMyLocation = async () => {
    const loc = await getCurrentLocation(true);
    if (!loc) return;

    mapRef.current?.animateToRegion(
      {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      800,
    );
  };

  const handleQuickUpvote = async (concernId) => {
    if (toggleConcernUpvote) {
      try {
        await toggleConcernUpvote(concernId);
        setSelectedConcern(prev => {
          if (!prev || prev.id !== concernId) return prev;
          const currentlyUpvoted = prev.is_upvoted_by_me;
          return {
            ...prev,
            upvotes: (prev.upvotes || 0) + (currentlyUpvoted ? -1 : 1),
            is_upvoted_by_me: !currentlyUpvoted,
          };
        });
      } catch (e) {}
    }
  };

  // Filter and validate concerns that have valid coordinates (supporting both original names and aliases)
  const pinnable = mapConcerns.filter((c) => {
    const lat = safeCoord(c.location_lat ?? c.lat);
    const lng = safeCoord(c.location_lng ?? c.lng);
    if (lat === null || lng === null) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
    return true;
  });

  const handleMarkerPress = useCallback((concern) => {
    setSelectedConcern(concern);
    const rawLat = safeCoord(concern.location_lat ?? concern.lat);
    const rawLng = safeCoord(concern.location_lng ?? concern.lng);
    if (rawLat !== null && rawLng !== null) {
      mapRef.current?.animateToRegion(
        {
          latitude: rawLat,
          longitude: rawLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        400,
      );
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
        customMapStyle={theme === 'dark' ? darkMapStyle : []}
        onMapReady={() => setMapReady(true)}
        onPress={handleDismiss}
        clusterColor={colors.primary}
        renderCluster={(cluster) => {
          const { id, geometry, onPress, properties } = cluster;
          const points = properties.point_count;
          return (
            <Marker
              key={`cluster-${id}`}
              coordinate={{
                longitude: geometry.coordinates[0],
                latitude: geometry.coordinates[1],
              }}
              onPress={onPress}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryLight || '#60A5FA']}
                style={[
                  styles.clusterMarker,
                  { borderColor: 'rgba(255,255,255,0.4)' },
                ]}
              >
                <Text style={styles.clusterText}>{points}</Text>
              </LinearGradient>
            </Marker>
          );
        }}
      >
        {mapReady &&
          pinnable.map((c) => {
            const rawLat = safeCoord(c.location_lat ?? c.lat);
            const rawLng = safeCoord(c.location_lng ?? c.lng);
            if (rawLat === null || rawLng === null) return null;
            const { lat, lng } = getJitteredCoord(rawLat, rawLng, c.id);
            return (
              <Marker
                key={c.id}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => handleMarkerPress(c)}
              >
                <View
                  style={[styles.markerPin, { backgroundColor: PIN_COLORS[c.status] || '#8899BB', borderColor: 'rgba(255,255,255,0.8)' }]}
                >
                  <Ionicons
                    name={getCategoryConfig(colors)[c.category]?.icon || 'alert-circle'}
                    size={16}
                    color="#fff"
                  />
                </View>
              </Marker>
            );
          })}

        {/* The Exact True Location of the Selected Concern */}
        {selectedConcern && safeCoord(selectedConcern.location_lat ?? selectedConcern.lat) !== null && (
          <Marker
            coordinate={{
              latitude: safeCoord(selectedConcern.location_lat ?? selectedConcern.lat),
              longitude: safeCoord(selectedConcern.location_lng ?? selectedConcern.lng),
            }}
            zIndex={999}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.exactLocationPulse}>
              <View style={styles.exactLocationDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── Status Bar Background Gradient ── */}
      <LinearGradient
        colors={
          theme === 'dark'
            ? ['rgba(10,22,40,0.8)', 'transparent']
            : ['rgba(255,255,255,0.8)', 'transparent']
        }
        style={styles.statusBarGradient}
        pointerEvents="none"
      />

      {/* ── Header overlay (safe from notch) ── */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']} pointerEvents="box-none">
        {/* Status Filter Pills */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {STATUS_FILTER_KEYS.map((f) => {
              const active = statusFilter === f.key;
              const color = getStatusConfig(colors)[f.key]?.color || colors.primary;
              const count =
                f.key === 'All'
                  ? mapConcerns.length
                  : mapConcerns.filter((c) => c.status === f.key).length;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.bgCard + 'F0', borderColor: colors.border },
                    active && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => {
                    setStatusFilter(f.key);
                    setSelectedConcern(null);
                  }}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: colors.textPrimary },
                      active && { color: '#fff' },
                    ]}
                  >
                    {t(f.tKey)}
                  </Text>
                  <View
                    style={[
                      styles.filterCount,
                      { backgroundColor: colors.bgCardAlt },
                      active && { backgroundColor: 'rgba(255,255,255,0.25)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        { color: colors.textMuted },
                        active && { color: '#fff' },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterRow, { marginTop: verticalScale(6) }]}
          >
            {CATEGORY_FILTER_KEYS.map((cat) => {
              const active = categoryFilter === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.filterChipSmall,
                    { backgroundColor: colors.bgCard + 'E5', borderColor: colors.border },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    setCategoryFilter(cat.key);
                    setSelectedConcern(null);
                  }}
                >
                  <Ionicons
                    name={cat.icon}
                    size={13}
                    color={active ? '#fff' : colors.textMuted}
                    style={{ marginRight: scale(4) }}
                  />
                  <Text
                    style={[
                      styles.filterTextSmall,
                      { color: colors.textSecondary },
                      active && { color: '#fff', fontWeight: '700' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Pinnable Count Badge */}
        <View
          style={[
            styles.countBadge,
            { backgroundColor: colors.bgCard + 'F0', borderColor: colors.border },
          ]}
        >
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={[styles.countText, { color: colors.textPrimary }]}>
            {pinnable.length} {t('reports')}
          </Text>
        </View>
      </SafeAreaView>

      {/* 🗺️ Map Type Toggle */}
      <TouchableOpacity
        style={[
          styles.mapTypeToggle,
          { backgroundColor: colors.bgCard + 'F0', borderColor: colors.border },
        ]}
        onPress={toggleMapType}
      >
        <Ionicons
          name={mapType === 'standard' ? 'earth' : 'map'}
          size={22}
          color={colors.primary}
        />
        <Text style={[styles.mapTypeToggleText, { color: colors.primary }]}>
          {mapType === 'standard' ? t('satellite') : t('standard')}
        </Text>
      </TouchableOpacity>

      {/* 📍 Pinpoint Location Button */}
      <TouchableOpacity
        style={[
          styles.myLocationBtn,
          { backgroundColor: colors.bgCard + 'F0', borderColor: colors.border },
        ]}
        onPress={goToMyLocation}
        disabled={loadingLocation}
      >
        {loadingLocation ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons name="locate" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>

      {/* Legend */}
      <View
        style={[
          styles.legend,
          { backgroundColor: colors.bgCard + 'F5', borderColor: colors.border },
        ]}
      >
        {Object.entries(PIN_COLORS)
          .slice(0, 3)
          .map(([status, color]) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: colors.textPrimary }]}>
                {status === 'In Progress' ? t('inProgress') : t(status.toLowerCase())}
              </Text>
            </View>
          ))}
      </View>

      {/* Selected Concern Bottom Sheet (Redesigned Floating Card) */}
      {selectedConcern && (() => {
        const rawLat = safeCoord(selectedConcern.location_lat ?? selectedConcern.lat);
        const rawLng = safeCoord(selectedConcern.location_lng ?? selectedConcern.lng);
        const distanceStr = userLocation?.coords
          ? computeDistanceStr(userLocation.coords.latitude, userLocation.coords.longitude, rawLat, rawLng)
          : null;

        const imgUrl = selectedConcern.image_url
          ? (selectedConcern.image_url.startsWith('http')
              ? selectedConcern.image_url
              : `http://localhost:5000${selectedConcern.image_url.startsWith('/') ? '' : '/'}${selectedConcern.image_url}`)
          : null;

        const categoryConfig = getCategoryConfig(colors)[selectedConcern.category] || {};

        return (
          <View
            style={[
              styles.bottomSheet,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            {/* Top Bar with Drag Handle & Close */}
            <View style={styles.cardHeaderRow}>
              <View style={[styles.bottomSheetHandle, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.closeCardBtn} onPress={handleDismiss} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Main Content Row */}
            <TouchableOpacity
              style={styles.cardMainRow}
              onPress={handleViewDetail}
              activeOpacity={0.85}
            >
              {/* Left Image Thumbnail or Category Avatar */}
              {imgUrl ? (
                <View style={styles.thumbContainer}>
                  <Image source={{ uri: imgUrl }} style={styles.thumbImage} resizeMode="cover" />
                  <View style={[styles.thumbCategoryBadge, { backgroundColor: categoryConfig.color || colors.primary }]}>
                    <Ionicons name={categoryConfig.icon || 'alert-circle'} size={12} color="#fff" />
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.avatarIconBox,
                    { backgroundColor: categoryConfig.bg || colors.primary + '15' },
                  ]}
                >
                  <Ionicons
                    name={categoryConfig.icon || 'alert-circle'}
                    size={26}
                    color={categoryConfig.color || colors.primary}
                  />
                </View>
              )}

              {/* Title & Metadata */}
              <View style={styles.cardDetails}>
                {/* Badges Row */}
                <View style={styles.cardMetaRow}>
                  <StatusBadge status={selectedConcern.status} />

                  {selectedConcern.priority === 'High' && (
                    <View style={[styles.priorityPill, { backgroundColor: colors.statusRejected + '20', borderColor: colors.statusRejected + '50' }]}>
                      <Ionicons name="flash" size={10} color={colors.statusRejected} />
                      <Text style={[styles.priorityText, { color: colors.statusRejected }]}>High</Text>
                    </View>
                  )}

                  {distanceStr && (
                    <View style={[styles.distancePill, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="navigate" size={10} color={colors.primary} />
                      <Text style={[styles.distanceText, { color: colors.primary }]}>{distanceStr}</Text>
                    </View>
                  )}
                </View>

                {/* Title */}
                <Text style={[styles.cardTitleText, { color: colors.textPrimary }]} numberOfLines={2}>
                  {selectedConcern.title}
                </Text>

                {/* Location / Barangay */}
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.locationText, { color: colors.textMuted }]} numberOfLines={1}>
                    {selectedConcern.location_address || selectedConcern.user_barangay || 'Kabankalan City'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Bottom Actions Bar */}
            <View style={[styles.cardActionBar, { borderTopColor: colors.border + '50' }]}>
              {/* Upvote Button */}
              <TouchableOpacity
                style={[
                  styles.actionUpvoteBtn,
                  {
                    backgroundColor: selectedConcern.is_upvoted_by_me ? colors.primary + '20' : colors.bgCardAlt,
                    borderColor: selectedConcern.is_upvoted_by_me ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleQuickUpvote(selectedConcern.id)}
              >
                <Ionicons
                  name={selectedConcern.is_upvoted_by_me ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={15}
                  color={selectedConcern.is_upvoted_by_me ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.actionUpvoteText,
                    { color: selectedConcern.is_upvoted_by_me ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {selectedConcern.upvotes || 0} Upvotes
                </Text>
              </TouchableOpacity>

              {/* Get Directions Button */}
              {rawLat !== null && rawLng !== null && (
                <TouchableOpacity
                  style={[styles.actionDirectionsBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '35' }]}
                  onPress={() => openDirections(rawLat, rawLng)}
                >
                  <Ionicons name="navigate-outline" size={15} color={colors.primary} />
                  <Text style={[styles.actionDirectionsText, { color: colors.primary }]}>Directions</Text>
                </TouchableOpacity>
              )}

              {/* View Detail Accent Button */}
              <TouchableOpacity
                style={[styles.actionViewDetailBtn, { backgroundColor: colors.primary }]}
                onPress={handleViewDetail}
              >
                <Text style={styles.actionViewDetailText}>View</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {/* Loading overlay */}
      {dataLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  statusBarGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: verticalScale(100),
    zIndex: 1,
  },

  markerPin: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  clusterMarker: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  clusterText: {
    color: '#fff',
    fontSize: rf(14),
    fontWeight: '800',
  },

  // ── Header overlay ──
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
    zIndex: 2,
  },
  filterContainer: {
    marginTop: verticalScale(8),
    marginHorizontal: scale(12),
  },
  filterRow: { flexDirection: 'row', gap: scale(8), paddingRight: scale(12) },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(9),
    borderRadius: moderateScale(22),
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  filterText: { fontSize: rf(12), fontWeight: '700' },
  filterCount: {
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(1),
  },
  filterCountText: { fontSize: rf(10), fontWeight: '800' },

  filterChipSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    marginRight: scale(6),
  },
  filterTextSmall: { fontSize: rf(11), fontWeight: '600' },

  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    paddingHorizontal: scale(7),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(10),
  },
  distanceText: { fontSize: rf(11), fontWeight: '700' },

  upvoteChipBtn: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(10),
    borderWidth: 1,
  },
  upvoteChipText: { fontSize: rf(11), fontWeight: '700' },

  directionsBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    alignSelf: 'flex-start',
    marginLeft: scale(14),
    marginTop: verticalScale(10),
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderWidth: 1,
  },
  countText: { fontSize: rf(12), fontWeight: '700' },

  // ── Controls ──
  mapTypeToggle: {
    position: 'absolute',
    top: verticalScale(140),
    right: scale(12),
    borderRadius: moderateScale(14),
    padding: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: verticalScale(3),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  mapTypeToggleText: {
    fontSize: rf(9),
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  myLocationBtn: {
    position: 'absolute',
    top: verticalScale(200),
    right: scale(12),
    borderRadius: moderateScale(14),
    width: moderateScale(46),
    height: moderateScale(46),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },

  // ── Legend ──
  legend: {
    position: 'absolute',
    bottom: verticalScale(24),
    left: scale(12),
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    gap: scale(6),
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
    }),
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  legendDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  legendText: { fontSize: rf(11), fontWeight: '600' },

  // ── Bottom Sheet (Redesigned Floating Card) ──
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    borderTopWidth: 1.5,
    paddingBottom: verticalScale(28),
    paddingTop: verticalScale(10),
    paddingHorizontal: scale(16),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: { elevation: 24 },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(10),
    position: 'relative',
  },
  bottomSheetHandle: {
    width: scale(44),
    height: verticalScale(4),
    borderRadius: scale(2),
    alignSelf: 'center',
    opacity: 0.5,
  },
  closeCardBtn: {
    position: 'absolute',
    right: 0,
    top: -2,
  },

  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
    marginBottom: verticalScale(14),
  },

  thumbContainer: {
    position: 'relative',
    width: scale(68),
    height: scale(68),
    borderRadius: moderateScale(16),
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(16),
  },
  thumbCategoryBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  avatarIconBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardDetails: { flex: 1 },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(6),
    marginBottom: verticalScale(4),
  },

  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(8),
    borderWidth: 1,
  },
  priorityText: { fontSize: rf(10), fontWeight: '800' },

  cardTitleText: {
    fontSize: rf(15),
    fontWeight: '800',
    lineHeight: rf(20),
    marginBottom: verticalScale(4),
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  locationText: { fontSize: rf(11), fontWeight: '500' },

  // ── Bottom Action Bar ──
  cardActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    gap: scale(8),
  },

  actionUpvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(12),
    borderWidth: 1,
  },
  actionUpvoteText: { fontSize: rf(12), fontWeight: '700' },

  actionDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(12),
    borderWidth: 1,
  },
  actionDirectionsText: { fontSize: rf(12), fontWeight: '700' },

  actionViewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(12),
  },
  actionViewDetailText: { fontSize: rf(12), fontWeight: '800', color: '#fff' },

  // ── Exact Location Pin ──
  exactLocationPulse: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(239, 68, 68, 0.25)', // Red pulse
    alignItems: 'center',
    justifyContent: 'center',
  },
  exactLocationDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },

  // ── Loading ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
