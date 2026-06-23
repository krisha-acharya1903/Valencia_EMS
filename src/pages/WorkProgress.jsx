import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Columns3,
  ListChecks,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/Button";
import Input from "../components/Input";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { updateTask } from "../services/taskService";
import { getWorkProgress } from "../services/workProgressService";

const views = [
  { key: "status", label: "Status", icon: ListChecks },
  { key: "gantt", label: "Gantt", icon: BarChart3 },
  { key: "kanban", label: "Kanban", icon: Columns3 },
];

const statusOptions = [
  { label: "All Status", value: "all" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "In Review", value: "review" },
  { label: "Completed", value: "completed" },
  { label: "Overdue", value: "overdue" },
];

const kanbanColumns = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "In Review" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
];

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function normalizeStatus(value) {
  const status = normalize(value);

  if (!status) return "todo";

  if (
    [
      "todo",
      "to do",
      "pending",
      "not started",
      "open",
      "assigned",
      "planning",
    ].includes(status)
  ) {
    return "todo";
  }

  if (
    ["in progress", "progress", "working", "ongoing", "started"].includes(status)
  ) {
    return "in_progress";
  }

  if (["review", "in review", "under review", "submitted"].includes(status)) {
    return "review";
  }

  if (["completed", "complete", "done", "finished", "closed"].includes(status)) {
    return "completed";
  }

  if (["overdue", "late", "delayed"].includes(status)) {
    return "overdue";
  }

  return status.replaceAll(" ", "_");
}

function formatStatus(value) {
  const status = normalizeStatus(value);

  if (status === "todo") return "To Do";
  if (status === "in_progress") return "In Progress";
  if (status === "review") return "In Review";
  if (status === "completed") return "Completed";
  if (status === "overdue") return "Overdue";

  return String(value || "To Do")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function clampProgress(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getUserId(user) {
  return String(user?.uid || user?.id || user?.userId || user?.user_id || "");
}

function getProjectId(project) {
  return String(project?.id || project?.projectId || project?.project_id || "");
}

function getTaskProjectId(task) {
  return String(
    task?.projectId ||
      task?.project_id ||
      task?.project?.id ||
      task?.project?.projectId ||
      task?.project?.project_id ||
      ""
  );
}

function getTaskEmployeeId(task) {
  return String(
    task?.assignedTo ||
      task?.assigned_to ||
      task?.userId ||
      task?.user_id ||
      task?.employeeId ||
      task?.employee_id ||
      task?.employee?.id ||
      task?.employee?.uid ||
      ""
  );
}

function getProjectName(project) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    "Untitled Project"
  );
}

function getTaskTitle(task) {
  return task?.title || task?.name || task?.taskName || "Untitled Task";
}

function getEmployeeName(users, task) {
  if (task?.employee?.name) return task.employee.name;
  if (task?.user?.name) return task.user.name;
  if (task?.assignedUser?.name) return task.assignedUser.name;

  if (task?.employeeName || task?.employee_name) {
    return task.employeeName || task.employee_name;
  }

  const employeeId = getTaskEmployeeId(task);
  const user = users.find((item) => getUserId(item) === employeeId);

  return user?.name || user?.email || "Unassigned";
}

function getTaskProject(projects, task) {
  if (task?.project) return task.project;

  const projectId = getTaskProjectId(task);

  return projects.find((project) => getProjectId(project) === projectId) || null;
}

function getTaskProjectName(projects, task) {
  const project = getTaskProject(projects, task);

  return (
    project?.name ||
    project?.title ||
    task?.projectName ||
    task?.project_name ||
    "No Project"
  );
}

function getProjectDepartment(project) {
  return (
    project?.department ||
    project?.departmentName ||
    project?.department_name ||
    "-"
  );
}

function getProjectStatus(project) {
  return (
    project?.status ||
    project?.projectStatus ||
    project?.project_status ||
    "open"
  );
}

function getTaskDueDate(task) {
  return (
    task?.dueDate ||
    task?.due_date ||
    task?.deadline ||
    task?.endDate ||
    task?.end_date ||
    ""
  );
}

