import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

export async function getDepartments() {
  const data = await apiGet("/departments");
  return data.departments || [];
}

export async function listDepartments() {
  return getDepartments();
}

export async function createDepartment(name) {
  const finalName = String(name || "").trim();

  if (!finalName) {
    throw new Error("Department name is required.");
  }

  const data = await apiPost("/departments", { name: finalName });
  return data.department;
}

export async function addDepartment(name) {
  return createDepartment(name);
}

export async function updateDepartment(departmentId, payload = {}) {
  const finalName =
    typeof payload === "string"
      ? payload.trim()
      : String(payload.name || "").trim();

  if (!finalName) {
    throw new Error("Department name is required.");
  }

  const data = await apiPatch(`/departments/${departmentId}`, {
    name: finalName,
  });

  return data.department;
}

export async function deleteDepartment(departmentId) {
  const data = await apiDelete(`/departments/${departmentId}`);
  return data;
}