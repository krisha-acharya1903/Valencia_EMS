import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

function extractProjects(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.assignedProjects)) return response.assignedProjects;
  if (Array.isArray(response?.assigned_projects)) return response.assigned_projects;
  if (Array.isArray(response?.assignedTasks)) return response.assignedTasks;
  if (Array.isArray(response?.assigned_tasks)) return response.assigned_tasks;
  if (Array.isArray(response?.tasks)) return response.tasks;
  return [];
}

function extractProject(response) {
  if (response?.project) return response.project;
  if (response?.data) return response.data;
  return response;
}

function safeArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
      return [];
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (typeof value === "object") return [value];

  return [value];
}

function normalizeMembers(project = {}) {
  return safeArray(
    project.members ||
      project.member ||
      project.assignedTo ||
      project.assigned_to ||
      project.assignee ||
      project.assignees ||
      project.assignedMembers ||
      project.assigned_members ||
      project.assignedUsers ||
      project.assigned_users ||
      project.assignedEmployees ||
      project.assigned_employees ||
      project.selectedUsers ||
      project.selected_users ||
      project.selectedEmployees ||
      project.selected_employees ||
      project.memberIds ||
      project.member_ids ||
      project.assignedToIds ||
      project.assigned_to_ids ||
      project.assignedUserIds ||
      project.assigned_user_ids ||
      project.assignedEmployeeIds ||
      project.assigned_employee_ids ||
      project.employeeIds ||
      project.employee_ids ||
      project.users ||
      project.employees ||
      []
  );
}

function getMemberId(member) {
  if (!member) return "";

  if (typeof member === "object") {
    return String(
      member.id ||
        member._id ||
        member.uid ||
        member.userId ||
        member.user_id ||
        member.employeeId ||
        member.employee_id ||
        member.email ||
        ""
    ).trim();
  }

  return String(member).trim();
}

function normalizeProjectPayload(project = {}) {
  const members = normalizeMembers(project);
  const employeeIds = members.map(getMemberId).filter(Boolean);

  return {
    ...project,

    name: project.name || project.title || project.projectName || "",
    title: project.title || project.name || project.projectName || "",
    projectName: project.projectName || project.name || project.title || "",
    project_name: project.project_name || project.projectName || project.name || project.title || "",

    description: project.description || project.details || "",
    details: project.details || project.description || "",

    department:
      project.department || project.division || project.departmentName || "",
    departmentName:
      project.departmentName || project.department || project.division || "",
    department_name:
      project.department_name ||
      project.departmentName ||
      project.department ||
      project.division ||
      "",
    division:
      project.division || project.department || project.departmentName || "",

    status: project.status || "active",
    priority: project.priority || "medium",

    startDate: project.startDate || project.start_date || "",
    start_date: project.start_date || project.startDate || "",

    endDate: project.endDate || project.end_date || project.deadline || "",
    end_date: project.end_date || project.endDate || project.deadline || "",
    deadline: project.deadline || project.endDate || project.end_date || "",
    dueDate: project.dueDate || project.due_date || project.deadline || project.endDate || "",
    due_date: project.due_date || project.dueDate || project.deadline || project.end_date || "",

    progress: Number(project.progress || project.progressPercent || project.progress_percent || 0),

    managerId: project.managerId || project.manager_id || null,
    manager_id: project.manager_id || project.managerId || null,

    members,
    member: members,

    assignedTo: members,
    assigned_to: members,

    assignedMembers: members,
    assigned_members: members,

    assignedUsers: members,
    assigned_users: members,

    assignedEmployees: members,
    assigned_employees: members,

    selectedUsers: members,
    selected_users: members,

    selectedEmployees: members,
    selected_employees: members,

    users: members,
    employees: members,

    employeeIds,
    employee_ids: employeeIds,

    assignedToIds: employeeIds,
    assigned_to_ids: employeeIds,

    assignedUserIds: employeeIds,
    assigned_user_ids: employeeIds,

    assignedEmployeeIds: employeeIds,
    assigned_employee_ids: employeeIds,

    memberIds: employeeIds,
    member_ids: employeeIds,
  };
}

async function tryProjectEndpoints(paths) {
  let lastError = null;

  for (const path of paths) {
    try {
      const response = await apiGet(path);
      return extractProjects(response);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No compatible employee projects endpoint found.");
}

/* ---------------- EMPLOYEE-SCOPED PROJECT APIs ---------------- */

export async function getMyProjects() {
  return tryProjectEndpoints([
    "/employees/me/projects",
    "/employee/me/projects",
    "/projects/me",
    "/me/projects",
    "/tasks/my-tasks",
    "/tasks/me",
  ]);
}

export async function getEmployeeProjects() {
  return getMyProjects();
}

export async function getAssignedProjects() {
  return getMyProjects();
}

export async function getMyTasks() {
  return tryProjectEndpoints([
    "/tasks/my-tasks",
    "/tasks/me",
    "/employees/me/tasks",
    "/employee/me/tasks",
    "/me/tasks",
  ]);
}

/* ---------------- GENERAL PROJECT APIs ---------------- */

export async function getProjects() {
  const response = await apiGet("/projects");
  return extractProjects(response);
}

export async function getAllProjects() {
  const response = await apiGet("/projects");
  return extractProjects(response);
}

export async function fetchProjects() {
  const response = await apiGet("/projects");
  return extractProjects(response);
}

export async function getProjectById(projectId) {
  const response = await apiGet(`/projects/${projectId}`);
  return extractProject(response);
}

export async function getProject(projectId) {
  const response = await apiGet(`/projects/${projectId}`);
  return extractProject(response);
}

export async function createProject(project) {
  const response = await apiPost("/projects", normalizeProjectPayload(project));
  return extractProject(response);
}

export async function addProject(project) {
  const response = await apiPost("/projects", normalizeProjectPayload(project));
  return extractProject(response);
}

export async function saveProject(projectOrId, maybeProject) {
  if (maybeProject) {
    const response = await apiPatch(
      `/projects/${projectOrId}`,
      normalizeProjectPayload(maybeProject)
    );
    return extractProject(response);
  }

  const response = await apiPost(
    "/projects",
    normalizeProjectPayload(projectOrId)
  );
  return extractProject(response);
}

export async function updateProject(projectId, project) {
  const response = await apiPatch(
    `/projects/${projectId}`,
    normalizeProjectPayload(project)
  );
  return extractProject(response);
}

export async function editProject(projectId, project) {
  const response = await apiPatch(
    `/projects/${projectId}`,
    normalizeProjectPayload(project)
  );
  return extractProject(response);
}

export async function deleteProject(projectId) {
  return apiDelete(`/projects/${projectId}`);
}

export async function removeProject(projectId) {
  return apiDelete(`/projects/${projectId}`);
}

export async function pauseProject(projectId, project = {}) {
  const response = await apiPatch(`/projects/${projectId}`, {
    ...normalizeProjectPayload(project),
    status: "on_hold",
  });

  return extractProject(response);
}

export async function restoreProject(projectId, project = {}) {
  const response = await apiPatch(`/projects/${projectId}`, {
    ...normalizeProjectPayload(project),
    status: "active",
  });

  return extractProject(response);
}

export async function softDeleteProject(projectId, project = {}) {
  const response = await apiPatch(`/projects/${projectId}`, {
    ...normalizeProjectPayload(project),
    status: "deleted",
  });

  return extractProject(response);
}