import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useConcerns } from '../../context/ConcernContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { InputField, PrimaryButton } from '../../components/UI.js';
import { COLORS, CATEGORY_CONFIG } from '../../utils/theme.js';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive.js';

const CATEGORIES = Object.keys(CATEGORY_CONFIG);
const PRIORITIES = ['Low', 'Medium', 'High'];
const PRIORITY_COLORS = { Low: COLORS.accent, Medium: COLORS.statusPending, High: COLORS.statusRejected };

export default function SubmitConcernScreen({ navigation }) {
  const { addConcern } = useConcerns();
  const { t } = useLanguage();
  const mapRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'Medium',
  });
  const [imageUri, setImageUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [reversingGeocode, setReversingGeocode] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // Reverse geocode coordinates to get a readable address
  const reverseGeocode = async (latitude, longitude) => {
    try {
      const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addr) {
        const parts = [
          addr.name, 
          addr.street, 
          addr.district, 
          addr.city || addr.subregion, 
          addr.region
        ].filter(Boolean);
        
        const uniqueParts = Array.from(new Set(parts));
        return uniqueParts.length > 0 ? uniqueParts.join(', ') : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      }
    } catch {}
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  };

  // Get current GPS location and open the map picker
  const getLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow location access.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const address = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address,
      });
      setShowMap(true);
    } catch (err) {
      Alert.alert(t('error'), 'Could not get location.');
    } finally {
      setLoadingLocation(false);
    }
  };

  // When user drags the marker or taps on the map to pick a new spot
  const handleMapPinChange = async (coordinate) => {
    const { latitude, longitude } = coordinate;
    // Immediately update pin position
    setLocation(prev => ({ ...prev, latitude, longitude, address: prev?.address || '' }));

    // Reverse geocode in the background
    setReversingGeocode(true);
    const address = await reverseGeocode(latitude, longitude);
    setLocation(prev => ({ ...prev, address }));
    setReversingGeocode(false);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = t('required');
    if (!form.category) e.category = t('required');
    if (!form.description.trim()) e.description = t('required');
    else if (form.description.trim().length < 20) e.description = t('moreDetail');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await addConcern({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        imageUri,
        location,
      });
      setSubmitted(true);
    } catch (err) {
      Alert.alert(t('error'), err.message || 'Could not submit concern.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
        </View>
        <Text style={styles.successTitle}>{t('submitted')}</Text>
        <Text style={styles.successMsg}>{t('submittedMsg')}</Text>
        <TouchableOpacity style={styles.successBtn} onPress={() => navigation.navigate('Feed')}>
          <Text style={styles.successBtnText}>{t('viewFeed')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.successSecBtn} onPress={() => { setSubmitted(false); setForm({ title: '', description: '', category: '', priority: 'Medium' }); setImageUri(null); setLocation(null); setShowMap(false); }}>
          <Text style={styles.successSecBtnText}>{t('reportAnother')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.bgDark }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Title */}
        <InputField
          label={t('concernTitle')}
          value={form.title}
          onChangeText={v => set('title', v)}
          placeholder={t('titlePlaceholder')}
          error={errors.title}
        />

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('category')}</Text>
          {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => {
              const cfg = CATEGORY_CONFIG[cat];
              const active = form.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                  onPress={() => set('category', cat)}
                >
                  <Ionicons name={cfg.icon} size={16} color={active ? cfg.color : COLORS.textMuted} />
                  <Text style={[styles.catChipText, active && { color: cfg.color }]}>
                    {cat.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Priority */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('priority')}</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map(p => {
              const active = form.priority === p;
              const color = PRIORITY_COLORS[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, active && { backgroundColor: color + '22', borderColor: color }]}
                  onPress={() => set('priority', p)}
                >
                  <View style={[styles.priorityDot, { backgroundColor: color }]} />
                  <Text style={[styles.priorityText, active && { color }]}>{t(p.toLowerCase())}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <InputField
          label={t('description')}
          value={form.description}
          onChangeText={v => set('description', v)}
          placeholder={t('descriptionPlaceholder')}
          multiline
          numberOfLines={5}
          inputStyle={{ minHeight: 110, textAlignVertical: 'top' }}
          error={errors.description}
        />

        {/* Photo */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('attachPhoto')}</Text>
          <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={24} color={COLORS.statusRejected} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="camera" size={32} color={COLORS.textMuted} />
                <Text style={styles.photoBoxText}>{t('tapToAddPhoto')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Location Section ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('location')}</Text>

          {!showMap ? (
            /* Step 1: Tap to get current location */
            <TouchableOpacity
              style={[styles.locationBtn, location && styles.locationBtnActive]}
              onPress={getLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons
                  name={location ? 'location' : 'location-outline'}
                  size={20}
                  color={location ? COLORS.accent : COLORS.textMuted}
                />
              )}
              <Text style={[styles.locationText, location && styles.locationTextActive]}>
                {loadingLocation
                  ? t('gettingLocation')
                  : location
                    ? location.address
                    : t('tapToUseLocation')}
              </Text>
            </TouchableOpacity>
          ) : (
            /* Step 2: Map picker with draggable pin */
            <View style={styles.mapSection}>
              {/* Map Container */}
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={styles.mapView}
                  initialRegion={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  onPress={(e) => handleMapPinChange(e.nativeEvent.coordinate)}
                  showsUserLocation
                  showsMyLocationButton={false}
                >
                  <Marker
                    coordinate={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                    }}
                    draggable
                    onDragEnd={(e) => handleMapPinChange(e.nativeEvent.coordinate)}
                  >
                    <View style={styles.mapPin}>
                      <Ionicons name="location" size={28} color={COLORS.primary} />
                    </View>
                  </Marker>
                </MapView>

                {/* Crosshair overlay hint */}
                <View style={styles.mapHintContainer} pointerEvents="none">
                  <View style={styles.mapHintBadge}>
                    <Ionicons name="move" size={12} color={COLORS.textPrimary} />
                    <Text style={styles.mapHintText}>
                      {t('tapToUseLocation')}
                    </Text>
                  </View>
                </View>

                {/* Re-center button */}
                <TouchableOpacity
                  style={styles.recenterBtn}
                  onPress={async () => {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                    handleMapPinChange(loc.coords);
                    mapRef.current?.animateToRegion({
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }, 500);
                  }}
                >
                  <Ionicons name="locate" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Address display */}
              <View style={styles.addressCard}>
                <View style={styles.addressLeft}>
                  <Ionicons name="location" size={18} color={COLORS.accent} />
                  <View style={{ flex: 1 }}>
                    {reversingGeocode ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                        <ActivityIndicator size="small" color={COLORS.accent} />
                        <Text style={styles.addressText}>{t('gettingLocation')}</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.addressText}>{location.address}</Text>
                        <Text style={styles.coordsText}>
                          {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => { setLocation(null); setShowMap(false); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <PrimaryButton
          title={t('submitConcern')}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: 8 }}
        />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: scale(20), paddingBottom: verticalScale(40) },

  label: { color: COLORS.textSecondary, fontSize: rf(12), fontWeight: '600', marginBottom: verticalScale(10), letterSpacing: 0.3 },
  errorText: { color: COLORS.statusRejected, fontSize: rf(11), marginBottom: verticalScale(6) },
  fieldGroup: { marginBottom: verticalScale(20) },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(8), borderRadius: moderateScale(10),
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  catChipText: { color: COLORS.textMuted, fontSize: rf(12), fontWeight: '600' },

  priorityRow: { flexDirection: 'row', gap: scale(10) },
  priorityBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6),
    paddingVertical: verticalScale(10), borderRadius: moderateScale(10),
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  priorityDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  priorityText: { color: COLORS.textMuted, fontSize: rf(13), fontWeight: '700' },

  photoBox: {
    height: verticalScale(140), backgroundColor: COLORS.bgCard, borderRadius: moderateScale(14),
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%', borderRadius: moderateScale(14) },
  photoBoxText: { color: COLORS.textMuted, fontSize: rf(13), marginTop: verticalScale(8) },
  removePhoto: { position: 'absolute', top: verticalScale(8), right: scale(8) },

  // ── Location (button mode) ──
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(10),
    backgroundColor: COLORS.bgCard, borderRadius: moderateScale(12), padding: scale(14),
    borderWidth: 1, borderColor: COLORS.border,
  },
  locationBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '11' },
  locationText: { flex: 1, color: COLORS.textMuted, fontSize: rf(13) },
  locationTextActive: { color: COLORS.accent },

  // ── Location (map mode) ──
  mapSection: { gap: verticalScale(10) },
  mapContainer: {
    height: verticalScale(200), borderRadius: moderateScale(14),
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
  },
  mapView: { flex: 1 },
  mapPin: {
    alignItems: 'center', justifyContent: 'center',
  },
  mapHintContainer: {
    position: 'absolute', top: verticalScale(8), alignSelf: 'center',
  },
  mapHintBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    backgroundColor: COLORS.bgCard + 'E8', borderRadius: moderateScale(16),
    paddingHorizontal: scale(10), paddingVertical: verticalScale(4),
    borderWidth: 1, borderColor: COLORS.border,
  },
  mapHintText: { color: COLORS.textSecondary, fontSize: rf(10), fontWeight: '600' },
  recenterBtn: {
    position: 'absolute', bottom: verticalScale(10), right: scale(10),
    width: moderateScale(36), height: moderateScale(36), borderRadius: moderateScale(10),
    backgroundColor: COLORS.bgCard + 'F0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  addressCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: moderateScale(12), padding: scale(12),
    borderWidth: 1, borderColor: COLORS.accent + '44',
    backgroundColor: COLORS.accent + '0A',
  },
  addressLeft: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: scale(8),
  },
  addressText: { color: COLORS.textPrimary, fontSize: rf(13), fontWeight: '600', lineHeight: rf(18) },
  coordsText: { color: COLORS.textMuted, fontSize: rf(10), marginTop: verticalScale(2) },

  // ── Success ──
  successContainer: {
    flex: 1, backgroundColor: COLORS.bgDark,
    alignItems: 'center', justifyContent: 'center', padding: scale(32),
  },
  successCircle: {
    width: scale(100), height: scale(100), borderRadius: moderateScale(28),
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(24),
  },
  successTitle: { color: COLORS.textPrimary, fontSize: rf(24), fontWeight: '900', marginBottom: verticalScale(10), textAlign: 'center' },
  successMsg: { color: COLORS.textSecondary, fontSize: rf(15), textAlign: 'center', lineHeight: rf(22), marginBottom: verticalScale(32) },
  successBtn: {
    width: '100%', backgroundColor: COLORS.primary, borderRadius: moderateScale(14),
    paddingVertical: verticalScale(16), alignItems: 'center', marginBottom: verticalScale(12),
  },
  successBtnText: { color: '#fff', fontSize: rf(16), fontWeight: '700' },
  successSecBtn: { paddingVertical: verticalScale(12) },
  successSecBtnText: { color: COLORS.textSecondary, fontSize: rf(14) },
});