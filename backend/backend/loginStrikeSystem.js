import { db } from "./database.js";

const MAX_ACTIVE_STRIKES = 3;

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
  // 0 = Sunday. Monday to Saturday are working days.
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

/* ---------------- SCHEMA ---------------- */

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

export function ensureLoginStrikeTables() {
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
}

/* ---------------- STRIKE LOGIC ---------------- */

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

  if (activeStrikeCount >= MAX_ACTIVE_STRIKES && user.status !== "blocked") {
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

export function runMissedLoginStrikeCheck(options = {}) {
  ensureLoginStrikeTables();

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

/* ---------------- API NORMALIZERS ---------------- */

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
      Number(row.active_strikes || 0) >= MAX_ACTIVE_STRIKES ||
      row.user_status === "blocked",
  };
}

/* ---------------- ROUTES ---------------- */

export function registerLoginStrikeRoutes(app, authRequired, requireAdmin, normalizeUser) {
  app.get("/api/login-strikes", authRequired, requireAdmin, (req, res) => {
    try {
      ensureLoginStrikeTables();

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
        ensureLoginStrikeTables();

        const userId = req.params.userId;
        const nowIST = getIndianTimestamp();

        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found.",
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
}

/* ---------------- SCHEDULER ---------------- */

export function startLoginStrikeScheduler() {
  ensureLoginStrikeTables();

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
}