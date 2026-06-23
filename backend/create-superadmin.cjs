const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let sqlite3;
let bcrypt;

try {
  sqlite3 = require("sqlite3").verbose();
} catch {
  console.error("sqlite3 is not installed. Run: npm install sqlite3");
  process.exit(1);
}

try {
  bcrypt = require("bcryptjs");
} catch {
  try {
    bcrypt = require("bcrypt");
  } catch {
    console.error("bcryptjs is not installed. Run: npm install bcryptjs");
    process.exit(1);
  }
}

const SUPERADMIN = {
  name: "Super Admin",
  email: "superadmin@valencia.com",
  password: "Valencia@12345",
  role: "superAdmin",
  department: "Management",
  position: "Super Admin",
};

function findDatabaseFile(startDir) {
  const matches = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist" ||
          entry.name === "build"
        ) {
          continue;
        }

        walk(fullPath);
      } else if (
        entry.name.endsWith(".db") ||
        entry.name.endsWith(".sqlite") ||
        entry.name.endsWith(".sqlite3")
      ) {
        matches.push(fullPath);
      }
    }
  }

  walk(startDir);

  if (!matches.length) {
    throw new Error("No SQLite database file found in backend folder.");
  }

  const preferred =
    matches.find((file) => file.toLowerCase().includes("valencia")) ||
    matches.find((file) => file.toLowerCase().includes("database")) ||
    matches.find((file) => file.toLowerCase().includes("ems")) ||
    matches[0];

  return preferred;
}

