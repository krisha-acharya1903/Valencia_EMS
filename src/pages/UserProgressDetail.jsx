import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListChecks,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import Badge from "../components/Badge";
import Button from "../components/Button";
import StatCard from "../components/StatCard";
import { getAllAttendance } from "../services/attendanceService";
import { getProjects } from "../services/projectService";
import { getTasks } from "../services/taskService";
import { getUsers } from "../services/userService";

function normalizeId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeStatus(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .trim();
}

function isCompleted(value) {
  return ["completed", "complete", "done", "closed"].includes(
    normalizeStatus(value)
  );
}

function isInProgress(value) {
  return [
    "in progress",
    "in_progress",
    "ongoing",
    "working",
    "started",
    "active",
    "progress",
  ].includes(normalizeStatus(value));
}

function normalizeUser(user) {
  return {
    ...user,
    uid: normalizeId(user.uid || user.id),
  };
}

function normalizeProject(project) {
  return {
    ...project,
    id: normalizeId(project.id),
    name: project.name || project.title || "Untitled Project",
    members: Array.isArray(project.members)
      ? project.members.map(String)
      : [],
    status: project.status || "open",
  };
}

function normalizeTask(task) {
  return {
    ...task,
    id: normalizeId(task.id),
    projectId: normalizeId(task.projectId || task.project_id),
    assignedTo: normalizeId(task.assignedTo || task.assigned_to),
    title: task.title || "Untitled Task",
    status: task.status || "Pending",
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
  };
}

function normalizeAttendance(item) {
  return {
    ...item,
    id: normalizeId(item.id || item.attendanceId || item.attendance_id),
    userId: normalizeId(item.userId || item.user_id),
  };
}

function getInitials(name = "") {
  const words = name.trim().split(" ").filter(Boolean);

  if (!words.length) return "U";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getTaskStats(tasks) {
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter((task) => isCompleted(task.status)).length;
  const inProgressTasks = tasks.filter((task) => isInProgress(task.status)).length;
  const pendingTasks = Math.max(totalTasks - completedTasks - inProgressTasks, 0);

  let totalItems = 0;
  let completedItems = 0;

  tasks.forEach((task) => {
    totalItems += 1;

    if (isCompleted(task.status)) {
      completedItems += 1;
    }

    task.subtasks.forEach((subtask) => {
      totalItems += 1;

      if (isCompleted(subtask.status)) {
        completedItems += 1;
      }
    });
  });

  const progressPercentage =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    totalItems,
    completedItems,
    progressPercentage,
  };
}

function getAttendanceStats(attendance) {
  const presentDays = attendance.filter((item) => {
    const status = normalizeStatus(item.status);
    return (
      status === "present" ||
      Boolean(item.checkIn || item.check_in || item.clockIn || item.clock_in)
    );
  }).length;

  const totalDays = attendance.length;

  const attendancePercentage =
    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  return {
    totalDays,
    presentDays,
    attendancePercentage,
  };
}

