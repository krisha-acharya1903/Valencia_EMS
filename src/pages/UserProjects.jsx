import { ArrowRight, FolderKanban, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../services/api";

function extractArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.assignedProjects)) return response.assignedProjects;
  if (Array.isArray(response?.assigned_projects)) return response.assigned_projects;
  if (Array.isArray(response?.tasks)) return response.tasks;
  if (Array.isArray(response?.assignedTasks)) return response.assignedTasks;
  if (Array.isArray(response?.assigned_tasks)) return response.assigned_tasks;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function safeParseArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];

      return [];
    } catch {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (typeof value === "object") return [value];

  return [];
}

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function getProjectId(project, index) {
  return String(
    project?.id ||
      project?._id ||
      project?.projectId ||
      project?.project_id ||
      project?.slug ||
      `project-${index}`
  );
}

function getTaskProjectId(task) {
  return String(
    task?.project_id ||
      task?.projectId ||
      task?.projectID ||
      task?.parentProjectId ||
      task?.parent_project_id ||
      ""
  );
}

function getTaskId(task, index) {
  return String(task?.id || task?._id || task?.taskId || task?.task_id || index);
}

function getProjectTitle(project, index) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    `Project ${index + 1}`
  );
}

function getProjectStatus(project) {
  return clean(project?.status || project?.projectStatus || "active");
}

function getTasks(project) {
  return safeParseArray(
    project?.tasks ||
      project?.taskList ||
      project?.task_list ||
      project?.todos ||
      project?.toDos ||
      project?.checklist
  );
}

function isTaskDone(task) {
  if (!task || typeof task !== "object") return false;

  const status = clean(task?.status || task?.state || "");

  return (
    task?.completed === true ||
    task?.done === true ||
    task?.isCompleted === true ||
    status === "done" ||
    status === "complete" ||
    status === "completed" ||
    status === "finished"
  );
}

function getProjectStats(project) {
  const tasks = getTasks(project);

  const total =
    Number(project?.totalTasks) ||
    Number(project?.total_tasks) ||
    Number(project?.taskCount) ||
    Number(project?.task_count) ||
    tasks.length ||
    0;

  const completed =
    Number(project?.completedTasks) ||
    Number(project?.completed_tasks) ||
    Number(project?.doneTasks) ||
    Number(project?.done_tasks) ||
    tasks.filter(isTaskDone).length ||
    0;

  const explicitProgress =
    project?.progress ??
    project?.progressPercent ??
    project?.progress_percent ??
    project?.completion ??
    project?.completionPercent ??
    project?.completion_percent;

  const progress =
    total > 0
      ? Math.round((completed / total) * 100)
      : explicitProgress !== undefined && explicitProgress !== null
        ? Math.max(0, Math.min(100, Number(explicitProgress) || 0))
        : 0;

  return {
    total,
    completed,
    progress,
  };
}

function collectMembers(project) {
  return [
    project?.members,
    project?.member,
    project?.assignedMembers,
    project?.assigned_members,
    project?.assignedUsers,
    project?.assigned_users,
    project?.assignedEmployees,
    project?.assigned_employees,
    project?.users,
    project?.employees,
  ].flatMap((field) => safeParseArray(field));
}

function getPersonName(person, index) {
  if (typeof person === "string") return person;

  return (
    person?.name ||
    person?.fullName ||
    person?.full_name ||
    person?.displayName ||
    person?.display_name ||
    person?.employeeName ||
    person?.employee_name ||
    person?.email ||
    `U${index + 1}`
  );
}

function initialsFromName(name) {
  const parts = String(name || "U").split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return String(parts[0] || "U").slice(0, 2).toUpperCase();
}

function getVisibleAssignees(project) {
  const members = collectMembers(project);

  return members.slice(0, 4).map((person, index) => {
    const name = getPersonName(person, index);

    return {
      id:
        typeof person === "string"
          ? person
          : person?.id || person?._id || person?.email || name,
      initials: initialsFromName(name),
      color:
        index % 4 === 0
          ? "bg-[#6675ff]"
          : index % 4 === 1
            ? "bg-[#ff6b35]"
            : index % 4 === 2
              ? "bg-[#35c6ad]"
              : "bg-[#cfd6e4]",
    };
  });
}

