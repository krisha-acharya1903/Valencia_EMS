import jayMoreRoutes from "./routes/jayMoreRoutes.js";
import employeeProjectBoardRoutes from "./routes/employeeProjectBoardRoutes.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import createAccountAdministratorRoutes from "./routes/accountAdministratorRoutes.cjs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./database.js";

dotenv.config();

const app = express();
console.log("✅ THIS IS THE SERVER.JS I AM RUNNING");

app.get("/api/employee/submission-route-test", (req, res) => {
  res.json({
    success: true,
    message: "Direct test route from server.js is working.",
  });
});

app.get("/api/employee-direct-test", (req, res) => {
  res.json({
    success: true,
    message: "Correct backend server.js is running.",
  });
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ],
    credentials: true,
  })
);

app.use(express.json());


app.use("/api/jay-more", jayMoreRoutes);
app.use("/api/employee", employeeProjectBoardRoutes);

app.get("/api/direct-test", (req, res) => {
  res.json({
    success: true,
    message: "This server.js is the running backend file.",
  });
});
app.use(express.static("public"));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEAVE_UPLOAD_DIR = path.join(__dirname, "uploads", "leave-attachments");

fs.mkdirSync(LEAVE_UPLOAD_DIR, { recursive: true });

const ALLOWED_LEAVE_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const leaveAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LEAVE_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeOriginal = String(file.originalname || "attachment")
      .replace(/[^\w.\-() ]+/g, "_")
      .replace(/\s+/g, "_");

    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`);
  },
});

const leaveUpload = multer({
  storage: leaveAttachmentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_LEAVE_FILE_TYPES.has(file.mimetype)) {
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

function uploadLeaveAttachment(req, res, next) {
  leaveUpload.single("attachment")(req, res, (error) => {
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

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_later";
const MAX_ACTIVE_LOGIN_STRIKES = 3;
const EXPECTED_WORKING_MINUTES = 510;

/* ---------------- TIME HELPERS ---------------- */

function getIndianTimestamp() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().slice(0, 19).replace("T", " ");
}

function getTodayDate() {
  return getIndianTimestamp().slice(0, 10);
}

function parseSqlTimestamp(value) {
  if (!value) return null;
  return new Date(String(value).replace(" ", "T") + "+05:30");
}

function addDaysToDateString(dateString, days) {
  const [year, month, day] = String(dateString || getTodayDate())
    .split("-")
    .map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getDayOfWeekFromDateString(dateString) {
  const [year, month, day] = String(dateString || getTodayDate())
    .split("-")
    .map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCDay();
}

function isWorkingDate(dateString) {
  return getDayOfWeekFromDateString(dateString) !== 0;
}

function getPreviousWorkingDate(dateString = getTodayDate()) {
  let targetDate = addDaysToDateString(dateString, -1);

  while (!isWorkingDate(targetDate)) {
    targetDate = addDaysToDateString(targetDate, -1);
  }

  return targetDate;
}

function formatReadableDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00+05:30`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function minutesToHoursLabel(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

/* ---------------- SCHEMA SAFETY HELPERS ---------------- */

function ensureColumn(tableName, columnName, columnDefinition) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const exists = columns.some((column) => column.name === columnName);

    if (!exists) {
      db.prepare(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
      ).run();
      console.log(`Added missing column: ${tableName}.${columnName}`);
    }
  } catch (error) {
    console.warn(
      `Could not ensure column ${tableName}.${columnName}:`,
      error.message
    );
  }
}

ensureColumn("projects", "progress", "INTEGER DEFAULT 0");
ensureColumn("projects", "status", "TEXT DEFAULT 'active'");
ensureColumn("projects", "priority", "TEXT DEFAULT 'medium'");
ensureColumn("projects", "manager_id", "INTEGER");
ensureColumn("projects", "members", "TEXT DEFAULT '[]'");

ensureColumn("tasks", "completed_at", "TEXT");
ensureColumn("subtasks", "status", "TEXT DEFAULT 'Pending'");

db.prepare(`
  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    user_email TEXT,
    department TEXT,
    leave_type TEXT DEFAULT 'Leave',
    emergency_contact TEXT,
    start_date TEXT,
    end_date TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    approved_by INTEGER,
    admin_comment TEXT,
    created_at TEXT,
    updated_at TEXT
  )
`).run();

ensureColumn("leave_requests", "user_email", "TEXT");
ensureColumn("leave_requests", "leave_type", "TEXT DEFAULT 'Leave'");
ensureColumn("leave_requests", "emergency_contact", "TEXT");
ensureColumn("leave_requests", "start_date", "TEXT");
ensureColumn("leave_requests", "end_date", "TEXT");
ensureColumn("leave_requests", "status", "TEXT DEFAULT 'pending'");
ensureColumn("leave_requests", "approved_by", "INTEGER");
ensureColumn("leave_requests", "admin_comment", "TEXT");
ensureColumn("leave_requests", "attachment_filename", "TEXT");
ensureColumn("leave_requests", "attachment_original_name", "TEXT");
ensureColumn("leave_requests", "attachment_path", "TEXT");
ensureColumn("leave_requests", "attachment_mime_type", "TEXT");
ensureColumn("leave_requests", "attachment_size", "INTEGER DEFAULT 0");
ensureColumn("leave_requests", "reviewed_at", "TEXT");

db.prepare(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    user_email TEXT,
    department TEXT,
    type TEXT,
    status TEXT,
    date TEXT,
    check_in TEXT,
    check_out TEXT,
    created_at TEXT,
    updated_at TEXT
  )
`).run();

ensureColumn("attendance", "user_id", "INTEGER");
ensureColumn("attendance", "user_name", "TEXT");
ensureColumn("attendance", "user_email", "TEXT");
ensureColumn("attendance", "department", "TEXT");
ensureColumn("attendance", "type", "TEXT");
ensureColumn("attendance", "status", "TEXT");
ensureColumn("attendance", "date", "TEXT");
ensureColumn("attendance", "check_in", "TEXT");
ensureColumn("attendance", "check_out", "TEXT");
ensureColumn("attendance", "created_at", "TEXT");
ensureColumn("attendance", "updated_at", "TEXT");

db.prepare(`
  CREATE TABLE IF NOT EXISTS app_login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    user_email TEXT,
    role TEXT,
    department TEXT,
    login_type TEXT DEFAULT 'login',
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS login_strikes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    user_email TEXT,
    department TEXT,
    strike_type TEXT DEFAULT 'missed_login',
    strike_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    cleared_at TEXT,
    cleared_by INTEGER,
    cleared_reason TEXT,
    UNIQUE(user_id, strike_date, strike_type),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(cleared_by) REFERENCES users(id) ON DELETE SET NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS login_strike_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_date TEXT NOT NULL,
    target_date TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'completed',
    created_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    blocked_count INTEGER DEFAULT 0,
    created_at TEXT
  )
`).run();

ensureColumn("login_strikes", "user_name", "TEXT");
ensureColumn("login_strikes", "user_email", "TEXT");
ensureColumn("login_strikes", "department", "TEXT");
ensureColumn("login_strikes", "strike_type", "TEXT DEFAULT 'missed_login'");
ensureColumn("login_strikes", "strike_date", "TEXT");
ensureColumn("login_strikes", "reason", "TEXT");
ensureColumn("login_strikes", "status", "TEXT DEFAULT 'active'");
ensureColumn("login_strikes", "created_at", "TEXT");
ensureColumn("login_strikes", "cleared_at", "TEXT");
ensureColumn("login_strikes", "cleared_by", "INTEGER");
ensureColumn("login_strikes", "cleared_reason", "TEXT");

ensureColumn("login_strike_runs", "run_date", "TEXT");
ensureColumn("login_strike_runs", "target_date", "TEXT");
ensureColumn("login_strike_runs", "status", "TEXT DEFAULT 'completed'");
ensureColumn("login_strike_runs", "created_count", "INTEGER DEFAULT 0");
ensureColumn("login_strike_runs", "skipped_count", "INTEGER DEFAULT 0");
ensureColumn("login_strike_runs", "blocked_count", "INTEGER DEFAULT 0");
ensureColumn("login_strike_runs", "created_at", "TEXT");

db.prepare(`
  CREATE TABLE IF NOT EXISTS project_time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    user_email TEXT,
    department TEXT,

    project_id INTEGER NOT NULL,
    project_name TEXT,

    task_id INTEGER,
    task_title TEXT,

    work_date TEXT NOT NULL,
    minutes INTEGER NOT NULL DEFAULT 0,
    description TEXT,

    status TEXT DEFAULT 'submitted',
    reviewed_by INTEGER,
    reviewed_at TEXT,
    review_comment TEXT,

    created_at TEXT,
    updated_at TEXT,

    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL
  )
`).run();

ensureColumn("project_time_entries", "user_name", "TEXT");
ensureColumn("project_time_entries", "user_email", "TEXT");
ensureColumn("project_time_entries", "department", "TEXT");
ensureColumn("project_time_entries", "project_name", "TEXT");
ensureColumn("project_time_entries", "task_title", "TEXT");
ensureColumn("project_time_entries", "status", "TEXT DEFAULT 'submitted'");
ensureColumn("project_time_entries", "reviewed_by", "INTEGER");
ensureColumn("project_time_entries", "reviewed_at", "TEXT");
ensureColumn("project_time_entries", "review_comment", "TEXT");

/* ---------------- REAL EMPLOYEE OVERVIEW / NOTIFICATION / ACTIVITY SCHEMA ---------------- */

db.prepare(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    severity TEXT DEFAULT 'standard',
    target_type TEXT DEFAULT 'General',
    role TEXT DEFAULT '',
    department TEXT DEFAULT '',
    user_id INTEGER,
    entity_type TEXT DEFAULT '',
    entity_id INTEGER,
    read_at TEXT,
    created_by INTEGER,
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
  )
`).run();

ensureColumn("notifications", "message", "TEXT DEFAULT ''");
ensureColumn("notifications", "severity", "TEXT DEFAULT 'standard'");
ensureColumn("notifications", "target_type", "TEXT DEFAULT 'General'");
ensureColumn("notifications", "role", "TEXT DEFAULT ''");
ensureColumn("notifications", "department", "TEXT DEFAULT ''");
ensureColumn("notifications", "user_id", "INTEGER");
ensureColumn("notifications", "entity_type", "TEXT DEFAULT ''");
ensureColumn("notifications", "entity_id", "INTEGER");
ensureColumn("notifications", "read_at", "TEXT");
ensureColumn("notifications", "created_by", "INTEGER");
ensureColumn("notifications", "created_at", "TEXT");

db.prepare(`
  CREATE TABLE IF NOT EXISTS notification_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    read_at TEXT NOT NULL,
    UNIQUE(notification_id, user_id),
    FOREIGN KEY(notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS recent_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT DEFAULT '',
    department TEXT DEFAULT '',
    action_type TEXT DEFAULT 'activity',
    title TEXT NOT NULL,
    message TEXT DEFAULT '',
    entity_type TEXT DEFAULT '',
    entity_id INTEGER,
    created_by INTEGER,
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
  )
`).run();

ensureColumn("recent_activity", "user_id", "INTEGER");
ensureColumn("recent_activity", "role", "TEXT DEFAULT ''");
ensureColumn("recent_activity", "department", "TEXT DEFAULT ''");
ensureColumn("recent_activity", "action_type", "TEXT DEFAULT 'activity'");
ensureColumn("recent_activity", "title", "TEXT");
ensureColumn("recent_activity", "message", "TEXT DEFAULT ''");
ensureColumn("recent_activity", "entity_type", "TEXT DEFAULT ''");
ensureColumn("recent_activity", "entity_id", "INTEGER");
ensureColumn("recent_activity", "created_by", "INTEGER");
ensureColumn("recent_activity", "created_at", "TEXT");


/* ---------------- USER HELPERS ---------------- */

function normalizeUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    uid: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    role: row.role,
    department: row.department,
    designation: row.designation || "Team Member",
    status: row.status || "active",
    profileImage: row.profile_image || "",
    officeLocation: row.office_location || "Main Campus",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing authorization token.",
      });
    }

    const token = header.replace("Bearer ", "").trim();
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!["superAdmin", "admin"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Only Admin or Super Admin can perform this action.",
    });
  }

  next();
}

/* ---------------- STATUS / PROGRESS HELPERS ---------------- */

function normalizeStatus(value) {
  const status = String(value || "Pending").trim();

  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  if (status === "pending") return "Pending";
  if (status === "review") return "Review";
  if (status === "overdue") return "Overdue";

  return status;
}

function isDoneStatus(value) {
  const status = String(value || "").toLowerCase();
  return status === "completed" || status === "complete" || status === "done";
}

function canAccessTask(user, task) {
  if (!user || !task) return false;

  if (user.role === "superAdmin") return true;

  if (user.role === "admin" || user.role === "manager") {
    return task.department === user.department || user.role === "admin";
  }

  return Number(task.assigned_to) === Number(user.id);
}

function getTaskWithSubtasks(taskId) {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);

  if (!task) return null;

  const subtasks = db
    .prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC")
    .all(taskId);

  return {
    ...task,
    subtasks,
  };
}

function recalculateProjectProgress(projectId) {
  if (!projectId) return;

  try {
    const tasks = db
      .prepare("SELECT * FROM tasks WHERE project_id = ?")
      .all(projectId);

    if (!tasks.length) {
      db.prepare(
        "UPDATE projects SET progress = ?, updated_at = ? WHERE id = ?"
      ).run(0, getIndianTimestamp(), projectId);
      return;
    }

    let totalItems = 0;
    let completedItems = 0;

    for (const task of tasks) {
      totalItems += 1;

      if (isDoneStatus(task.status)) {
        completedItems += 1;
      }

      const subtasks = db
        .prepare("SELECT * FROM subtasks WHERE task_id = ?")
        .all(task.id);

      for (const subtask of subtasks) {
        totalItems += 1;

        if (isDoneStatus(subtask.status)) {
          completedItems += 1;
        }
      }
    }

    const progress = totalItems
      ? Math.round((completedItems / totalItems) * 100)
      : 0;

    db.prepare(
      "UPDATE projects SET progress = ?, updated_at = ? WHERE id = ?"
    ).run(progress, getIndianTimestamp(), projectId);
  } catch (error) {
    console.error("Recalculate project progress error:", error);
  }
}

/* ---------------- APP LOGIN LOG HELPERS ---------------- */

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }

  return req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip || "";
}

