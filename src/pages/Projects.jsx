import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Grid2X2,
  Pencil,
  Plus,
  Search,
  Table2,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as projectService from "../services/projectService";
import * as userService from "../services/userService";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function normalizeId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value.id ||
        value._id ||
        value.uid ||
        value.userId ||
        value.user_id ||
        value.employeeId ||
        value.employee_id ||
        value.email ||
        value.name ||
        ""
    ).trim();
  }

  return String(value).trim();
}

function extractArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.employees)) return response.employees;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function getProjectId(project, index = 0) {
  return String(
    project?.id ||
      project?._id ||
      project?.projectId ||
      project?.project_id ||
      project?.uid ||
      index + 1
  );
}

function getProjectName(project, index = 0) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    `Project ${index + 1}`
  );
}

function getProjectDescription(project) {
  return (
    project?.description ||
    project?.details ||
    project?.summary ||
    project?.projectDescription ||
    project?.project_description ||
    "-"
  );
}

function getProjectDepartment(project) {
  return (
    project?.department ||
    project?.departmentName ||
    project?.department_name ||
    project?.division ||
    project?.divisionName ||
    project?.division_name ||
    "Unassigned"
  );
}

function getProjectManager(project) {
  return (
    project?.manager ||
    project?.managerName ||
    project?.manager_name ||
    project?.lead ||
    project?.leadName ||
    project?.lead_name ||
    "-"
  );
}

function getProjectStatus(project) {
  const status = normalize(
    project?.status ||
      project?.projectStatus ||
      project?.project_status ||
      "active"
  );

  if (
    status === "deleted" ||
    status === "delete" ||
    status === "removed" ||
    status === "archived"
  ) {
    return "deleted";
  }

  if (
    status === "on hold" ||
    status === "hold" ||
    status === "onhold" ||
    status === "paused" ||
    status === "pause"
  ) {
    return "on_hold";
  }

  if (
    status === "completed" ||
    status === "complete" ||
    status === "done" ||
    status === "finished"
  ) {
    return "completed";
  }

  return "active";
}

function getStatusLabel(status) {
  if (status === "on_hold") return "ON HOLD";
  if (status === "deleted") return "DELETED";
  if (status === "completed") return "COMPLETED";
  return "ACTIVE";
}

function getStatusClass(status) {
  if (status === "deleted") {
    return "bg-red-50 text-red-600";
  }

  if (status === "on_hold") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (status === "completed") {
    return "bg-emerald-50 text-emerald-600";
  }

  return "bg-blue-50 text-blue-600";
}

function getStartDate(project) {
  return (
    project?.startDate ||
    project?.start_date ||
    project?.fromDate ||
    project?.from_date ||
    project?.createdAt ||
    ""
  );
}