function openDatabase(dbPath) {
  return new sqlite3.Database(dbPath);
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function getColumnName(columns, names) {
  const lowerNames = names.map((name) => name.toLowerCase());

  const column = columns.find((item) =>
    lowerNames.includes(String(item.name || "").toLowerCase())
  );

  return column?.name || "";
}

function sqlNow() {
  return new Date().toISOString();
}

function randomId() {
  return crypto.randomBytes(12).toString("hex");
}

async function ensureColumn(db, columns, name, definition) {
  const exists = columns.some(
    (column) => String(column.name || "").toLowerCase() === name.toLowerCase()
  );

  if (!exists) {
    await run(db, `ALTER TABLE users ADD COLUMN ${name} ${definition}`);
    console.log(`Added missing column: ${name}`);
  }
}

async function main() {
  const backendDir = process.cwd();
  const dbPath = process.env.DB_PATH || findDatabaseFile(backendDir);

  console.log("Using database:", dbPath);

  const db = openDatabase(dbPath);

  try {
    let columns = await all(db, "PRAGMA table_info(users)");

    if (!columns.length) {
      throw new Error("users table not found in SQLite database.");
    }

    await ensureColumn(db, columns, "role", "TEXT DEFAULT 'employee'");
    await ensureColumn(db, columns, "status", "TEXT DEFAULT 'active'");

    columns = await all(db, "PRAGMA table_info(users)");

    const emailColumn = getColumnName(columns, [
      "email",
      "useremail",
      "user_email",
    ]);

    const passwordColumn = getColumnName(columns, [
      "password",
      "passwordhash",
      "password_hash",
      "pass",
    ]);

    if (!emailColumn) {
      throw new Error("No email column found in users table.");
    }

    if (!passwordColumn) {
      throw new Error("No password column found in users table.");
    }

    const uidColumn = getColumnName(columns, ["uid", "user_id", "userid"]);
    const nameColumn = getColumnName(columns, ["name", "fullname", "full_name"]);
    const roleColumn = getColumnName(columns, ["role"]);
    const statusColumn = getColumnName(columns, ["status"]);

    const departmentColumn = getColumnName(columns, [
      "department",
      "departmentname",
      "department_name",
    ]);

    const positionColumn = getColumnName(columns, [
      "position",
      "designation",
      "jobtitle",
      "job_title",
    ]);

    const createdAtColumn = getColumnName(columns, ["createdat", "created_at"]);
    const updatedAtColumn = getColumnName(columns, ["updatedat", "updated_at"]);

    const isSuperAdminColumn = getColumnName(columns, [
      "issuperadmin",
      "is_superadmin",
      "superadmin",
    ]);

    const existingUser = await get(
      db,
      `SELECT * FROM users WHERE LOWER(${emailColumn}) = LOWER(?) LIMIT 1`,
      [SUPERADMIN.email]
    );

    const hashedPassword = await bcrypt.hash(SUPERADMIN.password, 10);

    if (existingUser) {
      const updateFields = [];
      const updateValues = [];

      updateFields.push(`${passwordColumn} = ?`);
      updateValues.push(hashedPassword);

      if (nameColumn) {
        updateFields.push(`${nameColumn} = ?`);
        updateValues.push(SUPERADMIN.name);
      }

      if (roleColumn) {
        updateFields.push(`${roleColumn} = ?`);
        updateValues.push(SUPERADMIN.role);
      }

      if (statusColumn) {
        updateFields.push(`${statusColumn} = ?`);
        updateValues.push("active");
      }

      if (departmentColumn) {
        updateFields.push(`${departmentColumn} = ?`);
        updateValues.push(SUPERADMIN.department);
      }

      if (positionColumn) {
        updateFields.push(`${positionColumn} = ?`);
        updateValues.push(SUPERADMIN.position);
      }

      if (isSuperAdminColumn) {
        updateFields.push(`${isSuperAdminColumn} = ?`);
        updateValues.push(1);
      }

      if (updatedAtColumn) {
        updateFields.push(`${updatedAtColumn} = ?`);
        updateValues.push(sqlNow());
      }

      updateValues.push(SUPERADMIN.email);

      await run(
        db,
        `UPDATE users SET ${updateFields.join(
          ", "
        )} WHERE LOWER(${emailColumn}) = LOWER(?)`,
        updateValues
      );

      console.log("Existing superadmin updated successfully.");
    } else {
      const insertData = {};

      if (uidColumn) insertData[uidColumn] = randomId();
      if (nameColumn) insertData[nameColumn] = SUPERADMIN.name;

      insertData[emailColumn] = SUPERADMIN.email;
      insertData[passwordColumn] = hashedPassword;

      if (roleColumn) insertData[roleColumn] = SUPERADMIN.role;
      if (statusColumn) insertData[statusColumn] = "active";
      if (departmentColumn) insertData[departmentColumn] = SUPERADMIN.department;
      if (positionColumn) insertData[positionColumn] = SUPERADMIN.position;
      if (isSuperAdminColumn) insertData[isSuperAdminColumn] = 1;
      if (createdAtColumn) insertData[createdAtColumn] = sqlNow();
      if (updatedAtColumn) insertData[updatedAtColumn] = sqlNow();

      for (const column of columns) {
        const columnName = column.name;
        const lower = String(columnName || "").toLowerCase();

        if (insertData[columnName] !== undefined) continue;
        if (column.pk) continue;
        if (!column.notnull) continue;
        if (column.dflt_value !== null && column.dflt_value !== undefined) {
          continue;
        }

        if (lower.includes("date") || lower.includes("time")) {
          insertData[columnName] = sqlNow();
        } else if (lower.includes("role")) {
          insertData[columnName] = SUPERADMIN.role;
        } else if (lower.includes("status")) {
          insertData[columnName] = "active";
        } else {
          insertData[columnName] = "";
        }
      }

      const fields = Object.keys(insertData);
      const placeholders = fields.map(() => "?").join(", ");
      const values = fields.map((field) => insertData[field]);

      await run(
        db,
        `INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders})`,
        values
      );

      console.log("New superadmin created successfully.");
    }

    console.log("");
    console.log("SUPERADMIN LOGIN CREATED");
    console.log("------------------------");
    console.log("Email:    ", SUPERADMIN.email);
    console.log("Password: ", SUPERADMIN.password);
    console.log("Role:     ", SUPERADMIN.role);
    console.log("");
    console.log("Now login from the webapp using the above email and password.");
  } catch (error) {
    console.error("");
    console.error("Failed to create superadmin:");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await close(db);
  }
}

main();