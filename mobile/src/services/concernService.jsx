import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

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
  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (_) {
    if (!res.ok) {
      throw new Error(`Server temporarily unavailable (${res.status})`);
    }
    throw new Error('Invalid server response format');
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const ConcernService = {
  // ── Upload an image to the backend ──────────────────────────────────────
  async uploadImage(imageUri) {
    const token = await getToken();
    let uploadUri = imageUri;
    try {
      const manip = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1280 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (manip?.uri) uploadUri = manip.uri;
    } catch (_) {
      // Fallback to original imageUri if manipulation fails
    }

    const uploadResult = await FileSystem.uploadAsync(
      `${BASE_URL}/concerns/upload/id-image`,
      uploadUri,
      {
        httpMethod: 'POST',
        uploadType: 1, // FileSystemUploadType.MULTIPART
        fieldName: 'image',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }
    );
    let data = {};
    try {
      data = JSON.parse(uploadResult.body);
    } catch (_) {}
    if (uploadResult.status >= 400) throw new Error(data.error || 'Upload failed');
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
    const token = await getToken();
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    if (imageUri) {
      const uploadResult = await FileSystem.uploadAsync(
        `${BASE_URL}/concerns`,
        imageUri,
        {
          httpMethod: 'POST',
          uploadType: 1, // FileSystemUploadType.MULTIPART
          fieldName: 'image',
          headers,
          parameters: {
            title: String(title || ''),
            description: String(description || ''),
            category: String(category || ''),
            priority: String(priority || 'Medium'),
            user_name: String(userName || ''),
            user_barangay: String(userBarangay || ''),
            location_address: String(location?.address || ''),
            location_lat: location?.latitude ? String(location.latitude) : '',
            location_lng: location?.longitude ? String(location.longitude) : '',
          },
        }
      );
      let data = {};
      try {
        data = JSON.parse(uploadResult.body);
      } catch (_) {}
      if (uploadResult.status >= 400) {
        throw new Error(data.error || 'Failed to submit concern');
      }
      return data;
    }

    // Text-only submission without image
    const res = await fetch(`${BASE_URL}/concerns`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: String(title || ''),
        description: String(description || ''),
        category: String(category || ''),
        priority: String(priority || 'Medium'),
        user_name: String(userName || ''),
        user_barangay: String(userBarangay || ''),
        location_address: String(location?.address || ''),
        location_lat: location?.latitude ? location.latitude : null,
        location_lng: location?.longitude ? location.longitude : null,
      }),
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

  // ── Edit concern details (Citizen or Admin) ─────────────────────────────
  async editConcern(id, { title, description, category, location, imageUri }) {
    const token = await getToken();
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    if (imageUri && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
      const uploadResult = await FileSystem.uploadAsync(
        `${BASE_URL}/concerns/${id}/edit`,
        imageUri,
        {
          httpMethod: 'PUT',
          uploadType: 1,
          fieldName: 'image',
          headers,
          parameters: {
            title: String(title || ''),
            description: String(description || ''),
            category: String(category || ''),
            location_address: String(location?.address || ''),
            location_lat: location?.latitude ? String(location.latitude) : '',
            location_lng: location?.longitude ? String(location.longitude) : '',
          },
        }
      );
      let data = {};
      try {
        data = JSON.parse(uploadResult.body);
      } catch (_) {}
      if (uploadResult.status >= 400) {
        throw new Error(data.error || 'Failed to update concern');
      }
      return data;
    }

    return apiRequest(`/concerns/${id}/edit`, {
      method: 'PUT',
      body: JSON.stringify({
        title: String(title || ''),
        description: String(description || ''),
        category: String(category || ''),
        location_address: String(location?.address || ''),
        location_lat: location?.latitude ? location.latitude : null,
        location_lng: location?.longitude ? location.longitude : null,
      }),
    });
  },

  // ── Get concern edit history ───────────────────────────────────────────
  async getConcernHistory(id) {
    return apiRequest(`/concerns/${id}/history`);
  },

  // ── Delete a concern ────────────────────────────────────────────────────
  async deleteConcern(id) {
    return apiRequest(`/concerns/${id}`, { method: 'DELETE' });
  },

  // ── Get concern statistics (accurate DB totals) ─────────────────────────
  async getStats(userId = null) {
    const params = userId ? { userId } : {};
    return apiRequest('/concerns/stats', { params });
  },

  // ── AI Pre-submission Check ─────────────────────────────────────────────
  async analyzeDraft(title, description) {
    return apiRequest(`/concerns/analyze`, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  },

  // ── AI Image Alignment Check ────────────────────────────────────────────
  async verifyImageAlignment(imageUri, title = '', description = '', category = '') {
    const token = await getToken();
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const uploadResult = await FileSystem.uploadAsync(
      `${BASE_URL}/concerns/verify-image`,
      imageUri,
      {
        httpMethod: 'POST',
        uploadType: 1, // FileSystemUploadType.MULTIPART
        fieldName: 'image',
        headers,
        parameters: {
          title: String(title || ''),
          description: String(description || ''),
          category: String(category || ''),
        },
      }
    );
    let data = {};
    try {
      data = JSON.parse(uploadResult.body);
    } catch (_) {}
    if (uploadResult.status >= 400) {
      throw new Error(data.error || 'Failed to verify image');
    }
    return data;
  },

  // ── AI ID Details Verification Check (Name & ID Number) ────────────────
  async verifyIdName(idImageUrl, name = '', idNumber = '', idType = '') {
    return apiRequest(`/auth/verify-id-name`, {
      method: 'POST',
      body: JSON.stringify({ idImageUrl, name, idNumber, idType }),
    });
  },
};
