import {
  ArrowLeft,
  CalendarDays,
  ListChecks,
  PauseCircle,
  Plus,
  Save,
  Trash2,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
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

function extractArray(response, key) {
  if (Array.isArray(response)) return response;
  if (key && Array.isArray(response?.[key])) return response[key];
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.tasks)) return response.tasks;
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

function getProjectStatus(project) {
  return project?.status || project?.projectStatus || "active";
}

function normalizeStatus(value) {
  const status = normalize(value);

  if (!status) return "pending";

  if (["active", "approved", "open", "ongoing"].includes(status)) {
    return "active";
  }

  if (["in progress", "inprogress", "progress"].includes(status)) {
    return "in_progress";
  }

  if (["hold", "on hold", "paused", "pause"].includes(status)) {
    return "on_hold";
  }

  if (["abort", "aborted", "cancelled", "canceled", "rejected"].includes(status)) {
    return "aborted";
  }

  if (["complete", "completed", "done", "finished"].includes(status)) {
    return "completed";
  }

  if (["pending", "todo", "to do"].includes(status)) {
    return "pending";
  }

  return status.replaceAll(" ", "_");
}

function formatStatus(value) {
  const status = normalizeStatus(value);

  if (status === "active") return "Active";
  if (status === "on_hold") return "On Hold";
  if (status === "aborted") return "Aborted";
  if (status === "completed") return "Completed";
  if (status === "pending") return "Pending";
  if (status === "in_progress") return "In Progress";

  return String(value || "Pending")
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

function getTaskTitle(task) {
  return task?.title || task?.name || task?.taskName || task?.task || "Untitled Task";
}

function getTaskId(task, index = 0) {
  return String(
    task?.id ||
      task?._id ||
      task?.taskId ||
      task?.task_id ||
      `${getTaskTitle(task)}-${index}`
  );
}

function getTaskDescription(task) {
  return task?.description || task?.details || task?.summary || "";
}

function getTaskPriority(task) {
  return task?.priority || task?.taskPriority || "Medium";
}

function getTaskStatus(task) {
  return task?.status || task?.taskStatus || "Pending";
}

function getTaskAssignedRaw(task) {
  return (
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
      getTaskAssignedRaw(task)
  );
}

function getTaskAssignedName(task, usersMap = new Map(), teamMembers = []) {
  const assignedId = getTaskAssignedId(task);
  const raw = getTaskAssignedRaw(task);

  if (typeof raw === "object" && raw) {
    return (
      raw.name ||
      raw.fullName ||
      raw.full_name ||
      raw.displayName ||
      raw.display_name ||
      raw.employeeName ||
      raw.employee_name ||
      raw.email ||
      "Assigned Employee"
    );
  }

  const keys = [
    assignedId,
    raw,
    task?.assignedToId,
    task?.assigned_to_id,
    task?.assigneeId,
    task?.assignee_id,
    task?.employeeId,
    task?.employee_id,
    task?.userId,
    task?.user_id,
  ]
    .filter(Boolean)
    .map((item) => normalizeId(item).toLowerCase());

  for (const key of keys) {
    const matchedUser = usersMap.get(key);

    if (matchedUser) {
      return getUserName(matchedUser);
    }

    const matchedMember = teamMembers.find((member) => {
      const memberKeys = getMemberKeys(member);
      return memberKeys.includes(key);
    });

    if (matchedMember) {
      return getUserName(matchedMember);
    }
  }

  if (/^\d+$/.test(String(raw || assignedId || "")) && teamMembers.length === 1) {
    return getUserName(teamMembers[0]);
  }

  if (/^\d+$/.test(String(raw || assignedId || ""))) {
    return "Assigned Employee";
  }

  return String(raw || assignedId || "Assigned Employee");
}

function getTaskDeadline(task) {
  return (
    task?.deadline ||
    task?.dueDate ||
    task?.due_date ||
    task?.endDate ||
    task?.end_date ||
    ""
  );
}

function getTaskStartDate(task) {
  return task?.startDate || task?.start_date || task?.fromDate || task?.from_date || "";
}

function getTaskEndDate(task) {
  return (
    task?.endDate ||
    task?.end_date ||
    task?.dueDate ||
    task?.due_date ||
    task?.deadline ||
    ""
  );
}

function getTaskSubtasks(task) {
  if (Array.isArray(task?.subtasks)) return task.subtasks;
  if (Array.isArray(task?.sub_tasks)) return task.sub_tasks;
  if (Array.isArray(task?.children)) return task.children;
  if (Array.isArray(task?.subTasks)) return task.subTasks;
  return [];
}

function getSubtaskTitle(subtask, index) {
  return (
    subtask?.title ||
    subtask?.name ||
    subtask?.subtask ||
    subtask?.description ||
    `Subtask ${index + 1}`
  );
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
    "Team Member"
  );
}

