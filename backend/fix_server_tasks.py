from pathlib import Path

SERVER_FILE = Path("server.js")

if not SERVER_FILE.exists():
    raise SystemExit("server.js not found. Put this file inside the backend folder where server.js exists.")

text = SERVER_FILE.read_text(encoding="utf-8")

backup = Path("server.backup-before-assigned-task-fix-v2.js")
backup.write_text(text, encoding="utf-8")
print("Backup created:", backup)


def replace_once(old, new, label):
    global text

    if new in text:
        print(f"Already patched: {label}")
        return

    if old not in text:
        print(f"Skipped, old block not found: {label}")
        return

    text = text.replace(old, new, 1)
    print(f"Patched: {label}")


def insert_before(marker, insertion, check_text, label):
    global text

    if check_text in text:
        print(f"Already inserted: {label}")
        return

    if marker not in text:
        raise SystemExit(f"Could not find marker for: {label}")

    text = text.replace(marker, insertion + "\n" + marker, 1)
    print(f"Inserted: {label}")


def replace_between(start_marker, end_marker, replacement, label):
    global text

    if replacement.strip() in text:
        print(f"Already patched: {label}")
        return

    start = text.find(start_marker)
    end = text.find(end_marker, start if start != -1 else 0)

    if start == -1 or end == -1:
        print(f"Skipped, section not found: {label}")
        return

    text = text[:start] + replacement + text[end:]
    print(f"Patched: {label}")


# 1. Ensure task columns exist.
replace_once(
'''ensureColumn("tasks", "completed_at", "TEXT");
ensureColumn("subtasks", "status", "TEXT DEFAULT 'Pending'");''',
'''ensureColumn("tasks", "project_id", "INTEGER");
ensureColumn("tasks", "title", "TEXT DEFAULT ''");
ensureColumn("tasks", "description", "TEXT DEFAULT ''");
ensureColumn("tasks", "status", "TEXT DEFAULT 'Pending'");
ensureColumn("tasks", "priority", "TEXT DEFAULT 'Normal'");
ensureColumn("tasks", "start_date", "TEXT DEFAULT ''");
ensureColumn("tasks", "end_date", "TEXT DEFAULT ''");
ensureColumn("tasks", "assigned_to", "INTEGER");
ensureColumn("tasks", "department", "TEXT DEFAULT ''");
ensureColumn("tasks", "created_by", "INTEGER");
ensureColumn("tasks", "completed_at", "TEXT");
ensureColumn("tasks", "created_at", "TEXT");
ensureColumn("tasks", "updated_at", "TEXT");

ensureColumn("subtasks", "status", "TEXT DEFAULT 'Pending'");''',
"task schema columns"
)


