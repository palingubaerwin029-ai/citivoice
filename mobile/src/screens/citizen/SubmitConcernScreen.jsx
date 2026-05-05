import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../hooks/useLocation';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import { InputField, PrimaryButton } from '../../components/UI';
import { getCategoryConfig } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';

const PRIORITIES = ['Low', 'Medium', 'High'];

const getTemplates = (category, priority) => {
  const data = {
    "Road & Infrastructure": {
      Low: ["Suggestion for a new sidewalk or bike lane.", "Minor crack on the pavement.", "Faded lane markings."],
      Medium: ["Potholes starting to form on the road.", "Loose manhole cover causing noise.", "Damaged curbstone."],
      High: ["Massive sinkhole in the middle of the road!", "Major bridge structural damage.", "Road completely blocked by debris."]
    },
    "Water & Drainage": {
      Low: ["Suggestion for better drainage maintenance.", "Slow water flow in the public faucet.", "Minor puddle after rain."],
      Medium: ["Clogged drain causing bad smell.", "Water leak in a secondary pipe.", "Stagnant water in the gutter."],
      High: ["Major flood entering residential houses!", "Main water pipe burst and flooding the area.", "Open manhole posing immediate danger!"]
    },
    "Electricity": {
      Low: ["Request for more street lights in our alley.", "Flickering street light.", "Tree branches touching wires."],
      Medium: ["Street lights are out for a few days.", "Dangling wire not touching the ground.", "Power flickering frequently."],
      High: ["Live wire snapped and on the ground!", "Transformer exploded or sparking heavily!", "Widespread power outage in the block."]
    },
    "Waste & Sanitation": {
      Low: ["Request for more trash bins in the park.", "Inquiry about recycling programs.", "Minor littering in the area."],
      Medium: ["Garbage collection delayed for 2 days.", "Foul smell coming from a vacant lot.", "Garbage bins are overflowing."],
      High: ["Garbage has not been collected for a week!", "Illegal dumping of toxic/hazardous waste.", "Major sewage leak in the street."]
    },
    "Public Safety": {
      Low: ["Request for more security patrols at night.", "Abandoned vehicle in the street.", "Graffiti on public walls."],
      Medium: ["Aggressive stray dogs roaming around.", "Suspicious individual seen in the area.", "Overgrown bushes blocking visibility."],
      High: ["Fire hazard / uncontrolled burning!", "Emergency safety concern requiring police.", "Widespread flooding posing safety risk."]
    },
    "Other": {
      Low: ["Community improvement suggestion.", "Question about barangay services.", "Inquiry for upcoming events."],
      Medium: ["Feedback on recent community projects.", "Noise complaint during night time.", "Permit inquiry or general request."],
      High: ["Urgent community hazard!", "Immediate assistance needed for safety.", "Critical report requiring admin action."]
    }
  };

  const catData = data[category] || data["Other"];
  return catData[priority] || catData["Medium"];
};

const getQuickTitles = (category) => {
  const data = {
    "Road & Infrastructure": ["Pothole Repair", "Damaged Sidewalk", "Street Sign Issue", "Road Blockage"],
    "Water & Drainage": ["Flooding Report", "Water Pipe Leak", "Clogged Drainage", "Open Manhole"],
    "Electricity": ["Street Light Out", "Dangling Wires", "Transformer Spark", "Power Outage"],
    "Waste & Sanitation": ["Garbage Collection", "Illegal Dumping", "Trash Bin Overflow", "Bad Odor Report"],
    "Public Safety": ["Fire Hazard", "Aggressive Animal", "Safety Concern", "Dark Alley Report"],
    "Other": ["General Feedback", "Community Suggestion", "Barangay Inquiry"]
  };
  return data[category] || data["Other"];
};