function recordAppLogin(user, req, loginType = "login") {
  try {
    const nowIST = getIndianTimestamp();

    db.prepare(
      `
      INSERT INTO app_login_logs (
        user_id,
        user_name,
        user_email,
        role,
        department,
        login_type,
        ip_address,
        user_agent,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      user.id,
      user.name,
      user.email,
      user.role,
      user.department,
      loginType,
      getClientIp(req),
      String(req.headers["user-agent"] || ""),
      nowIST
    );

    console.log("App login recorded:", user.email, loginType, nowIST);
  } catch (error) {
    console.error("App login log error:", error);
  }
}

function normalizeAppLoginLog(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: String(row.user_id || ""),
    userName: row.user_name || "",
    userEmail: row.user_email || "",
    role: row.role || "",
    department: row.department || "",
    loginType: row.login_type || "login",
    ipAddress: row.ip_address || "",
    userAgent: row.user_agent || "",
    createdAt: row.created_at || "",
  };
}

/* ---------------- MISSED LOGIN STRIKE HELPERS ---------------- */

function hasUserLoggedInOnDate(userId, dateString) {
  const row = db
    .prepare(
      `
      SELECT id
      FROM app_login_logs
      WHERE user_id = ?
        AND substr(created_at, 1, 10) = ?
        AND login_type IN ('login', 'register')
      LIMIT 1
    `
    )
    .get(userId, dateString);

  return Boolean(row);
}

function getActiveLoginStrikeCount(userId) {
  const row = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM login_strikes
      WHERE user_id = ?
        AND status = 'active'
    `
    )
    .get(userId);

  return Number(row?.count || 0);
}

function addMissedLoginStrike(user, strikeDate) {
  const nowIST = getIndianTimestamp();

  const result = db
    .prepare(
      `
      INSERT OR IGNORE INTO login_strikes (
        user_id,
        user_name,
        user_email,
        department,
        strike_type,
        strike_date,
        reason,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      user.id,
      user.name,
      user.email,
      user.department,
      "missed_login",
      strikeDate,
      `Missed mandatory EMS login on ${formatReadableDate(strikeDate)}`,
      "active",
      nowIST
    );

  const activeStrikeCount = getActiveLoginStrikeCount(user.id);

  let blocked = false;

  if (activeStrikeCount >= MAX_ACTIVE_LOGIN_STRIKES && user.status !== "blocked") {
    db.prepare(
      `
      UPDATE users
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run("blocked", nowIST, user.id);

    blocked = true;
  }

  return {
    inserted: result.changes > 0,
    activeStrikeCount,
    blocked,
  };
}

function runMissedLoginStrikeCheck(options = {}) {
  const today = getTodayDate();
  const runDate = today;
  const targetDate = options.targetDate || getPreviousWorkingDate(today);
  const force = Boolean(options.force);
  const nowIST = getIndianTimestamp();

  if (!isWorkingDate(runDate) && !force) {
    return {
      success: true,
      skipped: true,
      reason: "Today is Sunday. No missed-login strike check is required.",
      runDate,
      targetDate,
      createdCount: 0,
      skippedCount: 0,
      blockedCount: 0,
    };
  }

  if (!isWorkingDate(targetDate)) {
    return {
      success: true,
      skipped: true,
      reason: "Target date is not a working day.",
      runDate,
      targetDate,
      createdCount: 0,
      skippedCount: 0,
      blockedCount: 0,
    };
  }

  const existingRun = db
    .prepare("SELECT * FROM login_strike_runs WHERE target_date = ?")
    .get(targetDate);

  if (existingRun && !force) {
    return {
      success: true,
      skipped: true,
      reason: "Missed-login strike check already ran for this target date.",
      runDate,
      targetDate,
      createdCount: Number(existingRun.created_count || 0),
      skippedCount: Number(existingRun.skipped_count || 0),
      blockedCount: Number(existingRun.blocked_count || 0),
    };
  }

  const employees = db
    .prepare(
      `
      SELECT *
      FROM users
      WHERE role = 'employee'
        AND status = 'active'
      ORDER BY id ASC
    `
    )
    .all();

  let createdCount = 0;
  let skippedCount = 0;
  let blockedCount = 0;

  for (const employee of employees) {
    const createdDate = String(employee.created_at || "").slice(0, 10);

    if (createdDate && createdDate > targetDate) {
      skippedCount += 1;
      continue;
    }

    if (hasUserLoggedInOnDate(employee.id, targetDate)) {
      skippedCount += 1;
      continue;
    }

    const result = addMissedLoginStrike(employee, targetDate);

    if (result.inserted) {
      createdCount += 1;
    } else {
      skippedCount += 1;
    }

    if (result.blocked) {
      blockedCount += 1;
    }
  }

  if (force) {
    db.prepare("DELETE FROM login_strike_runs WHERE target_date = ?").run(
      targetDate
    );
  }

  db.prepare(
    `
    INSERT OR IGNORE INTO login_strike_runs (
      run_date,
      target_date,
      status,
      created_count,
      skipped_count,
      blocked_count,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    runDate,
    targetDate,
    "completed",
    createdCount,
    skippedCount,
    blockedCount,
    nowIST
  );

  return {
    success: true,
    skipped: false,
    runDate,
    targetDate,
    createdCount,
    skippedCount,
    blockedCount,
  };
}

function normalizeLoginStrikeReason(row) {
  if (!row) return null;

  return {
    id: row.id,
    reason: row.reason || "Missed mandatory EMS login",
    strikeDate: row.strike_date || "",
    createdAt: row.created_at || "",
  };
}

function normalizeLoginStrikeUser(row) {
  if (!row) return null;

  const reasons = db
    .prepare(
      `
      SELECT id, reason, strike_date, created_at
      FROM login_strikes
      WHERE user_id = ?
        AND status = 'active'
      ORDER BY strike_date DESC, id DESC
    `
    )
    .all(row.user_id)
    .map(normalizeLoginStrikeReason)
    .filter(Boolean);

  return {
    userId: String(row.user_id || ""),
    name: row.user_name || "",
    email: row.user_email || "",
    department: row.department || "",
    status: row.user_status || "active",
    strikes: Number(row.active_strikes || 0),
    reasons,
    lastReason: reasons[0]?.reason || "",
    updatedAt: row.updated_at || "",
    escalated:
      Number(row.active_strikes || 0) >= MAX_ACTIVE_LOGIN_STRIKES ||
      row.user_status === "blocked",
  };
}

/* ---------------- ATTENDANCE HELPERS ---------------- */

function addAttendanceEvent(user, type) {
  const today = getTodayDate();
  const nowIST = getIndianTimestamp();

  const result = db
    .prepare(
      `
      INSERT INTO attendance (
        user_id,
        user_name,
        department,
        type,
        date,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
    .run(user.id, user.name, user.department, type, today, nowIST);

  console.log("Attendance created:", type, user.email, nowIST);

  const attendance = db
    .prepare("SELECT * FROM attendance WHERE id = ?")
    .get(result.lastInsertRowid);

  recordEmployeeActivity({
    userId: user.id,
    role: user.role || "employee",
    department: user.department || "",
    actionType: "attendance_marked",
    title: "Attendance marked",
    message: `${type} recorded for ${today}`,
    entityType: "attendance",
    entityId: attendance.id,
    createdBy: user.id,
  });

  return attendance;
}

function getLatestAttendanceEvent(userId) {
  return db
    .prepare(
      `
      SELECT *
      FROM attendance
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 1
    `
    )
    .get(userId);
}

function isTwelveHoursPassed(attendanceRow) {
  if (!attendanceRow?.created_at) return false;

  const checkInDate = parseSqlTimestamp(attendanceRow.created_at);

  if (!checkInDate || Number.isNaN(checkInDate.getTime())) {
    return false;
  }

  const twelveHours = 12 * 60 * 60 * 1000;
  return Date.now() - checkInDate.getTime() >= twelveHours;
}

function ensureAutoCheckIn(user) {
  const latest = getLatestAttendanceEvent(user.id);

  if (!latest || latest.type === "Check Out") {
    return addAttendanceEvent(user, "Check In");
  }

  if (latest.type === "Check In" && isTwelveHoursPassed(latest)) {
    addAttendanceEvent(user, "Check Out");
    return addAttendanceEvent(user, "Check In");
  }

  return latest;
}

function ensureAutoCheckOut(user) {
  const latest = getLatestAttendanceEvent(user.id);

  if (!latest || latest.type !== "Check In") {
    return null;
  }

  if (isTwelveHoursPassed(latest)) {
    return addAttendanceEvent(user, "Check Out");
  }

  return latest;
}

function autoCloseExpiredCheckIns() {
  const openCheckIns = db
    .prepare(
      `
      SELECT a.*
      FROM attendance a
      INNER JOIN (
        SELECT user_id, MAX(id) AS latest_id
        FROM attendance
        GROUP BY user_id
      ) latest
      ON latest.latest_id = a.id
      WHERE a.type = 'Check In'
    `
    )
    .all();

  for (const attendance of openCheckIns) {
    if (!isTwelveHoursPassed(attendance)) continue;

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(attendance.user_id);

    if (user) {
      addAttendanceEvent(user, "Check Out");
    }
  }
}

/* ---------------- PROJECT TIME ENTRY HELPERS ---------------- */

function normalizeProjectTimeEntry(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: String(row.user_id || ""),
    userName: row.user_name || "",
    userEmail: row.user_email || "",
    department: row.department || "",
    projectId: String(row.project_id || ""),
    projectName: row.project_name || "",
    taskId: row.task_id ? String(row.task_id) : "",
    taskTitle: row.task_title || "",
    workDate: row.work_date || "",
    minutes: Number(row.minutes || 0),
    hours: Math.round((Number(row.minutes || 0) / 60) * 100) / 100,
    timeLabel: minutesToHoursLabel(row.minutes),
    description: row.description || "",
    status: row.status || "submitted",
    reviewedBy: row.reviewed_by || "",
    reviewedAt: row.reviewed_at || "",
    reviewComment: row.review_comment || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function getAttendanceMinutesForUserDate(userId, dateString) {
  const rows = db
    .prepare(
      `
      SELECT *
      FROM attendance
      WHERE user_id = ?
        AND date = ?
      ORDER BY id ASC
    `
    )
    .all(userId, dateString);

  let totalMinutes = 0;
  let activeCheckIn = null;

  for (const row of rows) {
    if (row.type === "Check In") {
      activeCheckIn = parseSqlTimestamp(row.created_at);
    }

    if (row.type === "Check Out" && activeCheckIn) {
      const checkOut = parseSqlTimestamp(row.created_at);

      if (checkOut && !Number.isNaN(checkOut.getTime())) {
        const diffMs = checkOut.getTime() - activeCheckIn.getTime();

        if (diffMs > 0) {
          totalMinutes += Math.round(diffMs / 60000);
        }
      }

      activeCheckIn = null;
    }
  }

  return totalMinutes;
}

function getProjectHourStatus(loggedMinutes) {
  const diff = Number(loggedMinutes || 0) - EXPECTED_WORKING_MINUTES;

  if (diff === 0) return "fully_logged";
  if (diff > 0) return "overlogged";
  return "underlogged";
}

function buildProjectHoursSummary({ startDate, endDate, requester }) {
  const params = [];
  let userWhere = "u.role != 'superAdmin'";

  if (requester.role === "manager") {
    userWhere += " AND u.department = ?";
    params.push(requester.department);
  }

  const users = db
    .prepare(
      `
      SELECT *
      FROM users u
      WHERE ${userWhere}
      ORDER BY u.name ASC
    `
    )
    .all(...params);

  const summary = [];

  for (const user of users) {
    const entries = db
      .prepare(
        `
        SELECT *
        FROM project_time_entries
        WHERE user_id = ?
          AND work_date >= ?
          AND work_date <= ?
        ORDER BY work_date DESC, id DESC
      `
      )
      .all(user.id, startDate, endDate)
      .map(normalizeProjectTimeEntry)
      .filter(Boolean);

    const dayMap = new Map();

    for (const entry of entries) {
      if (!dayMap.has(entry.workDate)) {
        dayMap.set(entry.workDate, {
          workDate: entry.workDate,
          expectedMinutes: EXPECTED_WORKING_MINUTES,
          attendanceMinutes: getAttendanceMinutesForUserDate(
            user.id,
            entry.workDate
          ),
          loggedMinutes: 0,
          unallocatedMinutes: EXPECTED_WORKING_MINUTES,
          utilizationPercent: 0,
          status: "underlogged",
          projects: [],
          entries: [],
        });
      }

      const day = dayMap.get(entry.workDate);

      day.loggedMinutes += entry.minutes;
      day.entries.push(entry);

      const existingProject = day.projects.find(
        (project) => String(project.projectId) === String(entry.projectId)
      );

      if (existingProject) {
        existingProject.minutes += entry.minutes;
        existingProject.hours = Math.round((existingProject.minutes / 60) * 100) / 100;
        existingProject.timeLabel = minutesToHoursLabel(existingProject.minutes);
      } else {
        day.projects.push({
          projectId: entry.projectId,
          projectName: entry.projectName,
          minutes: entry.minutes,
          hours: Math.round((entry.minutes / 60) * 100) / 100,
          timeLabel: minutesToHoursLabel(entry.minutes),
        });
      }
    }

    const days = Array.from(dayMap.values()).map((day) => {
      const unallocated = EXPECTED_WORKING_MINUTES - day.loggedMinutes;

      return {
        ...day,
        unallocatedMinutes: unallocated,
        expectedLabel: minutesToHoursLabel(day.expectedMinutes),
        attendanceLabel: minutesToHoursLabel(day.attendanceMinutes),
        loggedLabel: minutesToHoursLabel(day.loggedMinutes),
        unallocatedLabel:
          unallocated < 0
            ? `-${minutesToHoursLabel(Math.abs(unallocated))}`
            : minutesToHoursLabel(unallocated),
        utilizationPercent: Math.round(
          (day.loggedMinutes / EXPECTED_WORKING_MINUTES) * 100
        ),
        status: getProjectHourStatus(day.loggedMinutes),
      };
    });

    const totalLoggedMinutes = days.reduce(
      (sum, day) => sum + day.loggedMinutes,
      0
    );

    const totalExpectedMinutes = days.length * EXPECTED_WORKING_MINUTES;
    const totalUnallocatedMinutes = totalExpectedMinutes - totalLoggedMinutes;

    summary.push({
      userId: String(user.id),
      employeeName: user.name,
      employeeEmail: user.email,
      department: user.department,
      designation: user.designation || "Team Member",
      totalDaysLogged: days.length,
      expectedMinutes: totalExpectedMinutes,
      loggedMinutes: totalLoggedMinutes,
      unallocatedMinutes: totalUnallocatedMinutes,
      expectedLabel: minutesToHoursLabel(totalExpectedMinutes),
      loggedLabel: minutesToHoursLabel(totalLoggedMinutes),
      unallocatedLabel:
        totalUnallocatedMinutes < 0
          ? `-${minutesToHoursLabel(Math.abs(totalUnallocatedMinutes))}`
          : minutesToHoursLabel(totalUnallocatedMinutes),
      utilizationPercent: totalExpectedMinutes
        ? Math.round((totalLoggedMinutes / totalExpectedMinutes) * 100)
        : 0,
      status:
        totalExpectedMinutes === 0
          ? "not_logged"
          : totalUnallocatedMinutes === 0
          ? "fully_logged"
          : totalUnallocatedMinutes < 0
          ? "overlogged"
          : "underlogged",
      days,
    });
  }

  return summary;
}


/* ---------------- REAL EMPLOYEE OVERVIEW / NOTIFICATION / ACTIVITY HELPERS ---------------- */

function normalizeNotification(row) {
  if (!row) return null;

  const readAt = row.user_read_at || row.read_at || "";

  return {
    id: row.id,
    title: row.title || "",
    message: row.message || "",
    severity: row.severity || "standard",
    targetType: row.target_type || "General",
    target_type: row.target_type || "General",
    role: row.role || "",
    department: row.department || "",
    userId: row.user_id ? String(row.user_id) : "",
    user_id: row.user_id || null,
    entityType: row.entity_type || "",
    entity_type: row.entity_type || "",
    entityId: row.entity_id || "",
    entity_id: row.entity_id || null,
    createdBy: row.created_by || "",
    created_by: row.created_by || "",
    createdAt: row.created_at || "",
    created_at: row.created_at || "",
    readAt,
    read_at: readAt,
    isRead: Boolean(readAt),
    unread: !readAt,
  };
}

function createNotification({
  title,
  message = "",
  severity = "standard",
  targetType = "General",
  role = "",
  department = "",
  userId = null,
  entityType = "",
  entityId = null,
  createdBy = null,
}) {
  if (!title) return null;

  try {
    const nowIST = getIndianTimestamp();

    const result = db
      .prepare(
        `
        INSERT INTO notifications (
          title,
          message,
          severity,
          target_type,
          role,
          department,
          user_id,
          entity_type,
          entity_id,
          created_by,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        title,
        message,
        severity,
        targetType,
        role,
        department,
        userId,
        entityType,
        entityId,
        createdBy,
        nowIST
      );

    return db
      .prepare("SELECT * FROM notifications WHERE id = ?")
      .get(result.lastInsertRowid);
  } catch (error) {
    console.error("Create notification error:", error);
    return null;
  }
}

function getNotificationsForUser(user, limit = 50) {
  if (!user) return [];

  const rows = db
    .prepare(
      `
      SELECT
        n.*,
        nr.read_at AS user_read_at
      FROM notifications n
      LEFT JOIN notification_reads nr
        ON nr.notification_id = n.id
       AND nr.user_id = ?
      WHERE
        LOWER(COALESCE(n.target_type, '')) IN ('general', 'all', 'everyone')
        OR CAST(COALESCE(n.user_id, '') AS TEXT) = CAST(? AS TEXT)
        OR (
          COALESCE(n.department, '') != ''
          AND LOWER(COALESCE(n.department, '')) = LOWER(?)
        )
        OR (
          COALESCE(n.role, '') != ''
          AND LOWER(COALESCE(n.role, '')) = LOWER(?)
        )
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT ?
    `
    )
    .all(
      user.id,
      user.id,
      String(user.department || ""),
      String(user.role || ""),
      Number(limit || 50)
    );

  return rows.map(normalizeNotification).filter(Boolean);
}

function markNotificationRead(notificationId, userId) {
  const nowIST = getIndianTimestamp();

  db.prepare(
    `
    INSERT INTO notification_reads (
      notification_id,
      user_id,
      read_at
    )
    VALUES (?, ?, ?)
    ON CONFLICT(notification_id, user_id)
    DO UPDATE SET read_at = excluded.read_at
  `
  ).run(notificationId, userId, nowIST);

  return nowIST;
}

function normalizeRecentActivity(row) {
  if (!row) return null;

  return {
    id: row.id || `${row.action_type || "activity"}-${row.entity_type || ""}-${row.entity_id || ""}-${row.created_at || ""}`,
    userId: row.user_id ? String(row.user_id) : "",
    user_id: row.user_id || null,
    role: row.role || "",
    department: row.department || "",
    actionType: row.action_type || "activity",
    action_type: row.action_type || "activity",
    title: row.title || "",
    message: row.message || "",
    entityType: row.entity_type || "",
    entity_type: row.entity_type || "",
    entityId: row.entity_id || "",
    entity_id: row.entity_id || null,
    createdBy: row.created_by || "",
    created_by: row.created_by || "",
    createdAt: row.created_at || "",
    created_at: row.created_at || "",
  };
}

function recordEmployeeActivity({
  userId = null,
  role = "",
  department = "",
  actionType = "activity",
  title,
  message = "",
  entityType = "",
  entityId = null,
  createdBy = null,
}) {
  if (!title) return null;

  try {
    const nowIST = getIndianTimestamp();

    const result = db
      .prepare(
        `
        INSERT INTO recent_activity (
          user_id,
          role,
          department,
          action_type,
          title,
          message,
          entity_type,
          entity_id,
          created_by,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        userId,
        role,
        department,
        actionType,
        title,
        message,
        entityType,
        entityId,
        createdBy,
        nowIST
      );

    return db
      .prepare("SELECT * FROM recent_activity WHERE id = ?")
      .get(result.lastInsertRowid);
  } catch (error) {
    console.error("Record recent activity error:", error);
    return null;
  }
}

function notifyProjectAssignment(project, actor, titleOverride = "") {
  if (!project) return;

  const members = parseProjectMembers(project.members)
    .map(normalizeProjectMember)
    .filter(Boolean);

  const seenUserIds = new Set();

  for (const member of members) {
    const userId = member.id || member.userId || member.user_id || member.employeeId || member.employee_id;

    if (!userId || seenUserIds.has(String(userId))) continue;

    seenUserIds.add(String(userId));

    createNotification({
      title: titleOverride || "Project assigned",
      message: `${actor?.name || "Admin"} assigned you to ${project.name || "a project"}.`,
      severity: "standard",
      targetType: "User",
      userId,
      department: member.department || project.department || "",
      entityType: "project",
      entityId: project.id,
      createdBy: actor?.id || null,
    });

    recordEmployeeActivity({
      userId,
      role: "employee",
      department: member.department || project.department || "",
      actionType: "project_assigned",
      title: titleOverride || "Project assigned",
      message: `${project.name || "Project"} was assigned to you.`,
      entityType: "project",
      entityId: project.id,
      createdBy: actor?.id || null,
    });
  }
}

function notifyTaskAssignment(task, actor, titleOverride = "") {
  if (!task || !task.assigned_to) return;

  const assignee = db
    .prepare("SELECT id, name, email, department, role FROM users WHERE id = ?")
    .get(task.assigned_to);

  if (!assignee) return;

  createNotification({
    title: titleOverride || "Task assigned",
    message: `${actor?.name || "Admin"} assigned you task: ${task.title || "Untitled task"}.`,
    severity: "standard",
    targetType: "User",
    userId: assignee.id,
    department: assignee.department || task.department || "",
    entityType: "task",
    entityId: task.id,
    createdBy: actor?.id || null,
  });

  recordEmployeeActivity({
    userId: assignee.id,
    role: "employee",
    department: assignee.department || task.department || "",
    actionType: "task_assigned",
    title: titleOverride || "Task assigned",
    message: task.title || "A task was assigned to you.",
    entityType: "task",
    entityId: task.id,
    createdBy: actor?.id || null,
  });
}

function getWorkingDaysInCurrentMonthTillToday() {
  const today = getTodayDate();
  const [year, month, day] = today.split("-").map(Number);
  let workingDays = 0;

  for (let currentDay = 1; currentDay <= day; currentDay += 1) {
    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(
      currentDay
    ).padStart(2, "0")}`;

    if (isWorkingDate(dateString)) {
      workingDays += 1;
    }
  }

  return workingDays;
}

function getEmployeeAttendanceSummary(userId) {
  const today = getTodayDate();
  const monthStart = `${today.slice(0, 7)}-01`;

  const rows = db
    .prepare(
      `
      SELECT *
      FROM attendance
      WHERE user_id = ?
        AND date >= ?
        AND date <= ?
      ORDER BY date DESC, id DESC
    `
    )
    .all(userId, monthStart, today);

  const presentDates = new Set();
  const lateDates = new Set();

  for (const row of rows) {
    if (row.type !== "Check In") continue;

    presentDates.add(row.date);

    const timePart = String(row.created_at || "").slice(11, 16);
    if (timePart && timePart > "10:15") {
      lateDates.add(row.date);
    }
  }

  const workingDays = getWorkingDaysInCurrentMonthTillToday();
  const present = presentDates.size;
  const late = lateDates.size;
  const absent = Math.max(workingDays - present, 0);
  const latest = getLatestAttendanceEvent(userId);

  return {
    month: today.slice(0, 7),
    workingDays,
    present,
    absent,
    late,
    totalRecords: rows.length,
    currentStatus: latest?.type === "Check In" ? "checkedIn" : "checkedOut",
    latestAttendance: latest || null,
    records: rows,
  };
}

function getAssignedTasksForEmployee(userId) {
  return db
    .prepare(
      `
      SELECT
        t.*,
        p.name AS project_name,
        p.status AS project_status,
        p.progress AS project_progress
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE CAST(t.assigned_to AS TEXT) = CAST(? AS TEXT)
      ORDER BY t.created_at DESC, t.id DESC
    `
    )
    .all(userId);
}

function getAssignedProjectsForEmployee(user) {
  const projects = db
    .prepare(
      `
      SELECT *
      FROM projects
      WHERE COALESCE(status, 'active') != 'deleted'
      ORDER BY created_at DESC, id DESC
    `
    )
    .all();

  return projects.filter((project) => employeeCanSeeProject(user, project));
}

function buildEmployeeProjectCards(user) {
  const projects = getAssignedProjectsForEmployee(user);

  return projects.map((project) => {
    const tasks = db
      .prepare(
        `
        SELECT *
        FROM tasks
        WHERE project_id = ?
          AND CAST(assigned_to AS TEXT) = CAST(? AS TEXT)
        ORDER BY created_at DESC, id DESC
      `
      )
      .all(project.id, user.id);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => isDoneStatus(task.status)).length;
    const progress = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : Number(project.progress || 0);

    return {
      ...normalizeProject(project),
      tasks,
      totalTasks,
      completedTasks,
      pendingTasks: Math.max(totalTasks - completedTasks, 0),
      progress,
      status:
        Number(progress) >= 100
          ? "completed"
          : String(project.status || "active").toLowerCase(),
    };
  });
}

function buildEmployeeProgress(userId) {
  const tasks = getAssignedTasksForEmployee(userId);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => isDoneStatus(task.status)).length;
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    pendingTasks: Math.max(totalTasks - completedTasks, 0),
    progress,
    percentage: progress,
    tasks,
  };
}

function getRecentActivityForUser(user, limit = 20) {
  const storedRows = db
    .prepare(
      `
      SELECT *
      FROM recent_activity
      WHERE CAST(COALESCE(user_id, '') AS TEXT) = CAST(? AS TEXT)
         OR (
              COALESCE(department, '') != ''
              AND LOWER(COALESCE(department, '')) = LOWER(?)
              AND (
                COALESCE(role, '') = ''
                OR LOWER(COALESCE(role, '')) = LOWER(?)
              )
            )
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `
    )
    .all(
      user.id,
      String(user.department || ""),
      String(user.role || ""),
      Number(limit || 20)
    )
    .map(normalizeRecentActivity)
    .filter(Boolean);

  const taskRows = db
    .prepare(
      `
      SELECT
        t.id,
        t.assigned_to AS user_id,
        t.department,
        CASE
          WHEN LOWER(COALESCE(t.status, '')) IN ('completed', 'complete', 'done')
            THEN 'task_completed'
          ELSE 'task_assigned'
        END AS action_type,
        CASE
          WHEN LOWER(COALESCE(t.status, '')) IN ('completed', 'complete', 'done')
            THEN 'Task completed'
          ELSE 'Task assigned'
        END AS title,
        COALESCE(t.title, 'Task') AS message,
        'task' AS entity_type,
        t.id AS entity_id,
        t.created_by,
        COALESCE(t.completed_at, t.updated_at, t.created_at) AS created_at
      FROM tasks t
      WHERE CAST(t.assigned_to AS TEXT) = CAST(? AS TEXT)
      ORDER BY COALESCE(t.completed_at, t.updated_at, t.created_at) DESC, t.id DESC
      LIMIT ?
    `
    )
    .all(user.id, Number(limit || 20))
    .map(normalizeRecentActivity)
    .filter(Boolean);

  const attendanceRows = db
    .prepare(
      `
      SELECT
        a.id,
        a.user_id,
        a.department,
        'attendance_marked' AS action_type,
        'Attendance marked' AS title,
        a.type || ' recorded for ' || a.date AS message,
        'attendance' AS entity_type,
        a.id AS entity_id,
        NULL AS created_by,
        a.created_at
      FROM attendance a
      WHERE CAST(a.user_id AS TEXT) = CAST(? AS TEXT)
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ?
    `
    )
    .all(user.id, Number(limit || 20))
    .map(normalizeRecentActivity)
    .filter(Boolean);

  const projectRows = buildEmployeeProjectCards(user).map((project) =>
    normalizeRecentActivity({
      id: `project-${project.id}`,
      user_id: user.id,
      department: project.department || user.department || "",
      role: "employee",
      action_type: "project_assigned",
      title: "Project assigned",
      message: project.name || "Project",
      entity_type: "project",
      entity_id: project.id,
      created_by: project.created_by || "",
      created_at: project.created_at || project.updated_at || "",
    })
  );

  const merged = [
    ...storedRows,
    ...taskRows,
    ...attendanceRows,
    ...projectRows,
  ].filter(Boolean);

  const seen = new Set();
  const unique = [];

  for (const item of merged) {
    const key = `${item.actionType}-${item.entityType}-${item.entityId}-${item.createdAt}`;

    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(item);
  }

  unique.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  return unique.slice(0, Number(limit || 20));
}

/* ---------------- EMPLOYEE PROJECT BOARD / SUBTASK WORKFLOW ---------------- */

function employeeBoardClean(value) {
  return String(value || "").trim().toLowerCase();
}

function employeeBoardIsDone(value) {
  const status = employeeBoardClean(value);
  return (
    status === "completed" ||
    status === "complete" ||
    status === "done" ||
    status === "finished"
  );
}

function employeeBoardNormalizeStatus(value) {
  const status = employeeBoardClean(value);

  if (status === "completed" || status === "complete" || status === "done") {
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

function employeeBoardGetTaskWithSubtasks(taskId) {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);

  if (!task) return null;

  const subtasks = db
    .prepare(
      `
      SELECT *
      FROM subtasks
      WHERE task_id = ?
      ORDER BY created_at ASC, id ASC
    `
    )
    .all(task.id);

  return {
    ...task,
    subtasks,
  };
}

function employeeBoardNormalizeSubtask(row) {
  return {
    id: String(row.id),
    taskId: String(row.task_id || ""),
    title: row.title || row.name || "Subtask",
    status: employeeBoardNormalizeStatus(row.status),
    completed: employeeBoardIsDone(row.status),
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function employeeBoardNormalizeTask(row) {
  const subtasks = Array.isArray(row.subtasks) ? row.subtasks : [];

  return {
    id: String(row.id),
    projectId: String(row.project_id || ""),
    title: row.title || row.name || "Task",
    name: row.title || row.name || "Task",
    description: row.description || "",
    status: employeeBoardNormalizeStatus(row.status),
    priority: row.priority || "Medium",
    assignedTo: String(row.assigned_to || ""),
    department: row.department || "",
    dueDate: row.due_date || row.deadline || row.end_date || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    completedAt: row.completed_at || "",
    subtasks: subtasks.map(employeeBoardNormalizeSubtask),
  };
}

function employeeBoardSyncTaskStatus(taskId) {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);

  if (!task) return null;

  const subtasks = db
    .prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC, id ASC")
    .all(task.id);

  let nextStatus = "Pending";

  if (subtasks.length > 0) {
    const completedCount = subtasks.filter((item) =>
      employeeBoardIsDone(item.status)
    ).length;

    if (completedCount === 0) {
      nextStatus = "Pending";
    } else if (completedCount === subtasks.length) {
  nextStatus = "Under Review";
} else {
  nextStatus = "In Progress";
}
  }

  const nowIST = getIndianTimestamp();
  const completedAt = nextStatus === "Completed" ? nowIST : null;

  db.prepare(
    `
    UPDATE tasks
    SET status = ?,
        completed_at = ?,
        updated_at = ?
    WHERE id = ?
  `
  ).run(nextStatus, completedAt, nowIST, task.id);

  recalculateProjectProgress(task.project_id);

  return employeeBoardGetTaskWithSubtasks(task.id);
}

function employeeBoardUserCanAccessTask(user, task) {
  if (!user || !task) return false;

  if (user.role === "admin" || user.role === "superAdmin") {
    return true;
  }

  return String(task.assigned_to || "") === String(user.id || "");
}

function employeeBoardUserCanAccessProject(user, projectId) {
  if (!user || !projectId) return false;

  if (user.role === "admin" || user.role === "superAdmin") {
    return true;
  }

  const task = db
    .prepare(
      `
      SELECT id
      FROM tasks
      WHERE CAST(project_id AS TEXT) = CAST(? AS TEXT)
        AND CAST(assigned_to AS TEXT) = CAST(? AS TEXT)
      LIMIT 1
    `
    )
    .get(String(projectId), String(user.id));

  return Boolean(task);
}

app.get("/api/employee/projects/:projectId/board", authRequired, (req, res) => {
  try {
    const projectId = req.params.projectId;

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
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (!employeeBoardUserCanAccessProject(req.user, project.id)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
    }

    let tasksQuery = `
      SELECT *
      FROM tasks
      WHERE CAST(project_id AS TEXT) = CAST(? AS TEXT)
    `;

    const params = [String(project.id)];

    if (req.user.role === "employee") {
      tasksQuery += ` AND CAST(assigned_to AS TEXT) = CAST(? AS TEXT)`;
      params.push(String(req.user.id));
    }

    tasksQuery += ` ORDER BY created_at ASC, id ASC`;

    const tasks = db.prepare(tasksQuery).all(...params);

    const normalizedTasks = tasks.map((task) => {
      const taskWithSubtasks = employeeBoardGetTaskWithSubtasks(task.id);
      return employeeBoardNormalizeTask(taskWithSubtasks);
    });

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

app.post("/api/employee/subtasks", authRequired, (req, res) => {
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

    if (!employeeBoardUserCanAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You can add subtasks only to your assigned tasks.",
      });
    }

    const nowIST = getIndianTimestamp();

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
      .run(task.id, title, "Pending", req.user.id, nowIST, nowIST);

    const insertedSubtask = db
      .prepare("SELECT * FROM subtasks WHERE id = ?")
      .get(result.lastInsertRowid);

    const updatedTask = employeeBoardSyncTaskStatus(task.id);

    res.json({
      success: true,
      message: "Subtask added successfully.",
      subtask: employeeBoardNormalizeSubtask(insertedSubtask),
      task: employeeBoardNormalizeTask(updatedTask),
    });
  } catch (error) {
    console.error("Employee create subtask error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add subtask.",
    });
  }
});

app.patch("/api/employee/subtasks/:subtaskId/status", authRequired, (req, res) => {
  try {
    const subtaskId = req.params.subtaskId;

    const subtask = db
      .prepare(
        `
        SELECT *
        FROM subtasks
        WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
        LIMIT 1
      `
      )
      .get(String(subtaskId));

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

    if (!employeeBoardUserCanAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You can update only subtasks from your assigned tasks.",
      });
    }

    const requestedStatus =
      req.body?.completed === true
        ? "Completed"
        : req.body?.completed === false
        ? "Pending"
        : employeeBoardNormalizeStatus(req.body?.status);

    const finalStatus =
      requestedStatus === "Completed" ? "Completed" : "Pending";

    db.prepare(
      `
      UPDATE subtasks
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(finalStatus, getIndianTimestamp(), subtask.id);

    const updatedSubtask = db
      .prepare("SELECT * FROM subtasks WHERE id = ?")
      .get(subtask.id);

    const updatedTask = employeeBoardSyncTaskStatus(task.id);

    res.json({
      success: true,
      message: "Subtask updated successfully.",
      subtask: employeeBoardNormalizeSubtask(updatedSubtask),
      task: employeeBoardNormalizeTask(updatedTask),
    });
  } catch (error) {
    console.error("Employee update subtask error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update subtask.",
    });
  }
});

app.delete("/api/employee/subtasks/:subtaskId", authRequired, (req, res) => {
  try {
    const subtaskId = req.params.subtaskId;

    const subtask = db
      .prepare(
        `
        SELECT *
        FROM subtasks
        WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
        LIMIT 1
      `
      )
      .get(String(subtaskId));

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

    if (!employeeBoardUserCanAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You can delete only subtasks from your assigned tasks.",
      });
    }

    db.prepare("DELETE FROM subtasks WHERE id = ?").run(subtask.id);

    const updatedTask = employeeBoardSyncTaskStatus(task.id);

    res.json({
      success: true,
      message: "Subtask deleted successfully.",
      deleted: true,
      task: employeeBoardNormalizeTask(updatedTask),
    });
  } catch (error) {
    console.error("Employee delete subtask error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete subtask.",
    });
  }
});

