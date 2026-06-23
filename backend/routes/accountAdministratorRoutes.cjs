const express = require("express");
const bcrypt = require("bcryptjs");

function createAccountAdministratorRoutes({ db, authenticateToken }) {
  const router = express.Router();

  function getUserColumns() {
    return db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
  }

  function hasUserColumn(columnName) {
    return getUserColumns().includes(columnName);
  }

  function addUserColumnIfMissing(columnName, definition) {
    if (!hasUserColumn(columnName)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${columnName} ${definition}`);
    }
  }

  function ensureTables() {
    addUserColumnIfMissing("is_account_administrator", "INTEGER NOT NULL DEFAULT 0");
    addUserColumnIfMissing("created_by", "INTEGER");

    db.exec(`
      CREATE TABLE IF NOT EXISTS account_creation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_by_user_id INTEGER,
        created_by_email TEXT,
        created_user_id INTEGER,
        created_user_email TEXT,
        created_user_role TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  function normalizeRole(role) {
    const normalized = String(role || "")
      .replaceAll("_", "")
      .replaceAll("-", "")
      .replaceAll(" ", "")
      .toLowerCase();

    if (normalized === "superadmin") return "superAdmin";
    if (normalized === "admin") return "admin";
    if (normalized === "manager") return "admin";
    return "employee";
  }

  function getRequestUserId(req) {
    return req.user?.id || req.user?.userId || req.user?.uid || null;
  }

  function getLoggedInUser(req) {
    const userId = getRequestUserId(req);

    if (!userId) {
      return null;
    }

    return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  }

  function isAccountAdministrator(user) {
    return Number(user?.is_account_administrator || 0) === 1;
  }

  function canCreateAccounts(user) {
    const role = normalizeRole(user?.role);

    return role === "superAdmin" || role === "admin" || isAccountAdministrator(user);
  }

  function canCreateRequestedRole(actor, requestedRole) {
    const actorRole = normalizeRole(actor?.role);
    const actorIsAccountAdministrator = isAccountAdministrator(actor);

    if (requestedRole === "superAdmin") {
      return actorRole === "superAdmin" || actorIsAccountAdministrator;
    }

    if (requestedRole === "admin") {
      return actorRole === "superAdmin" || actorRole === "admin" || actorIsAccountAdministrator;
    }

    if (requestedRole === "employee") {
      return actorRole === "superAdmin" || actorRole === "admin" || actorIsAccountAdministrator;
    }

    return false;
  }

  function serializeUser(user) {
    if (!user) return null;

    return {
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      role: normalizeRole(user.role),
      department: user.department || user.division || "",
      division: user.division || user.department || "",
      designation: user.designation || "",
      phone: user.phone || "",
      isAccountAdministrator: isAccountAdministrator(user),
      is_account_administrator: isAccountAdministrator(user),
    };
  }

  function insertUserDynamic(payload) {
    const columns = getUserColumns();
    const insertData = {};

    function setIfExists(columnName, value) {
      if (columns.includes(columnName)) {
        insertData[columnName] = value;
      }
    }

    setIfExists("name", payload.name);
    setIfExists("email", payload.email);
    setIfExists("password_hash", payload.passwordHash);
    setIfExists("password", payload.passwordHash);
    setIfExists("role", payload.role);
    setIfExists("department", payload.department || payload.division || "");
    setIfExists("division", payload.division || payload.department || "");
    setIfExists("designation", payload.designation || "");
    setIfExists("phone", payload.phone || "");
    setIfExists("is_account_administrator", 0);
    setIfExists("created_by", payload.createdBy || null);
    setIfExists("status", "active");
    setIfExists("is_active", 1);
    setIfExists("created_at", new Date().toISOString());
    setIfExists("updated_at", new Date().toISOString());

    const keys = Object.keys(insertData);
    const placeholders = keys.map((key) => `@${key}`);

    const result = db.prepare(`
      INSERT INTO users (${keys.join(", ")})
      VALUES (${placeholders.join(", ")})
    `).run(insertData);

    return result.lastInsertRowid;
  }

  ensureTables();

  router.get("/me", authenticateToken, (req, res) => {
    try {
      const user = getLoggedInUser(req);

      if (!user) {
        return res.status(401).json({
          message: "Invalid user session.",
          canCreateAccounts: false,
        });
      }

      return res.json({
        user: serializeUser(user),
        canCreateAccounts: canCreateAccounts(user),
      });
    } catch (error) {
      console.error("GET /api/account-administrator/me error:", error);

      return res.status(500).json({
        message: "Unable to check account administrator access.",
        canCreateAccounts: false,
      });
    }
  });

  router.post("/users", authenticateToken, async (req, res) => {
    try {
      const actor = getLoggedInUser(req);

      if (!actor) {
        return res.status(401).json({
          message: "Invalid user session. Please login again.",
        });
      }

      if (!canCreateAccounts(actor)) {
        return res.status(403).json({
          message: "You do not have permission to create accounts.",
        });
      }

      const {
        name,
        email,
        password,
        role,
        department,
        division,
        designation,
        phone,
      } = req.body || {};

      const cleanName = String(name || "").trim();
      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanPassword = String(password || "").trim();
      const requestedRole = normalizeRole(role || "employee");

      if (!cleanName) {
        return res.status(400).json({
          message: "Name is required.",
        });
      }

      if (!cleanEmail) {
        return res.status(400).json({
          message: "Email is required.",
        });
      }

      if (!cleanPassword || cleanPassword.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters.",
        });
      }

      if (!["employee", "admin", "superAdmin"].includes(requestedRole)) {
        return res.status(400).json({
          message: "Invalid role selected.",
        });
      }

      if (!canCreateRequestedRole(actor, requestedRole)) {
        return res.status(403).json({
          message: `You do not have permission to create ${requestedRole} accounts.`,
        });
      }

      const existingUser = db
        .prepare("SELECT id FROM users WHERE lower(email) = lower(?)")
        .get(cleanEmail);

      if (existingUser) {
        return res.status(409).json({
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await bcrypt.hash(cleanPassword, 10);

      const newUserId = insertUserDynamic({
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: requestedRole,
        department,
        division,
        designation,
        phone,
        createdBy: actor.id,
      });

      const createdUser = db.prepare("SELECT * FROM users WHERE id = ?").get(newUserId);

      db.prepare(`
        INSERT INTO account_creation_logs (
          created_by_user_id,
          created_by_email,
          created_user_id,
          created_user_email,
          created_user_role
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(
        actor.id,
        actor.email || "",
        createdUser.id,
        createdUser.email,
        normalizeRole(createdUser.role)
      );

      return res.status(201).json({
        message: `${normalizeRole(createdUser.role)} account created successfully.`,
        user: serializeUser(createdUser),
      });
    } catch (error) {
      console.error("POST /api/account-administrator/users error:", error);

      return res.status(500).json({
        message: "Unable to create account.",
      });
    }
  });

  router.get("/logs", authenticateToken, (req, res) => {
    try {
      const actor = getLoggedInUser(req);

      if (!actor || !canCreateAccounts(actor)) {
        return res.status(403).json({
          message: "You do not have permission to view account creation logs.",
        });
      }

      const logs = db.prepare(`
        SELECT *
        FROM account_creation_logs
        ORDER BY created_at DESC
        LIMIT 100
      `).all();

      return res.json({ logs });
    } catch (error) {
      console.error("GET /api/account-administrator/logs error:", error);

      return res.status(500).json({
        message: "Unable to fetch account creation logs.",
      });
    }
  });

  return router;
}

module.exports = createAccountAdministratorRoutes;