function getTaskStartDate(task) {
  return (
    task?.startDate ||
    task?.start_date ||
    task?.createdAt ||
    task?.created_at ||
    task?.assignedAt ||
    task?.assigned_at ||
    ""
  );
}

function isTaskOverdue(task) {
  const status = normalizeStatus(task.status);

  if (status === "completed") return false;
  if (status === "overdue") return true;

  const dueDate = getTaskDueDate(task);

  if (!dueDate) return false;

  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) return false;

  return date < new Date();
}

function getTaskProgress(task) {
  const directProgress =
    task?.progress ??
    task?.completion ??
    task?.completionPercentage ??
    task?.completion_percentage ??
    task?.progressPercentage ??
    task?.progress_percentage;

  if (directProgress !== undefined && directProgress !== null) {
    const parsed = Number(directProgress);

    if (Number.isFinite(parsed)) {
      return clampProgress(parsed);
    }
  }

  const subtasks = Array.isArray(task?.subtasks)
    ? task.subtasks
    : Array.isArray(task?.subTasks)
    ? task.subTasks
    : Array.isArray(task?.children)
    ? task.children
    : [];

  if (subtasks.length) {
    const completedSubtasks = subtasks.filter(
      (subtask) =>
        normalizeStatus(subtask?.status) === "completed" ||
        subtask?.isCompleted === true ||
        subtask?.completed === true
    ).length;

    return clampProgress((completedSubtasks / subtasks.length) * 100);
  }

  const status = normalizeStatus(task?.status);

  if (status === "completed") return 100;
  if (status === "review") return 75;
  if (status === "in_progress") return 50;
  if (status === "overdue") return 25;

  return 0;
}

function getProjectProgress(project, projectTasks) {
  if (projectTasks.length) {
    const completedTasks = projectTasks.filter(
      (task) => normalizeStatus(task.status) === "completed"
    ).length;

    return clampProgress((completedTasks / projectTasks.length) * 100);
  }

  const directProgress =
    project?.progress ??
    project?.completion ??
    project?.completionPercentage ??
    project?.completion_percentage;

  if (directProgress !== undefined && directProgress !== null) {
    return clampProgress(directProgress);
  }

  return 0;
}

function enrichTask(task, projects, users) {
  const project = getTaskProject(projects, task);
  const employeeName = getEmployeeName(users, task);
  const projectName = getTaskProjectName(projects, task);
  const status = isTaskOverdue(task) ? "overdue" : normalizeStatus(task.status);
  const progress = getTaskProgress({ ...task, status });

  return {
    ...task,
    id: String(
      task.id ||
        task.taskId ||
        task.task_id ||
        `${projectName}-${getTaskTitle(task)}`
    ),
    title: getTaskTitle(task),
    status,
    projectId: getTaskProjectId(task),
    assignedTo: getTaskEmployeeId(task),
    employee: {
      ...(task.employee || {}),
      name: employeeName,
    },
    project: {
      ...(project || task.project || {}),
      id: getTaskProjectId(task),
      name: projectName,
      department:
        project?.department ||
        project?.departmentName ||
        project?.department_name ||
        task?.department ||
        task?.departmentName ||
        task?.department_name ||
        "-",
    },
    startDate: getTaskStartDate(task),
    dueDate: getTaskDueDate(task),
    progress,
  };
}

