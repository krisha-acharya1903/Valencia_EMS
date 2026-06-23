const API_BASE_URL = "http://localhost:5000/api";

const TOKEN_KEY = "valencia_auth_token";
const USER_KEY = "valencia_auth_user";

function clearOldLocalStorageAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("valencia_auth_storage_mode");
}

export function getToken() {
  clearOldLocalStorageAuth();
  return sessionStorage.getItem(TOKEN_KEY);
}

function getHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "API request failed.");
  }

  return data;
}

export function saveAuthSession(token, user) {
  clearAuthSession();

  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("valencia_auth_storage_mode");

  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getStoredUser() {
  const token = getToken();

  if (!token) {
    clearAuthSession();
    return null;
  }

  const raw = sessionStorage.getItem(USER_KEY);

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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: getHeaders(),
  });

  return handleResponse(response);
}

export async function apiPost(path, body = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function apiPatch(path, body = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
}

export async function apiDelete(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: getHeaders(),
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