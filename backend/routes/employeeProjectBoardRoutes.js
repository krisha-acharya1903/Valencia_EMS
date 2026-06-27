import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { db } from "../database.js";

dotenv.config();

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "valencia_super_secret_change_this_later";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBTASK_UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "uploads",
  "subtask-submissions"
);

fs.mkdirSync(SUBTASK_UPLOAD_DIR, { recursive: true });

const allowedFileTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const subtaskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SUBTASK_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeOriginal = String(file.originalname || "attachment")
      .replace(/[^\w.\-() ]+/g, "_")
      .replace(/\s+/g, "_");

    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`);
  },
});

const subtaskUpload = multer({
  storage: subtaskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedFileTypes.has(file.mimetype)) {
      cb(
        new Error(
          "Unsupported file type. Please upload PDF, JPG, PNG, DOC, or DOCX."
        )
      );
      return;
    }

    cb(null, true);
  },
});

function uploadSubtaskAttachment(req, res, next) {
  subtaskUpload.single("attachment")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Attachment must be 5MB or smaller."
        : error.message || "Attachment upload failed.";

    res.status(400).json({
      success: false,
      message,
    });
  });
}

function getIndianTimestamp() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().slice(0, 19).replace("T", " ");
}

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(role) {
  return String(role || "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .toLowerCase();
}

function isDoneStatus(value) {
  const status = clean(value);

  return (
    status === "completed" ||
    status === "complete" ||
    status === "done" ||
    status === "finished"
  );
}

function isUnderReviewStatus(value) {
  const status = clean(value);

  return (
    status === "under review" ||
    status === "underreview" ||
    status === "review" ||
    status === "pending review"
  );
}

function hasAdminReview(task) {
  return Boolean(task?.reviewed_at || task?.reviewed_by);
}

function normalizeStatus(value) {
  const status = clean(value);

  if (isUnderReviewStatus(status)) {
    return "Under Review";
  }

  if (isDoneStatus(status)) {
    return "Completed";
  }

  if (
    status === "in progress" ||
    status === "in_progress" ||
    status === "inprogress" ||
    status === "doing"
  ) {
    return "In Progress";
  }

  return "Pending";
}

function ensureTableColumn(tableName, columnName, definition) {
  try {
    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((item) => item.name);

    if (!columns.includes(columnName)) {
      db.prepare(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
      ).run();
    }
  } catch (error) {
    console.warn(`Could not ensure ${tableName}.${columnName}:`, error.message);
  }
}

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    title TEXT,
    status TEXT DEFAULT 'Pending',
    created_by INTEGER,
    created_at TEXT,
    updated_at TEXT
  )
`
).run();

ensureTableColumn("subtasks", "task_id", "INTEGER");
ensureTableColumn("subtasks", "title", "TEXT");
ensureTableColumn("subtasks", "status", "TEXT DEFAULT 'Pending'");
ensureTableColumn("subtasks", "created_by", "INTEGER");
ensureTableColumn("subtasks", "created_at", "TEXT");
ensureTableColumn("subtasks", "updated_at", "TEXT");
ensureTableColumn("subtasks", "submission_description", "TEXT");
ensureTableColumn("subtasks", "submission_link", "TEXT");
ensureTableColumn("subtasks", "attachment_filename", "TEXT");
ensureTableColumn("subtasks", "attachment_original_name", "TEXT");
ensureTableColumn("subtasks", "attachment_path", "TEXT");
ensureTableColumn("subtasks", "attachment_mime_type", "TEXT");
ensureTableColumn("subtasks", "attachment_size", "INTEGER DEFAULT 0");
ensureTableColumn("subtasks", "submitted_at", "TEXT");

ensureTableColumn("tasks", "status", "TEXT DEFAULT 'Pending'");
ensureTableColumn("tasks", "completed_at", "TEXT");
ensureTableColumn("tasks", "updated_at", "TEXT");
ensureTableColumn("tasks", "reviewed_at", "TEXT");
ensureTableColumn("tasks", "reviewed_by", "INTEGER");

ensureTableColumn("projects", "progress", "INTEGER DEFAULT 0");
ensureTableColumn("projects", "updated_at", "TEXT");

function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }

  return "";
}

