import AsyncStorage from "@react-native-async-storage/async-storage";

import { BASE_URL } from "../context/AuthContext";

const getToken = async () => AsyncStorage.getItem("cv_token");

const apiRequest = async (path, options = {}) => {
  const token = await getToken();
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };
  const res  = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

export const ConcernService = {

  // ── Upload an image to the backend ──────────────────────────────────────
  async uploadImage(imageUri) {
    const filename = imageUri.split("/").pop();
    const match    = /\.(\w+)$/.exec(filename);
    const type     = match ? `image/${match[1]}` : "image/jpeg";

    const formData = new FormData();
    formData.append("image", { uri: imageUri, name: filename, type });

    const token = await getToken();
    const res = await fetch(`${BASE_URL}/concerns/upload/id-image`, {
      method:  "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url; // returns the hosted image URL
  },

  // ── Submit a new concern ────────────────────────────────────────────────
  async addConcern({ title, description, category, priority, imageUri, location, userName, userBarangay }) {
    const formData = new FormData();
    formData.append("title",            title);
    formData.append("description",      description);
    formData.append("category",         category);
    formData.append("priority",         priority || "Medium");
    formData.append("user_name",        userName || "");
    formData.append("user_barangay",    userBarangay || "");
    formData.append("location_address", location?.address || "");
    if (location?.latitude)  formData.append("location_lat", String(location.latitude));
    if (location?.longitude) formData.append("location_lng", String(location.longitude));

    if (imageUri) {
      const filename = imageUri.split("/").pop();
      const match    = /\.(\w+)$/.exec(filename);
      const type     = match ? `image/${match[1]}` : "image/jpeg";
      formData.append("image", { uri: imageUri, name: filename, type });
    }

    const token = await getToken();
    const res = await fetch(`${BASE_URL}/concerns`, {
      method:  "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body:    formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit concern");
    return data;
  },

  // ── Get all concerns ────────────────────────────────────────────────────
  async getConcerns() {
    return apiRequest("/concerns");
  },

  // ── Get a single concern ────────────────────────────────────────────────
  async getConcernById(id) {
    return apiRequest(`/concerns/${id}`);
  },

  // ── Get concerns for a specific user ───────────────────────────────────
  async getUserConcerns(userId) {
    const all = await apiRequest("/concerns");
    return all.filter((c) => c.user_id === parseInt(userId, 10));
  },

  // ── Toggle upvote ───────────────────────────────────────────────────────
  async toggleUpvote(concernId) {
    return apiRequest(`/concerns/${concernId}/upvote`, { method: "POST" });
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
    return apiRequest(`/concerns/${id}`, { method: "DELETE" });
  },
};