# 2. Add V2 helper block.
helper_block = r'''
/* ---------------- ASSIGNED TASK PERMANENCE FIX V2 ---------------- */

function getIncomingTaskAssigneeValueV2(source = {}) {
  return (
    source.assigned_to ??
    source.assignedTo ??
    source.assigned_to_id ??
    source.assignedToId ??
    source.assigneeId ??
    source.assignee_id ??
    source.assignee ??
    source.employeeId ??
    source.employee_id ??
    source.userId ??
    source.user_id ??
    source.assignedUser ??
    source.assigned_user ??
    source.assignedEmployee ??
    source.assigned_employee ??
    null
  );
}

function resolveTaskAssigneeIdV2(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const raw = Array.isArray(value) ? value[0] : value;

  const matchedUser = findUserForProjectMember(raw);

  if (matchedUser?.id) {
    return matchedUser.id;
  }

  if (typeof raw === "object" && raw) {
    const possibleId =
      raw.id ||
      raw._id ||
      raw.uid ||
      raw.userId ||
      raw.user_id ||
      raw.employeeId ||
      raw.employee_id ||
      "";

    if (possibleId) {
      return possibleId;
    }

    const possibleEmail = raw.email || raw.userEmail || raw.user_email || "";

    if (possibleEmail) {
      const user = db
        .prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1")
        .get(possibleEmail);

      if (user?.id) return user.id;
    }

    const possibleName =
      raw.name ||
      raw.fullName ||
      raw.full_name ||
      raw.displayName ||
      raw.display_name ||
      raw.employeeName ||
      raw.employee_name ||
      "";

    if (possibleName) {
      const user = db
        .prepare("SELECT id FROM users WHERE LOWER(name) = LOWER(?) LIMIT 1")
        .get(possibleName);

      if (user?.id) return user.id;
    }
  }

  return raw;
}

function getSingleProjectMemberAssigneeV2(project) {
  const members = parseProjectMembers(project?.members)
    .map(normalizeProjectMember)
    .filter(Boolean);

  if (members.length !== 1) return null;

  return resolveTaskAssigneeIdV2(members[0], null);
}

function getIncomingProjectTasksV2(body = {}) {
  const incoming =
    body.tasks ??
    body.taskList ??
    body.task_list ??
    body.todos ??
    body.toDos ??
    body.checklist ??
    body.assignedTasks ??
    body.assigned_tasks ??
    [];

  return parseProjectMembers(incoming);
}

function getIncomingTaskTitleV2(task = {}) {
  return String(
    task.title ||
      task.name ||
      task.taskTitle ||
      task.task_title ||
      task.taskName ||
      task.task_name ||
      task.text ||
      task.label ||
      ""
  ).trim();
}

function normalizeAssignedTaskV2(task) {
  if (!task) return null;

  return {
    ...task,

    id: task.id,
    taskId: task.id,
    task_id: task.id,

    title: task.title || "",
    name: task.title || "",
    taskTitle: task.title || "",
    task_title: task.title || "",
    taskName: task.title || "",
    task_name: task.title || "",

    description: task.description || "",
    details: task.description || "",

    projectId: task.project_id || "",
    project_id: task.project_id || "",

    projectName: task.project_name || "",
    project_name: task.project_name || "",

    status: task.status || "Pending",
    priority: task.priority || "Normal",

    startDate: task.start_date || "",
    start_date: task.start_date || "",

    endDate: task.end_date || "",
    end_date: task.end_date || "",
    dueDate: task.end_date || "",
    due_date: task.end_date || "",
    deadline: task.end_date || "",

    assignedTo: task.assigned_to || "",
    assigned_to: task.assigned_to || "",

    createdAt: task.created_at || "",
    created_at: task.created_at || "",

    updatedAt: task.updated_at || "",
    updated_at: task.updated_at || "",
  };
}

function saveIncomingProjectTasksV2({ projectId, tasks, actor, project }) {
  const incomingTasks = Array.isArray(tasks) ? tasks : parseProjectMembers(tasks);

  if (!projectId || incomingTasks.length === 0) return [];

  const savedTasks = [];

  for (const incomingTask of incomingTasks) {
    if (!incomingTask) continue;

    const title = getIncomingTaskTitleV2(incomingTask);
    if (!title) continue;

    const existingTaskId =
      incomingTask.id ||
      incomingTask._id ||
      incomingTask.taskId ||
      incomingTask.task_id ||
      null;

    const existingTask = existingTaskId
      ? db
          .prepare(
            `
            SELECT *
            FROM tasks
            WHERE id = ?
              AND CAST(project_id AS TEXT) = CAST(? AS TEXT)
            LIMIT 1
          `
          )
          .get(existingTaskId, projectId)
      : null;

    const resolvedAssignedTo =
      resolveTaskAssigneeIdV2(
        getIncomingTaskAssigneeValueV2(incomingTask),
        existingTask?.assigned_to
      ) || getSingleProjectMemberAssigneeV2(project);

    const description = String(
      incomingTask.description ??
        incomingTask.details ??
        existingTask?.description ??
        ""
    );

    const status = normalizeStatus(
      incomingTask.status ?? existingTask?.status ?? "Pending"
    );

    const priority = String(
      incomingTask.priority ?? existingTask?.priority ?? "Normal"
    );

    const startDate = String(
      incomingTask.start_date ??
        incomingTask.startDate ??
        existingTask?.start_date ??
        ""
    );

    const endDate = String(
      incomingTask.end_date ??
        incomingTask.endDate ??
        incomingTask.due_date ??
        incomingTask.dueDate ??
        incomingTask.deadline ??
        existingTask?.end_date ??
        ""
    );

    const assigneeUser = resolvedAssignedTo
      ? db.prepare("SELECT * FROM users WHERE id = ?").get(resolvedAssignedTo)
      : null;

    const department =
      project?.department ||
      assigneeUser?.department ||
      incomingTask.department ||
      existingTask?.department ||
      actor?.department ||
      "";

    const nowIST = getIndianTimestamp();
    let savedTaskId = existingTask?.id || null;

    if (existingTask) {
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
            department = ?,
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
        resolvedAssignedTo || existingTask.assigned_to || null,
        department,
        isDoneStatus(status) ? nowIST : null,
        nowIST,
        existingTask.id
      );

      savedTaskId = existingTask.id;
    } else {
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
          projectId,
          title,
          description,
          status,
          priority,
          startDate,
          endDate,
          resolvedAssignedTo || null,
          department,
          actor?.id || null,
          isDoneStatus(status) ? nowIST : null,
          nowIST,
          nowIST
        );

      savedTaskId = result.lastInsertRowid;
    }

    const savedTask = getTaskWithSubtasks(savedTaskId);

    if (savedTask) {
      savedTasks.push(savedTask);

      if (
        savedTask.assigned_to &&
        (!existingTask ||
          String(existingTask.assigned_to || "") !==
            String(savedTask.assigned_to || ""))
      ) {
        notifyTaskAssignment(savedTask, actor, "Task assigned");
      }

      recordEmployeeActivity({
        userId: savedTask.assigned_to,
        role: "employee",
        department: savedTask.department || "",
        actionType: "task_assigned",
        title: "Task assigned",
        message: savedTask.title || "A task was assigned to you.",
        entityType: "task",
        entityId: savedTask.id,
        createdBy: actor?.id || null,
      });
    }
  }

  recalculateProjectProgress(projectId);

  return savedTasks;
}

function buildEmployeeProjectCardsV2(user) {
  const projects = getAssignedProjectsForEmployee(user);
  const assignedTasks = getAssignedTasksForEmployee(user.id);

  const projectIdSet = new Set(projects.map((project) => String(project.id)));

  const projectCards = projects.map((project) => {
    const tasks = assignedTasks.filter(
      (task) => String(task.project_id || "") === String(project.id)
    );

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) =>
      isDoneStatus(task.status)
    ).length;

    const progress = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : Number(project.progress || 0);

    return {
      ...normalizeProject(project),

      tasks: tasks.map(normalizeAssignedTaskV2).filter(Boolean),
      taskList: tasks.map(normalizeAssignedTaskV2).filter(Boolean),
      task_list: tasks.map(normalizeAssignedTaskV2).filter(Boolean),

      totalTasks,
      total_tasks: totalTasks,

      completedTasks,
      completed_tasks: completedTasks,

      pendingTasks: Math.max(totalTasks - completedTasks, 0),
      pending_tasks: Math.max(totalTasks - completedTasks, 0),

      progress,

      status:
        Number(progress) >= 100
          ? "completed"
          : String(project.status || "active").toLowerCase(),
    };
  });

  const standaloneTasks = assignedTasks.filter((task) => {
    const projectId = String(task.project_id || "");
    return !projectId || !projectIdSet.has(projectId);
  });

  if (standaloneTasks.length > 0) {
    const completedTasks = standaloneTasks.filter((task) =>
      isDoneStatus(task.status)
    ).length;

    const totalTasks = standaloneTasks.length;
    const progress = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const normalizedStandaloneTasks = standaloneTasks
      .map(normalizeAssignedTaskV2)
      .filter(Boolean);

    projectCards.push({
      id: "assigned-tasks",
      name: "Assigned Tasks",
      title: "Assigned Tasks",
      projectName: "Assigned Tasks",
      description: "Tasks assigned directly to you.",
      department: user.department || "",
      division: user.department || "",
      departmentName: user.department || "",
      status: progress >= 100 ? "completed" : "active",
      priority: "medium",
      progress,
      managerId: "",
      manager_id: "",
      members: [
        {
          id: String(user.id),
          uid: String(user.id),
          userId: String(user.id),
          user_id: String(user.id),
          employeeId: String(user.id),
          employee_id: String(user.id),
          name: user.name || "",
          email: user.email || "",
          department: user.department || "",
          role: user.role || "employee",
        },
      ],
      member: [],
      assignedMembers: [],
      assigned_members: [],
      assignedUsers: [],
      assigned_users: [],
      assignedEmployees: [],
      assigned_employees: [],
      users: [],
      employees: [],
      startDate: "",
      start_date: "",
      deadline: "",
      endDate: "",
      end_date: "",
      createdBy: "",
      created_by: "",
      createdAt: standaloneTasks[0]?.created_at || "",
      created_at: standaloneTasks[0]?.created_at || "",
      updatedAt: standaloneTasks[0]?.updated_at || "",
      updated_at: standaloneTasks[0]?.updated_at || "",

      tasks: normalizedStandaloneTasks,
      taskList: normalizedStandaloneTasks,
      task_list: normalizedStandaloneTasks,

      totalTasks,
      total_tasks: totalTasks,

      completedTasks,
      completed_tasks: completedTasks,

      pendingTasks: Math.max(totalTasks - completedTasks, 0),
      pending_tasks: Math.max(totalTasks - completedTasks, 0),
    });
  }

  return projectCards;
}

function sendMyAssignedTasksV2(req, res) {
  try {
    const tasks = getAssignedTasksForEmployee(req.user.id)
      .map(normalizeAssignedTaskV2)
      .filter(Boolean);

    res.json({
      success: true,
      total: tasks.length,
      tasks,
      assignedTasks: tasks,
      assigned_tasks: tasks,
    });
  } catch (error) {
    console.error("My assigned tasks error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load assigned tasks.",
    });
  }
}

function sendMyAssignedProjectsV2(req, res) {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "This route is only available for employees.",
      });
    }

    const projects = buildEmployeeProjectCardsV2(req.user);

    res.json({
      success: true,
      total: projects.length,
      projects,
      assignedProjects: projects,
      assigned_projects: projects,
    });
  } catch (error) {
    console.error("My assigned projects error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load assigned projects.",
    });
  }
}

'''