function formatStatus(value) {
  const status = String(value || "Pending").replaceAll("_", " ");

  return status.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function UserProgressDetail() {
  const { userId } = useParams();

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);

      const [usersResult, projectResult, taskResult, attendanceResult] =
        await Promise.allSettled([
          getUsers(),
          getProjects({ role: "admin" }),
          getTasks({ role: "admin" }),
          getAllAttendance(),
        ]);

      if (usersResult.status !== "fulfilled") {
        throw usersResult.reason;
      }

      const cleanUsers = (usersResult.value || []).map(normalizeUser);
      const selectedUser = cleanUsers.find(
        (item) => normalizeId(item.uid || item.id) === normalizeId(userId)
      );

      if (!selectedUser) {
        setUser(null);
        return;
      }

      const cleanTasks =
        taskResult.status === "fulfilled"
          ? (taskResult.value || []).map(normalizeTask)
          : [];

      const cleanProjects =
        projectResult.status === "fulfilled"
          ? (projectResult.value || []).map(normalizeProject)
          : [];

      const cleanAttendance =
        attendanceResult.status === "fulfilled"
          ? (attendanceResult.value || []).map(normalizeAttendance)
          : [];

      if (projectResult.status !== "fulfilled") {
        console.error("Project load error:", projectResult.reason);
      }

      if (taskResult.status !== "fulfilled") {
        console.error("Task load error:", taskResult.reason);
      }

      if (attendanceResult.status !== "fulfilled") {
        console.error("Attendance load error:", attendanceResult.reason);
      }

      const selectedTasks = cleanTasks.filter(
        (task) => normalizeId(task.assignedTo) === normalizeId(userId)
      );

      const selectedProjects = cleanProjects.filter((project) => {
        const isMember = project.members.includes(normalizeId(userId));

        const hasAssignedTask = cleanTasks.some(
          (task) =>
            normalizeId(task.projectId) === normalizeId(project.id) &&
            normalizeId(task.assignedTo) === normalizeId(userId)
        );

        return isMember || hasAssignedTask;
      });

      const selectedAttendance = cleanAttendance.filter(
        (item) => normalizeId(item.userId) === normalizeId(userId)
      );

      setUser(selectedUser);
      setTasks(selectedTasks);
      setProjects(selectedProjects);
      setAttendance(selectedAttendance);
    } catch (error) {
      console.error("User progress load error:", error);
      toast.error(error.message || "Failed to load user progress.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const taskStats = useMemo(() => getTaskStats(tasks), [tasks]);
  const attendanceStats = useMemo(
    () => getAttendanceStats(attendance),
    [attendance]
  );

  const projectTasksMap = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter(
        (task) => normalizeId(task.projectId) === normalizeId(project.id)
      );

      return {
        ...project,
        tasks: projectTasks,
      };
    });
  }, [projects, tasks]);

  if (loading) {
    return (
      <main className="page-shell">
        <div className="mobile-frame">
          <section className="card p-8 text-center text-valencia-muted">
            Loading employee progress...
          </section>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-shell">
        <div className="mobile-frame space-y-5">
          <section className="card p-8 text-center text-valencia-muted">
            User not found.
          </section>

          <Link to="/users">
            <Button variant="secondary" icon={ArrowLeft}>
              Back to Users
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-valencia-muted">
              <Link to="/admin" className="hover:text-valencia-orangeDark">
                Dashboard
              </Link>
              <span>/</span>
              <Link to="/users" className="hover:text-valencia-orangeDark">
                Users
              </Link>
              <span>/</span>
              <span>{user.name || "Employee"}</span>
              <span>/</span>
              <span>Progress</span>
            </div>

            <h1 className="text-3xl font-black">Employee Progress</h1>
            <p className="muted mt-1">
              Track assigned projects, tasks, subtasks, work completion, and attendance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/users">
              <Button variant="secondary" icon={ArrowLeft}>
                Back to Users
              </Button>
            </Link>

            <Link to={`/users/${userId}/attendance`}>
              <Button icon={CalendarDays}>View Attendance</Button>
            </Link>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl font-black text-valencia-navy">
              {getInitials(user.name)}
            </div>

            <div>
              <p className="label">Employee</p>
              <h2 className="mt-1 text-2xl font-black text-valencia-navy">
                {user.name || "Unnamed User"}
              </h2>
              <p className="muted mt-1">
                {user.email || "No email"} • {user.department || "No department"} •{" "}
                {user.designation || "No designation"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge value={user.status || "active"} />
                <Badge value={user.role || "employee"} />
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard icon={ListChecks} label="Total Tasks" value={taskStats.totalTasks} />
          <StatCard icon={CheckCircle2} label="Completed" value={taskStats.completedTasks} tone="green" />
          <StatCard icon={Clock} label="In Progress" value={taskStats.inProgressTasks} tone="blue" />
          <StatCard icon={CalendarDays} label="Attendance" value={`${attendanceStats.attendancePercentage}%`} tone="orange" />
        </div>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="label">Overall Work Progress</p>
              <h2 className="mt-1 text-2xl font-black text-valencia-navy">
                {taskStats.progressPercentage}% Completed
              </h2>
            </div>

            <BarChart3 className="text-valencia-orangeDark" size={28} />
          </div>

          <div className="h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-valencia-orange transition-all"
              style={{ width: `${taskStats.progressPercentage}%` }}
            />
          </div>

          <p className="muted mt-3 text-sm">
            {taskStats.completedItems} of {taskStats.totalItems} total task and subtask items completed.
          </p>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-valencia-line p-5">
            <h2 className="text-xl font-black">Assigned Tasks</h2>
          </div>

          <div className="divide-y divide-valencia-line">
            {tasks.map((task) => (
              <article key={task.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-valencia-navy">
                      {task.title}
                    </h3>
                    <p className="muted mt-1 text-sm">
                      Project ID: {task.projectId || "-"}
                    </p>
                  </div>

                  <Badge value={formatStatus(task.status)} />
                </div>

                <div className="mt-4 grid gap-2">
                  {task.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-valencia-line bg-slate-50 p-3 text-sm"
                    >
                      <span className="font-semibold text-valencia-navy">
                        {subtask.title}
                      </span>
                      <Badge value={formatStatus(subtask.status)} />
                    </div>
                  ))}

                  {!task.subtasks.length ? (
                    <p className="text-sm text-valencia-muted">
                      No subtasks added for this task.
                    </p>
                  ) : null}
                </div>
              </article>
            ))}

            {!tasks.length ? (
              <p className="p-5 text-sm text-valencia-muted">
                No tasks assigned to this employee yet.
              </p>
            ) : null}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-valencia-line p-5">
            <h2 className="text-xl font-black">Assigned Projects</h2>
          </div>

          <div className="divide-y divide-valencia-line">
            {projectTasksMap.map((project) => (
              <article key={project.id} className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-lg font-black text-valencia-navy hover:text-valencia-orangeDark"
                    >
                      {project.name}
                    </Link>
                    <p className="muted mt-1 text-sm">
                      {project.tasks.length} assigned task(s)
                    </p>
                  </div>

                  <Badge value={project.status || "open"} />
                </div>
              </article>
            ))}

            {!projectTasksMap.length ? (
              <p className="p-5 text-sm text-valencia-muted">
                No project assignments found for this employee.
              </p>
            ) : null}
          </div>
        </section>

        <Link to={`/users/${userId}/attendance`}>
          <Button className="w-full" icon={CalendarDays}>
            View Full Attendance
          </Button>
        </Link>
      </div>
    </main>
  );
}