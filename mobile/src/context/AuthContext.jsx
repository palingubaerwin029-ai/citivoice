import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocketService } from '../services/socketService';

// ── Verification status constants ──────────────────────────────────────────
export const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

import { BASE_URL, resolveImageUrl } from '../config/api';
export { BASE_URL, resolveImageUrl };

const apiRequest = async (path, options = {}) => {
  const token = await AsyncStorage.getItem('cv_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (_) {
    if (!res.ok) {
      const error = new Error(`Server temporarily unavailable (${res.status})`);
      error.status = res.status;
      throw error;
    }
    throw new Error('Invalid server response format');
  }
  if (!res.ok) {
    const error = new Error(data.error || 'Request failed');
    error.code = data.error;
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

// ── Auth Context ───────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('cv_token');
        if (token) {
          const userData = await apiRequest('/auth/me');
          if (userData.role === 'admin') {
            await AsyncStorage.multiRemove(['cv_token', 'cv_user']);
            setUser(null);
            return;
          }
          const isBlocked = userData.verification_status !== VERIFICATION_STATUS.VERIFIED;
          setUser({ ...userData, _blocked: isBlocked });
          SocketService.connect();
        }
      } catch {
        await AsyncStorage.multiRemove(['cv_token', 'cv_user']);
        SocketService.disconnect();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────
  const startSession = async ({ token, user: userData }) => {
    if (userData.role === 'admin') {
      await AsyncStorage.multiRemove(['cv_token', 'cv_user']);
      throw new Error('Administrator accounts must access CitiVoice via the Web Admin Console.');
    }
    await AsyncStorage.setItem('cv_token', token);
    await AsyncStorage.setItem('cv_user', JSON.stringify(userData));
    const isBlocked = userData.verification_status !== VERIFICATION_STATUS.VERIFIED;
    const fullUser = { ...userData, _blocked: isBlocked };
    setUser(fullUser);
    SocketService.connect();
    return fullUser;
  };

  const login = async (email, password) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return startSession(result);
  };

  // ── Google Login (backend only accepts already-registered emails) ───
  const loginWithGoogle = async (idToken) => {
    const result = await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    return startSession(result);
  };

  // ── Register ───────────────────────────────────────────────────────────
  const register = async ({
    name,
    email,
    password,
    phone,
    barangay,
    idType,
    idNumber,
    idImageUrl,
    verificationToken,
  }) => {
    const { token, user: userData } = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        phone,
        barangay,
        idType,
        idNumber,
        idImageUrl,
        verificationToken,
      }),
    });
    // Do not set token or user session — citizen must wait for admin verification and log in
    return userData;
  };

  // ── Submit ID for verification ─────────────────────────────────────────
  const submitVerification = async (userId, { idType, idNumber, idImageUrl }) => {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const updated = await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({
        id_type: idType,
        id_number: idNumber,
        id_image_url: idImageUrl,
        verification_status: VERIFICATION_STATUS.PENDING,
        submitted_at: formattedDate,
      }),
    });
    await AsyncStorage.setItem('cv_user', JSON.stringify(updated));
    setUser({ ...updated, _blocked: true });
  };

  // ── Update local user data ─────────────────────────────────────────────
  const updateUserLocal = async (newUserData) => {
    await AsyncStorage.setItem('cv_user', JSON.stringify(newUserData));
    setUser(newUserData);
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = async () => {
    await AsyncStorage.multiRemove(['cv_token', 'cv_user']);
    setUser(null);
    SocketService.disconnect();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        submitVerification,
        updateUserLocal,
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
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
};