insert_before(
"/* ---------------- TASKS ---------------- */",
helper_block,
"function getIncomingTaskAssigneeValueV2(source = {})",
"assigned-task V2 helpers"
)


# 3. Replace GET /api/projects section and add aliases before /api/projects/:id.
replace_between(
'app.get("/api/projects", authRequired, (req, res) => {',
'app.get("/api/projects/:id", authRequired, (req, res) => {',
'''app.get("/api/projects", authRequired, (req, res) => {
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
        .all()
        .map(normalizeProject);
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
        .all(req.user.department, req.user.id)
        .map(normalizeProject);
    } else {
      projects = buildEmployeeProjectCardsV2(req.user);
    }

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load projects.",
    });
  }
});

app.get("/api/employees/me/projects", authRequired, sendMyAssignedProjectsV2);
app.get("/api/employee/me/projects", authRequired, sendMyAssignedProjectsV2);
app.get("/api/projects/me", authRequired, sendMyAssignedProjectsV2);
app.get("/api/me/projects", authRequired, sendMyAssignedProjectsV2);

''',
"GET projects + employee project aliases"
)


# 4. Add task aliases.
insert_before(
'app.get("/api/tasks", authRequired, (req, res) => {',
'''app.get("/api/tasks/my-tasks", authRequired, sendMyAssignedTasksV2);
app.get("/api/tasks/me", authRequired, sendMyAssignedTasksV2);
app.get("/api/employees/me/tasks", authRequired, sendMyAssignedTasksV2);
app.get("/api/employee/me/tasks", authRequired, sendMyAssignedTasksV2);
app.get("/api/me/tasks", authRequired, sendMyAssignedTasksV2);
''',
'app.get("/api/tasks/my-tasks", authRequired, sendMyAssignedTasksV2);',
"employee task aliases"
)


