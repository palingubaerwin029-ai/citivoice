import React from 'react';
import { View, ScrollView, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, VERIFICATION_STATUS, resolveImageUrl } from '../../context/AuthContext';
import { RADIUS, SHADOWS } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { scale, verticalScale, rf } from '../../utils/responsive';

export default function VerifyIdentityScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, logout } = useAuth();

  const currentStatus = user?.verification_status;
  const isRejected = currentStatus === VERIFICATION_STATUS.REJECTED;

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

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
              backgroundColor: isRejected
                ? colors.statusRejected + '1F'
                : colors.statusPending + '1F',
              borderColor: isRejected ? colors.statusRejected + '4D' : colors.statusPending + '4D',
            },
          ]}
        >
          <Text style={{ fontSize: rf(36) }}>{isRejected ? '❌' : '⏳'}</Text>
        </View>
        <Text style={[S.statusTitle, { color: colors.textPrimary }]}>
          {isRejected ? 'Verification Rejected' : 'Under Review'}
        </Text>
        <Text style={[S.statusMessage, { color: colors.textSecondary }]}>
          {isRejected
            ? 'Unfortunately, your ID verification was rejected. Please contact support or try registering again.'
            : "Your account and ID have been submitted and are being reviewed by the administrator. You'll be notified once approved."}
        </Text>

        <View
          style={[S.pendingInfo, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}
        >
          <InfoRow icon="person-outline" label="Name" value={user?.name} colors={colors} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email} colors={colors} />
          <InfoRow
            icon="card-outline"
            label="ID Type"
            value={user?.id_type || '—'}
            colors={colors}
          />
          <InfoRow
            icon="shield-half-outline"
            label="Status"
            value={isRejected ? 'Rejected' : 'Pending Review'}
            valueColor={isRejected ? colors.statusRejected : colors.statusPending}
            colors={colors}
          />
        </View>

        {user?.id_image_url && (
          <View style={{ width: '100%', marginBottom: verticalScale(20) }}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: rf(11),
                fontWeight: '700',
                marginBottom: verticalScale(8),
                letterSpacing: 0.5,
              }}
            >
              SUBMITTED ID
            </Text>
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
          <Text style={[S.logoutText, { color: colors.textMuted }]}>Log Out</Text>
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
  statusContainer: {
    flexGrow: 1,
    padding: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: scale(7),
    paddingVertical: verticalScale(10),
  },
  logoutText: { fontSize: rf(15), fontWeight: '600' },
});
