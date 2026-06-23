import {
  BriefcaseBusiness,
  CalendarDays,
  Grid2X2,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Table2,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import StatCard from "../components/StatCard";
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
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function getProjectId(project) {
  return String(
    project?.id ||
      project?._id ||
      project?.projectId ||
      project?.project_id ||
      project?.uid ||
      ""
  );
}

function getProjectName(project) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    "Untitled Project"
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
    "-"
  );
}

function getProjectManager(project) {
  return (
    project?.manager ||
    project?.managerName ||
    project?.manager_name ||
    project?.assignedManager ||
    project?.assigned_manager ||
    "-"
  );
}

function getProjectStartDate(project) {
  return (
    project?.startDate ||
    project?.start_date ||
    project?.fromDate ||
    project?.from_date ||
    ""
  );
}

function getProjectEndDate(project) {
  return (
    project?.endDate ||
    project?.end_date ||
    project?.dueDate ||
    project?.due_date ||
    project?.deadline ||
    ""
  );
}

function getProjectPriority(project) {
  return project?.priority || project?.projectPriority || "medium";
}

function normalizeStatus(value) {
  const status = normalize(value);

  if (!status) return "active";

  if (
    ["active", "approved", "open", "ongoing", "in progress"].includes(status)
  ) {
    return "active";
  }

  if (["hold", "on hold", "paused", "pause"].includes(status)) {
    return "on_hold";
  }

  if (
    ["abort", "aborted", "cancelled", "canceled", "rejected"].includes(status)
  ) {
    return "aborted";
  }

  if (["complete", "completed", "done", "finished"].includes(status)) {
    return "completed";
  }

  return status.replaceAll(" ", "_");
}

