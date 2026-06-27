import createAccountAdministratorRoutes from "./routes/accountAdministratorRoutes.cjs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./database.js";

dotenv.config();

const app = express();

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
app.use(express.static("public"));

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

  return db
    .prepare("SELECT * FROM attendance WHERE id = ?")
    .get(result.lastInsertRowid);
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

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message:
          "This account is blocked because of 3 missed mandatory logins. Contact an administrator.",
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
    const {
      project_id = null,
      title,
      description = "",
      status = "Pending",
      priority = "Normal",
      start_date = "",
      end_date = "",
      assigned_to = null,
      department = "",
    } = req.body;

    if (!title || !String(title).trim()) {
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

    let project = null;

    if (project_id) {
      project = getProjectById(project_id);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found.",
        });
      }

      if (
        req.user.role === "manager" &&
        project.department !== req.user.department
      ) {
        return res.status(403).json({
          success: false,
          message: "You cannot add tasks to a project outside your department.",
        });
      }
    }

    const finalDepartment =
      project?.department ||
      (req.user.role === "superAdmin" || req.user.role === "admin"
        ? department || req.user.department
        : req.user.department);

    const finalAssignedTo = assigned_to || req.user.id;
    const nowIST = getIndianTimestamp();
    const finalStatus = normalizeStatus(status);

    const result = db
      .prepare(
        `
        INSERT INTO tasks (
          project_id,
          title,
          description,
          status,
          priority,
          start_date,
          end_date,
          assigned_to,
          department,
          created_by,
          completed_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        project_id,
        String(title).trim(),
        description,
        finalStatus,
        priority,
        start_date,
        end_date,
        finalAssignedTo,
        finalDepartment,
        req.user.id,
        isDoneStatus(finalStatus) ? nowIST : null,
        nowIST,
        nowIST
      );

    const task = getTaskWithSubtasks(result.lastInsertRowid);

    if (project_id) {
      recalculateProjectProgress(project_id);
    }

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create task.",
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
    attendance,
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
      attendance: latest,
      currentStatus: "checkedIn",
    });
  }

  if (type === "Check Out" && (!latest || latest.type === "Check Out")) {
    return res.json({
      success: true,
      message: "You are already checked out.",
      attendance: latest || null,
      currentStatus: "checkedOut",
    });
  }

  const attendance = addAttendanceEvent(req.user, type);

  res.json({
    success: true,
    attendance,
    currentStatus: type === "Check In" ? "checkedIn" : "checkedOut",
  });
});

/* ---------------- LEAVE REQUESTS ---------------- */

function normalizeLeaveRequest(row) {
  if (!row) return null;

  return {
    id: row.id,
    leaveId: row.id,
    userId: String(row.user_id || ""),
    userName: row.user_name || "",
    userEmail: row.user_email || "",
    department: row.department || "",
    leaveType: row.leave_type || "Leave",
    emergencyContact: row.emergency_contact || "",
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    reason: row.reason || "",
    status: row.status || "pending",
    approvedBy: row.approved_by || "",
    adminComment: row.admin_comment || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

app.get("/api/leave-requests", authRequired, (req, res) => {
  try {
    let leaveRequests;

    if (req.user.role === "superAdmin") {
      leaveRequests = db
        .prepare("SELECT * FROM leave_requests ORDER BY created_at DESC")
        .all();
    } else if (req.user.role === "admin") {
      leaveRequests = db
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
    } else if (req.user.role === "manager") {
      leaveRequests = db
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
        .all(req.user.department);
    } else {
      leaveRequests = db
        .prepare(
          "SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC"
        )
        .all(req.user.id);
    }

    res.json({
      success: true,
      leaveRequests: leaveRequests.map(normalizeLeaveRequest),
    });
  } catch (error) {
    console.error("Get leave requests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load leave requests.",
    });
  }
});

app.post("/api/leave-requests", authRequired, (req, res) => {
  try {
    const leaveType = String(
      req.body.leaveType || req.body.leave_type || "Leave"
    ).trim();

    const emergencyContact = String(
      req.body.emergencyContact || req.body.emergency_contact || ""
    ).trim();

    const startDate = String(
      req.body.startDate || req.body.start_date || ""
    ).trim();

    const endDate = String(req.body.endDate || req.body.end_date || "").trim();

    const reason = String(req.body.reason || "").trim();

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
        leaveType,
        emergencyContact,
        startDate,
        endDate,
        reason,
        "pending",
        null,
        "",
        nowIST,
        nowIST
      );

    const leaveRequest = db
      .prepare("SELECT * FROM leave_requests WHERE id = ?")
      .get(result.lastInsertRowid);

    res.json({
      success: true,
      leaveRequest: normalizeLeaveRequest(leaveRequest),
    });
  } catch (error) {
    console.error("Create leave request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit leave request.",
    });
  }
});

app.patch("/api/leave-requests/:id", authRequired, requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const status = String(req.body.status || "").trim().toLowerCase();
    const adminComment = String(req.body.adminComment || "").trim();

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

    const leaveUser = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(leaveRequest.user_id);

    if (req.user.role === "admin" && leaveUser?.role === "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot review Super Admin leave requests.",
      });
    }

    const nowIST = getIndianTimestamp();

    db.prepare(
      `
      UPDATE leave_requests
      SET status = ?,
          approved_by = ?,
          admin_comment = ?,
          updated_at = ?
      WHERE id = ?
    `
    ).run(status, req.user.id, adminComment, nowIST, id);

    const updated = db
      .prepare("SELECT * FROM leave_requests WHERE id = ?")
      .get(id);

    res.json({
      success: true,
      leaveRequest: normalizeLeaveRequest(updated),
    });
  } catch (error) {
    console.error("Review leave request error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update leave request.",
    });
  }
});

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
  const notifications = db
    .prepare(
      `
      SELECT *
      FROM notifications
      WHERE target_type = 'General'
         OR user_id = ?
         OR department = ?
      ORDER BY created_at DESC
    `
    )
    .all(req.user.id, req.user.department);

  res.json({
    success: true,
    notifications,
  });
});

app.post("/api/notifications", authRequired, requireAdmin, (req, res) => {
  const {
    title,
    message = "",
    severity = "standard",
    target_type = "General",
    department = "",
    user_id = null,
  } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Notification title is required.",
    });
  }

  const nowIST = getIndianTimestamp();

  const result = db
    .prepare(
      `
      INSERT INTO notifications (
        title,
        message,
        severity,
        target_type,
        department,
        user_id,
        created_by,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      title,
      message,
      severity,
      target_type,
      department,
      user_id,
      req.user.id,
      nowIST
    );

  const notification = db
    .prepare("SELECT * FROM notifications WHERE id = ?")
    .get(result.lastInsertRowid);

  res.json({
    success: true,
    notification,
  });
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

/* ---------------- EMPLOYEE ASSIGNED PROJECTS - SIMPLE FINAL ---------------- */

app.get("/api/employee-assigned-projects", authRequired, (req, res) => {
  try {
    const user = db
      .prepare(
        `
        SELECT id, name, email, role, department
        FROM users
        WHERE id = ?
        LIMIT 1
        `
      )
      .get(req.user.id);

    const employee = user || req.user;

    const employeeEmail = String(employee.email || "")
      .trim()
      .toLowerCase();

    const employeeId = String(employee.id || req.user.id || "").trim();

    if (!employeeEmail && !employeeId) {
      return res.json({
        success: true,
        projects: [],
      });
    }

    const projects = db
      .prepare(
        `
        SELECT *
        FROM projects
        WHERE COALESCE(status, 'active') != 'deleted'
          AND (
            LOWER(COALESCE(members, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(members, '')) LIKE LOWER(?)
            OR EXISTS (
              SELECT 1
              FROM tasks
              WHERE tasks.project_id = projects.id
                AND CAST(tasks.assigned_to AS TEXT) = CAST(? AS TEXT)
            )
          )
        ORDER BY created_at DESC
        `
      )
      .all(`%${employeeEmail}%`, `%${employeeId}%`, employeeId);

    const normalizedProjects = projects.map((project) => {
      let members = [];

      try {
        members = project.members ? JSON.parse(project.members) : [];
      } catch {
        members = [];
      }

      return {
        ...project,
        title: project.name,
        projectName: project.name,

        startDate: project.start_date,
        start_date: project.start_date,

        endDate: project.end_date,
        end_date: project.end_date,
        deadline: project.end_date,

        managerId: project.manager_id,
        manager_id: project.manager_id,

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
      };
    });

    console.log("EMPLOYEE ASSIGNED PROJECTS:", {
      employeeEmail,
      employeeId,
      returned: normalizedProjects.map((project) => project.name),
    });

    res.json({
      success: true,
      projects: normalizedProjects,
    });
  } catch (error) {
    console.error("Employee assigned projects error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load assigned projects.",
    });
  }
});