export default function WorkProgress() {
  const { profile } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [view, setView] = useState("status");
  const [scale, setScale] = useState("week");
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: "",
    status: "all",
  });

  const load = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      const data = await getWorkProgress(profile);

      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
      setProjects(Array.isArray(data?.projects) ? data.projects : []);
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (error) {
      console.error("Work progress load error:", error);
      toast.error(error?.message || "Failed to load work progress.");
      setTasks([]);
      setProjects([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [profile]);

  const enrichedTasks = useMemo(() => {
    return tasks.map((task) => enrichTask(task, projects, users));
  }, [tasks, projects, users]);

  const projectCards = useMemo(() => {
    const query = normalize(filters.search);

    return projects
      .map((project) => {
        const projectId = getProjectId(project);

        const relatedTasks = enrichedTasks.filter(
          (task) => String(task.projectId) === String(projectId)
        );

        const projectName = getProjectName(project);
        const department = getProjectDepartment(project);
        const status = getProjectStatus(project);
        const progress = getProjectProgress(project, relatedTasks);

        const searchable = normalize(
          `${projectName} ${department} ${status} ${relatedTasks
            .map(
              (task) =>
                `${task.title} ${task.employee?.name || ""} ${task.status || ""}`
            )
            .join(" ")}`
        );

        return {
          id: projectId,
          project,
          name: projectName,
          department,
          status,
          progress,
          taskCount: relatedTasks.length,
          completedTasks: relatedTasks.filter(
            (task) => normalizeStatus(task.status) === "completed"
          ).length,
          relatedTasks,
          searchable,
        };
      })
      .filter((item) => !query || item.searchable.includes(query));
  }, [projects, enrichedTasks, filters.search]);

  const filteredTasks = useMemo(() => {
    const query = normalize(filters.search);
    const selectedStatus = filters.status;

    return enrichedTasks.filter((task) => {
      const project = getTaskProject(projects, task);

      const searchable = normalize(
        `${task.title} ${task.employee?.name || ""} ${
          task.project?.name || ""
        } ${task.project?.department || ""} ${project?.name || ""} ${
          project?.department || ""
        } ${task.status || ""}`
      );

      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus =
        selectedStatus === "all" ||
        normalizeStatus(task.status) === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [enrichedTasks, filters.search, filters.status, projects]);

  const visibleProjectCards = useMemo(() => {
    if (filters.status === "all") return projectCards;

    return projectCards.filter((project) =>
      project.relatedTasks.some(
        (task) => normalizeStatus(task.status) === filters.status
      )
    );
  }, [projectCards, filters.status]);

  const stats = useMemo(() => {
    return {
      inProgress: filteredTasks.filter(
        (task) => normalizeStatus(task.status) === "in_progress"
      ).length,
      review: filteredTasks.filter(
        (task) => normalizeStatus(task.status) === "review"
      ).length,
      completed: filteredTasks.filter(
        (task) => normalizeStatus(task.status) === "completed"
      ).length,
      overdue: filteredTasks.filter(
        (task) => normalizeStatus(task.status) === "overdue"
      ).length,
    };
  }, [filteredTasks]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "all",
    });
  };

  const changeTaskStatus = async (task, status) => {
    try {
      await updateTask(task.id, { ...task, status }, profile);
      toast.success(`${task.title} moved to ${formatStatus(status)}.`);
      await load();
    } catch (error) {
      toast.error(error?.message || "Failed to update task status.");
    }
  };

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section>
          <h1 className="text-3xl font-black sm:text-4xl">Work Progress</h1>

          <p className="muted mt-1">
            Search projects and track live progress across status, timeline, and
            Kanban views.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="In Progress" value={stats.inProgress} />
          <StatCard label="In Review" value={stats.review} tone="blue" />
          <StatCard label="Completed" value={stats.completed} tone="green" />
          <StatCard label="Overdue" value={stats.overdue} tone="red" />
        </div>

        <section className="card p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
            <Input
              icon={Search}
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search project, task, employee, department..."
            />

            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              className="h-11 rounded-md border border-valencia-line bg-white px-3 text-sm font-semibold text-valencia-navy"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <Button variant="secondary" icon={X} onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-valencia-line p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-valencia-navy">
                  Project Progress
                </h2>

                <p className="muted mt-1 text-sm">
                  {visibleProjectCards.length} project
                  {visibleProjectCards.length === 1 ? "" : "s"} matching your
                  search.
                </p>
              </div>

              <div className="mt-2 flex items-center gap-2 text-sm font-bold text-valencia-muted sm:mt-0">
                <BriefcaseBusiness size={17} />
                Progress Overview
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleProjectCards.map((item) => (
              <ProjectProgressCard key={item.id || item.name} item={item} />
            ))}
          </div>

          {!visibleProjectCards.length ? (
            <div className="p-8 text-center text-valencia-muted">
              No projects found for your search.
            </div>
          ) : null}
        </section>

        <div className="flex flex-wrap items-center gap-2">
          {views.map((item) => (
            <Button
              key={item.key}
              variant={view === item.key ? "primary" : "secondary"}
              icon={item.icon}
              onClick={() => setView(item.key)}
            >
              {item.label}
            </Button>
          ))}

          {view === "gantt" ? (
            <select
              value={scale}
              onChange={(event) => setScale(event.target.value)}
              className="h-10 rounded-md border border-valencia-line bg-white px-3 text-sm font-semibold text-valencia-navy"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          ) : null}
        </div>

        {view === "status" ? (
          <StatusProgressView
            projects={visibleProjectCards}
            tasks={filteredTasks}
          />
        ) : null}

        {view === "gantt" ? (
          <GanttProgressView
            projects={visibleProjectCards}
            tasks={filteredTasks}
            scale={scale}
          />
        ) : null}

        {view === "kanban" ? (
          <CleanKanbanView
            tasks={filteredTasks}
            onSelectTask={(task) =>
              toast(`${task.title}: ${Number(task.progress || 0)}% complete`)
            }
            onStatusChange={changeTaskStatus}
          />
        ) : null}

        {loading ? (
          <div className="fixed bottom-5 right-5 rounded-full bg-valencia-navy px-4 py-2 text-sm font-black text-white shadow-lift">
            Loading progress...
          </div>
        ) : null}
      </div>
    </main>
  );
}

