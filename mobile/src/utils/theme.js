// ═══════════════════════════════════════════════════════
//  CitiVoice Mobile — Design System
// ═══════════════════════════════════════════════════════

export const COLORS = {
  // Background layers
  bgDeep: "#050D1A",
  bgDark: "#080F1E",
  bgCard: "#0D1829",
  bgCardAlt: "#111F35",
  bgElevated: "#152234",

  // Brand
  primary: "#2563EB",
  primaryLight: "#60A5FA",
  primaryDark: "#1D4ED8",
  primaryGlow: "rgba(37,99,235,0.25)",

  // Accents
  accent: "#10B981",
  accentWarm: "#F97316",
  purple: "#8B5CF6",
  cyan: "#22D3EE",

  // Status
  statusPending: "#F59E0B",
  statusInProgress: "#3B82F6",
  statusResolved: "#10B981",
  statusRejected: "#EF4444",

  // Text
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#475569",
  textDisabled: "#1E3A5F",

  // Structure
  border: "rgba(255,255,255,0.07)",
  borderMd: "rgba(255,255,255,0.12)",
  divider: "rgba(255,255,255,0.05)",

  // Semantic
  danger: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#3B82F6",
};

export const TYPOGRAPHY = {
  xs: 11,
  sm: 13,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 999,
};

export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
};

export const SHADOWS = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  button: {
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
};

export const CATEGORY_CONFIG = {
  "Road & Infrastructure": {
    icon: "construct",
    color: "#F97316",
    bg: "rgba(249,115,22,0.12)",
    label: "Road",
  },
  "Water & Drainage": {
    icon: "water",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.12)",
    label: "Water",
  },
  Electricity: {
    icon: "flash",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    label: "Electric",
  },
  "Waste & Sanitation": {
    icon: "trash",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    label: "Waste",
  },
  "Public Safety": {
    icon: "shield",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    label: "Safety",
  },
  Other: {
    icon: "ellipsis-horizontal",
    color: "#94A3B8",
    bg: "rgba(148,163,184,0.1)",
    label: "Other",
  },
};

export const STATUS_CONFIG = {
  Pending: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.25)",
    icon: "time-outline",
    label: "Pending",
  },
  "In Progress": {
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    icon: "refresh-outline",
    label: "Active",
  },
  Resolved: {
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.25)",
    icon: "checkmark-circle-outline",
    label: "Resolved",
  },
  Rejected: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.25)",
    icon: "close-circle-outline",
    label: "Rejected",
  },
};

