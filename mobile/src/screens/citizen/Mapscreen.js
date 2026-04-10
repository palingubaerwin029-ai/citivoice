import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import { StatusBadge } from '../../components/UI';
import { COLORS, CATEGORY_CONFIG, STATUS_CONFIG } from '../../utils/theme';

const { width } = Dimensions.get('window');

const STATUS_FILTERS = ['All', 'Pending', 'In Progress', 'Resolved'];
const PIN_COLORS = {
  Pending: '#FFB800', 'In Progress': '#1A6BFF',
  Resolved: '#00D4AA', Rejected: '#FF4444',
};

// Default center: Iloilo City
const DEFAULT_REGION = {
  latitude: 10.7202, longitude: 122.5621,
  latitudeDelta: 0.08, longitudeDelta: 0.08,
};

export default function MapScreen({ navigation }) {
  const { concerns } = useConcerns();
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedConcern, setSelectedConcern] = useState(null);

  const pinnable = concerns.filter(c =>
    c.location?.latitude && c.location?.longitude &&
    (statusFilter === 'All' || c.status === statusFilter)
  );

  const handleMarkerPress = (concern) => {
    setSelectedConcern(concern);
    mapRef.current?.animateToRegion({
      latitude: concern.location.latitude,
      longitude: concern.location.longitude,
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
      >
        {pinnable.map(c => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.location.latitude, longitude: c.location.longitude }}
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
                      {f === 'All' ? concerns.filter(c => c.location?.latitude).length : concerns.filter(c => c.status === f && c.location?.latitude).length}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

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
                  📍 {selectedConcern.location?.address}
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
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },

  filterContainer: {
    position: 'absolute', top: 12, left: 12, right: 12,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.bgCard + 'EE', borderWidth: 1, borderColor: COLORS.border,
  },
  filterText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  filterCount: { backgroundColor: COLORS.bgCardAlt, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterCountText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800' },

  legend: {
    position: 'absolute', bottom: 160, right: 12,
    backgroundColor: COLORS.bgCard + 'EE', borderRadius: 12,
    padding: 10, gap: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '600' },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: COLORS.border,
    paddingBottom: 32, paddingTop: 12,
  },
  bottomSheetHandle: {
    width: 36, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 14,
  },
  bottomSheetContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  bsLeft: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bsIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bsTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  bsMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  bsVotes: { color: COLORS.textMuted, fontSize: 12 },
  bsLocation: { color: COLORS.textMuted, fontSize: 12 },
  bsActions: { gap: 8 },
  viewBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
});