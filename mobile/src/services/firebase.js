// firebase.js
// Firebase is initialized in AuthContext.js
// This file safely retrieves the existing instances

import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// getApp() returns the already-initialized app from AuthContext
// This will NOT cause auth/already-initialized error
const app = getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
