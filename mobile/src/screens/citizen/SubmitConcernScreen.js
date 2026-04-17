import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  KeyboardAvoidingView, Platform, Alert, StyleSheet,
} from 'react-native';
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

  const [form, setForm] = useState({
    title: '', description: '', category: '', priority: 'Medium',
  });
  const [imageUri, setImageUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const getLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow location access.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const [addr] = await Location.reverseGeocodeAsync(loc.coords);
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: addr
          ? `${addr.street || ''} ${addr.district || ''}, ${addr.city || ''}`.trim()
          : `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`,
      });
    } catch (err) {
      Alert.alert(t('error'), 'Could not get location.');
    } finally {
      setLoadingLocation(false);
    }
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
        <TouchableOpacity style={styles.successSecBtn} onPress={() => { setSubmitted(false); setForm({ title: '', description: '', category: '', priority: 'Medium' }); setImageUri(null); setLocation(null); }}>
          <Text style={styles.successSecBtnText}>Report another</Text>
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

        {/* Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('location')}</Text>
          <TouchableOpacity
            style={[styles.locationBtn, location && styles.locationBtnActive]}
            onPress={getLocation}
            disabled={loadingLocation}
          >
            <Ionicons
              name={location ? 'location' : 'location-outline'}
              size={20}
              color={location ? COLORS.accent : COLORS.textMuted}
            />
            <Text style={[styles.locationText, location && styles.locationTextActive]}>
              {loadingLocation
                ? t('gettingLocation')
                : location
                  ? location.address
                  : t('tapToUseLocation')}
            </Text>
            {location && (
              <TouchableOpacity onPress={() => setLocation(null)}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
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

  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(10),
    backgroundColor: COLORS.bgCard, borderRadius: moderateScale(12), padding: scale(14),
    borderWidth: 1, borderColor: COLORS.border,
  },
  locationBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '11' },
  locationText: { flex: 1, color: COLORS.textMuted, fontSize: rf(13) },
  locationTextActive: { color: COLORS.accent },

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