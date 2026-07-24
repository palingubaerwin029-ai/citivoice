import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { rf, scale, verticalScale } from '../../utils/responsive';
import { RADIUS } from '../../utils/theme';

export default function TermsAndPolicyScreen({ navigation }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }} edges={['top']}>
      <View style={[S.header, { borderBottomColor: colors.border, backgroundColor: colors.bgCard }]}>
        <TouchableOpacity
          style={[S.backBtn, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.textPrimary }]}>Terms & Policy</Text>
        <View style={{ width: scale(36) }} />
      </View>
      
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[S.sectionTitle, { color: colors.primaryLight }]}>Terms of Service</Text>
        <Text style={[S.paragraph, { color: colors.textSecondary }]}>
          Welcome to CitiVoice. By using our application, you agree to these terms. Please read them carefully.
        </Text>
        <Text style={[S.paragraph, { color: colors.textSecondary }]}>
          1. Use of the App: You must provide accurate information when registering and using the application. You agree to use the app for its intended purpose of reporting concerns and engaging with the community responsibly.
        </Text>
        <Text style={[S.paragraph, { color: colors.textSecondary }]}>
          2. Content: The content you submit must be true, accurate, and not violate any local laws or regulations. We reserve the right to remove inappropriate content.
        </Text>
        <Text style={[S.paragraph, { color: colors.textSecondary }]}>
          3. Termination: We may suspend or terminate your access to the app if you violate these terms.
        </Text>
        
        <View style={[S.divider, { backgroundColor: colors.border }]} />
        
        <Text style={[S.sectionTitle, { color: colors.primaryLight }]}>Privacy Policy</Text>
        <Text style={[S.paragraph, { color: colors.textSecondary }]}>
          Your privacy is important to us. This policy explains how we collect, use, and protect your information.
        </Text>
        <Text style={[S.paragraph, { color: colors.textSecondary }]}>
          1. Data Collection: We collect information you provide directly, such as your name, email, phone number, address (barangay), and identification documents for verification purposes.
        </Text>
        <Text style={[S.paragraph, { color: colors.textSecondary }]}>
          2. Data Use: The data we collect is used to verify your identity, process your concerns, and improve the app's services. We do not sell your personal data to third parties.
        </Text>
        <Text style={[S.paragraph, { color: colors.textSecondary }]}>
          3. Data Security: We implement appropriate security measures to protect your personal information against unauthorized access, alteration, or destruction.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
  },
  backBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: rf(16),
    fontWeight: '700',
  },
  scroll: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    marginBottom: verticalScale(12),
  },
  paragraph: {
    fontSize: rf(14),
    lineHeight: rf(22),
    marginBottom: verticalScale(12),
  },
  divider: {
    height: 1,
    marginVertical: verticalScale(20),
  }
});
