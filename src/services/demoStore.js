import { seedData } from "../data/seedData";

const STORAGE_KEY = "valencia-ems-demo-store-v2";
const SESSION_KEY = "valencia-ems-demo-session-v2";

const clone = (value) => JSON.parse(JSON.stringify(value));

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

const now = () => new Date().toISOString();

const makeId = (collectionName) => {
  const random = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${collectionName}-${random}`;
};

export function getStore() {
  if (!canUseStorage()) {
    return clone(seedData);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return clone(seedData);
  }

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return clone(seedData);
  }
}

export function saveStore(store) {
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event("valencia-store-updated"));
  }
  return clone(store);
}

export function resetStore() {
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
  }
  return clone(seedData);
}

export function listCollection(collectionName) {
  const store = getStore();
  return clone(store[collectionName] || []);
}

export function getRecord(collectionName, id) {
  return listCollection(collectionName).find((item) => item.id === id || item.uid === id) || null;
}

export function createRecord(collectionName, data) {
  const store = getStore();
  const collection = store[collectionName] || [];
  const idKey = collectionName === "users" ? "uid" : "id";
  const record = {
    ...data,
    [idKey]: data[idKey] || data.id || makeId(collectionName),
    createdAt: data.createdAt || now(),
    updatedAt: now(),
  };
  store[collectionName] = [record, ...collection];
  saveStore(store);
  return clone(record);
}

export function updateRecord(collectionName, id, updates) {
  const store = getStore();
  const collection = store[collectionName] || [];
  const idKey = collectionName === "users" ? "uid" : "id";
  let updated = null;

  store[collectionName] = collection.map((item) => {
    if (item[idKey] !== id && item.id !== id && item.uid !== id) {
      return item;
    }
    updated = { ...item, ...updates, updatedAt: now() };
    return updated;
  });

  saveStore(store);
  return clone(updated);
}

export function deleteRecord(collectionName, id) {
  const store = getStore();
  const collection = store[collectionName] || [];
  const idKey = collectionName === "users" ? "uid" : "id";
  store[collectionName] = collection.filter((item) => item[idKey] !== id && item.id !== id && item.uid !== id);
  saveStore(store);
}

export function setSession(profile) {
  if (canUseStorage()) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  }
}

export function getSession() {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  if (canUseStorage()) {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export function createActivityLog({ type, message, userId, relatedId = "", relatedType = "" }) {
  return createRecord("activityLogs", {
    id: makeId("log"),
    type,
    message,
    userId,
    relatedId,
    relatedType,
    createdAt: now(),
  });
}

export function recalculateProjectProgress(projectId) {
  const tasks = listCollection("tasks").filter((task) => task.projectId === projectId);
  const average = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + Number(task.progress || 0), 0) / tasks.length) : 0;
  return updateRecord("projects", projectId, { progress: average });
}

export function enrichTask(task) {
  const users = listCollection("users");
  const projects = listCollection("projects");
  const submissions = listCollection("taskSubmissions");
  return {
    ...task,
    employee: users.find((user) => user.uid === task.assignedTo),
    assigner: users.find((user) => user.uid === task.assignedBy),
    project: projects.find((project) => project.id === task.projectId),
    submission: submissions.find((submission) => submission.taskId === task.id),
  };
}

export function getTeamUserIds(profile) {
  if (!profile) {
    return [];
  }

  if (profile.role === "admin") {
    return listCollection("users").map((user) => user.uid);
  }

  if (profile.role === "manager") {
    return listCollection("users")
      .filter((user) => user.managerId === profile.uid || user.uid === profile.uid)
      .map((user) => user.uid);
  }

  return [profile.uid];
}

export function userCanAccessProject(profile, project) {
  if (!profile || !project) {
    return false;
  }
  if (profile.role === "admin") {
    return true;
  }
  return project.managerId === profile.uid || project.members?.includes(profile.uid);
}

export function userCanAccessTask(profile, task) {
  if (!profile || !task) {
    return false;
  }
  if (profile.role === "admin") {
    return true;
  }
  if (task.assignedTo === profile.uid || task.assignedBy === profile.uid) {
    return true;
  }
  const project = getRecord("projects", task.projectId);
  return userCanAccessProject(profile, project);
}

export function taskIsOverdue(task) {
  if (!task?.dueDate || ["completed", "review"].includes(task.status)) {
    return false;
  }
  return new Date(task.dueDate) < new Date();
}