export default function SubmitConcernScreen({ navigation }) {
  const { colors } = useTheme();
  
  const PRIORITY_COLORS = { 
    Low: colors.accent, 
    Medium: colors.statusPending, 
    High: colors.statusRejected 
  };

  const { addConcern } = useConcerns();
  const { t } = useLanguage();
  const CATEGORIES = Object.keys(getCategoryConfig(colors));
  const mapRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'Medium',
  });
  const [imageUri, setImageUri] = useState(null);
  const [location, setLocation] = useState(null);
  const { loadingLocation, getCurrentLocation, reverseGeocode } = useLocation();
  const { pickImage: launchImagePicker, takePhoto: launchCamera } = useImagePicker();
  const [reversingGeocode, setReversingGeocode] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleImagePicker = () => {
    Alert.alert(
      "Attach Photo",
      "Would you like to take a photo or choose from gallery?",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const uri = await launchCamera({ aspect: [4, 3], quality: 0.7 });
            if (uri) setImageUri(uri);
          },
        },
        {
          text: "Choose from Gallery",
          onPress: async () => {
            const uri = await launchImagePicker({ aspect: [4, 3], quality: 0.7 });
            if (uri) setImageUri(uri);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  // Get current GPS location and open the map picker
  const getLocation = async () => {
    const loc = await getCurrentLocation(true);
    if (!loc) return;
    
    const address = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
    setLocation({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      address,
    });
    setShowMap(true);
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
      <View style={[styles.successContainer, { backgroundColor: colors.bgDark }]}>
        <View style={[styles.successCircle, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={{ fontSize: 52 }}>🎉</Text>
        </View>
        <Text style={[styles.successTitle, { color: colors.textPrimary }]}>{t('submitted')}</Text>
        <Text style={[styles.successMsg, { color: colors.textSecondary }]}>{t('submittedMsg')}</Text>
        <TouchableOpacity style={[styles.successBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Feed')}>
          <Text style={styles.successBtnText}>{t('viewFeed')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.successSecBtn} onPress={() => { setSubmitted(false); setForm({ title: '', description: '', category: '', priority: 'Medium' }); setImageUri(null); setLocation(null); setShowMap(false); }}>
          <Text style={[styles.successSecBtnText, { color: colors.textSecondary }]}>{t('reportAnother')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Title */}
        <InputField
          label={t('concernTitle')}
          value={form.title}
          onChangeText={v => set('title', v)}
          placeholder={t('titlePlaceholder')}
          error={errors.title}
        />

        {/* Quick Titles */}
        {form.category && (
          <View style={[styles.templateSection, { marginTop: verticalScale(-12), marginBottom: verticalScale(20) }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
              {getQuickTitles(form.category).map((t, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.templateChip, { backgroundColor: colors.bgCard, borderColor: colors.border, paddingVertical: verticalScale(6) }]}
                  onPress={() => set('title', t)}
                >
                  <Text style={[styles.templateText, { color: colors.textPrimary, fontSize: rf(11) }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Category */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('category')}</Text>
          {errors.category ? <Text style={[styles.errorText, { color: colors.statusRejected }]}>{errors.category}</Text> : null}
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => {
              const cfg = getCategoryConfig(colors)[cat];
              const active = form.category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, { backgroundColor: colors.bgCard, borderColor: colors.border }, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                  onPress={() => set('category', cat)}
                >
                  <Ionicons name={cfg.icon} size={16} color={active ? cfg.color : colors.textMuted} />
                  <Text style={[styles.catChipText, { color: colors.textMuted }, active && { color: cfg.color }]}>
                    {cat.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category Descriptions */}
          {form.category ? (
            <View style={[styles.priorityHintBox, { backgroundColor: getCategoryConfig(colors)[form.category]?.bg || colors.bgCardAlt, borderColor: colors.border, marginTop: verticalScale(12) }]}>
              <Ionicons 
                name={getCategoryConfig(colors)[form.category]?.icon || "information-circle-outline"} 
                size={16} 
                color={getCategoryConfig(colors)[form.category]?.color || colors.primary} 
              />
              <Text style={[styles.priorityHintText, { color: colors.textSecondary }]}>
                {form.category === "Road & Infrastructure" && "Report issues with roads, sidewalks, bridges, or public buildings."}
                {form.category === "Water & Drainage" && "Report flooding, clogged drains, leaking pipes, or water supply issues."}
                {form.category === "Electricity" && "Report malfunctioning street lights, dangling wires, or power outages."}
                {form.category === "Waste & Sanitation" && "Report uncollected garbage, illegal dumping, or sanitation needs."}
                {form.category === "Public Safety" && "Report fire hazards, security risks, or dangerous community situations."}
                {form.category === "Other" && "Report any other community concerns that don't fit the above categories."}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Priority */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('priority')}</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map(p => {
              const active = form.priority === p;
              const color = PRIORITY_COLORS[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, active && { backgroundColor: color + '22', borderColor: color }]}
                  onPress={() => set('priority', p)}
                >
                  <View style={[styles.priorityDot, { backgroundColor: color }]} />
                  <Text style={[styles.priorityText, { color: colors.textMuted }, active && { color }]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Priority Descriptions */}
          <View style={[styles.priorityHintBox, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={PRIORITY_COLORS[form.priority]} />
            <Text style={[styles.priorityHintText, { color: colors.textSecondary }]}>
              {form.priority === 'Low' && "Non-urgent suggestions or minor maintenance feedback."}
              {form.priority === 'Medium' && "Requires attention (e.g. broken facilities, potholes)."}
              {form.priority === 'High' && "Urgent hazards or dangerous situations (e.g. floods, safety)."}
            </Text>
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

        {/* Quick Templates */}
        {form.category && (
          <View style={styles.templateSection}>
            <Text style={[styles.templateLabel, { color: colors.textSecondary }]}>Quick Templates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
              {getTemplates(form.category, form.priority).map((tmpl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.templateChip, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => set('description', tmpl)}
                >
                  <Ionicons name="flash-outline" size={14} color={colors.primary} />
                  <Text style={[styles.templateText, { color: colors.textPrimary }]} numberOfLines={1}>{tmpl}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Photo */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('attachPhoto')}</Text>
          <TouchableOpacity style={[styles.photoBox, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={handleImagePicker}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setImageUri(null)}
                >
                  <Ionicons name="close-circle" size={24} color={colors.statusRejected} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="camera" size={32} color={colors.textMuted} />
                <Text style={[styles.photoBoxText, { color: colors.textMuted }]}>{t('tapToAddPhoto')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Location Section ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('location')}</Text>

          {!showMap ? (
            /* Step 1: Tap to get current location */
            <TouchableOpacity
              style={[styles.locationBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }, location && { borderColor: colors.accent, backgroundColor: colors.accent + '11' }]}
              onPress={getLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name={location ? 'location' : 'location-outline'}
                  size={20}
                  color={location ? colors.accent : colors.textMuted}
                />
              )}
              <Text style={[styles.locationText, { color: colors.textMuted }, location && { color: colors.accent }]}>
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
                      <Ionicons name="location" size={28} color={colors.primary} />
                    </View>
                  </Marker>
                </MapView>

                {/* Crosshair overlay hint */}
                <View style={styles.mapHintContainer} pointerEvents="none">
                  <View style={[styles.mapHintBadge, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <Ionicons name="move" size={12} color={colors.textPrimary} />
                    <Text style={[styles.mapHintText, { color: colors.textPrimary }]}>
                      {t('tapToUseLocation')}
                    </Text>
                  </View>
                </View>

                {/* Re-center button */}
                <TouchableOpacity
                  style={[styles.recenterBtn, { backgroundColor: colors.bgCard + 'F0', borderColor: colors.border }]}
                  onPress={async () => {
                    const loc = await getCurrentLocation(false);
                    if (!loc) return;
                    handleMapPinChange(loc.coords);
                    mapRef.current?.animateToRegion({
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }, 500);
                  }}
                >
                  <Ionicons name="locate" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Address display */}
              <View style={[styles.addressCard, { backgroundColor: colors.bgCard, borderColor: colors.accent + '44' }, { backgroundColor: colors.accent + '0A' }]}>
                <View style={styles.addressLeft}>
                  <Ionicons name="location" size={18} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    {reversingGeocode ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text style={[styles.addressText, { color: colors.textPrimary }]}>{t('gettingLocation')}</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={[styles.addressText, { color: colors.textPrimary }]}>{location.address}</Text>
                        <Text style={[styles.coordsText, { color: colors.textMuted }]}>
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
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
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

  label: { fontSize: rf(12), fontWeight: '600', marginBottom: verticalScale(10), letterSpacing: 0.3 },
  errorText: { fontSize: rf(11), marginBottom: verticalScale(6) },
  fieldGroup: { marginBottom: verticalScale(20) },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(8), borderRadius: moderateScale(10),
    borderWidth: 1,
  },
  catChipText: { fontSize: rf(12), fontWeight: '600' },

  priorityRow: { flexDirection: 'row', gap: scale(10) },
  priorityBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6),
    paddingVertical: verticalScale(10), borderRadius: moderateScale(10),
    borderWidth: 1,
  },
  priorityDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  priorityText: { fontSize: rf(13), fontWeight: '700' },
  priorityHintBox: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    borderWidth: 1,
  },
  priorityHintText: { fontSize: rf(11), flex: 1, lineHeight: rf(16) },

  photoBox: {
    height: verticalScale(140), borderRadius: moderateScale(14),
    borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%', borderRadius: moderateScale(14) },
  photoBoxText: { fontSize: rf(13), marginTop: verticalScale(8) },
  removePhoto: { position: 'absolute', top: verticalScale(8), right: scale(8) },

  // ── Location (button mode) ──
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(10),
    borderRadius: moderateScale(12), padding: scale(14),
    borderWidth: 1,
  },
  locationBtnActive: {},
  locationText: { flex: 1, fontSize: rf(13) },
  locationTextActive: {},

  // ── Location (map mode) ──
  mapSection: { gap: verticalScale(10) },
  mapContainer: {
    height: verticalScale(200), borderRadius: moderateScale(14),
    overflow: 'hidden', borderWidth: 1,
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
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(10), paddingVertical: verticalScale(4),
    borderWidth: 1,
  },
  mapHintText: { fontSize: rf(10), fontWeight: '600' },
  recenterBtn: {
    position: 'absolute', bottom: verticalScale(10), right: scale(10),
    width: moderateScale(36), height: moderateScale(36), borderRadius: moderateScale(10),
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  addressCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: moderateScale(12), padding: scale(12),
    borderWidth: 1,
  },
  templateSection: { marginBottom: verticalScale(20) },
  templateLabel: { fontSize: rf(11), fontWeight: '700', marginBottom: verticalScale(8), letterSpacing: 0.5 },
  templateScroll: { gap: scale(8), paddingRight: scale(16) },
  templateChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(8),
    borderRadius: moderateScale(10), borderWidth: 1,
    maxWidth: scale(200),
  },
  templateText: { fontSize: rf(12), fontWeight: '500' },
  addressLeft: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: scale(8),
  },
  addressText: { fontSize: rf(13), fontWeight: '600', lineHeight: rf(18) },
  coordsText: { fontSize: rf(10), marginTop: verticalScale(2) },

  // ── Success ──
  successContainer: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center', padding: scale(32),
  },
  successCircle: {
    width: scale(100), height: scale(100), borderRadius: moderateScale(28),
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(24),
  },
  successTitle: { fontSize: rf(24), fontWeight: '900', marginBottom: verticalScale(10), textAlign: 'center' },
  successMsg: { fontSize: rf(15), textAlign: 'center', lineHeight: rf(22), marginBottom: verticalScale(32) },
  successBtn: {
    width: '100%', borderRadius: moderateScale(14),
    paddingVertical: verticalScale(16), alignItems: 'center', marginBottom: verticalScale(12),
  },
  successBtnText: { color: '#fff', fontSize: rf(16), fontWeight: '700' },
  successSecBtn: { paddingVertical: verticalScale(12) },
  successSecBtnText: { fontSize: rf(14) },
});