/* ---------------- HEALTH ---------------- */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Valencia backend is running",
    database: "SQLite",
    auth: "SQLite JWT Authentication",
    timezone: "Asia/Kolkata / IST",
    attendance:
      "Auto check-in on login/signup, manual checkout allowed, auto checkout after 12 hours",
    strikeSystem:
      "Mandatory employee login Monday to Saturday. Missed previous working-day login creates strike. 3 active strikes block account.",
    projectHours:
      "Employees can submit project-wise daily hours. Admin can review 8.5-hour utilization.",
    routes: {
      projects: [
        "GET /api/projects",
        "GET /api/projects/:id",
        "POST /api/projects",
        "PATCH /api/projects/:id",
        "PUT /api/projects/:id",
        "DELETE /api/projects/:id",
      ],
      leaves: [
        "GET /api/leave-requests",
        "POST /api/leave-requests",
        "PATCH /api/leave-requests/:id",
      ],
      loginStrikes: [
        "GET /api/login-strikes",
        "GET /api/login-strikes/me",
        "POST /api/login-strikes/run-daily-check",
        "POST /api/login-strikes/:userId/clear",
      ],
      projectHours: [
        "GET /api/time-entries/me",
        "POST /api/time-entries",
        "DELETE /api/time-entries/:id",
        "GET /api/admin/project-hours-summary",
        "GET /api/admin/project-hours/:userId",
        "PATCH /api/admin/time-entries/:id/review",
      ],
    },
  });
});

/* ---------------- AUTH ---------------- */

app.post("/api/auth/register", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const phone = String(req.body.phone || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits.",
      });
    }

    const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists. Please login.",
      });
    }

    const nowIST = getIndianTimestamp();
    const passwordHash = await bcrypt.hash(password, 10);

    const result = db
      .prepare(
        `
        INSERT INTO users (
          name,
          email,
          phone,
          password_hash,
          role,
          department,
          designation,
          status,
          profile_image,
          office_location,
          created_at,
          updated_at,
          last_login_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        req.body.name || "Valencia User",
        email,
        phone,
        passwordHash,
        req.body.role || "employee",
        req.body.department || "Sales team",
        req.body.designation || "Team Member",
        "active",
        "",
        "Main Campus",
        nowIST,
        nowIST,
        nowIST
      );

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(result.lastInsertRowid);

    ensureAutoCheckIn(user);
    recordAppLogin(user, req, "register");

    const token = createToken(user);

    res.json({
      success: true,
      token,
      user: normalizeUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

        const accountStatus = String(user.status || "active")
      .trim()
      .toLowerCase();

    if (accountStatus === "blocked") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_BLOCKED",
        message: "Your account has been blocked. Please contact administrator.",
      });
    }

    if (accountStatus === "deleted") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DELETED",
        message: "Your account has been deleted. Please contact administrator.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const nowIST = getIndianTimestamp();

    db.prepare(
      `
      UPDATE users
      SET last_login_at = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(nowIST, nowIST, user.id);

    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);

    ensureAutoCheckIn(updated);
    recordAppLogin(updated, req, "login");

    const token = createToken(updated);

    res.json({
      success: true,
      token,
      user: normalizeUser(updated),
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
});

app.get("/api/me", authRequired, (req, res) => {
  ensureAutoCheckOut(req.user);

  res.json({
    success: true,
    user: normalizeUser(req.user),
  });
});

app.get("/api/me/account-status", authRequired, (req, res) => {
  try {
    const user = db
      .prepare(
        `
        SELECT id, name, email, role, department, status
        FROM users
        WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
        LIMIT 1
      `
      )
      .get(String(req.user.id));

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User account not found. Please login again.",
      });
    }

    const status = String(user.status || "active").trim().toLowerCase();

    if (status === "blocked") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_BLOCKED",
        status: "blocked",
        message: "Your account has been blocked. Please contact administrator.",
      });
    }

    if (status === "deleted") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DELETED",
        status: "deleted",
        message: "Your account has been deleted. Please contact administrator.",
      });
    }

    res.json({
      success: true,
      status: "active",
      user: normalizeUser(user),
    });
  } catch (error) {
    console.error("Account status check error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check account status.",
    });
  }
});

/* ---------------- DEPARTMENTS ---------------- */

app.get("/api/departments", authRequired, (req, res) => {
  const departments = db
    .prepare("SELECT * FROM departments ORDER BY name ASC")
    .all();

  res.json({
    success: true,
    departments,
  });
});

app.post("/api/departments", authRequired, requireAdmin, (req, res) => {
  try {
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required.",
      });
    }

    const existing = db
      .prepare("SELECT * FROM departments WHERE LOWER(name) = LOWER(?)")
      .get(name);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This department already exists.",
      });
    }

    const result = db
      .prepare("INSERT INTO departments (name) VALUES (?)")
      .run(name);

    const department = db
      .prepare("SELECT * FROM departments WHERE id = ?")
      .get(result.lastInsertRowid);

    res.json({
      success: true,
      department,
    });
  } catch (error) {
    console.error("Create department error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create department.",
    });
  }
});

app.patch("/api/departments/:id", authRequired, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Department name is required.",
      });
    }

    const department = db
      .prepare("SELECT * FROM departments WHERE id = ?")
      .get(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    const duplicate = db
      .prepare("SELECT * FROM departments WHERE LOWER(name) = LOWER(?) AND id != ?")
      .get(name, id);

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Another department with this name already exists.",
      });
    }

    db.prepare("UPDATE departments SET name = ? WHERE id = ?").run(name, id);

    const updated = db
      .prepare("SELECT * FROM departments WHERE id = ?")
      .get(id);

    res.json({
      success: true,
      department: updated,
    });
  } catch (error) {
    console.error("Update department error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update department.",
    });
  }
});

app.delete("/api/departments/:id", authRequired, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;

    const department = db
      .prepare("SELECT * FROM departments WHERE id = ?")
      .get(id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    const usersInDepartment = db
      .prepare("SELECT COUNT(*) AS count FROM users WHERE department = ?")
      .get(department.name);

    if (usersInDepartment.count > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete this department because users are assigned to it.",
      });
    }

    db.prepare("DELETE FROM departments WHERE id = ?").run(id);

    res.json({
      success: true,
      deleted: true,
      department,
    });
  } catch (error) {
    console.error("Delete department error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete department.",
    });
  }
});

/* ---------------- USERS ---------------- */

app.get("/api/users", authRequired, (req, res) => {
  let users;

  if (req.user.role === "superAdmin") {
    users = db
      .prepare("SELECT * FROM users ORDER BY created_at DESC")
      .all();
  } else if (req.user.role === "admin") {
    users = db
      .prepare(
        `
        SELECT *
        FROM users
        WHERE role != 'superAdmin'
        ORDER BY created_at DESC
      `
      )
      .all();
  } else if (req.user.role === "manager") {
    users = db
      .prepare(
        `
        SELECT *
        FROM users
        WHERE department = ?
          AND role != 'superAdmin'
        ORDER BY created_at DESC
      `
      )
      .all(req.user.department);
  } else {
    users = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .all(req.user.id);
  }

  res.json({
    success: true,
    users: users.map(normalizeUser),
  });
});

app.get("/api/users/:id", authRequired, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found.",
    });
  }

  if (req.user.role === "employee" && Number(req.user.id) !== Number(user.id)) {
    return res.status(403).json({
      success: false,
      message: "You cannot view another user's profile.",
    });
  }

  if (
    req.user.role === "admin" &&
    user.role === "superAdmin" &&
    Number(req.user.id) !== Number(user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: "Admin cannot view Super Admin profile.",
    });
  }

  if (
    req.user.role === "manager" &&
    req.user.department !== user.department &&
    Number(req.user.id) !== Number(user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: "You cannot view users outside your department.",
    });
  }

  res.json({
    success: true,
    user: normalizeUser(user),
  });
});

app.patch("/api/users/:id", authRequired, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (req.user.role === "admin" && user.role === "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot update Super Admin profile.",
      });
    }

    const name = String(req.body.name ?? user.name).trim();
    const phone = String(req.body.phone ?? user.phone ?? "").trim();
    const role = String(req.body.role ?? user.role).trim();
    const department = String(req.body.department ?? user.department).trim();
    const designation = String(
      req.body.designation ?? user.designation ?? "Team Member"
    ).trim();
    const status = String(req.body.status ?? user.status ?? "active").trim();
    const officeLocation = String(
      req.body.officeLocation ?? user.office_location ?? "Main Campus"
    ).trim();

    db.prepare(
      `
      UPDATE users
      SET name = ?,
          phone = ?,
          role = ?,
          department = ?,
          designation = ?,
          status = ?,
          office_location = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(
      name,
      phone,
      role,
      department,
      designation,
      status,
      officeLocation,
      getIndianTimestamp(),
      id
    );

    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

    res.json({
      success: true,
      user: normalizeUser(updated),
    });
  } catch (error) {
    console.error("Update user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user.",
    });
  }
});

app.patch("/api/users/:id/status", authRequired, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const status = String(req.body.status || "").trim();

    if (!["active", "blocked"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or blocked.",
      });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (req.user.role === "admin" && user.role === "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot change Super Admin status.",
      });
    }

    db.prepare(
      `
      UPDATE users
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(status, getIndianTimestamp(), id);

    const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

    res.json({
      success: true,
      user: normalizeUser(updated),
    });
  } catch (error) {
    console.error("Update user status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user status.",
    });
  }
});

/* ---------------- PROJECTS ---------------- */

function parseProjectMembers(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return [];

    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (parsed && typeof parsed === "object") return [parsed];
      return [];
    } catch {
      return clean
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (typeof value === "object") return [value];

  return [value];
}

function findUserForProjectMember(member) {
  if (!member) return null;

  let id = "";
  let email = "";
  let name = "";

  if (typeof member === "object") {
    id =
      member.id ||
      member._id ||
      member.uid ||
      member.userId ||
      member.user_id ||
      member.employeeId ||
      member.employee_id ||
      "";

    email = member.email || member.userEmail || member.user_email || "";

    name =
      member.name ||
      member.fullName ||
      member.full_name ||
      member.displayName ||
      member.display_name ||
      member.employeeName ||
      member.employee_name ||
      "";
  } else {
    const value = String(member || "").trim();

    if (value.includes("@")) {
      email = value;
    } else if (/^\d+$/.test(value)) {
      id = value;
    } else {
      name = value;
    }
  }

  if (id) {
    const user = db
      .prepare("SELECT id, name, email, department, role FROM users WHERE id = ? LIMIT 1")
      .get(id);

    if (user) return user;
  }

  if (email) {
    const user = db
      .prepare("SELECT id, name, email, department, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1")
      .get(email);

    if (user) return user;
  }

  if (name) {
    const user = db
      .prepare("SELECT id, name, email, department, role FROM users WHERE LOWER(name) = LOWER(?) LIMIT 1")
      .get(name);

    if (user) return user;
  }

  return null;
}

function normalizeProjectMember(member) {
  const user = findUserForProjectMember(member);

  if (user) {
    return {
      id: String(user.id),
      uid: String(user.id),
      userId: String(user.id),
      user_id: String(user.id),
      employeeId: String(user.id),
      employee_id: String(user.id),
      name: user.name || "",
      email: String(user.email || "").trim().toLowerCase(),
      department: user.department || "",
      role: user.role || "employee",
    };
  }

  if (typeof member === "object" && member) {
    const id =
      member.id ||
      member._id ||
      member.uid ||
      member.userId ||
      member.user_id ||
      member.employeeId ||
      member.employee_id ||
      "";

    const email = member.email || member.userEmail || member.user_email || "";

    const name =
      member.name ||
      member.fullName ||
      member.full_name ||
      member.displayName ||
      member.display_name ||
      member.employeeName ||
      member.employee_name ||
      email ||
      id ||
      "";

    return {
      id: id ? String(id) : "",
      uid: id ? String(id) : "",
      userId: id ? String(id) : "",
      user_id: id ? String(id) : "",
      employeeId: id ? String(id) : "",
      employee_id: id ? String(id) : "",
      name: String(name || ""),
      email: String(email || "").trim().toLowerCase(),
      department: member.department || member.departmentName || "",
      role: member.role || "employee",
    };
  }

  const value = String(member || "").trim();

  if (!value) return null;

  return {
    id: value,
    uid: value,
    userId: value,
    user_id: value,
    employeeId: value,
    employee_id: value,
    name: value,
    email: value.includes("@") ? value.toLowerCase() : "",
    department: "",
    role: "employee",
  };
}

