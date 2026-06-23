const fs = require("fs");
const path = require("path");

const serverPath = path.join(process.cwd(), "server.js");

if (!fs.existsSync(serverPath)) {
  console.error("server.js not found.");
  console.error("Run this file from your backend folder.");
  process.exit(1);
}

let code = fs.readFileSync(serverPath, "utf8");

const backupPath = path.join(
  process.cwd(),
  `server.backup-before-app-login-fix-${Date.now()}.js`
);

fs.writeFileSync(backupPath, code, "utf8");

function insertAfter(marker, block, uniqueText) {
  if (code.includes(uniqueText)) {
    return false;
  }

  const index = code.indexOf(marker);

  if (index === -1) {
    throw new Error(`Could not find marker:\n${marker}`);
  }

  const insertIndex = index + marker.length;

  code =
    code.slice(0, insertIndex) +
    "\n\n" +
    block.trim() +
    "\n" +
    code.slice(insertIndex);

  return true;
}

function insertBefore(marker, block, uniqueText) {
  if (code.includes(uniqueText)) {
    return false;
  }

  const index = code.indexOf(marker);

  if (index === -1) {
    throw new Error(`Could not find marker:\n${marker}`);
  }

  code =
    code.slice(0, index) +
    block.trim() +
    "\n\n" +
    code.slice(index);

  return true;
}

const appLoginTableBlock = `
db.prepare(\`
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
\`).run();

ensureColumn("app_login_logs", "user_id", "INTEGER");
ensureColumn("app_login_logs", "user_name", "TEXT");
ensureColumn("app_login_logs", "user_email", "TEXT");
ensureColumn("app_login_logs", "role", "TEXT");
ensureColumn("app_login_logs", "department", "TEXT");
ensureColumn("app_login_logs", "login_type", "TEXT DEFAULT 'login'");
ensureColumn("app_login_logs", "ip_address", "TEXT");
ensureColumn("app_login_logs", "user_agent", "TEXT");
ensureColumn("app_login_logs", "created_at", "TEXT");
`;

const appLoginHelperBlock = `
/* ---------------- APP LOGIN HELPERS ---------------- */

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }

  return (
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip ||
    ""
  );
}

function normalizeAppLoginLog(row) {
  if (!row) return null;

  return {
    id: row.id,
    loginId: row.id,
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

function recordAppLogin(user, req, loginType = "login") {
  if (!user) return null;

  const nowIST = getIndianTimestamp();

  const result = db
    .prepare(
      \`
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
    \`
    )
    .run(
      user.id,
      user.name || "",
      user.email || "",
      user.role || "",
      user.department || "",
      loginType,
      getClientIp(req),
      req.headers["user-agent"] || "",
      nowIST
    );

  console.log("App login recorded:", user.email, loginType, nowIST);

  return db
    .prepare("SELECT * FROM app_login_logs WHERE id = ?")
    .get(result.lastInsertRowid);
}
`;

const appLoginRouteBlock = `
/* ---------------- APP LOGIN REPORTS ---------------- */

app.get("/api/app-logins", authRequired, (req, res) => {
  try {
    let rows;

    if (req.user.role === "superAdmin" || req.user.role === "admin") {
      rows = db
        .prepare("SELECT * FROM app_login_logs ORDER BY id DESC")
        .all();
    } else if (req.user.role === "manager") {
      rows = db
        .prepare(
          \`
          SELECT *
          FROM app_login_logs
          WHERE department = ?
             OR user_id = ?
          ORDER BY id DESC
        \`
        )
        .all(req.user.department, req.user.id);
    } else {
      rows = db
        .prepare("SELECT * FROM app_login_logs WHERE user_id = ? ORDER BY id DESC")
        .all(req.user.id);
    }

    res.json({
      success: true,
      appLogins: rows.map(normalizeAppLoginLog),
    });
  } catch (error) {
    console.error("Get app login logs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load app login records.",
    });
  }
});
`;

try {
  insertAfter(
    `ensureColumn("leave_requests", "admin_comment", "TEXT");`,
    appLoginTableBlock,
    `CREATE TABLE IF NOT EXISTS app_login_logs`
  );

  insertBefore(
    `/* ---------------- ATTENDANCE HELPERS ---------------- */`,
    appLoginHelperBlock,
    `function recordAppLogin(user, req, loginType = "login")`
  );

  insertBefore(
    `/* ---------------- DEPARTMENTS ---------------- */`,
    appLoginRouteBlock,
    `app.get("/api/app-logins"`
  );

  code = code.replaceAll(
    `ensureAutoCheckIn(user);`,
    `recordAppLogin(user, req, "register");`
  );

  code = code.replaceAll(
    `ensureAutoCheckIn(updated);`,
    `recordAppLogin(updated, req, "login");`
  );

  code = code.replaceAll(
    `  ensureAutoCheckOut(req.user);\n\n`,
    ``
  );

  code = code.replace(
    `"Auto check-in on login/signup, manual checkout allowed, auto checkout after 12 hours"`,
    `"App login is tracked separately. Attendance is only for manual/biometric check-in and check-out."`
  );

  code = code.replace(
    `console.log("Attendance: Auto check-in on login/signup, auto checkout after 12 hours");`,
    `console.log("Attendance: Separated from app login logs");`
  );

  code = code.replace(
    /recordAppLogin\(user, req, "register"\);\s*recordAppLogin\(user, req, "register"\);/g,
    `recordAppLogin(user, req, "register");`
  );

  code = code.replace(
    /recordAppLogin\(updated, req, "login"\);\s*recordAppLogin\(updated, req, "login"\);/g,
    `recordAppLogin(updated, req, "login");`
  );

  fs.writeFileSync(serverPath, code, "utf8");

  console.log("Backend login/attendance separation patch applied successfully.");
  console.log(`Backup created: ${backupPath}`);
  console.log("");
  console.log("Next:");
  console.log("1. Restart backend.");
  console.log("2. Logout from frontend.");
  console.log("3. Login again.");
  console.log("4. Check App Login Reports.");
} catch (error) {
  fs.writeFileSync(serverPath, fs.readFileSync(backupPath, "utf8"), "utf8");

  console.error("Patch failed. server.js was restored from backup.");
  console.error(error.message);
  process.exit(1);
}