function authRequired(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing authorization token.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const userId =
      decoded.id ||
      decoded.userId ||
      decoded.user_id ||
      decoded.uid ||
      "";

    const email = decoded.email || "";

    let user = null;

    if (userId) {
      user = db
        .prepare(
          `
          SELECT *
          FROM users
          WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
          LIMIT 1
        `
        )
        .get(String(userId));
    }

    if (!user && email) {
      user = db
        .prepare(
          `
          SELECT *
          FROM users
          WHERE LOWER(email) = LOWER(?)
          LIMIT 1
        `
        )
        .get(String(email));
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

function requireAdmin(req, res, next) {
  const role = normalizeRole(req.user?.role);

  if (role !== "admin" && role !== "manager" && role !== "superadmin") {
    return res.status(403).json({
      success: false,
      message: "Only admin can review tasks.",
    });
  }

  next();
}

function userCanAccessTask(user, task) {
  if (!user || !task) return false;

  const role = normalizeRole(user.role);

  if (role === "admin" || role === "manager" || role === "superadmin") {
    return true;
  }

  return String(task.assigned_to || "") === String(user.id || "");
}

function safeJsonArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function projectLooksAssignedToUser(project, user) {
  if (!project || !user) return false;

  const role = normalizeRole(user.role);

  if (role === "admin" || role === "manager" || role === "superadmin") {
    return true;
  }

  const userKeys = [
    user.id,
    user.email,
    user.name,
    user.full_name,
    user.fullName,
    user.department,
  ]
    .filter(Boolean)
    .map((item) => clean(item));

  const directProjectValues = [
    project.assigned_to,
    project.assignee_id,
    project.user_id,
    project.employee_id,
    project.department,
  ]
    .filter(Boolean)
    .map((item) => clean(item));

  if (userKeys.some((key) => directProjectValues.includes(key))) {
    return true;
  }

  const members = safeJsonArray(project.members);

  return members.some((member) => {
    const memberKeys =
      typeof member === "object"
        ? [
            member.id,
            member.userId,
            member.user_id,
            member.email,
            member.name,
            member.department,
          ]
        : [member];

    return memberKeys
      .filter(Boolean)
      .map((item) => clean(item))
      .some((key) => userKeys.includes(key));
  });
}

function userCanAccessProject(user, projectId) {
  const project = db
    .prepare(
      `
      SELECT *
      FROM projects
      WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
      LIMIT 1
    `
    )
    .get(String(projectId));

  if (!project) {
    return {
      allowed: false,
      project: null,
    };
  }

  const role = normalizeRole(user.role);

  if (role === "admin" || role === "manager" || role === "superadmin") {
    return {
      allowed: true,
      project,
    };
  }

  const assignedTask = db
    .prepare(
      `
      SELECT id
      FROM tasks
      WHERE CAST(project_id AS TEXT) = CAST(? AS TEXT)
        AND CAST(assigned_to AS TEXT) = CAST(? AS TEXT)
      LIMIT 1
    `
    )
    .get(String(project.id), String(user.id));

  if (assignedTask || projectLooksAssignedToUser(project, user)) {
    return {
      allowed: true,
      project,
    };
  }

  return {
    allowed: false,
    project,
  };
}

function getTaskWithSubtasks(taskId) {
  const task = db
    .prepare(
      `
      SELECT *
      FROM tasks
      WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
      LIMIT 1
    `
    )
    .get(String(taskId));

  if (!task) return null;

  const subtasks = db
    .prepare(
      `
      SELECT *
      FROM subtasks
      WHERE CAST(task_id AS TEXT) = CAST(? AS TEXT)
      ORDER BY created_at ASC, id ASC
    `
    )
    .all(String(task.id));

  return {
    ...task,
    subtasks,
  };
}

function normalizeSubtask(row) {
  const hasAttachment = Boolean(row.attachment_path);

  return {
    id: String(row.id),
    taskId: String(row.task_id || ""),
    title: row.title || row.name || "Subtask",
    status: normalizeStatus(row.status),
    completed: isDoneStatus(row.status),
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",

    submissionDescription: row.submission_description || "",
    submissionLink: row.submission_link || "",
    submittedAt: row.submitted_at || "",

    hasAttachment,
    attachmentFilename: row.attachment_filename || "",
    attachmentOriginalName: row.attachment_original_name || "",
    attachmentMimeType: row.attachment_mime_type || "",
    attachmentSize: Number(row.attachment_size || 0),
    attachmentUrl: hasAttachment
      ? `/api/employee/subtasks/${row.id}/attachment`
      : "",
  };
}

function normalizeTask(row) {
  const subtasks = Array.isArray(row?.subtasks) ? row.subtasks : [];

  return {
    id: String(row.id),
    projectId: String(row.project_id || ""),
    title: row.title || row.name || "Task",
    name: row.title || row.name || "Task",
    description: row.description || "",
    status: normalizeStatus(row.status),
    priority: row.priority || "Medium",
    assignedTo: String(row.assigned_to || ""),
    department: row.department || "",
    dueDate: row.due_date || row.deadline || row.end_date || "",
    deadline: row.due_date || row.deadline || row.end_date || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    completedAt: row.completed_at || "",
    reviewedAt: row.reviewed_at || "",
    reviewedBy: row.reviewed_by || "",
    subtasks: subtasks.map(normalizeSubtask),
  };
}

function recalculateProjectProgress(projectId) {
  if (!projectId) return;

  try {
    const tasks = db
      .prepare(
        `
        SELECT *
        FROM tasks
        WHERE CAST(project_id AS TEXT) = CAST(? AS TEXT)
      `
      )
      .all(String(projectId));

    if (!tasks.length) {
      db.prepare(
        `
        UPDATE projects
        SET progress = ?,
            updated_at = ?
        WHERE id = ?
      `
      ).run(0, getIndianTimestamp(), projectId);
      return;
    }

    let totalItems = 0;
    let completedItems = 0;

    tasks.forEach((task) => {
      totalItems += 1;

      if (isDoneStatus(task.status)) {
        completedItems += 1;
      }

      const subtasks = db
        .prepare(
          `
          SELECT *
          FROM subtasks
          WHERE CAST(task_id AS TEXT) = CAST(? AS TEXT)
        `
        )
        .all(String(task.id));

      subtasks.forEach((subtask) => {
        totalItems += 1;

        if (isDoneStatus(subtask.status)) {
          completedItems += 1;
        }
      });
    });

    const progress = totalItems
      ? Math.round((completedItems / totalItems) * 100)
      : 0;

    db.prepare(
      `
      UPDATE projects
      SET progress = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(progress, getIndianTimestamp(), projectId);
  } catch (error) {
    console.error("Employee board project progress error:", error);
  }
}

function syncMainTaskStatus(taskId) {
  const task = db
    .prepare(
      `
      SELECT *
      FROM tasks
      WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
      LIMIT 1
    `
    )
    .get(String(taskId));

  if (!task) return null;

  const subtasks = db
    .prepare(
      `
      SELECT *
      FROM subtasks
      WHERE CAST(task_id AS TEXT) = CAST(? AS TEXT)
    `
    )
    .all(String(task.id));

  let nextStatus = "Pending";

  if (subtasks.length > 0) {
    const completedCount = subtasks.filter((item) => isDoneStatus(item.status))
      .length;

    if (completedCount === 0) {
      nextStatus = "Pending";
    } else if (completedCount === subtasks.length) {
      nextStatus = "Under Review";
    } else {
      nextStatus = "In Progress";
    }
  }

  const now = getIndianTimestamp();

  /*
    IMPORTANT:
    Employee checkbox action can only move task to:
    Pending / In Progress / Under Review

    It must NEVER move task to Completed.
    Completed happens only from admin review route.
  */
  db.prepare(
    `
    UPDATE tasks
    SET status = ?,
        completed_at = NULL,
        reviewed_at = NULL,
        reviewed_by = NULL,
        updated_at = ?
    WHERE id = ?
  `
  ).run(nextStatus, now, task.id);

  recalculateProjectProgress(task.project_id);

  return getTaskWithSubtasks(task.id);
}

router.get("/_test", (req, res) => {
  res.json({
    success: true,
    message: "Employee project board routes are working.",
  });
});

router.get("/projects/:projectId/board", authRequired, (req, res) => {
  try {
    const { allowed, project } = userCanAccessProject(
      req.user,
      req.params.projectId
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "This project is not assigned to you.",
      });
    }

    let taskQuery = `
      SELECT *
      FROM tasks
      WHERE CAST(project_id AS TEXT) = CAST(? AS TEXT)
    `;

    const params = [String(project.id)];
    const role = normalizeRole(req.user.role);

    if (role === "employee") {
      taskQuery += `
        AND CAST(assigned_to AS TEXT) = CAST(? AS TEXT)
      `;
      params.push(String(req.user.id));
    }

    taskQuery += `
      ORDER BY created_at ASC, id ASC
    `;

    const tasks = db.prepare(taskQuery).all(...params);

    const normalizedTasks = tasks
      .map((task) => getTaskWithSubtasks(task.id))
      .filter(Boolean)
      .map(normalizeTask);

    res.json({
      success: true,
      project: {
        id: String(project.id),
        name: project.name || project.title || "Project",
        title: project.name || project.title || "Project",
        description: project.description || "",
        department: project.department || "",
        status: project.status || "active",
        priority: project.priority || "medium",
        progress: Number(project.progress || 0),
        createdAt: project.created_at || "",
        updatedAt: project.updated_at || "",
        deadline:
          project.deadline ||
          project.due_date ||
          project.end_date ||
          project.to_date ||
          "",
      },
      tasks: normalizedTasks,
    });
  } catch (error) {
    console.error("Employee project board error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load employee project board.",
    });
  }
});

router.post("/subtasks", authRequired, (req, res) => {
  try {
    const taskId = req.body?.taskId || req.body?.task_id;
    const title = String(req.body?.title || req.body?.name || "").trim();

    if (!taskId || !title) {
      return res.status(400).json({
        success: false,
        message: "taskId and title are required.",
      });
    }

    const task = db
      .prepare(
        `
        SELECT *
        FROM tasks
        WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
        LIMIT 1
      `
      )
      .get(String(taskId));

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Main task not found.",
      });
    }

    if (!userCanAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You can add subtasks only to your assigned tasks.",
      });
    }

    const now = getIndianTimestamp();

    const result = db
      .prepare(
        `
        INSERT INTO subtasks (
          task_id,
          title,
          status,
          created_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(task.id, title, "Pending", req.user.id, now, now);

    const insertedSubtask = db
      .prepare(
        `
        SELECT *
        FROM subtasks
        WHERE id = ?
      `
      )
      .get(result.lastInsertRowid);

    const updatedTask = syncMainTaskStatus(task.id);

    res.json({
      success: true,
      message: "Subtask added successfully.",
      subtask: normalizeSubtask(insertedSubtask),
      task: normalizeTask(updatedTask),
    });
  } catch (error) {
    console.error("Employee create subtask error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add subtask.",
    });
  }
});

router.patch("/subtasks/:subtaskId/status", authRequired, (req, res) => {
  try {
    const subtask = db
      .prepare(
        `
        SELECT *
        FROM subtasks
        WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
        LIMIT 1
      `
      )
      .get(String(req.params.subtaskId));

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found.",
      });
    }

    const task = db
      .prepare(
        `
        SELECT *
        FROM tasks
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(subtask.task_id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Main task not found.",
      });
    }

    if (!userCanAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You can update only subtasks from your assigned tasks.",
      });
    }

    const completed = req.body?.completed === true;
    const now = getIndianTimestamp();

    db.prepare(
      `
      UPDATE subtasks
      SET status = ?,
          submitted_at = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(
      completed ? "Completed" : "Pending",
      completed ? now : "",
      now,
      subtask.id
    );

    const updatedSubtask = db
      .prepare("SELECT * FROM subtasks WHERE id = ?")
      .get(subtask.id);

    const updatedTask = syncMainTaskStatus(task.id);

    res.json({
      success: true,
      message: completed
        ? "Subtask completed successfully."
        : "Subtask moved back to pending.",
      subtask: normalizeSubtask(updatedSubtask),
      task: normalizeTask(updatedTask),
    });
  } catch (error) {
    console.error("Employee checkbox subtask update error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update subtask.",
    });
  }
});