function stringifyProjectMembers(value) {
  const members = parseProjectMembers(value)
    .map(normalizeProjectMember)
    .filter(Boolean);

  const unique = [];
  const seen = new Set();

  members.forEach((member) => {
    const key =
      String(member.email || "").toLowerCase() ||
      String(member.id || "").toLowerCase() ||
      String(member.name || "").toLowerCase();

    if (!key || seen.has(key)) return;

    seen.add(key);
    unique.push(member);
  });

  return JSON.stringify(unique);
}

function getIncomingProjectMembers(body = {}) {
  if (body.members !== undefined) return body.members;
  if (body.member !== undefined) return body.member;

  if (body.assignedMembers !== undefined) return body.assignedMembers;
  if (body.assigned_members !== undefined) return body.assigned_members;

  if (body.assignedUsers !== undefined) return body.assignedUsers;
  if (body.assigned_users !== undefined) return body.assigned_users;

  if (body.assignedEmployees !== undefined) return body.assignedEmployees;
  if (body.assigned_employees !== undefined) return body.assigned_employees;

  if (body.selectedUsers !== undefined) return body.selectedUsers;
  if (body.selected_users !== undefined) return body.selected_users;

  if (body.selectedEmployees !== undefined) return body.selectedEmployees;
  if (body.selected_employees !== undefined) return body.selected_employees;

  if (body.employeeIds !== undefined) return body.employeeIds;
  if (body.employee_ids !== undefined) return body.employee_ids;

  if (body.assignedUserIds !== undefined) return body.assignedUserIds;
  if (body.assigned_user_ids !== undefined) return body.assigned_user_ids;

  if (body.assignedEmployeeIds !== undefined) return body.assignedEmployeeIds;
  if (body.assigned_employee_ids !== undefined) return body.assigned_employee_ids;

  if (body.memberIds !== undefined) return body.memberIds;
  if (body.member_ids !== undefined) return body.member_ids;

  if (body.users !== undefined) return body.users;
  if (body.employees !== undefined) return body.employees;

  return undefined;
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function projectHasEmployee(project, user) {
  if (!project || !user) return false;

  const userKeys = [
    user.id,
    user.uid,
    user.userId,
    user.user_id,
    user.employeeId,
    user.employee_id,
    user.email,
    user.name,
  ]
    .filter(Boolean)
    .map(normalizeKey);

  const members = parseProjectMembers(project.members);

  const memberKeys = members
    .flatMap((member) => {
      if (!member) return [];

      if (typeof member === "string" || typeof member === "number") {
        return [member];
      }

      return [
        member.id,
        member._id,
        member.uid,
        member.userId,
        member.user_id,
        member.employeeId,
        member.employee_id,
        member.email,
        member.name,
      ];
    })
    .filter(Boolean)
    .map(normalizeKey);

  return userKeys.some((key) => memberKeys.includes(key));
}

function projectHasAssignedTask(projectId, userId) {
  const task = db
    .prepare(
      `
      SELECT id
      FROM tasks
      WHERE project_id = ?
        AND assigned_to = ?
      LIMIT 1
    `
    )
    .get(projectId, userId);

  return Boolean(task);
}

function employeeCanSeeProject(user, project) {
  if (!user || !project) return false;

  if (projectHasEmployee(project, user)) return true;
  if (projectHasAssignedTask(project.id, user.id)) return true;

  return false;
}

function normalizeProject(row) {
  if (!row) return null;

  const members = parseProjectMembers(row.members);

  const employeeIds = members
    .map((member) => {
      if (typeof member === "object") {
        return String(
          member.id ||
            member.uid ||
            member.userId ||
            member.user_id ||
            member.employeeId ||
            member.employee_id ||
            member.email ||
            ""
        );
      }

      return String(member || "");
    })
    .filter(Boolean);

  return {
    ...row,

    id: row.id,
    name: row.name || "",
    title: row.name || "",
    projectName: row.name || "",

    description: row.description || "",

    department: row.department || "",
    division: row.department || "",
    departmentName: row.department || "",

    status: row.status || "active",
    priority: row.priority || "medium",
    progress: Number(row.progress || 0),

    managerId: String(row.manager_id || ""),
    manager_id: row.manager_id || "",

    members,
    member: members,

    assignedMembers: members,
    assigned_members: members,

    assignedUsers: members,
    assigned_users: members,

    assignedEmployees: members,
    assigned_employees: members,

    users: members,
    employees: members,

    employeeIds,
    employee_ids: employeeIds,

    startDate: row.start_date || "",
    start_date: row.start_date || "",

    deadline: row.end_date || "",
    endDate: row.end_date || "",
    end_date: row.end_date || "",

    createdBy: String(row.created_by || ""),
    created_by: row.created_by || "",

    createdAt: row.created_at || "",
    created_at: row.created_at || "",

    updatedAt: row.updated_at || "",
    updated_at: row.updated_at || "",
  };
}

function getProjectById(id) {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
}

function canManageProject(user, project) {
  if (!user || !project) return false;

  if (user.role === "superAdmin" || user.role === "admin") return true;

  if (user.role === "manager") {
    return (
      String(project.manager_id || "") === String(user.id) ||
      String(project.department || "") === String(user.department || "")
    );
  }

  return false;
}

function patchValue(incoming, existing, fallback = "") {
  if (incoming === undefined || incoming === null) return existing ?? fallback;

  const value = String(incoming).trim();

  if (!value) return existing ?? fallback;

  return value;
}

app.get("/api/projects", authRequired, (req, res) => {
  try {
    let projects = [];

    if (req.user.role === "superAdmin" || req.user.role === "admin") {
      projects = db
        .prepare(
          `
          SELECT *
          FROM projects
          ORDER BY created_at DESC
        `
        )
        .all();
    } else if (req.user.role === "manager") {
      projects = db
        .prepare(
          `
          SELECT *
          FROM projects
          WHERE department = ?
             OR manager_id = ?
          ORDER BY created_at DESC
        `
        )
        .all(req.user.department, req.user.id);
    } else {
      const allProjects = db
        .prepare(
          `
          SELECT *
          FROM projects
          WHERE COALESCE(status, 'active') != 'deleted'
          ORDER BY created_at DESC
        `
        )
        .all();

      projects = allProjects.filter((project) =>
        employeeCanSeeProject(req.user, project)
      );
    }

    res.json({
      success: true,
      projects: projects.map(normalizeProject),
    });
  } catch (error) {
    console.error("Get projects error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load projects.",
    });
  }
});

app.get("/api/projects/:id", authRequired, (req, res) => {
  try {
    const project = getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (
      req.user.role === "employee" &&
      !employeeCanSeeProject(req.user, project)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
    }

    res.json({
      success: true,
      project: normalizeProject(project),
    });
  } catch (error) {
    console.error("Get project detail error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load project.",
    });
  }
});

app.post("/api/projects", authRequired, requireAdmin, (req, res) => {
  try {
    const name = String(req.body.name || req.body.title || "").trim();

    const description = String(
      req.body.description || req.body.details || ""
    ).trim();

    const department = String(
      req.body.department || req.body.division || req.body.departmentName || ""
    ).trim();

    const status = String(req.body.status || "active").trim();
    const priority = String(req.body.priority || "medium").trim();

    const startDate = String(
      req.body.start_date || req.body.startDate || ""
    ).trim();

    const endDate = String(
      req.body.end_date || req.body.endDate || req.body.deadline || ""
    ).trim();

    const managerId = req.body.manager_id || req.body.managerId || null;

    const incomingMembers = getIncomingProjectMembers(req.body);
    const members = stringifyProjectMembers(incomingMembers || []);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Project name is required.",
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Project description is required.",
      });
    }

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "Project department is required.",
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and deadline are required.",
      });
    }

    const nowIST = getIndianTimestamp();

    const result = db
      .prepare(
        `
        INSERT INTO projects (
          name,
          description,
          department,
          status,
          priority,
          start_date,
          end_date,
          progress,
          manager_id,
          members,
          created_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        name,
        description,
        department,
        status,
        priority,
        startDate,
        endDate,
        Number(req.body.progress || 0),
        managerId,
        members,
        req.user.id,
        nowIST,
        nowIST
      );

    const project = getProjectById(result.lastInsertRowid);

    notifyProjectAssignment(project, req.user, "Project assigned");

    res.json({
      success: true,
      project: normalizeProject(project),
    });
  } catch (error) {
    console.error("Create project error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create project.",
    });
  }
});

function updateProjectHandler(req, res) {
  try {
    const id = req.params.id;
    const existing = getProjectById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (!canManageProject(req.user, existing)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this project.",
      });
    }

    const name = patchValue(
      req.body.name || req.body.title || req.body.projectName,
      existing.name,
      ""
    );

    const description = patchValue(
      req.body.description || req.body.details,
      existing.description,
      ""
    );

    const department = patchValue(
      req.body.department || req.body.division || req.body.departmentName,
      existing.department,
      ""
    );

    const status = patchValue(req.body.status, existing.status, "active");

    const priority = patchValue(
      req.body.priority,
      existing.priority,
      "medium"
    );

    const startDate = patchValue(
      req.body.start_date || req.body.startDate,
      existing.start_date,
      ""
    );

    const endDate = patchValue(
      req.body.end_date || req.body.endDate || req.body.deadline,
      existing.end_date,
      ""
    );

    const progress =
      req.body.progress === undefined || req.body.progress === null
        ? Number(existing.progress || 0)
        : Number(req.body.progress || 0);

    const managerId =
      req.body.manager_id ??
      req.body.managerId ??
      existing.manager_id ??
      null;

    const incomingMembers = getIncomingProjectMembers(req.body);

    const members =
      incomingMembers !== undefined
        ? stringifyProjectMembers(incomingMembers)
        : existing.members || "[]";

    db.prepare(
      `
      UPDATE projects
      SET name = ?,
          description = ?,
          department = ?,
          status = ?,
          priority = ?,
          start_date = ?,
          end_date = ?,
          progress = ?,
          manager_id = ?,
          members = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(
      name,
      description,
      department,
      status,
      priority,
      startDate,
      endDate,
      progress,
      managerId,
      members,
      getIndianTimestamp(),
      id
    );

    const updated = getProjectById(id);

    notifyProjectAssignment(updated, req.user, "Project updated");

    res.json({
      success: true,
      project: normalizeProject(updated),
    });
  } catch (error) {
    console.error("Update project error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update project.",
    });
  }
}

app.patch("/api/projects/:id", authRequired, updateProjectHandler);
app.put("/api/projects/:id", authRequired, updateProjectHandler);

app.delete("/api/projects/:id", authRequired, (req, res) => {
  try {
    const id = req.params.id;
    const existing = getProjectById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (!canManageProject(req.user, existing)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this project.",
      });
    }

    db.prepare(
      `
      UPDATE projects
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run("deleted", getIndianTimestamp(), id);

    const updated = getProjectById(id);

    res.json({
      success: true,
      deleted: true,
      project: normalizeProject(updated),
    });
  } catch (error) {
    console.error("Delete project error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete project.",
    });
  }
});

/* ---------------- TASKS ---------------- */

app.get("/api/tasks", authRequired, (req, res) => {
  let tasks;

  if (req.user.role === "superAdmin" || req.user.role === "admin") {
    tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
  } else if (req.user.role === "manager") {
    tasks = db
      .prepare("SELECT * FROM tasks WHERE department = ? ORDER BY created_at DESC")
      .all(req.user.department);
  } else {
    tasks = db
      .prepare("SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC")
      .all(req.user.id);
  }

  res.json({
    success: true,
    tasks,
  });
});

app.post("/api/tasks", authRequired, (req, res) => {
  try {
    const body = req.body || {};

    const title = String(
      body.title ||
        body.name ||
        body.taskTitle ||
        body.task_title ||
        body.taskName ||
        body.task_name ||
        ""
    ).trim();

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Task title is required.",
      });
    }

    if (req.user.role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Employees cannot create tasks.",
      });
    }

    function safeDate() {
      if (typeof getIndianTimestamp === "function") {
        return getIndianTimestamp();
      }

      return new Date().toISOString();
    }

    function normalizeStatusLocal(value) {
      const clean = String(value || "Pending")
        .trim()
        .toLowerCase()
        .replaceAll("_", " ")
        .replaceAll("-", " ");

      if (clean === "completed" || clean === "complete" || clean === "done") {
        return "Completed";
      }

      if (clean === "in progress" || clean === "inprogress" || clean === "doing") {
        return "In Progress";
      }

      return "Pending";
    }

    function isDoneStatusLocal(value) {
      const clean = String(value || "")
        .trim()
        .toLowerCase()
        .replaceAll("_", " ")
        .replaceAll("-", " ");

      return clean === "completed" || clean === "complete" || clean === "done";
    }

    function getIncomingAssigneeValue(source = {}) {
      return (
        source.assigned_to ??
        source.assignedTo ??
        source.assignedToId ??
        source.assigned_to_id ??
        source.assignee ??
        source.assigneeId ??
        source.assignee_id ??
        source.employeeId ??
        source.employee_id ??
        source.userId ??
        source.user_id ??
        source.assignedUser ??
        source.assigned_user ??
        source.assignedEmployee ??
        source.assigned_employee ??
        null
      );
    }

    function findUserByAny(value) {
      if (value === undefined || value === null || value === "") {
        return null;
      }

      if (typeof value === "object") {
        const fromId =
          value.id ||
          value._id ||
          value.uid ||
          value.userId ||
          value.user_id ||
          value.employeeId ||
          value.employee_id ||
          "";

        if (fromId) {
          const userById = findUserByAny(fromId);
          if (userById) return userById;
        }

        const fromEmail =
          value.email ||
          value.userEmail ||
          value.user_email ||
          value.assignedEmail ||
          value.assigned_email ||
          "";

        if (fromEmail) {
          const userByEmail = findUserByAny(fromEmail);
          if (userByEmail) return userByEmail;
        }

        const fromName =
          value.name ||
          value.fullName ||
          value.full_name ||
          value.displayName ||
          value.display_name ||
          value.employeeName ||
          value.employee_name ||
          "";

        if (fromName) {
          const userByName = findUserByAny(fromName);
          if (userByName) return userByName;
        }

        return null;
      }

      const raw = String(value).trim();

      if (!raw) return null;

      return (
        db
          .prepare(
            `
            SELECT id, name, email, role, department
            FROM users
            WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
               OR LOWER(email) = LOWER(?)
               OR LOWER(name) = LOWER(?)
            LIMIT 1
          `
          )
          .get(raw, raw, raw) || null
      );
    }

    const rawAssignee =
      getIncomingAssigneeValue(body) ||
      body.assignedUser ||
      body.assigned_user ||
      body.assignedEmployee ||
      body.assigned_employee ||
      null;

    const assignee = findUserByAny(rawAssignee);

    if (!assignee?.id) {
      return res.status(400).json({
        success: false,
        message:
          "Assigned employee was not found. Please reselect employee from dropdown.",
        receivedAssignedValue: rawAssignee,
      });
    }

    const requestedProjectId =
      body.project_id ||
      body.projectId ||
      body.projectID ||
      body.parentProjectId ||
      body.parent_project_id ||
      null;

    let project = null;
    let finalProjectId = null;

    if (requestedProjectId !== null && requestedProjectId !== undefined && requestedProjectId !== "") {
      project =
        db
          .prepare(
            `
            SELECT *
            FROM projects
            WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
            LIMIT 1
          `
          )
          .get(String(requestedProjectId)) || null;

      if (!project) {
        return res.status(404).json({
          success: false,
          message: `Project not found for id: ${requestedProjectId}`,
        });
      }

      finalProjectId = project.id;
    }

    if (
      req.user.role === "manager" &&
      project &&
      project.department !== req.user.department
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot add tasks to a project outside your department.",
      });
    }

    const finalStatus = normalizeStatusLocal(body.status || "Pending");
    const nowIST = safeDate();

    const taskColumns = db
      .prepare("PRAGMA table_info(tasks)")
      .all()
      .map((column) => column.name);

    const hasColumn = (name) => taskColumns.includes(name);

    const taskData = {
      project_id: finalProjectId,
      title,
      description: String(body.description || body.details || ""),
      status: finalStatus,
      priority: String(body.priority || "Normal"),
      start_date: String(body.start_date || body.startDate || ""),
      end_date: String(
        body.end_date ||
          body.endDate ||
          body.due_date ||
          body.dueDate ||
          body.deadline ||
          ""
      ),
      assigned_to: assignee.id,
      department:
        project?.department ||
        assignee.department ||
        body.department ||
        req.user.department ||
        "",
      created_by: req.user.id,
      completed_at: isDoneStatusLocal(finalStatus) ? nowIST : null,
      created_at: nowIST,
      updated_at: nowIST,
    };

    if (!hasColumn("title")) {
      return res.status(500).json({
        success: false,
        message: "Backend tasks table is missing title column.",
      });
    }

    if (!hasColumn("assigned_to")) {
      return res.status(500).json({
        success: false,
        message: "Backend tasks table is missing assigned_to column.",
      });
    }

    const insertColumns = Object.keys(taskData).filter(hasColumn);
    const placeholders = insertColumns.map(() => "?").join(", ");
    const values = insertColumns.map((column) => taskData[column]);

    const result = db
      .prepare(
        `
        INSERT INTO tasks (${insertColumns.join(", ")})
        VALUES (${placeholders})
      `
      )
      .run(...values);

    let task =
      db
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .get(result.lastInsertRowid) || {
        id: result.lastInsertRowid,
        ...taskData,
      };

    try {
      const subtasksTable = db
        .prepare(
          `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = 'subtasks'
          LIMIT 1
        `
        )
        .get();

      if (subtasksTable) {
        const subtasks = db
          .prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY id ASC")
          .all(task.id);

        task = {
          ...task,
          subtasks,
        };
      }
    } catch {
      // Subtasks are optional here.
    }

    try {
      if (typeof notifyTaskAssignment === "function") {
        notifyTaskAssignment(task, req.user, "Task assigned");
      }
    } catch (notifyError) {
      console.warn("Task notification skipped:", notifyError?.message);
    }

    try {
      if (finalProjectId && typeof recalculateProjectProgress === "function") {
        recalculateProjectProgress(finalProjectId);
      }
    } catch (progressError) {
      console.warn("Project progress recalculation skipped:", progressError?.message);
    }

    res.json({
      success: true,
      task: {
        ...task,

        taskId: task.id,
        task_id: task.id,

        name: task.title,
        taskName: task.title,
        task_name: task.title,
        taskTitle: task.title,
        task_title: task.title,

        projectId: task.project_id,
        project_id: task.project_id,

        assignedTo: task.assigned_to,
        assigned_to: task.assigned_to,
        assignedToId: task.assigned_to,
        assigned_to_id: task.assigned_to,

        assignedUser: {
          id: assignee.id,
          name: assignee.name,
          email: assignee.email,
          department: assignee.department,
        },

        startDate: task.start_date,
        start_date: task.start_date,

        endDate: task.end_date,
        end_date: task.end_date,
        dueDate: task.end_date,
        due_date: task.end_date,

        createdAt: task.created_at,
        created_at: task.created_at,

        updatedAt: task.updated_at,
        updated_at: task.updated_at,
      },
    });
  } catch (error) {
    console.error("Create task full backend error:", error);

    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create task.",
      backendError: error?.stack || String(error),
    });
  }
});

app.patch("/api/tasks/:id", authRequired, (req, res) => {
  try {
    const id = req.params.id;
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    if (!canAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task.",
      });
    }

    const title = String(req.body.title ?? task.title).trim();
    const description = String(req.body.description ?? task.description ?? "");
    const status = normalizeStatus(req.body.status ?? task.status);
    const priority = String(req.body.priority ?? task.priority ?? "Normal");
    const startDate = String(
      req.body.start_date ?? req.body.startDate ?? task.start_date ?? ""
    );
    const endDate = String(
      req.body.end_date ?? req.body.endDate ?? task.end_date ?? ""
    );
    const assignedTo =
      req.user.role === "employee"
        ? task.assigned_to
        : req.body.assigned_to ?? req.body.assignedTo ?? task.assigned_to;

    const nowIST = getIndianTimestamp();

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Task title is required.",
      });
    }

    db.prepare(
      `
      UPDATE tasks
      SET title = ?,
          description = ?,
          status = ?,
          priority = ?,
          start_date = ?,
          end_date = ?,
          assigned_to = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(
      title,
      description,
      status,
      priority,
      startDate,
      endDate,
      assignedTo,
      isDoneStatus(status) ? nowIST : null,
      nowIST,
      id
    );

    const updated = getTaskWithSubtasks(id);

    if (String(updated.assigned_to || "") !== String(task.assigned_to || "")) {
      notifyTaskAssignment(updated, req.user, "Task assigned");
    } else if (String(updated.status || "") !== String(task.status || "")) {
      recordEmployeeActivity({
        userId: updated.assigned_to,
        role: "employee",
        department: updated.department || "",
        actionType: isDoneStatus(updated.status) ? "task_completed" : "task_status_changed",
        title: isDoneStatus(updated.status) ? "Task completed" : "Task status changed",
        message: `${updated.title || "Task"} is now ${updated.status || "updated"}.`,
        entityType: "task",
        entityId: updated.id,
        createdBy: req.user.id,
      });
    }

    recalculateProjectProgress(updated.project_id);

    res.json({
      success: true,
      task: updated,
    });
  } catch (error) {
    console.error("Update task error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update task.",
    });
  }
});

