import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Megaphone,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as projectService from "../services/projectService";
import * as userService from "../services/userService";

const ORANGE = "#FF6B35";

function extractArray(response, keys = []) {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.projects)) return response.projects;

  return [];
}

function normalizeRole(role) {
  return String(role || "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .toLowerCase();
}

function getProjectName(project, index) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    `Project ${index + 1}`
  );
}

function getProjectProgress(project) {
  const directProgress =
    project?.progress ??
    project?.completion ??
    project?.percentage ??
    project?.progressPercentage ??
    project?.progress_percentage;

  const progressNumber = Number(directProgress);

  if (Number.isFinite(progressNumber)) {
    return Math.max(0, Math.min(100, Math.round(progressNumber)));
  }

  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];

  if (tasks.length > 0) {
    const completed = tasks.filter((task) => {
      const status = String(task?.status || "").toLowerCase();

      return (
        task?.done === true ||
        status === "done" ||
        status === "complete" ||
        status === "completed"
      );
    }).length;

    return Math.round((completed / tasks.length) * 100);
  }

  return 0;
}

function getPendingTasks(projects) {
  return projects.reduce((total, project) => {
    const tasks = Array.isArray(project?.tasks) ? project.tasks : [];

    if (tasks.length > 0) {
      return (
        total +
        tasks.filter((task) => {
          const status = String(task?.status || "").toLowerCase();

          return !(
            task?.done === true ||
            status === "done" ||
            status === "complete" ||
            status === "completed"
          );
        }).length
      );
    }

    const pending =
      Number(project?.pendingTasks) ||
      Number(project?.pending_tasks) ||
      Number(project?.openTasks) ||
      Number(project?.open_tasks) ||
      0;

    return total + pending;
  }, 0);
}

function StatCard({ icon: Icon, title, value, color = "orange", onClick }) {
  const iconClass =
    color === "blue"
      ? "bg-blue-50 text-blue-500"
      : color === "green"
      ? "bg-lime-100 text-green-600"
      : color === "red"
      ? "bg-red-50 text-red-500"
      : "bg-orange-50 text-[#FF6B35]";

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(15,23,42,0.09)]"
    >
      <div className="mb-7 flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon size={20} />
        </div>
      </div>

      <p className="text-[12px] font-black uppercase tracking-[0.08em] text-[#061638]">
        {title}
      </p>

      <p className="mt-3 text-[32px] font-black leading-none text-[#061638]">
        {value}
      </p>
    </Wrapper>
  );
}

function CircleProgress({ value }) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className="flex h-[96px] w-[96px] items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${ORANGE} ${
          progress * 3.6
        }deg, #e9eff8 0deg)`,
      }}
    >
      <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white">
        <span className="text-[23px] font-black text-[#061638]">
          {progress}%
        </span>
      </div>
    </div>
  );
}

