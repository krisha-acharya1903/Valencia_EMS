import fs from "fs";
import path from "path";
import { db } from "./database.js";

const CLEAR_EXISTING_PROJECTS = true;

const realProjects = [
  {
    name: "Aroma De Valencia",
    department: "Aroma De Valencia",
    managerName: "Nirav Sanghavi",
    openTasks: 24,
    colorIndex: 3,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_161_91fcb1cc",
  },
  {
    name: "Bounce Super Water",
    department: "Bounce Super Water",
    managerName: "Hrithik Jain",
    openTasks: 1,
    colorIndex: 0,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_171_9fcc6d8a",
  },
  {
    name: "Can Beverages",
    department: "Can Beverages",
    managerName: "Jay Shah",
    openTasks: 10,
    colorIndex: 0,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_170_fc33a075",
  },
  {
    name: "Creatives",
    department: "Creatives",
    managerName: "Siddharth Kinagi",
    openTasks: 85,
    colorIndex: 5,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_166_2f5123db",
  },
  {
    name: "Crunzzo",
    department: "Crunzzo",
    managerName: "Jay Shah",
    openTasks: 10,
    colorIndex: 1,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_162_b67062cf",
  },
  {
    name: "ERP / Accounts / Finance",
    department: "ERP / Accounts / Finance",
    managerName: "Manish Turakhia",
    openTasks: 26,
    colorIndex: 8,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_165_226d3401",
  },
  {
    name: "High Altitude Water",
    department: "High Altitude Water",
    managerName: "Bijoy Shah",
    openTasks: 20,
    colorIndex: 0,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_172_af33db8e",
  },
  {
    name: "Natal Care",
    department: "Natal Care",
    managerName: "Riya Doshi",
    openTasks: 76,
    colorIndex: 10,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_163_e53839bb",
  },
  {
    name: "Sales Team",
    department: "Sales Team",
    managerName: "Hrithik Jain",
    openTasks: 2,
    colorIndex: 9,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_167_70cd3c1c",
  },
  {
    name: "Soda Fountain Machine",
    department: "Soda Fountain Machine",
    managerName: "Harsh Golvaskar",
    openTasks: 13,
    colorIndex: 0,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_169_fbbf8272",
  },
  {
    name: "Software",
    department: "Software Team",
    managerName: "Premal Mehta",
    openTasks: 13,
    colorIndex: 4,
    visibility: "All internal users and invited portal users",
    taskLabel: "Tasks",
    odooExternalId: "__export__.project_project_160_e7871625",
  },
  {
    name: "Vending Machine",
    department: "Vending Machine",
    managerName: "Mehul Dekivadia",
    openTasks: 9,
    colorIndex: 2,
    visibility: "All internal users and invited portal users",
    taskLabel: "Jio x Valencia Collaboration",
    odooExternalId: "__export__.project_project_168_64a5d039",
  },
];

function getIndianTimestamp() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffsetMs);
  return istDate.toISOString().slice(0, 19).replace("T", " ");
}

function tableExists(tableName) {
  const row = db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = ?
    `
    )
    .get(tableName);

  return Boolean(row);
}

function columnExists(tableName, columnName) {
  if (!tableExists(tableName)) return false;

  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName, columnName, definition) {
  if (!tableExists(tableName)) return;

  if (!columnExists(tableName, columnName)) {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`).run();
    console.log(`Added column: ${tableName}.${columnName}`);
  }
}

function createProjectsTableIfMissing() {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      description TEXT,
      department TEXT,
      status TEXT DEFAULT 'active',
      priority TEXT DEFAULT 'medium',
      start_date TEXT,
      end_date TEXT,
      progress INTEGER DEFAULT 0,
      manager_id INTEGER,
      members TEXT DEFAULT '[]',
      created_by INTEGER,
      created_at TEXT,
      updated_at TEXT
    )
  `
  ).run();
}

function backupExistingData() {
  const backupDir = path.join(process.cwd(), "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  const backup = {
    createdAt: new Date().toISOString(),
    projects: tableExists("projects")
      ? db.prepare("SELECT * FROM projects").all()
      : [],
    tasks: tableExists("tasks") ? db.prepare("SELECT * FROM tasks").all() : [],
    subtasks: tableExists("subtasks")
      ? db.prepare("SELECT * FROM subtasks").all()
      : [],
  };

  const backupPath = path.join(backupDir, `project-backup-${stamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");

  console.log(`Backup created: ${backupPath}`);
}

function findUserByName(name) {
  if (!tableExists("users")) return null;

  return (
    db
      .prepare(
        `
        SELECT *
        FROM users
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
      `
      )
      .get(name) || null
  );
}

