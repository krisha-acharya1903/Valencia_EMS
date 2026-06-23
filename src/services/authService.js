import {
  apiGet,
  apiPost,
  saveAuthSession,
  clearAuthSession,
  getToken,
} from "./api";

export function resolveLandingPath(profile) {
  const role = String(profile?.role || "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .toLowerCase();

  if (role === "superadmin") {
    return "/superadmin";
  }

  if (role === "admin") {
    return "/admin";
  }

  if (role === "manager") {
    return "/admin";
  }

  if (role === "employee") {
    return "/dashboard";
  }

  return "/dashboard";
}

export function subscribeToFirebaseAuth(callback) {
  const token = getToken();

  if (!token) {
    clearAuthSession();
    callback(null);
    return () => {};
  }

  apiGet("/me")
    .then((data) => {
      if (data?.user) {
        callback(data.user);
      } else {
        clearAuthSession();
        callback(null);
      }
    })
    .catch(() => {
      clearAuthSession();
      callback(null);
    });

  return () => {};
}

export async function login(identifier, password) {
  const email = String(identifier || "").trim().toLowerCase();

  clearAuthSession();

  const data = await apiPost("/auth/login", {
    email,
    password,
  });

  if (!data?.token || !data?.user) {
    clearAuthSession();
    throw new Error("Invalid login response from server.");
  }

  saveAuthSession(data.token, data.user);

  return data.user;
}

export async function registerUser(payload) {
  const clean = {
    name: String(payload.name || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    phone: String(payload.phone || "").trim(),
    password: String(payload.password || ""),
    role: payload.role || "employee",
    department: payload.department || "Sales team",
    designation: payload.designation || "Team Member",
  };

  if (!clean.name) {
    throw new Error("Full name is required.");
  }

  if (!clean.email) {
    throw new Error("Email is required.");
  }

  if (clean.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (!/^\d{10}$/.test(clean.phone)) {
    throw new Error("Phone number must be exactly 10 digits.");
  }

  clearAuthSession();

  const data = await apiPost("/auth/register", clean);

  if (!data?.token || !data?.user) {
    clearAuthSession();
    throw new Error("Invalid register response from server.");
  }

  saveAuthSession(data.token, data.user);

  return data.user;
}

export async function logoutUser() {
  clearAuthSession();
}