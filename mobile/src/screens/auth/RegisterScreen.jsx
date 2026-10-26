import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Image,
  Animated,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { InputField, PrimaryButton } from '../../components/UI';
import { RADIUS, SHADOWS } from '../../utils/theme';
import { useTheme } from '../../context/ThemeContext';
import { mobileApi } from '../../context/AuthContext';
import { scale, verticalScale, rf } from '../../utils/responsive';
import { useImagePicker } from '../../hooks/useImagePicker';
import { ConcernService } from '../../services/concernService';
import { getGoogleIdToken } from '../../services/googleAuth';

export const DEFAULT_BARANGAYS = [
  'Bantayan', 'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4',
  'Barangay 5', 'Barangay 6', 'Barangay 7', 'Barangay 8', 'Barangay 9',
  'Binicuil', 'Camansi', 'Camingawan', 'Camugao', 'Carol-an', 'Daan Banua',
  'Hilamonan', 'Inapoy', 'Linao', 'Locotan', 'Magballo', 'Oringao',
  'Orong', 'Pinaguinpinan', 'Salong', 'Tabugon', 'Tagoc', 'Tagukon',
  'Talubangi', 'Tampalon', 'Tan-Awan', 'Tapi',
];

export const ID_CONFIGS = {
  'PhilSys (National ID)': {
    placeholder: '1234-5678-9012-3456',
    hint: '16 digits (e.g. 1234-5678-9012-3456)',
    keyboardType: 'numeric',
    maxLength: 19,
    format: (v) => {
      const clean = v.replace(/\D/g, '').slice(0, 16);
      return clean.match(/.{1,4}/g)?.join('-') || clean;
    },
    isValid: (v) => v.replace(/\D/g, '').length === 16,
  },
  "Driver's License": {
    placeholder: 'A01-23-456789',
    hint: '1 letter + 8 digits (e.g. A01-23-456789)',
    keyboardType: 'default',
    maxLength: 13,
    format: (v) => {
      const clean = v.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 11);
      let res = '';
      if (clean.length > 0) res += clean.slice(0, 3);
      if (clean.length > 3) res += '-' + clean.slice(3, 5);
      if (clean.length > 5) res += '-' + clean.slice(5, 11);
      return res;
    },
    isValid: (v) => v.replace(/[^A-Z0-9]/g, '').length >= 9,
  },
  'Philippine Passport': {
    placeholder: 'P1234567A',
    hint: '1-2 letters + 7 digits (e.g. P1234567A)',
    keyboardType: 'default',
    maxLength: 9,
    format: (v) => v.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 9),
    isValid: (v) => v.replace(/[^A-Z0-9]/g, '').length >= 8,
  },
  'SSS ID': {
    placeholder: '01-2345678-9',
    hint: '10 digits (e.g. 01-2345678-9)',
    keyboardType: 'numeric',
    maxLength: 12,
    format: (v) => {
      const clean = v.replace(/\D/g, '').slice(0, 10);
      let res = '';
      if (clean.length > 0) res += clean.slice(0, 2);
      if (clean.length > 2) res += '-' + clean.slice(2, 9);
      if (clean.length > 9) res += '-' + clean.slice(9, 10);
      return res;
    },
    isValid: (v) => v.replace(/\D/g, '').length === 10,
  },
  'GSIS ID': {
    placeholder: '0111-1234567-8',
    hint: 'CRN or 11-12 digits (e.g. 0111-1234567-8)',
    keyboardType: 'numeric',
    maxLength: 14,
    format: (v) => {
      const clean = v.replace(/\D/g, '').slice(0, 12);
      let res = '';
      if (clean.length > 0) res += clean.slice(0, 4);
      if (clean.length > 4) res += '-' + clean.slice(4, 11);
      if (clean.length > 11) res += '-' + clean.slice(11, 12);
      return res;
    },
    isValid: (v) => v.replace(/\D/g, '').length >= 10,
  },
  'PhilHealth ID': {
    placeholder: '12-345678901-2',
    hint: '12 digits (e.g. 12-345678901-2)',
    keyboardType: 'numeric',
    maxLength: 14,
    format: (v) => {
      const clean = v.replace(/\D/g, '').slice(0, 12);
      let res = '';
      if (clean.length > 0) res += clean.slice(0, 2);
      if (clean.length > 2) res += '-' + clean.slice(2, 11);
      if (clean.length > 11) res += '-' + clean.slice(11, 12);
      return res;
    },
    isValid: (v) => v.replace(/\D/g, '').length === 12,
  },
  'TIN ID': {
    placeholder: '123-456-789-000',
    hint: '9 to 12 digits (e.g. 123-456-789-000)',
    keyboardType: 'numeric',
    maxLength: 15,
    format: (v) => {
      const clean = v.replace(/\D/g, '').slice(0, 12);
      return clean.match(/.{1,3}/g)?.join('-') || clean;
    },
    isValid: (v) => v.replace(/\D/g, '').length >= 9,
  },
  'Postal ID': {
    placeholder: '1234-5678-9012',
    hint: '12 digits (e.g. 1234-5678-9012)',
    keyboardType: 'numeric',
    maxLength: 14,
    format: (v) => {
      const clean = v.replace(/\D/g, '').slice(0, 12);
      return clean.match(/.{1,4}/g)?.join('-') || clean;
    },
    isValid: (v) => v.replace(/\D/g, '').length >= 10,
  },
  "Voter's ID": {
    placeholder: '1234-5678A-B12345',
    hint: 'Voter Identification Number (VIN)',
    keyboardType: 'default',
    maxLength: 20,
    format: (v) => v.replace(/[^A-Z0-9-]/gi, '').toUpperCase().slice(0, 20),
    isValid: (v) => v.replace(/[^A-Z0-9]/g, '').length >= 10,
  },
  'PRC ID': {
    placeholder: '1234567',
    hint: '7 digits (e.g. 1234567)',
    keyboardType: 'numeric',
    maxLength: 7,
    format: (v) => v.replace(/\D/g, '').slice(0, 7),
    isValid: (v) => v.replace(/\D/g, '').length === 7,
  },
  'Barangay ID': {
    placeholder: 'BRGY-12345',
    hint: 'Barangay resident ID number',
    keyboardType: 'default',
    maxLength: 20,
    format: (v) => v.toUpperCase().slice(0, 20),
    isValid: (v) => v.trim().length >= 4,
  },
  'Senior Citizen / PWD ID': {
    placeholder: 'OSCA-12345',
    hint: 'Control/ID number',
    keyboardType: 'default',
    maxLength: 20,
    format: (v) => v.toUpperCase().slice(0, 20),
    isValid: (v) => v.trim().length >= 4,
  },
};

