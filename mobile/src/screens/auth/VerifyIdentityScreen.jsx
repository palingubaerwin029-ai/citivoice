import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, VERIFICATION_STATUS, resolveImageUrl } from '../../context/AuthContext';
import { RADIUS, SHADOWS } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf } from '../../utils/responsive';
import { InputField, PrimaryButton } from '../../components/UI';
import { useImagePicker } from '../../hooks/useImagePicker';
import { ConcernService } from '../../services/concernService';
import { useLanguage } from '../../context/LanguageContext';

const ID_TYPES = [
  'PhilSys (National ID)',
  "Driver's License",
  'Philippine Passport',
  'SSS ID',
  'GSIS ID',
  'Postal ID',
  "Voter's ID",
  'PRC ID',
  'Barangay ID',
];

export default function VerifyIdentityScreen() {
  const { colors } = useTheme();
  const { user, logout, submitVerification } = useAuth();
  const { t } = useLanguage();

  const currentStatus = user?.verification_status;
  const isRejected = currentStatus === VERIFICATION_STATUS.REJECTED;
  const isUnverified = currentStatus === VERIFICATION_STATUS.UNVERIFIED || !currentStatus;

  // Form State
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idImage, setIdImage] = useState(null);
  const [showIdPicker, setShowIdPicker] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const { pickImage: launchImagePicker, takePhoto: launchCamera } = useImagePicker();

  const pickPhoto = async () => {
    const uri = await launchImagePicker();
    if (uri) setIdImage(uri);
  };

  const takePhoto = async () => {
    const uri = await launchCamera();
    if (uri) setIdImage(uri);
  };

  const validate = () => {
    const e = {};
    if (!idType) e.idType = 'Please select an ID type';
    if (!idNumber.trim()) e.idNumber = 'Enter your ID number';
    if (!idImage) e.idImage = 'Please upload a photo of your ID';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const idImageUrl = await ConcernService.uploadImage(idImage);
      await submitVerification(user.id, { idType, idNumber, idImageUrl });
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit verification. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // ── Render Form for Unverified or Rejected ─────────────────────────────────
  if (isUnverified || isRejected) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        style={{ flex: 1, backgroundColor: colors.bgDark }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={S.formContainer}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Description */}
          <View style={S.header}>
            <View
              style={[
                S.iconCircle,
                {
                  backgroundColor: isRejected ? colors.statusRejected + '18' : colors.primary + '18',
                  borderColor: isRejected ? colors.statusRejected + '44' : colors.primary + '44',
                },
              ]}
            >
              <Ionicons
                name={isRejected ? 'close-circle-outline' : 'shield-checkmark-outline'}
                size={32}
                color={isRejected ? colors.statusRejected : colors.primary}
              />
            </View>
            <Text style={[S.title, { color: colors.textPrimary }]}>
              {isRejected ? t('verificationRejected') : t('verificationRequired')}
            </Text>
            <Text style={[S.subtitle, { color: colors.textSecondary }]}>
              {isRejected
                ? t('verificationRejectedSubtitle')
                : t('verificationRequiredSubtitle')}
            </Text>
          </View>

          {/* Rejection Reason Notice */}
          {isRejected && user?.rejection_reason && (
            <View
              style={[
                S.noticeBox,
                {
                  backgroundColor: colors.statusRejected + '14',
                  borderColor: colors.statusRejected + '33',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.statusRejected} />
              <View style={{ flex: 1 }}>
                <Text style={[S.noticeTitle, { color: colors.statusRejected }]}>{t('rejectionReason')}</Text>
                <Text style={[S.noticeText, { color: colors.textSecondary }]}>
                  {user.rejection_reason}
                </Text>
              </View>
            </View>
          )}

          {/* Error Banner */}
          {submitError && (
            <View
              style={[
                S.noticeBox,
                {
                  backgroundColor: colors.danger + '14',
                  borderColor: colors.danger + '33',
                  alignItems: 'center',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[S.noticeTitle, { color: colors.danger, marginBottom: 0 }]}>
                  {submitError}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSubmitError(null)}>
                <Ionicons name="close" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Verification Form Card */}
          <View style={[S.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {/* ID Type picker */}
            <View style={{ marginBottom: 14 }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>{`${t('idType').toUpperCase()} *`}</Text>
              <TouchableOpacity
                style={[
                  S.picker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  formErrors.idType && { borderColor: colors.danger },
                ]}
                onPress={() => setShowIdPicker((p) => !p)}
              >
                <Ionicons name="card-outline" size={16} color={colors.textMuted} />
                <Text
                  style={[
                    S.pickerText,
                    { color: colors.textPrimary },
                    !idType && { color: colors.textMuted },
                  ]}
                >
                  {idType || t('selectIdType')}
                </Text>
                <Ionicons
                  name={showIdPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {formErrors.idType && (
                <View style={S.errRow}>
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{formErrors.idType}</Text>
                </View>
              )}
              {showIdPicker && (
                <View
                  style={[
                    S.dropdown,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  ]}
                >
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {ID_TYPES.map((tItem) => (
                      <TouchableOpacity
                        key={tItem}
                        style={[
                          S.dropdownItem,
                          { borderBottomColor: colors.border },
                          idType === tItem && { backgroundColor: colors.primary + '18' },
                        ]}
                        onPress={() => {
                          setIdType(tItem);
                          setShowIdPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            S.dropdownText,
                            { color: colors.textSecondary },
                            idType === tItem && {
                              color: colors.primaryLight,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {tItem}
                        </Text>
                        {idType === tItem && (
                          <Ionicons name="checkmark-circle" size={16} color={colors.primaryLight} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ID Number Input */}
            <InputField
              label={`${t('idNumber').toUpperCase()} *`}
              value={idNumber}
              onChangeText={(v) => {
                const cleaned = v.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                let formatted = '';
                for (let i = 0; i < cleaned.length; i++) {
                  if (i > 0 && i % 4 === 0) formatted += '-';
                  formatted += cleaned[i];
                }
                setIdNumber(formatted);
              }}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={25}
              leftIcon="key-outline"
              error={formErrors.idNumber}
            />

            {/* ID Photo Picker */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>{`${t('idPhoto').toUpperCase()} *`}</Text>
              {idImage ? (
                <View style={{ width: '100%', marginBottom: 16 }}>
                  <Image
                    source={{ uri: idImage }}
                    style={{ width: '100%', height: 200, borderRadius: 16 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity style={S.retakeBadge} onPress={() => setIdImage(null)}>
                    <Ionicons name="refresh-outline" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{t('retake')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    S.photoBox,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                    formErrors.idImage && { borderColor: colors.danger },
                  ]}
                >
                  <Ionicons
                    name="id-card-outline"
                    size={rf(40)}
                    color={colors.textSecondary}
                    style={{ marginBottom: verticalScale(10), opacity: 0.6 }}
                  />
                  <Text style={[S.photoBoxTitle, { color: colors.textSecondary }]}>
                    {t('uploadIdPhoto')}
                  </Text>
                  <Text style={[S.photoBoxSub, { color: colors.textMuted }]}>
                    {t('photoClearNotice')}
                  </Text>
                  <View style={S.photoActions}>
                    <TouchableOpacity
                      style={[
                        S.photoBtn,
                        {
                          backgroundColor: colors.primary + '18',
                          borderColor: colors.primary + '44',
                        },
                      ]}
                      onPress={pickPhoto}
                    >
                      <Ionicons name="images-outline" size={18} color={colors.primaryLight} />
                      <Text style={[S.photoBtnText, { color: colors.primaryLight }]}>{t('gallery')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        S.photoBtn,
                        {
                          backgroundColor: colors.primary + '18',
                          borderColor: colors.primary + '44',
                        },
                      ]}
                      onPress={takePhoto}
                    >
                      <Ionicons name="camera-outline" size={18} color={colors.primaryLight} />
                      <Text style={[S.photoBtnText, { color: colors.primaryLight }]}>{t('camera')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {formErrors.idImage && (
                <View style={S.errRow}>
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{formErrors.idImage}</Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <PrimaryButton
              title={t('submitForVerification')}
              onPress={handleSubmit}
              loading={submitLoading}
              style={{ marginTop: 8 }}
            />

            {/* Logout Option */}
            <TouchableOpacity style={S.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
              <Text style={[S.logoutText, { color: colors.textMuted }]}>{t('signOut')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Render Static "Under Review" Page for Pending ──────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgDark }}
      contentContainerStyle={S.statusContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[S.statusCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View
          style={[
            S.statusIcon,
            {
              backgroundColor: colors.statusPending + '1F',
              borderColor: colors.statusPending + '4D',
            },
          ]}
        >
          <Text style={{ fontSize: rf(36) }}>⏳</Text>
        </View>
        <Text style={[S.statusTitle, { color: colors.textPrimary }]}>{t('underReview')}</Text>
        <Text style={[S.statusMessage, { color: colors.textSecondary }]}>
          {t('underReviewMsg')}
        </Text>

        <View
          style={[S.pendingInfo, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}
        >
          <InfoRow icon="person-outline" label={t('fullName')} value={user?.name} colors={colors} />
          <InfoRow icon="mail-outline" label={t('email')} value={user?.email} colors={colors} />
          <InfoRow
            icon="card-outline"
            label={t('idType')}
            value={user?.id_type || '—'}
            colors={colors}
          />
          <InfoRow
            icon="shield-half-outline"
            label={t('priority') ? 'Status' : 'Status'}
            value={t('pendingReview')}
            valueColor={colors.statusPending}
            colors={colors}
          />
        </View>

        {user?.id_image_url && (
          <View style={{ width: '100%', marginBottom: verticalScale(20) }}>
            <Text style={[S.fieldLabel, { color: colors.textMuted }]}>{`${t('submittedId').toUpperCase()}`}</Text>
            <Image
              source={{ uri: resolveImageUrl(user.id_image_url) }}
              style={{
                width: '100%',
                height: verticalScale(160),
                borderRadius: RADIUS.md,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              resizeMode="cover"
            />
          </View>
        )}

        <TouchableOpacity style={S.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
          <Text style={[S.logoutText, { color: colors.textMuted }]}>{t('signOut')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, valueColor, colors }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: verticalScale(10),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
        <Ionicons name={icon} size={15} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, fontSize: rf(13) }}>{label}</Text>
      </View>
      <Text
        style={{
          color: valueColor || colors.textPrimary,
          fontSize: rf(13),
          fontWeight: '600',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  formContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(40),
  },
  statusContainer: {
    flexGrow: 1,
    padding: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  iconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: rf(22),
    fontWeight: '800',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: rf(13.5),
    textAlign: 'center',
    lineHeight: rf(20),
    paddingHorizontal: scale(10),
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
    borderRadius: RADIUS.lg,
    padding: scale(14),
    borderWidth: 1,
    marginBottom: verticalScale(20),
  },
  noticeTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    marginBottom: verticalScale(4),
  },
  noticeText: {
    fontSize: rf(12),
    lineHeight: rf(18),
  },
  card: {
    borderRadius: RADIUS['2xl'],
    padding: scale(24),
    borderWidth: 1,
    ...SHADOWS.card,
  },
  fieldLabel: {
    fontSize: rf(10),
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: verticalScale(8),
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    borderWidth: 1,
  },
  pickerText: {
    flex: 1,
    fontSize: rf(14),
  },
  dropdown: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: verticalScale(4),
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(14),
    borderBottomWidth: 1,
  },
  dropdownText: {
    fontSize: rf(14),
  },
  errRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    marginTop: verticalScale(5),
  },
  retakeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoBox: {
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderStyle: 'solid',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: scale(28),
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  photoBoxTitle: {
    fontSize: rf(14),
    fontWeight: '600',
    marginBottom: verticalScale(4),
  },
  photoBoxSub: {
    fontSize: rf(12),
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  photoBtnText: {
    fontSize: rf(13),
    fontWeight: '600',
  },
  statusCard: {
    width: '100%',
    borderRadius: RADIUS['2xl'],
    padding: scale(24),
    borderWidth: 1,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  statusIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
  },
  statusTitle: {
    fontSize: rf(20),
    fontWeight: '800',
    marginBottom: verticalScale(10),
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: rf(14),
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: verticalScale(20),
  },
  pendingInfo: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: scale(14),
    marginBottom: verticalScale(20),
    borderWidth: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(7),
    marginTop: verticalScale(16),
    paddingVertical: verticalScale(10),
  },
  logoutText: {
    fontSize: rf(15),
    fontWeight: '600',
  },
});
