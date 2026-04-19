import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Verification status constants ──────────────────────────────────────────
export const VERIFICATION_STATUS = {
  UNVERIFIED: "unverified",
  PENDING:    "pending",
  VERIFIED:   "verified",
  REJECTED:   "rejected",
};

import Constants from "expo-constants";

// ── API base URL (Prioritize Env Var for Tunnels, then local LAN IP) ────────
const getBaseUrl = () => {
  // Use EXPO_PUBLIC_API_URL from .env if defined (useful for ngrok/localtunnel)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants?.expoConfig?.hostUri;
  if (hostUri) {
    return `http://${hostUri.split(':')[0]}:5000/api`;
  }
  return "http://10.0.2.2:5000/api"; // Default Android emulator fallback
};

export const BASE_URL = getBaseUrl();

// Map localhost backend URLs to the dynamically resolved IP for mobile
export const resolveImageUrl = (url) => {
  if (!url) return null;
  // If the backend saved a localhost URL, swap it for the mobile's resolved BASE_URL IP
  if (url.startsWith("http://localhost:5000") || url.startsWith("http://127.0.0.1:5000")) {
    const backendBase = BASE_URL.replace("/api", ""); // e.g., http://192.168.1.5:5000
    return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000/, backendBase);
  }
  // If it's a relative path starting with /uploads
  if (url.startsWith("/uploads/")) {
    return `${BASE_URL.replace("/api", "")}${url}`;
  }
  return url;
};

const apiRequest = async (path, options = {}) => {
  const token = await AsyncStorage.getItem("cv_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

// ── Auth Context ───────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("cv_token");
        if (token) {
          const userData = await apiRequest("/auth/me");
          const isBlocked = userData.role !== "admin" && userData.verification_status !== VERIFICATION_STATUS.VERIFIED;
          setUser({ ...userData, _blocked: isBlocked });
        }
      } catch {
        await AsyncStorage.multiRemove(["cv_token", "cv_user"]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { token, user: userData } = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem("cv_token", token);
    await AsyncStorage.setItem("cv_user", JSON.stringify(userData));
    const isBlocked = userData.role !== "admin" && userData.verification_status !== VERIFICATION_STATUS.VERIFIED;
    const fullUser = { ...userData, _blocked: isBlocked };
    setUser(fullUser);
    return fullUser;
  };

  // ── Register ───────────────────────────────────────────────────────────
  const register = async ({ name, email, password, phone, barangay }) => {
    const { token, user: userData } = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone, barangay }),
    });
    await AsyncStorage.setItem("cv_token", token);
    await AsyncStorage.setItem("cv_user", JSON.stringify(userData));
    setUser({ ...userData, _blocked: true }); // newly registered → blocked until verified
    return userData;
  };

  // ── Submit ID for verification ─────────────────────────────────────────
  const submitVerification = async (userId, { idType, idNumber, idImageUrl }) => {
    const updated = await apiRequest(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({
        id_type:             idType,
        id_number:           idNumber,
        id_image_url:        idImageUrl,
        verification_status: VERIFICATION_STATUS.PENDING,
        submitted_at:        new Date().toISOString(),
      }),
    });
    await AsyncStorage.setItem("cv_user", JSON.stringify(updated));
    setUser({ ...updated, _blocked: true });
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = async () => {
    await AsyncStorage.multiRemove(["cv_token", "cv_user"]);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        submitVerification,
        VERIFICATION_STATUS,
        apiRequest,
        BASE_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// ── Standalone API helper for services ────────────────────────────────────
// (services import this instead of Firebase)
export const mobileApi = {
  request: apiRequest,
  get:    (path)        => apiRequest(path),
  post:   (path, body)  => apiRequest(path, { method:"POST",   body:JSON.stringify(body) }),
  put:    (path, body)  => apiRequest(path, { method:"PUT",    body:JSON.stringify(body) }),
  patch:  (path, body)  => apiRequest(path, { method:"PATCH",  body:JSON.stringify(body) }),
  delete: (path)        => apiRequest(path, { method:"DELETE" }),
};
