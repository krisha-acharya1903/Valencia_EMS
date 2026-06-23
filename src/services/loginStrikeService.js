import { apiGet, apiPost } from "./api";

export async function getLoginStrikes() {
  const data = await apiGet("/login-strikes");
  return data?.loginStrikes || [];
}

export async function runMissedLoginStrikeCheck() {
  const data = await apiPost("/login-strikes/run-daily-check", {});
  return data;
}

export async function clearLoginStrikes(userId) {
  const data = await apiPost(`/login-strikes/${userId}/clear`, {});
  return data;
}