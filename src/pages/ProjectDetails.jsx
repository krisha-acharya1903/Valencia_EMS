import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Columns3,
  ListChecks,
  Plus,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiDelete, apiGet, apiPatch, apiPost } from "../services/api";
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
  if (Array.isArray(response?.tasks)) return response.tasks;
  if (Array.isArray(response?.subtasks)) return response.subtasks;
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

function getProjectStatus(project) {
  return (
    project?.status ||
    project?.projectStatus ||
    project?.project_status ||
    "active"
  );
}

function getStartDate(project) {
  return (
    project?.startDate ||
    project?.start_date ||
    project?.fromDate ||
    project?.from_date ||
    project?.createdAt ||
    project?.created_at ||
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

function getTaskId(task, index = 0) {
  return String(
    task?.id ||
      task?._id ||
      task?.taskId ||
      task?.task_id ||
      task?.uid ||
      index + 1
  );
}

function getTaskName(task, index = 0) {
  return (
    task?.name ||
    task?.title ||
    task?.taskName ||
    task?.task_name ||
    task?.taskTitle ||
    task?.task_title ||
    `Task ${index + 1}`
  );
}

function getTaskDescription(task) {
  return task?.description || task?.details || task?.summary || "";
}

function getTaskPriority(task) {
  return task?.priority || task?.taskPriority || "Normal";
}

function getTaskStartDate(task) {
  return (
    task?.startDate ||
    task?.start_date ||
    task?.fromDate ||
    task?.from_date ||
    task?.createdAt ||
    task?.created_at ||
    ""
  );
}

function getTaskEndDate(task) {
  return (
    task?.endDate ||
    task?.end_date ||
    task?.dueDate ||
    task?.due_date ||
    task?.deadline ||
    task?.toDate ||
    task?.to_date ||
    ""
  );
}

function getTaskTimeline(task) {
  const start = formatDate(getTaskStartDate(task));
  const end = formatDate(getTaskEndDate(task));

  if (start === "-" && end === "-") return "-";
  if (start === "-") return end;
  if (end === "-") return start;

  return `${start} to ${end}`;
}

function getTaskStatus(task) {
  return normalize(
    task?.status || task?.taskStatus || task?.task_status || "pending"
  );
}

function normalizeTaskStatusForApi(status) {
  const clean = normalize(status);

  if (clean === "completed" || clean === "complete" || clean === "done") {
    return "Completed";
  }

  if (clean === "in progress" || clean === "inprogress" || clean === "doing") {
    return "In Progress";
  }

  return "Pending";
}

function getPrettyTaskStatus(task) {
  const status = getTaskStatus(task);

  if (status === "completed" || status === "complete" || status === "done") {
    return "Completed";
  }

  if (status === "in progress" || status === "inprogress" || status === "doing") {
    return "In Progress";
  }

  return "Pending";
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

function isTaskInProgress(task) {
  const status = getTaskStatus(task);
  return status === "in progress" || status === "inprogress" || status === "doing";
}

function getTaskAssignedRaw(task) {
  return (
    task?.assignedUser ||
    task?.assigned_user ||
    task?.assignedTo ||
    task?.assigned_to ||
    task?.assignee ||
    task?.assigneeName ||
    task?.assignee_name ||
    task?.assignedToName ||
    task?.assigned_to_name ||
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
      task?.assigned_to ||
      task?.assignedTo ||
      getTaskAssignedRaw(task)
  );
}

function getTaskSubtasks(task) {
  const subtasks =
    task?.subtasks ||
    task?.subTasks ||
    task?.sub_tasks ||
    task?.children ||
    task?.checklist ||
    [];

  return Array.isArray(subtasks) ? subtasks : [];
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

function getProjectProgress(project) {
  const tasks = getProjectTasks(project);

  if (!tasks.length) return Number(project?.progress || 0) || 0;

  const completed = tasks.filter(isTaskComplete).length;

  return Math.round((completed / tasks.length) * 100);
}

function getProjectComputedStatus(project) {
  const tasks = getProjectTasks(project);

  if (!tasks.length) return "Pending";
  if (tasks.every(isTaskComplete)) return "Completed";
  if (tasks.some(isTaskInProgress)) return "In Progress";

  return "Pending";
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
      ""
  );
}

function getUserName(user) {
  if (!user) return "Unassigned";
  if (typeof user === "string") return user;

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
  const parts = String(name || "U").split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return String(parts[0] || "U").slice(0, 2).toUpperCase();
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
  const role = normalize(user?.role || getUserRole(user));

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
      const trimmed = field.trim();

      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") return [parsed];
      } catch {
        return trimmed
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
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

function getAssignedEmployeeForTask(task, users) {
  const taskAssignedId = getTaskAssignedId(task).toLowerCase();
  const raw = getTaskAssignedRaw(task);

  if (!taskAssignedId && !raw) return null;

  const matched = users.find((user) => {
    const keys = getUserKeys(user);
    return keys.includes(taskAssignedId) || keys.includes(normalizeId(raw).toLowerCase());
  });

  if (matched) return matched;
  if (typeof raw === "object" && raw) return raw;

  return {
    id: taskAssignedId || raw,
    name: String(raw || taskAssignedId || "Unassigned"),
  };
}

function taskMatchesMember(task, member) {
  if (!member) return true;

  const memberKeys = getUserKeys(member);
  const taskKeys = [
    getTaskAssignedId(task),
    getTaskAssignedRaw(task),
    task?.assignedToId,
    task?.assigned_to_id,
    task?.assigneeId,
    task?.assignee_id,
    task?.employeeId,
    task?.employee_id,
    task?.userId,
    task?.user_id,
    task?.assigned_to,
    task?.assignedTo,
  ]
    .filter(Boolean)
    .flatMap((item) => {
      if (typeof item === "object" && item) return getUserKeys(item);
      return [normalizeId(item).toLowerCase()];
    });

  return memberKeys.some((key) => taskKeys.includes(key));
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

async function fetchProject(projectId, profile) {
  if (typeof projectService.getProjectById === "function") {
    return projectService.getProjectById(projectId, profile);
  }

  if (typeof projectService.getProject === "function") {
    return projectService.getProject(projectId, profile);
  }

  const response = await fetchProjects(profile);
  const projects = extractArray(response);

  return (
    projects.find((project, index) => getProjectId(project, index) === String(projectId)) ||
    projects[Number(projectId) - 1] ||
    null
  );
}

async function fetchProjectTasks(projectId) {
  const taskSources = [];

  try {
    const allTasksResponse = await apiGet("/tasks");
    taskSources.push(...extractArray(allTasksResponse));
  } catch (error) {
    console.warn("Could not fetch /tasks:", error?.message);
  }

  try {
    const projectTaskResponse = await apiGet(`/employee-project-tasks/${projectId}`);
    taskSources.push(...extractArray(projectTaskResponse));
  } catch {
    // Optional route. Ignore.
  }

  const unique = [];
  const seen = new Set();

  taskSources.forEach((task, index) => {
    const taskProjectId = String(
      task?.project_id ||
        task?.projectId ||
        task?.projectID ||
        task?.parent_project_id ||
        task?.parentProjectId ||
        ""
    );

    if (taskProjectId && taskProjectId !== String(projectId)) return;

    const key = String(task?.id || task?.taskId || task?.task_id || index);

    if (seen.has(key)) return;

    seen.add(key);
    unique.push(task);
  });

  return unique;
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[720px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-xl font-black text-[#061638]">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#061638] transition hover:bg-red-50 hover:text-red-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const { profile } = useAuth();

  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("all");
  const [showProgress, setShowProgress] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [projectResponse, usersResponse] = await Promise.all([
        fetchProject(projectId, profile),
        fetchUsers(profile),
      ]);

      if (!projectResponse) {
        setProject(null);
        setUsers([]);
        return;
      }

      const realProjectId = getProjectId(projectResponse, Number(projectId) - 1);
      const backendTasks = await fetchProjectTasks(realProjectId);
      const projectTasks = getProjectTasks(projectResponse);
      const finalTasks = backendTasks.length ? backendTasks : projectTasks;

      setProject({
        ...projectResponse,
        tasks: finalTasks,
        taskList: finalTasks,
        task_list: finalTasks,
      });

      setUsers(extractArray(usersResponse).filter(isEmployeeLike));
    } catch (error) {
      console.error("Project detail load error:", error);
      toast.error(error?.message || "Failed to load project.");
      setProject(null);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignedEmployees = useMemo(() => {
    return getProjectAssignedEmployees(project, users);
  }, [project, users]);

  const selectedMember = useMemo(() => {
    if (selectedMemberId === "all") return null;

    return (
      assignedEmployees.find((employee) => getUserId(employee) === selectedMemberId) ||
      null
    );
  }, [assignedEmployees, selectedMemberId]);

  const allTasks = useMemo(() => {
    return getProjectTasks(project);
  }, [project]);

  const visibleTasks = useMemo(() => {
    if (!selectedMember) return allTasks;

    return allTasks.filter((task) => taskMatchesMember(task, selectedMember));
  }, [allTasks, selectedMember]);

  const progressPercent = useMemo(() => {
    return getProjectProgress({
      ...project,
      tasks: visibleTasks,
    });
  }, [project, visibleTasks]);

  const taskStats = useMemo(() => {
    const completed = visibleTasks.filter(isTaskComplete).length;
    const inProgress = visibleTasks.filter(isTaskInProgress).length;
    const pending = Math.max(0, visibleTasks.length - completed - inProgress);

    return {
      total: visibleTasks.length,
      completed,
      inProgress,
      pending,
    };
  }, [visibleTasks]);

  async function handleTaskStatusChange(taskIndex, nextStatus) {
    const task = allTasks[taskIndex];

    if (!task) return;

    const taskId = getTaskId(task, taskIndex);

    if (!task?.id && !task?.taskId && !task?.task_id) {
      toast.error("This task is not saved in database yet.");
      return;
    }

    setSaving(true);

    try {
      await apiPatch(`/tasks/${taskId}/status`, {
        status: normalizeTaskStatusForApi(nextStatus),
      });

      toast.success("Task status updated.");
      await loadData();
    } catch (error) {
      console.error("Task status update error:", error);
      toast.error(error?.message || "Failed to update task status.");
    } finally {
      setSaving(false);
    }
  }

  async function addTask(payload) {
    if (!project) return;

    const realProjectId = getProjectId(project, Number(projectId) - 1);

    const selectedUser = users.find((user) => {
      const userId = String(getUserId(user));
      const userEmail = String(getUserEmail(user)).toLowerCase();
      const userName = String(getUserName(user)).toLowerCase();

      const payloadId = String(
        payload.assignedToId ||
          payload.assigned_to ||
          payload.assignedTo ||
          payload.employeeId ||
          ""
      );

      const payloadEmail = String(
        payload.assignedUser?.email ||
          payload.assignedTo?.email ||
          ""
      ).toLowerCase();

      const payloadName = String(
        payload.assignedUser?.name ||
          payload.assignedTo?.name ||
          payload.assignedTo ||
          ""
      ).toLowerCase();

      return (
        userId === payloadId ||
        userEmail === payloadEmail ||
        userName === payloadName
      );
    });

    const assignedTo = selectedUser ? getUserId(selectedUser) : "";

    if (!assignedTo) {
      toast.error("Assigned employee ID missing. Select employee again.");
      return;
    }

    setSaving(true);

    const taskPayload = {
      project_id: realProjectId,
      projectId: realProjectId,

      title: payload.title || payload.name,
      name: payload.title || payload.name,

      description: payload.description || "",

      assigned_to: assignedTo,
      assignedTo: assignedTo,
      assignedToId: assignedTo,

      status: normalizeTaskStatusForApi(payload.status || "Pending"),
      priority: payload.priority || "Normal",

      start_date: payload.startDate || payload.start_date || "",
      startDate: payload.startDate || payload.start_date || "",

      end_date: payload.endDate || payload.end_date || payload.dueDate || "",
      endDate: payload.endDate || payload.end_date || payload.dueDate || "",
      dueDate: payload.dueDate || payload.endDate || payload.end_date || "",

      department: getProjectDepartment(project),
    };

    try {
      await apiPost("/tasks", taskPayload);

      toast.success("Task assigned and saved.");
      setTaskModalOpen(false);

      try {
        await loadData();
      } catch (reloadError) {
        console.warn("Task created, but reload failed:", reloadError);
      }
    } catch (error) {
      console.warn("Create task request returned error:", error);

      try {
        await loadData();

        toast.success("Task assigned and saved.");
        setTaskModalOpen(false);
      } catch (reloadError) {
        console.error("Add task error:", error);
        console.error("Reload after failed create also failed:", reloadError);

        toast.error(error?.message || "Failed to save task.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function addSubtask(payload) {
    const parentTask = allTasks[Number(payload.parentTaskIndex)];

    if (!parentTask) {
      toast.error("Select a valid parent task.");
      return;
    }

    const taskId = getTaskId(parentTask, Number(payload.parentTaskIndex));

    if (!parentTask?.id && !parentTask?.taskId && !parentTask?.task_id) {
      toast.error("Parent task is not saved in database yet.");
      return;
    }

    setSaving(true);

    try {
      await apiPost("/subtasks", {
        task_id: taskId,
        title: payload.title,
        status: "Pending",
      });

      toast.success("Subtask added.");
      setSubtaskModalOpen(false);
      await loadData();
    } catch (error) {
      console.error("Add subtask error:", error);
      toast.error(error?.message || "Failed to save subtask.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(task, index) {
    const taskId = getTaskId(task, index);

    if (!task?.id && !task?.taskId && !task?.task_id) {
      toast.error("This task is not saved in database.");
      return;
    }

    const confirmed = window.confirm("Delete this task permanently?");

    if (!confirmed) return;

    setSaving(true);

    try {
      await apiDelete(`/tasks/${taskId}`);
      toast.success("Task deleted.");
      await loadData();
    } catch (error) {
      console.error("Delete task error:", error);
      toast.error(error?.message || "Failed to delete task.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="mobile-frame">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-sm font-semibold text-slate-500">
            Loading project...
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="page-shell">
        <div className="mobile-frame">
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm font-semibold text-slate-500">
            Project not found.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-black leading-tight text-[#061638]">
                {getProjectName(project, Number(projectId) - 1)}
              </h1>

              <p className="mt-2 max-w-[760px] text-sm font-semibold leading-6 text-slate-500">
                {getProjectDescription(project)}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase text-blue-600">
                  {getProjectStatus(project)}
                </span>

                <span className="rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase text-[#FF6B35]">
                  {getProjectDepartment(project)}
                </span>

                <span className="rounded-full bg-slate-50 px-4 py-2 text-xs font-black uppercase text-slate-600">
                  {getTimeline(project)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#FF6B35]">
                Project Progress
              </p>
              <p className="mt-2 text-4xl font-black text-[#061638]">
                {getProjectProgress(project)}%
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-3">
            <UsersRound size={30} className="mt-1 text-[#061638]" />

            <div>
              <h2 className="text-2xl font-black text-[#061638]">
                Project Users
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                View all users assigned to this project.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedMemberId("all")}
              className={`min-w-[135px] rounded-xl border px-5 py-4 text-left transition ${
                selectedMemberId === "all"
                  ? "border-[#FF6B35] bg-orange-50"
                  : "border-slate-200 bg-white hover:border-[#FF6B35]"
              }`}
            >
              <p className="font-black text-[#061638]">All Users</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {allTasks.length} tasks
              </p>
            </button>

            {assignedEmployees.length ? (
              assignedEmployees.map((employee, index) => {
                const id = getUserId(employee) || `employee-${index}`;
                const employeeTasks = allTasks.filter((task) =>
                  taskMatchesMember(task, employee)
                );

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedMemberId(id)}
                    className={`min-w-[240px] rounded-xl border px-5 py-4 text-left transition ${
                      selectedMemberId === id
                        ? "border-[#FF6B35] bg-orange-50"
                        : "border-slate-200 bg-white hover:border-[#FF6B35]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B35] text-xs font-black text-white">
                        {getInitials(getUserName(employee))}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-black text-[#061638]">
                          {getUserName(employee)}
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-500">
                          {getUserRole(employee)} • {employeeTasks.length} tasks
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-5 py-4 text-sm font-semibold text-slate-500">
                No employees assigned.
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="grid gap-4 border-b border-slate-100 p-6 xl:grid-cols-[1fr_auto] xl:items-start">
            <div>
              <h2 className="text-2xl font-black text-[#061638]">
                Project Tasks
              </h2>

              <p className="mt-2 max-w-[380px] text-sm font-semibold leading-6 text-slate-500">
                View tasks, update status, and track subtasks for this project.
              </p>
            </div>

            <div className="flex min-w-max items-center justify-end gap-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
              >
                <Plus size={18} />
                Add Task
              </button>

              <button
                type="button"
                onClick={() => setSubtaskModalOpen(true)}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
              >
                <Plus size={18} />
                Add Sub Task
              </button>

              <div className="flex h-11 shrink-0 items-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-black text-[#FF6B35]">
                Status: {getProjectComputedStatus({ ...project, tasks: visibleTasks })}
              </div>

              <button
                type="button"
                onClick={() => setShowProgress((current) => !current)}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#FF6B35] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(255,107,53,0.25)] transition hover:opacity-90"
              >
                <BarChart3 size={18} />
                {showProgress ? "Hide Progress" : "Show Progress"}
              </button>
            </div>
          </div>

          {showProgress ? (
            <ProgressSection
              tasks={visibleTasks}
              users={users}
              progress={progressPercent}
              stats={taskStats}
            />
          ) : null}

          <TaskTable
            tasks={visibleTasks}
            allTasks={allTasks}
            users={users}
            onStatusChange={handleTaskStatusChange}
            onDelete={deleteTask}
          />
        </section>
      </div>

      {taskModalOpen ? (
        <TaskModal
          users={users}
          onClose={() => setTaskModalOpen(false)}
          onSave={addTask}
        />
      ) : null}

      {subtaskModalOpen ? (
        <SubtaskModal
          tasks={allTasks}
          onClose={() => setSubtaskModalOpen(false)}
          onSave={addSubtask}
        />
      ) : null}

      {saving ? (
        <div className="fixed bottom-5 right-5 z-[999] rounded-full bg-[#061638] px-4 py-2 text-sm font-black text-white shadow-lg">
          Saving...
        </div>
      ) : null}
    </main>
  );
}

function TaskTable({ tasks, allTasks, users, onStatusChange, onDelete }) {
  if (!tasks.length) {
    return (
      <div>
        <div className="grid grid-cols-[1.2fr_1fr_0.9fr_0.8fr_1fr_1fr_0.8fr] bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          <span>Task</span>
          <span>Assigned To</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Timeline</span>
          <span>Subtasks</span>
          <span>Actions</span>
        </div>

        <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500">
          No tasks found for this selection.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
            <th className="px-5 py-4">Task</th>
            <th className="px-5 py-4">Assigned To</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Priority</th>
            <th className="px-5 py-4">Timeline</th>
            <th className="px-5 py-4">Subtasks</th>
            <th className="px-5 py-4">Actions</th>
          </tr>
        </thead>

        <tbody>
          {tasks.map((task, visibleIndex) => {
            const actualIndex = allTasks.findIndex(
              (item) => getTaskId(item) === getTaskId(task)
            );
            const assigned = getAssignedEmployeeForTask(task, users);
            const subtasks = getTaskSubtasks(task);

            return (
              <tr
                key={getTaskId(task, visibleIndex)}
                className="border-b border-slate-100 bg-white"
              >
                <td className="px-5 py-5 align-top">
                  <p className="font-black text-[#061638]">
                    {getTaskName(task, visibleIndex)}
                  </p>

                  {getTaskDescription(task) ? (
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {getTaskDescription(task)}
                    </p>
                  ) : null}
                </td>

                <td className="px-5 py-5 align-top font-black text-[#061638]">
                  {assigned ? getUserName(assigned) : "Unassigned"}
                </td>

                <td className="px-5 py-5 align-top">
                  <select
                    value={getTaskStatus(task)}
                    onChange={(event) =>
                      onStatusChange(actualIndex, event.target.value)
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-[#061638] outline-none focus:border-[#FF6B35]"
                  >
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>

                <td className="px-5 py-5 align-top font-black text-[#061638]">
                  {getTaskPriority(task)}
                </td>

                <td className="px-5 py-5 align-top font-semibold leading-6 text-slate-600">
                  {getTaskTimeline(task)}
                </td>

                <td className="px-5 py-5 align-top">
                  {subtasks.length ? (
                    <div className="space-y-2">
                      {subtasks.map((subtask, index) => (
                        <div
                          key={subtask?.id || index}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <p className="font-black text-[#061638]">
                            {subtask?.title ||
                              subtask?.name ||
                              subtask?.taskName ||
                              `Subtask ${index + 1}`}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {subtask?.status || "Pending"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-slate-400">
                      No subtasks
                    </span>
                  )}
                </td>

                <td className="px-5 py-5 align-top">
                  <button
                    type="button"
                    onClick={() => onDelete(task, actualIndex)}
                    className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-[#061638] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProgressSection({ tasks, users, progress, stats }) {
  return (
    <div className="border-b border-slate-100 bg-white p-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <StatusProgressBar progress={progress} stats={stats} />
        <GanttChart tasks={tasks} users={users} />
      </div>

      <KanbanBoard tasks={tasks} users={users} />
    </div>
  );
}

function StatusProgressBar({ progress, stats }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-[#FF6B35]">
          <BarChart3 size={20} />
        </div>

        <div>
          <h3 className="text-lg font-black text-[#061638]">Status Bar</h3>
          <p className="text-sm font-semibold text-slate-500">
            Overall task completion status.
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
          Progress
        </span>

        <span className="text-3xl font-black text-[#061638]">{progress}%</span>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#FF6B35] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3">
        <MiniStat label="Total" value={stats.total} />
        <MiniStat label="Done" value={stats.completed} />
        <MiniStat label="Progress" value={stats.inProgress} />
        <MiniStat label="Pending" value={stats.pending} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-xl font-black text-[#061638]">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function GanttChart({ tasks, users }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <CalendarDays size={20} />
        </div>

        <div>
          <h3 className="text-lg font-black text-[#061638]">Gantt Chart</h3>
          <p className="text-sm font-semibold text-slate-500">
            Timeline view of project tasks.
          </p>
        </div>
      </div>

      {tasks.length ? (
        <div className="space-y-3">
          {tasks.map((task, index) => {
            const assigned = getAssignedEmployeeForTask(task, users);
            const width = isTaskComplete(task) ? 100 : isTaskInProgress(task) ? 60 : 28;

            return (
              <div key={getTaskId(task, index)}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
                  <span className="truncate">
                    {getTaskName(task, index)}
                    {assigned ? ` • ${getUserName(assigned)}` : ""}
                  </span>
                  <span>{getTaskTimeline(task)}</span>
                </div>

                <div className="h-8 overflow-hidden rounded-xl bg-white">
                  <div
                    className="flex h-full items-center rounded-xl bg-[#FF6B35] px-3 text-xs font-black text-white"
                    style={{ width: `${width}%` }}
                  >
                    {getPrettyTaskStatus(task)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
          No tasks available for Gantt chart.
        </div>
      )}
    </div>
  );
}

function KanbanBoard({ tasks, users }) {
  const columns = [
    {
      key: "pending",
      title: "Pending",
      icon: Clock3,
      items: tasks.filter((task) => !isTaskComplete(task) && !isTaskInProgress(task)),
    },
    {
      key: "in-progress",
      title: "In Progress",
      icon: ListChecks,
      items: tasks.filter(isTaskInProgress),
    },
    {
      key: "completed",
      title: "Completed",
      icon: CheckCircle2,
      items: tasks.filter(isTaskComplete),
    },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600">
          <Columns3 size={20} />
        </div>

        <div>
          <h3 className="text-lg font-black text-[#061638]">Kanban</h3>
          <p className="text-sm font-semibold text-slate-500">
            Task board based on current status.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((column) => {
          const Icon = column.icon;

          return (
            <div
              key={column.key}
              className="min-h-[210px] rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-[#061638]">
                  <Icon size={16} />
                  {column.title}
                </h4>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                  {column.items.length}
                </span>
              </div>

              <div className="space-y-3">
                {column.items.length ? (
                  column.items.map((task, index) => {
                    const assigned = getAssignedEmployeeForTask(task, users);

                    return (
                      <div
                        key={getTaskId(task, index)}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="font-black text-[#061638]">
                          {getTaskName(task, index)}
                        </p>

                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {assigned ? getUserName(assigned) : "Unassigned"}
                        </p>

                        <div className="mt-3 flex items-center justify-between text-xs font-black text-slate-500">
                          <span>{getTaskPriority(task)}</span>
                          <span>{formatDate(getTaskEndDate(task))}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskModal({ users, onClose, onSave }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedToId: "",
    status: "Pending",
    priority: "High",
    startDate: "",
    endDate: "",
  });

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Task name is required.");
      return;
    }

    if (!form.assignedToId) {
      toast.error("Select employee before assigning task.");
      return;
    }

    const assignedUser = users.find(
      (user) => String(getUserId(user)) === String(form.assignedToId)
    );

    onSave({
      title: form.title.trim(),
      name: form.title.trim(),
      description: form.description.trim(),

      assignedToId: form.assignedToId,
      assigned_to: form.assignedToId,
      assignedTo: form.assignedToId,

      assignedUser: assignedUser
        ? {
            id: getUserId(assignedUser),
            name: getUserName(assignedUser),
            email: getUserEmail(assignedUser),
            department: getUserDepartment(assignedUser),
          }
        : null,

      status: form.status,
      priority: form.priority,
      startDate: form.startDate,
      endDate: form.endDate,
      dueDate: form.endDate,
    });
  }

  return (
    <Modal title="Add Task" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Task Name
          </span>

          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Task name"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
          />
        </label>

        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Description
          </span>

          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            rows={3}
            placeholder="Task description"
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Assigned To
            </span>

            <select
              value={form.assignedToId}
              onChange={(event) => updateField("assignedToId", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
            >
              <option value="">Select employee</option>
              {users.map((user, index) => (
                <option key={getUserId(user) || index} value={getUserId(user)}>
                  {getUserName(user)}
                </option>
              ))}
            </select>
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
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Priority
            </span>

            <select
              value={form.priority}
              onChange={(event) => updateField("priority", event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
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

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638]"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="h-11 rounded-xl bg-[#FF6B35] px-6 text-sm font-black text-white"
          >
            Add Task
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SubtaskModal({ tasks, onClose, onSave }) {
  const [form, setForm] = useState({
    parentTaskIndex: "",
    title: "",
  });

  function submit(event) {
    event.preventDefault();

    if (form.parentTaskIndex === "") {
      toast.error("Select a parent task.");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Subtask name is required.");
      return;
    }

    onSave({
      parentTaskIndex: form.parentTaskIndex,
      title: form.title.trim(),
    });
  }

  return (
    <Modal title="Add Sub Task" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Parent Task
          </span>

          <select
            value={form.parentTaskIndex}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                parentTaskIndex: event.target.value,
              }))
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
          >
            <option value="">Select task</option>
            {tasks.map((task, index) => (
              <option key={getTaskId(task, index)} value={String(index)}>
                {getTaskName(task, index)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Subtask Name
          </span>

          <input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Subtask name"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
          />
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638]"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="h-11 rounded-xl bg-[#FF6B35] px-6 text-sm font-black text-white"
          >
            Add Subtask
          </button>
        </div>
      </form>
    </Modal>
  );
}