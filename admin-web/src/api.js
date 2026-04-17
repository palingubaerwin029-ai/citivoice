// Central API helper for CitiVoice Admin
// All requests automatically include the JWT token from localStorage

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('cv_token');

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
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
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
};

// Utility: format a MySQL date string
export const fmtDate = (dateStr, opts = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', opts);
};

export const fmtDateShort = (dateStr) =>
  fmtDate(dateStr, { year: 'numeric', month: 'short', day: 'numeric' });
