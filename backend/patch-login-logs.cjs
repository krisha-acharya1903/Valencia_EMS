const fs = require("fs");
const path = require("path");

const serverPath = path.join(process.cwd(), "server.js");
const backupPath = path.join(
  process.cwd(),
  "server.backup-before-login-logs.js"
);

if (!fs.existsSync(serverPath)) {
  console.error("server.js not found.");
  console.error("Keep patch-login-logs.cjs in the same folder as server.js.");
  process.exit(1);
}

let code = fs.readFileSync(serverPath, "utf8");

if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, code);
  console.log("Backup created:", backupPath);
} else {
  console.log("Backup already exists:", backupPath);
}

/* ---------------- INSERT TABLE ---------------- */

const tableCode = `
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
`;

if (!code.includes("CREATE TABLE IF NOT EXISTS app_login_logs")) {
  const marker = `ensureColumn("leave_requests", "admin_comment", "TEXT");`;

  if (!code.includes(marker)) {
    throw new Error(
      `Could not find marker for table insertion: ${marker}`
    );
  }

  code = code.replace(marker, `${marker}\n${tableCode}`);
  console.log("Added app_login_logs table.");
} else {
  console.log("app_login_logs table already exists.");
}

/* ---------------- INSERT HELPERS ---------------- */

const helperCode = `/* ---------------- APP LOGIN LOG HELPERS ---------------- */

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

`;

if (!code.includes("function recordAppLogin(")) {
  const marker = "/* ---------------- ATTENDANCE HELPERS ---------------- */";

  if (!code.includes(marker)) {
    throw new Error(
      `Could not find marker for helper insertion: ${marker}`
    );
  }

  code = code.replace(marker, `${helperCode}\n${marker}`);
  console.log("Added app login helper functions.");
} else {
  console.log("App login helper functions already exist.");
}

/* ---------------- RECORD REGISTER LOGIN ---------------- */

if (!code.includes(`recordAppLogin(user, req, "register");`)) {
  const registerPattern =
    /ensureAutoCheckIn\(user\);\s*\n\s*const token = createToken\(user\);/;

  if (!registerPattern.test(code)) {
    console.warn(
      "Could not find register token block. Skipping register login recording."
    );
  } else {
    code = code.replace(
      registerPattern,
      `ensureAutoCheckIn(user);
    recordAppLogin(user, req, "register");

    const token = createToken(user);`
    );

    console.log("Added app login recording to register route.");
  }
} else {
  console.log("Register login recording already exists.");
}

/* ---------------- RECORD NORMAL LOGIN ---------------- */

if (!code.includes(`recordAppLogin(updated, req, "login");`)) {
  const loginPattern =
    /ensureAutoCheckIn\(updated\);\s*\n\s*const token = createToken\(updated\);/;

  if (!loginPattern.test(code)) {
    console.warn(
      "Could not find login token block. Skipping normal login recording."
    );
  } else {
    code = code.replace(
      loginPattern,
      `ensureAutoCheckIn(updated);
    recordAppLogin(updated, req, "login");

    const token = createToken(updated);`
    );

    console.log("Added app login recording to login route.");
  }
} else {
  console.log("Normal login recording already exists.");
}

/* ---------------- INSERT APP LOGIN ROUTE ---------------- */

const routeCode = `/* ---------------- APP LOGIN LOGS ---------------- */

app.get("/api/app-logins", authRequired, (req, res) => {
  try {
    let logs;

    if (req.user.role === "superAdmin" || req.user.role === "admin") {
      logs = db.prepare("SELECT * FROM app_login_logs ORDER BY id DESC").all();
    } else if (req.user.role === "manager") {
      logs = db
        .prepare(
          "SELECT * FROM app_login_logs WHERE department = ? ORDER BY id DESC"
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

`;

if (!code.includes(`app.get("/api/app-logins"`)) {
  const marker = "/* ---------------- ATTENDANCE ---------------- */";

  if (!code.includes(marker)) {
    throw new Error(
      `Could not find marker for route insertion: ${marker}`
    );
  }

  code = code.replace(marker, `${routeCode}\n${marker}`);
  console.log("Added /api/app-logins route.");
} else {
  console.log("/api/app-logins route already exists.");
}

/* ---------------- SAVE ---------------- */

fs.writeFileSync(serverPath, code);

console.log("--------------------------------------------------");
console.log("server.js updated successfully.");
console.log("App login tracking added.");
console.log("Backup file:", backupPath);
console.log("--------------------------------------------------");