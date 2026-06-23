import admin from "firebase-admin";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountPath) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT path is missing in .env");
}

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    `Firebase service account file not found at ${serviceAccountPath}. Add firebase-service-account.json inside backend folder.`
  );
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firebaseAdmin = admin;

export async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing Firebase authorization token",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Empty Firebase token",
      });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    req.firebaseUser = decoded;
    next();
  } catch (error) {
    console.error("Firebase token verification failed:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired Firebase token",
    });
  }
}