app.patch("/api/tasks/:id/status", authRequired, (req, res) => {
  try {
    const { status } = req.body;
    const finalStatus = normalizeStatus(status);

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    if (!canAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task.",
      });
    }

    const nowIST = getIndianTimestamp();
    const completedAt = isDoneStatus(finalStatus) ? nowIST : null;

    db.prepare(
      `
      UPDATE tasks
      SET status = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(finalStatus, completedAt, nowIST, req.params.id);

    const updated = getTaskWithSubtasks(req.params.id);

    recordEmployeeActivity({
      userId: updated.assigned_to,
      role: "employee",
      department: updated.department || "",
      actionType: isDoneStatus(updated.status) ? "task_completed" : "task_status_changed",
      title: isDoneStatus(updated.status) ? "Task completed" : "Task status changed",
      message: `${updated.title || "Task"} is now ${updated.status || "updated"}.`,
      entityType: "task",
      entityId: updated.id,
      createdBy: req.user.id,
    });

    createNotification({
      title: isDoneStatus(updated.status) ? "Task completed" : "Task status updated",
      message: `${updated.title || "Task"} is now ${updated.status || "updated"}.`,
      severity: "standard",
      targetType: "User",
      userId: updated.assigned_to,
      department: updated.department || "",
      entityType: "task",
      entityId: updated.id,
      createdBy: req.user.id,
    });

    recalculateProjectProgress(updated.project_id);

    res.json({
      success: true,
      task: updated,
    });
  } catch (error) {
    console.error("Update task status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update task status.",
    });
  }
});

app.delete("/api/tasks/:id", authRequired, (req, res) => {
  try {
    const id = req.params.id;
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    if (!canAccessTask(req.user, task) || req.user.role === "employee") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to delete this task.",
      });
    }

    db.prepare("DELETE FROM subtasks WHERE task_id = ?").run(id);
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

    recalculateProjectProgress(task.project_id);

    res.json({
      success: true,
      deleted: true,
      task,
    });
  } catch (error) {
    console.error("Delete task error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete task.",
    });
  }
});

/* ---------------- SUBTASKS ---------------- */

app.get("/api/subtasks", authRequired, (req, res) => {
  let subtasks;

  if (req.user.role === "superAdmin" || req.user.role === "admin") {
    subtasks = db.prepare("SELECT * FROM subtasks ORDER BY created_at DESC").all();
  } else if (req.user.role === "manager") {
    subtasks = db
      .prepare(
        `
        SELECT s.*
        FROM subtasks s
        INNER JOIN tasks t ON t.id = s.task_id
        WHERE t.department = ?
        ORDER BY s.created_at DESC
      `
      )
      .all(req.user.department);
  } else {
    subtasks = db
      .prepare(
        `
        SELECT s.*
        FROM subtasks s
        INNER JOIN tasks t ON t.id = s.task_id
        WHERE t.assigned_to = ?
        ORDER BY s.created_at DESC
      `
      )
      .all(req.user.id);
  }

  res.json({
    success: true,
    subtasks,
  });
});

app.post("/api/subtasks", authRequired, (req, res) => {
  try {
    const { task_id, title, status = "Pending" } = req.body;

    if (!task_id || !title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "task_id and title are required.",
      });
    }

    if (req.user.role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Employees cannot create subtasks.",
      });
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task_id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found.",
      });
    }

    if (!canAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task.",
      });
    }

    const nowIST = getIndianTimestamp();
    const finalStatus = normalizeStatus(status);

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
      .run(task_id, String(title).trim(), finalStatus, req.user.id, nowIST, nowIST);

    const subtask = db
      .prepare("SELECT * FROM subtasks WHERE id = ?")
      .get(result.lastInsertRowid);

    recalculateProjectProgress(task.project_id);

    res.json({
      success: true,
      subtask,
    });
  } catch (error) {
    console.error("Create subtask error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create subtask.",
    });
  }
});

app.patch("/api/subtasks/:id/status", authRequired, (req, res) => {
  try {
    const id = req.params.id;
    const finalStatus = normalizeStatus(req.body.status);

    const subtask = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id);

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found.",
      });
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(subtask.task_id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Parent task not found.",
      });
    }

    if (!canAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this subtask.",
      });
    }

    db.prepare(
      `
      UPDATE subtasks
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(finalStatus, getIndianTimestamp(), id);

    const updated = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id);

    recalculateProjectProgress(task.project_id);

    res.json({
      success: true,
      subtask: updated,
    });
  } catch (error) {
    console.error("Update subtask status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update subtask status.",
    });
  }
});

app.delete("/api/subtasks/:id", authRequired, (req, res) => {
  try {
    const id = req.params.id;
    const subtask = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id);

    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: "Subtask not found.",
      });
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(subtask.task_id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Parent task not found.",
      });
    }

    if (!canAccessTask(req.user, task) || req.user.role === "employee") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to delete this subtask.",
      });
    }

    db.prepare("DELETE FROM subtasks WHERE id = ?").run(id);

    recalculateProjectProgress(task.project_id);

    res.json({
      success: true,
      deleted: true,
      subtask,
    });
  } catch (error) {
    console.error("Delete subtask error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete subtask.",
    });
  }
});

/* ---------------- APP LOGIN LOGS ---------------- */

app.get("/api/app-logins", authRequired, (req, res) => {
  try {
    let logs;

    if (req.user.role === "superAdmin") {
      logs = db.prepare("SELECT * FROM app_login_logs ORDER BY id DESC").all();
    } else if (req.user.role === "admin") {
      logs = db
        .prepare(
          `
          SELECT l.*
          FROM app_login_logs l
          LEFT JOIN users u ON u.id = l.user_id
          WHERE COALESCE(u.role, l.role, '') != 'superAdmin'
          ORDER BY l.id DESC
        `
        )
        .all();
    } else if (req.user.role === "manager") {
      logs = db
        .prepare(
          `
          SELECT l.*
          FROM app_login_logs l
          LEFT JOIN users u ON u.id = l.user_id
          WHERE l.department = ?
            AND COALESCE(u.role, l.role, '') != 'superAdmin'
          ORDER BY l.id DESC
        `
        )
        .all(req.user.department);
    } else {
      logs = db
        .prepare("SELECT * FROM app_login_logs WHERE user_id = ? ORDER BY id DESC")
        .all(req.user.id);
    }

    res.json({
      success: true,
      total: logs.length,
      appLogins: logs.map(normalizeAppLoginLog),
    });
  } catch (error) {
    console.error("Get app login logs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load app login logs.",
    });
  }
});

/* ---------------- LOGIN STRIKES ---------------- */

app.get("/api/login-strikes", authRequired, requireAdmin, (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT
          u.id AS user_id,
          u.name AS user_name,
          u.email AS user_email,
          u.department AS department,
          u.status AS user_status,
          COUNT(s.id) AS active_strikes,
          MAX(s.created_at) AS updated_at
        FROM users u
        INNER JOIN login_strikes s
          ON s.user_id = u.id
         AND s.status = 'active'
        WHERE u.role = 'employee'
        GROUP BY u.id
        ORDER BY active_strikes DESC, updated_at DESC
      `
      )
      .all();

    const loginStrikes = rows.map(normalizeLoginStrikeUser).filter(Boolean);

    res.json({
      success: true,
      total: loginStrikes.length,
      loginStrikes,
    });
  } catch (error) {
    console.error("Get login strikes error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load login strikes.",
    });
  }
});

app.get("/api/login-strikes/me", authRequired, (req, res) => {
  try {
    const reasons = db
      .prepare(
        `
        SELECT id, reason, strike_date, created_at
        FROM login_strikes
        WHERE user_id = ?
          AND status = 'active'
        ORDER BY strike_date DESC, id DESC
      `
      )
      .all(req.user.id)
      .map(normalizeLoginStrikeReason)
      .filter(Boolean);

    const strikeStatus = {
      userId: String(req.user.id || ""),
      name: req.user.name || "",
      email: req.user.email || "",
      department: req.user.department || "",
      status: req.user.status || "active",
      strikes: reasons.length,
      reasons,
      lastReason: reasons[0]?.reason || "",
      updatedAt: reasons[0]?.createdAt || "",
      escalated:
        reasons.length >= MAX_ACTIVE_LOGIN_STRIKES ||
        req.user.status === "blocked",
    };

    res.json({
      success: true,
      strikeStatus,
    });
  } catch (error) {
    console.error("Get my login strikes error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load your login strike status.",
    });
  }
});

app.post(
  "/api/login-strikes/run-daily-check",
  authRequired,
  requireAdmin,
  (req, res) => {
    try {
      const targetDate = String(req.body.targetDate || "").trim() || null;
      const force = Boolean(req.body.force);

      const result = runMissedLoginStrikeCheck({
        targetDate,
        force,
      });

      res.json(result);
    } catch (error) {
      console.error("Run missed login strike check error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to run missed-login strike check.",
      });
    }
  }
);

app.post(
  "/api/login-strikes/:userId/clear",
  authRequired,
  requireAdmin,
  (req, res) => {
    try {
      const userId = req.params.userId;
      const nowIST = getIndianTimestamp();

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      if (req.user.role === "admin" && user.role === "superAdmin") {
        return res.status(403).json({
          success: false,
          message: "Admin cannot clear Super Admin strikes.",
        });
      }

      db.prepare(
        `
        UPDATE login_strikes
        SET status = 'cleared',
            cleared_at = ?,
            cleared_by = ?,
            cleared_reason = ?
        WHERE user_id = ?
          AND status = 'active'
      `
      ).run(
        nowIST,
        req.user.id,
        String(req.body.reason || "Cleared by Admin/Super Admin"),
        userId
      );

      db.prepare(
        `
        UPDATE users
        SET status = 'active',
            updated_at = ?
        WHERE id = ?
      `
      ).run(nowIST, userId);

      const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

      res.json({
        success: true,
        message: "Login strikes cleared and user unblocked.",
        user: normalizeUser(updated),
      });
    } catch (error) {
      console.error("Clear login strikes error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to clear login strikes.",
      });
    }
  }
);

/* ---------------- ATTENDANCE ---------------- */

function normalizeAttendanceRecord(row) {
  if (!row) return null;

  return {
    ...row,
    id: row.id,
    userId: String(row.user_id || ""),
    userName: row.user_name || "",
    userEmail: row.user_email || "",
    department: row.department || "",
    type: row.type || "",
    status: row.status || "",
    date: row.date || "",
    checkIn: row.check_in || "",
    checkOut: row.check_out || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange(referenceDate = getTodayDate()) {
  const [year, month] = String(referenceDate || getTodayDate())
    .slice(0, 10)
    .split("-")
    .map(Number);

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    startDate: `${year}-${String(month).padStart(2, "0")}-01`,
    endDate: `${year}-${String(month).padStart(2, "0")}-${String(
      lastDay
    ).padStart(2, "0")}`,
  };
}

function getWeekRange(referenceDate = getTodayDate()) {
  const [year, month, day] = String(referenceDate || getTodayDate())
    .slice(0, 10)
    .split("-")
    .map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));
  const weekDay = date.getUTCDay();
  const diffToMonday = weekDay === 0 ? -6 : 1 - weekDay;

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    startDate: toDateString(monday),
    endDate: toDateString(sunday),
  };
}

function getDatesBetween(startDate, endDate) {
  const dates = [];
  const [startYear, startMonth, startDay] = String(startDate)
    .split("-")
    .map(Number);
  const [endYear, endMonth, endDay] = String(endDate).split("-").map(Number);

  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  while (current <= end) {
    dates.push(toDateString(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function getAttendanceRowsForUserDate(userId, dateString) {
  return db
    .prepare(
      `
      SELECT *
      FROM attendance
      WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)
        AND date = ?
      ORDER BY created_at ASC, id ASC
    `
    )
    .all(userId, dateString);
}

function getLeaveForUserDate(userId, dateString) {
  return (
    db
      .prepare(
        `
        SELECT *
        FROM leave_requests
        WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)
          AND start_date <= ?
          AND end_date >= ?
          AND LOWER(COALESCE(status, '')) IN ('pending', 'approved')
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `
      )
      .get(userId, dateString, dateString) || null
  );
}

function getMinutesBetween(startTimestamp, endTimestamp) {
  const start = parseSqlTimestamp(startTimestamp);
  const end = parseSqlTimestamp(endTimestamp);

  if (!start || !end) return 0;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const diff = end.getTime() - start.getTime();

  if (diff <= 0) return 0;

  return Math.round(diff / 60000);
}

function getAttendanceMinutesFromRows(rows, includeRunning = false) {
  let totalMinutes = 0;
  let activeCheckIn = null;

  for (const row of rows) {
    if (row.type === "Check In") {
      activeCheckIn = row.created_at;
    }

    if (row.type === "Check Out" && activeCheckIn) {
      totalMinutes += getMinutesBetween(activeCheckIn, row.created_at);
      activeCheckIn = null;
    }
  }

  if (includeRunning && activeCheckIn) {
    const nowIST = getIndianTimestamp();
    totalMinutes += getMinutesBetween(activeCheckIn, nowIST);
  }

  return Math.max(totalMinutes, 0);
}

function formatAttendanceMinutes(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h 0m`;
  if (mins) return `${mins}m`;

  return "0m";
}

function getFirstCheckIn(rows) {
  return rows.find((row) => row.type === "Check In") || null;
}

function getLastCheckOut(rows) {
  return [...rows].reverse().find((row) => row.type === "Check Out") || null;
}

function getTimeLabel(timestamp) {
  if (!timestamp) return "--:--";

  const date = parseSqlTimestamp(timestamp);

  if (!date || Number.isNaN(date.getTime())) {
    return String(timestamp).slice(11, 16) || "--:--";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function buildAttendanceDay(userId, dateString) {
  const today = getTodayDate();
  const rows = getAttendanceRowsForUserDate(userId, dateString);
  const leave = getLeaveForUserDate(userId, dateString);
  const isFuture = dateString > today;
  const workingDate = isWorkingDate(dateString);

  const firstCheckIn = getFirstCheckIn(rows);
  const lastCheckOut = getLastCheckOut(rows);
  const hasOpenCheckIn = rows.length > 0 && rows[rows.length - 1]?.type === "Check In";

  const minutes = getAttendanceMinutesFromRows(
    rows,
    dateString === today && hasOpenCheckIn
  );

  let status = "empty";
  let label = "...";

  if (!workingDate || isFuture) {
    status = "empty";
    label = "...";
  } else if (leave && String(leave.status || "").toLowerCase() === "approved") {
    status = "leave";
    label = "Leave";
  } else if (leave && String(leave.status || "").toLowerCase() === "pending") {
    status = "pending";
    label = "Pending";
  } else if (firstCheckIn) {
    const checkInTime = String(firstCheckIn.created_at || "").slice(11, 16);

    if (checkInTime && checkInTime > "10:15") {
      status = "late";
    } else {
      status = "present";
    }

    label = minutes ? formatAttendanceMinutes(minutes) : "Present";
  } else {
    status = "absent";
    label = "Absent";
  }

  return {
    date: dateString,
    day: new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
    }),
    displayDate: new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    status,
    label,
    minutes,
    checkIn: firstCheckIn ? getTimeLabel(firstCheckIn.created_at) : "--:--",
    checkOut: lastCheckOut ? getTimeLabel(lastCheckOut.created_at) : "--:--",
    rawCheckIn: firstCheckIn?.created_at || "",
    rawCheckOut: lastCheckOut?.created_at || "",
    records: rows.map(normalizeAttendanceRecord).filter(Boolean),
    leave: leave ? normalizeLeaveRequest(leave) : null,
  };
}

function buildEmployeeAttendanceDashboard(userId, referenceDate = getTodayDate()) {
  const today = getTodayDate();
  const selectedDate = String(referenceDate || today).slice(0, 10);

  const weekRange = getWeekRange(selectedDate);
  const monthRange = getMonthRange(selectedDate);

  const weekDays = getDatesBetween(weekRange.startDate, weekRange.endDate).map(
    (dateString) => buildAttendanceDay(userId, dateString)
  );

  const monthDates = getDatesBetween(monthRange.startDate, today).filter(
    (dateString) => dateString.startsWith(monthRange.startDate.slice(0, 7))
  );

  const monthDays = monthDates
    .filter((dateString) => isWorkingDate(dateString))
    .map((dateString) => buildAttendanceDay(userId, dateString));

  const present = monthDays.filter((day) =>
    ["present", "late"].includes(day.status)
  ).length;

  const late = monthDays.filter((day) => day.status === "late").length;
  const leave = monthDays.filter((day) => day.status === "leave").length;
  const pending = monthDays.filter((day) => day.status === "pending").length;
  const absent = monthDays.filter((day) => day.status === "absent").length;
  const workingDays = monthDays.length;

  const attendancePercent = workingDays
    ? Math.round(((present + leave) / workingDays) * 100)
    : 0;

  const selectedDay = buildAttendanceDay(userId, selectedDate);
  const currentDay = buildAttendanceDay(userId, today);

  return {
    selectedDate,
    today: currentDay,
    selectedDay,
    week: {
      startDate: weekRange.startDate,
      endDate: weekRange.endDate,
      days: weekDays,
    },
    month: {
      month: monthRange.startDate.slice(0, 7),
      workingDays,
      present,
      absent,
      late,
      leave,
      pending,
      attendancePercent,
      percentage: attendancePercent,
    },
  };
}

app.get("/api/attendance/me", authRequired, (req, res) => {
  try {
    ensureAutoCheckOut(req.user);

    const referenceDate = String(req.query.date || getTodayDate()).slice(0, 10);
    const dashboard = buildEmployeeAttendanceDashboard(req.user.id, referenceDate);

    const monthRange = getMonthRange(referenceDate);
    const records = db
      .prepare(
        `
        SELECT *
        FROM attendance
        WHERE CAST(user_id AS TEXT) = CAST(? AS TEXT)
          AND date >= ?
          AND date <= ?
        ORDER BY date DESC, created_at DESC, id DESC
      `
      )
      .all(req.user.id, monthRange.startDate, monthRange.endDate)
      .map(normalizeAttendanceRecord)
      .filter(Boolean);

    res.json({
      success: true,
      ...dashboard,
      records,
      attendance: records,
      currentStatus:
        dashboard.today.rawCheckIn && !dashboard.today.rawCheckOut
          ? "checkedIn"
          : "checkedOut",
      latestAttendance: getLatestAttendanceEvent(req.user.id) || null,
    });
  } catch (error) {
    console.error("Get my attendance error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load your attendance.",
    });
  }
});

app.get("/api/attendance/me/summary", authRequired, (req, res) => {
  try {
    ensureAutoCheckOut(req.user);

    const referenceDate = String(req.query.date || getTodayDate()).slice(0, 10);
    const dashboard = buildEmployeeAttendanceDashboard(req.user.id, referenceDate);

    res.json({
      success: true,
      ...dashboard,
    });
  } catch (error) {
    console.error("Get my attendance summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load your attendance summary.",
    });
  }
});

