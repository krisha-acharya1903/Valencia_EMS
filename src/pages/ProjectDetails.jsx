import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Link as LinkIcon,
  ListChecks,
  Plus,
  Send,
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
import { downloadEmployeeSubtaskAttachment } from "../services/employeeProjectBoardService";

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

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
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

function isDoneStatus(value) {
  const status = normalize(value);

  return (
    status === "completed" ||
    status === "complete" ||
    status === "done" ||
    status === "finished"
  );
}

function isUnderReviewStatus(value) {
  const status = normalize(value);

  return (
    status === "under review" ||
    status === "underreview" ||
    status === "review" ||
    status === "pending review"
  );
}

function isInProgressStatus(value) {
  const status = normalize(value);

  return (
    status === "in progress" ||
    status === "inprogress" ||
    status === "doing"
  );
}

function isTaskAdminApproved(task) {
  const status = getTaskStatus(task);

  const reviewStatus = normalize(
    task?.reviewStatus ||
      task?.review_status ||
      task?.approvalStatus ||
      task?.approval_status ||
      ""
  );

  const reviewedAt =
    task?.reviewedAt ||
    task?.reviewed_at ||
    task?.approvedAt ||
    task?.approved_at ||
    "";

  const reviewedBy =
    task?.reviewedBy ||
    task?.reviewed_by ||
    task?.approvedBy ||
    task?.approved_by ||
    "";

  const explicitlyApproved =
    task?.approved === true ||
    task?.adminApproved === true ||
    task?.admin_approved === true ||
    reviewStatus === "approved";

  return (
    isDoneStatus(status) &&
    (explicitlyApproved || Boolean(reviewedAt) || Boolean(reviewedBy))
  );
}

function normalizeTaskStatusForApi(status) {
  const clean = normalize(status);

  if (isDoneStatus(clean)) return "Completed";
  if (isUnderReviewStatus(clean)) return "Under Review";
  if (isInProgressStatus(clean)) return "In Progress";

  return "Pending";
}

