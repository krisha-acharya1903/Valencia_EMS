import { getToken } from "./api";

const API_BASE = "http://localhost:5000/api";

function getAuthToken() {
  const tokenFromApi = getToken?.();

  if (tokenFromApi && tokenFromApi !== "undefined" && tokenFromApi !== "null") {
    return tokenFromApi;
  }

  return (
    localStorage.getItem("valencia_auth_token") ||
    sessionStorage.getItem("valencia_auth_token") ||
    ""
  );
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Missing authorization token. Please logout and login again.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request failed.");
  }

  return data;
}

function normalizeEmployee(user = {}) {
  return {
    id: String(user.id || user.userId || user.user_id || ""),
    name: user.name || user.fullName || user.full_name || user.email || "User",
    email: user.email || "",
    role: user.role || "employee",
    department:
      user.department ||
      user.departmentName ||
      user.department_name ||
      user.division ||
      "Software Team",
    designation: user.designation || user.position || "",
    status: user.status || "active",
    isBlocked: Boolean(user.isBlocked || user.status === "blocked"),
    createdAt: user.createdAt || user.created_at || "",
    updatedAt: user.updatedAt || user.updated_at || "",
  };
}

function extractEmployees(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export async function getJaySoftwareEmployees() {
  const data = await apiRequest("/jay-more/software-employees", {
    method: "GET",
  });

  return extractEmployees(data).map(normalizeEmployee);
}

export async function toggleJayEmployeeBlock(userId) {
  const data = await apiRequest(`/jay-more/software-employees/${userId}/block`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  return normalizeEmployee(data?.employee || data?.user || data);
}

export async function resetJayEmployeePassword(userId, password) {
  return apiRequest(`/jay-more/software-employees/${userId}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function deleteJayEmployee(userId) {
  return apiRequest(`/jay-more/software-employees/${userId}`, {
    method: "DELETE",
  });
}