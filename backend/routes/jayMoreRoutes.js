import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { db } from "../database.js";

dotenv.config();

const router = express.Router();

const JAY_MORE_EMAIL = "jay.more@valencianutrition.com";
const JWT_SECRET =
  process.env.JWT_SECRET || "valencia_super_secret_change_this_later";

function getNowTimestamp() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  const role = clean(value).replaceAll("_", "").replaceAll("-", "");

  if (role === "superadmin") return "superadmin";
  if (role === "admin") return "admin";

  return "employee";
}

function ensureUserColumn(column, definition) {
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

ensureUserColumn("status", "TEXT DEFAULT 'active'");
ensureUserColumn("department", "TEXT");
ensureUserColumn("role", "TEXT DEFAULT 'employee'");
ensureUserColumn("phone", "TEXT");
ensureUserColumn("blocked_at", "TEXT");
ensureUserColumn("deleted_at", "TEXT");
ensureUserColumn("created_at", "TEXT");
ensureUserColumn("updated_at", "TEXT");

function getTableColumns(tableName) {
  return db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map((item) => item.name);
}

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
        message: "Invalid user session.",
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

function requireJayMore(req, res, next) {
  if (clean(req.user?.email) !== JAY_MORE_EMAIL) {
    return res.status(403).json({
      success: false,
      message: "Only Jay More can access this section.",
    });
  }

  next();
}

function getDepartmentMap() {
  const map = new Map();

  try {
    const departments = db.prepare("SELECT * FROM departments").all();

    departments.forEach((department) => {
      const id = String(
        department.id ||
          department.department_id ||
          department.departmentId ||
          department.value ||
          ""
      );

      const name =
        department.name ||
        department.title ||
        department.departmentName ||
        department.department_name ||
        department.division ||
        department.label ||
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

function getUserDepartment(user) {
  const departmentMap = getDepartmentMap();

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
  const department = clean(getUserDepartment(user));

  return department.includes("software");
}

function normalizeEmployee(user) {
  const status = clean(user.status || "active");

  return {
    id: String(user.id),
    userId: String(user.id),

    name: user.name || user.full_name || user.fullName || user.email || "User",
    email: user.email || "",

    role: user.role || "employee",
    department: getUserDepartment(user) || "Software Team",
    designation: user.designation || user.position || "",
    phone: user.phone || user.mobile || "",

    status:
      status === "deleted"
        ? "deleted"
        : status === "blocked"
        ? "blocked"
        : "active",

    isBlocked: status === "blocked",

    blockedAt: user.blocked_at || "",
    deletedAt: user.deleted_at || "",
    createdAt: user.created_at || user.createdAt || "",
    updatedAt: user.updated_at || user.updatedAt || "",
  };
}

function getUserById(userId) {
  return db
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

function getPasswordColumn() {
  const columns = db
    .prepare("PRAGMA table_info(users)")
    .all()
    .map((column) => column.name);

  if (columns.includes("password_hash")) return "password_hash";
  if (columns.includes("passwordHash")) return "passwordHash";
  if (columns.includes("password")) return "password";

  return "";
}

router.get("/_test", (req, res) => {
  res.json({
    success: true,
    message: "Jay More routes are working.",
  });
});

router.get("/add-employee-test", (req, res) => {
  res.json({
    success: true,
    message: "Jay More add employee route is loaded from jayMoreRoutes.js.",
  });
});

router.get("/software-employees", authRequired, requireJayMore, (req, res) => {
  try {
    const employees = db
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
      .map(normalizeEmployee);

    res.json({
      success: true,
      employees,
      users: employees,
    });
  } catch (error) {
    console.error("Load Jay More software employees error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load software employees.",
    });
  }
});

router.post("/employees", authRequired, requireJayMore, async (req, res) => {
  try {
    const name = String(req.body?.name || req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const department = String(req.body?.department || "Software Team").trim();
    const role = normalizeRole(req.body?.role);
    const phone = String(req.body?.phone || "")
      .replace(/\D/g, "")
      .slice(0, 10);
    const password = String(req.body?.password || "").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Employee full name is required.",
      });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Valid employee email is required.",
      });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits.",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existing = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `
      )
      .get(email);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const columns = getTableColumns("users");
    const passwordColumn = getPasswordColumn();

    if (!passwordColumn) {
      return res.status(500).json({
        success: false,
        message: "No password column found in users table.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = getNowTimestamp();

    const insertData = {};

    if (columns.includes("name")) insertData.name = name;
    if (columns.includes("full_name")) insertData.full_name = name;
    if (columns.includes("fullName")) insertData.fullName = name;

    if (columns.includes("email")) insertData.email = email;
    if (columns.includes("department")) insertData.department = department;
    if (columns.includes("role")) insertData.role = role;

    if (columns.includes("phone")) insertData.phone = phone;
    if (columns.includes("mobile")) insertData.mobile = phone;

    insertData[passwordColumn] = passwordHash;

    if (columns.includes("status")) insertData.status = "active";
    if (columns.includes("is_blocked")) insertData.is_blocked = 0;
    if (columns.includes("blocked")) insertData.blocked = 0;
    if (columns.includes("is_deleted")) insertData.is_deleted = 0;
    if (columns.includes("deleted")) insertData.deleted = 0;

    if (columns.includes("created_by")) insertData.created_by = req.user.id || null;
    if (columns.includes("created_at")) insertData.created_at = now;
    if (columns.includes("updated_at")) insertData.updated_at = now;

    const keys = Object.keys(insertData);

    if (!keys.length) {
      return res.status(500).json({
        success: false,
        message: "Users table columns could not be detected.",
      });
    }

    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map((key) => insertData[key]);

    const result = db
      .prepare(
        `
        INSERT INTO users (${keys.join(", ")})
        VALUES (${placeholders})
      `
      )
      .run(...values);

    const createdUser = db
      .prepare(
        `
        SELECT *
        FROM users
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(result.lastInsertRowid);

    res.json({
      success: true,
      message: "Employee added successfully.",
      employee: normalizeEmployee(createdUser),
    });
  } catch (error) {
    console.error("Jay More add employee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add employee.",
    });
  }
});

router.post(
  "/software-employees/:userId/block",
  authRequired,
  requireJayMore,
  (req, res) => {
    try {
      const user = getUserById(req.params.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      if (!isSoftwareDepartmentUser(user)) {
        return res.status(403).json({
          success: false,
          message: "Only Software department employees can be managed here.",
        });
      }

      if (String(user.id) === String(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot block yourself.",
        });
      }

      const currentStatus = clean(user.status || "active");
      const nextStatus = currentStatus === "blocked" ? "active" : "blocked";
      const now = getNowTimestamp();

      db.prepare(
        `
        UPDATE users
        SET status = ?,
            blocked_at = ?,
            updated_at = ?
        WHERE id = ?
      `
      ).run(nextStatus, nextStatus === "blocked" ? now : "", now, user.id);

      const updated = getUserById(user.id);

      res.json({
        success: true,
        message:
          nextStatus === "blocked"
            ? "Employee blocked successfully."
            : "Employee unblocked successfully.",
        employee: normalizeEmployee(updated),
      });
    } catch (error) {
      console.error("Block/unblock employee error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to update employee status.",
      });
    }
  }
);

router.post(
  "/software-employees/:userId/reset-password",
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

      const user = getUserById(req.params.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      if (!isSoftwareDepartmentUser(user)) {
        return res.status(403).json({
          success: false,
          message: "Only Software department employees can be managed here.",
        });
      }

      const passwordColumn = getPasswordColumn();

      if (!passwordColumn) {
        return res.status(500).json({
          success: false,
          message: "No password column found in users table.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const now = getNowTimestamp();

      db.prepare(
        `
        UPDATE users
        SET ${passwordColumn} = ?,
            updated_at = ?
        WHERE id = ?
      `
      ).run(passwordHash, now, user.id);

      res.json({
        success: true,
        message: "Password reset successfully.",
      });
    } catch (error) {
      console.error("Reset employee password error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to reset password.",
      });
    }
  }
);

router.delete(
  "/software-employees/:userId",
  authRequired,
  requireJayMore,
  (req, res) => {
    try {
      const user = getUserById(req.params.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Employee not found.",
        });
      }

      if (!isSoftwareDepartmentUser(user)) {
        return res.status(403).json({
          success: false,
          message: "Only Software department employees can be managed here.",
        });
      }

      if (String(user.id) === String(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete yourself.",
        });
      }

      const now = getNowTimestamp();

      db.prepare(
        `
        UPDATE users
        SET status = 'deleted',
            deleted_at = ?,
            updated_at = ?
        WHERE id = ?
      `
      ).run(now, now, user.id);

      res.json({
        success: true,
        message: "Employee deleted successfully.",
      });
    } catch (error) {
      console.error("Delete employee error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to delete employee.",
      });
    }
  }
);

export default router;