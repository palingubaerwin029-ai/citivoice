// authService.js
// All auth logic lives in AuthContext.js
// This file is kept for backward compatibility with other screens that import it

import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export const AuthService = {
  // Save FCM push token to Firestore
  async updateFCMToken(uid, token) {
    await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
  },
};