function ProjectProgressCard({ item }) {
  return (
    <article className="rounded-xl border border-valencia-line bg-white p-4 transition hover:border-valencia-orange hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-valencia-navy">{item.name}</h3>

          <p className="mt-1 text-sm font-semibold text-valencia-muted">
            {item.department}
          </p>
        </div>

        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-valencia-orangeDark">
          {formatStatus(item.status)}
        </span>
      </div>

      <ProgressBar value={item.progress} size="large" />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-valencia-muted">
            Tasks
          </p>

          <p className="mt-1 text-xl font-black text-valencia-navy">
            {item.taskCount}
          </p>
        </div>

        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.1em] text-emerald-700">
            Completed
          </p>

          <p className="mt-1 text-xl font-black text-emerald-700">
            {item.completedTasks}
          </p>
        </div>
      </div>
    </article>
  );
}

function ProgressBar({ value, size = "normal" }) {
  const progress = clampProgress(value);

  return (
    <div className={size === "large" ? "mt-5" : "mt-3"}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-[0.1em] text-valencia-muted">
          Progress
        </span>

        <span
          className={
            size === "large"
              ? "text-lg font-black text-valencia-navy"
              : "text-sm font-black text-valencia-navy"
          }
        >
          {progress}%
        </span>
      </div>

      <div
        className={
          size === "large"
            ? "h-3 overflow-hidden rounded-full bg-slate-100"
            : "h-2 overflow-hidden rounded-full bg-slate-100"
        }
      >
        <div
          className="h-full rounded-full bg-valencia-orange transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function StatusProgressView({ projects, tasks }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-valencia-line p-5">
        <h2 className="text-2xl font-black text-valencia-navy">Status View</h2>

        <p className="muted mt-1 text-sm">
          Normal progress bars for every project and task.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {projects.map((project) => (
          <article
            key={project.id || project.name}
            className="rounded-xl border border-valencia-line bg-white p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-black text-valencia-navy">
                  {project.name}
                </h3>

                <p className="mt-1 text-sm font-semibold text-valencia-muted">
                  {project.department} • {project.completedTasks}/
                  {project.taskCount} tasks completed
                </p>
              </div>

              <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase text-valencia-orangeDark">
                {formatStatus(project.status)}
              </span>
            </div>

            <ProgressBar value={project.progress} />
          </article>
        ))}

        {!projects.length ? (
          <div className="rounded-xl border border-dashed border-valencia-line p-8 text-center text-valencia-muted">
            No project progress found.
          </div>
        ) : null}
      </div>

      <div className="border-t border-valencia-line p-5">
        <h3 className="text-xl font-black text-valencia-navy">Task Progress</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-valencia-line text-xs uppercase tracking-[0.1em] text-valencia-muted">
                <th className="px-3 py-3">Task</th>
                <th className="px-3 py-3">Project</th>
                <th className="px-3 py-3">Employee</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Progress</th>
                <th className="px-3 py-3">Due Date</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-valencia-line">
                  <td className="px-3 py-4 font-black text-valencia-navy">
                    {task.title}
                  </td>

                  <td className="px-3 py-4 font-semibold text-valencia-muted">
                    {task.project?.name || "No Project"}
                  </td>

                  <td className="px-3 py-4 font-semibold text-valencia-muted">
                    {task.employee?.name || "Unassigned"}
                  </td>

                  <td className="px-3 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-valencia-navy">
                      {formatStatus(task.status)}
                    </span>
                  </td>

                  <td className="min-w-[190px] px-3 py-4">
                    <ProgressBar value={task.progress} />
                  </td>

                  <td className="px-3 py-4 font-semibold text-valencia-muted">
                    {formatDate(task.dueDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!tasks.length ? (
            <div className="p-8 text-center text-valencia-muted">
              No tasks found.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GanttProgressView({ projects, tasks, scale }) {
  const rows = useMemo(() => {
    const projectRows = projects.map((project) => {
      const dates = project.relatedTasks
        .flatMap((task) => [task.startDate, task.dueDate])
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()));

      const fallbackStart = new Date();
      fallbackStart.setDate(fallbackStart.getDate() - 7);

      const fallbackEnd = new Date();
      fallbackEnd.setDate(fallbackEnd.getDate() + 21);

      const start = dates.length
        ? new Date(Math.min(...dates.map((date) => date.getTime())))
        : fallbackStart;

      const end = dates.length
        ? new Date(Math.max(...dates.map((date) => date.getTime())))
        : fallbackEnd;

      return {
        id: `project-${project.id}`,
        type: "project",
        title: project.name,
        subtitle: `${project.completedTasks}/${project.taskCount} tasks completed`,
        start,
        end,
        progress: project.progress,
        status: project.status,
      };
    });

    const taskRows = tasks.map((task) => {
      const fallbackStart = new Date();
      fallbackStart.setDate(fallbackStart.getDate() - 3);

      const fallbackEnd = new Date();
      fallbackEnd.setDate(fallbackEnd.getDate() + 7);

      const startDate = task.startDate ? new Date(task.startDate) : fallbackStart;
      const endDate = task.dueDate ? new Date(task.dueDate) : fallbackEnd;

      const start = Number.isNaN(startDate.getTime()) ? fallbackStart : startDate;
      const end = Number.isNaN(endDate.getTime()) ? fallbackEnd : endDate;

      return {
        id: `task-${task.id}`,
        type: "task",
        title: task.title,
        subtitle: task.project?.name || "No Project",
        start,
        end: end < start ? start : end,
        progress: task.progress,
        status: task.status,
      };
    });

    return [...projectRows, ...taskRows];
  }, [projects, tasks]);

  const timeline = useMemo(() => {
    const validDates = rows.flatMap((row) => [row.start, row.end]);

    const fallbackStart = new Date();
    fallbackStart.setDate(fallbackStart.getDate() - 7);

    const fallbackEnd = new Date();
    fallbackEnd.setDate(fallbackEnd.getDate() + 30);

    if (!validDates.length) {
      return {
        min: fallbackStart,
        max: fallbackEnd,
      };
    }

    const min = new Date(
      Math.min(...validDates.map((date) => date.getTime()))
    );

    const max = new Date(
      Math.max(...validDates.map((date) => date.getTime()))
    );

    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 2);

    if (scale === "month") {
      min.setDate(1);
      max.setMonth(max.getMonth() + 1);
    }

    if (scale === "day") {
      max.setDate(max.getDate() + 3);
    }

    return { min, max };
  }, [rows, scale]);

  const totalMs = Math.max(1, timeline.max.getTime() - timeline.min.getTime());

  const getLeft = (date) => {
    return Math.max(
      0,
      Math.min(100, ((date.getTime() - timeline.min.getTime()) / totalMs) * 100)
    );
  };

  const getWidth = (start, end) => {
    const left = getLeft(start);
    const right = getLeft(end);

    return Math.max(4, right - left);
  };

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-valencia-line p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-valencia-navy">
              Gantt Chart
            </h2>

            <p className="muted mt-1 text-sm">
              Timeline bars with progress filled inside each bar.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm font-black text-valencia-muted">
            <CalendarDays size={17} />
            {formatDate(timeline.min)} - {formatDate(timeline.max)}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {rows.map((row) => {
          const left = getLeft(row.start);
          const width = getWidth(row.start, row.end);
          const progress = clampProgress(row.progress);

          return (
            <article
              key={row.id}
              className="grid gap-3 rounded-xl border border-valencia-line bg-white p-4 lg:grid-cols-[260px_1fr]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                      row.type === "project"
                        ? "bg-orange-50 text-valencia-orangeDark"
                        : "bg-slate-100 text-valencia-navy"
                    }`}
                  >
                    {row.type}
                  </span>

                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-valencia-muted">
                    {formatStatus(row.status)}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-black text-valencia-navy">
                  {row.title}
                </h3>

                <p className="mt-1 text-xs font-semibold text-valencia-muted">
                  {row.subtitle}
                </p>

                <p className="mt-2 text-xs font-bold text-valencia-muted">
                  {formatDate(row.start)} - {formatDate(row.end)}
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-black text-valencia-muted">
                  <span>Progress</span>
                  <span className="text-valencia-navy">{progress}%</span>
                </div>

                <div className="relative h-10 rounded-full bg-slate-100">
                  <div
                    className="absolute top-1/2 h-5 -translate-y-1/2 overflow-hidden rounded-full bg-slate-300"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-valencia-orange"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {!rows.length ? (
          <div className="rounded-xl border border-dashed border-valencia-line p-8 text-center text-valencia-muted">
            No Gantt data found.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CleanKanbanView({ tasks, onSelectTask, onStatusChange }) {
  const grouped = useMemo(() => {
    return kanbanColumns.reduce((acc, column) => {
      acc[column.key] = tasks.filter(
        (task) => normalizeStatus(task.status) === column.key
      );
      return acc;
    }, {});
  }, [tasks]);

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-valencia-line p-5">
        <h2 className="text-2xl font-black text-valencia-navy">Kanban View</h2>

        <p className="muted mt-1 text-sm">
          Clean non-overlapping task board with progress inside every card.
        </p>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {kanbanColumns.map((column) => (
          <div
            key={column.key}
            className="min-h-[220px] rounded-xl border border-valencia-line bg-slate-50 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-[0.1em] text-valencia-navy">
                {column.label}
              </h3>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-valencia-muted shadow-sm">
                {grouped[column.key]?.length || 0}
              </span>
            </div>

            <div className="space-y-3">
              {(grouped[column.key] || []).map((task) => (
                <article
                  key={task.id}
                  className="rounded-xl border border-valencia-line bg-white p-4 shadow-sm transition hover:border-valencia-orange hover:shadow-card"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-black text-valencia-navy">
                        {task.title}
                      </h4>

                      {normalizeStatus(task.status) === "completed" ? (
                        <CheckCircle2
                          size={17}
                          className="shrink-0 text-emerald-600"
                        />
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs font-semibold text-valencia-muted">
                      {task.project?.name || "No Project"}
                    </p>

                    <p className="mt-1 text-xs text-valencia-muted">
                      Assigned to:{" "}
                      <span className="font-bold">
                        {task.employee?.name || "Unassigned"}
                      </span>
                    </p>

                    <ProgressBar value={task.progress} />

                    {task.dueDate ? (
                      <p className="mt-3 text-xs font-semibold text-valencia-muted">
                        Due: {formatDate(task.dueDate)}
                      </p>
                    ) : null}
                  </button>

                  <select
                    value={normalizeStatus(task.status)}
                    onChange={(event) =>
                      onStatusChange(task, event.target.value)
                    }
                    className="mt-3 h-9 w-full rounded-md border border-valencia-line bg-white px-2 text-xs font-bold text-valencia-navy"
                  >
                    {kanbanColumns.map((option) => (
                      <option key={option.key} value={option.key}>
                        Move to {option.label}
                      </option>
                    ))}
                  </select>
                </article>
              ))}

              {!grouped[column.key]?.length ? (
                <div className="rounded-lg border border-dashed border-valencia-line bg-white p-5 text-center text-sm font-semibold text-valencia-muted">
                  No tasks
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}