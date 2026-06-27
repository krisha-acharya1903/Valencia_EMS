const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TOKEN_KEY = "valencia_auth_token";
const USER_KEY = "valencia_auth_user";
const STORAGE_MODE_KEY = "valencia_auth_storage_mode";

function normalizePath(path) {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function getActiveStorage() {
  const mode = localStorage.getItem(STORAGE_MODE_KEY);

  if (mode === "local") {
    return localStorage;
  }

  return sessionStorage;
}

export function getToken() {
  const activeStorage = getActiveStorage();

  return (
    activeStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(TOKEN_KEY) ||
    ""
  );
}

function getHeaders(extraHeaders = {}) {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

function getFormHeaders(extraHeaders = {}) {
  const token = getToken();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

async function handleResponse(response) {
  const text = await response.text();

  let data = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.details ||
      `API request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export function saveAuthSession(token, user, remember = false) {
  clearAuthSession();

  const storage = remember ? localStorage : sessionStorage;

  localStorage.setItem(STORAGE_MODE_KEY, remember ? "local" : "session");

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(STORAGE_MODE_KEY);

  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const token = getToken();

  if (!token) {
    clearAuthSession();
    return null;
  }

  const activeStorage = getActiveStorage();

  const raw =
    activeStorage.getItem(USER_KEY) ||
    sessionStorage.getItem(USER_KEY) ||
    localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse(response);
}

export async function apiPost(path, body = {}) {
  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function apiPut(path, body = {}) {
  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function apiPatch(path, body = {}) {
  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function apiDelete(path) {
  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  return handleResponse(response);
}

export async function apiPostForm(path, formData) {
  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    method: "POST",
    headers: getFormHeaders(),
    body: formData,
  });

  return handleResponse(response);
}

export async function apiPatchForm(path, formData) {
  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    method: "PATCH",
    headers: getFormHeaders(),
    body: formData,
  });

  return handleResponse(response);
}

/* ---------------- PROJECT HOURS / TIMESHEET APIs ---------------- */

export async function getMyTimeEntries(startDate, endDate) {
  const query = new URLSearchParams();

  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const queryString = query.toString();

  return apiGet(`/time-entries/me${queryString ? `?${queryString}` : ""}`);
}

export async function createTimeEntry(payload) {
  return apiPost("/time-entries", payload);
}

export async function deleteTimeEntry(id) {
  return apiDelete(`/time-entries/${id}`);
}

export async function getProjectHoursSummary(startDate, endDate) {
  const query = new URLSearchParams();

  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const queryString = query.toString();

  return apiGet(
    `/admin/project-hours-summary${queryString ? `?${queryString}` : ""}`
  );
}

export async function getEmployeeProjectHours(userId, startDate, endDate) {
  const query = new URLSearchParams();

  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);

  const queryString = query.toString();

  return apiGet(
    `/admin/project-hours/${userId}${queryString ? `?${queryString}` : ""}`
  );
}

export async function reviewTimeEntry(id, payload) {
  return apiPatch(`/admin/time-entries/${id}/review`, payload);
}