function getEndDate(project) {
  return (
    project?.endDate ||
    project?.end_date ||
    project?.dueDate ||
    project?.due_date ||
    project?.deadline ||
    project?.toDate ||
    project?.to_date ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTimeline(project) {
  const start = formatDate(getStartDate(project));
  const end = formatDate(getEndDate(project));

  if (start === "-" && end === "-") return "-";
  if (start === "-") return end;
  if (end === "-") return start;

  return `${start} to ${end}`;
}

function getProjectTasks(project) {
  const tasks =
    project?.tasks ||
    project?.taskList ||
    project?.task_list ||
    project?.todos ||
    project?.toDos ||
    project?.checklist ||
    [];

  return Array.isArray(tasks) ? tasks : [];
}

function getTaskStatus(task) {
  return normalize(task?.status || task?.taskStatus || task?.task_status || "");
}

function isTaskComplete(task) {
  const status = getTaskStatus(task);

  return (
    task?.done === true ||
    task?.completed === true ||
    status === "done" ||
    status === "complete" ||
    status === "completed"
  );
}

function getProjectProgress(project) {
  const direct =
    project?.progress ??
    project?.completion ??
    project?.completionPercentage ??
    project?.completion_percentage ??
    project?.progressPercentage ??
    project?.progress_percentage;

  const directNumber = Number(direct);

  if (Number.isFinite(directNumber)) {
    return Math.max(0, Math.min(100, Math.round(directNumber)));
  }

  const tasks = getProjectTasks(project);

  if (!tasks.length) return 0;

  const completed = tasks.filter(isTaskComplete).length;

  return Math.round((completed / tasks.length) * 100);
}

function getUserId(user) {
  return String(
    user?.id ||
      user?._id ||
      user?.uid ||
      user?.userId ||
      user?.user_id ||
      user?.employeeId ||
      user?.employee_id ||
      user?.email ||
      user?.name ||
      ""
  );
}

function getUserName(user) {
  return (
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    user?.displayName ||
    user?.display_name ||
    user?.employeeName ||
    user?.employee_name ||
    user?.email ||
    "Employee"
  );
}

function getUserEmail(user) {
  return user?.email || user?.userEmail || user?.user_email || "";
}

function getUserDepartment(user) {
  return (
    user?.department ||
    user?.departmentName ||
    user?.department_name ||
    user?.division ||
    user?.divisionName ||
    user?.division_name ||
    "Unassigned"
  );
}

function getUserRole(user) {
  return user?.designation || user?.role || user?.position || "Team Member";
}

function getInitials(name) {
  return String(name || "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getUserKeys(user) {
  return [
    getUserId(user),
    user?.id,
    user?._id,
    user?.uid,
    user?.userId,
    user?.user_id,
    user?.employeeId,
    user?.employee_id,
    user?.email,
    user?.name,
    user?.fullName,
    user?.full_name,
    user?.displayName,
    user?.display_name,
    user?.employeeName,
    user?.employee_name,
  ]
    .filter(Boolean)
    .map((item) => normalizeId(item).toLowerCase());
}

function isEmployeeLike(user) {
  const role = normalize(getUserRole(user));

  if (!role) return true;

  return (
    role === "employee" ||
    role === "team member" ||
    role === "teammember" ||
    role === "staff" ||
    role === "user" ||
    role === "member"
  );
}

function getProjectMemberSources(project) {
  const fields = [
    project?.members,
    project?.member,
    project?.assignedMembers,
    project?.assigned_members,
    project?.assignedUsers,
    project?.assigned_users,
    project?.assignedEmployees,
    project?.assigned_employees,
    project?.users,
    project?.employees,
    project?.team,
    project?.teamMembers,
    project?.team_members,
    project?.participants,
    project?.contributors,
    project?.assignedTo,
    project?.assigned_to,
    project?.assignee,
    project?.assignees,
    project?.assignedUser,
    project?.assigned_user,
    project?.assignedEmployee,
    project?.assigned_employee,
    project?.employeeIds,
    project?.employee_ids,
  ];

  return fields.flatMap((field) => {
    if (!field) return [];

    if (Array.isArray(field)) return field;

    if (typeof field === "string") {
      return field
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [field];
  });
}

function getProjectAssignedEmployees(project, users) {
  const memberSources = getProjectMemberSources(project);

  if (!memberSources.length) return [];

  const memberKeys = memberSources
    .flatMap((member) => {
      if (typeof member === "object" && member) {
        return getUserKeys(member);
      }

      return [normalizeId(member).toLowerCase()];
    })
    .filter(Boolean);

  const matchedUsers = users.filter((user) => {
    const userKeys = getUserKeys(user);
    return userKeys.some((key) => memberKeys.includes(key));
  });

  if (matchedUsers.length) return matchedUsers;

  return memberSources.map((member, index) => {
    if (typeof member === "object" && member) return member;

    return {
      id: String(member || index),
      name: String(member || `Member ${index + 1}`),
      email: "",
    };
  });
}

function getProjectMemberCount(project, users) {
  return getProjectAssignedEmployees(project, users).length;
}

function makeAssignedPayload(selectedUsers) {
  const cleanUsers = selectedUsers.map((user) => ({
    id: getUserId(user),
    uid: user?.uid || getUserId(user),
    name: getUserName(user),
    email: getUserEmail(user),
    department: getUserDepartment(user),
    role: getUserRole(user),
  }));

  return {
    members: cleanUsers,
    assignedMembers: cleanUsers,
    assigned_members: cleanUsers,
    assignedUsers: cleanUsers,
    assigned_users: cleanUsers,
    assignedEmployees: cleanUsers,
    assigned_employees: cleanUsers,
    employeeIds: cleanUsers.map((user) => user.id).filter(Boolean),
    employee_ids: cleanUsers.map((user) => user.id).filter(Boolean),
  };
}

const PROJECT_ASSIGNMENT_CACHE_KEY = "valencia_project_assignment_cache";

function loadProjectAssignmentCache() {
  try {
    const raw = localStorage.getItem(PROJECT_ASSIGNMENT_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProjectAssignmentCache(projects) {
  localStorage.setItem(
    PROJECT_ASSIGNMENT_CACHE_KEY,
    JSON.stringify(Array.isArray(projects) ? projects : [])
  );
}

function getProjectCacheKeys(project, index = 0) {
  return [
    getProjectId(project, index),
    project?.id,
    project?._id,
    project?.projectId,
    project?.project_id,
    getProjectName(project, index),
    project?.name,
    project?.title,
    project?.projectName,
    project?.project_name,
  ]
    .filter(Boolean)
    .map((item) => String(item).trim().toLowerCase());
}

function upsertProjectAssignmentCache(project, index = 0) {
  const cache = loadProjectAssignmentCache();
  const nextKeys = getProjectCacheKeys(project, index);

  const nextCache = cache.filter((item, itemIndex) => {
    const itemKeys = getProjectCacheKeys(item, itemIndex);
    return !itemKeys.some((key) => nextKeys.includes(key));
  });

  nextCache.push(project);
  saveProjectAssignmentCache(nextCache);
}

function syncProjectAssignmentCache(projects) {
  const cache = loadProjectAssignmentCache();
  const nextCache = [...cache];

  projects.forEach((project, index) => {
    const projectKeys = getProjectCacheKeys(project, index);

    const existingIndex = nextCache.findIndex((item, itemIndex) => {
      const itemKeys = getProjectCacheKeys(item, itemIndex);
      return itemKeys.some((key) => projectKeys.includes(key));
    });

    if (existingIndex >= 0) {
      nextCache[existingIndex] = {
        ...nextCache[existingIndex],
        ...project,
      };
    } else {
      nextCache.push(project);
    }
  });

  saveProjectAssignmentCache(nextCache);
}

async function fetchProjects(profile) {
  if (typeof projectService.getAllProjects === "function") {
    return projectService.getAllProjects(profile);
  }

  if (typeof projectService.getProjects === "function") {
    return projectService.getProjects(profile);
  }

  if (typeof projectService.fetchProjects === "function") {
    return projectService.fetchProjects(profile);
  }

  return [];
}

async function fetchUsers(profile) {
  if (typeof userService.getUsers === "function") {
    return userService.getUsers(profile);
  }

  if (typeof userService.fetchUsers === "function") {
    return userService.fetchUsers(profile);
  }

  if (typeof userService.getAllUsers === "function") {
    return userService.getAllUsers(profile);
  }

  return [];
}

async function updateProjectRecord(projectId, payload, profile) {
  if (typeof projectService.updateProject === "function") {
    return projectService.updateProject(projectId, payload, profile);
  }

  if (typeof projectService.editProject === "function") {
    return projectService.editProject(projectId, payload, profile);
  }

  if (typeof projectService.saveProject === "function") {
    return projectService.saveProject(projectId, payload, profile);
  }

  if (typeof projectService.updateProjectStatus === "function" && payload?.status) {
    return projectService.updateProjectStatus(projectId, payload.status, profile);
  }

  return payload;
}

async function createProjectRecord(payload, profile) {
  if (typeof projectService.createProject === "function") {
    return projectService.createProject(payload, profile);
  }

  if (typeof projectService.addProject === "function") {
    return projectService.addProject(payload, profile);
  }

  if (typeof projectService.saveProject === "function") {
    return projectService.saveProject(payload, profile);
  }

  return payload;
}

function StatBox({ icon: Icon, label, value, tone, active, onClick }) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-500"
      : tone === "red"
      ? "bg-red-50 text-red-500"
      : tone === "yellow"
      ? "bg-yellow-50 text-yellow-600"
      : "bg-orange-50 text-[#FF6B35]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[#FF6B35] hover:shadow-[0_16px_35px_rgba(15,23,42,0.09)] ${
        active ? "border-[#FF6B35]" : "border-slate-200"
      }`}
    >
      <div className="mb-7">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>

      <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#061638]">
        {label}
      </p>

      <p className="mt-3 text-[32px] font-black leading-none text-[#061638]">
        {value}
      </p>
    </button>
  );
}

function ProjectModal({ mode, open, project, users, onClose, onSave }) {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    department: "",
    manager: "",
    status: "active",
    startDate: "",
    endDate: "",
    selectedUserIds: [],
  });

  useEffect(() => {
    if (!open) return;

    if (project) {
      const assigned = getProjectAssignedEmployees(project, users);

      setForm({
        name: getProjectName(project),
        description:
          getProjectDescription(project) === "-"
            ? ""
            : getProjectDescription(project),
        department: getProjectDepartment(project),
        manager: getProjectManager(project) === "-" ? "" : getProjectManager(project),
        status: getProjectStatus(project),
        startDate: getStartDate(project) || "",
        endDate: getEndDate(project) || "",
        selectedUserIds: assigned.map((user) => getUserId(user)).filter(Boolean),
      });
    } else {
      setForm({
        name: "",
        description: "",
        department: "",
        manager: "",
        status: "active",
        startDate: "",
        endDate: "",
        selectedUserIds: [],
      });
    }

    setEmployeeSearch("");
  }, [open, project, users]);

  if (!open) return null;

  const filteredUsers = users.filter((user) => {
    const query = normalize(employeeSearch);

    if (!query) return true;

    return normalize(
      `${getUserName(user)} ${getUserEmail(user)} ${getUserDepartment(user)} ${getUserRole(user)}`
    ).includes(query);
  });

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function toggleUser(user) {
    const userId = getUserId(user);

    setForm((current) => {
      const exists = current.selectedUserIds.includes(userId);

      return {
        ...current,
        selectedUserIds: exists
          ? current.selectedUserIds.filter((id) => id !== userId)
          : [...current.selectedUserIds, userId],
      };
    });
  }

  function submit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Project name is required.");
      return;
    }

    const selectedUsers = users.filter((user) =>
      form.selectedUserIds.includes(getUserId(user))
    );

    const payload = {
      name: form.name.trim(),
      title: form.name.trim(),
      projectName: form.name.trim(),
      description: form.description.trim(),
      department: form.department.trim(),
      departmentName: form.department.trim(),
      division: form.department.trim(),
      manager: form.manager.trim(),
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      dueDate: form.endDate,
      ...makeAssignedPayload(selectedUsers),
    };

    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-[900px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-[#061638]">
              {mode === "edit" ? "Edit Project" : "New Project"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Add project details and assign employees.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#061638] transition hover:bg-red-50 hover:text-red-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-150px)] overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Project Name
              </span>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
                placeholder="Project name"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
                placeholder="Description"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Department
              </span>
              <input
                value={form.department}
                onChange={(event) =>
                  updateField("department", event.target.value)
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
                placeholder="Department"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Manager
              </span>
              <input
                value={form.manager}
                onChange={(event) => updateField("manager", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
                placeholder="Manager"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="deleted">Deleted</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Start Date
              </span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                End Date
              </span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#061638]">
                  Assign Employees
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Search and select employees for this project.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#FF6B35]">
                {form.selectedUserIds.length} selected
              </span>
            </div>

            <div className="mb-3 flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4">
              <Search size={18} className="text-slate-400" />
              <input
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Search employee by name, email, department..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#061638] outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="max-h-[260px] overflow-y-auto rounded-xl border border-slate-200 bg-white">
              {filteredUsers.length ? (
                filteredUsers.map((user) => {
                  const id = getUserId(user);
                  const checked = form.selectedUserIds.includes(id);

                  return (
                    <label
                      key={id}
                      className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 transition last:border-b-0 ${
                        checked ? "bg-orange-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(user)}
                        className="h-4 w-4 accent-[#FF6B35]"
                      />

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-xs font-black text-white">
                        {getInitials(getUserName(user))}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#061638]">
                          {getUserName(user)}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {getUserEmail(user) || getUserDepartment(user)}
                        </p>
                      </div>

                      <span className="text-xs font-black text-slate-500">
                        {getUserDepartment(user)}
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                  No employees found.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638] transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="h-11 rounded-xl bg-[#FF6B35] px-6 text-sm font-black text-white transition hover:opacity-90"
          >
            Save Project
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProject, setEditingProject] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [projectResponse, userResponse] = await Promise.all([
        fetchProjects(profile),
        fetchUsers(profile),
      ]);

      const nextProjects = extractArray(projectResponse);
      setProjects(nextProjects);
      syncProjectAssignmentCache(nextProjects);
      setUsers(extractArray(userResponse).filter(isEmployeeLike));
    } catch (error) {
      console.error("Projects load error:", error);
      toast.error(error?.message || "Failed to load projects.");
      setProjects([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [profile]);

  const stats = useMemo(() => {
    const active = projects.filter(
      (project) => getProjectStatus(project) === "active"
    ).length;

    const onHold = projects.filter(
      (project) => getProjectStatus(project) === "on_hold"
    ).length;

    const deleted = projects.filter(
      (project) => getProjectStatus(project) === "deleted"
    ).length;

    return {
      active,
      onHold,
      deleted,
    };
  }, [projects]);

  const visibleProjects = useMemo(() => {
    const query = normalize(search);

    return projects.filter((project, index) => {
      const status = getProjectStatus(project);

      const notDeletedByDefault =
        statusFilter === "deleted" || status !== "deleted";

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter ||
        (statusFilter === "active" && status === "active") ||
        (statusFilter === "on_hold" && status === "on_hold") ||
        (statusFilter === "deleted" && status === "deleted");

      const searchable = normalize(
        `${getProjectName(project, index)} ${getProjectDescription(
          project
        )} ${getProjectDepartment(project)} ${getProjectManager(project)}`
      );

      const matchesSearch = !query || searchable.includes(query);

      return notDeletedByDefault && matchesStatus && matchesSearch;
    });
  }, [projects, search, statusFilter]);

  function openCreateModal() {
    setModalMode("create");
    setEditingProject(null);
    setModalOpen(true);
  }

  function openEditModal(project) {
    setModalMode("edit");
    setEditingProject(project);
    setModalOpen(true);
  }

  async function saveProject(payload) {
    setSaving(true);

    try {
      if (modalMode === "edit" && editingProject) {
        const projectIndex = projects.findIndex((item) => item === editingProject);
        const projectId = getProjectId(editingProject, projectIndex);

        const response = await updateProjectRecord(projectId, payload, profile);

        const finalProject =
          response && typeof response === "object"
            ? {
                ...editingProject,
                ...response,
                ...payload,
              }
            : {
                ...editingProject,
                ...payload,
              };

        setProjects((current) =>
          current.map((project, index) => {
            const currentId = getProjectId(project, index);

            if (currentId === projectId || project === editingProject) {
              return finalProject;
            }

            return project;
          })
        );

        upsertProjectAssignmentCache(finalProject, projectIndex);

        toast.success("Project updated.");
      } else {
        const newProject = {
          id: `project-${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...payload,
        };

        const response = await createProjectRecord(newProject, profile);

        const finalProject =
          response && typeof response === "object"
            ? {
                ...newProject,
                ...response,
                ...payload,
              }
            : newProject;

        setProjects((current) => [...current, finalProject]);

        upsertProjectAssignmentCache(finalProject, projects.length);

        toast.success("Project created.");
      }

      setModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error("Project save error:", error);
      toast.error(error?.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  async function updateProjectStatus(project, nextStatus) {
    const projectIndex = projects.findIndex((item) => item === project);
    const projectId = getProjectId(project, projectIndex);

    const payload = {
      status: nextStatus,
      deletedAt:
        nextStatus === "deleted" ? new Date().toISOString() : project?.deletedAt || "",
    };

    try {
      await updateProjectRecord(projectId, payload, profile);

      setProjects((current) =>
        current.map((item, index) => {
          const currentId = getProjectId(item, index);

          if (currentId === projectId || item === project) {
            return {
              ...item,
              ...payload,
            };
          }

          return item;
        })
      );

      if (nextStatus === "deleted") {
        toast.success("Project moved to deleted projects.");
      } else if (nextStatus === "on_hold") {
        toast.success("Project put on hold.");
      } else {
        toast.success("Project restored.");
      }
    } catch (error) {
      toast.error(error?.message || "Failed to update project.");
    }
  }

  function handleRowClick(project, index) {
    const status = getProjectStatus(project);

    if (status === "deleted") return;

    navigate(`/admin/projects/${getProjectId(project, index)}`);
  }

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#061638] sm:text-4xl">
              Projects
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Create, assign, and manage Valencia Nutrition project portfolios.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(255,107,53,0.25)] transition hover:opacity-90"
          >
            <Plus size={18} />
            New Project
          </button>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatBox
            icon={Briefcase}
            label="Active Projects"
            value={stats.active}
            tone="orange"
            active={statusFilter === "active"}
            onClick={() => setStatusFilter("active")}
          />

          <StatBox
            icon={Clock3}
            label="On Hold"
            value={stats.onHold}
            tone="blue"
            active={statusFilter === "on_hold"}
            onClick={() => setStatusFilter("on_hold")}
          />

          <StatBox
            icon={Trash2}
            label="Deleted Projects"
            value={stats.deleted}
            tone="red"
            active={statusFilter === "deleted"}
            onClick={() => setStatusFilter("deleted")}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_210px]">
            <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4">
              <Search size={19} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by project name, description, department..."
                className="h-full w-full bg-transparent text-sm font-semibold text-[#061638] outline-none placeholder:text-slate-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-[#061638] outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="deleted">Deleted</option>
            </select>

            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${
                  viewMode === "table"
                    ? "bg-[#FF6B35] text-white"
                    : "text-[#061638] hover:bg-orange-50"
                }`}
              >
                <Table2 size={16} />
                Table
              </button>

              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-black transition ${
                  viewMode === "grid"
                    ? "bg-[#FF6B35] text-white"
                    : "text-[#061638] hover:bg-orange-50"
                }`}
              >
                <Grid2X2 size={16} />
                Grid
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-sm font-semibold text-slate-500">
            Loading projects...
          </section>
        ) : viewMode === "table" ? (
          <ProjectTable
            projects={visibleProjects}
            users={users}
            onRowClick={handleRowClick}
            onEdit={openEditModal}
            onPause={(project) => updateProjectStatus(project, "on_hold")}
            onRestore={(project) => updateProjectStatus(project, "active")}
            onDelete={(project) => updateProjectStatus(project, "deleted")}
          />
        ) : (
          <ProjectGrid
            projects={visibleProjects}
            users={users}
            onCardClick={handleRowClick}
            onEdit={openEditModal}
            onPause={(project) => updateProjectStatus(project, "on_hold")}
            onRestore={(project) => updateProjectStatus(project, "active")}
            onDelete={(project) => updateProjectStatus(project, "deleted")}
          />
        )}
      </div>

      <ProjectModal
        mode={modalMode}
        open={modalOpen}
        project={editingProject}
        users={users}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setEditingProject(null);
          }
        }}
        onSave={saveProject}
      />
    </main>
  );
}

