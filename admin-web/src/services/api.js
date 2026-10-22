// Central API helper for CitiVoice Admin
// All requests automatically include the JWT token from localStorage

export const getApiHost = () => {
  if (typeof window !== 'undefined' && window.location) {
    const loc = window.location;
    // If accessing through Docker or network IP, align backend host with current browser host
    if (loc.hostname && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
      return `${loc.protocol}//${loc.hostname}:5000`;
    }
  }
  return (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
};

const getBaseUrl = () => `${getApiHost()}/api`;

const getToken = () => localStorage.getItem('cv_token');

const request = async (path, options = {}) => {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

export const api = {
  get: (path, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `${path}?${qs}` : path;
    return request(url);
  },
  post: (path, body) => request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

// Utility: format a MySQL date string
export const fmtDate = (dateStr, opts = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', opts);
};

export const fmtDateShort = (dateStr) =>
  fmtDate(dateStr, { year: 'numeric', month: 'short', day: 'numeric' });

// Utility: mask an email for privacy (e.g. johndoe@gmail.com -> joh***@gmail.com)
export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 3) return `${user.charAt(0)}***@${domain}`;
  return `${user.substring(0, 3)}***@${domain}`;
};

// Utility: resolve image URLs — always use current API host, even if DB stored a tunnel/different host

export const resolveImageUrl = (url) => {
  if (!url) return null;
  const str = String(url).trim();
  if (!str) return null;
  if (str.startsWith('data:')) return str;

  const host = getApiHost();
  const normalized = str.replace(/\\/g, '/');

  const match = normalized.match(/(?:\/|^)uploads\/(.+)$/i);
  if (match) {
    return `${host}/uploads/${match[1]}`;
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    if (normalized.includes('/uploads/')) {
      const fn = normalized.split('/uploads/')[1];
      return `${host}/uploads/${fn}`;
    }
    return normalized;
  }

  if (normalized.match(/^[a-zA-Z0-9_-]+\.(jpe?g|png|gif|webp|heic)$/i)) {
    return `${host}/uploads/${normalized}`;
  }

  return normalized.startsWith('/') ? `${host}${normalized}` : `${host}/${normalized}`;
};

// Kabankalan City barangay reference coordinates (centroids) for accurate pinned location matching
export const KABANKALAN_BARANGAY_COORDS = [
  { name: 'Barangay 1', lat: 9.998, lng: 122.814 },
  { name: 'Barangay 2', lat: 10.001, lng: 122.812 },
  { name: 'Barangay 3', lat: 9.995, lng: 122.816 },
  { name: 'Barangay 4', lat: 9.992, lng: 122.818 },
  { name: 'Barangay 5', lat: 10.005, lng: 122.816 },
  { name: 'Barangay 6', lat: 10.008, lng: 122.820 },
  { name: 'Barangay 7', lat: 10.012, lng: 122.825 },
  { name: 'Barangay 8', lat: 10.015, lng: 122.830 },
  { name: 'Barangay 9', lat: 10.000, lng: 122.808 },
  { name: 'Bantayan', lat: 9.726, lng: 122.788 },
  { name: 'Binicuil', lat: 9.965, lng: 122.805 },
  { name: 'Camansi', lat: 9.940, lng: 122.880 },
  { name: 'Camingawan', lat: 9.820, lng: 122.950 },
  { name: 'Camugao', lat: 9.955, lng: 122.835 },
  { name: 'Carol-an', lat: 9.860, lng: 122.920 },
  { name: 'Daan Banua', lat: 10.010, lng: 122.785 },
  { name: 'Hilamonan', lat: 10.005, lng: 122.845 },
  { name: 'Inapoy', lat: 9.810, lng: 122.880 },
  { name: 'Linao', lat: 10.020, lng: 122.800 },
  { name: 'Locotan', lat: 9.930, lng: 122.840 },
  { name: 'Magballo', lat: 9.850, lng: 122.830 },
  { name: 'Oringao', lat: 9.891, lng: 122.866 },
  { name: 'Orong', lat: 9.910, lng: 122.800 },
  { name: 'Pinaguinpinan', lat: 9.950, lng: 122.780 },
  { name: 'Salong', lat: 9.970, lng: 122.760 },
  { name: 'Tabugon', lat: 9.780, lng: 122.850 },
  { name: 'Tagoc', lat: 9.930, lng: 122.770 },
  { name: 'Tagukon', lat: 9.740, lng: 122.830 },
  { name: 'Talubangi', lat: 10.015, lng: 122.825 },
  { name: 'Tampalon', lat: 9.900, lng: 122.920 },
  { name: 'Tan-awan', lat: 9.840, lng: 122.980 },
  { name: 'Tapi', lat: 9.870, lng: 122.800 }
];

// Utility: Extract/derive barangay strictly from concern's pinned location (address and GPS coordinates), NEVER from user_barangay
export const getPinBarangay = (c) => {
  if (!c) return 'Barangay 1';

  const address = (c.location_address || '').trim();

  // 1. Street-level mapping for prominent Kabankalan avenues & streets
  if (address) {
    if (/Aquiles\s*-?\s*Zayco/i.test(address) || /Zayco\s+Ave/i.test(address)) {
      return 'Barangay 1';
    }
    if (/Guanzon/i.test(address)) return 'Barangay 1';
    if (/Tayum/i.test(address)) return 'Barangay 2';
    if (/Coloso/i.test(address)) return 'Barangay 1';

    // 2. Check if pinned address explicitly mentions a known Kabankalan barangay
    for (const b of KABANKALAN_BARANGAY_COORDS) {
      const regex = new RegExp(`\\b${b.name}\\b`, 'i');
      if (regex.test(address)) {
        return b.name;
      }
    }

    // Regex check for "Barangay <Name/Number>", "Brgy. <Name/Number>", "Poblacion <Number>"
    const match = address.match(/(?:Barangay|Brgy\.?|Poblacion)\s+([A-Za-z0-9\s-]+?)(?:,|\.|$)/i);
    if (match && match[1]) {
      const trimmed = match[1].trim();
      if (/^\d+$/.test(trimmed)) {
        if (/Poblacion/i.test(match[0])) {
          return `Poblacion ${trimmed}`;
        }
        return `Barangay ${trimmed}`;
      }
      return trimmed;
    }
  }

  // 3. Derive strictly from the pinned GPS coordinates (location_lat, location_lng)
  const lat = parseFloat(c.location_lat);
  const lng = parseFloat(c.location_lng);
  if (!isNaN(lat) && !isNaN(lng)) {
    let nearest = null;
    let minD = Infinity;
    for (const b of KABANKALAN_BARANGAY_COORDS) {
      const d = Math.hypot(b.lat - lat, b.lng - lng);
      if (d < minD) {
        minD = d;
        nearest = b.name;
      }
    }
    if (nearest) return nearest;
  }

  return 'Barangay 1';
};

// ── Standard Category Color Design System ──
export const CATEGORY_COLORS = {
  'Road & Infrastructure': {
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.35)',
    icon: '🛣️',
    label: 'Road & Infrastructure',
  },
  'Electricity': {
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.35)',
    icon: '⚡',
    label: 'Electricity',
  },
  'Drainage': {
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.35)',
    icon: '🌊',
    label: 'Drainage',
  },
  'Waste & Sanitation': {
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: '🚮',
    label: 'Waste & Sanitation',
  },
  'Water & Drainage': {
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.35)',
    icon: '🌊',
    label: 'Drainage',
  },
  'Public Safety': {
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: '🛡️',
    label: 'Public Safety',
  },
  'Not a Typical Concern': {
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.15)',
    border: 'rgba(139, 92, 246, 0.35)',
    icon: '❓',
    label: 'Not Typical',
  },
  'Other': {
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.35)',
    icon: '📁',
    label: 'Other',
  },
};

export const getCategoryConfig = (category) => {
  if (!category) return CATEGORY_COLORS['Other'];
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
};