app.get("/api/attendance", authRequired, (req, res) => {
  ensureAutoCheckOut(req.user);

  let attendance;

  if (req.user.role === "superAdmin") {
    attendance = db.prepare("SELECT * FROM attendance ORDER BY id DESC").all();
  } else if (req.user.role === "admin") {
    attendance = db
      .prepare(
        `
        SELECT a.*
        FROM attendance a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE COALESCE(u.role, '') != 'superAdmin'
        ORDER BY a.id DESC
      `
      )
      .all();
  } else if (req.user.role === "manager") {
    attendance = db
      .prepare(
        `
        SELECT a.*
        FROM attendance a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.department = ?
          AND COALESCE(u.role, '') != 'superAdmin'
        ORDER BY a.id DESC
      `
      )
      .all(req.user.department);
  } else {
    attendance = db
      .prepare("SELECT * FROM attendance WHERE user_id = ? ORDER BY id DESC")
      .all(req.user.id);
  }

  const latest = getLatestAttendanceEvent(req.user.id);

  res.json({
    success: true,
    attendance: attendance.map(normalizeAttendanceRecord).filter(Boolean),
    currentStatus: latest?.type === "Check In" ? "checkedIn" : "checkedOut",
    latestAttendance: latest || null,
  });
});

app.post("/api/attendance", authRequired, (req, res) => {
  const { type } = req.body;

  if (!["Check In", "Check Out"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Attendance type must be Check In or Check Out.",
    });
  }

  const latest = getLatestAttendanceEvent(req.user.id);

  if (type === "Check In" && latest?.type === "Check In") {
    return res.json({
      success: true,
      message: "You are already checked in.",
      attendance: normalizeAttendanceRecord(latest),
      currentStatus: "checkedIn",
    });
  }

  if (type === "Check Out" && (!latest || latest.type === "Check Out")) {
    return res.json({
      success: true,
      message: "You are already checked out.",
      attendance: latest ? normalizeAttendanceRecord(latest) : null,
      currentStatus: "checkedOut",
    });
  }

  const attendance = addAttendanceEvent(req.user, type);

  res.json({
    success: true,
    attendance: normalizeAttendanceRecord(attendance),
    currentStatus: type === "Check In" ? "checkedIn" : "checkedOut",
  });
});

/* ---------------- LEAVE REQUESTS ---------------- */

function normalizeLeaveRequest(row) {
  if (!row) return null;

  const hasAttachment = Boolean(row.attachment_path);

  return {
    id: row.id,
    leaveId: row.id,

    userId: String(row.user_id || ""),
    userName: row.user_name || "",
    userEmail: row.user_email || "",
    department: row.department || "",

    leaveType: row.leave_type || "Leave",
    leave_type: row.leave_type || "Leave",

    emergencyContact: row.emergency_contact || "",
    emergency_contact: row.emergency_contact || "",

    startDate: row.start_date || "",
    start_date: row.start_date || "",
    fromDate: row.start_date || "",

    endDate: row.end_date || "",
    end_date: row.end_date || "",
    toDate: row.end_date || "",

    reason: row.reason || "",
    status: row.status || "pending",

    approvedBy: row.approved_by || "",
    approved_by: row.approved_by || "",

    adminComment: row.admin_comment || "",
    admin_comment: row.admin_comment || "",

    reviewedAt: row.reviewed_at || "",
    reviewed_at: row.reviewed_at || "",

    createdAt: row.created_at || "",
    created_at: row.created_at || "",

    updatedAt: row.updated_at || "",
    updated_at: row.updated_at || "",

    hasAttachment,
    attachmentFilename: row.attachment_filename || "",
    attachment_filename: row.attachment_filename || "",
    attachmentOriginalName: row.attachment_original_name || "",
    attachment_original_name: row.attachment_original_name || "",
    attachmentMimeType: row.attachment_mime_type || "",
    attachment_mime_type: row.attachment_mime_type || "",
    attachmentSize: Number(row.attachment_size || 0),
    attachment_size: Number(row.attachment_size || 0),
    attachmentUrl: hasAttachment ? `/api/leaves/${row.id}/attachment` : "",
  };
}

function canAccessLeaveRequest(user, leaveRequest) {
  if (!user || !leaveRequest) return false;

  if (user.role === "superAdmin") return true;

  if (user.role === "admin") {
    const leaveUser = db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(leaveRequest.user_id);

    return leaveUser?.role !== "superAdmin";
  }

  if (user.role === "manager") {
    return String(leaveRequest.department || "") === String(user.department || "");
  }

  return Number(leaveRequest.user_id) === Number(user.id);
}

function getLeaveRequestsForUser(user) {
  if (user.role === "superAdmin") {
    return db.prepare("SELECT * FROM leave_requests ORDER BY created_at DESC").all();
  }

  if (user.role === "admin") {
    return db
      .prepare(
        `
        SELECT lr.*
        FROM leave_requests lr
        LEFT JOIN users u ON u.id = lr.user_id
        WHERE COALESCE(u.role, '') != 'superAdmin'
        ORDER BY lr.created_at DESC
      `
      )
      .all();
  }

  if (user.role === "manager") {
    return db
      .prepare(
        `
        SELECT lr.*
        FROM leave_requests lr
        LEFT JOIN users u ON u.id = lr.user_id
        WHERE lr.department = ?
          AND COALESCE(u.role, '') != 'superAdmin'
        ORDER BY lr.created_at DESC
      `
      )
      .all(user.department);
  }

  return db
    .prepare(
      "SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(user.id);
}

function createLeaveRequestHandler(req, res) {
  try {
    const leaveType = String(
      req.body.leaveType || req.body.leave_type || req.body.type || "Leave"
    ).trim();

    const emergencyContact = String(
      req.body.emergencyContact || req.body.emergency_contact || ""
    ).trim();

    const startDate = String(
      req.body.startDate || req.body.start_date || req.body.fromDate || ""
    ).trim();

    const endDate = String(
      req.body.endDate || req.body.end_date || req.body.toDate || ""
    ).trim();

    const reason = String(
      req.body.reason || req.body.message || req.body.description || ""
    ).trim();

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required.",
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Leave reason is required.",
      });
    }

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date.",
      });
    }

    const nowIST = getIndianTimestamp();
    const file = req.file || null;

    const result = db
      .prepare(
        `
        INSERT INTO leave_requests (
          user_id,
          user_name,
          user_email,
          department,
          leave_type,
          emergency_contact,
          start_date,
          end_date,
          reason,
          status,
          approved_by,
          admin_comment,
          attachment_filename,
          attachment_original_name,
          attachment_path,
          attachment_mime_type,
          attachment_size,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        req.user.id,
        req.user.name,
        req.user.email,
        req.user.department,
        leaveType,
        emergencyContact,
        startDate,
        endDate,
        reason,
        "pending",
        null,
        "",
        file?.filename || "",
        file?.originalname || "",
        file?.path || "",
        file?.mimetype || "",
        file?.size || 0,
        nowIST,
        nowIST
      );

    const leaveRequest = db
      .prepare("SELECT * FROM leave_requests WHERE id = ?")
      .get(result.lastInsertRowid);

    try {
      recordEmployeeActivity({
        userId: req.user.id,
        role: req.user.role || "employee",
        department: req.user.department || "",
        actionType: "leave_requested",
        title: "Leave requested",
        message: `${leaveType} requested from ${startDate} to ${endDate}.`,
        entityType: "leave",
        entityId: leaveRequest.id,
        createdBy: req.user.id,
      });
    } catch {
      // Recent activity is optional.
    }

    res.json({
      success: true,
      leaveRequest: normalizeLeaveRequest(leaveRequest),
      leave: normalizeLeaveRequest(leaveRequest),
    });
  } catch (error) {
    console.error("Create leave request error:", error);

    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore cleanup failure
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit leave request.",
    });
  }
}

function reviewLeaveRequestHandler(req, res) {
  try {
    const id = req.params.id;
    const status = String(req.body.status || "").trim().toLowerCase();

    const adminComment = String(
      req.body.adminComment || req.body.admin_comment || ""
    ).trim();

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected.",
      });
    }

    if (status === "rejected" && !adminComment) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required.",
      });
    }

    const leaveRequest = db
      .prepare("SELECT * FROM leave_requests WHERE id = ?")
      .get(id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
    }

    if (!canAccessLeaveRequest(req.user, leaveRequest)) {
      return res.status(403).json({
        success: false,
        message: "You cannot review this leave request.",
      });
    }

    const nowIST = getIndianTimestamp();

    db.prepare(
      `
      UPDATE leave_requests
      SET status = ?,
          approved_by = ?,
          admin_comment = ?,
          reviewed_at = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(status, req.user.id, adminComment, nowIST, nowIST, id);

    const updated = db
      .prepare("SELECT * FROM leave_requests WHERE id = ?")
      .get(id);

    try {
      createNotification({
        title: status === "approved" ? "Leave approved" : "Leave rejected",
        message:
          status === "approved"
            ? "Your leave request was approved."
            : `Your leave request was rejected.${adminComment ? ` Reason: ${adminComment}` : ""}`,
        severity: status === "approved" ? "success" : "warning",
        targetType: "User",
        userId: updated.user_id,
        department: updated.department || "",
        entityType: "leave",
        entityId: updated.id,
        createdBy: req.user.id,
      });
    } catch {
      // Notification is optional.
    }

    res.json({
      success: true,
      leaveRequest: normalizeLeaveRequest(updated),
      leave: normalizeLeaveRequest(updated),
    });
  } catch (error) {
    console.error("Review leave request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update leave request.",
    });
  }
}

app.get("/api/leaves/me", authRequired, (req, res) => {
  try {
    const leaveRequests = db
      .prepare(
        "SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC"
      )
      .all(req.user.id)
      .map(normalizeLeaveRequest)
      .filter(Boolean);

    res.json({
      success: true,
      leaveRequests,
      leaves: leaveRequests,
    });
  } catch (error) {
    console.error("Get my leaves error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load your leave requests.",
    });
  }
});

app.get("/api/leaves", authRequired, (req, res) => {
  try {
    const leaveRequests = getLeaveRequestsForUser(req.user)
      .map(normalizeLeaveRequest)
      .filter(Boolean);

    res.json({
      success: true,
      leaveRequests,
      leaves: leaveRequests,
    });
  } catch (error) {
    console.error("Get leaves error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load leave requests.",
    });
  }
});

app.get("/api/leave-requests", authRequired, (req, res) => {
  try {
    const leaveRequests = getLeaveRequestsForUser(req.user)
      .map(normalizeLeaveRequest)
      .filter(Boolean);

    res.json({
      success: true,
      leaveRequests,
      leaves: leaveRequests,
    });
  } catch (error) {
    console.error("Get leave requests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load leave requests.",
    });
  }
});

app.post(
  "/api/leaves",
  authRequired,
  uploadLeaveAttachment,
  createLeaveRequestHandler
);

app.post(
  "/api/leave-requests",
  authRequired,
  uploadLeaveAttachment,
  createLeaveRequestHandler
);

app.get("/api/leaves/:id/attachment", authRequired, (req, res) => {
  try {
    const leaveRequest = db
      .prepare("SELECT * FROM leave_requests WHERE id = ?")
      .get(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
    }

    if (!canAccessLeaveRequest(req.user, leaveRequest)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this attachment.",
      });
    }

    if (!leaveRequest.attachment_path) {
      return res.status(404).json({
        success: false,
        message: "No attachment found for this leave request.",
      });
    }

    if (!fs.existsSync(leaveRequest.attachment_path)) {
      return res.status(404).json({
        success: false,
        message: "Attachment file is missing from server.",
      });
    }

    res.download(
      leaveRequest.attachment_path,
      leaveRequest.attachment_original_name ||
        leaveRequest.attachment_filename ||
        "leave-attachment"
    );
  } catch (error) {
    console.error("Download leave attachment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to download attachment.",
    });
  }
});

app.patch("/api/leaves/:id/review", authRequired, requireAdmin, reviewLeaveRequestHandler);
app.patch("/api/leaves/:id", authRequired, requireAdmin, reviewLeaveRequestHandler);
app.patch("/api/leave-requests/:id/review", authRequired, requireAdmin, reviewLeaveRequestHandler);
app.patch("/api/leave-requests/:id", authRequired, requireAdmin, reviewLeaveRequestHandler);

/* ---------------- PROJECT TIME ENTRIES ---------------- */

app.get("/api/time-entries/me", authRequired, (req, res) => {
  try {
    const today = getTodayDate();
    const startDate = String(req.query.startDate || today).trim();
    const endDate = String(req.query.endDate || today).trim();

    const entries = db
      .prepare(
        `
        SELECT *
        FROM project_time_entries
        WHERE user_id = ?
          AND work_date >= ?
          AND work_date <= ?
        ORDER BY work_date DESC, id DESC
      `
      )
      .all(req.user.id, startDate, endDate)
      .map(normalizeProjectTimeEntry)
      .filter(Boolean);

    res.json({
      success: true,
      total: entries.length,
      entries,
    });
  } catch (error) {
    console.error("Get my time entries error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load your project hours.",
    });
  }
});

app.post("/api/time-entries", authRequired, (req, res) => {
  try {
    if (req.user.role === "admin" || req.user.role === "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts do not submit employee project hours.",
      });
    }

    const projectId = req.body.projectId || req.body.project_id;
    const taskId = req.body.taskId || req.body.task_id || null;
    const workDate = String(req.body.workDate || req.body.work_date || "").trim();
    const hours = Number(req.body.hours || 0);
    const minutes = Number(req.body.minutes || 0);
    const totalMinutes = Math.round(hours * 60 + minutes);
    const description = String(req.body.description || "").trim();

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project is required.",
      });
    }

    if (!workDate) {
      return res.status(400).json({
        success: false,
        message: "Work date is required.",
      });
    }

    if (!totalMinutes || totalMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter project time greater than 0 minutes.",
      });
    }

    if (totalMinutes > 720) {
      return res.status(400).json({
        success: false,
        message: "Single time entry cannot exceed 12 hours.",
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Work description is required.",
      });
    }

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    let task = null;

    if (taskId) {
      task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found.",
        });
      }

      if (Number(task.assigned_to) !== Number(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "You can log time only for your assigned task.",
        });
      }
    }

    const nowIST = getIndianTimestamp();

    const result = db
      .prepare(
        `
        INSERT INTO project_time_entries (
          user_id,
          user_name,
          user_email,
          department,
          project_id,
          project_name,
          task_id,
          task_title,
          work_date,
          minutes,
          description,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        req.user.id,
        req.user.name,
        req.user.email,
        req.user.department,
        project.id,
        project.name || "Project",
        task?.id || null,
        task?.title || "",
        workDate,
        totalMinutes,
        description,
        "submitted",
        nowIST,
        nowIST
      );

    const entry = db
      .prepare("SELECT * FROM project_time_entries WHERE id = ?")
      .get(result.lastInsertRowid);

    res.json({
      success: true,
      entry: normalizeProjectTimeEntry(entry),
    });
  } catch (error) {
    console.error("Create time entry error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save project hours.",
    });
  }
});

app.delete("/api/time-entries/:id", authRequired, (req, res) => {
  try {
    const entry = db
      .prepare("SELECT * FROM project_time_entries WHERE id = ?")
      .get(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Time entry not found.",
      });
    }

    if (
      req.user.role === "employee" &&
      Number(entry.user_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete another user's time entry.",
      });
    }

    db.prepare("DELETE FROM project_time_entries WHERE id = ?").run(req.params.id);

    res.json({
      success: true,
      deleted: true,
      entry: normalizeProjectTimeEntry(entry),
    });
  } catch (error) {
    console.error("Delete time entry error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete project hours.",
    });
  }
});

app.get("/api/admin/project-hours-summary", authRequired, requireAdmin, (req, res) => {
  try {
    const today = getTodayDate();
    const startDate = String(req.query.startDate || today).trim();
    const endDate = String(req.query.endDate || today).trim();

    const summary = buildProjectHoursSummary({
      startDate,
      endDate,
      requester: req.user,
    });

    res.json({
      success: true,
      expectedWorkingMinutes: EXPECTED_WORKING_MINUTES,
      expectedWorkingHours: 8.5,
      startDate,
      endDate,
      total: summary.length,
      summary,
    });
  } catch (error) {
    console.error("Project hours summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load project hour summary.",
    });
  }
});

app.get("/api/admin/project-hours/:userId", authRequired, requireAdmin, (req, res) => {
  try {
    const today = getTodayDate();
    const startDate = String(req.query.startDate || today).trim();
    const endDate = String(req.query.endDate || today).trim();

    const targetUser = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(req.params.userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (req.user.role === "admin" && targetUser.role === "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot view Super Admin project hours.",
      });
    }

    const entries = db
      .prepare(
        `
        SELECT *
        FROM project_time_entries
        WHERE user_id = ?
          AND work_date >= ?
          AND work_date <= ?
        ORDER BY work_date DESC, id DESC
      `
      )
      .all(req.params.userId, startDate, endDate)
      .map(normalizeProjectTimeEntry)
      .filter(Boolean);

    res.json({
      success: true,
      employee: normalizeUser(targetUser),
      total: entries.length,
      entries,
    });
  } catch (error) {
    console.error("Employee project hours detail error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load employee project hours.",
    });
  }
});

app.patch("/api/admin/time-entries/:id/review", authRequired, requireAdmin, (req, res) => {
  try {
    const status = String(req.body.status || "").trim();

    if (!["approved", "needs_review", "rejected", "submitted"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review status.",
      });
    }

    const entry = db
      .prepare("SELECT * FROM project_time_entries WHERE id = ?")
      .get(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Time entry not found.",
      });
    }

    const entryUser = db.prepare("SELECT * FROM users WHERE id = ?").get(entry.user_id);

    if (req.user.role === "admin" && entryUser?.role === "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot review Super Admin project hours.",
      });
    }

    const nowIST = getIndianTimestamp();

    db.prepare(
      `
      UPDATE project_time_entries
      SET status = ?,
          reviewed_by = ?,
          reviewed_at = ?,
          review_comment = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(
      status,
      req.user.id,
      nowIST,
      String(req.body.reviewComment || req.body.review_comment || ""),
      nowIST,
      req.params.id
    );

    const updated = db
      .prepare("SELECT * FROM project_time_entries WHERE id = ?")
      .get(req.params.id);

    res.json({
      success: true,
      entry: normalizeProjectTimeEntry(updated),
    });
  } catch (error) {
    console.error("Review time entry error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to review project hours.",
    });
  }
});

/* ---------------- NOTIFICATIONS ---------------- */

app.get("/api/notifications", authRequired, (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const notifications = getNotificationsForUser(req.user, limit);

    const unreadCount = notifications.filter((item) => !item.isRead).length;

    res.json({
      success: true,
      total: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load notifications.",
    });
  }
});

app.post("/api/notifications", authRequired, requireAdmin, (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const message = String(req.body.message || "").trim();
    const severity = String(req.body.severity || "standard").trim();
    const targetType = String(
      req.body.target_type || req.body.targetType || "General"
    ).trim();
    const department = String(req.body.department || "").trim();
    const role = String(req.body.role || "").trim();
    const userId = req.body.user_id || req.body.userId || null;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Notification title is required.",
      });
    }

    const notification = createNotification({
      title,
      message,
      severity,
      targetType,
      role,
      department,
      userId,
      entityType: req.body.entity_type || req.body.entityType || "",
      entityId: req.body.entity_id || req.body.entityId || null,
      createdBy: req.user.id,
    });

    if (userId) {
      recordEmployeeActivity({
        userId,
        role: "employee",
        department,
        actionType: "admin_message",
        title,
        message,
        entityType: "notification",
        entityId: notification?.id || null,
        createdBy: req.user.id,
      });
    } else {
      recordEmployeeActivity({
        role,
        department,
        actionType: "announcement",
        title,
        message,
        entityType: "notification",
        entityId: notification?.id || null,
        createdBy: req.user.id,
      });
    }

    res.json({
      success: true,
      notification: normalizeNotification(notification),
    });
  } catch (error) {
    console.error("Create notification error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create notification.",
    });
  }
});

