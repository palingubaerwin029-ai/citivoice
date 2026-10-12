import AsyncStorage from '@react-native-async-storage/async-storage';

import { BASE_URL } from '../context/AuthContext';

const getToken = async () => AsyncStorage.getItem('cv_token');

const apiRequest = async (path, options = {}) => {
  const token = await getToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  
  let finalPath = path;
  if (options.params) {
    const qs = new URLSearchParams(options.params).toString();
    if (qs) finalPath = `${path}?${qs}`;
  }

  const res = await fetch(`${BASE_URL}${finalPath}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const appendImageFile = async (formData, fieldName, uri) => {
  if (!uri) return;
  const filename = uri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  try {
    // In modern Expo SDK (WinterCG fetch), local file URIs must be converted to Blob
    const response = await fetch(uri);
    const blob = await response.blob();
    const typedBlob = blob.slice ? blob.slice(0, blob.size, type) : blob;
    formData.append(fieldName, typedBlob, filename);
  } catch (err) {
    console.warn('[ConcernService] Blob conversion fallback:', err);
    // Fallback for legacy React Native runtime
    formData.append(fieldName, {
      uri,
      name: filename,
      type,
    });
  }
};

export const ConcernService = {
  // ── Upload an image to the backend ──────────────────────────────────────
  async uploadImage(imageUri) {
    const formData = new FormData();
    await appendImageFile(formData, 'image', imageUri);

    const token = await getToken();
    const res = await fetch(`${BASE_URL}/concerns/upload/id-image`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url; // returns the hosted image URL
  },

  // ── Submit a new concern ────────────────────────────────────────────────
  async addConcern({
    title,
    description,
    category,
    priority,
    imageUri,
    location,
    userName,
    userBarangay,
  }) {
    const formData = new FormData();
    formData.append('title', String(title || ''));
    formData.append('description', String(description || ''));
    formData.append('category', String(category || ''));
    formData.append('priority', String(priority || 'Medium'));
    formData.append('user_name', String(userName || ''));
    formData.append('user_barangay', String(userBarangay || ''));
    formData.append('location_address', String(location?.address || ''));
    if (location?.latitude) formData.append('location_lat', String(location.latitude));
    if (location?.longitude) formData.append('location_lng', String(location.longitude));

    if (imageUri) {
      await appendImageFile(formData, 'image', imageUri);
    }

    const token = await getToken();
    const res = await fetch(`${BASE_URL}/concerns`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit concern');
    return data;
  },

  // ── Get concerns (paginated) ─────────────────────────────────────────────
  async getConcerns(params = {}) {
    return apiRequest('/concerns', { params });
  },

  // ── Get map concerns ─────────────────────────────────────────────────────
  async getMapConcerns() {
    return apiRequest('/concerns/map');
  },

  // ── Get a single concern ────────────────────────────────────────────────
  async getConcernById(id) {
    return apiRequest(`/concerns/${id}`);
  },

  // ── Get concerns for a specific user (paginated) ───────────────────────
  async getUserConcerns(userId, params = {}) {
    return apiRequest('/concerns', { params: { ...params, userId } });
  },

  // ── Toggle upvote ───────────────────────────────────────────────────────
  async toggleUpvote(concernId) {
    return apiRequest(`/concerns/${concernId}/upvote`, { method: 'POST' });
  },

  // ── Check if current user has upvoted ──────────────────────────────────
  async hasUserUpvoted(concernId) {
    try {
      const data = await apiRequest(`/concerns/${concernId}`);
      return !!data.is_upvoted_by_me;
    } catch {
      return false;
    }
  },

  // ── Delete a concern ────────────────────────────────────────────────────
  async deleteConcern(id) {
    return apiRequest(`/concerns/${id}`, { method: 'DELETE' });
  },

  // ── AI Pre-submission Check ─────────────────────────────────────────────
  async analyzeDraft(title, description) {
    return apiRequest(`/concerns/analyze`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  },

  // ── AI ID Name Verification Check ───────────────────────────────────────
  async verifyIdName(idImageUrl, name) {
    return apiRequest(`/auth/verify-id-name`, {
      method: 'POST',
      body: JSON.stringify({ idImageUrl, name }),
    });
  },
};
