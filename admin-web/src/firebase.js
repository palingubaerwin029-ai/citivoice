import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCijq5i4CbBEovzJCGYhKkCOL4oj2D1rDo",
  authDomain: "citivoice-e83b2.firebaseapp.com",
  projectId: "citivoice-e83b2",
  storageBucket: "citivoice-e83b2.firebasestorage.app",
  messagingSenderId: "489125998465",
  appId: "1:489125998465:web:364a60e6a8cf546ca24280",
  measurementId: "G-JLF17M76VG"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);   // ✅ Web version
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;