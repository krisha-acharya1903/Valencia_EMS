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

export async function checkAccountStatus() {
  const token = getAuthToken();

  if (!token) {
    return {
      success: false,
      code: "NO_TOKEN",
      message: "No active session.",
    };
  }

  const response = await fetch(`${API_BASE}/me/account-status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
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
    return {
      success: false,
      ...(data || {}),
    };
  }

  return data;
}