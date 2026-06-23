const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const args = process.argv.slice(2);

const name = args[0] || "Jay More";
const email = args[1] || "jaymore@valencia.com";
const password = args[2] || "Jay@12345";

const dbCandidates = [
  path.join(__dirname, "..", "valencia.db"),
  path.join(__dirname, "..", "database.sqlite"),
  path.join(__dirname, "..", "database.db"),
  path.join(__dirname, "..", "data.db"),
];

const dbPath = dbCandidates.find((file) => fs.existsSync(file)) || dbCandidates[0];

console.log("Using database:", dbPath);

const db = new Database(dbPath);

function getColumns(tableName) {
  return db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map((column) => column.name);
}

function hasColumn(tableName, columnName) {
  return getColumns(tableName).includes(columnName);
}

function addColumnIfMissing(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
    console.log(`Added column: ${tableName}.${columnName}`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'employee',
    department TEXT,
    designation TEXT,
    phone TEXT,
    is_account_administrator INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

addColumnIfMissing("users", "is_account_administrator", "INTEGER NOT NULL DEFAULT 0");
addColumnIfMissing("users", "created_by", "INTEGER");
addColumnIfMissing("users", "updated_at", "TEXT");

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

const columns = getColumns("users");
const passwordHash = bcrypt.hashSync(password, 10);

const existingUser = db.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email);

db.prepare("UPDATE users SET is_account_administrator = 0 WHERE role = 'employee'").run();

if (existingUser) {
  const updateFields = [];

  if (columns.includes("name")) updateFields.push("name = @name");
  if (columns.includes("role")) updateFields.push("role = @role");
  if (columns.includes("password_hash")) updateFields.push("password_hash = @password_hash");
  if (columns.includes("password")) updateFields.push("password = @password_hash");
  if (columns.includes("is_account_administrator")) updateFields.push("is_account_administrator = 1");
  if (columns.includes("updated_at")) updateFields.push("updated_at = CURRENT_TIMESTAMP");

  db.prepare(`
    UPDATE users
    SET ${updateFields.join(", ")}
    WHERE id = @id
  `).run({
    id: existingUser.id,
    name,
    role: "employee",
    password_hash: passwordHash,
  });

  console.log("Updated existing employee as Account Administrator:");
  console.log({ name, email, password, role: "employee", isAccountAdministrator: true });
} else {
  const insertData = {};

  if (columns.includes("name")) insertData.name = name;
  if (columns.includes("email")) insertData.email = email;
  if (columns.includes("password_hash")) insertData.password_hash = passwordHash;
  if (columns.includes("password")) insertData.password = passwordHash;
  if (columns.includes("role")) insertData.role = "employee";
  if (columns.includes("designation")) insertData.designation = "Account Administrator";
  if (columns.includes("department")) insertData.department = "Administration";
  if (columns.includes("division")) insertData.division = "Administration";
  if (columns.includes("phone")) insertData.phone = "";
  if (columns.includes("is_account_administrator")) insertData.is_account_administrator = 1;
  if (columns.includes("created_at")) insertData.created_at = new Date().toISOString();
  if (columns.includes("updated_at")) insertData.updated_at = new Date().toISOString();

  const keys = Object.keys(insertData);
  const placeholders = keys.map((key) => `@${key}`);

  const result = db.prepare(`
    INSERT INTO users (${keys.join(", ")})
    VALUES (${placeholders.join(", ")})
  `).run(insertData);

  console.log("Created Account Administrator employee:");
  console.log({
    id: result.lastInsertRowid,
    name,
    email,
    password,
    role: "employee",
    isAccountAdministrator: true,
  });
}

db.close();