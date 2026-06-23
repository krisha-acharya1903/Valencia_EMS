import { apiGet, apiPost } from "./api";

export async function getAccountAdministratorAccess() {
  const data = await apiGet("/account-administrator/me");

  return {
    canCreateAccounts: data?.canCreateAccounts === true,
    user: data?.user || null,
  };
}

export async function createAccountByAdministrator(payload) {
  const data = await apiPost("/account-administrator/users", {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    role: payload.role,
    department: payload.department,
    division: payload.division,
    designation: payload.designation,
    phone: payload.phone,
  });

  return data;
}

export async function getAccountCreationLogs() {
  const data = await apiGet("/account-administrator/logs");
  return data?.logs || [];
}