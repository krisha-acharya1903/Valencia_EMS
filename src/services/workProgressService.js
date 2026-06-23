import { getAllProjects } from "./projectService";
import { getAllTasks } from "./taskService";
import { getUsers } from "./userService";

function getUserId(user) {
  return String(user?.uid || user?.id || user?.userId || user?.user_id || "");
}

function getProjectId(project) {
  return String(project?.id || project?.projectId || project?.project_id || "");
}

function getTaskProjectId(task) {
  return String(
    task?.projectId ||
      task?.project_id ||
      task?.project?.id ||
      task?.project?.projectId ||
      task?.project?.project_id ||
      ""
  );
}

function getTaskEmployeeId(task) {
  return String(
    task?.assignedTo ||
      task?.assigned_to ||
      task?.userId ||
      task?.user_id ||
      task?.employeeId ||
      task?.employee_id ||
      task?.employee?.id ||
      task?.employee?.uid ||
      ""
  );
}

function normalizeStatus(value) {
  const status = String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();

  if (!status) return "todo";

  if (
    [
      "todo",
      "to do",
      "pending",
      "not started",
      "open",
      "assigned",
      "planning",
    ].includes(status)
  ) {
    return "todo";
  }

  if (
    ["in progress", "progress", "working", "ongoing", "started"].includes(
      status
    )
  ) {
    return "in_progress";
  }

  if (["review", "in review", "under review", "submitted"].includes(status)) {
    return "review";
  }

  if (["completed", "complete", "done", "finished", "closed"].includes(status)) {
    return "completed";
  }

  if (["overdue", "late", "delayed"].includes(status)) {
    return "overdue";
  }

  return status.replaceAll(" ", "_");
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

function getTaskTitle(task) {
  return task?.title || task?.name || task?.taskName || task?.task_name || "Untitled Task";
}

function getEmployeeName(users, task) {
  if (task?.employee?.name) return task.employee.name;
  if (task?.user?.name) return task.user.name;
  if (task?.assignedUser?.name) return task.assignedUser.name;

  if (task?.employeeName || task?.employee_name) {
    return task.employeeName || task.employee_name;
  }

  if (task?.assignedName || task?.assigned_name) {
    return task.assignedName || task.assigned_name;
  }

  const employeeId = getTaskEmployeeId(task);
  const user = users.find((item) => getUserId(item) === employeeId);

  return user?.name || user?.email || "Unassigned";
}

function getProjectForTask(projects, task) {
  const projectId = getTaskProjectId(task);

  return projects.find((project) => getProjectId(project) === projectId) || null;
}

function getProjectDepartment(project, task) {
  return (
    project?.department ||
    project?.departmentName ||
    project?.department_name ||
    task?.department ||
    task?.departmentName ||
    task?.department_name ||
    "-"
  );
}

function getTaskDueDate(task) {
  return (
    task?.dueDate ||
    task?.due_date ||
    task?.deadline ||
    task?.endDate ||
    task?.end_date ||
    ""
  );
}

function isTaskOverdue(task) {
  const status = normalizeStatus(task.status);

  if (status === "completed") return false;
  if (status === "overdue") return true;

  const dueDate = getTaskDueDate(task);

  if (!dueDate) return false;

  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) return false;

  return date < new Date();
}

function normalizeTask(task = {}, projects = [], users = []) {
  const project = getProjectForTask(projects, task);
  const projectId = getTaskProjectId(task);
  const employeeId = getTaskEmployeeId(task);
  const status = isTaskOverdue(task) ? "overdue" : normalizeStatus(task.status);

  const projectName =
    getProjectName(project) ||
    task.projectName ||
    task.project_name ||
    "No Project";

  const employeeName = getEmployeeName(users, task);

  return {
    ...task,

    id: String(task.id || task.taskId || task.task_id || ""),
    title: getTaskTitle(task),
    name: getTaskTitle(task),

    status,
    priority: task.priority || "medium",
    progress: Number(
      task.progress || task.completion || task.completionPercentage || 0
    ),

    projectId,
    project_id: projectId,

    assignedTo: employeeId,
    assigned_to: employeeId,

    dueDate: getTaskDueDate(task),
    due_date: getTaskDueDate(task),

    employee: {
      ...(task.employee || {}),
      id: employeeId,
      uid: employeeId,
      name: employeeName,
    },

    project: {
      ...(project || task.project || {}),
      id: projectId,
      name: projectName,
      department: getProjectDepartment(project, task),
    },
  };
}

function getProjectProgress(project, projectTasks) {
  const directProgress = Number(project?.progress);

  if (Number.isFinite(directProgress) && directProgress >= 0) {
    return Math.max(0, Math.min(100, Math.round(directProgress)));
  }

  if (!projectTasks.length) return 0;

  const completedTasks = projectTasks.filter(
    (task) => normalizeStatus(task.status) === "completed"
  ).length;

  return Math.round((completedTasks / projectTasks.length) * 100);
}

function normalizeProject(project = {}, tasks = []) {
  const projectId = getProjectId(project);

  const projectTasks = tasks.filter(
    (task) => String(task.projectId || task.project_id || "") === projectId
  );

  return {
    ...project,
    id: projectId,
    name: getProjectName(project),
    title: getProjectName(project),
    department:
      project.department ||
      project.departmentName ||
      project.department_name ||
      "-",
    status: project.status || "active",
    progress: getProjectProgress(project, projectTasks),
    taskCount: projectTasks.length,
    completedTaskCount: projectTasks.filter(
      (task) => normalizeStatus(task.status) === "completed"
    ).length,
  };
}

export async function getWorkProgress(profile) {
  const [projectsResult, tasksResult, usersResult] = await Promise.allSettled([
    getAllProjects(profile),
    getAllTasks(profile),
    getUsers(profile),
  ]);

  const rawProjects =
    projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value)
      ? projectsResult.value
      : [];

  const rawTasks =
    tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value)
      ? tasksResult.value
      : [];

  const users =
    usersResult.status === "fulfilled" && Array.isArray(usersResult.value)
      ? usersResult.value
      : [];

  const firstPassProjects = rawProjects.map((project) => ({
    ...project,
    id: getProjectId(project),
    name: getProjectName(project),
  }));

  const tasks = rawTasks.map((task) =>
    normalizeTask(task, firstPassProjects, users)
  );

  const projects = firstPassProjects.map((project) =>
    normalizeProject(project, tasks)
  );

  return {
    projects,
    tasks,
    users,
  };
}