router.post(
  "/subtasks/:subtaskId/submission",
  authRequired,
  uploadSubtaskAttachment,
  (req, res) => {
    try {
      const subtask = db
        .prepare(
          `
          SELECT *
          FROM subtasks
          WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
          LIMIT 1
        `
        )
        .get(String(req.params.subtaskId));

      if (!subtask) {
        return res.status(404).json({
          success: false,
          message: "Subtask not found.",
        });
      }

      const task = db
        .prepare(
          `
          SELECT *
          FROM tasks
          WHERE id = ?
          LIMIT 1
        `
        )
        .get(subtask.task_id);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Main task not found.",
        });
      }

      if (!userCanAccessTask(req.user, task)) {
        return res.status(403).json({
          success: false,
          message: "You can submit only subtasks from your assigned tasks.",
        });
      }

      const description = String(req.body?.description || "").trim();
      const link = String(req.body?.link || "").trim();
      const now = getIndianTimestamp();

      db.prepare(
        `
        UPDATE subtasks
        SET submission_description = ?,
            submission_link = ?,
            attachment_filename = ?,
            attachment_original_name = ?,
            attachment_path = ?,
            attachment_mime_type = ?,
            attachment_size = ?,
            submitted_at = ?,
            updated_at = ?
        WHERE id = ?
      `
      ).run(
        description,
        link,
        req.file?.filename || subtask.attachment_filename || "",
        req.file?.originalname || subtask.attachment_original_name || "",
        req.file?.path || subtask.attachment_path || "",
        req.file?.mimetype || subtask.attachment_mime_type || "",
        req.file?.size || Number(subtask.attachment_size || 0),
        now,
        now,
        subtask.id
      );

      const updatedSubtask = db
        .prepare("SELECT * FROM subtasks WHERE id = ?")
        .get(subtask.id);

      const updatedTask = syncMainTaskStatus(task.id);

      res.json({
        success: true,
        message: "Subtask saved successfully.",
        subtask: normalizeSubtask(updatedSubtask),
        task: normalizeTask(updatedTask),
      });
    } catch (error) {
      console.error("Employee subtask submission error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to submit subtask.",
      });
    }
  }
);

