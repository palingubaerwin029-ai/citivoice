import React, { createContext, useContext, useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// ── YOUR FIREBASE CONFIG ───────────────────────────────────────────────────
// Paste your real values from Firebase Console → Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyCijq5i4CbBEovzJCGYhKkCOL4oj2D1rDo",
  authDomain: "citivoice-e83b2.firebaseapp.com",
  projectId: "citivoice-e83b2",
  storageBucket: "citivoice-e83b2.appspot.com",
  messagingSenderId: "489125998465",
  appId: "1:489125998465:web:364a60e6a8cf546ca24280",
};

// ── Initialize Firebase ONCE ───────────────────────────────────────────────
let app;
let auth;
let db;
let storage;

if (getApps().length === 0) {
  // First time — initialize everything
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // Already initialized — just get existing instances
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { auth, db, storage };

// ── Auth Context ───────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            setUser({ uid: firebaseUser.uid, ...snap.data() });
          } else {
            await signOut(auth);
            setUser(null);
          }
        } catch (err) {
          console.log("Auth state error:", err.message);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) {
      await signOut(auth);
      throw new Error("NO_PROFILE");
    }
    return { uid: cred.user.uid, ...snap.data() };
  };

  // ── Register ───────────────────────────────────────────────────────────
  const register = async ({ name, email, password, phone, barangay }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userData = {
      uid: cred.user.uid,
      name,
      email,
      phone: phone || "",
      barangay,
      role: "citizen",
      verificationStatus: "unverified",
      isVerified: false,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", cred.user.uid), userData);
    return userData;
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, db, storage }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
