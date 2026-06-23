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

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_later";

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
        message: "This account is blocked. Contact an administrator.",
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

  if (req.user.role === "superAdmin" || req.user.role === "admin") {
    users = db
      .prepare("SELECT * FROM users ORDER BY created_at DESC")
      .all();
  } else if (req.user.role === "manager") {
    users = db
      .prepare("SELECT * FROM users WHERE department = ? ORDER BY created_at DESC")
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
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function stringifyProjectMembers(value) {
  if (!Array.isArray(value)) {
    return "[]";
  }

  return JSON.stringify(value.map((item) => String(item)));
}

function normalizeProject(row) {
  if (!row) return null;

  return {
    ...row,
    id: row.id,
    name: row.name || "",
    description: row.description || "",
    department: row.department || "",
    status: row.status || "active",
    priority: row.priority || "medium",
    progress: Number(row.progress || 0),
    managerId: String(row.manager_id || ""),
    manager_id: row.manager_id || "",
    members: parseProjectMembers(row.members),
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

function canManageProject(user, project) {
  if (!user || !project) return false;

  if (user.role === "superAdmin" || user.role === "admin") {
    return true;
  }

  if (user.role === "manager") {
    return (
      String(project.manager_id || "") === String(user.id) ||
      String(project.department || "") === String(user.department || "")
    );
  }

  return false;
}

function safePatchValue(incoming, existing, fallback = "") {
  if (incoming === undefined || incoming === null) return existing ?? fallback;

  const value = String(incoming).trim();

  if (!value) return existing ?? fallback;

  return value;
}

function getProjectById(id) {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
}

app.get("/api/projects", authRequired, (req, res) => {
  try {
    let projects;

    if (req.user.role === "superAdmin" || req.user.role === "admin") {
      projects = db
        .prepare("SELECT * FROM projects ORDER BY created_at DESC")
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
      projects = db
        .prepare(
          `
          SELECT DISTINCT p.*
          FROM projects p
          LEFT JOIN users creator ON creator.id = p.created_by
          LEFT JOIN tasks t ON t.project_id = p.id AND t.assigned_to = ?
          WHERE creator.role IN ('admin', 'superAdmin')
             OR p.created_by IS NULL
             OR p.department = ?
             OR t.assigned_to = ?
             OR p.members LIKE ?
          ORDER BY p.created_at DESC
        `
        )
        .all(req.user.id, req.user.department, req.user.id, `%${req.user.id}%`);
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
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const department = String(req.body.department || "").trim();
    const status = String(req.body.status || "active").trim();
    const priority = String(req.body.priority || "medium").trim();
    const startDate = String(
      req.body.start_date || req.body.startDate || ""
    ).trim();
    const endDate = String(
      req.body.end_date || req.body.endDate || req.body.deadline || ""
    ).trim();

    const managerId = req.body.manager_id || req.body.managerId || null;
    const members = stringifyProjectMembers(req.body.members || []);

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

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "Deadline must be after start date.",
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

    const name = safePatchValue(req.body.name, existing.name, "");
    const description = safePatchValue(
      req.body.description,
      existing.description,
      ""
    );
    const department = safePatchValue(
      req.body.department,
      existing.department,
      ""
    );
    const status = safePatchValue(req.body.status, existing.status, "active");
    const priority = safePatchValue(
      req.body.priority,
      existing.priority,
      "medium"
    );

    const startDate = safePatchValue(
      req.body.start_date ?? req.body.startDate,
      existing.start_date,
      ""
    );

    const endDate = safePatchValue(
      req.body.end_date ?? req.body.endDate ?? req.body.deadline,
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

    const members =
      req.body.members !== undefined
        ? stringifyProjectMembers(req.body.members)
        : existing.members || "[]";

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

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "Deadline must be after start date.",
      });
    }

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

    db.prepare("DELETE FROM projects WHERE id = ?").run(id);

    res.json({
      success: true,
      deleted: true,
      project: normalizeProject(existing),
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

      if (
        req.user.role === "employee" &&
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
      req.body.assigned_to ?? req.body.assignedTo ?? task.assigned_to;
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

    if (!canAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task.",
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

    if (!canAccessTask(req.user, task)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this subtask.",
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

/* ---------------- ATTENDANCE ---------------- */

app.get("/api/attendance", authRequired, (req, res) => {
  ensureAutoCheckOut(req.user);

  let attendance;

  if (req.user.role === "superAdmin") {
    attendance = db.prepare("SELECT * FROM attendance ORDER BY id DESC").all();
  } else if (req.user.role === "admin") {
    attendance = db.prepare("SELECT * FROM attendance ORDER BY id DESC").all();
  } else if (req.user.role === "manager") {
    attendance = db
      .prepare("SELECT * FROM attendance WHERE department = ? ORDER BY id DESC")
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

    if (req.user.role === "superAdmin" || req.user.role === "admin") {
      leaveRequests = db
        .prepare("SELECT * FROM leave_requests ORDER BY created_at DESC")
        .all();
    } else if (req.user.role === "manager") {
      leaveRequests = db
        .prepare(
          "SELECT * FROM leave_requests WHERE department = ? ORDER BY created_at DESC"
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

app.listen(PORT, () => {
  console.log("--------------------------------------------------");
  console.log(`Valencia backend running on http://localhost:${PORT}`);
  console.log("Database: SQLite");
  console.log("Auth: SQLite JWT Authentication");
  console.log("Time Zone: Indian Standard Time (IST)");
  console.log("Attendance: Auto check-in on login/signup, auto checkout after 12 hours");
  console.log("Users: Admin and SuperAdmin can view all users");
  console.log("Projects: Create, list, detail, update, delete enabled");
  console.log("Project update routes: PATCH and PUT /api/projects/:id enabled");
  console.log("Task routes: Create, update, status, delete enabled");
  console.log("Subtask routes: Create, status, delete enabled");
  console.log("Leave request routes: Create, list, approve, reject enabled");
  console.log("Project progress recalculation enabled");
  console.log("--------------------------------------------------");
});