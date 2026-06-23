import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { createRecord, listCollection, updateRecord } from "./demoStore";

function canReceive(profile, notification) {
  if (!profile) {
    return false;
  }
  if (profile.role === "admin") {
    return true;
  }
  if (notification.userId && notification.userId === profile.uid) {
    return true;
  }
  if (notification.audience === "department") {
    return notification.targetDepartment === profile.department;
  }
  return notification.audience === "all";
}

export function getNotificationBadgeTone(notifications) {
  const unread = notifications.filter((item) => !item.read);
  const hasWarning = unread.some((item) => item.type === "warning");
  const hasStandard = unread.some((item) => item.type !== "warning");

  if (hasWarning) {
    return { tone: "red", className: "bg-red-600", label: hasStandard ? "Mixed alerts" : "Warnings" };
  }
  if (hasStandard) {
    return { tone: "yellow", className: "bg-yellow-400", label: "Notifications" };
  }
  return { tone: "none", className: "bg-slate-300", label: "No unread alerts" };
}

export async function getNotifications(profile) {
  if (!isFirebaseConfigured) {
    return listCollection("notifications")
      .filter((notification) => canReceive(profile, notification))
      .map((notification) => ({
        ...notification,
        read: Boolean(notification.read || notification.readBy?.includes(profile.uid)),
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const snapshot = await getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc")));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((notification) => canReceive(profile, notification))
    .map((notification) => ({
      ...notification,
      read: Boolean(notification.read || notification.readBy?.includes(profile.uid)),
    }));
}

export async function sendNotification(actor, payload) {
  if (actor?.role !== "admin") {
    throw new Error("Only admins can send notifications.");
  }

  const clean = {
    createdBy: actor.uid,
    audience: payload.audience || "all",
    targetDepartment: payload.audience === "department" ? payload.targetDepartment : "",
    type: payload.type || "notification",
    title: payload.title.trim(),
    message: payload.message.trim(),
    readBy: [],
  };

  if (!clean.title || !clean.message) {
    throw new Error("Notification title and message are required.");
  }
  if (clean.audience === "department" && !clean.targetDepartment) {
    throw new Error("Select a department for department notifications.");
  }

  if (!isFirebaseConfigured) {
    return createRecord("notifications", clean);
  }

  const docRef = await addDoc(collection(db, "notifications"), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: docRef.id, ...clean };
}

export async function markNotificationsRead(profile) {
  const notifications = await getNotifications(profile);

  if (!isFirebaseConfigured) {
    notifications
      .filter((item) => !item.read)
      .forEach((item) => updateRecord("notifications", item.id, { readBy: Array.from(new Set([...(item.readBy || []), profile.uid])) }));
    return;
  }

  await Promise.all(
    notifications
      .filter((item) => !item.read)
      .map((item) => updateDoc(doc(db, "notifications", item.id), { readBy: Array.from(new Set([...(item.readBy || []), profile.uid])) })),
  );
}