function ProjectTable({
  projects,
  users,
  onRowClick,
  onEdit,
  onPause,
  onRestore,
  onDelete,
}) {
  if (!projects.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm font-semibold text-slate-500">
        No projects found.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1160px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
              <th className="px-4 py-4">Project</th>
              <th className="px-4 py-4">Department</th>
              <th className="px-4 py-4">Manager</th>
              <th className="px-4 py-4">Timeline</th>
              <th className="px-4 py-4">Members</th>
              <th className="px-4 py-4">Progress</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project, index) => {
              const status = getProjectStatus(project);
              const progress = getProjectProgress(project);
              const memberCount = getProjectMemberCount(project, users);
              const isDeleted = status === "deleted";

              return (
                <tr
                  key={getProjectId(project, index)}
                  onClick={() => onRowClick(project, index)}
                  className={`border-b border-slate-100 transition last:border-b-0 ${
                    isDeleted
                      ? "bg-red-50/30"
                      : "cursor-pointer bg-white hover:bg-orange-50/50"
                  }`}
                >
                  <td className="px-4 py-5 align-middle">
                    <div className="max-w-[190px]">
                      <p className="font-black leading-5 text-[#061638]">
                        {getProjectName(project, index)}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {getProjectDescription(project)}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-5 align-middle font-semibold text-slate-600">
                    {getProjectDepartment(project)}
                  </td>

                  <td className="px-4 py-5 align-middle font-semibold text-slate-600">
                    {getProjectManager(project)}
                  </td>

                  <td className="px-4 py-5 align-middle font-semibold leading-5 text-slate-600">
                    {getTimeline(project)}
                  </td>

                  <td className="px-4 py-5 align-middle">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(project);
                      }}
                      className="text-left font-black text-[#061638] hover:text-[#FF6B35]"
                    >
                      <span className="block">{memberCount}</span>
                      <span className="block">assigned</span>
                    </button>
                  </td>

                  <td className="px-4 py-5 align-middle">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                          Progress
                        </p>
                        <div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#FF6B35]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <span className="font-black text-[#061638]">{progress}%</span>
                    </div>
                  </td>

                  <td className="px-4 py-5 align-middle">
                    <span
                      className={`rounded-full px-4 py-2 text-xs font-black ${getStatusClass(
                        status
                      )}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </td>

                  <td className="px-4 py-5 align-middle">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(project);
                        }}
                        className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

                      {isDeleted ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRestore(project);
                          }}
                          className="flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <CheckCircle2 size={15} />
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onPause(project);
                            }}
                            className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-[#061638] transition hover:border-yellow-300 hover:text-yellow-700"
                          >
                            <Clock3 size={15} />
                            Pause
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete(project);
                            }}
                            className="flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProjectGrid({
  projects,
  users,
  onCardClick,
  onEdit,
  onPause,
  onRestore,
  onDelete,
}) {
  if (!projects.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm font-semibold text-slate-500">
        No projects found.
      </section>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {projects.map((project, index) => {
        const status = getProjectStatus(project);
        const progress = getProjectProgress(project);
        const memberCount = getProjectMemberCount(project, users);
        const isDeleted = status === "deleted";

        return (
          <article
            key={getProjectId(project, index)}
            onClick={() => onCardClick(project, index)}
            className={`rounded-xl border bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition ${
              isDeleted
                ? "border-red-100 bg-red-50/30"
                : "cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:border-[#FF6B35]"
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                      status
                    )}`}
                  >
                    {getStatusLabel(status)}
                  </span>
                </div>

                <h3 className="text-2xl font-black leading-tight text-[#061638]">
                  {getProjectName(project, index)}
                </h3>

                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {getProjectDescription(project)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoBlock
                icon={Briefcase}
                label="Department"
                value={getProjectDepartment(project)}
              />
              <InfoBlock
                icon={UsersRound}
                label="Manager"
                value={getProjectManager(project)}
              />
              <InfoBlock
                icon={CalendarDays}
                label="Timeline"
                value={getTimeline(project)}
              />
              <InfoBlock
                icon={UserPlus}
                label="Members"
                value={`${memberCount} assigned`}
              />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Progress
                </span>
                <span className="text-sm font-black text-[#061638]">{progress}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#FF6B35]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(project);
                }}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
              >
                <Pencil size={15} />
                Edit
              </button>

              {isDeleted ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRestore(project);
                  }}
                  className="flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  <CheckCircle2 size={15} />
                  Restore
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPause(project);
                    }}
                    className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-[#061638] transition hover:border-yellow-300 hover:text-yellow-700"
                  >
                    <Clock3 size={15} />
                    Pause
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(project);
                    }}
                    className="flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-600 transition hover:bg-red-100"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <Icon size={15} />
        {label}
      </p>
      <p className="font-black text-[#061638]">{value}</p>
    </div>
  );
}