function findImporterUserId() {
  if (!tableExists("users")) return null;

  const admin =
    db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE role IN ('superAdmin', 'admin')
        ORDER BY CASE WHEN role = 'superAdmin' THEN 0 ELSE 1 END, id ASC
        LIMIT 1
      `
      )
      .get() || null;

  return admin?.id || null;
}

function priorityFromOpenTasks(openTasks) {
  const count = Number(openTasks || 0);

  if (count >= 50) return "high";
  if (count >= 10) return "medium";
  return "low";
}

function makeDescription(project) {
  return [
    `Imported real project from Odoo export.`,
    `Project manager: ${project.managerName}.`,
    `Open task count from export: ${project.openTasks}.`,
    `Visibility: ${project.visibility}.`,
    `Task label: ${project.taskLabel}.`,
    `External ID: ${project.odooExternalId}.`,
  ].join(" ");
}

function insertProject(project, createdBy) {
  const now = getIndianTimestamp();
  const manager = findUserByName(project.managerName);

  const existing = db
    .prepare(
      `
      SELECT *
      FROM projects
      WHERE odoo_external_id = ?
         OR LOWER(TRIM(name)) = LOWER(TRIM(?))
      LIMIT 1
    `
    )
    .get(project.odooExternalId, project.name);

  const payload = {
    name: project.name,
    description: makeDescription(project),
    department: project.department,
    status: "active",
    priority: priorityFromOpenTasks(project.openTasks),
    start_date: "",
    end_date: "",
    progress: 0,
    manager_id: manager?.id || null,
    members: "[]",
    created_by: createdBy,
    updated_at: now,
    manager_name: project.managerName,
    open_tasks: Number(project.openTasks || 0),
    pending_tasks: Number(project.openTasks || 0),
    odoo_external_id: project.odooExternalId,
    visibility: project.visibility,
    task_label: project.taskLabel,
    color_index: Number(project.colorIndex || 0),
    project_source: "odoo_excel_import",
  };

  if (existing) {
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
          updated_at = ?,
          manager_name = ?,
          open_tasks = ?,
          pending_tasks = ?,
          odoo_external_id = ?,
          visibility = ?,
          task_label = ?,
          color_index = ?,
          project_source = ?
      WHERE id = ?
    `
    ).run(
      payload.name,
      payload.description,
      payload.department,
      payload.status,
      payload.priority,
      payload.start_date,
      payload.end_date,
      payload.progress,
      payload.manager_id,
      payload.members,
      payload.updated_at,
      payload.manager_name,
      payload.open_tasks,
      payload.pending_tasks,
      payload.odoo_external_id,
      payload.visibility,
      payload.task_label,
      payload.color_index,
      payload.project_source,
      existing.id
    );

    return {
      action: "updated",
      id: existing.id,
      name: project.name,
    };
  }

  const result = db.prepare(
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
      updated_at,
      manager_name,
      open_tasks,
      pending_tasks,
      odoo_external_id,
      visibility,
      task_label,
      color_index,
      project_source
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    payload.name,
    payload.description,
    payload.department,
    payload.status,
    payload.priority,
    payload.start_date,
    payload.end_date,
    payload.progress,
    payload.manager_id,
    payload.members,
    payload.created_by,
    now,
    payload.updated_at,
    payload.manager_name,
    payload.open_tasks,
    payload.pending_tasks,
    payload.odoo_external_id,
    payload.visibility,
    payload.task_label,
    payload.color_index,
    payload.project_source
  );

  return {
    action: "inserted",
    id: result.lastInsertRowid,
    name: project.name,
  };
}

function main() {
  createProjectsTableIfMissing();

  ensureColumn("projects", "progress", "INTEGER DEFAULT 0");
  ensureColumn("projects", "status", "TEXT DEFAULT 'active'");
  ensureColumn("projects", "priority", "TEXT DEFAULT 'medium'");
  ensureColumn("projects", "manager_id", "INTEGER");
  ensureColumn("projects", "members", "TEXT DEFAULT '[]'");
  ensureColumn("projects", "manager_name", "TEXT");
  ensureColumn("projects", "open_tasks", "INTEGER DEFAULT 0");
  ensureColumn("projects", "pending_tasks", "INTEGER DEFAULT 0");
  ensureColumn("projects", "odoo_external_id", "TEXT");
  ensureColumn("projects", "visibility", "TEXT");
  ensureColumn("projects", "task_label", "TEXT");
  ensureColumn("projects", "color_index", "INTEGER DEFAULT 0");
  ensureColumn("projects", "project_source", "TEXT");

  backupExistingData();

  const createdBy = findImporterUserId();

  const transaction = db.transaction(() => {
    if (CLEAR_EXISTING_PROJECTS) {
      if (tableExists("subtasks")) {
        db.prepare("DELETE FROM subtasks").run();
      }

      if (tableExists("tasks")) {
        db.prepare("DELETE FROM tasks").run();
      }

      db.prepare("DELETE FROM projects").run();

      console.log("Old projects/tasks cleared.");
    }

    const results = realProjects.map((project) => insertProject(project, createdBy));

    return results;
  });

  const results = transaction();

  const totalOpenTasks = realProjects.reduce(
    (sum, project) => sum + Number(project.openTasks || 0),
    0
  );

  console.log("");
  console.log("Real projects imported successfully.");
  console.table(results);
  console.log(`Total projects imported: ${realProjects.length}`);
  console.log(`Total open task count from Excel: ${totalOpenTasks}`);
  console.log("");
  console.log("Now restart backend/frontend and refresh /admin/projects.");
}

main();