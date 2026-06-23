import { getToken } from "./api";

const API_BASE = "http://localhost:5000/api";

function getAuthToken() {
  const tokenFromApi = getToken?.();

  if (tokenFromApi && tokenFromApi !== "undefined" && tokenFromApi !== "null") {
    return tokenFromApi;
  }

  const directKeys = [
    "token",
    "authToken",
    "valenciaToken",
    "valencia-token",
    "valencia_auth_token",
    "emsToken",
    "jwt",
    "accessToken",
  ];

  const storages = [localStorage, sessionStorage];

  for (const storage of storages) {
    for (const key of directKeys) {
      const value = storage.getItem(key);

      if (value && value !== "undefined" && value !== "null") {
        return value;
      }
    }

    for (const key of Object.keys(storage)) {
      const value = storage.getItem(key);

      if (!value) continue;

      try {
        const parsed = JSON.parse(value);

        if (parsed?.token) return parsed.token;
        if (parsed?.authToken) return parsed.authToken;
        if (parsed?.accessToken) return parsed.accessToken;
        if (parsed?.jwt) return parsed.jwt;

        if (parsed?.session?.token) return parsed.session.token;
        if (parsed?.auth?.token) return parsed.auth.token;
        if (parsed?.data?.token) return parsed.data.token;
      } catch {
        // Ignore non-JSON storage values
      }
    }
  }

  return "";
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

  const raw = await response.text();

  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed: ${options.method || "GET"} ${path}`;

    throw new Error(message);
  }

  return data;
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function extractOne(data) {
  if (data?.project) return data.project;
  if (data?.data) return data.data;

  return data;
}

function parseMembers(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeProject(project = {}) {
  return {
    ...project,
    id: String(project.id || project.projectId || project.project_id || ""),
    name: project.name || project.title || "Untitled Project",
    description: project.description || "",
    department: project.department || "",
    status: project.status || "active",
    progress: Number(project.progress || 0),
    priority: project.priority || "medium",
    managerId: String(project.managerId || project.manager_id || ""),
    members: parseMembers(project.members),
    startDate: project.startDate || project.start_date || "",
    deadline: project.deadline || project.endDate || project.end_date || "",
    endDate: project.endDate || project.end_date || project.deadline || "",
    createdBy: String(project.createdBy || project.created_by || ""),
    createdAt: project.createdAt || project.created_at || "",
    updatedAt: project.updatedAt || project.updated_at || "",
  };
}

function toApiPayload(payload = {}) {
  return {
    name: payload.name || payload.title || "",
    description: payload.description || "",
    department: payload.department || "",
    status: payload.status || "active",
    progress: Number(payload.progress || 0),
    priority: payload.priority || "medium",
    manager_id: payload.managerId || payload.manager_id || "",
    members: Array.isArray(payload.members)
      ? payload.members.map((item) => String(item))
      : [],
    start_date: payload.startDate || payload.start_date || "",
    end_date: payload.deadline || payload.endDate || payload.end_date || "",
  };
}

export async function getProjects(profile) {
  const data = await apiRequest("/projects", {
    method: "GET",
  });

  return extractList(data).map(normalizeProject);
}

export async function getAllProjects() {
  const data = await apiRequest("/projects", {
    method: "GET",
  });

  return extractList(data).map(normalizeProject);
}

export async function createProject(payload, actor) {
  const data = await apiRequest("/projects", {
    method: "POST",
    body: JSON.stringify(toApiPayload(payload)),
  });

  return normalizeProject(extractOne(data));
}

export async function updateProject(id, updates, actor) {
  if (!id) {
    throw new Error("Project ID is missing.");
  }

  const data = await apiRequest(`/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(toApiPayload(updates)),
  });

  return normalizeProject(extractOne(data));
}

export async function deleteProject(id, actor) {
  if (!id) {
    throw new Error("Project ID is missing.");
  }

  await apiRequest(`/projects/${id}`, {
    method: "DELETE",
  });

  return true;
}

export async function refreshProjectProgress(projectId) {
  return null;
}