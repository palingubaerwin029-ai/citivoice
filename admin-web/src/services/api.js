// Central API helper for CitiVoice Admin
// All requests automatically include the JWT token from localStorage

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('cv_token');

const request = async (path, options = {}) => {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
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
const API_HOST = BASE_URL.replace(/\/api$/, '');
export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const match = url.match(/\/uploads\/.+$/);
  return match ? `${API_HOST}${match[0]}` : url;
};

// Utility: Extract/derive barangay only from concern's location_address, falling back to user_barangay
export const getPinBarangay = (c) => {
  if (!c) return 'Unspecified';

  const address = (c.location_address || '').trim();

  if (address) {
    // 1. Check against known barangay list (Kabankalan City barangays)
    const knownBarangays = [
      'Poblacion 1', 'Poblacion 2', 'Poblacion 3', 'Poblacion 4',
      'Poblacion 5', 'Poblacion 6', 'Poblacion 7', 'Poblacion 8',
      'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4',
      'Barangay 5', 'Barangay 6', 'Barangay 7', 'Barangay 8', 'Barangay 9',
      'Bantayan', 'Binicuil', 'Camansi', 'Camingawan', 'Camugao', 'Carol-an',
      'Daan Banua', 'Hilamonan', 'Inapoy', 'Linao', 'Locotan', 'Magballo',
      'Oringao', 'Orong', 'Pinaguinpinan', 'Salong', 'Tabao', 'Tabugon', 'Tagoc',
      'Tagukon', 'Talubangi', 'Tampalon', 'Tan-awan', 'Tapi', 'Guinzadan'
    ];

    for (const brgy of knownBarangays) {
      const regex = new RegExp(`\\b${brgy}\\b`, 'i');
      if (regex.test(address)) {
        return brgy;
      }
    }

    // 2. Regex check for "Barangay <Name/Number>", "Brgy. <Name/Number>", "Poblacion <Number>"
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

  // 3. Fall back to c.user_barangay if location_address has no explicit barangay phrase
  if (c.user_barangay && c.user_barangay.trim()) {
    return c.user_barangay.trim();
  }

  return 'Barangay 1';
};
