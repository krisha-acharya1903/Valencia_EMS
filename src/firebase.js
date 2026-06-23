import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB0Uid7pP9Zk_6Vq22dKMjmzfbc_uvOoNM",
  authDomain: "valencia-task-app.firebaseapp.com",
  projectId: "valencia-task-app",
  storageBucket: "valencia-task-app.firebasestorage.app",
  messagingSenderId: "154766772449",
  appId: "1:154766772449:web:ab19177c30765e67638fa0",
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => value && !String(value).startsWith("YOUR_")
);

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/*
  Compatibility exports.
  Your app uses Firebase only for authentication.
  Database is SQLite/backend API, not Firestore.
  Some older service files still import db/storage, so these exports prevent app crash.
*/
export const db = null;
export const storage = null;