function getFolderColor(index) {
  const colors = [
    "from-[#fff0b8] via-[#ffedbd] to-[#ffe7a8]",
    "from-[#ffe3ee] via-[#ffe4f0] to-[#ffddeb]",
    "from-[#e7f4ff] via-[#dff2ff] to-[#d5ebff]",
    "from-[#e9fff4] via-[#ddfbe9] to-[#d1f4df]",
    "from-[#f3e9ff] via-[#eadcff] to-[#dfd1ff]",
    "from-[#fff0e8] via-[#ffe4d7] to-[#ffd9c9]",
  ];

  return colors[index % colors.length];
}

function getSearchText(project, index) {
  const taskText = getTasks(project)
    .map((task) =>
      typeof task === "string"
        ? task
        : [
            task?.title,
            task?.name,
            task?.taskTitle,
            task?.task_title,
            task?.description,
            task?.status,
            task?.priority,
            task?.end_date,
            task?.endDate,
            task?.dueDate,
          ]
            .filter(Boolean)
            .join(" ")
    )
    .join(" ");

  return [
    getProjectTitle(project, index),
    project?.description,
    project?.department,
    project?.departmentName,
    project?.division,
    project?.status,
    project?.priority,
    project?.endDate,
    project?.end_date,
    project?.deadline,
    taskText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

async function tryLoadProjectsFromBackend() {
  const endpoints = [
    "/my-projects",
    "/employee-assigned-projects",
    "/employees/me/projects",
    "/employee/me/projects",
    "/projects/me",
    "/me/projects",
    "/projects",
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await apiGet(endpoint);
      const projects = extractArray(response).filter((project) => {
        const status = getProjectStatus(project);

        return (
          status !== "deleted" &&
          status !== "archived" &&
          status !== "removed"
        );
      });

      if (projects.length > 0) {
        console.log("USER PROJECTS LOADED FROM:", endpoint, projects);
        return projects;
      }

      console.log("USER PROJECTS EMPTY FROM:", endpoint);
    } catch (error) {
      lastError = error;
      console.warn("USER PROJECTS ENDPOINT FAILED:", endpoint, error?.message);
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

async function tryLoadTasksFromBackend() {
  const endpoints = [
    "/tasks/my-tasks",
    "/tasks/me",
    "/employees/me/tasks",
    "/employee/me/tasks",
    "/me/tasks",
    "/tasks",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await apiGet(endpoint);
      const tasks = extractArray(response);

      if (tasks.length > 0) {
        console.log("USER TASKS LOADED FROM:", endpoint, tasks);
        return tasks;
      }

      console.log("USER TASKS EMPTY FROM:", endpoint);
    } catch (error) {
      console.warn("USER TASKS ENDPOINT FAILED:", endpoint, error?.message);
    }
  }

  return [];
}

function mergeProjectTasks(projects, tasks) {
  if (!tasks.length) return projects;

  return projects.map((project, projectIndex) => {
    const projectId = getProjectId(project, projectIndex);
    const existingTasks = getTasks(project);

    const projectTasks = tasks.filter((task) => {
      const taskProjectId = getTaskProjectId(task);
      return taskProjectId && String(taskProjectId) === String(projectId);
    });

    const merged = [];
    const seen = new Set();

    [...existingTasks, ...projectTasks].forEach((task, index) => {
      const key = getTaskId(task, index);

      if (seen.has(key)) return;

      seen.add(key);
      merged.push(task);
    });

    const completed = merged.filter(isTaskDone).length;
    const total = merged.length;
    const progress = total ? Math.round((completed / total) * 100) : 0;

    return {
      ...project,

      tasks: merged,
      taskList: merged,
      task_list: merged,

      totalTasks: total,
      total_tasks: total,

      completedTasks: completed,
      completed_tasks: completed,

      pendingTasks: Math.max(total - completed, 0),
      pending_tasks: Math.max(total - completed, 0),

      progress,
    };
  });
}

function ProjectFolderCard({ project, index, onOpen }) {
  const title = getProjectTitle(project, index);
  const stats = getProjectStats(project);
  const assignees = getVisibleAssignees(project);
  const totalPeople = collectMembers(project).length;
  const extraCount = Math.max(0, totalPeople - 4);
  const folderColor = getFolderColor(index);
  const tasks = getTasks(project);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative h-[250px] w-[300px] overflow-hidden rounded-[22px] bg-gradient-to-br ${folderColor} p-6 text-left shadow-[0_12px_26px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.13)]`}
    >
      <div className="absolute left-0 top-0 h-[46px] w-[96px] rounded-br-[30px] bg-white/55" />
      <div className="absolute left-[70px] top-0 h-[30px] w-[65px] skew-x-[35deg] bg-white/55" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-5 flex -space-x-2">
          {assignees.map((person) => (
            <div
              key={person.id}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-white ${person.color}`}
            >
              {person.initials}
            </div>
          ))}

          {extraCount > 0 ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#cfd6e4] text-[10px] font-black text-white">
              +{extraCount}
            </div>
          ) : null}
        </div>

        <h3 className="line-clamp-2 min-h-[56px] text-[23px] font-black leading-tight text-[#a86d5c]">
          {title}
        </h3>

        <p className="mt-1 text-[15px] font-bold text-[#a86d5c]">
          {stats.completed}/{stats.total} Tasks
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/85">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#ff6b35]"
              style={{ width: `${stats.progress}%` }}
            />
          </div>

          <span className="text-[15px] font-black text-[#ff6b35]">
            {stats.progress}%
          </span>
        </div>

        {tasks.length > 0 ? (
          <div className="mt-4 space-y-1">
            {tasks.slice(0, 2).map((task, taskIndex) => (
              <div
                key={
                  task?.id ||
                  task?._id ||
                  task?.taskId ||
                  task?.task_id ||
                  `${title}-${taskIndex}`
                }
                className="flex items-center gap-2 text-[11px] font-bold text-[#9a6a58]"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    isTaskDone(task) ? "bg-green-500" : "bg-[#ff6b35]"
                  }`}
                />
                <span className="truncate">
                  {task?.title ||
                    task?.name ||
                    task?.taskTitle ||
                    task?.task_title ||
                    `Task ${taskIndex + 1}`}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-4 text-[12px] font-black text-[#9a6a58]">
          <span>View details</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
}

export default function UserProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        setLoading(true);

        const [loadedProjects, loadedTasks] = await Promise.all([
          tryLoadProjectsFromBackend(),
          tryLoadTasksFromBackend(),
        ]);

        const mergedProjects = mergeProjectTasks(loadedProjects, loadedTasks);

        if (active) {
          setProjects(mergedProjects);
        }
      } catch (error) {
        console.error("Failed to load employee projects:", error);

        if (active) {
          setProjects([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return projects;

    return projects.filter((project, index) =>
      getSearchText(project, index).includes(query)
    );
  }, [projects, searchTerm]);

  function openProject(project, index) {
    const projectId = getProjectId(project, index);

    navigate(`/dashboard/projects/${projectId}`, {
      state: {
        project,
      },
    });
  }

  return (
    <div className="min-h-screen bg-white px-10 py-8 text-black">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-[26px] font-black text-black">My Projects</h1>
          <p className="mt-2 text-[15px] font-bold text-[#777]">
            View your assigned projects and tasks
          </p>
        </div>

        <div className="flex h-11 w-[330px] items-center gap-2 rounded-full border border-[#efefef] bg-white px-4 shadow-[0_7px_22px_rgba(0,0,0,0.08)] max-sm:w-full">
          <Search size={17} className="text-[#ff6b35]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search projects or tasks..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-black outline-none placeholder:text-[#aaa]"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb]">
          <p className="text-[15px] font-black text-[#777]">
            Loading your assigned projects...
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-[#fffaf7] px-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0ea] text-[#ff6b35]">
            <FolderKanban size={34} />
          </div>

          <h2 className="text-[20px] font-black text-black">
            {searchTerm.trim()
              ? "No matching projects or tasks found."
              : "No projects assigned yet."}
          </h2>

          <p className="mt-2 max-w-[430px] text-[14px] font-semibold leading-6 text-[#777]">
            {searchTerm.trim()
              ? "Try searching with a different project name, task title, status, priority or due date."
              : "Only projects and tasks assigned to this employee profile will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,300px))] gap-x-12 gap-y-12">
          {filteredProjects.map((project, index) => (
            <ProjectFolderCard
              key={
                project?.id ||
                project?._id ||
                project?.projectId ||
                project?.project_id ||
                project?.name ||
                index
              }
              project={project}
              index={index}
              onOpen={() => openProject(project, index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}