# 5. Replace POST /api/tasks.
replace_between(
'app.post("/api/tasks", authRequired, (req, res) => {',
'app.patch("/api/tasks/:id", authRequired, (req, res) => {',
'''app.post("/api/tasks", authRequired, (req, res) => {
  try {
    const projectId = req.body.project_id || req.body.projectId || null;

    const title = String(
      req.body.title ||
        req.body.name ||
        req.body.taskTitle ||
        req.body.task_title ||
        req.body.taskName ||
        req.body.task_name ||
        ""
    ).trim();

    const description = String(req.body.description || req.body.details || "");
    const status = req.body.status || "Pending";
    const priority = req.body.priority || "Normal";

    const startDate = String(
      req.body.start_date || req.body.startDate || ""
    ).trim();

    const endDate = String(
      req.body.end_date ||
        req.body.endDate ||
        req.body.due_date ||
        req.body.dueDate ||
        req.body.deadline ||
        ""
    ).trim();

    if (!title) {
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

    if (projectId) {
      project = getProjectById(projectId);

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

    const resolvedAssignedTo =
      resolveTaskAssigneeIdV2(getIncomingTaskAssigneeValueV2(req.body), null) ||
      getSingleProjectMemberAssigneeV2(project);

    if (!resolvedAssignedTo) {
      return res.status(400).json({
        success: false,
        message: "Assigned employee is required.",
      });
    }

    const assignee = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(resolvedAssignedTo);

    if (!assignee) {
      return res.status(404).json({
        success: false,
        message: "Assigned employee was not found.",
      });
    }

    const finalDepartment =
      project?.department ||
      assignee.department ||
      req.body.department ||
      req.user.department ||
      "";

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
        projectId,
        title,
        description,
        finalStatus,
        priority,
        startDate,
        endDate,
        resolvedAssignedTo,
        finalDepartment,
        req.user.id,
        isDoneStatus(finalStatus) ? nowIST : null,
        nowIST,
        nowIST
      );

    const task = getTaskWithSubtasks(result.lastInsertRowid);

    notifyTaskAssignment(task, req.user, "Task assigned");

    if (projectId) {
      recalculateProjectProgress(projectId);
    }

    res.json({
      success: true,
      task: normalizeAssignedTaskV2(task),
    });
  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create task.",
    });
  }
});

''',
"POST /api/tasks"
)


