import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge } from '../../components/UI';
import { COLORS, CATEGORY_CONFIG, STATUS_CONFIG } from '../../utils/theme';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

const { width, height } = Dimensions.get('window');

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Resolved'];
const PIN_COLORS = {
  Pending: '#FFB800', 'In Progress': '#1A6BFF',
  Resolved: '#00D4AA', Rejected: '#FF4444',
};

// Default center: Iloilo City
const DEFAULT_REGION = {
  latitude: 9.9868, longitude: 122.8130,
  latitudeDelta: 0.08, longitudeDelta: 0.08,
};

export default function MapScreen({ navigation }) {
  const { concerns } = useConcerns();
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedConcern, setSelectedConcern] = useState(null);
  const [mapType, setMapType] = useState('standard');
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Ask permission and pinpoint exactly where user is
  const goToMyLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Please allow location access to find your position.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    } catch (err) {
      alert('Could not pinpoint your location accurately.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const pinnable = concerns.filter(c =>
    c.location_lat && c.location_lng &&
    (statusFilter === 'All' || c.status === statusFilter)
  );

  const handleMarkerPress = (concern) => {
    setSelectedConcern(concern);
    mapRef.current?.animateToRegion({
      latitude: Number(concern.location_lat),
      longitude: Number(concern.location_lng),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 400);
  };

  const handleViewDetail = () => {
    if (selectedConcern) {
      navigation.navigate('Home', {
        screen: 'ConcernDetail',
        params: { concernId: selectedConcern.id },
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton
        mapType={mapType}
      >
        {pinnable.map(c => (
          <Marker
            key={c.id}
            coordinate={{ latitude: Number(c.location_lat), longitude: Number(c.location_lng) }}
            pinColor={PIN_COLORS[c.status] || '#8899BB'}
            onPress={() => handleMarkerPress(c)}
          >
            <View style={[styles.markerPin, { backgroundColor: PIN_COLORS[c.status] || '#8899BB' }]}>
              <Ionicons
                name={CATEGORY_CONFIG[c.category]?.icon || 'alert-circle'}
                size={14}
                color="#fff"
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Filter Pills (floating on map) */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map(f => {
              const active = statusFilter === f;
              const color = STATUS_CONFIG[f]?.color || COLORS.primary;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setStatusFilter(f)}
                >
                  <Text style={[styles.filterText, active && { color: '#fff' }]}>
                    {f === 'All' ? t('all') : f === 'In Progress' ? t('inProgress') : t(f.toLowerCase())}
                  </Text>
                  <View style={[styles.filterCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Text style={[styles.filterCountText, active && { color: '#fff' }]}>
                      {f === 'All' ? concerns.filter(c => c.location_lat).length : concerns.filter(c => c.status === f && c.location_lat).length}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 🗺️ Map Type Toggle */}
      <TouchableOpacity 
        style={styles.mapTypeToggle} 
        onPress={() => setMapType(prev => prev === 'standard' ? 'satellite' : 'standard')}
      >
        <Ionicons name={mapType === 'standard' ? 'earth' : 'map'} size={24} color={COLORS.primary} />
        <Text style={styles.mapTypeToggleText}>
          {mapType === 'standard' ? t('satellite') : t('standard')}
        </Text>
      </TouchableOpacity>

      {/* 📍 Pinpoint Location Button */}
      <TouchableOpacity 
        style={styles.myLocationBtn} 
        onPress={goToMyLocation}
      >
        <Ionicons name="locate" size={24} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(PIN_COLORS).slice(0, 3).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{status === 'In Progress' ? t('inProgress') : t(status.toLowerCase())}</Text>
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
                <Text style={styles.bsLocation} numberOfLines={1}>
                  📍 {selectedConcern.location_address || "No address provided"}
                </Text>
              </View>
            </View>

            <View style={styles.bsActions}>
              <TouchableOpacity style={styles.viewBtn} onPress={handleViewDetail}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedConcern(null)}>
                <Ionicons name="close" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  markerPin: {
    width: scale(32), height: scale(32), borderRadius: scale(16),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.3, shadowRadius: scale(4), elevation: 5,
  },

  filterContainer: {
    position: 'absolute', top: verticalScale(12), left: scale(12), right: scale(12),
  },
  filterRow: { flexDirection: 'row', gap: scale(8) },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(8), borderRadius: moderateScale(20),
    backgroundColor: COLORS.bgCard + 'EE', borderWidth: 1, borderColor: COLORS.border,
  },
  filterText: { color: COLORS.textPrimary, fontSize: rf(12), fontWeight: '700' },
  filterCount: { backgroundColor: COLORS.bgCardAlt, borderRadius: moderateScale(10), paddingHorizontal: scale(6), paddingVertical: verticalScale(1) },
  filterCountText: { color: COLORS.textMuted, fontSize: rf(10), fontWeight: '800' },

  legend: {
    position: 'absolute', bottom: verticalScale(160), right: scale(12),
    backgroundColor: COLORS.bgCard + 'F5', borderRadius: moderateScale(16),
    padding: scale(12), gap: scale(8), borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.2, shadowRadius: scale(8), elevation: 5,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  legendDot: { width: scale(12), height: scale(12), borderRadius: scale(6), borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  legendText: { color: COLORS.textPrimary, fontSize: rf(12), fontWeight: '700' },

  mapTypeToggle: {
    position: 'absolute', top: verticalScale(80), right: scale(12),
    backgroundColor: COLORS.bgCard + 'EE', borderRadius: moderateScale(12),
    padding: scale(10), alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
     gap: verticalScale(4),
  },
  mapTypeToggleText: {
    color: COLORS.primary, fontSize: rf(10), fontWeight: '800', textTransform: 'uppercase',
  },

  myLocationBtn: {
    position: 'absolute', top: verticalScale(140), right: scale(12),
    backgroundColor: COLORS.bgCard + 'EE', borderRadius: moderateScale(12),
    width: moderateScale(48), height: moderateScale(48),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.2, shadowRadius: scale(8), elevation: 5,
  },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: moderateScale(20), borderTopRightRadius: moderateScale(20),
    borderTopWidth: 1, borderColor: COLORS.border,
    paddingBottom: verticalScale(32), paddingTop: verticalScale(12),
  },
  bottomSheetHandle: {
    width: scale(36), height: verticalScale(4), backgroundColor: COLORS.border,
    borderRadius: scale(2), alignSelf: 'center', marginBottom: verticalScale(14),
  },
  bottomSheetContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), gap: scale(12) },
  bsLeft: { flex: 1, flexDirection: 'row', gap: scale(12), alignItems: 'flex-start' },
  bsIcon: { width: scale(44), height: scale(44), borderRadius: moderateScale(12), alignItems: 'center', justifyContent: 'center' },
  bsTitle: { color: COLORS.textPrimary, fontSize: rf(15), fontWeight: '700', marginBottom: verticalScale(6) },
  bsMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(4) },
  bsVotes: { color: COLORS.textMuted, fontSize: rf(12) },
  bsLocation: { color: COLORS.textMuted, fontSize: rf(12) },
  bsActions: { gap: verticalScale(8) },
  viewBtn: { width: scale(36), height: scale(36), borderRadius: moderateScale(10), backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: scale(36), height: scale(36), borderRadius: moderateScale(10), backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
});