/* ---------------- EMPLOYEE ASSIGNED PROJECTS ---------------- */

app.get("/api/employee-assigned-projects", authRequired, (req, res) => {
  try {
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

    const employeeEmail = String(user.email || "")
      .trim()
      .toLowerCase();

    const employeeId = String(user.id || req.user.id || "").trim();

    const employeeName = String(user.name || "")
      .trim()
      .toLowerCase();

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
      const projectText = String(JSON.stringify(project || {}))
        .trim()
        .toLowerCase();

      const emailMatch =
        employeeEmail && projectText.includes(employeeEmail);

      const idMatch =
        employeeId &&
        (
          projectText.includes(`"id":"${employeeId}"`) ||
          projectText.includes(`"id":${employeeId}`) ||
          projectText.includes(`"uid":"${employeeId}"`) ||
          projectText.includes(`"uid":${employeeId}`) ||
          projectText.includes(`"userid":"${employeeId}"`) ||
          projectText.includes(`"userid":${employeeId}`) ||
          projectText.includes(`"user_id":"${employeeId}"`) ||
          projectText.includes(`"user_id":${employeeId}`) ||
          projectText.includes(`"employeeid":"${employeeId}"`) ||
          projectText.includes(`"employeeid":${employeeId}`) ||
          projectText.includes(`"employee_id":"${employeeId}"`) ||
          projectText.includes(`"employee_id":${employeeId}`)
        );

      const nameMatch =
        employeeName && projectText.includes(employeeName);

      if (emailMatch || idMatch || nameMatch) {
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
        .get(project.id, employeeId);

      return Boolean(taskMatch);
    });

    const normalizedProjects = assignedProjects.map((project) => {
      let members = [];

      try {
        members = project.members ? JSON.parse(project.members) : [];
      } catch {
        members = [];
      }

      return {
        ...project,

        title: project.name || "",
        projectName: project.name || "",

        startDate: project.start_date || "",
        start_date: project.start_date || "",

        endDate: project.end_date || "",
        end_date: project.end_date || "",
        deadline: project.end_date || "",

        managerId: project.manager_id || "",
        manager_id: project.manager_id || "",

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
      };
    });

    console.log("EMPLOYEE ASSIGNED PROJECTS HIT:", {
      employeeEmail,
      employeeId,
      employeeName,
      returned: normalizedProjects.map((project) => project.name),
    });

    res.json({
      success: true,
      projects: normalizedProjects,
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

/* ---------------- FALLBACK - ALWAYS LAST ---------------- */

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
  console.log("Project progress recalculation enabled");
  console.log("--------------------------------------------------");
});