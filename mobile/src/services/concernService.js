import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

const CONCERNS_COL = "concerns";

export const ConcernService = {
  // ─── Real-time listener ───────────────────────────────────────────────────
  subscribeToConcerns(callback) {
    const q = query(collection(db, CONCERNS_COL), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const concerns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(concerns);
    });
  },

  // ─── Subscribe to user's concerns ────────────────────────────────────────
  subscribeToUserConcerns(userId, callback) {
    const q = query(
      collection(db, CONCERNS_COL),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      const concerns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(concerns);
    });
  },

  // ─── Get single concern ───────────────────────────────────────────────────
  async getConcern(id) {
    const docSnap = await getDoc(doc(db, CONCERNS_COL, id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  // ─── Upload image ─────────────────────────────────────────────────────────
  async uploadImage(uri, concernId) {
    const response = await fetch(uri);
    const blob = await response.blob();
    const imageRef = ref(storage, `concerns/${concernId}/${Date.now()}.jpg`);
    await uploadBytes(imageRef, blob);
    return await getDownloadURL(imageRef);
  },

  // ─── Add concern ──────────────────────────────────────────────────────────
  async addConcern({
    title,
    description,
    category,
    priority,
    imageUri,
    location,
    userId,
    userName,
    userBarangay,
  }) {
    const concernData = {
      title,
      description,
      category,
      priority,
      location,
      userId,
      userName,
      userBarangay,
      status: "Pending",
      adminNote: null,
      imageUrl: null,
      upvotes: 0,
      upvotedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, CONCERNS_COL), concernData);

    // Upload image if provided
    if (imageUri) {
      const imageUrl = await this.uploadImage(imageUri, docRef.id);
      await updateDoc(docRef, { imageUrl });
    }

    return { id: docRef.id, ...concernData };
  },

  // ─── Update concern (admin) ───────────────────────────────────────────────
  async updateConcern(id, updates) {
    await updateDoc(doc(db, CONCERNS_COL, id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // ─── Delete concern ───────────────────────────────────────────────────────
  async deleteConcern(id) {
    await deleteDoc(doc(db, CONCERNS_COL, id));
  },

  // ─── Toggle upvote ────────────────────────────────────────────────────────
  async toggleUpvote(concernId, userId) {
    const concernRef = doc(db, CONCERNS_COL, concernId);
    const concernSnap = await getDoc(concernRef);
    const data = concernSnap.data();
    const isUpvoted = data.upvotedBy?.includes(userId);

    if (isUpvoted) {
      await updateDoc(concernRef, {
        upvotedBy: arrayRemove(userId),
        upvotes: increment(-1),
      });
    } else {
      await updateDoc(concernRef, {
        upvotedBy: arrayUnion(userId),
        upvotes: increment(1),
      });
    }
  },

  // ─── Get stats (admin) ────────────────────────────────────────────────────
  async getStats() {
    const snap = await getDocs(collection(db, CONCERNS_COL));
    const concerns = snap.docs.map((d) => d.data());
    return {
      total: concerns.length,
      pending: concerns.filter((c) => c.status === "Pending").length,
      inProgress: concerns.filter((c) => c.status === "In Progress").length,
      resolved: concerns.filter((c) => c.status === "Resolved").length,
      rejected: concerns.filter((c) => c.status === "Rejected").length,
      byCategory: concerns.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {}),
    };
  },
};