# 6. Patch project create response.
replace_once(
'''const project = getProjectById(result.lastInsertRowid);

    notifyProjectAssignment(project, req.user, "Project assigned");

    res.json({
      success: true,
      project: normalizeProject(project),
    });''',
'''let project = getProjectById(result.lastInsertRowid);

    saveIncomingProjectTasksV2({
      projectId: project.id,
      tasks: getIncomingProjectTasksV2(req.body),
      actor: req.user,
      project,
    });

    recalculateProjectProgress(project.id);

    project = getProjectById(project.id);

    notifyProjectAssignment(project, req.user, "Project assigned");

    res.json({
      success: true,
      project: {
        ...normalizeProject(project),
        tasks: db
          .prepare(
            "SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC, id DESC"
          )
          .all(project.id)
          .map(normalizeAssignedTaskV2)
          .filter(Boolean),
      },
    });''',
"project create saves tasks"
)


# 7. Patch project update response.
replace_once(
'''const updated = getProjectById(id);

    notifyProjectAssignment(updated, req.user, "Project updated");

    res.json({
      success: true,
      project: normalizeProject(updated),
    });''',
'''let updated = getProjectById(id);

    saveIncomingProjectTasksV2({
      projectId: updated.id,
      tasks: getIncomingProjectTasksV2(req.body),
      actor: req.user,
      project: updated,
    });

    recalculateProjectProgress(updated.id);

    updated = getProjectById(id);

    notifyProjectAssignment(updated, req.user, "Project updated");

    res.json({
      success: true,
      project: {
        ...normalizeProject(updated),
        tasks: db
          .prepare(
            "SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC, id DESC"
          )
          .all(updated.id)
          .map(normalizeAssignedTaskV2)
          .filter(Boolean),
      },
    });''',
"project update saves tasks"
)


SERVER_FILE.write_text(text, encoding="utf-8")

print("")
print("DONE: server.js updated successfully.")
print("Backup file:", backup)
print("")
print("Now restart backend:")
print("node server.js")