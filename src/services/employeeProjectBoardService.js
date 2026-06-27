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

async function parseResponse(response, fallbackMessage) {
  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {
      message: text,
    };
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || fallbackMessage);
  }

  return data;
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

  return parseResponse(response, "Request failed.");
}

async function apiFormRequest(path, formData) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Missing authorization token. Please logout and login again.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseResponse(response, "Upload failed.");
}

export async function getEmployeeProjectBoard(projectId) {
  return apiRequest(`/employee/projects/${projectId}/board`, {
    method: "GET",
  });
}

export async function createEmployeeSubtask(taskId, title) {
  return apiRequest("/employee/subtasks", {
    method: "POST",
    body: JSON.stringify({
      taskId,
      title,
    }),
  });
}

export async function submitEmployeeSubtask(subtaskId, payload = {}) {
  const formData = new FormData();

  formData.append("description", payload.description || "");
  formData.append("link", payload.link || "");

  if (payload.file) {
    formData.append("attachment", payload.file);
  }

  return apiFormRequest(`/employee/subtasks/${subtaskId}/submission`, formData);
}

export async function deleteEmployeeSubtask(subtaskId) {
  return apiRequest(`/employee/subtasks/${subtaskId}`, {
    method: "DELETE",
  });
}

export async function downloadEmployeeSubtaskAttachment(subtaskId, filename) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Missing authorization token. Please logout and login again.");
  }

  const response = await fetch(
    `${API_BASE}/employee/subtasks/${subtaskId}/attachment`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const data = await parseResponse(response, "Failed to download attachment.");
    throw new Error(data?.message || "Failed to download attachment.");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename || "subtask-attachment";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
export async function updateEmployeeSubtaskStatus(subtaskId, completed) {
  return apiRequest(`/employee/subtasks/${subtaskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      completed,
    }),
  });
}