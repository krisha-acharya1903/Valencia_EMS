import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { createActivityLog, listCollection } from "./demoStore";

export async function getActivityLogs(max = 20) {
  if (!isFirebaseConfigured) {
    return listCollection("activityLogs")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, max);
  }

  const snapshot = await getDocs(query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(max)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function logActivity(payload) {
  if (!isFirebaseConfigured) {
    return createActivityLog(payload);
  }

  const docRef = await addDoc(collection(db, "activityLogs"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...payload };
}