function ProjectAnalyticsCard({ project, index }) {
  return (
    <div className="flex h-[235px] w-[145px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="max-h-[76px] overflow-hidden text-[15px] font-black leading-tight text-[#061638]">
        {getProjectName(project, index)}
      </h3>

      <div className="flex justify-center">
        <CircleProgress value={getProjectProgress(project)} />
      </div>
    </div>
  );
}

function AnnouncementCard({ type, badge, title, body }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-5 py-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[#FF6B35]">
          <Megaphone size={18} />
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#FF6B35]">
              {type}
            </span>

            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
              {badge}
            </span>
          </div>

          <h3 className="text-[18px] font-black text-[#061638]">{title}</h3>

          <p className="mt-2 text-[14px] font-medium leading-6 text-slate-500">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

function MonthFilter() {
  return (
    <button
      type="button"
      className="flex h-12 w-[170px] items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-[14px] font-black text-[#061638] shadow-sm transition hover:border-orange-200"
    >
      <span className="flex items-center gap-3">
        <CalendarDays size={18} />
        One Month
      </span>

      <ChevronDown size={15} className="text-slate-500" />
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      try {
        const [usersResponse, projectsResponse] = await Promise.allSettled([
          typeof userService.getUsers === "function"
            ? userService.getUsers()
            : Promise.resolve([]),
          typeof projectService.getAllProjects === "function"
            ? projectService.getAllProjects()
            : typeof projectService.getProjects === "function"
            ? projectService.getProjects()
            : Promise.resolve([]),
        ]);

        if (!active) return;

        if (usersResponse.status === "fulfilled") {
          setUsers(extractArray(usersResponse.value, ["users", "data"]));
        }

        if (projectsResponse.status === "fulfilled") {
          setProjects(
            extractArray(projectsResponse.value, ["projects", "data"])
          );
        }
      } catch {
        if (!active) return;
        setUsers([]);
        setProjects([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      active = false;
    };
  }, []);

  const employeeCount = useMemo(() => {
    const employees = users.filter((user) => {
      const role = normalizeRole(user?.role);
      return role === "employee" || role === "user" || role === "teammember";
    });

    return employees.length || users.length || 0;
  }, [users]);

  const activeProjects = useMemo(() => {
    return projects.filter((project) => {
      const status = String(project?.status || "").toLowerCase();

      return (
        status !== "aborted" &&
        status !== "cancelled" &&
        status !== "canceled" &&
        status !== "hold" &&
        status !== "on_hold"
      );
    });
  }, [projects]);

  const totalProjects = activeProjects.length || projects.length || 0;
  const pendingTasks = getPendingTasks(projects);

  const analyticsProjects = useMemo(() => {
    return projects.slice(0, 4);
  }, [projects]);

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section>
          <h1 className="text-[38px] font-black leading-tight tracking-[-0.04em] text-[#061638]">
            Enterprise Overview
          </h1>

          <p className="mt-1 text-[14px] font-medium text-slate-500">
            Real-time performance analytics for Valencia Nutrition EMS.
          </p>
        </section>

        <MonthFilter />

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-500">
            Loading dashboard...
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={UsersRound}
              title="Total Employees"
              value={employeeCount}
              color="orange"
              onClick={() => navigate("/admin/users")}
            />

            <StatCard
              icon={BriefcaseBusiness}
              title="Total Projects"
              value={totalProjects}
              color="blue"
              onClick={() => navigate("/admin/projects")}
            />

            <StatCard
              icon={CalendarDays}
              title="Pending Approvals"
              value={0}
              color="red"
              onClick={() => navigate("/admin/attendance-management")}
            />

            <StatCard
              icon={CheckCircle2}
              title="Pending Tasks"
              value={pendingTasks}
              color="green"
              onClick={() => navigate("/admin/projects")}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[20px] font-black text-[#061638]">
                Project Analytics
              </h2>

              <div className="flex items-center gap-5">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-400 transition hover:border-orange-200 hover:text-[#FF6B35]"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="text-[14px] font-black text-slate-500">
                  1 / 1
                </span>

                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-400 transition hover:border-orange-200 hover:text-[#FF6B35]"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {analyticsProjects.length ? (
              <div className="flex flex-wrap gap-4">
                {analyticsProjects.map((project, index) => (
                  <ProjectAnalyticsCard
                    key={project?.id || project?._id || index}
                    project={project}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[235px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
                No project analytics available.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <h2 className="mb-5 text-[22px] font-black text-[#061638]">
            Announcements
          </h2>

          <div className="space-y-3">
            <AnnouncementCard
              type="System Notice"
              badge="Today"
              title="EMS dashboard has been updated"
              body="The home dashboard now focuses on projects, approvals, pending tasks, announcements, and recent activity."
            />

            <AnnouncementCard
              type="Project Hours"
              badge="New"
              title="Project timelines are being reviewed"
              body="Department heads should keep project progress and attendance information updated for accurate analytics."
            />

            <AnnouncementCard
              type="Reminder"
              badge="This Week"
              title="Attendance and leave records need review"
              body="Review pending attendance items and leave requests before final monthly reporting."
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <h2 className="mb-5 text-[22px] font-black text-[#061638]">
            Recent Activity
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-[#FF6B35]">
                <ClipboardList size={17} />
              </div>

              <div>
                <p className="text-sm font-black text-[#061638]">
                  Dashboard overview loaded successfully
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Employee, project, task, and announcement data are visible.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <BriefcaseBusiness size={17} />
              </div>

              <div>
                <p className="text-sm font-black text-[#061638]">
                  Project analytics are available
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Use the Projects page to manage project data and assignments.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}