function formatStatus(value) {
  const status = normalizeStatus(value);

  if (status === "active") return "Active";
  if (status === "on_hold") return "On Hold";
  if (status === "aborted") return "Cancelled";
  if (status === "completed") return "Completed";

  return String(value || "Active")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPriority(value) {
  return String(value || "medium")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
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

function getUserRole(user) {
  return user?.designation || user?.role || user?.position || "Team Member";
}

function getUserDepartment(user) {
  return (
    user?.department ||
    user?.departmentName ||
    user?.department_name ||
    user?.division ||
    user?.divisionName ||
    user?.division_name ||
    "-"
  );
}

function isEmployeeUser(user) {
  const role = normalize(user?.role || user?.designation || user?.position);

  if (!role) return true;

  return (
    role === "employee" ||
    role === "team member" ||
    role === "staff" ||
    role === "user" ||
    role === "member"
  );
}

function getTaskAssignedRaw(task) {
  return (
    task?.assignedTo ||
    task?.assigned_to ||
    task?.assignee ||
    task?.assigneeName ||
    task?.assignee_name ||
    task?.employee ||
    task?.employeeName ||
    task?.employee_name ||
    task?.user ||
    ""
  );
}

function getTaskAssignedId(task) {
  return normalizeId(
    task?.assignedToId ||
      task?.assigned_to_id ||
      task?.assigneeId ||
      task?.assignee_id ||
      task?.employeeId ||
      task?.employee_id ||
      task?.userId ||
      task?.user_id ||
      getTaskAssignedRaw(task)
  );
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

  const explicitMembers = fields.flatMap((field) => {
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

  const taskMembers = getProjectTasks(project)
    .map((task) => getTaskAssignedId(task) || getTaskAssignedRaw(task))
    .filter(Boolean);

  return [...explicitMembers, ...taskMembers];
}

function resolveMember(rawMember, users) {
  const rawId = normalizeId(rawMember).toLowerCase();

  const matchedUser = users.find((user) => {
    const keys = [
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

    return keys.includes(rawId);
  });

  if (matchedUser) {
    return {
      ...matchedUser,
      id: getUserId(matchedUser),
      name: getUserName(matchedUser),
      role: getUserRole(matchedUser),
      department: getUserDepartment(matchedUser),
    };
  }

  if (typeof rawMember === "object" && rawMember) {
    return {
      ...rawMember,
      id: normalizeId(rawMember),
      name: getUserName(rawMember),
      role: getUserRole(rawMember),
      department: getUserDepartment(rawMember),
    };
  }

  return {
    id: normalizeId(rawMember),
    name: String(rawMember || "Employee"),
    role: "Team Member",
    department: "-",
  };
}

function getProjectMembers(project, users = []) {
  const members = getProjectMemberSources(project)
    .map((member) => resolveMember(member, users))
    .filter((member) => member.id || member.name);

  const map = new Map();

  members.forEach((member) => {
    const key = String(member.id || member.email || member.name).toLowerCase();

    if (!key) return;

    map.set(key, {
      ...(map.get(key) || {}),
      ...member,
    });
  });

  return Array.from(map.values());
}

function getProjectProgress(project) {
  const value =
    project?.progress ??
    project?.completion ??
    project?.completionPercentage ??
    project?.completion_percentage ??
    project?.progressPercentage ??
    project?.progress_percentage ??
    0;

  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "active") {
    return "bg-blue-50 text-blue-700";
  }

  if (normalized === "on_hold") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalized === "aborted") {
    return "bg-red-50 text-red-700";
  }

  if (normalized === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-valencia-navy";
}

function getPriorityClass(priority) {
  const normalized = normalize(priority);

  if (normalized === "high") {
    return "bg-red-50 text-red-700";
  }

  if (normalized === "medium") {
    return "bg-blue-50 text-blue-700";
  }

  if (normalized === "low") {
    return "bg-emerald-50 text-emerald-700";
  }

  return "bg-slate-100 text-valencia-navy";
}

async function fetchProjects(profile) {
  if (projectService.getAllProjects) {
    return projectService.getAllProjects(profile);
  }

  if (projectService.getProjects) {
    return projectService.getProjects(profile);
  }

  if (projectService.fetchProjects) {
    return projectService.fetchProjects(profile);
  }

  throw new Error("Project fetch function not found.");
}

async function fetchUsers() {
  if (userService.getUsers) {
    return userService.getUsers();
  }

  if (userService.fetchUsers) {
    return userService.fetchUsers();
  }

  return [];
}

async function updateProjectRecord(id, payload, profile) {
  if (projectService.updateProject) {
    return projectService.updateProject(id, payload, profile);
  }

  if (projectService.editProject) {
    return projectService.editProject(id, payload, profile);
  }

  throw new Error("Project update function not found.");
}

async function deleteProjectRecord(id, profile) {
  if (projectService.deleteProject) {
    return projectService.deleteProject(id, profile);
  }

  if (projectService.removeProject) {
    return projectService.removeProject(id, profile);
  }

  throw new Error("Project delete function not found.");
}

export default function Projects() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState("table");
  const [loading, setLoading] = useState(true);

  const [editingProject, setEditingProject] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    department: "",
    manager: "",
    startDate: "",
    endDate: "",
    priority: "medium",
    status: "active",
    memberIds: [],
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
  });

  const employeeUsers = useMemo(() => {
    return users.filter(isEmployeeUser);
  }, [users]);

  const filteredEmployeeUsers = useMemo(() => {
    const query = normalize(employeeSearch);

    if (!query) return employeeUsers;

    return employeeUsers.filter((user) => {
      const searchable = normalize(
        `${getUserName(user)} ${user.email || ""} ${getUserRole(
          user
        )} ${getUserDepartment(user)}`
      );

      return searchable.includes(query);
    });
  }, [employeeUsers, employeeSearch]);

  const loadProjects = async () => {
    setLoading(true);

    try {
      const [projectData, userData] = await Promise.all([
        fetchProjects(profile),
        fetchUsers(),
      ]);

      const projectList = extractArray(projectData);
      const userList = extractArray(userData);

      setProjects(projectList);
      setUsers(userList);
    } catch (error) {
      console.error("Projects load error:", error);
      toast.error(error?.message || "Failed to load projects.");
      setProjects([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [profile]);

  const stats = useMemo(() => {
    return {
      active: projects.filter(
        (project) => normalizeStatus(project?.status) === "active"
      ).length,
      onHold: projects.filter(
        (project) => normalizeStatus(project?.status) === "on_hold"
      ).length,
      aborted: projects.filter(
        (project) => normalizeStatus(project?.status) === "aborted"
      ).length,
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const query = normalize(filters.search);
    const selectedStatus = filters.status;

    return projects.filter((project) => {
      const status = normalizeStatus(project?.status);

      const searchable = normalize(
        `${getProjectName(project)} ${getProjectDescription(
          project
        )} ${getProjectDepartment(project)} ${getProjectManager(project)} ${
          project?.status || ""
        } ${getProjectPriority(project)}`
      );

      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus =
        selectedStatus === "all" || status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [projects, filters]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const openProject = (project) => {
    const id = getProjectId(project);

    if (!id) {
      toast.error("Project ID not found.");
      return;
    }

    navigate(`/admin/projects/${id}`);
  };

  const openEditModal = (project) => {
    const members = getProjectMembers(project, users);
    const memberIds = members.map((member) =>
      String(member.id || member.email || member.name)
    );

    setEmployeeSearch("");
    setEditingProject(project);

    setEditForm({
      name: getProjectName(project),
      description:
        getProjectDescription(project) === "-"
          ? ""
          : getProjectDescription(project),
      department:
        getProjectDepartment(project) === "-"
          ? ""
          : getProjectDepartment(project),
      manager:
        getProjectManager(project) === "-" ? "" : getProjectManager(project),
      startDate: toInputDate(getProjectStartDate(project)),
      endDate: toInputDate(getProjectEndDate(project)),
      priority: normalize(getProjectPriority(project)) || "medium",
      status: normalizeStatus(project?.status),
      memberIds,
    });
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditingProject(null);
  };

  const updateEditForm = (name, value) => {
    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const toggleMember = (userId) => {
    setEditForm((current) => {
      const exists = current.memberIds.includes(userId);

      return {
        ...current,
        memberIds: exists
          ? current.memberIds.filter((id) => id !== userId)
          : [...current.memberIds, userId],
      };
    });
  };

  const saveEditedProject = async (event) => {
    event.preventDefault();

    if (!editingProject) return;

    const id = getProjectId(editingProject);

    if (!id) {
      toast.error("Project ID not found.");
      return;
    }

    if (!editForm.name.trim()) {
      toast.error("Project name is required.");
      return;
    }

    setEditSaving(true);

    try {
      const selectedMembers = employeeUsers
        .filter((user) => editForm.memberIds.includes(getUserId(user)))
        .map((user) => ({
          id: getUserId(user),
          name: getUserName(user),
          email: user.email || "",
          role: getUserRole(user),
          department: getUserDepartment(user),
        }));

      const selectedMemberIds = selectedMembers.map((member) => member.id);

      const payload = {
        ...editingProject,
        name: editForm.name.trim(),
        title: editForm.name.trim(),
        projectName: editForm.name.trim(),
        description: editForm.description.trim(),
        department: editForm.department.trim(),
        departmentName: editForm.department.trim(),
        division: editForm.department.trim(),
        manager: editForm.manager.trim(),
        managerName: editForm.manager.trim(),
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        priority: editForm.priority,
        status: editForm.status,

        members: selectedMembers,
        assignedMembers: selectedMembers,
        assigned_members: selectedMembers,
        assignedUsers: selectedMembers,
        assigned_users: selectedMembers,
        assignedEmployees: selectedMembers,
        assigned_employees: selectedMembers,
        employees: selectedMembers,
        users: selectedMembers,
        teamMembers: selectedMembers,
        team_members: selectedMembers,
        employeeIds: selectedMemberIds,
        employee_ids: selectedMemberIds,
      };

      await updateProjectRecord(id, payload, profile);

      toast.success("Project updated.");
      setEditingProject(null);
      await loadProjects();
    } catch (error) {
      toast.error(error?.message || "Failed to update project.");
    } finally {
      setEditSaving(false);
    }
  };

  const togglePauseProject = async (project) => {
    const id = getProjectId(project);
    const status = normalizeStatus(project?.status);
    const nextStatus = status === "on_hold" ? "active" : "on_hold";

    if (!id) {
      toast.error("Project ID not found.");
      return;
    }

    try {
      await updateProjectRecord(id, { ...project, status: nextStatus }, profile);
      toast.success(
        nextStatus === "on_hold" ? "Project paused." : "Project resumed."
      );
      await loadProjects();
    } catch (error) {
      toast.error(error?.message || "Failed to update project.");
    }
  };

  const abortProject = async (project) => {
    const id = getProjectId(project);

    if (!id) {
      toast.error("Project ID not found.");
      return;
    }

    if (!window.confirm(`Abort ${getProjectName(project)}?`)) return;

    try {
      await updateProjectRecord(id, { ...project, status: "aborted" }, profile);
      toast.success("Project aborted.");
      await loadProjects();
    } catch (error) {
      toast.error(error?.message || "Failed to abort project.");
    }
  };

  const deleteProject = async (project) => {
    const id = getProjectId(project);

    if (!id) {
      toast.error("Project ID not found.");
      return;
    }

    if (!window.confirm(`Delete ${getProjectName(project)}?`)) return;

    try {
      await deleteProjectRecord(id, profile);
      toast.success("Project deleted.");
      await loadProjects();
    } catch (error) {
      toast.error(error?.message || "Failed to delete project.");
    }
  };

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Projects</h1>

            <p className="muted mt-1">
              Create, assign, and manage Valencia Nutrition project portfolios.
            </p>
          </div>

          <Button
            icon={Plus}
            onClick={() => toast("Create project page is not connected yet.")}
          >
            New Project
          </Button>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Active Projects" value={stats.active} />
          <StatCard label="On Hold" value={stats.onHold} tone="blue" />
          <StatCard label="Aborted" value={stats.aborted} tone="red" />
        </div>

        <section className="card p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_190px_auto]">
            <Input
              icon={Search}
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search by project name, description, department..."
            />

            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              className="h-11 rounded-md border border-valencia-line bg-white px-3 text-sm font-semibold text-valencia-navy"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="aborted">Cancelled</option>
              <option value="completed">Completed</option>
            </select>

            <div className="flex rounded-md border border-valencia-line bg-white p-1">
              <button
                type="button"
                onClick={() => setView("table")}
                className={`flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-black transition ${
                  view === "table"
                    ? "bg-valencia-orange text-white"
                    : "text-valencia-navy hover:bg-slate-50"
                }`}
              >
                <Table2 size={17} />
                Table
              </button>

              <button
                type="button"
                onClick={() => setView("grid")}
                className={`flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-black transition ${
                  view === "grid"
                    ? "bg-valencia-orange text-white"
                    : "text-valencia-navy hover:bg-slate-50"
                }`}
              >
                <Grid2X2 size={17} />
                Grid
              </button>
            </div>
          </div>
        </section>

        {view === "table" ? (
          <ProjectTable
            projects={filteredProjects}
            users={users}
            onOpen={openProject}
            onEdit={openEditModal}
            onPause={togglePauseProject}
            onAbort={abortProject}
            onDelete={deleteProject}
          />
        ) : (
          <ProjectGrid
            projects={filteredProjects}
            users={users}
            onOpen={openProject}
            onEdit={openEditModal}
            onPause={togglePauseProject}
            onAbort={abortProject}
            onDelete={deleteProject}
          />
        )}

        {loading ? (
          <div className="fixed bottom-5 right-5 rounded-full bg-valencia-navy px-4 py-2 text-sm font-black text-white shadow-lift">
            Loading projects...
          </div>
        ) : null}
      </div>

      {editingProject ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <form
            onSubmit={saveEditedProject}
            className="max-h-[92vh] w-full max-w-[860px] overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-valencia-navy">
                  Edit Project
                </h2>
                <p className="mt-1 text-sm font-semibold text-valencia-muted">
                  Update project details and assign employees.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-valencia-line bg-white text-valencia-navy transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <XCircle size={19} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Project Name
                </span>
                <input
                  value={editForm.name}
                  onChange={(event) =>
                    updateEditForm("name", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                  placeholder="Project name"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Description
                </span>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    updateEditForm("description", event.target.value)
                  }
                  className="min-h-[90px] w-full rounded-xl border border-valencia-line bg-white px-4 py-3 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                  placeholder="Project description"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Department
                </span>
                <input
                  value={editForm.department}
                  onChange={(event) =>
                    updateEditForm("department", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                  placeholder="Department"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Manager
                </span>
                <input
                  value={editForm.manager}
                  onChange={(event) =>
                    updateEditForm("manager", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                  placeholder="Manager"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Start Date
                </span>
                <input
                  type="date"
                  value={editForm.startDate}
                  onChange={(event) =>
                    updateEditForm("startDate", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  End Date
                </span>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(event) =>
                    updateEditForm("endDate", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Priority
                </span>
                <select
                  value={editForm.priority}
                  onChange={(event) =>
                    updateEditForm("priority", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Status
                </span>
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    updateEditForm("status", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="aborted">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </label>

              <div className="md:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                    Assign Employees
                  </span>

                  <span className="text-xs font-black text-valencia-orange">
                    Selected: {editForm.memberIds.length}
                  </span>
                </div>

                <div className="rounded-xl border border-valencia-line bg-white">
                  <div className="border-b border-valencia-line p-3">
                    <div className="flex h-11 items-center gap-3 rounded-xl border border-valencia-line bg-white px-4">
                      <Search
                        size={17}
                        className="shrink-0 text-valencia-muted"
                      />

                      <input
                        value={employeeSearch}
                        onChange={(event) =>
                          setEmployeeSearch(event.target.value)
                        }
                        placeholder="Search employee by name, email, role, or department..."
                        className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-valencia-navy outline-none placeholder:text-valencia-muted"
                      />
                    </div>
                  </div>

                  <div className="max-h-[250px] overflow-y-auto p-3">
                    {filteredEmployeeUsers.length ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {filteredEmployeeUsers.map((user) => {
                          const id = getUserId(user);
                          const checked = editForm.memberIds.includes(id);

                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggleMember(id)}
                              className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                checked
                                  ? "border-valencia-orange bg-orange-50"
                                  : "border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/50"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-black ${
                                  checked
                                    ? "border-valencia-orange bg-valencia-orange text-white"
                                    : "border-slate-300 bg-white text-white"
                                }`}
                              >
                                ✓
                              </span>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-valencia-navy">
                                  {getUserName(user)}
                                </p>
                                <p className="truncate text-xs font-semibold text-valencia-muted">
                                  {getUserRole(user)} • {getUserDepartment(user)}
                                </p>
                                {user.email ? (
                                  <p className="truncate text-xs font-semibold text-slate-400">
                                    {user.email}
                                  </p>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-sm font-semibold text-valencia-muted">
                        No employees found.
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-xs font-semibold text-valencia-muted">
                  Search and select employees to assign them to this project.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editSaving}
                className="h-11 rounded-xl border border-valencia-line bg-white px-5 text-sm font-black text-valencia-navy transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={editSaving}
                className="h-11 rounded-xl bg-valencia-orange px-6 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function ProjectTable({
  projects,
  users,
  onOpen,
  onEdit,
  onPause,
  onAbort,
  onDelete,
}) {
  return (
    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead>
            <tr className="border-b border-valencia-line bg-slate-50 text-xs uppercase tracking-[0.1em] text-valencia-muted">
              <th className="px-4 py-4">Project</th>
              <th className="px-4 py-4">Department</th>
              <th className="px-4 py-4">Manager</th>
              <th className="px-4 py-4">Timeline</th>
              <th className="px-4 py-4">Members</th>
              <th className="px-4 py-4">Progress</th>
              <th className="px-4 py-4">Status</th>
              <th className="w-[390px] px-4 py-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {projects.map((project, index) => {
              const id = getProjectId(project) || `project-${index}`;
              const status = normalizeStatus(project?.status);
              const members = getProjectMembers(project, users);
              const progress = getProjectProgress(project);

              return (
                <tr
                  key={id}
                  onClick={() => onOpen(project)}
                  className="cursor-pointer border-b border-valencia-line transition hover:bg-orange-50/60"
                >
                  <td className="px-4 py-4 align-middle">
                    <div className="text-left">
                      <p className="font-black text-valencia-navy">
                        {getProjectName(project)}
                      </p>

                      <p className="mt-1 max-w-xs truncate text-xs font-semibold text-valencia-muted">
                        {getProjectDescription(project)}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-4 align-middle font-semibold text-valencia-muted">
                    {getProjectDepartment(project)}
                  </td>

                  <td className="px-4 py-4 align-middle font-semibold text-valencia-muted">
                    {getProjectManager(project)}
                  </td>

                  <td className="px-4 py-4 align-middle font-semibold text-valencia-muted">
                    {formatDate(getProjectStartDate(project))} to{" "}
                    {formatDate(getProjectEndDate(project))}
                  </td>

                  <td className="px-4 py-4 align-middle font-black text-valencia-navy">
                    {members.length} assigned
                  </td>

                  <td className="min-w-[160px] px-4 py-4 align-middle">
                    <ProjectProgress value={progress} />
                  </td>

                  <td className="px-4 py-4 align-middle">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
                        status
                      )}`}
                    >
                      {formatStatus(status)}
                    </span>
                  </td>

                  <td
                    className="w-[390px] px-4 py-4 align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ProjectActions
                      project={project}
                      onEdit={onEdit}
                      onPause={onPause}
                      onAbort={onAbort}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!projects.length ? (
          <div className="p-8 text-center text-valencia-muted">
            No projects found.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ProjectGrid({
  projects,
  users,
  onOpen,
  onEdit,
  onPause,
  onAbort,
  onDelete,
}) {
  return (
    <section>
      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((project, index) => {
          const id = getProjectId(project) || `project-${index}`;
          const status = normalizeStatus(project?.status);
          const priority = getProjectPriority(project);
          const members = getProjectMembers(project, users);
          const progress = getProjectProgress(project);

          return (
            <article
              key={id}
              onClick={() => onOpen(project)}
              className="card cursor-pointer p-5 transition hover:border-valencia-orange hover:shadow-card"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
                    status
                  )}`}
                >
                  {formatStatus(status)}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getPriorityClass(
                    priority
                  )}`}
                >
                  {formatPriority(priority)}
                </span>
              </div>

              <div className="mt-4 block w-full text-left">
                <h2 className="text-2xl font-black text-valencia-navy">
                  {getProjectName(project)}
                </h2>

                <p className="muted mt-2 line-clamp-2 text-sm">
                  {getProjectDescription(project)}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoBox
                  label="Department"
                  value={getProjectDepartment(project)}
                  icon={BriefcaseBusiness}
                />

                <InfoBox
                  label="Manager"
                  value={getProjectManager(project)}
                  icon={Users}
                />

                <InfoBox
                  label="Timeline"
                  value={`${formatDate(getProjectStartDate(project))} to ${formatDate(
                    getProjectEndDate(project)
                  )}`}
                  icon={CalendarDays}
                />

                <InfoBox
                  label="Members"
                  value={`${members.length} assigned`}
                  icon={Users}
                />
              </div>

              <ProjectProgress value={progress} large />

              <div
                className="mt-5 overflow-x-auto pb-1"
                onClick={(event) => event.stopPropagation()}
              >
                <ProjectActions
                  project={project}
                  onEdit={onEdit}
                  onPause={onPause}
                  onAbort={onAbort}
                  onDelete={onDelete}
                />
              </div>
            </article>
          );
        })}
      </div>

      {!projects.length ? (
        <div className="card p-8 text-center text-valencia-muted">
          No projects found.
        </div>
      ) : null}
    </section>
  );
}

function InfoBox({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon size={15} className="text-valencia-muted" /> : null}

        <p className="text-xs font-black uppercase tracking-[0.1em] text-valencia-muted">
          {label}
        </p>
      </div>

      <p className="mt-2 text-sm font-black text-valencia-navy">{value}</p>
    </div>
  );
}

function ProjectProgress({ value, large = false }) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className={large ? "mt-5" : ""}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-[0.1em] text-valencia-muted">
          Progress
        </span>

        <span className="text-sm font-black text-valencia-navy">
          {progress}%
        </span>
      </div>

      <div
        className={`overflow-hidden rounded-full bg-slate-100 ${
          large ? "h-3" : "h-2"
        }`}
      >
        <div
          className="h-full rounded-full bg-valencia-orange transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ProjectActions({ project, onEdit, onPause, onAbort, onDelete }) {
  const status = normalizeStatus(project?.status);
  const isPaused = status === "on_hold";

  return (
    <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(project);
        }}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-valencia-line bg-white px-3 text-xs font-black text-valencia-navy transition hover:border-valencia-orange hover:bg-orange-50 hover:text-valencia-orange"
      >
        <Pencil size={14} />
        Edit
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onPause(project);
        }}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-valencia-line bg-white px-3 text-xs font-black text-valencia-navy transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
      >
        {isPaused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
        {isPaused ? "Resume" : "Pause"}
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onAbort(project);
        }}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-valencia-line bg-white px-3 text-xs font-black text-valencia-navy transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
      >
        <XCircle size={14} />
        Abort
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(project);
        }}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-valencia-line bg-white px-3 text-xs font-black text-valencia-navy transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}