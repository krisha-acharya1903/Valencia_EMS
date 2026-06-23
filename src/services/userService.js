import { apiGet, apiPost, apiPatch } from "./api";

export async function getUsers() {
  const data = await apiGet("/users");
  return data.users || [];
}

export async function getAllUsers() {
  return getUsers();
}

export async function listUsers() {
  return getUsers();
}

export async function getEmployees() {
  return getUsers();
}

export async function getUserById(userId) {
  const users = await getUsers();

  return (
    users.find((user) => String(user.id) === String(userId)) ||
    users.find((user) => String(user.uid) === String(userId)) ||
    null
  );
}

export async function getEmployeeAnalytics() {
  const users = await getUsers();

  const totalEmployees = users.length;
  const activeEmployees = users.filter((user) => user.status === "active").length;
  const blockedEmployees = users.filter((user) => user.status === "blocked").length;

  const departments = [
    ...new Set(users.map((user) => user.department).filter(Boolean)),
  ];

  const byDepartment = departments.map((department) => {
    const departmentUsers = users.filter(
      (user) => user.department === department
    );

    return {
      department,
      total: departmentUsers.length,
      active: departmentUsers.filter((user) => user.status === "active").length,
      blocked: departmentUsers.filter((user) => user.status === "blocked").length,
    };
  });

  const byRole = users.reduce((acc, user) => {
    const role = user.role || "employee";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  return {
    totalEmployees,
    activeEmployees,
    blockedEmployees,
    departments: departments.length,
    byDepartment,
    byRole,
    users,
  };
}

export async function createUser(payload) {
  const data = await apiPost("/auth/register", payload);
  return data.user;
}

export async function addUser(payload) {
  return createUser(payload);
}

export async function updateUser(userId, payload = {}) {
  console.warn(
    "updateUser called but backend update-user route is not connected yet:",
    userId,
    payload
  );

  return {
    success: true,
    updated: false,
    message: "Update user backend route is not connected yet.",
  };
}

export async function updateUserStatus(userId, status) {
  return apiPatch(`/users/${userId}/status`, { status });
}

export async function blockUser(userId) {
  return updateUserStatus(userId, "blocked");
}

export async function unblockUser(userId) {
  return updateUserStatus(userId, "active");
}