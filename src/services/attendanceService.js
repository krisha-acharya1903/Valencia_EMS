import { getToken } from "./api";

const API_BASE = "http://localhost:5000/api";

function getAuthToken() {
  const tokenFromApi = getToken?.();

  if (tokenFromApi && tokenFromApi !== "undefined" && tokenFromApi !== "null") {
    return tokenFromApi;
  }

  const possibleKeys = [
    "token",
    "authToken",
    "valenciaToken",
    "valencia-token",
    "valencia_auth_token",
    "emsToken",
    "jwt",
    "accessToken",
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of possibleKeys) {
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

function normalizeAttendance(item = {}) {
  const type = item.type || item.attendanceType || item.attendance_type || "";
  const createdAt = item.createdAt || item.created_at || item.timestamp || "";

  return {
    ...item,
    id: String(item.id || item.attendanceId || item.attendance_id || ""),
    userId: String(item.userId || item.user_id || ""),
    userName: item.userName || item.user_name || "",
    employeeName:
      item.employeeName || item.employee_name || item.user_name || "",
    department: item.department || "",
    type,
    date: item.date || createdAt || "",
    checkIn:
      item.checkIn ||
      item.check_in ||
      item.clockIn ||
      item.clock_in ||
      (type === "Check In" ? createdAt : ""),
    checkOut:
      item.checkOut ||
      item.check_out ||
      item.clockOut ||
      item.clock_out ||
      (type === "Check Out" ? createdAt : ""),
    totalHours: Number(item.totalHours || item.total_hours || item.hours || 0),
    status:
      item.status ||
      (type === "Check In"
        ? "present"
        : type === "Check Out"
        ? "checked out"
        : "present"),
    location: item.location || item.locationName || item.location_name || "-",
    createdAt,
  };
}

function normalizeAppLogin(item = {}) {
  return {
    ...item,
    id: String(item.id || item.loginId || item.login_id || ""),
    userId: String(item.userId || item.user_id || ""),
    userName: item.userName || item.user_name || "",
    userEmail: item.userEmail || item.user_email || "",
    role: item.role || "",
    department: item.department || "",
    loginType: item.loginType || item.login_type || "login",
    ipAddress: item.ipAddress || item.ip_address || "",
    userAgent: item.userAgent || item.user_agent || "",
    createdAt: item.createdAt || item.created_at || "",
  };
}

function extractAttendance(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.attendance)) return data.attendance;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function extractAppLogins(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.appLogins)) return data.appLogins;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export async function getAttendanceForUser(userId) {
  const allAttendance = await getAllAttendance();

  return allAttendance.filter(
    (item) => String(item.userId || item.user_id || "") === String(userId)
  );
}

export async function getAllAttendance() {
  const data = await apiRequest("/attendance", {
    method: "GET",
  });

  return extractAttendance(data).map(normalizeAttendance);
}

export async function getAppLogins() {
  const data = await apiRequest("/app-logins", {
    method: "GET",
  });

  return extractAppLogins(data).map(normalizeAppLogin);
}

export async function checkIn(profile) {
  const data = await apiRequest("/attendance", {
    method: "POST",
    body: JSON.stringify({
      type: "Check In",
    }),
  });

  return normalizeAttendance(data?.attendance || data?.data || data);
}

export async function checkOut(profile) {
  const data = await apiRequest("/attendance", {
    method: "POST",
    body: JSON.stringify({
      type: "Check Out",
    }),
  });

  return normalizeAttendance(data?.attendance || data?.data || data);
}