function getUserRole(user) {
  return user?.designation || user?.role || user?.position || "Team Member";
}

function getInitials(name) {
  const words = String(name || "U").trim().split(" ").filter(Boolean);

  if (!words.length) return "U";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getMemberKeys(member) {
  return [
    member?.id,
    member?._id,
    member?.uid,
    member?.userId,
    member?.user_id,
    member?.employeeId,
    member?.employee_id,
    member?.email,
    member?.name,
    member?.fullName,
    member?.full_name,
    member?.displayName,
    member?.display_name,
    member?.employeeName,
    member?.employee_name,
  ]
    .filter(Boolean)
    .map((item) => normalizeId(item).toLowerCase());
}

function projectMembers(project) {
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
    project?.employeeIds,
    project?.employee_ids,
  ];

  return fields.flatMap((field) => {
    if (!field) return [];

    if (Array.isArray(field)) {
      return field;
    }

    if (typeof field === "string") {
      return field
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [field];
  });
}

function buildUserLookup(users) {
  const map = new Map();

  users.forEach((user) => {
    const keys = getMemberKeys(user);

    keys.forEach((key) => {
      if (key) map.set(key, user);
    });
  });

  return map;
}

function resolveMember(rawMember, usersMap, index = 0) {
  const key = normalizeId(rawMember).toLowerCase();
  const matched = usersMap.get(key);

  if (typeof rawMember === "object" && rawMember) {
    const rawKeys = getMemberKeys(rawMember);
    const matchedFromObject = rawKeys.map((item) => usersMap.get(item)).find(Boolean);

    return {
      ...(matched || matchedFromObject || {}),
      ...rawMember,
      id:
        normalizeId(rawMember) ||
        getUserId(matched || matchedFromObject) ||
        `member-${index}`,
      name: getUserName({ ...(matched || matchedFromObject || {}), ...rawMember }),
      role: getUserRole({ ...(matched || matchedFromObject || {}), ...rawMember }),
    };
  }

  if (matched) {
    return {
      ...matched,
      id: getUserId(matched),
      name: getUserName(matched),
      role: getUserRole(matched),
    };
  }

  if (/^\d+$/.test(String(rawMember || ""))) {
    return null;
  }

  return {
    id: normalizeId(rawMember) || `member-${index}`,
    name: String(rawMember || `Member ${index + 1}`),
    role: "Team Member",
  };
}

function isTaskForMember(task, member, teamMembers = []) {
  const memberKeys = getMemberKeys(member);

  const taskKeys = [
    getTaskAssignedId(task),
    getTaskAssignedName(task),
    task?.assignedTo,
    task?.assigned_to,
    task?.assignedToId,
    task?.assigned_to_id,
    task?.assignee,
    task?.assigneeId,
    task?.assignee_id,
    task?.employee,
    task?.employeeId,
    task?.employee_id,
    task?.user,
    task?.userId,
    task?.user_id,
  ]
    .filter(Boolean)
    .flatMap((item) => {
      if (typeof item === "object" && item) {
        return [
          item.id,
          item._id,
          item.uid,
          item.userId,
          item.user_id,
          item.employeeId,
          item.employee_id,
          item.email,
          item.name,
          item.fullName,
          item.full_name,
          item.displayName,
          item.display_name,
          item.employeeName,
          item.employee_name,
        ];
      }

      return [item];
    })
    .filter(Boolean)
    .map((item) => normalizeId(item).toLowerCase());

  const directMatch = memberKeys.some((key) => taskKeys.includes(key));

  if (directMatch) return true;

  const assignedValue = String(getTaskAssignedRaw(task) || getTaskAssignedId(task) || "");

  if (/^\d+$/.test(assignedValue) && teamMembers.length === 1) {
    const onlyMemberKey = String(
      teamMembers[0]?.id || teamMembers[0]?.email || teamMembers[0]?.name || ""
    );

    const currentMemberKey = String(member?.id || member?.email || member?.name || "");

    return onlyMemberKey === currentMemberKey;
  }

  return false;
}

function statusClass(status) {
  const value = normalizeStatus(status);

  if (value === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (value === "active") return "bg-blue-50 text-blue-700 border-blue-100";
  if (value === "on_hold") return "bg-yellow-50 text-yellow-700 border-yellow-100";
  if (value === "aborted") return "bg-red-50 text-red-700 border-red-100";
  if (value === "in_progress") return "bg-orange-50 text-[#FF6B35] border-orange-100";

  return "bg-orange-50 text-[#FF6B35] border-orange-100";
}

function priorityClass(priority) {
  const value = normalize(priority);

  if (value.includes("high") || value.includes("critical")) {
    return "text-red-600";
  }

  if (value.includes("low")) {
    return "text-emerald-600";
  }

  return "text-[#061638]";
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-black text-[#061638]">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

async function fetchProjects(profile) {
  if (projectService.getAllProjects) return projectService.getAllProjects(profile);
  if (projectService.getProjects) return projectService.getProjects(profile);
  if (projectService.fetchProjects) return projectService.fetchProjects(profile);
  return [];
}

async function fetchProjectById(projectId, profile) {
  if (projectService.getProjectById) return projectService.getProjectById(projectId, profile);
  if (projectService.getProject) return projectService.getProject(projectId, profile);

  const response = await fetchProjects(profile);
  const projects = extractArray(response, "projects");

  return (
    projects.find((project) => String(getProjectId(project)) === String(projectId)) ||
    null
  );
}

async function updateProjectRecord(projectId, payload, profile) {
  if (projectService.updateProject) return projectService.updateProject(projectId, payload, profile);
  if (projectService.editProject) return projectService.editProject(projectId, payload, profile);

  throw new Error("Project update function not found.");
}

async function fetchUsers() {
  if (userService.getUsers) return userService.getUsers();
  if (userService.fetchUsers) return userService.fetchUsers();
  return [];
}

async function fetchProjectTasks(projectId, project) {
  if (projectService.getProjectTasks) return projectService.getProjectTasks(projectId);
  if (projectService.getTasksByProject) return projectService.getTasksByProject(projectId);

  const source =
    project?.tasks ||
    project?.taskList ||
    project?.task_list ||
    project?.todos ||
    project?.toDos ||
    project?.checklist ||
    [];

  return Array.isArray(source) ? source : [];
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState("all");
  const [activeModal, setActiveModal] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);

  const [taskForm, setTaskForm] = useState({
    title: "",
    assignedTo: "",
    status: "pending",
    priority: "medium",
    startDate: "",
    endDate: "",
    description: "",
  });

  const [subTaskForm, setSubTaskForm] = useState({
    title: "",
    status: "pending",
  });

  async function loadPage() {
    setLoading(true);

    try {
      const foundProject = await fetchProjectById(projectId, profile);

      if (!foundProject) {
        toast.error("Project not found.");
        setProject(null);
        setTasks([]);
        return;
      }

      const userResponse = await fetchUsers();
      const userList = extractArray(userResponse, "users");

      const taskResponse = await fetchProjectTasks(projectId, foundProject);
      const taskList = extractArray(taskResponse, "tasks");

      setProject(foundProject);
      setUsers(userList);
      setTasks(taskList);
    } catch (error) {
      console.error("Project details load error:", error);
      toast.error(error?.message || "Failed to load project details.");
      setProject(null);
      setTasks([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, [projectId]);

  const usersMap = useMemo(() => buildUserLookup(users), [users]);

  const teamMembers = useMemo(() => {
    if (!project) return [];

    const explicitMembers = projectMembers(project)
      .map((member, index) => resolveMember(member, usersMap, index))
      .filter(Boolean);

    const map = new Map();

    explicitMembers.forEach((member) => {
      const key = String(member.id || member.email || member.name || "").toLowerCase();

      if (!key) return;

      map.set(key, {
        ...(map.get(key) || {}),
        ...member,
      });
    });

    return Array.from(map.values());
  }, [project, usersMap]);

  const visibleTasks = useMemo(() => {
    if (selectedUserId === "all") return tasks;

    const selectedMember = teamMembers.find(
      (member) => String(member.id || member.email || member.name) === String(selectedUserId)
    );

    if (!selectedMember) return tasks;

    return tasks.filter((task) => isTaskForMember(task, selectedMember, teamMembers));
  }, [tasks, selectedUserId, teamMembers]);

  const selectedMember = useMemo(() => {
    if (selectedUserId === "all") return null;

    return (
      teamMembers.find(
        (member) => String(member.id || member.email || member.name) === String(selectedUserId)
      ) || null
    );
  }, [selectedUserId, teamMembers]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (task) => normalizeStatus(getTaskStatus(task)) === "completed"
    ).length;

    const progress = total ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      progress,
      status:
        progress === 100
          ? "Completed"
          : tasks.some((task) => normalizeStatus(getTaskStatus(task)) === "in_progress")
          ? "In Progress"
          : "Pending",
    };
  }, [tasks]);

  async function saveProjectWithTasks(nextTasks, successMessage) {
    if (!project) return;

    const id = getProjectId(project);

    const payload = {
      ...project,
      tasks: nextTasks,
      taskList: nextTasks,
    };

    setTasks(nextTasks);
    setProject(payload);

    try {
      await updateProjectRecord(id, payload, profile);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error?.message || "Saved locally. Backend update failed.");
    }
  }

  function openAddTask() {
    setTaskForm({
      title: "",
      assignedTo: selectedMember?.id || selectedMember?.email || selectedMember?.name || "",
      status: "pending",
      priority: "medium",
      startDate: "",
      endDate: "",
      description: "",
    });

    setActiveModal("task");
  }

  function submitTask(event) {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    const assignedMember = teamMembers.find(
      (member) => String(member.id || member.email || member.name) === String(taskForm.assignedTo)
    );

    const newTask = {
      id: Date.now(),
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      assignedTo: assignedMember
        ? {
            id: assignedMember.id,
            name: getUserName(assignedMember),
            email: assignedMember.email || "",
          }
        : taskForm.assignedTo || "",
      assignedToId: assignedMember?.id || taskForm.assignedTo || "",
      assignedToName: assignedMember ? getUserName(assignedMember) : taskForm.assignedTo || "",
      assignee: assignedMember ? getUserName(assignedMember) : taskForm.assignedTo || "",
      status: taskForm.status,
      priority: taskForm.priority,
      startDate: taskForm.startDate,
      endDate: taskForm.endDate,
      subtasks: [],
    };

    saveProjectWithTasks([...tasks, newTask], "Task added.");
    setActiveModal("");
  }

  function openAddSubTask(task = null) {
    setSelectedTask(task || visibleTasks[0] || null);
    setSubTaskForm({
      title: "",
      status: "pending",
    });
    setActiveModal("subtask");
  }

  function submitSubTask(event) {
    event.preventDefault();

    if (!selectedTask) {
      toast.error("Select a task first.");
      return;
    }

    if (!subTaskForm.title.trim()) {
      toast.error("Sub task title is required.");
      return;
    }

    const selectedTaskId = getTaskId(selectedTask);

    const nextTasks = tasks.map((task, index) => {
      const currentTaskId = getTaskId(task, index);

      if (currentTaskId !== selectedTaskId) return task;

      return {
        ...task,
        subtasks: [
          ...getTaskSubtasks(task),
          {
            id: Date.now(),
            title: subTaskForm.title.trim(),
            status: subTaskForm.status,
          },
        ],
      };
    });

    saveProjectWithTasks(nextTasks, "Sub task added.");
    setActiveModal("");
    setSelectedTask(null);
  }

  function updateTaskStatus(task, nextStatus) {
    const taskId = getTaskId(task);

    const nextTasks = tasks.map((item, index) => {
      if (getTaskId(item, index) !== taskId) return item;

      return {
        ...item,
        status: nextStatus,
      };
    });

    saveProjectWithTasks(nextTasks, "Task status updated.");
  }

  function updateSubTaskStatus(task, subtaskIndex, nextStatus) {
    const taskId = getTaskId(task);

    const nextTasks = tasks.map((item, index) => {
      if (getTaskId(item, index) !== taskId) return item;

      return {
        ...item,
        subtasks: getTaskSubtasks(item).map((subtask, currentIndex) =>
          currentIndex === subtaskIndex
            ? {
                ...subtask,
                status: nextStatus,
              }
            : subtask
        ),
      };
    });

    saveProjectWithTasks(nextTasks, "Sub task status updated.");
  }

  async function updateProjectStatus(nextStatus) {
    if (!project) return;

    const id = getProjectId(project);
    const payload = {
      ...project,
      status: nextStatus,
    };

    setProject(payload);

    try {
      await updateProjectRecord(id, payload, profile);
      toast.success(
        nextStatus === "on_hold"
          ? "Project put on hold."
          : nextStatus === "aborted"
          ? "Project aborted."
          : "Project updated."
      );
    } catch (error) {
      toast.error(error?.message || "Failed to update project.");
    }
  }

  function deleteTask(task) {
    if (!window.confirm(`Delete ${getTaskTitle(task)}?`)) return;

    const taskId = getTaskId(task);
    const nextTasks = tasks.filter((item, index) => getTaskId(item, index) !== taskId);

    saveProjectWithTasks(nextTasks, "Task deleted.");
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="mobile-frame">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center font-black text-slate-500">
            Loading project details...
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="page-shell">
        <div className="mobile-frame">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="text-2xl font-black text-[#061638]">Project not found</h2>
            <button
              type="button"
              onClick={() => navigate("/admin/projects")}
              className="mt-5 rounded-xl bg-[#FF6B35] px-5 py-3 text-sm font-black text-white"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => navigate("/admin/projects")}
                className="mb-5 inline-flex items-center gap-2 text-sm font-black text-[#FF6B35]"
              >
                <ArrowLeft size={18} />
                Back to Projects
              </button>

              <h1 className="text-[34px] font-black leading-tight text-[#061638]">
                {getProjectName(project)}
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
                {getProjectDescription(project)}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusClass(
                    getProjectStatus(project)
                  )}`}
                >
                  {formatStatus(getProjectStatus(project))}
                </span>

                <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-black uppercase text-[#FF6B35]">
                  {getProjectDepartment(project)}
                </span>

                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-600">
                  {formatDate(getProjectStartDate(project))} to{" "}
                  {formatDate(getProjectEndDate(project))}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateProjectStatus("on_hold")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-5 text-sm font-black text-yellow-700 transition hover:bg-yellow-100"
              >
                <PauseCircle size={18} />
                Put On Hold
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Abort this project?")) {
                    updateProjectStatus("aborted");
                  }
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700 transition hover:bg-red-100"
              >
                <XCircle size={18} />
                Abort Project
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <UsersRound size={28} className="mt-1 text-[#061638]" />
            <div>
              <h2 className="text-[25px] font-black text-[#061638]">
                Project Users
              </h2>
              <p className="text-sm font-medium text-slate-500">
                View all users assigned to this project.
              </p>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedUserId("all")}
              className={`min-w-[135px] rounded-xl border px-5 py-4 text-left transition hover:border-[#FF6B35] hover:bg-orange-50 ${
                selectedUserId === "all"
                  ? "border-[#FF6B35] bg-orange-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-sm font-black text-[#061638]">All Users</p>
              <p className="mt-3 text-sm font-medium text-slate-500">
                {tasks.length} tasks
              </p>
            </button>

            {teamMembers.length ? (
              teamMembers.map((member) => {
                const memberId = String(member.id || member.email || member.name);
                const userTasks = tasks.filter((task) =>
                  isTaskForMember(task, member, teamMembers)
                );

                return (
                  <button
                    key={memberId}
                    type="button"
                    onClick={() => setSelectedUserId(memberId)}
                    className={`min-w-[190px] rounded-xl border px-5 py-4 text-left transition hover:border-[#FF6B35] hover:bg-orange-50 ${
                      selectedUserId === memberId
                        ? "border-[#FF6B35] bg-orange-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B35] text-xs font-black text-white">
                        {getInitials(getUserName(member))}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#061638]">
                          {getUserName(member)}
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-500">
                          {getUserRole(member)} • {userTasks.length} tasks
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="min-w-[220px] rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-500">
                No real team members assigned.
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-[25px] font-black text-[#061638]">
                Project Tasks
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {selectedMember
                  ? `Showing tasks assigned to ${getUserName(selectedMember)}.`
                  : "View tasks, update status, and track subtasks for this project."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openAddTask}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
              >
                <Plus size={18} />
                Add Task
              </button>

              <button
                type="button"
                onClick={() => openAddSubTask()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
              >
                <Plus size={18} />
                Add Sub Task
              </button>

              <span className="inline-flex h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-black text-[#FF6B35]">
                Status: {taskStats.status}
              </span>

              <button
                type="button"
                onClick={() => setActiveModal("progress")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 text-sm font-black text-white transition hover:opacity-90"
              >
                <ListChecks size={18} />
                Show Progress
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-[0.14em] text-slate-500">
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
                {visibleTasks.length ? (
                  visibleTasks.map((task, index) => {
                    const subtasks = getTaskSubtasks(task);

                    return (
                      <tr
                        key={getTaskId(task, index)}
                        className="border-t border-slate-100 align-top transition hover:bg-orange-50/40"
                      >
                        <td className="px-5 py-5">
                          <p className="font-black text-[#061638]">
                            {getTaskTitle(task)}
                          </p>
                          <p className="mt-1 max-w-[240px] text-sm font-medium text-slate-500">
                            {getTaskDescription(task) || "No description"}
                          </p>
                        </td>

                        <td className="px-5 py-5 font-black text-[#061638]">
                          {getTaskAssignedName(task, usersMap, teamMembers)}
                        </td>

                        <td className="px-5 py-5">
                          <select
                            value={normalizeStatus(getTaskStatus(task))}
                            onChange={(event) =>
                              updateTaskStatus(task, event.target.value)
                            }
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-[#061638] outline-none focus:border-[#FF6B35]"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="on_hold">On Hold</option>
                          </select>
                        </td>

                        <td
                          className={`px-5 py-5 font-black ${priorityClass(
                            getTaskPriority(task)
                          )}`}
                        >
                          {formatStatus(getTaskPriority(task))}
                        </td>

                        <td className="px-5 py-5 font-semibold text-slate-500">
                          {formatDate(getTaskStartDate(task))} <br />
                          to {formatDate(getTaskEndDate(task))}
                        </td>

                        <td className="px-5 py-5">
                          {subtasks.length ? (
                            <div className="space-y-2">
                              {subtasks.map((subtask, subtaskIndex) => (
                                <div
                                  key={subtask.id || subtask._id || subtaskIndex}
                                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                                >
                                  <p className="font-black text-[#061638]">
                                    {getSubtaskTitle(subtask, subtaskIndex)}
                                  </p>

                                  <select
                                    value={normalizeStatus(subtask.status)}
                                    onChange={(event) =>
                                      updateSubTaskStatus(
                                        task,
                                        subtaskIndex,
                                        event.target.value
                                      )
                                    }
                                    className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-[#061638] outline-none focus:border-[#FF6B35]"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="on_hold">On Hold</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-slate-400">
                              No subtasks
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openAddSubTask(task)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
                            >
                              <Plus size={15} />
                              Add Subtask
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteTask(task)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-100 bg-white px-3 text-xs font-black text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm font-semibold text-slate-500"
                    >
                      No tasks found for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {activeModal === "task" ? (
        <Modal title="Add Task" onClose={() => setActiveModal("")}>
          <form onSubmit={submitTask} className="grid gap-4">
            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Task Title
              </span>
              <input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
                placeholder="Enter task title"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Assigned To
              </span>
              <select
                value={taskForm.assignedTo}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    assignedTo: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
              >
                <option value="">Select member</option>
                {teamMembers.map((member) => (
                  <option
                    key={member.id || member.email || member.name}
                    value={member.id || member.email || member.name}
                  >
                    {getUserName(member)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Status
                </span>
                <select
                  value={taskForm.status}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Priority
                </span>
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Start Date
                </span>
                <input
                  type="date"
                  value={taskForm.startDate}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  End Date
                </span>
                <input
                  type="date"
                  value={taskForm.endDate}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
                />
              </label>
            </div>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Description
              </span>
              <textarea
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#FF6B35]"
                placeholder="Task description"
              />
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal("")}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 text-sm font-black text-white"
              >
                <Save size={17} />
                Save Task
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "subtask" ? (
        <Modal title="Add Sub Task" onClose={() => setActiveModal("")}>
          <form onSubmit={submitSubTask} className="grid gap-4">
            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Parent Task
              </span>
              <select
                value={selectedTask ? getTaskId(selectedTask) : ""}
                onChange={(event) => {
                  const foundTask = tasks.find(
                    (task, index) => getTaskId(task, index) === event.target.value
                  );

                  setSelectedTask(foundTask || null);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
              >
                <option value="">Select task</option>
                {visibleTasks.map((task, index) => (
                  <option key={getTaskId(task, index)} value={getTaskId(task, index)}>
                    {getTaskTitle(task)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Sub Task Title
              </span>
              <input
                value={subTaskForm.title}
                onChange={(event) =>
                  setSubTaskForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
                placeholder="Enter sub task title"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Status
              </span>
              <select
                value={subTaskForm.status}
                onChange={(event) =>
                  setSubTaskForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-[#FF6B35]"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal("")}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 text-sm font-black text-white"
              >
                <Save size={17} />
                Save Sub Task
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "progress" ? (
        <Modal title="Project Progress" onClose={() => setActiveModal("")}>
          <div>
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#FF6B35]">
                  Total Tasks
                </p>
                <p className="mt-3 text-3xl font-black text-[#061638]">
                  {taskStats.total}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-600">
                  Completed
                </p>
                <p className="mt-3 text-3xl font-black text-[#061638]">
                  {taskStats.completed}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-blue-600">
                  Progress
                </p>
                <p className="mt-3 text-3xl font-black text-[#061638]">
                  {taskStats.progress}%
                </p>
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#FF6B35]"
                style={{ width: `${taskStats.progress}%` }}
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal("")}
                className="h-11 rounded-xl bg-[#FF6B35] px-5 text-sm font-black text-white"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}