router.patch("/tasks/:taskId/review", authRequired, requireAdmin, (req, res) => {
  try {
    const taskId = req.params.taskId;
    const approved = req.body?.approved === true;

    const task = db
      .prepare(
        `
        SELECT *
        FROM tasks
        WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
        LIMIT 1
      `
      )
      .get(String(taskId));

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    const now = getIndianTimestamp();
    const nextStatus = approved ? "Completed" : "In Progress";

    db.prepare(
      `
      UPDATE tasks
      SET status = ?,
          completed_at = ?,
          reviewed_at = ?,
          reviewed_by = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(
      nextStatus,
      approved ? now : null,
      now,
      req.user.id || null,
      now,
      task.id
    );

    recalculateProjectProgress(task.project_id);

    const updatedTask = getTaskWithSubtasks(task.id);

    res.json({
      success: true,
      message: approved
        ? "Task approved and moved to Done."
        : "Task sent back to In Progress.",
      task: normalizeTask(updatedTask),
    });
  } catch (error) {
    console.error("Task review error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to review task.",
    });
  }
});

router.delete("/subtasks/:subtaskId", authRequired, (req, res) => {
  try {
    const subtask = db
      .prepare(
        `
        SELECT *
        FROM subtasks
        WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
        LIMIT 1
      `
      )
      .get(String(req.params.subtaskId));

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found.",
      });
    }

    const task = db
      .prepare(
        `
        SELECT *
        FROM tasks
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(subtask.task_id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Main task not found.",
      });
    }

    if (!userCanAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You can delete only subtasks from your assigned tasks.",
      });
    }

    db.prepare("DELETE FROM subtasks WHERE id = ?").run(subtask.id);

    const updatedTask = syncMainTaskStatus(task.id);

    res.json({
      success: true,
      message: "Subtask deleted successfully.",
      deleted: true,
      task: normalizeTask(updatedTask),
    });
  } catch (error) {
    console.error("Employee delete subtask error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete subtask.",
    });
  }
});

router.get("/subtasks/:subtaskId/attachment", authRequired, (req, res) => {
  try {
    const subtask = db
      .prepare(
        `
        SELECT *
        FROM subtasks
        WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
        LIMIT 1
      `
      )
      .get(String(req.params.subtaskId));

    if (!subtask || !subtask.attachment_path) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found.",
      });
    }

    const task = db
      .prepare(
        `
        SELECT *
        FROM tasks
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(subtask.task_id);

    if (!task || !userCanAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this attachment.",
      });
    }

    if (!fs.existsSync(subtask.attachment_path)) {
      return res.status(404).json({
        success: false,
        message: "Attachment file is missing from server.",
      });
    }

    res.download(
      subtask.attachment_path,
      subtask.attachment_original_name || subtask.attachment_filename
    );
  } catch (error) {
    console.error("Employee subtask attachment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to download attachment.",
    });
  }
});

export default router;