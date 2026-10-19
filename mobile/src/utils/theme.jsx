// ═══════════════════════════════════════════════════════
//  CitiVoice Mobile — Design System
// ═══════════════════════════════════════════════════════

import { rf, moderateScale } from './responsive';

export const DARK_COLORS = {
  // Background layers (contemporary deep slate)
  bgDeep: '#080E18',
  bgDark: '#0D1524',
  bgCard: '#131F33',
  bgCardAlt: '#192841',
  bgElevated: '#1F314F',

  // Brand (Kabankalan civic amber/gold)
  primary: '#F59E0B',
  primaryLight: '#FBBF24',
  primaryDark: '#D97706',
  primaryGlow: 'rgba(245, 158, 11, 0.22)',

  // Accents
  accent: '#10B981',
  accentWarm: '#F97316',
  purple: '#8B5CF6',
  cyan: '#06B6D4',

  // Status
  statusPending: '#F59E0B',
  statusInProgress: '#3B82F6',
  statusResolved: '#10B981',
  statusRejected: '#EF4444',

  // High-contrast text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#334155',

  // Crisp structure
  border: 'rgba(255, 255, 255, 0.08)',
  borderMd: 'rgba(255, 255, 255, 0.15)',
  divider: 'rgba(255, 255, 255, 0.06)',

  // Semantic
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
};

export const LIGHT_COLORS = {
  // Background layers (crisp clean canvas)
  bgDeep: '#F4F6F9',
  bgDark: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F8FAFC',
  bgElevated: '#FFFFFF',

  // Brand
  primary: '#D97706',
  primaryLight: '#F59E0B',
  primaryDark: '#B45309',
  primaryGlow: 'rgba(217, 119, 6, 0.14)',

  // Accents
  accent: '#059669',
  accentWarm: '#EA580C',
  purple: '#7C3AED',
  cyan: '#0891B2',

  // Status
  statusPending: '#D97706',
  statusInProgress: '#2563EB',
  statusResolved: '#059669',
  statusRejected: '#DC2626',

  // High-contrast text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textDisabled: '#CBD5E1',

  // Crisp structure
  border: 'rgba(15, 23, 42, 0.08)',
  borderMd: 'rgba(15, 23, 42, 0.14)',
  divider: 'rgba(15, 23, 42, 0.05)',

  // Semantic
  danger: '#DC2626',
  warning: '#D97706',
  success: '#059669',
  info: '#2563EB',
};

// Legacy support (defaults to dark)
export const COLORS = DARK_COLORS;

export const getColors = (theme) => (theme === 'light' ? LIGHT_COLORS : DARK_COLORS);

export const TYPOGRAPHY = {
  xs: rf(11),
  sm: rf(13),
  base: rf(14),
  md: rf(15),
  lg: rf(17),
  xl: rf(20),
  '2xl': rf(24),
  '3xl': rf(30),
};

export const RADIUS = {
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  '2xl': moderateScale(24),
  full: 999, // Unscaled to retain pure circular shapes
};

export const SPACING = {
  1: moderateScale(4),
  2: moderateScale(8),
  3: moderateScale(12),
  4: moderateScale(16),
  5: moderateScale(20),
  6: moderateScale(24),
  8: moderateScale(32),
  10: moderateScale(40),
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.35,
    shadowRadius: moderateScale(12),
    elevation: 5,
  },
  button: {
    shadowColor: '#EAB308',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.5,
    shadowRadius: moderateScale(16),
    elevation: 8,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(6),
    elevation: 3,
  },
};

export const getCategoryConfig = (colors) => {
  const defaultConfig = {
    icon: 'alert-circle',
    color: colors.primaryLight || colors.primary || '#3B82F6',
    bg: (colors.primaryLight || colors.primary || '#3B82F6') + '1F',
    label: 'General',
  };

  const map = {
    'Road & Infrastructure': {
      icon: 'construct',
      color: colors.accentWarm || '#F97316',
      bg: (colors.accentWarm || '#F97316') + '1F',
      label: 'Road',
    },
    Electricity: {
      icon: 'flash',
      color: colors.statusPending || '#F59E0B',
      bg: (colors.statusPending || '#F59E0B') + '1F',
      label: 'Electricity',
    },
    Drainage: {
      icon: 'water',
      color: colors.info || '#3B82F6',
      bg: (colors.info || '#3B82F6') + '1F',
      label: 'Drainage',
    },
    'Waste & Sanitation': {
      icon: 'trash',
      color: colors.accent || '#10B981',
      bg: (colors.accent || '#10B981') + '1F',
      label: 'Waste',
    },
    // Legacy / fallback mappings for backward compatibility
    'Water & Drainage': {
      icon: 'water',
      color: colors.info || '#3B82F6',
      bg: (colors.info || '#3B82F6') + '1F',
      label: 'Drainage',
    },
    'Public Safety': {
      icon: 'shield',
      color: colors.statusRejected || '#EF4444',
      bg: (colors.statusRejected || '#EF4444') + '1F',
      label: 'Safety',
    },
    'Not a Typical Concern': {
      icon: 'help-circle',
      color: colors.textMuted || '#94A3B8',
      bg: (colors.textMuted || '#94A3B8') + '1F',
      label: 'Not typical',
    },
    Other: defaultConfig,
  };

  return new Proxy(map, {
    get: (target, prop) => (prop in target ? target[prop] : defaultConfig),
  });
};

export const getStatusConfig = (colors) => ({
  Pending: {
    color: colors.statusPending,
    bg: colors.statusPending + '1F',
    border: colors.statusPending + '33',
    icon: 'time-outline',
    label: 'Pending',
  },
  'In Progress': {
    color: colors.statusInProgress,
    bg: colors.statusInProgress + '1F',
    border: colors.statusInProgress + '33',
    icon: 'refresh-outline',
    label: 'Active',
  },
  Resolved: {
    color: colors.statusResolved,
    bg: colors.statusResolved + '1F',
    border: colors.statusResolved + '33',
    icon: 'checkmark-circle-outline',
    label: 'Resolved',
  },
  Rejected: {
    color: colors.statusRejected,
    bg: colors.statusRejected + '1F',
    border: colors.statusRejected + '33',
    icon: 'close-circle-outline',
    label: 'Rejected',
  },
});

// Keep legacy for migration period
export const CATEGORY_CONFIG = getCategoryConfig(DARK_COLORS);
export const STATUS_CONFIG = getStatusConfig(DARK_COLORS);