app.post("/api/notifications/:id/read", authRequired, (req, res) => {
  try {
    const notification = db
      .prepare("SELECT * FROM notifications WHERE id = ?")
      .get(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    const readAt = markNotificationRead(req.params.id, req.user.id);

    res.json({
      success: true,
      readAt,
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
});

app.post("/api/notifications/mark-all-read", authRequired, (req, res) => {
  try {
    const notifications = getNotificationsForUser(req.user, 500);
    const nowIST = getIndianTimestamp();

    for (const notification of notifications) {
      db.prepare(
        `
        INSERT INTO notification_reads (
          notification_id,
          user_id,
          read_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(notification_id, user_id)
        DO UPDATE SET read_at = excluded.read_at
      `
      ).run(notification.id, req.user.id, nowIST);
    }

    res.json({
      success: true,
      marked: notifications.length,
      readAt: nowIST,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read.",
    });
  }
});

app.get("/api/recent-activity", authRequired, (req, res) => {
  try {
    const limit = Number(req.query.limit || 30);

    let activity = [];

    if (req.user.role === "employee") {
      activity = getRecentActivityForUser(req.user, limit);
    } else if (req.user.role === "manager") {
      activity = db
        .prepare(
          `
          SELECT *
          FROM recent_activity
          WHERE LOWER(COALESCE(department, '')) = LOWER(?)
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `
        )
        .all(req.user.department, limit)
        .map(normalizeRecentActivity)
        .filter(Boolean);
    } else {
      activity = db
        .prepare(
          `
          SELECT *
          FROM recent_activity
          ORDER BY created_at DESC, id DESC
          LIMIT ?
        `
        )
        .all(limit)
        .map(normalizeRecentActivity)
        .filter(Boolean);
    }

    res.json({
      success: true,
      total: activity.length,
      activity,
      recentActivity: activity,
    });
  } catch (error) {
    console.error("Get recent activity error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load recent activity.",
    });
  }
});

app.get("/api/employee/overview", authRequired, (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "Employee overview is only available to employees.",
      });
    }

    ensureAutoCheckOut(req.user);

    const projects = buildEmployeeProjectCards(req.user);
    const activeProjects = projects.filter(
      (project) =>
        String(project.status || "active").toLowerCase() !== "deleted" &&
        Number(project.progress || 0) < 100
    );

    const progress = buildEmployeeProgress(req.user.id);
    const attendanceSummary = getEmployeeAttendanceSummary(req.user.id);
    const notifications = getNotificationsForUser(req.user, 8);
    const recentActivity = getRecentActivityForUser(req.user, 12);

    res.json({
      success: true,
      user: normalizeUser(req.user),
      projects,
      activeProjects,
      tasks: progress.tasks,
      progress,
      overallProgress: progress.progress,
      attendanceSummary,
      attendance: attendanceSummary,
      notifications,
      unreadNotifications: notifications.filter((item) => !item.isRead).length,
      recentActivity,
    });
  } catch (error) {
    console.error("Employee overview error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load employee overview.",
    });
  }
});

app.get("/api/search", authRequired, (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();

    if (!q) {
      return res.json({
        success: true,
        query: "",
        results: {
          users: [],
          projects: [],
          tasks: [],
          activity: [],
        },
      });
    }

    const like = `%${q}%`;

    let users = [];
    let projects = [];
    let tasks = [];
    let activity = [];

    if (req.user.role === "employee") {
      projects = buildEmployeeProjectCards(req.user).filter((project) => {
        const haystack = [
          project.name,
          project.description,
          project.department,
          project.status,
          project.priority,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });

      tasks = getAssignedTasksForEmployee(req.user.id).filter((task) => {
        const haystack = [
          task.title,
          task.description,
          task.status,
          task.priority,
          task.project_name,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });

      activity = getRecentActivityForUser(req.user, 50).filter((item) => {
        const haystack = [item.title, item.message, item.actionType]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    } else {
      if (req.user.role === "superAdmin") {
        users = db
          .prepare(
            `
            SELECT *
            FROM users
            WHERE LOWER(COALESCE(name, '')) LIKE ?
               OR LOWER(COALESCE(email, '')) LIKE ?
               OR LOWER(COALESCE(department, '')) LIKE ?
               OR LOWER(COALESCE(role, '')) LIKE ?
            ORDER BY name ASC
            LIMIT 50
          `
          )
          .all(like, like, like, like)
          .map(normalizeUser);
      } else {
        users = db
          .prepare(
            `
            SELECT *
            FROM users
            WHERE role != 'superAdmin'
              AND (
                LOWER(COALESCE(name, '')) LIKE ?
                OR LOWER(COALESCE(email, '')) LIKE ?
                OR LOWER(COALESCE(department, '')) LIKE ?
                OR LOWER(COALESCE(role, '')) LIKE ?
              )
            ORDER BY name ASC
            LIMIT 50
          `
          )
          .all(like, like, like, like)
          .map(normalizeUser);
      }

      projects = db
        .prepare(
          `
          SELECT *
          FROM projects
          WHERE COALESCE(status, 'active') != 'deleted'
            AND (
              LOWER(COALESCE(name, '')) LIKE ?
              OR LOWER(COALESCE(description, '')) LIKE ?
              OR LOWER(COALESCE(department, '')) LIKE ?
              OR LOWER(COALESCE(status, '')) LIKE ?
            )
          ORDER BY created_at DESC
          LIMIT 50
        `
        )
        .all(like, like, like, like)
        .map(normalizeProject);

      tasks = db
        .prepare(
          `
          SELECT *
          FROM tasks
          WHERE LOWER(COALESCE(title, '')) LIKE ?
             OR LOWER(COALESCE(description, '')) LIKE ?
             OR LOWER(COALESCE(status, '')) LIKE ?
             OR LOWER(COALESCE(priority, '')) LIKE ?
          ORDER BY created_at DESC
          LIMIT 50
        `
        )
        .all(like, like, like, like);
    }

    res.json({
      success: true,
      query: q,
      results: {
        users,
        projects,
        tasks,
        activity,
      },
    });
  } catch (error) {
    console.error("Search error:", error);

    res.status(500).json({
      success: false,
      message: "Search failed.",
    });
  }
});


/* ---------------- PROJECT CHAT ---------------- */

app.get("/api/project-chats/:projectId", authRequired, (req, res) => {
  const messages = db
    .prepare(
      `
      SELECT *
      FROM project_chats
      WHERE project_id = ?
      ORDER BY created_at ASC
    `
    )
    .all(req.params.projectId);

  res.json({
    success: true,
    messages,
  });
});

app.post("/api/project-chats", authRequired, (req, res) => {
  const { project_id, message } = req.body;

  if (!project_id || !message) {
    return res.status(400).json({
      success: false,
      message: "project_id and message are required.",
    });
  }

  const nowIST = getIndianTimestamp();

  const result = db
    .prepare(
      `
      INSERT INTO project_chats (
        project_id,
        user_id,
        user_name,
        message,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .run(project_id, req.user.id, req.user.name, message, nowIST);

  const chat = db
    .prepare("SELECT * FROM project_chats WHERE id = ?")
    .get(result.lastInsertRowid);

  res.json({
    success: true,
    chat,
  });
});

/* ---------------- ACTIVITY LOGS ---------------- */

app.get("/api/activity-logs", authRequired, (req, res) => {
  if (req.user.role !== "superAdmin") {
    return res.status(403).json({
      success: false,
      message: "Only Super Admin can view activity logs.",
    });
  }

  const logs = db
    .prepare("SELECT * FROM activity_logs ORDER BY created_at DESC")
    .all();

  res.json({
    success: true,
    logs,
  });
});

/* ---------------- ACCOUNT ADMINISTRATOR ---------------- */

app.use(
  "/api/account-administrator",
  createAccountAdministratorRoutes({
    db,
    authenticateToken: authRequired,
  })
);

/* ---------------- EMPLOYEE MY PROJECTS - FINAL PERMANENT ROUTE ---------------- */

function employeeProjectsClean(value) {
  return String(value || "").trim().toLowerCase();
}

function employeeProjectsParseMembers(value) {
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

function employeeProjectsGetUserFromDb(reqUser) {
  if (!reqUser?.id) return reqUser;

  const user = db
    .prepare(
      `
      SELECT id, name, email, role, department
      FROM users
      WHERE id = ?
      LIMIT 1
    `
    )
    .get(reqUser.id);

  return user || reqUser;
}

function employeeProjectsNormalizeProject(row) {
  const members = employeeProjectsParseMembers(row.members);

  return {
    ...row,

    id: row.id,
    name: row.name || "",
    title: row.name || "",
    projectName: row.name || "",

    description: row.description || "",

    department: row.department || "",
    division: row.department || "",
    departmentName: row.department || "",

    status: row.status || "active",
    priority: row.priority || "medium",
    progress: Number(row.progress || 0),

    managerId: row.manager_id || "",
    manager_id: row.manager_id || "",

    startDate: row.start_date || "",
    start_date: row.start_date || "",

    endDate: row.end_date || "",
    end_date: row.end_date || "",
    deadline: row.end_date || "",

    members,
    member: members,
    assignedMembers: members,
    assigned_members: members,
    assignedUsers: members,
    assigned_users: members,
    assignedEmployees: members,
    assigned_employees: members,
    users: members,
    employees: members,

    createdBy: row.created_by || "",
    created_by: row.created_by || "",
    createdAt: row.created_at || "",
    created_at: row.created_at || "",
    updatedAt: row.updated_at || "",
    updated_at: row.updated_at || "",
  };
}

app.get("/api/my-projects", authRequired, (req, res) => {
  try {
    const user = employeeProjectsGetUserFromDb(req.user);

    const userId = String(user?.id || "").trim();
    const userEmail = employeeProjectsClean(user?.email);
    const userName = employeeProjectsClean(user?.name);

    const allProjects = db
      .prepare(
        `
        SELECT *
        FROM projects
        WHERE COALESCE(status, 'active') != 'deleted'
        ORDER BY created_at DESC
      `
      )
      .all();

    const assignedProjects = allProjects.filter((project) => {
      const projectText = employeeProjectsClean(JSON.stringify(project || {}));
      const membersText = employeeProjectsClean(project.members || "");

      const emailMatch =
        userEmail &&
        (projectText.includes(userEmail) || membersText.includes(userEmail));

      const nameMatch =
        userName &&
        (projectText.includes(userName) || membersText.includes(userName));

      const idMatch =
        userId &&
        (
          projectText.includes(`"id":"${userId}"`) ||
          projectText.includes(`"id":${userId}`) ||
          projectText.includes(`"uid":"${userId}"`) ||
          projectText.includes(`"uid":${userId}`) ||
          projectText.includes(`"userid":"${userId}"`) ||
          projectText.includes(`"userid":${userId}`) ||
          projectText.includes(`"user_id":"${userId}"`) ||
          projectText.includes(`"user_id":${userId}`) ||
          projectText.includes(`"employeeid":"${userId}"`) ||
          projectText.includes(`"employeeid":${userId}`) ||
          projectText.includes(`"employee_id":"${userId}"`) ||
          projectText.includes(`"employee_id":${userId}`) ||
          membersText.includes(`"${userId}"`)
        );

      if (emailMatch || nameMatch || idMatch) {
        return true;
      }

      const taskMatch = db
        .prepare(
          `
          SELECT id
          FROM tasks
          WHERE project_id = ?
            AND CAST(assigned_to AS TEXT) = CAST(? AS TEXT)
          LIMIT 1
        `
        )
        .get(project.id, userId);

      return Boolean(taskMatch);
    });

    console.log("MY PROJECTS FINAL ROUTE:", {
      userId,
      userEmail,
      userName,
      returned: assignedProjects.map((project) => project.name),
    });

    res.json({
      success: true,
      projects: assignedProjects.map(employeeProjectsNormalizeProject),
    });
  } catch (error) {
    console.error("My projects final route error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load assigned projects.",
    });
  }
});

/* ---------------- EMPLOYEE ASSIGNED PROJECTS ---------------- */

app.get("/api/employee-assigned-projects", authRequired, (req, res) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "This route is only for employee assigned projects.",
      });
    }

    const projects = buildEmployeeProjectCards(req.user);

    res.json({
      success: true,
      total: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Employee assigned projects error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load employee assigned projects.",
    });
  }
});

/* ---------------- EMPLOYEE PROJECT TASKS - FINAL FIX ---------------- */

function employeeTaskClean(value) {
  return String(value || "").trim().toLowerCase();
}

function employeeTaskGetUserKeys(user) {
  const fullName = employeeTaskClean(user?.name);
  const firstName = fullName.split(" ")[0] || "";

  return [
    user?.id,
    user?._id,
    user?.uid,
    user?.userId,
    user?.user_id,
    user?.employeeId,
    user?.employee_id,
    user?.email,
    user?.name,
    firstName,
  ]
    .filter(Boolean)
    .map(employeeTaskClean);
}

function employeeTaskBelongsToProject(task, projectId) {
  const possibleProjectIds = [
    task.project_id,
    task.projectId,
    task.projectID,
    task.parent_project_id,
    task.parentProjectId,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim());

  return possibleProjectIds.includes(String(projectId).trim());
}

function employeeTaskMatchesUser(task, userKeys) {
  const taskText = employeeTaskClean(JSON.stringify(task || {}));

  const assignedValues = [
    task.assigned_to,
    task.assignedTo,
    task.assigned_to_id,
    task.assignedToId,
    task.assignee,
    task.assignee_id,
    task.assigneeId,
    task.employee_id,
    task.employeeId,
    task.user_id,
    task.userId,
    task.assigned_user,
    task.assignedUser,
    task.assigned_employee,
    task.assignedEmployee,
  ]
    .filter(Boolean)
    .map(employeeTaskClean);

  return userKeys.some((key) => {
    if (!key) return false;

    return assignedValues.includes(key) || taskText.includes(key);
  });
}

function employeeTaskNormalize(task) {
  const title =
    task.title ||
    task.name ||
    task.task ||
    task.task_name ||
    task.description ||
    "Untitled Task";

  return {
    ...task,

    id: task.id,
    title,
    name: title,

    description: task.description || task.details || "",

    projectId: task.project_id || task.projectId || task.projectID,
    project_id: task.project_id || task.projectId || task.projectID,

    status: task.status || task.task_status || "Pending",
    priority: task.priority || task.task_priority || "Medium",

    startDate: task.start_date || task.startDate || task.created_at || "",
    start_date: task.start_date || task.startDate || task.created_at || "",

    endDate:
      task.end_date ||
      task.endDate ||
      task.due_date ||
      task.dueDate ||
      task.deadline ||
      "",
    end_date:
      task.end_date ||
      task.endDate ||
      task.due_date ||
      task.dueDate ||
      task.deadline ||
      "",

    assignedTo: task.assigned_to || task.assignedTo || task.assignee || "",
    assigned_to: task.assigned_to || task.assignedTo || task.assignee || "",
  };
}

app.get("/api/employee-project-tasks/:projectId", authRequired, (req, res) => {
  try {
    const projectId = String(req.params.projectId || "").trim();

    const user =
      db
        .prepare(
          `
          SELECT id, name, email, role, department
          FROM users
          WHERE id = ?
          LIMIT 1
          `
        )
        .get(req.user.id) || req.user;

    const userKeys = employeeTaskGetUserKeys(user);

    const tables = db
      .prepare(
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('tasks', 'project_tasks')
        `
      )
      .all();

    let allTasks = [];

    for (const table of tables) {
      const rows = db.prepare(`SELECT * FROM ${table.name}`).all();

      allTasks = [
        ...allTasks,
        ...rows.map((row) => ({
          ...row,
          __taskTable: table.name,
        })),
      ];
    }

    const assignedTasks = allTasks.filter((task) => {
      return (
        employeeTaskBelongsToProject(task, projectId) &&
        employeeTaskMatchesUser(task, userKeys)
      );
    });

    console.log("EMPLOYEE PROJECT TASKS FINAL:", {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      projectId,
      returned: assignedTasks.map(
        (task) => task.title || task.name || task.task || task.description
      ),
    });

    res.json({
      success: true,
      tasks: assignedTasks.map(employeeTaskNormalize),
    });
  } catch (error) {
    console.error("Employee project tasks final error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load employee assigned tasks.",
    });
  }
});

/* ---------------- CHAT / MESSAGING ---------------- */

const CHAT_UPLOAD_DIR = path.join(__dirname, "uploads", "chat-attachments");

fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });

const ALLOWED_CHAT_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const chatAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CHAT_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = String(file.originalname || "attachment")
      .replace(/[^\w.\-() ]+/g, "_")
      .replace(/\s+/g, "_");

    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  },
});

const chatUpload = multer({
  storage: chatAttachmentStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_CHAT_ATTACHMENT_TYPES.has(file.mimetype)) {
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

function uploadChatAttachment(req, res, next) {
  chatUpload.single("attachment")(req, res, (error) => {
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

db.prepare(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    message_text TEXT DEFAULT '',
    attachment_filename TEXT DEFAULT '',
    attachment_original_name TEXT DEFAULT '',
    attachment_path TEXT DEFAULT '',
    attachment_mime_type TEXT DEFAULT '',
    attachment_size INTEGER DEFAULT 0,
    is_read INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT
  )
`).run();

function ensureChatColumn(table, column, definition) {
  try {
    const columns = db
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((item) => item.name);

    if (!columns.includes(column)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  } catch (error) {
    console.warn(`Could not ensure ${table}.${column}:`, error.message);
  }
}

ensureChatColumn("chat_messages", "sender_id", "INTEGER");
ensureChatColumn("chat_messages", "receiver_id", "INTEGER");
ensureChatColumn("chat_messages", "message_text", "TEXT DEFAULT ''");
ensureChatColumn("chat_messages", "attachment_filename", "TEXT DEFAULT ''");
ensureChatColumn("chat_messages", "attachment_original_name", "TEXT DEFAULT ''");
ensureChatColumn("chat_messages", "attachment_path", "TEXT DEFAULT ''");
ensureChatColumn("chat_messages", "attachment_mime_type", "TEXT DEFAULT ''");
ensureChatColumn("chat_messages", "attachment_size", "INTEGER DEFAULT 0");
ensureChatColumn("chat_messages", "is_read", "INTEGER DEFAULT 0");
ensureChatColumn("chat_messages", "created_at", "TEXT");
ensureChatColumn("chat_messages", "updated_at", "TEXT");

function getChatTimestamp() {
  if (typeof getIndianTimestamp === "function") {
    return getIndianTimestamp();
  }

  return new Date().toISOString();
}

function normalizeChatText(value) {
  return String(value || "").trim().toLowerCase();
}

function getDepartmentsMapForChat() {
  const map = new Map();

  try {
    const departments = db.prepare("SELECT * FROM departments").all();

    departments.forEach((department) => {
      const id = String(
        department.id ||
          department.department_id ||
          department.departmentId ||
          ""
      );

      const name =
        department.name ||
        department.title ||
        department.departmentName ||
        department.department_name ||
        department.division ||
        "";

      if (id) {
        map.set(id, name);
      }
    });
  } catch {
    // departments table may not exist
  }

  return map;
}

function getAllUsersWithDepartmentForChat() {
  const departmentsMap = getDepartmentsMapForChat();

  const users = db
    .prepare(
      `
      SELECT *
      FROM users
      WHERE COALESCE(status, 'active') != 'deleted'
      ORDER BY name COLLATE NOCASE ASC
    `
    )
    .all();

  return users.map((user) => {
    const departmentId = String(
      user.department_id ||
        user.departmentId ||
        user.division_id ||
        user.divisionId ||
        ""
    );

    const joinedDepartment = departmentId ? departmentsMap.get(departmentId) : "";

    return {
      ...user,
      chat_department:
        user.department ||
        user.departmentName ||
        user.department_name ||
        user.division ||
        user.divisionName ||
        user.division_name ||
        joinedDepartment ||
        "",
    };
  });
}

function isSoftwareChatUser(user) {
  const department = normalizeChatText(
    user.chat_department ||
      user.department ||
      user.departmentName ||
      user.department_name ||
      user.division ||
      user.divisionName ||
      user.division_name ||
      ""
  );

  return department.includes("software");
}

function normalizeChatUserForResponse(user) {
  if (!user) return null;

  return {
    id: String(user.id),
    userId: String(user.id),
    user_id: String(user.id),

    name: user.name || user.full_name || user.fullName || user.email || "User",
    email: user.email || "",

    role: user.role || "employee",
    designation: user.designation || user.position || "",

    department:
      user.chat_department ||
      user.department ||
      user.departmentName ||
      user.department_name ||
      user.division ||
      "",
  };
}

function getChatUserById(userId) {
  const user = db
    .prepare(
      `
      SELECT *
      FROM users
      WHERE CAST(id AS TEXT) = CAST(? AS TEXT)
      LIMIT 1
    `
    )
    .get(String(userId));

  if (!user) return null;

  const departmentsMap = getDepartmentsMapForChat();

  const departmentId = String(
    user.department_id ||
      user.departmentId ||
      user.division_id ||
      user.divisionId ||
      ""
  );

  const joinedDepartment = departmentId ? departmentsMap.get(departmentId) : "";

  return {
    ...user,
    chat_department:
      user.department ||
      user.departmentName ||
      user.department_name ||
      user.division ||
      joinedDepartment ||
      "",
  };
}

function normalizeChatMessageForResponse(message, currentUserId) {
  if (!message) return null;

  const sender = getChatUserById(message.sender_id);
  const receiver = getChatUserById(message.receiver_id);

  const hasAttachment = Boolean(message.attachment_path);

  return {
    ...message,

    id: String(message.id),
    messageId: String(message.id),
    message_id: String(message.id),

    senderId: String(message.sender_id),
    sender_id: String(message.sender_id),

    receiverId: String(message.receiver_id),
    receiver_id: String(message.receiver_id),

    text: message.message_text || "",
    messageText: message.message_text || "",
    message_text: message.message_text || "",

    mine: String(message.sender_id) === String(currentUserId),

    sender: sender ? normalizeChatUserForResponse(sender) : null,
    receiver: receiver ? normalizeChatUserForResponse(receiver) : null,

    senderName: sender?.name || "User",
    sender_name: sender?.name || "User",

    receiverName: receiver?.name || "User",
    receiver_name: receiver?.name || "User",

    hasAttachment,

    attachmentFilename: message.attachment_filename || "",
    attachment_filename: message.attachment_filename || "",

    attachmentOriginalName: message.attachment_original_name || "",
    attachment_original_name: message.attachment_original_name || "",

    attachmentMimeType: message.attachment_mime_type || "",
    attachment_mime_type: message.attachment_mime_type || "",

    attachmentSize: Number(message.attachment_size || 0),
    attachment_size: Number(message.attachment_size || 0),

    attachmentUrl: hasAttachment
      ? `/api/chat/messages/${message.id}/attachment`
      : "",

    isRead: Number(message.is_read || 0) === 1,
    is_read: Number(message.is_read || 0) === 1,

    createdAt: message.created_at || "",
    created_at: message.created_at || "",

    updatedAt: message.updated_at || "",
    updated_at: message.updated_at || "",
  };
}

function userCanAccessChatMessage(user, message) {
  if (!user || !message) return false;

  return (
    String(message.sender_id) === String(user.id) ||
    String(message.receiver_id) === String(user.id)
  );
}

function insertChatNotification({ receiverId, senderName, messageText, messageId, senderId }) {
  try {
    if (typeof createNotification === "function") {
      createNotification({
        title: `New message from ${senderName}`,
        message: messageText || "Sent you an attachment.",
        severity: "info",
        targetType: "User",
        userId: receiverId,
        department: "",
        entityType: "chat",
        entityId: messageId,
        createdBy: senderId || null,
      });
    }

    if (typeof recordEmployeeActivity === "function") {
      recordEmployeeActivity({
        userId: receiverId,
        role: "",
        department: "",
        actionType: "chat_message",
        title: `New message from ${senderName}`,
        message: messageText || "Sent you an attachment.",
        entityType: "chat",
        entityId: messageId,
        createdBy: senderId || null,
      });
    }
  } catch (error) {
    console.warn("Chat notification/activity skipped:", error.message);
  }
}

app.get("/api/chat/users", authRequired, (req, res) => {
  try {
    const users = getAllUsersWithDepartmentForChat()
      .filter((user) => String(user.id) !== String(req.user.id))
      .filter(isSoftwareChatUser)
      .map(normalizeChatUserForResponse)
      .filter(Boolean);

    console.log("CHAT USERS RETURNED:", {
      currentUser: req.user.email,
      count: users.length,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      })),
    });

    res.json({
      success: true,
      users,
      people: users,
    });
  } catch (error) {
    console.error("Get chat users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load chat users.",
    });
  }
});

app.get("/api/chat/conversations", authRequired, (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT *
        FROM chat_messages
        WHERE CAST(sender_id AS TEXT) = CAST(? AS TEXT)
           OR CAST(receiver_id AS TEXT) = CAST(? AS TEXT)
        ORDER BY created_at DESC, id DESC
      `
      )
      .all(req.user.id, req.user.id);

    const map = new Map();

    rows.forEach((message) => {
      const partnerId =
        String(message.sender_id) === String(req.user.id)
          ? String(message.receiver_id)
          : String(message.sender_id);

      if (!map.has(partnerId)) {
        const partner = getChatUserById(partnerId);

        if (partner && isSoftwareChatUser(partner)) {
          map.set(partnerId, {
            user: normalizeChatUserForResponse(partner),
            latestMessage: normalizeChatMessageForResponse(message, req.user.id),
          });
        }
      }
    });

    res.json({
      success: true,
      conversations: Array.from(map.values()),
    });
  } catch (error) {
    console.error("Get chat conversations error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load conversations.",
    });
  }
});

