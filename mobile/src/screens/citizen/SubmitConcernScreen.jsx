import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../hooks/useLocation';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useConcerns } from '../../context/ConcernContext';
import { useLanguage } from '../../context/LanguageContext';
import { InputField, PrimaryButton } from '../../components/UI';
import { getCategoryConfig } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { scale, verticalScale, rf, moderateScale } from '../../utils/responsive';



export default function SubmitConcernScreen({ navigation }) {
  const { colors } = useTheme();

  const PRIORITY_COLORS = {
    Low: colors.accent,
    Medium: colors.statusPending,
    High: colors.statusRejected,
  };

  const { addConcern, analyzeDraft } = useConcerns();
  const { t } = useLanguage();
  const CATEGORIES = [
    'Road & Infrastructure',
    'Electricity',
    'Drainage',
    'Waste & Sanitation',
  ];

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const TOTAL_STEPS = 2;

  const [form, setForm] = useState({
    title: route.params?.initialDraft?.title || '',
    description: route.params?.initialDraft?.description || '',
    category: route.params?.initialDraft?.category || 'Road & Infrastructure',
    priority: route.params?.initialDraft?.priority || 'Medium',
  });

  useEffect(() => {
    if (route.params?.initialDraft) {
      setForm((prev) => ({
        ...prev,
        title: route.params.initialDraft.title || prev.title,
        description: route.params.initialDraft.description || prev.description,
        category: route.params.initialDraft.category || prev.category,
        priority: route.params.initialDraft.priority || prev.priority,
      }));
    }
  }, [route.params?.initialDraft]);
  const [imageUri, setImageUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [manualAddress, setManualAddress] = useState('');

  const { loadingLocation, getCurrentLocation, reverseGeocode } = useLocation();
  const { pickImage: launchImagePicker, takePhoto: launchCamera } = useImagePicker();

  const [reversingGeocode, setReversingGeocode] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const mapRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    // Clear error for this field
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const handleImagePicker = () => {
    Alert.alert('Attach Photo', 'Would you like to take a photo or choose from gallery?', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const uri = await launchCamera({ aspect: [4, 3], quality: 0.7 });
          if (uri) setImageUri(uri);
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const uri = await launchImagePicker({ aspect: [4, 3], quality: 0.7 });
          if (uri) setImageUri(uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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

  const handleMapPinChange = async (coordinate) => {
    const { latitude, longitude } = coordinate;
    setLocation((prev) => ({ ...prev, latitude, longitude, address: prev?.address || '' }));

    setReversingGeocode(true);
    const address = await reverseGeocode(latitude, longitude);
    setLocation((prev) => ({ ...prev, address }));
    setReversingGeocode(false);
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setGeocoding(true);
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results && results.length > 0) {
        const coords = results[0];
        handleMapPinChange({ latitude: coords.latitude, longitude: coords.longitude });
        setShowMap(true);
        setTimeout(() => {
          mapRef.current?.animateToRegion(
            {
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            },
            500,
          );
        }, 500);
      } else {
        Alert.alert(t('error'), 'Location not found');
      }
    } catch (e) {
      Alert.alert(t('error'), 'Error finding location');
    } finally {
      setGeocoding(false);
    }
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.title.trim()) e.title = t('required');
    if (!form.description.trim()) e.description = t('required');
    else if (form.description.trim().length < 10) e.description = t('moreDetail');
    if (Object.keys(e).length > 0)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setAiAnalyzing(true);
      try {
        const result = await analyzeDraft(form.title.trim(), form.description.trim());
        setForm((f) => ({
          ...f,
          category: result.category || f.category,
          priority: result.priority || f.priority,
        }));
      } catch (err) {
        console.warn('AI analysis failed:', err);
      } finally {
        setAiAnalyzing(false);
        setCurrentStep(2);
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Final check just in case
    if (!validateStep1()) return;

    if (!imageUri) {
      Alert.alert(t('error'), 'Please attach a photo of the concern.');
      return;
    }
    const finalLocation =
      location ||
      (manualAddress.trim()
        ? { address: manualAddress.trim(), latitude: null, longitude: null }
        : null);

    if (!finalLocation) {
      Alert.alert(t('error'), 'Please provide the exact location of the concern.');
      return;
    }

    setLoading(true);
    try {
      await addConcern({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        imageUri,
        location: finalLocation,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('error'), err.message || 'Could not submit concern.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.bgDark }]}>
        <View
          style={[
            styles.successCircle,
            { backgroundColor: colors.bgCard, borderColor: colors.border },
          ]}
        >
          <Text style={{ fontSize: 52 }}>🎉</Text>
        </View>
        <Text style={[styles.successTitle, { color: colors.textPrimary }]}>{t('submitted')}</Text>
        <Text style={[styles.successMsg, { color: colors.textSecondary }]}>
          {t('submittedMsg')}
        </Text>
        <TouchableOpacity
          style={[styles.successBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Feed')}
        >
          <Text style={styles.successBtnText}>{t('viewFeed')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.successSecBtn}
          onPress={() => {
            setSubmitted(false);
            setCurrentStep(1);
            setForm({ title: '', description: '', category: 'Road & Infrastructure', priority: 'Medium' });
            setImageUri(null);
            setLocation(null);
            setShowMap(false);
          }}
        >
          <Text style={[styles.successSecBtnText, { color: colors.textSecondary }]}>
            {t('reportAnother')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Helper to render the progress bar
  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        {[1, 2].map((step, index) => (
          <React.Fragment key={step}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={[
                  styles.progressCircle,
                  {
                    backgroundColor: currentStep >= step ? colors.primary : colors.bgCard,
                    borderColor: currentStep >= step ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.progressCircleText,
                    { color: currentStep >= step ? '#fff' : colors.textMuted },
                  ]}
                >
                  {step}
                </Text>
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  {
                    color: currentStep >= step ? colors.textPrimary : colors.textMuted,
                    fontWeight: currentStep === step ? '700' : '500',
                  },
                ]}
              >
                {step === 1 ? 'Details' : 'Attach & Send'}
              </Text>
            </View>
            {index < 1 && (
              <View
                style={[
                  styles.progressLine,
                  { backgroundColor: currentStep > step ? colors.primary : colors.border },
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Custom Header */}
        <View
          style={[
            styles.customHeader,
            { backgroundColor: colors.bgCard, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t('reportConcern')}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        <View style={styles.header}>{renderProgressBar()}</View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ================= STEP 1: DETAILS ================= */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderRow}>
                <Text style={[styles.stepHeader, { color: colors.textPrimary, marginBottom: 0 }]}>
                  Tell us more
                </Text>
              </View>
              <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
                Provide a title and describe the details
              </Text>


              {/* Title */}
              <InputField
                label={t('concernTitle')}
                value={form.title}
                onChangeText={(v) => set('title', v)}
                placeholder="e.g. Large Pothole on Main St."
                error={errors.title}
                style={{ marginBottom: verticalScale(16) }}
              />

              {/* Description */}
              <InputField
                label={t('description')}
                value={form.description}
                onChangeText={(v) => set('description', v)}
                placeholder="Please provide enough details so we can assist quickly..."
                multiline
                numberOfLines={5}
                inputStyle={{ minHeight: 110, textAlignVertical: 'top' }}
                error={errors.description}
                style={{ marginBottom: verticalScale(8) }}
              />

              <PrimaryButton
                title={aiAnalyzing ? '✨ AI is analyzing...' : 'Next Step →'}
                onPress={nextStep}
                loading={aiAnalyzing}
                style={{ marginTop: verticalScale(24) }}
              />
            </View>
          )}

          {/* ================= STEP 2: ATTACHMENTS & REVIEW ================= */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeaderRow}>
                <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.stepHeader, { color: colors.textPrimary, marginBottom: 0 }]}>
                  Add evidence
                </Text>
                <View style={{ width: 24 }} />
              </View>
              <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
                Photos and location help us resolve issues faster
              </Text>

              {/* Photo */}
              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.stepHeader,
                    {
                      color: colors.textPrimary,
                      fontSize: rf(16),
                      marginBottom: verticalScale(12),
                    },
                  ]}
                >
                  📸 Photo{' '}
                  <Text style={{ color: colors.statusRejected, fontWeight: '700' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.photoBox,
                    { backgroundColor: colors.bgCard, borderColor: colors.border },
                  ]}
                  onPress={handleImagePicker}
                >
                  {imageUri ? (
                    <>
                      <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => setImageUri(null)}
                      >
                        <Ionicons name="close-circle" size={28} color={colors.statusRejected} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                      <Text style={[styles.photoBoxText, { color: colors.textMuted }]}>
                        {t('tapToAddPhoto')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Location Section */}
              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.stepHeader,
                    {
                      color: colors.textPrimary,
                      fontSize: rf(16),
                      marginBottom: verticalScale(12),
                    },
                  ]}
                >
                  📍 Location{' '}
                  <Text style={{ color: colors.statusRejected, fontWeight: '700' }}>*</Text>
                </Text>

                {!showMap && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.locationBtn,
                        { backgroundColor: colors.bgCard, borderColor: colors.border },
                        location && {
                          borderColor: colors.accent,
                          backgroundColor: colors.accent + '11',
                        },
                      ]}
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
                      <Text
                        style={[
                          styles.locationText,
                          { color: colors.textMuted },
                          location && { color: colors.accent },
                        ]}
                      >
                        {loadingLocation
                          ? t('gettingLocation')
                          : location
                            ? location.address
                            : 'Use My Current GPS Location'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {showMap && (
                  <View style={styles.mapSection}>
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
                            <Ionicons name="location" size={32} color={colors.primary} />
                          </View>
                        </Marker>
                      </MapView>

                      <View style={styles.mapHintContainer} pointerEvents="none">
                        <View
                          style={[
                            styles.mapHintBadge,
                            { backgroundColor: colors.bgCard, borderColor: colors.border },
                          ]}
                        >
                          <Ionicons name="move" size={12} color={colors.textPrimary} />
                          <Text style={[styles.mapHintText, { color: colors.textPrimary }]}>
                            {t('tapToUseLocation')}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.recenterBtn,
                          { backgroundColor: colors.bgCard + 'F0', borderColor: colors.border },
                        ]}
                        onPress={async () => {
                          const loc = await getCurrentLocation(false);
                          if (!loc) return;
                          handleMapPinChange(loc.coords);
                          mapRef.current?.animateToRegion(
                            {
                              latitude: loc.coords.latitude,
                              longitude: loc.coords.longitude,
                              latitudeDelta: 0.005,
                              longitudeDelta: 0.005,
                            },
                            500,
                          );
                        }}
                      >
                        <Ionicons name="locate" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <View
                      style={[
                        styles.addressCard,
                        {
                          backgroundColor: colors.bgCard,
                          borderColor: colors.accent + '44',
                          backgroundColor: colors.accent + '0A',
                        },
                      ]}
                    >
                      <View style={styles.addressLeft}>
                        <Ionicons name="location" size={20} color={colors.accent} />
                        <View style={{ flex: 1 }}>
                          {reversingGeocode ? (
                            <View
                              style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}
                            >
                              <ActivityIndicator size="small" color={colors.accent} />
                              <Text style={[styles.addressText, { color: colors.textPrimary }]}>
                                {t('gettingLocation')}
                              </Text>
                            </View>
                          ) : (
                            <>
                              <Text style={[styles.addressText, { color: colors.textPrimary }]}>
                                {location.address}
                              </Text>
                              <Text style={[styles.coordsText, { color: colors.textMuted }]}>
                                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setLocation(null);
                          setShowMap(false);
                          setSearchQuery('');
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginVertical: verticalScale(16),
                  }}
                >
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  <Text
                    style={{
                      marginHorizontal: scale(10),
                      color: colors.textMuted,
                      fontSize: rf(12),
                      fontWeight: '600',
                    }}
                  >
                    OR WRITE IT
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>

                <InputField
                  label="Manual Address"
                  placeholder="e.g. Near Barangay Hall..."
                  value={manualAddress}
                  onChangeText={(text) => {
                    setManualAddress(text);
                    if (text && location) {
                      setLocation(null);
                      setShowMap(false);
                    }
                  }}
                  multiline
                  numberOfLines={2}
                  style={{ minHeight: verticalScale(60) }}
                />
              </View>



              <PrimaryButton
                title={loading ? 'Submitting...' : 'Submit Concern'}
                onPress={handleSubmit}
                loading={loading}
                style={{ marginTop: verticalScale(16) }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: rf(16), fontWeight: '700' },

  header: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(16),
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressCircle: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(4),
  },
  progressCircleText: {
    fontSize: rf(12),
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: rf(10),
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: scale(4),
    marginBottom: verticalScale(14),
  },

  scroll: { paddingHorizontal: scale(20), paddingBottom: verticalScale(40) },
  stepContainer: { flex: 1 },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  backBtn: {
    padding: scale(4),
    marginLeft: -scale(4),
  },
  stepHeader: { fontSize: rf(22), fontWeight: '800', marginBottom: verticalScale(6) },
  stepSub: { fontSize: rf(13), marginBottom: verticalScale(24) },

  divider: { height: 1, marginVertical: verticalScale(24) },
  label: {
    fontSize: rf(13),
    fontWeight: '700',
    marginBottom: verticalScale(10),
    letterSpacing: 0.3,
  },
  errorText: { fontSize: rf(12), fontWeight: '500' },
  fieldGroup: { marginBottom: verticalScale(24) },

  // Step 1: Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: scale(12),
  },
  catCard: {
    width: '31%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(16),
    borderWidth: 2,
    padding: scale(4),
  },
  catCardText: {
    fontSize: rf(11),
    fontWeight: '600',
    textAlign: 'center',
  },

  // Priority row
  priorityRow: { flexDirection: 'row', gap: scale(10) },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    borderWidth: 2,
  },
  priorityDot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  priorityText: { fontSize: rf(13), fontWeight: '700' },
  priorityHintBox: {
    marginTop: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
    padding: scale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
  },
  priorityHintText: { fontSize: rf(12), flex: 1, lineHeight: rf(18) },

  // Step 3: Photo & Location
  photoBox: {
    height: verticalScale(160),
    borderRadius: moderateScale(16),
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoBoxText: { fontSize: rf(13), marginTop: verticalScale(8), fontWeight: '500' },
  removePhoto: {
    position: 'absolute',
    top: verticalScale(8),
    right: scale(8),
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },

  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: moderateScale(14),
    padding: scale(16),
    borderWidth: 1,
  },
  locationText: { flex: 1, fontSize: rf(13), fontWeight: '500' },

  mapSection: { gap: verticalScale(12) },
  mapContainer: {
    height: verticalScale(220),
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    borderWidth: 1,
  },
  mapView: { flex: 1 },
  mapPin: { alignItems: 'center', justifyContent: 'center' },
  mapHintContainer: { position: 'absolute', top: verticalScale(10), alignSelf: 'center' },
  mapHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderWidth: 1,
  },
  mapHintText: { fontSize: rf(11), fontWeight: '600' },
  recenterBtn: {
    position: 'absolute',
    bottom: verticalScale(12),
    right: scale(12),
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: moderateScale(14),
    padding: scale(14),
    borderWidth: 1,
  },
  addressLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  addressText: { fontSize: rf(13), fontWeight: '600', lineHeight: rf(18) },
  coordsText: { fontSize: rf(11), marginTop: verticalScale(4) },

  // Review Summary
  reviewCard: {
    padding: scale(16),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
  },
  reviewTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    marginBottom: verticalScale(12),
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(6),
  },
  reviewLabel: {
    fontSize: rf(12),
    width: scale(70),
  },
  reviewValue: {
    fontSize: rf(12),
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // ── Success ──
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(32),
  },
  successCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: moderateScale(28),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(24),
  },
  successTitle: {
    fontSize: rf(24),
    fontWeight: '900',
    marginBottom: verticalScale(10),
    textAlign: 'center',
  },
  successMsg: {
    fontSize: rf(15),
    textAlign: 'center',
    lineHeight: rf(22),
    marginBottom: verticalScale(32),
  },
  successBtn: {
    width: '100%',
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(16),
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  successBtnText: { color: '#fff', fontSize: rf(16), fontWeight: '700' },
  successSecBtn: { paddingVertical: verticalScale(12) },
  successSecBtnText: { fontSize: rf(14) },

  // Smart Chips
  smartChipHeader: { fontSize: rf(12), fontWeight: '600', marginBottom: verticalScale(8) },
  chipScrollView: { marginBottom: verticalScale(16), marginHorizontal: scale(-16) },
  smartChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    marginRight: scale(10),
  },
  smartChipText: { fontSize: rf(13), fontWeight: '600' },

  // AI Suggestion button
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: verticalScale(16),
  },
  suggestBtnText: { fontSize: rf(14), fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: scale(20),
  },
  modalContent: {
    borderRadius: moderateScale(16),
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  modalTitle: { fontSize: rf(18), fontWeight: '800' },
  modalLabel: { fontSize: rf(13), fontWeight: '600', marginBottom: verticalScale(6) },
  modalBox: {
    padding: scale(12),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    marginBottom: verticalScale(16),
  },
  modalText: { fontSize: rf(14), lineHeight: rf(20) },
});