function getPrettyTaskStatus(task) {
  const status = getTaskStatus(task);

  if (isTaskAdminApproved(task)) return "Done";

  if (isUnderReviewStatus(status) || isDoneStatus(status)) {
    return "Under Review";
  }

  if (isInProgressStatus(status)) return "In Progress";

  return "To Do";
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

function isSubtaskDone(subtask) {
  return (
    subtask?.completed === true ||
    subtask?.done === true ||
    isDoneStatus(subtask?.status)
  );
}

function getSubtaskTitle(subtask, index = 0) {
  return (
    subtask?.title ||
    subtask?.name ||
    subtask?.taskName ||
    subtask?.task_name ||
    `Subtask ${index + 1}`
  );
}

function getSubtaskDescription(subtask) {
  return (
    subtask?.submissionDescription ||
    subtask?.submission_description ||
    subtask?.description ||
    subtask?.details ||
    ""
  );
}

function getSubtaskLink(subtask) {
  return (
    subtask?.submissionLink ||
    subtask?.submission_link ||
    subtask?.link ||
    subtask?.url ||
    ""
  );
}

function getSubtaskAttachmentName(subtask) {
  return (
    subtask?.attachmentOriginalName ||
    subtask?.attachment_original_name ||
    subtask?.attachmentFilename ||
    subtask?.attachment_filename ||
    ""
  );
}

function getSubtaskId(subtask) {
  return String(
    subtask?.id ||
      subtask?.subtaskId ||
      subtask?.subtask_id ||
      subtask?.uid ||
      ""
  );
}

function subtaskHasAttachment(subtask) {
  return Boolean(
    subtask?.hasAttachment ||
      subtask?.has_attachment ||
      subtask?.attachmentPath ||
      subtask?.attachment_path ||
      subtask?.attachmentFilename ||
      subtask?.attachment_filename ||
      subtask?.attachmentOriginalName ||
      subtask?.attachment_original_name
  );
}

function getSubtaskSubmittedAt(subtask) {
  return (
    subtask?.submittedAt ||
    subtask?.submitted_at ||
    subtask?.submissionAt ||
    subtask?.submission_at ||
    subtask?.updatedAt ||
    subtask?.updated_at ||
    ""
  );
}

function hasSubtaskSubmission(subtask) {
  return Boolean(
    getSubtaskDescription(subtask) ||
      getSubtaskLink(subtask) ||
      getSubtaskAttachmentName(subtask) ||
      subtaskHasAttachment(subtask) ||
      getSubtaskSubmittedAt(subtask)
  );
}

function getTaskSubtaskProgress(task) {
  const subtasks = getTaskSubtasks(task);

  if (!subtasks.length) {
    return {
      total: 0,
      completed: 0,
      percent: isTaskAdminApproved(task) ? 100 : 0,
    };
  }

  const completed = subtasks.filter(isSubtaskDone).length;

  return {
    total: subtasks.length,
    completed,
    percent: Math.round((completed / subtasks.length) * 100),
  };
}

function getTaskStage(task) {
  const status = getTaskStatus(task);
  const subtasks = getTaskSubtasks(task);
  const progress = getTaskSubtaskProgress(task);

  if (isTaskAdminApproved(task)) return "done";

  if (isUnderReviewStatus(status)) return "review";

  if (isDoneStatus(status)) return "review";

  if (subtasks.length > 0 && progress.completed === subtasks.length) {
    return "review";
  }

  if (isInProgressStatus(status)) return "progress";

  if (subtasks.length > 0 && progress.completed > 0) {
    return "progress";
  }

  return "todo";
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

  const completed = tasks.filter((task) => getTaskStage(task) === "done").length;

  return Math.round((completed / tasks.length) * 100);
}

function getProjectComputedStatus(project) {
  const tasks = getProjectTasks(project);

  if (!tasks.length) return "Pending";
  if (tasks.every((task) => getTaskStage(task) === "done")) return "Completed";
  if (tasks.some((task) => getTaskStage(task) === "review")) {
    return "Under Review";
  }
  if (tasks.some((task) => getTaskStage(task) === "progress")) {
    return "In Progress";
  }

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

function getProjectAssignedEmployees(project, users, tasks = []) {
  const memberSources = getProjectMemberSources(project);
  const taskAssignedSources = tasks
    .map((task) => getTaskAssignedId(task))
    .filter(Boolean);

  const combinedSources = [...memberSources, ...taskAssignedSources];

  if (!combinedSources.length) return [];

  const memberKeys = combinedSources
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

function getAssignedEmployeeForTask(task, users) {
  const taskAssignedId = getTaskAssignedId(task).toLowerCase();
  const raw = getTaskAssignedRaw(task);

  if (!taskAssignedId && !raw) return null;

  const matched = users.find((user) => {
    const keys = getUserKeys(user);
    return (
      keys.includes(taskAssignedId) ||
      keys.includes(normalizeId(raw).toLowerCase())
    );
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
    projects.find(
      (project, index) => getProjectId(project, index) === String(projectId)
    ) ||
    projects[Number(projectId) - 1] ||
    null
  );
}

async function fetchProjectTasks(projectId) {
  try {
    const boardResponse = await apiGet(`/employee/projects/${projectId}/board`);
    const boardTasks = extractArray(boardResponse);

    if (boardTasks.length) {
      return boardTasks;
    }
  } catch (error) {
    console.warn("Could not fetch employee board for admin:", error?.message);
  }

  const taskSources = [];

  try {
    const allTasksResponse = await apiGet("/tasks");
    taskSources.push(...extractArray(allTasksResponse));
  } catch (error) {
    console.warn("Could not fetch /tasks:", error?.message);
  }

  try {
    const projectTaskResponse = await apiGet(
      `/employee-project-tasks/${projectId}`
    );
    taskSources.push(...extractArray(projectTaskResponse));
  } catch {
    // optional route
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

function Modal({ title, children, onClose, maxWidth = "max-w-[720px]" }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/45 px-4 py-8">
      <div
        className={`w-full ${maxWidth} max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.24)]`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-black text-[#061638]">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-82px)] overflow-y-auto p-6">
          {children}
        </div>
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
  const [viewMode, setViewMode] = useState("kanban");

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState(null);

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

  const allTasks = useMemo(() => {
    return getProjectTasks(project);
  }, [project]);

  const assignedEmployees = useMemo(() => {
    return getProjectAssignedEmployees(project, users, allTasks);
  }, [project, users, allTasks]);

  const selectedMember = useMemo(() => {
    if (selectedMemberId === "all") return null;

    return (
      assignedEmployees.find(
        (employee) => getUserId(employee) === selectedMemberId
      ) || null
    );
  }, [assignedEmployees, selectedMemberId]);

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
    const todo = visibleTasks.filter((task) => getTaskStage(task) === "todo")
      .length;
    const inProgress = visibleTasks.filter(
      (task) => getTaskStage(task) === "progress"
    ).length;
    const underReview = visibleTasks.filter(
      (task) => getTaskStage(task) === "review"
    ).length;
    const done = visibleTasks.filter((task) => getTaskStage(task) === "done")
      .length;

    return {
      total: visibleTasks.length,
      todo,
      inProgress,
      underReview,
      done,
    };
  }, [visibleTasks]);

  async function addTask(payload) {
  if (!project) return;

  const realProjectId = getProjectId(project, Number(projectId) - 1);

  const projectStartDate = toDateInputValue(getStartDate(project));
  const projectEndDate = toDateInputValue(getEndDate(project));

  const taskStartDate = toDateInputValue(
    payload.startDate || payload.start_date || ""
  );

  const taskEndDate = toDateInputValue(
    payload.endDate || payload.end_date || payload.dueDate || ""
  );

  if (!projectStartDate || !projectEndDate) {
    toast.error("Project start date and end date are required before adding tasks.");
    return;
  }

  if (!taskStartDate || !taskEndDate) {
    toast.error("Task start date and end date are required.");
    return;
  }

  if (taskStartDate < projectStartDate) {
    toast.error("Task start date cannot be before project start date.");
    return;
  }

  if (taskEndDate > projectEndDate) {
    toast.error("Task end date cannot be after project deadline.");
    return;
  }

  if (taskEndDate < taskStartDate) {
    toast.error("Task end date cannot be before task start date.");
    return;
  }

  const selectedUser = users.find((user) => {
    const userId = String(getUserId(user));
    return userId === String(payload.assignedToId);
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

    start_date: taskStartDate,
    startDate: taskStartDate,

    end_date: taskEndDate,
    endDate: taskEndDate,
    dueDate: taskEndDate,

    department: getProjectDepartment(project),
  };

  try {
    await apiPost("/tasks", taskPayload);

    toast.success("Task assigned successfully.");
    setTaskModalOpen(false);
    await loadData();
  } catch (error) {
    console.error("Add task error:", error);
    toast.error(error?.message || "Failed to save task.");
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

  async function approveTask(task) {
    const taskId = getTaskId(task);

    if (!taskId) {
      toast.error("Task ID missing.");
      return;
    }

    setSaving(true);

    try {
      await apiPatch(`/employee/tasks/${taskId}/review`, {
        approved: true,
      });

      toast.success("Task approved and moved to Done.");
      setReviewTask(null);
      await loadData();
    } catch (error) {
      console.error("Approve task error:", error);
      toast.error(error?.message || "Failed to approve task.");
    } finally {
      setSaving(false);
    }
  }

  async function sendBackTask(task, remark) {
    const taskId = getTaskId(task);

    if (!taskId) {
      toast.error("Task ID missing.");
      return;
    }

    if (!remark.trim()) {
      toast.error("Add a remark before sending back.");
      return;
    }

    setSaving(true);

    try {
      await apiPatch(`/employee/tasks/${taskId}/review`, {
        approved: false,
        remark: remark.trim(),
      });

      toast.success("Remark added. Task sent back to In Progress.");
      setReviewTask(null);
      await loadData();
    } catch (error) {
      console.error("Send back task error:", error);
      toast.error(error?.message || "Failed to send task back.");
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
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
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
                {progressPercent}%
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-3">
            <UsersRound size={30} className="mt-1 text-[#061638]" />

            <div>
              <h2 className="text-2xl font-black text-[#061638]">
                Project Users
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Select all users for overall Kanban or choose one employee for
                per-user Kanban.
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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="grid gap-4 border-b border-slate-100 p-6 xl:grid-cols-[1fr_auto] xl:items-start">
            <div>
              <h2 className="text-2xl font-black text-[#061638]">
                {selectedMember
                  ? `${getUserName(selectedMember)} Kanban`
                  : "Overall Project Kanban"}
              </h2>

              <p className="mt-2 max-w-[440px] text-sm font-semibold leading-6 text-slate-500">
                Track task progress in To Do, In Progress, Under Review, and
                Done. Under Review tasks are waiting for admin approval.
              </p>
            </div>

            <div className="flex min-w-max flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setTaskModalOpen(true)}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
              >
                <Plus size={18} />
                Add Task
              </button>

              <div className="flex h-11 shrink-0 items-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-black text-[#FF6B35]">
                Status: {getProjectComputedStatus({ ...project, tasks: visibleTasks })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setViewMode((current) =>
                    current === "kanban" ? "progress" : "kanban"
                  )
                }
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#FF6B35] px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(255,107,53,0.25)] transition hover:opacity-90"
              >
                <BarChart3 size={18} />
                {viewMode === "kanban" ? "Show Progress" : "Show Kanban"}
              </button>
            </div>
          </div>

          {viewMode === "progress" ? (
            <ProgressPanel
              tasks={visibleTasks}
              progress={progressPercent}
              stats={taskStats}
            />
          ) : (
            <AdminKanbanBoard
              tasks={visibleTasks}
              users={users}
              onOpenReview={setReviewTask}
              onDelete={deleteTask}
            />
          )}
        </section>
      </div>

      {taskModalOpen ? (
        <TaskModal
  users={users}
  project={project}
  onClose={() => setTaskModalOpen(false)}
  onSave={addTask}
/>
      ) : null}

      {reviewTask ? (
        <ReviewTaskModal
          task={reviewTask}
          users={users}
          saving={saving}
          onClose={() => setReviewTask(null)}
          onApprove={approveTask}
          onSendBack={sendBackTask}
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

function AdminKanbanBoard({ tasks, users, onOpenReview, onDelete }) {
  const columns = [
    {
      key: "todo",
      title: "To Do",
      dot: "bg-slate-400",
      items: tasks.filter((task) => getTaskStage(task) === "todo"),
    },
    {
      key: "progress",
      title: "In Progress",
      dot: "bg-blue-500",
      items: tasks.filter((task) => getTaskStage(task) === "progress"),
    },
    {
      key: "review",
      title: "Under Review",
      dot: "bg-amber-500",
      items: tasks.filter((task) => getTaskStage(task) === "review"),
    },
    {
      key: "done",
      title: "Done",
      dot: "bg-emerald-500",
      items: tasks.filter((task) => getTaskStage(task) === "done"),
    },
  ];

  return (
    <div className="bg-[#fbfbfb] p-4">
  <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
          <div
            key={column.key}
            className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-black text-[#061638]">
                <span className={`h-3 w-3 rounded-full ${column.dot}`} />
                {column.title}
              </h3>

              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-50 px-2 text-sm font-black text-slate-500">
                {column.items.length}
              </span>
            </div>

            <div className="space-y-4">
              {column.items.length ? (
                column.items.map((task, index) => (
                  <TaskCard
                    key={getTaskId(task, index)}
                    task={task}
                    index={index}
                    users={users}
                    stage={column.key}
                    onOpenReview={onOpenReview}
                    onDelete={onDelete}
                  />
                ))
              ) : (
                <div className="flex min-h-[170px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
                  <p className="text-sm font-semibold text-slate-400">
                    No {column.title.toLowerCase()} tasks
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, index, users, stage, onOpenReview, onDelete }) {
  const assigned = getAssignedEmployeeForTask(task, users);
  const progress = getTaskSubtaskProgress(task);
  const subtasks = getTaskSubtasks(task);

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${
        stage === "review"
          ? "border-amber-200"
          : stage === "done"
          ? "border-emerald-200"
          : "border-slate-200"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          

          <h4 className="mt-3 text-base font-black leading-5 text-[#061638]">
            {getTaskName(task, index)}
          </h4>
        </div>

        <div className="shrink-0 rounded-2xl bg-orange-50 px-3 py-2 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            Deadline
          </p>
          <p className="mt-1 text-xs font-black text-[#FF6B35]">
            {formatDate(getTaskEndDate(task))}
          </p>
        </div>
      </div>

      {getTaskDescription(task) ? (
        <p className="mb-4 text-sm font-semibold leading-6 text-slate-500">
          {getTaskDescription(task)}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-600">
          {getPrettyTaskStatus(task)}
        </span>

        <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500">
          {assigned ? getUserName(assigned) : "Unassigned"}
        </span>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
          <span>{progress.percent}% completed</span>
          <span>
            {progress.completed}/{progress.total} subtasks
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#FF6B35] transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-[#061638]">Subtasks</p>
          <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-500">
            {subtasks.length}
          </span>
        </div>

        {subtasks.length ? (
          <div className="mt-3 space-y-2">
            {subtasks.slice(0, 3).map((subtask, subtaskIndex) => (
              <div
                key={subtask?.id || subtaskIndex}
                className="flex items-start gap-2 text-xs font-semibold text-slate-500"
              >
                <span
                  className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                    isSubtaskDone(subtask)
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 bg-white"
                  }`}
                />
                <span className="line-clamp-2">
                  {getSubtaskTitle(subtask, subtaskIndex)}
                </span>
              </div>
            ))}

            {subtasks.length > 3 ? (
              <p className="text-xs font-black text-[#FF6B35]">
                +{subtasks.length - 3} more subtasks
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-slate-400">
            No subtasks added yet.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {stage === "review" ? (
          <button
            type="button"
            onClick={() => onOpenReview(task)}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-black text-white transition hover:opacity-90"
          >
            <Eye size={16} />
            Review
          </button>
        ) : (
          <div className="text-xs font-semibold text-slate-400">
            {getTaskTimeline(task)}
          </div>
        )}

        <button
          type="button"
          onClick={() => onDelete(task, index)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function ProgressPanel({ tasks, progress, stats }) {
  return (
    <div className="border-b border-slate-100 bg-white p-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-[#FF6B35]">
              <BarChart3 size={20} />
            </div>

            <div>
              <h3 className="text-lg font-black text-[#061638]">
                Progress Summary
              </h3>
              <p className="text-sm font-semibold text-slate-500">
                Done tasks are counted as completed.
              </p>
            </div>
          </div>

          <div className="mb-3 flex items-end justify-between">
            <span className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
              Progress
            </span>

            <span className="text-3xl font-black text-[#061638]">
              {progress}%
            </span>
          </div>

          <div className="h-4 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#FF6B35] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-5 gap-3">
            <MiniStat label="Total" value={stats.total} />
            <MiniStat label="To Do" value={stats.todo} />
            <MiniStat label="Progress" value={stats.inProgress} />
            <MiniStat label="Review" value={stats.underReview} />
            <MiniStat label="Done" value={stats.done} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <CalendarDays size={20} />
            </div>

            <div>
              <h3 className="text-lg font-black text-[#061638]">
                Task Timelines
              </h3>
              <p className="text-sm font-semibold text-slate-500">
                Deadline-wise task overview.
              </p>
            </div>
          </div>

          {tasks.length ? (
            <div className="space-y-3">
              {tasks.map((task, index) => {
                const progressData = getTaskSubtaskProgress(task);

                return (
                  <div key={getTaskId(task, index)}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
                      <span className="truncate">
                        {getTaskName(task, index)}
                      </span>
                      <span>{formatDate(getTaskEndDate(task))}</span>
                    </div>

                    <div className="h-8 overflow-hidden rounded-xl bg-white">
                      <div
                        className="flex h-full items-center rounded-xl bg-[#FF6B35] px-3 text-xs font-black text-white"
                        style={{
                          width: `${Math.max(progressData.percent, 12)}%`,
                        }}
                      >
                        {progressData.percent}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
              No tasks available.
            </div>
          )}
        </div>
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

function TaskModal({ users, project, onClose, onSave }) {
  const projectStartDate = toDateInputValue(getStartDate(project));
  const projectEndDate = toDateInputValue(getEndDate(project));

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedToId: "",
    status: "Pending",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      startDate: current.startDate || projectStartDate || "",
      endDate: current.endDate || projectEndDate || "",
    }));
  }, [projectStartDate, projectEndDate]);

  function updateField(name, value) {
    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === "startDate" && next.endDate && next.endDate < value) {
        next.endDate = value;
      }

      return next;
    });
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

    if (!projectStartDate || !projectEndDate) {
      toast.error("Project start date and end date are required before adding tasks.");
      return;
    }

    if (!form.startDate || !form.endDate) {
      toast.error("Task start date and end date are required.");
      return;
    }

    if (form.startDate < projectStartDate) {
      toast.error("Task start date cannot be before project start date.");
      return;
    }

    if (form.endDate > projectEndDate) {
      toast.error("Task end date cannot be after project deadline.");
      return;
    }

    if (form.endDate < form.startDate) {
      toast.error("Task end date cannot be before task start date.");
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
      startDate: form.startDate,
      endDate: form.endDate,
      dueDate: form.endDate,
    });
  }

  return (
    <Modal title="Add Task" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4">
        <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#FF6B35]">
          Project timeline:{" "}
          <b>{projectStartDate || "No start date"}</b> to{" "}
          <b>{projectEndDate || "No end date"}</b>
        </div>

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
              onChange={(event) =>
                updateField("assignedToId", event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
            >
              <option value="">Select employee</option>
              {users.map((user, index) => (
                <option key={getUserId(user) || index} value={getUserId(user)}>
                  {getUserName(user)} — {getUserDepartment(user)}
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
              <option value="Pending">To Do</option>
              <option value="In Progress">In Progress</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Start Date
            </span>

            <input
              type="date"
              value={form.startDate}
              min={projectStartDate || undefined}
              max={projectEndDate || undefined}
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
              min={form.startDate || projectStartDate || undefined}
              max={projectEndDate || undefined}
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

function ReviewTaskModal({
  task,
  users,
  saving,
  onClose,
  onApprove,
  onSendBack,
}) {
  const [remark, setRemark] = useState("");
  const assigned = getAssignedEmployeeForTask(task, users);
  const subtasks = getTaskSubtasks(task);
    async function handleDownloadSubtaskAttachment(subtask) {
    const subtaskId = getSubtaskId(subtask);

    if (!subtaskId) {
      toast.error("Subtask ID missing. Cannot download attachment.");
      return;
    }

    try {
      await downloadEmployeeSubtaskAttachment(
        subtaskId,
        getSubtaskAttachmentName(subtask) || "subtask-attachment"
      );
    } catch (error) {
      console.error("Admin download subtask attachment error:", error);
      toast.error(error?.message || "Failed to download attachment.");
    }
  }

  return (
    <Modal title="Review Task" onClose={onClose} maxWidth="max-w-[880px]">
      <div className="grid gap-5">
        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-[#061638]">
                {getTaskName(task)}
              </h3>

              {getTaskDescription(task) ? (
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  {getTaskDescription(task)}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#FF6B35]">
                  {getPrettyTaskStatus(task)}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                  {assigned ? getUserName(assigned) : "Unassigned"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                  Deadline: {formatDate(getTaskEndDate(task))}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-center">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Subtasks
              </p>
              <p className="mt-1 text-3xl font-black text-[#061638]">
                {getTaskSubtaskProgress(task).completed}/
                {getTaskSubtaskProgress(task).total}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-lg font-black text-[#061638]">
            Submitted Subtasks
          </h4>

          {subtasks.length ? (
            <div className="space-y-3">
              {subtasks.map((subtask, index) => (
  <div
    key={subtask?.id || index}
    className={`rounded-2xl border p-4 ${
      hasSubtaskSubmission(subtask)
        ? "border-orange-100 bg-[#fffaf7]"
        : "border-slate-200 bg-white"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-black text-[#061638]">
          {getSubtaskTitle(subtask, index)}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              isSubtaskDone(subtask)
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            {isSubtaskDone(subtask) ? "Completed" : "Not Completed"}
          </span>

          {hasSubtaskSubmission(subtask) ? (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#FF6B35]">
              Work Submitted
            </span>
          ) : (
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-400">
              No Submission
            </span>
          )}

          {getSubtaskSubmittedAt(subtask) ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
              {formatDateTime(getSubtaskSubmittedAt(subtask))}
            </span>
          ) : null}
        </div>
      </div>
    </div>

    {getSubtaskDescription(subtask) ? (
      <div className="mt-4 rounded-xl bg-white px-4 py-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          Submitted Description
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
          {getSubtaskDescription(subtask)}
        </p>
      </div>
    ) : null}

    {getSubtaskLink(subtask) ? (
      <a
        href={getSubtaskLink(subtask)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-600 transition hover:bg-blue-100"
      >
        <LinkIcon size={16} />
        <span className="break-all">{getSubtaskLink(subtask)}</span>
      </a>
    ) : null}

    {subtaskHasAttachment(subtask) ? (
      <button
        type="button"
        onClick={() => handleDownloadSubtaskAttachment(subtask)}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 text-sm font-black text-[#FF6B35] transition hover:bg-orange-100"
      >
        <Download size={16} />
        Download Attachment
        {getSubtaskAttachmentName(subtask)
          ? `: ${getSubtaskAttachmentName(subtask)}`
          : ""}
      </button>
    ) : null}

    {!hasSubtaskSubmission(subtask) ? (
      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-400">
        Employee has not submitted description, link, or attachment for this
        subtask yet.
      </p>
    ) : null}
  </div>
))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-500">
              No subtasks found for this task.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Add Remark
            </span>

            <textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              rows={4}
              placeholder="Write what still needs to be completed..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#061638] outline-none focus:border-[#FF6B35]"
            />
          </label>

          <div className="mt-4 flex flex-col justify-end gap-3 sm:flex-row">
            <button
              type="button"
              disabled={saving}
              onClick={() => onSendBack(task, remark)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-5 text-sm font-black text-[#FF6B35] transition hover:bg-orange-50 disabled:opacity-50"
            >
              <Send size={16} />
              Add Remark & Send Back
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => onApprove(task)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              Approve & Move to Done
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}