app.get("/api/chat/messages/:receiverId", authRequired, (req, res) => {
  try {
    const receiver = getChatUserById(req.params.receiverId);

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found.",
      });
    }

    if (!isSoftwareChatUser(receiver)) {
      return res.status(403).json({
        success: false,
        message: "Chat is only available for Software department users.",
      });
    }

    db.prepare(
      `
      UPDATE chat_messages
      SET is_read = 1
      WHERE CAST(sender_id AS TEXT) = CAST(? AS TEXT)
        AND CAST(receiver_id AS TEXT) = CAST(? AS TEXT)
    `
    ).run(receiver.id, req.user.id);

    const messages = db
      .prepare(
        `
        SELECT *
        FROM chat_messages
        WHERE (
          CAST(sender_id AS TEXT) = CAST(? AS TEXT)
          AND CAST(receiver_id AS TEXT) = CAST(? AS TEXT)
        )
        OR (
          CAST(sender_id AS TEXT) = CAST(? AS TEXT)
          AND CAST(receiver_id AS TEXT) = CAST(? AS TEXT)
        )
        ORDER BY created_at ASC, id ASC
      `
      )
      .all(req.user.id, receiver.id, receiver.id, req.user.id)
      .map((message) => normalizeChatMessageForResponse(message, req.user.id))
      .filter(Boolean);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get chat messages error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load messages.",
    });
  }
});

app.post(
  "/api/chat/messages",
  authRequired,
  uploadChatAttachment,
  (req, res) => {
    try {
      const body = req.body || {};

      const receiverId =
        body.receiverId ||
        body.receiver_id ||
        body.toUserId ||
        body.to_user_id ||
        "";

      const messageText = String(
        body.messageText || body.message_text || body.text || ""
      ).trim();

      if (!receiverId) {
        return res.status(400).json({
          success: false,
          message: "Receiver is required.",
        });
      }

      if (!messageText && !req.file) {
        return res.status(400).json({
          success: false,
          message: "Type a message or attach a file.",
        });
      }

      const receiver = getChatUserById(receiverId);

      if (!receiver) {
        return res.status(404).json({
          success: false,
          message: "Receiver not found.",
        });
      }

      if (!isSoftwareChatUser(receiver)) {
        return res.status(403).json({
          success: false,
          message: "Chat is only available for Software department users.",
        });
      }

      if (String(receiver.id) === String(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot send a message to yourself.",
        });
      }

      const now = getChatTimestamp();
      const file = req.file || null;

      const result = db
        .prepare(
          `
          INSERT INTO chat_messages (
            sender_id,
            receiver_id,
            message_text,
            attachment_filename,
            attachment_original_name,
            attachment_path,
            attachment_mime_type,
            attachment_size,
            is_read,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
        .run(
          req.user.id,
          receiver.id,
          messageText,
          file?.filename || "",
          file?.originalname || "",
          file?.path || "",
          file?.mimetype || "",
          file?.size || 0,
          0,
          now,
          now
        );

      const message = db
        .prepare("SELECT * FROM chat_messages WHERE id = ?")
        .get(result.lastInsertRowid);

      insertChatNotification({
        receiverId: receiver.id,
        senderName: req.user.name || req.user.email || "Someone",
        messageText,
        messageId: message.id,
        senderId: req.user.id,
      });

      res.json({
        success: true,
        message: normalizeChatMessageForResponse(message, req.user.id),
      });
    } catch (error) {
      console.error("Send chat message error:", error);

      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // ignore cleanup failure
        }
      }

      res.status(500).json({
        success: false,
        message: "Failed to send message.",
      });
    }
  }
);

app.get("/api/chat/messages/:messageId/attachment", authRequired, (req, res) => {
  try {
    const message = db
      .prepare("SELECT * FROM chat_messages WHERE id = ?")
      .get(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found.",
      });
    }

    if (!userCanAccessChatMessage(req.user, message)) {
      return res.status(403).json({
        success: false,
        message: "You cannot access this attachment.",
      });
    }

    if (!message.attachment_path) {
      return res.status(404).json({
        success: false,
        message: "No attachment found for this message.",
      });
    }

    if (!fs.existsSync(message.attachment_path)) {
      return res.status(404).json({
        success: false,
        message: "Attachment file is missing from server.",
      });
    }

    res.download(
      message.attachment_path,
      message.attachment_original_name ||
        message.attachment_filename ||
        "chat-attachment"
    );
  } catch (error) {
    console.error("Download chat attachment error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to download attachment.",
    });
  }
});

/* ---------------- CSV IMPORT - JAY MORE ONLY ---------------- */

app.post("/api/admin/import-users-csv", authRequired, async (req, res) => {
  try {
    const requesterEmail = String(req.user?.email || "")
      .trim()
      .toLowerCase();

    const requesterRole = String(req.user?.role || "")
      .trim()
      .toLowerCase();

    const isJayMore =
      requesterEmail === "jay.more@valencianutrition.com" &&
      requesterRole === "employee";

    if (!isJayMore) {
      return res.status(403).json({
        success: false,
        message: "Only Jay More is allowed to import CSV files.",
      });
    }

    const users = Array.isArray(req.body.users) ? req.body.users : [];

    if (!users.length) {
      return res.status(400).json({
        success: false,
        message: "No users received from CSV.",
      });
    }

    function normalizeCsvRole(value) {
      const role = String(value || "employee")
        .trim()
        .toLowerCase()
        .replaceAll(" ", "")
        .replaceAll("_", "")
        .replaceAll("-", "");

      if (role === "superadmin") return "superAdmin";
      if (role === "admin") return "admin";
      if (role === "manager") return "manager";
      if (role === "employee") return "employee";

      return "";
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const [index, csvUser] of users.entries()) {
      const rowNumber = index + 2;

      const name = String(csvUser.name || "").trim();
      const email = String(csvUser.email || "").trim().toLowerCase();
      const password = String(csvUser.password || "").trim();
      const role = normalizeCsvRole(csvUser.role);
      const department = String(csvUser.department || "").trim();
      const phone = String(csvUser.phone || "").trim();

      if (!name || !email || !password || !role) {
        skipped += 1;
        errors.push(`Row ${rowNumber}: Missing name, email, password, or role.`);
        continue;
      }

      if (!email.includes("@")) {
        skipped += 1;
        errors.push(`Row ${rowNumber}: Invalid email.`);
        continue;
      }

      if (phone && !/^\d{10}$/.test(phone)) {
        skipped += 1;
        errors.push(`Row ${rowNumber}: Phone number must be 10 digits.`);
        continue;
      }

      const nowIST = getIndianTimestamp();
      const passwordHash = await bcrypt.hash(password, 10);

      const existingUser = db
        .prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1")
        .get(email);

      if (existingUser) {
        db.prepare(
          `
          UPDATE users
          SET name = ?,
              phone = ?,
              password_hash = ?,
              role = ?,
              department = ?,
              designation = ?,
              status = ?,
              updated_at = ?
          WHERE id = ?
        `
        ).run(
          name,
          phone || existingUser.phone || "",
          passwordHash,
          role,
          department || existingUser.department || "Sales team",
          existingUser.designation || "Team Member",
          existingUser.status || "active",
          nowIST,
          existingUser.id
        );

        updated += 1;
      } else {
        db.prepare(
          `
          INSERT INTO users (
            name,
            email,
            phone,
            password_hash,
            role,
            department,
            designation,
            status,
            profile_image,
            office_location,
            created_at,
            updated_at,
            last_login_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          name,
          email,
          phone,
          passwordHash,
          role,
          department || "Sales team",
          "Team Member",
          "active",
          "",
          "Main Campus",
          nowIST,
          nowIST,
          ""
        );

        created += 1;
      }
    }

    return res.json({
      success: true,
      message: `CSV import complete. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`,
      created,
      updated,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("CSV import error:", error);

    return res.status(500).json({
      success: false,
      message: "CSV import failed.",
      error: error.message,
    });
  }
});

/* ---------------- JAY MORE SOFTWARE EMPLOYEE MANAGEMENT ---------------- */

function ensureJayUserColumn(column, definition) {
  try {
    const columns = db
      .prepare("PRAGMA table_info(users)")
      .all()
      .map((item) => item.name);

    if (!columns.includes(column)) {
      db.prepare(`ALTER TABLE users ADD COLUMN ${column} ${definition}`).run();
    }
  } catch (error) {
    console.warn(`Could not ensure users.${column}:`, error.message);
  }
}

ensureJayUserColumn("status", "TEXT DEFAULT 'active'");
ensureJayUserColumn("blocked_at", "TEXT");
ensureJayUserColumn("deleted_at", "TEXT");
ensureJayUserColumn("updated_at", "TEXT");

function getJayTimestamp() {
  if (typeof getIndianTimestamp === "function") {
    return getIndianTimestamp();
  }

  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function normalizeJayText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeJayRole(role) {
  return String(role || "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .toLowerCase();
}

function isJayMoreUser(user) {
  return (
    normalizeJayText(user?.email) === "jay.more@valencianutrition.com"
  );
}

function requireJayMore(req, res, next) {
  if (!req.user || !isJayMoreUser(req.user)) {
    return res.status(403).json({
      success: false,
      message: "Only Jay More can access this employee section.",
    });
  }

  next();
}

function getDepartmentNameMapForJay() {
  const map = new Map();

  try {
    const departments = db.prepare("SELECT * FROM departments").all();

    departments.forEach((department) => {
      const id = String(
        department.id ||
          department.department_id ||
          department.departmentId ||
          ""
      );

      const name =
        department.name ||
        department.title ||
        department.departmentName ||
        department.department_name ||
        department.division ||
        "";

      if (id) {
        map.set(id, name);
      }
    });
  } catch {
    // departments table may not exist
  }

  return map;
}

function getJayUserDepartment(user) {
  const departmentMap = getDepartmentNameMapForJay();

  const departmentId = String(
    user.department_id ||
      user.departmentId ||
      user.division_id ||
      user.divisionId ||
      ""
  );

  const joinedDepartment = departmentId ? departmentMap.get(departmentId) : "";

  return (
    user.department ||
    user.departmentName ||
    user.department_name ||
    user.division ||
    user.divisionName ||
    user.division_name ||
    joinedDepartment ||
    ""
  );
}

function isSoftwareDepartmentUser(user) {
  const department = normalizeJayText(getJayUserDepartment(user));

  return department.includes("software");
}

function normalizeJayEmployee(user) {
  const status = normalizeJayText(user.status || "active");
  const role = user.role || "employee";

  return {
    id: String(user.id),
    userId: String(user.id),
    name: user.name || user.full_name || user.fullName || user.email || "User",
    email: user.email || "",
    role,
    department: getJayUserDepartment(user),
    designation: user.designation || user.position || "",
    status: status === "deleted" ? "deleted" : status === "blocked" ? "blocked" : "active",
    isBlocked: status === "blocked",
    blockedAt: user.blocked_at || "",
    deletedAt: user.deleted_at || "",
    createdAt: user.created_at || user.createdAt || "",
    updatedAt: user.updated_at || user.updatedAt || "",
  };
}

app.get(
  "/api/jay-more/software-employees",
  authRequired,
  requireJayMore,
  (req, res) => {
    try {
      const users = db
        .prepare(
          `
          SELECT *
          FROM users
          WHERE COALESCE(status, 'active') != 'deleted'
          ORDER BY name COLLATE NOCASE ASC
        `
        )
        .all()
        .filter((user) => String(user.id) !== String(req.user.id))
        .filter(isSoftwareDepartmentUser)
        .map(normalizeJayEmployee);

      res.json({
        success: true,
        employees: users,
        users,
      });
    } catch (error) {
      console.error("Jay software employees error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to load software employees.",
      });
    }
  }
);

app.post(
  "/api/jay-more/software-employees/:userId/block",
  authRequired,
  requireJayMore,
  (req, res) => {
    try {
      const user = db
        .prepare("SELECT * FROM users WHERE CAST(id AS TEXT) = CAST(? AS TEXT)")
        .get(String(req.params.userId));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      if (!isSoftwareDepartmentUser(user)) {
        return res.status(403).json({
          success: false,
          message: "Only Software department users can be managed here.",
        });
      }

      if (String(user.id) === String(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot block yourself.",
        });
      }

      const nextStatus =
        normalizeJayText(user.status) === "blocked" ? "active" : "blocked";

      db.prepare(
        `
        UPDATE users
        SET status = ?,
            blocked_at = ?,
            updated_at = ?
        WHERE id = ?
      `
      ).run(
        nextStatus,
        nextStatus === "blocked" ? getJayTimestamp() : "",
        getJayTimestamp(),
        user.id
      );

      const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);

      res.json({
        success: true,
        message:
          nextStatus === "blocked"
            ? "Employee blocked successfully."
            : "Employee unblocked successfully.",
        employee: normalizeJayEmployee(updated),
      });
    } catch (error) {
      console.error("Jay block employee error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update employee status.",
      });
    }
  }
);

app.post(
  "/api/jay-more/software-employees/:userId/reset-password",
  authRequired,
  requireJayMore,
  async (req, res) => {
    try {
      const password = String(req.body?.password || "").trim();

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters.",
        });
      }

      const user = db
        .prepare("SELECT * FROM users WHERE CAST(id AS TEXT) = CAST(? AS TEXT)")
        .get(String(req.params.userId));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      if (!isSoftwareDepartmentUser(user)) {
        return res.status(403).json({
          success: false,
          message: "Only Software department users can be managed here.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const userColumns = db
        .prepare("PRAGMA table_info(users)")
        .all()
        .map((column) => column.name);

      if (userColumns.includes("password_hash")) {
        db.prepare(
          `
          UPDATE users
          SET password_hash = ?,
              updated_at = ?
          WHERE id = ?
        `
        ).run(passwordHash, getJayTimestamp(), user.id);
      } else if (userColumns.includes("password")) {
        db.prepare(
          `
          UPDATE users
          SET password = ?,
              updated_at = ?
          WHERE id = ?
        `
        ).run(passwordHash, getJayTimestamp(), user.id);
      } else {
        return res.status(500).json({
          success: false,
          message: "No password column found in users table.",
        });
      }

      res.json({
        success: true,
        message: "Password reset successfully.",
      });
    } catch (error) {
      console.error("Jay reset password error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to reset password.",
      });
    }
  }
);

app.delete(
  "/api/jay-more/software-employees/:userId",
  authRequired,
  requireJayMore,
  (req, res) => {
    try {
      const user = db
        .prepare("SELECT * FROM users WHERE CAST(id AS TEXT) = CAST(? AS TEXT)")
        .get(String(req.params.userId));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      if (!isSoftwareDepartmentUser(user)) {
        return res.status(403).json({
          success: false,
          message: "Only Software department users can be managed here.",
        });
      }

      if (String(user.id) === String(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete yourself.",
        });
      }

      db.prepare(
        `
        UPDATE users
        SET status = 'deleted',
            deleted_at = ?,
            updated_at = ?
        WHERE id = ?
      `
      ).run(getJayTimestamp(), getJayTimestamp(), user.id);

      res.json({
        success: true,
        message: "Employee deleted successfully.",
      });
    } catch (error) {
      console.error("Jay delete employee error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to delete employee.",
      });
    }
  }
);


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

const PORT = process.env.PORT || 5000;

setInterval(() => {
  try {
    autoCloseExpiredCheckIns();
  } catch (error) {
    console.error("Auto checkout scheduler error:", error);
  }
}, 5 * 60 * 1000);

setTimeout(() => {
  try {
    const result = runMissedLoginStrikeCheck();

    console.log(
      `Missed-login strike startup check: target=${result.targetDate}, created=${result.createdCount}, skipped=${result.skipped}`
    );
  } catch (error) {
    console.error("Missed-login strike startup check error:", error);
  }
}, 3000);

setInterval(() => {
  try {
    const result = runMissedLoginStrikeCheck();

    if (!result.skipped && result.createdCount > 0) {
      console.log(
        `Missed-login strike check: ${result.createdCount} strike(s) created for ${result.targetDate}`
      );
    }
  } catch (error) {
    console.error("Missed-login strike scheduler error:", error);
  }
}, 60 * 60 * 1000);


app.listen(PORT, () => {
  console.log("--------------------------------------------------");
  console.log(`Valencia backend running on http://localhost:${PORT}`);
  console.log("Database: SQLite");
  console.log("Auth: SQLite JWT Authentication");
  console.log("Time Zone: Indian Standard Time (IST)");
  console.log("Attendance: Auto check-in on login/signup, auto checkout after 12 hours");
  console.log("Login strikes: Monday-Saturday mandatory login enabled");
  console.log("Login strikes: 3 active missed-login strikes block employee account");
  console.log("Project hours: 8.5 hour daily utilization tracking enabled");
  console.log("Users: Super Admin can view all users");
  console.log("Users: Admin cannot view Super Admin users/logins/attendance");
  console.log("Projects: Create, list, detail, update, delete enabled");
  console.log("Project update routes: PATCH and PUT /api/projects/:id enabled");
  console.log("Task routes: Create, update, status, delete enabled");
  console.log("Subtask routes: Create, status, delete enabled");
  console.log("Leave request routes: Create, list, approve, reject enabled");
  console.log("Chat routes: Software users, messages, attachments enabled");
  console.log("Project progress recalculation enabled");
  console.log("--------------------------------------------------");
});