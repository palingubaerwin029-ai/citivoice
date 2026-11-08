import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import { BASE_URL, mobileApi } from '../context/AuthContext';

const getToken = async () => AsyncStorage.getItem('cv_token');

const apiRequest = (path, options = {}) => mobileApi.request(path, options);

const uploadWithCatch = async (url, fileUri, options) => {
  try {
    const uploadResult = await FileSystem.uploadAsync(url, fileUri, options);
    let data = {};
    try {
      data = JSON.parse(uploadResult.body);
    } catch (_) {}
    if (uploadResult.status >= 400) {
      const err = new Error(data.message || data.error || `Upload failed (${uploadResult.status})`);
      err.status = uploadResult.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.status) throw err;
    const netError = new Error('Unable to connect to the CitiVoice server. Please check your internet connection.');
    netError.status = 0;
    netError.isNetworkError = true;
    netError.originalError = err;
    throw netError;
  }
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

    const data = await uploadWithCatch(
      `${BASE_URL}/concerns/upload/id-image`,
      uploadUri,
      {
        httpMethod: 'POST',
        uploadType: 1, // FileSystemUploadType.MULTIPART
        fieldName: 'image',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      }
    );
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
      return await uploadWithCatch(
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
    }

    return await mobileApi.post('/concerns', {
      title: String(title || ''),
      description: String(description || ''),
      category: String(category || ''),
      priority: String(priority || 'Medium'),
      user_name: String(userName || ''),
      user_barangay: String(userBarangay || ''),
      location_address: String(location?.address || ''),
      location_lat: location?.latitude ? location.latitude : null,
      location_lng: location?.longitude ? location.longitude : null,
    });
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

    const params = {};
    if (title !== undefined) params.title = String(title || '');
    if (description !== undefined) params.description = String(description || '');
    if (category !== undefined) params.category = String(category || '');
    if (location?.address !== undefined) params.location_address = String(location.address || '');
    if (location?.latitude !== undefined) params.location_lat = location.latitude;
    if (location?.longitude !== undefined) params.location_lng = location.longitude;

    if (imageUri && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
      const uploadParams = {};
      Object.keys(params).forEach((k) => {
        uploadParams[k] = String(params[k] ?? '');
      });
      return await uploadWithCatch(
        `${BASE_URL}/concerns/${id}/edit`,
        imageUri,
        {
          httpMethod: 'PUT',
          uploadType: 1,
          fieldName: 'image',
          headers,
          parameters: uploadParams,
        }
      );
    }

    return apiRequest(`/concerns/${id}/edit`, {
      method: 'PUT',
      body: JSON.stringify(params),
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

    return await uploadWithCatch(
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
  },

  // ── AI ID Details Verification Check (Name & ID Number) ────────────────
  async verifyIdName(idImageUrl, name = '', idNumber = '', idType = '') {
    return apiRequest(`/auth/verify-id-name`, {
      method: 'POST',
      body: JSON.stringify({ idImageUrl, name, idNumber, idType }),
    });
  },
};