export const DEFAULT_ID_CONFIG = {
  placeholder: 'Enter ID Number',
  hint: 'Official government ID number',
  keyboardType: 'default',
  maxLength: 25,
  format: (v) => v.toUpperCase().slice(0, 25),
  isValid: (v) => v.trim().length >= 4,
};

export const ID_TYPES = Object.keys(ID_CONFIGS);

export default function RegisterScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { register, loginWithGoogle } = useAuth();
  const { t, language, changeLanguage } = useLanguage();

  // Pre-filled when redirected from "Continue with Google" with an unregistered Gmail
  const prefill = route?.params || {};
  const isGooglePreVerified = Boolean(prefill?.isGoogleVerified || (prefill?.email && prefill?.name));
  const [isGoogleVerified, setIsGoogleVerified] = useState(isGooglePreVerified);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [form, setForm] = useState({
    name: prefill.name || '',
    email: prefill.email || '',
    password: '',
    phone: '',
    barangay: '',
    idType: '',
    idNumber: '',
    idImage: null,
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showIdPicker, setShowIdPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [uploadedIdUrl, setUploadedIdUrl] = useState(null);
  const [scannedImageUri, setScannedImageUri] = useState(null);
  const [pwFocused, setPwFocused] = useState(false);
  const strengthAnim = useRef(new Animated.Value(0)).current;
  const [availableBarangays, setAvailableBarangays] = useState(DEFAULT_BARANGAYS);
  const [barangaySearch, setBarangaySearch] = useState('');

  // Email verification state
  const [emailVerified, setEmailVerified] = useState(isGooglePreVerified);
  const [verificationToken, setVerificationToken] = useState(isGooglePreVerified ? 'google_verified' : null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpError, setOtpError] = useState(null);
  const [otpSuccess, setOtpSuccess] = useState(null);

  // Cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Sync route params when navigated with prefill data
  useEffect(() => {
    if (route?.params?.email) {
      setForm((prev) => ({
        ...prev,
        email: route.params.email,
        name: route.params.name || prev.name,
      }));
      if (route.params.isGoogleVerified) {
        setIsGoogleVerified(true);
        setEmailVerified(true);
        setVerificationToken(route.params.verificationToken || 'google_verified');
      }
    }
  }, [route?.params]);

  const handleGooglePreVerify = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) {
        setGoogleLoading(false);
        return;
      }
      try {
        await loginWithGoogle(idToken);
        navigation.navigate('Login');
      } catch (err) {
        if (err?.code === 'auth/not-registered' || err?.data?.error === 'auth/not-registered') {
          const gEmail = err?.data?.email || '';
          const gName = err?.data?.name || '';
          const vToken = err?.data?.verificationToken || 'google_verified';
          setForm((prev) => ({
            ...prev,
            email: gEmail || prev.email,
            name: prev.name || gName,
          }));
          setIsGoogleVerified(true);
          setEmailVerified(true);
          setVerificationToken(vToken);
          setOtpSent(false);
          setOtpCode('');
          setOtpError(null);
          setOtpSuccess(null);
          setErrors((prev) => {
            const next = { ...prev };
            delete next.email;
            if (gName) delete next.name;
            return next;
          });
          Alert.alert(
            'Google Email Verified',
            `Signed in with ${gEmail}. Email OTP verification is skipped!`
          );
          return;
        }
        setError(err?.data?.message || err?.message || 'Google verification failed.');
      }
    } catch (err) {
      setError(err?.message || 'Google verification failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const cleanEmail = form.email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrors((prev) => ({ ...prev, email: t('required') }));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setErrors((prev) => ({ ...prev, email: t('invalidEmail') }));
      return;
    }
    if (!cleanEmail.endsWith('@gmail.com')) {
      setErrors((prev) => ({ ...prev, email: 'Email must be a Gmail address (@gmail.com)' }));
      return;
    }

    setSendingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await mobileApi.post('/auth/send-registration-otp', { email: cleanEmail });
      setOtpSent(true);
      setOtpCooldown(60);
      setOtpCode('');
      setOtpSuccess(res?.message || `Verification code sent to ${cleanEmail}. Please check your Inbox and Spam folder.`);
    } catch (err) {
      const msg = err?.data?.message || err?.message || 'Failed to send verification code.';
      setOtpError(msg);
      setErrors((prev) => ({ ...prev, email: msg }));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit code sent to your email.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await mobileApi.post('/auth/verify-registration-otp', {
        email: form.email.trim().toLowerCase(),
        otp: otpCode.trim(),
      });
      setEmailVerified(true);
      setVerificationToken(res.verificationToken || 'verified');
      setOtpSent(false);
      setOtpSuccess(null);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    } catch (err) {
      const msg = err?.data?.error || err?.data?.message || err?.message || 'Invalid or expired code.';
      setOtpError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.trim().toLowerCase();
    if (!q) return availableBarangays;
    const starts = availableBarangays.filter((b) => b.toLowerCase().startsWith(q));
    const contains = availableBarangays.filter(
      (b) => !b.toLowerCase().startsWith(q) && b.toLowerCase().includes(q),
    );
    return [...starts, ...contains];
  }, [availableBarangays, barangaySearch]);

  useEffect(() => {
    let isMounted = true;
    const fetchBarangays = async () => {
      try {
        const rows = await mobileApi.get('/barangays');
        if (isMounted && Array.isArray(rows) && rows.length > 0) {
          const list = rows.map((r) => r.name);
          list.sort((a, b) => a.localeCompare(b));
          setAvailableBarangays(list);
        }
      } catch (err) {
        console.log('Error fetching barangays', err);
      }
    };
    fetchBarangays();
    return () => {
      isMounted = false;
    };
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const activeIdConfig = useMemo(() => ID_CONFIGS[form.idType] || DEFAULT_ID_CONFIG, [form.idType]);

  const [aiVerifying, setAiVerifying] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const { pickImage: launchImagePicker, takePhoto: launchCamera } = useImagePicker();

  const scanIdAI = async (imageUri, currentName = form.name, currentIdNumber = form.idNumber, currentIdType = form.idType) => {
    const targetUri = imageUri || form.idImage;
    if (!targetUri) return null;
    setAiVerifying(true);
    setAiResult(null);
    try {
      let targetUploadedUrl = uploadedIdUrl;
      // If not already uploaded or image changed, upload once
      if (!targetUploadedUrl || scannedImageUri !== targetUri) {
        targetUploadedUrl = await ConcernService.uploadImage(targetUri);
        setUploadedIdUrl(targetUploadedUrl);
        setScannedImageUri(targetUri);
      }

      const res = await ConcernService.verifyIdName(
        targetUploadedUrl,
        (currentName || '').trim(),
        (currentIdNumber || '').trim(),
        (currentIdType || '').trim()
      );
      setAiResult(res);
      setAiVerifying(false);

      if (res) {
        setForm((prev) => {
          let updated = false;
          const next = { ...prev };
          const resolvedType = (res.detectedIdType && ID_CONFIGS[res.detectedIdType])
            ? res.detectedIdType
            : prev.idType;

          if (resolvedType && (!prev.idType || prev.idType !== resolvedType)) {
            next.idType = resolvedType;
            updated = true;
          }

          const cfg = ID_CONFIGS[next.idType || resolvedType] || DEFAULT_ID_CONFIG;

          if (res.extractedIdNumber && (!prev.idNumber || prev.idNumber !== cfg.format(res.extractedIdNumber))) {
            next.idNumber = cfg.format(res.extractedIdNumber);
            updated = true;
          }

          if (!prev.name && res.extractedName) {
            next.name = res.extractedName;
            updated = true;
          }

          return updated ? next : prev;
        });

        // Clear any ID validation errors since fields are now populated
        setErrors((prev) => {
          const next = { ...prev };
          if (res.detectedIdType) delete next.idType;
          if (res.extractedIdNumber) delete next.idNumber;
          if (res.extractedName) delete next.name;
          return next;
        });
      }
      return { uploadedUrl: targetUploadedUrl, res };
    } catch (err) {
      console.log('AI verification error:', err);
      setAiVerifying(false);
      return null;
    }
  };

  const pickPhoto = async () => {
    const uri = await launchImagePicker();
    if (uri) {
      set('idImage', uri);
      setUploadedIdUrl(null);
      setScannedImageUri(null);
      scanIdAI(uri);
    }
  };

  const takePhoto = async () => {
    const uri = await launchCamera();
    if (uri) {
      set('idImage', uri);
      setUploadedIdUrl(null);
      setScannedImageUri(null);
      scanIdAI(uri);
    }
  };

  // Password strength analysis
  const passwordAnalysis = useMemo(() => {
    const pw = form.password;
    const checks = {
      minLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasLower: /[a-z]/.test(pw),
      hasNumber: /\d/.test(pw),
      hasSpecial: /[@$!%*?&]/.test(pw),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    let level, label, color;
    if (passed <= 1) {
      level = 0;
      label = t('weak');
      color = colors.danger;
    } else if (passed <= 2) {
      level = 1;
      label = t('fair');
      color = colors.warning;
    } else if (passed <= 3) {
      level = 2;
      label = t('good');
      color = colors.accentWarm;
    } else if (passed <= 4) {
      level = 3;
      label = t('strong');
      color = colors.accent;
    } else {
      level = 4;
      label = t('excellent');
      color = colors.success;
    }
    return { checks, passed, level, label, color };
  }, [form.password, colors, t]);

  // Animate strength bar
  useEffect(() => {
    Animated.spring(strengthAnim, {
      toValue: form.password.length > 0 ? passwordAnalysis.passed / 5 : 0,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [passwordAnalysis.passed, form.password.length]);

  const validate = () => {
    setError(null);
    const e = {};
    const nameRegex = /^[a-zA-ZñÑ\u00C0-\u024F\s\-\.']+$/;
    if (!form.name.trim()) {
      e.name = t('required');
    } else if (form.name.trim().split(/[\s-]+/).filter(Boolean).length < 2) {
      e.name = 'Please enter your full name (First and Last name)';
    } else if (!nameRegex.test(form.name)) {
      e.name = 'Name can only contain letters (including Ñ/ñ), spaces, hyphens (-), periods, and apostrophes';
    }
    if (!form.email.trim()) e.email = t('required');
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('invalidEmail');
    else if (!form.email.trim().toLowerCase().endsWith('@gmail.com')) e.email = 'Email must be a Gmail address (@gmail.com)';
    else if (!emailVerified) e.email = 'Please verify your email address before continuing.';
    if (!form.password) e.password = t('required');
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(form.password)
    ) {
      e.password = 'Must include uppercase, lowercase, numbers, and symbols.';
    }
    if (!form.barangay) e.barangay = t('selectBarangay');
    if (!form.idType) e.idType = 'Please select an ID type';
    if (!form.idNumber.trim()) {
      e.idNumber = 'Enter your ID number';
    } else if (activeIdConfig.isValid && !activeIdConfig.isValid(form.idNumber)) {
      e.idNumber = `Invalid format (${activeIdConfig.hint})`;
    }
    if (!form.idImage) e.idImage = 'Please upload a photo of your ID';
    if (!agreeToTerms) e.agreeToTerms = 'You must agree to the Terms and Privacy Policy';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    if (!emailVerified) {
      setError('Please verify your email address with the 6-digit code first.');
      return;
    }
    setLoading(true);
    try {
      let idImageUrl = uploadedIdUrl;
      let verifyRes = aiResult;

      // Only perform upload & AI scan if not already uploaded or if photo changed
      if (!idImageUrl || scannedImageUri !== form.idImage) {
        idImageUrl = await ConcernService.uploadImage(form.idImage);
        setUploadedIdUrl(idImageUrl);
        setScannedImageUri(form.idImage);

        verifyRes = await ConcernService.verifyIdName(
          idImageUrl,
          form.name.trim(),
          form.idNumber.trim(),
          form.idType.trim()
        );
        setAiResult(verifyRes);
      }

      if (verifyRes) {
        if (!verifyRes.nameMatch && verifyRes.extractedName) {
          setLoading(false);
          setError(`AI Name Mismatch: The name on your ID ("${verifyRes.extractedName}") does not match "${form.name}". Tap "Use Name" below or update your name.`);
          return;
        }
        if (verifyRes.extractedIdNumber && !verifyRes.numberMatch) {
          setLoading(false);
          setError(`AI ID Number Mismatch: The number on your ID ("${verifyRes.extractedIdNumber}") does not match "${form.idNumber}". Tap "Use ID#" below or correct your number.`);
          return;
        }
      }

      await register({ ...form, idImageUrl, verificationToken });
      navigation.navigate('Login', {
        registeredEmail: form.email.trim(),
      });
    } catch (err) {
      const errField = err?.data?.field || (
        err?.code === 'auth/email-already-in-use' || err?.code === 'auth/invalid-email' ? 'email' :
        err?.code === 'auth/weak-password' ? 'password' :
        err?.code === 'auth/name-already-in-use' ? 'name' :
        err?.code === 'auth/phone-already-in-use' ? 'phone' :
        err?.code === 'auth/id-already-in-use' ? 'idNumber' : null
      );
      const map = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak.',
        'auth/name-already-in-use': 'Name is already registered.',
        'auth/phone-already-in-use': 'Phone number is already registered.',
        'auth/id-already-in-use': 'This ID number is already linked to another account.',
      };
      const errorMsg = map[err?.code] || err?.data?.message || err?.message || t('error');
      if (errField) {
        setErrors((prev) => ({ ...prev, [errField]: errorMsg }));
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgDeep, colors.bgDark]} style={{ flex: 1 }}>
      <View style={[S.glowBlob, { backgroundColor: colors.primary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Language switcher */}
          <View style={S.langRow}>
            {[
              { code: 'en', label: 'EN' },
              { code: 'fil', label: 'FIL' },
              { code: 'hil', label: 'HIL' },
            ].map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[
                  S.langChip,
                  { borderColor: colors.border },
                  language === l.code && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => changeLanguage(l.code)}
              >
                <Text
                  style={[
                    S.langText,
                    { color: colors.textMuted },
                    language === l.code && { color: '#fff' },
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Back + Logo */}
          <View style={S.topRow}>
            <TouchableOpacity
              style={[S.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Image
              source={require('../../../assets/logo.png')}
              style={S.logoSmallImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[S.pageTitle, { color: colors.textPrimary }]}>{t('register')}</Text>
          <Text style={[S.pageSubtitle, { color: colors.textSecondary }]}>
            {t('joinCommunity')}
          </Text>

          {/* Verification notice */}
          <View
            style={[
              S.noticeBox,
              { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primaryLight} />
            <View style={{ flex: 1 }}>
              <Text style={[S.noticeTitle, { color: colors.primaryLight }]}>
                {t('verificationRequired')}
              </Text>
              <Text style={[S.noticeText, { color: colors.textSecondary }]}>
                {t('verificationNotice')}
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {error && (
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
                  {error}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setError(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={[S.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {/* Google Quick Pre-Verification Button */}
            {!emailVerified && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: scale(10),
                  backgroundColor: colors.bgCardAlt,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: RADIUS.md,
                  height: verticalScale(48),
                  marginBottom: verticalScale(14),
                }}
                onPress={handleGooglePreVerify}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryLight} />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={18} color="#EA4335" />
                    <Text style={{ fontSize: rf(13.5), fontWeight: '700', color: colors.textPrimary }}>
                      Verify Email with Google (Skip OTP)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isGoogleVerified && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: scale(10),
                  backgroundColor: (colors.statusResolved || '#10B981') + '15',
                  borderColor: (colors.statusResolved || '#10B981') + '40',
                  borderWidth: 1,
                  borderRadius: RADIUS.md,
                  padding: scale(12),
                  marginBottom: verticalScale(14),
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.statusResolved || '#10B981'} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(12.5), fontWeight: '700', color: colors.statusResolved || '#10B981' }}>
                    Email Pre-Verified with Google
                  </Text>
                  <Text style={{ fontSize: rf(11), color: colors.textSecondary }} numberOfLines={1}>
                    {form.email} · 6-digit OTP code skipped
                  </Text>
                </View>
              </View>
            )}

            {/* ⚡ Fast-Fill with ID Banner */}
            <View
              style={{
                backgroundColor: colors.primary + '12',
                borderColor: colors.primary + '38',
                borderWidth: 1,
                borderRadius: RADIUS.md,
                padding: scale(14),
                marginBottom: verticalScale(18),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: verticalScale(4) }}>
                <Ionicons name="sparkles" size={17} color={colors.accentWarm || colors.primaryLight} />
                <Text style={{ fontSize: rf(13.5), fontWeight: '700', color: colors.textPrimary }}>
                  Fast Registration with AI
                </Text>
              </View>
              <Text style={{ fontSize: rf(11.5), color: colors.textSecondary, marginBottom: verticalScale(10), lineHeight: rf(16) }}>
                Upload or snap your Philippine ID first to automatically extract and fill your Name, ID Type, and ID Number.
              </Text>
              {form.idImage ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), flex: 1 }}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.statusResolved || '#10B981'} />
                    <Text style={{ fontSize: rf(12), color: colors.statusResolved || '#10B981', fontWeight: '600' }} numberOfLines={1}>
                      {aiVerifying ? 'Scanning ID with AI...' : 'ID Attached & Scanned'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={{
                      paddingHorizontal: scale(10),
                      paddingVertical: verticalScale(5),
                      backgroundColor: colors.primary + '20',
                      borderRadius: RADIUS.sm,
                    }}
                  >
                    <Text style={{ fontSize: rf(11.5), color: colors.primaryLight, fontWeight: '600' }}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: scale(8) }}>
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scale(6),
                      backgroundColor: colors.primary,
                      paddingVertical: verticalScale(8),
                      borderRadius: RADIUS.sm,
                    }}
                  >
                    <Ionicons name="camera-outline" size={16} color="#fff" />
                    <Text style={{ fontSize: rf(12), color: '#fff', fontWeight: '700' }}>Snap ID Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={pickPhoto}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scale(6),
                      backgroundColor: colors.bgDark || '#1E293B',
                      borderColor: colors.border,
                      borderWidth: 1,
                      paddingVertical: verticalScale(8),
                      borderRadius: RADIUS.sm,
                    }}
                  >
                    <Ionicons name="images-outline" size={16} color={colors.textPrimary} />
                    <Text style={{ fontSize: rf(12), color: colors.textPrimary, fontWeight: '600' }}>From Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{ marginBottom: verticalScale(14) }}>
              <Text style={[S.fieldLabel, { color: colors.textSecondary }]}>
                {`${t('fullName').toUpperCase()} (AS ON ID)`} *
              </Text>
              <InputField
                value={form.name}
                onChangeText={(v) => set('name', v)}
                placeholder={t('namePlaceholder') || 'Example: Juan M. Dela-Cruz'}
                autoCapitalize="words"
                leftIcon="person-outline"
                error={errors.name}
                style={{ marginBottom: 0 }}
              />
            </View>

            {/* Email Field with Inline Verification Action */}
            <View style={{ marginBottom: verticalScale(16) }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: verticalScale(6),
                }}
              >
                <Text style={[S.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>
                  {t('email').toUpperCase()} *
                </Text>

                {emailVerified ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={{ fontSize: rf(11), fontWeight: '700', color: colors.success }}>
                      {isGoogleVerified ? 'Verified by Google' : 'Email Verified'}
                    </Text>
                    {!isGoogleVerified && (
                      <TouchableOpacity
                        onPress={() => {
                          setEmailVerified(false);
                          setVerificationToken(null);
                          setOtpSent(false);
                          setOtpCode('');
                          setOtpSuccess(null);
                          setOtpError(null);
                        }}
                        style={{ marginLeft: scale(6) }}
                      >
                        <Text
                          style={{
                            fontSize: rf(11),
                            color: colors.primaryLight,
                            textDecorationLine: 'underline',
                          }}
                        >
                          Change
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={sendingOtp || otpCooldown > 0}
                    style={{
                      paddingHorizontal: scale(10),
                      paddingVertical: verticalScale(4),
                      backgroundColor: otpCooldown > 0 ? colors.bgCardAlt : colors.primary + '22',
                      borderColor: otpCooldown > 0 ? colors.border : colors.primary,
                      borderWidth: 1,
                      borderRadius: RADIUS.sm,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: rf(11),
                        fontWeight: '700',
                        color: otpCooldown > 0 ? colors.textMuted : colors.primaryLight,
                      }}
                    >
                      {sendingOtp
                        ? 'Sending...'
                        : otpCooldown > 0
                        ? `Resend (${otpCooldown}s)`
                        : otpSent
                        ? 'Resend Code'
                        : 'Verify Email'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View
                style={[
                  S.inputWrap,
                  {
                    backgroundColor: colors.bgCardAlt,
                    borderColor: errors.email
                      ? colors.danger
                      : emailVerified
                      ? colors.success
                      : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={emailVerified ? colors.success : colors.textMuted}
                  style={{ marginRight: scale(8) }}
                />
                <TextInput
                  style={[
                    S.input,
                    { color: colors.textPrimary },
                    emailVerified && { opacity: 0.8 },
                  ]}
                  value={form.email}
                  editable={!emailVerified}
                  onChangeText={(v) => {
                    set('email', v);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    if (otpError) setOtpError(null);
                  }}
                  placeholder="you@gmail.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailVerified && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                )}
              </View>
              {errors.email && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.statusRejected} />
                  <Text style={{ color: colors.statusRejected, fontSize: rf(11) }}>
                    {errors.email}
                  </Text>
                </View>
              )}

              {/* Inline OTP Verification Card */}
              {otpSent && !emailVerified && (
                <View
                  style={{
                    marginTop: verticalScale(10),
                    padding: scale(14),
                    borderRadius: RADIUS.md,
                    backgroundColor: colors.bgCardAlt,
                    borderWidth: 1,
                    borderColor: colors.primary + '55',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: scale(6),
                      marginBottom: verticalScale(6),
                    }}
                  >
                    <Ionicons name="mail-unread-outline" size={16} color={colors.primaryLight} />
                    <Text
                      style={{
                        fontSize: rf(12),
                        fontWeight: '700',
                        color: colors.textPrimary,
                        flex: 1,
                      }}
                    >
                      Enter 6-Digit Verification Code
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: rf(11.5),
                      color: colors.textSecondary,
                      marginBottom: verticalScale(10),
                      lineHeight: rf(16),
                    }}
                  >
                    We sent a code to{' '}
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      {form.email}
                    </Text>
                    . Check your inbox (or spam).
                  </Text>

                  <View style={{ flexDirection: 'row', gap: scale(8), alignItems: 'center' }}>
                    <View
                      style={[
                        S.inputWrap,
                        {
                          flex: 1,
                          backgroundColor: colors.bgCard,
                          borderColor: otpError ? colors.danger : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="key-outline"
                        size={16}
                        color={colors.textMuted}
                        style={{ marginRight: scale(6) }}
                      />
                      <TextInput
                        style={[
                          S.input,
                          {
                            color: colors.textPrimary,
                            letterSpacing: 4,
                            fontWeight: '700',
                            fontSize: rf(15),
                          },
                        ]}
                        value={otpCode}
                        onChangeText={(v) => {
                          setOtpCode(v.replace(/\D/g, '').slice(0, 6));
                          if (otpError) setOtpError(null);
                        }}
                        placeholder="123456"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleVerifyOtp}
                      disabled={verifyingOtp || otpCode.length !== 6}
                      style={{
                        backgroundColor: otpCode.length === 6 ? colors.success : colors.bgCard,
                        borderColor: otpCode.length === 6 ? colors.success : colors.border,
                        borderWidth: 1,
                        borderRadius: RADIUS.md,
                        paddingHorizontal: scale(16),
                        height: verticalScale(46),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {verifyingOtp ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text
                          style={{
                            color: otpCode.length === 6 ? '#fff' : colors.textMuted,
                            fontWeight: '700',
                            fontSize: rf(13),
                          }}
                        >
                          Verify
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {otpError && (
                    <Text
                      style={{
                        color: colors.danger,
                        fontSize: rf(11),
                        marginTop: verticalScale(6),
                      }}
                    >
                      ⚠ {otpError}
                    </Text>
                  )}
                  {otpSuccess && (
                    <Text
                      style={{
                        color: colors.success,
                        fontSize: rf(11),
                        marginTop: verticalScale(6),
                      }}
                    >
                      ✓ {otpSuccess}
                    </Text>
                  )}
                </View>
              )}
            </View>

            <InputField
              label={t('password').toUpperCase()}
              value={form.password}
              onChangeText={(v) => set('password', v)}
              placeholder={t('passwordMin')}
              secureTextEntry={!showPw}
              leftIcon="lock-closed-outline"
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPw((p) => !p)}
                  style={{ position: 'absolute', right: 14 }}
                >
                  <Ionicons
                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              }
              error={errors.password}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
            />

            {/* Password Strength Checker */}
            {(form.password.length > 0 || pwFocused) && (
              <View
                style={[
                  S.pwChecker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                ]}
              >
                {/* Strength bar */}
                <View style={S.strengthBarRow}>
                  <View style={[S.strengthBarTrack, { backgroundColor: colors.border }]}>
                    <Animated.View
                      style={[
                        S.strengthBarFill,
                        {
                          backgroundColor: passwordAnalysis.color,
                          width: strengthAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[S.strengthLabel, { color: passwordAnalysis.color }]}>
                    {form.password.length > 0 ? passwordAnalysis.label : ''}
                  </Text>
                </View>

                {/* Requirements checklist */}
                <View style={S.reqList}>
                  {[
                    { key: 'minLength', label: t('pwReqLength') },
                    { key: 'hasUpper', label: t('pwReqUpper') },
                    { key: 'hasLower', label: t('pwReqLower') },
                    { key: 'hasNumber', label: t('pwReqNumber') },
                    { key: 'hasSpecial', label: t('pwReqSpecial') },
                  ].map((req) => {
                    const met = passwordAnalysis.checks[req.key];
                    return (
                      <View key={req.key} style={S.reqRow}>
                        <Ionicons
                          name={met ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={met ? colors.success : colors.textMuted}
                        />
                        <Text
                          style={[
                            S.reqText,
                            { color: met ? colors.success : colors.textMuted },
                            met && { fontWeight: '600' },
                          ]}
                        >
                          {req.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <InputField
              label={t('phone').toUpperCase()}
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
              placeholder="09XXXXXXXXX"
              keyboardType="phone-pad"
              maxLength={11}
              leftIcon="call-outline"
            />

            {/* Barangay picker */}
            <View style={{ marginBottom: 14 }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>
                {t('barangay').toUpperCase()}
              </Text>
              <TouchableOpacity
                style={[
                  S.picker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  errors.barangay && { borderColor: colors.danger },
                ]}
                onPress={() => {
                  setShowPicker((p) => !p);
                  setBarangaySearch('');
                }}
              >
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text
                  style={[
                    S.pickerText,
                    { color: colors.textPrimary },
                    !form.barangay && { color: colors.textMuted },
                  ]}
                >
                  {form.barangay || t('selectBarangay')}
                </Text>
                <Ionicons
                  name={showPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {errors.barangay && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{errors.barangay}</Text>
                </View>
              )}
              {showPicker && (
                <View
                  style={[
                    S.dropdown,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                    <TextInput
                      value={barangaySearch}
                      onChangeText={setBarangaySearch}
                      placeholder={t('searchBarangay')}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1, paddingVertical: 10, color: colors.textPrimary, fontSize: rf(13) }}
                    />
                    {barangaySearch.length > 0 && (
                      <TouchableOpacity onPress={() => setBarangaySearch('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {filteredBarangays.length === 0 && (
                      <Text style={{ padding: 14, color: colors.textMuted, fontSize: rf(12) }}>
                        {t('noBarangayFound')}
                      </Text>
                    )}
                    {filteredBarangays.map((b) => (
                      <TouchableOpacity
                        key={b}
                        style={[
                          S.dropdownItem,
                          { borderBottomColor: colors.border },
                          form.barangay === b && { backgroundColor: colors.primary + '18' },
                        ]}
                        onPress={() => {
                          set('barangay', b);
                          setShowPicker(false);
                          setBarangaySearch('');
                        }}
                      >
                        <Text
                          style={[
                            S.dropdownText,
                            { color: colors.textSecondary },
                            form.barangay === b && {
                              color: colors.primaryLight,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {b}
                        </Text>
                        {form.barangay === b && (
                          <Ionicons name="checkmark-circle" size={16} color={colors.primaryLight} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ID Type picker */}
            <View style={{ marginBottom: 14 }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>{`${t('idType').toUpperCase()} *`}</Text>
              <TouchableOpacity
                style={[
                  S.picker,
                  { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                  errors.idType && { borderColor: colors.danger },
                ]}
                onPress={() => setShowIdPicker((p) => !p)}
              >
                <Ionicons name="card-outline" size={16} color={colors.textMuted} />
                <Text
                  style={[
                    S.pickerText,
                    { color: colors.textPrimary },
                    !form.idType && { color: colors.textMuted },
                  ]}
                >
                  {form.idType || t('selectIdType')}
                </Text>
                <Ionicons
                  name={showIdPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {errors.idType && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{errors.idType}</Text>
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
                          form.idType === tItem && { backgroundColor: colors.primary + '18' },
                        ]}
                        onPress={() => {
                          const cfg = ID_CONFIGS[tItem] || DEFAULT_ID_CONFIG;
                          setForm((prev) => ({
                            ...prev,
                            idType: tItem,
                            idNumber: prev.idNumber ? cfg.format(prev.idNumber) : '',
                          }));
                          setShowIdPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            S.dropdownText,
                            { color: colors.textSecondary },
                            form.idType === tItem && {
                              color: colors.primaryLight,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {tItem}
                        </Text>
                        {form.idType === tItem && (
                          <Ionicons name="checkmark-circle" size={16} color={colors.primaryLight} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ID Number */}
            <View style={{ marginBottom: 14 }}>
              <InputField
                label={`${t('idNumber').toUpperCase()} *`}
                value={form.idNumber}
                onChangeText={(v) => {
                  const formatted = activeIdConfig.format(v);
                  set('idNumber', formatted);
                  if (errors.idNumber) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.idNumber;
                      return next;
                    });
                  }
                }}
                placeholder={activeIdConfig.placeholder}
                maxLength={activeIdConfig.maxLength}
                keyboardType={activeIdConfig.keyboardType}
                leftIcon="key-outline"
                error={errors.idNumber}
              />
              <Text style={{ fontSize: rf(11), color: colors.textMuted, marginTop: -6, marginLeft: 4 }}>
                {activeIdConfig.hint}
              </Text>
            </View>

            {/* ID Photo */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[S.fieldLabel, { color: colors.textMuted }]}>{`${t('idPhoto').toUpperCase()} *`}</Text>
              {form.idImage ? (
                <View style={{ width: '100%', marginBottom: 16 }}>
                  <Image
                    source={{ uri: form.idImage }}
                    style={{ width: '100%', height: 200, borderRadius: 16 }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={{
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
                    }}
                    onPress={() => {
                      set('idImage', null);
                      setAiResult(null);
                    }}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{t('retake')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    S.photoBox,
                    { backgroundColor: colors.bgCardAlt, borderColor: colors.border },
                    errors.idImage && { borderColor: colors.danger },
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

              {/* Subtle scanning status indicator */}
              {aiVerifying && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(8),
                    marginTop: verticalScale(8),
                    paddingVertical: verticalScale(4),
                  }}
                >
                  <ActivityIndicator size="small" color={colors.primaryLight} />
                  <Text style={{ fontSize: rf(11.5), color: colors.textSecondary }}>
                    {t('aiScanningId')}
                  </Text>
                </View>
              )}

              {errors.idImage && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginTop: verticalScale(5),
                  }}
                >
                  <Ionicons name="alert-circle" size={12} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(11) }}>{errors.idImage}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8 }}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={agreeToTerms ? "checkbox" : "square-outline"} 
                size={22} 
                color={agreeToTerms ? colors.primaryLight : colors.textMuted} 
              />
              <Text style={{ marginLeft: 10, color: colors.textSecondary, fontSize: rf(13), flex: 1, lineHeight: rf(18) }}>
                {t('agreeTermsPrefix')} <Text style={{ color: colors.primaryLight, fontWeight: '700' }} onPress={() => navigation.navigate('TermsAndPolicy')}>{t('termsOfService')}</Text> {t('andWord')} <Text style={{ color: colors.primaryLight, fontWeight: '700' }} onPress={() => navigation.navigate('TermsAndPolicy')}>{t('privacyPolicy')}</Text>
              </Text>
            </TouchableOpacity>
            {errors.agreeToTerms && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scale(5),
                    marginBottom: 16,
                  }}
                >
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: rf(12) }}>{errors.agreeToTerms}</Text>
                </View>
            )}

            <PrimaryButton
              title={t('register')}
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <View style={S.loginRow}>
              <Text style={{ color: colors.textSecondary, fontSize: rf(14) }}>
                {t('hasAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text
                  style={{
                    color: colors.primaryLight,
                    fontSize: rf(14),
                    fontWeight: '700',
                  }}
                >
                  {t('login')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(40),
  },

  glowBlob: {
    position: 'absolute',
    top: verticalScale(-80),
    left: '50%',
    marginLeft: scale(-140),
    width: scale(280),
    height: scale(280),
    borderRadius: scale(140),
    opacity: 0.07,
  },

  langRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scale(6),
    marginBottom: verticalScale(16),
  },
  langChip: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  backBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSmallImage: {
    width: scale(36),
    height: scale(36),
    borderRadius: RADIUS.sm,
  },

  pageTitle: {
    fontSize: rf(26),
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: verticalScale(4),
  },
  pageSubtitle: { fontSize: rf(13), marginBottom: verticalScale(20) },

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
  noticeText: { fontSize: rf(12), lineHeight: rf(18) },

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

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: rf(14),
    padding: 0,
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
  pickerText: { flex: 1, fontSize: rf(14) },

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
  dropdownText: { fontSize: rf(14) },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: verticalScale(20) },

  // Password strength checker
  pwChecker: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: scale(12),
    marginTop: verticalScale(-4),
    marginBottom: verticalScale(10),
  },
  strengthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(10),
  },
  strengthBarTrack: {
    flex: 1,
    height: verticalScale(5),
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  strengthLabel: {
    fontSize: rf(11),
    fontWeight: '700',
    letterSpacing: 0.4,
    minWidth: scale(60),
    textAlign: 'right',
  },
  reqList: {
    gap: verticalScale(6),
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  reqText: {
    fontSize: rf(11),
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
  photoActions: { flexDirection: 'row', gap: scale(12) },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  photoBtnText: { fontSize: rf(13), fontWeight: '600' },

  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
