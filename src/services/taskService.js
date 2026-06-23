import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

function normalizeId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeStatus(status) {
  const value = String(status || "Pending").trim();

  if (value === "todo") return "Pending";
  if (value === "pending") return "Pending";
  if (value === "in_progress") return "In Progress";
  if (value === "completed") return "Completed";
  if (value === "review") return "Review";

  return value;
}

function toApiStatus(status) {
  const value = String(status || "Pending").trim();

  if (value === "Pending") return "Pending";
  if (value === "In Progress") return "In Progress";
  if (value === "Completed") return "Completed";
  if (value === "Review") return "Review";

  if (value === "todo") return "Pending";
  if (value === "pending") return "Pending";
  if (value === "in_progress") return "In Progress";
  if (value === "completed") return "Completed";
  if (value === "review") return "Review";

  return value;
}

function normalizeSubtask(subtask = {}) {
  return {
    ...subtask,
    id: normalizeId(subtask.id),
    taskId: normalizeId(subtask.taskId || subtask.task_id),
    task_id: subtask.task_id || subtask.taskId || "",
    title: subtask.title || "Untitled Subtask",
    status: normalizeStatus(subtask.status || "Pending"),
    createdAt: subtask.createdAt || subtask.created_at || "",
    updatedAt: subtask.updatedAt || subtask.updated_at || "",
  };
}

function normalizeTask(task = {}, subtasks = []) {
  const taskId = normalizeId(task.id);

  return {
    ...task,
    id: taskId,
    projectId: normalizeId(task.projectId || task.project_id),
    project_id: task.project_id || task.projectId || "",
    assignedTo: normalizeId(task.assignedTo || task.assigned_to),
    assigned_to: task.assigned_to || task.assignedTo || "",
    createdBy: normalizeId(task.createdBy || task.created_by),
    created_by: task.created_by || task.createdBy || "",
    department: task.department || "",
    title: task.title || "Untitled Task",
    description: task.description || "",
    status: normalizeStatus(task.status || "Pending"),
    priority: task.priority || "Normal",
    startDate: task.startDate || task.start_date || "",
    start_date: task.start_date || task.startDate || "",
    endDate: task.endDate || task.end_date || task.dueDate || "",
    end_date: task.end_date || task.endDate || task.dueDate || "",
    dueDate: task.dueDate || task.endDate || task.end_date || "",
    completedAt: task.completedAt || task.completed_at || null,
    completed_at: task.completed_at || task.completedAt || null,
    createdAt: task.createdAt || task.created_at || "",
    created_at: task.created_at || task.createdAt || "",
    updatedAt: task.updatedAt || task.updated_at || "",
    updated_at: task.updated_at || task.updatedAt || "",
    subtasks:
      Array.isArray(task.subtasks) && task.subtasks.length
        ? task.subtasks.map(normalizeSubtask)
        : subtasks.filter((subtask) => normalizeId(subtask.taskId) === taskId),
  };
}

function userCanAccessTask(profile, task) {
  if (!profile) return false;

  const role = profile.role;
  const userId = normalizeId(profile.uid || profile.id);

  if (role === "superAdmin") return true;
  if (role === "admin") return true;
  if (role === "manager") return task.department === profile.department;

  return normalizeId(task.assignedTo || task.assigned_to) === userId;
}

async function getSubtasksSafe() {
  try {
    const data = await apiGet("/subtasks");
    const rawSubtasks = data.subtasks || [];
    return rawSubtasks.map(normalizeSubtask);
  } catch (error) {
    console.error("Subtasks load error:", error);
    return [];
  }
}

export async function getTasks(profile, options = {}) {
  const [taskData, subtasks] = await Promise.all([
    apiGet("/tasks"),
    getSubtasksSafe(),
  ]);

  const rawTasks = taskData.tasks || [];

  let tasks = rawTasks.map((task) => normalizeTask(task, subtasks));

  if (options.projectId) {
    tasks = tasks.filter(
      (task) => normalizeId(task.projectId) === normalizeId(options.projectId)
    );
  }

  return tasks;
}

export async function getAllTasks() {
  const [taskData, subtasks] = await Promise.all([
    apiGet("/tasks"),
    getSubtasksSafe(),
  ]);

  const rawTasks = taskData.tasks || [];

  return rawTasks.map((task) => normalizeTask(task, subtasks));
}

export async function createTask(payload = {}, actor) {
  const title = String(payload.title || "").trim();

  if (!title) {
    throw new Error("Task title is required.");
  }

  const body = {
    project_id: payload.projectId || payload.project_id || null,
    title,
    description: payload.description || "",
    status: toApiStatus(payload.status || "Pending"),
    priority: payload.priority || "Normal",
    start_date: payload.startDate || payload.start_date || "",
    end_date:
      payload.endDate ||
      payload.end_date ||
      payload.dueDate ||
      payload.due_date ||
      "",
    assigned_to:
      payload.assignedTo ||
      payload.assigned_to ||
      actor?.uid ||
      actor?.id ||
      null,
    department: payload.department || actor?.department || "",
  };

  const data = await apiPost("/tasks", body);

  return normalizeTask(data.task || {});
}

export async function updateTask(id, updates = {}, actor) {
  const taskId = normalizeId(id);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const body = {};

  if ("title" in updates) body.title = updates.title;
  if ("description" in updates) body.description = updates.description;
  if ("status" in updates) body.status = toApiStatus(updates.status);
  if ("priority" in updates) body.priority = updates.priority;

  if ("startDate" in updates || "start_date" in updates) {
    body.start_date = updates.startDate || updates.start_date || "";
  }

  if ("endDate" in updates || "end_date" in updates || "dueDate" in updates) {
    body.end_date = updates.endDate || updates.end_date || updates.dueDate || "";
  }

  if ("assignedTo" in updates || "assigned_to" in updates) {
    body.assigned_to = updates.assignedTo || updates.assigned_to || "";
  }

  const data = await apiPatch(`/tasks/${taskId}`, body);

  return normalizeTask(data.task || { id: taskId, ...updates });
}

export async function updateTaskStatus(id, status, actor) {
  const taskId = normalizeId(id);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const data = await apiPatch(`/tasks/${taskId}/status`, {
    status: toApiStatus(status),
  });

  return normalizeTask(data.task || { id: taskId, status });
}

export async function createSubtask(payload = {}, actor) {
  const taskId = payload.taskId || payload.task_id;
  const title = String(payload.title || "").trim();

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  if (!title) {
    throw new Error("Subtask title is required.");
  }

  const data = await apiPost("/subtasks", {
    task_id: taskId,
    title,
    status: toApiStatus(payload.status || "Pending"),
  });

  return normalizeSubtask(data.subtask || {});
}

export async function addSubtask(taskId, title, actor) {
  return createSubtask(
    {
      taskId,
      title,
      status: "Pending",
    },
    actor
  );
}

export async function updateSubtaskStatus(id, status, actor) {
  const subtaskId = normalizeId(id);

  if (!subtaskId) {
    throw new Error("Subtask id is required.");
  }

  const data = await apiPatch(`/subtasks/${subtaskId}/status`, {
    status: toApiStatus(status),
  });

  return normalizeSubtask(data.subtask || { id: subtaskId, status });
}

export async function deleteTask(id, actor) {
  const taskId = normalizeId(id);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  return apiDelete(`/tasks/${taskId}`);
}

export async function deleteSubtask(id, actor) {
  const subtaskId = normalizeId(id);

  if (!subtaskId) {
    throw new Error("Subtask id is required.");
  }

  return apiDelete(`/subtasks/${subtaskId}`);
}