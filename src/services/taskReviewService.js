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
    data = {
      message: text,
    };
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request failed.");
  }

  return data;
}

export async function reviewTask(taskId, approved) {
  return apiRequest(`/tasks/${taskId}/review`, {
    method: "PATCH",
    body: JSON.stringify({
      approved,
    }),
  });
}