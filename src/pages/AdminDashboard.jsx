import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Megaphone,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import "./Admin.css";
import { useNavigate } from "react-router-dom";
import * as projectService from "../services/projectService";
import * as userService from "../services/userService";

const ORANGE = "#FF6B35";

function extractArray(response, key) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.[key])) return response[key];
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.projects)) return response.projects;
  return [];
}

function getProjectId(project, index = 0) {
  return String(
    project?.id ||
      project?._id ||
      project?.projectId ||
      project?.project_id ||
      index + 1
  );
}

function getProjectName(project, index = 0) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    `Project ${index + 1}`
  );
}

function getProjectStatus(project) {
  return String(project?.status || "active").toLowerCase();
}

function getProjectProgress(project) {
  const value = Number(
    project?.progress ??
      project?.completion ??
      project?.completionPercentage ??
      project?.completion_percentage ??
      0
  );

  return Math.max(0, Math.min(100, Math.round(value)));
}

function getProjectOpenTasks(project) {
  return Number(
    project?.open_tasks ??
      project?.openTasks ??
      project?.pending_tasks ??
      project?.pendingTasks ??
      project?.taskCount ??
      project?.task_count ??
      0
  );
}

function getUserRole(user) {
  return String(user?.role || user?.designation || "").toLowerCase();
}

function isVisibleEmployee(user) {
  const role = getUserRole(user);

  return role !== "superadmin" && role !== "super admin";
}

async function loadProjects() {
  if (typeof projectService.getAllProjects === "function") {
    return projectService.getAllProjects();
  }

  if (typeof projectService.getProjects === "function") {
    return projectService.getProjects();
  }

  if (typeof projectService.fetchProjects === "function") {
    return projectService.fetchProjects();
  }

  return [];
}

async function loadUsers() {
  if (typeof userService.getUsers === "function") {
    return userService.getUsers();
  }

  if (typeof userService.fetchUsers === "function") {
    return userService.fetchUsers();
  }

  if (typeof userService.getAllUsers === "function") {
    return userService.getAllUsers();
  }

  return [];
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboardData() {
    setLoading(true);

    try {
      const [projectResponse, userResponse] = await Promise.all([
        loadProjects(),
        loadUsers(),
      ]);

      setProjects(extractArray(projectResponse, "projects"));
      setUsers(extractArray(userResponse, "users"));
    } catch (error) {
      console.error("Admin dashboard load error:", error);
      setProjects([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const visibleUsers = useMemo(() => {
    return users.filter(isVisibleEmployee);
  }, [users]);

  const activeProjects = useMemo(() => {
    return projects.filter((project) => {
      const status = getProjectStatus(project);
      return status !== "deleted" && status !== "archived";
    });
  }, [projects]);

  const pendingTasks = useMemo(() => {
    return activeProjects.reduce(
      (sum, project) => sum + getProjectOpenTasks(project),
      0
    );
  }, [activeProjects]);

  return (
    <main className="page-shell">
      <div className="mobile-frame">
        <section className="mb-5">
          <h1 className="text-[34px] font-black leading-tight text-[#061638]">
            Enterprise Overview
          </h1>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Real-time performance analytics for Valencia Nutrition EMS.
          </p>

          <div className="mt-5">
            <RangeDropdown />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
          <div className="grid gap-5 sm:grid-cols-2">
            <DashboardStatCard
              icon={UsersRound}
              iconClass="bg-orange-50 text-[#FF6B35]"
              label="Total Employees"
              value={loading ? "..." : visibleUsers.length}
              onClick={() => navigate("/admin/users")}
            />

            <DashboardStatCard
              icon={Briefcase}
              iconClass="bg-blue-50 text-blue-500"
              label="Total Projects"
              value={loading ? "..." : activeProjects.length}
              onClick={() => navigate("/admin/projects")}
            />

            <DashboardStatCard
              icon={CalendarDays}
              iconClass="bg-red-50 text-red-500"
              label="Pending Approvals"
              value="0"
              onClick={() => navigate("/admin/attendance-management")}
            />

            <DashboardStatCard
              icon={CheckCircle2}
              iconClass="bg-green-100 text-green-600"
              label="Pending Tasks"
              value={loading ? "..." : pendingTasks}
              onClick={() => navigate("/admin/projects")}
            />
          </div>

          <ProjectAnalytics projects={activeProjects} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_390px]">
          <Announcements />
          <RecentActivity projects={activeProjects} users={visibleUsers} />
        </section>
      </div>
    </main>
  );
}

function RangeDropdown() {
  const [open, setOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState("One Month");

  const ranges = ["One Week", "Two Weeks", "Three Weeks", "One Month"];

  return (
    <div className="relative w-[170px]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-[14px] font-black text-[#061638] shadow-sm transition hover:border-orange-200"
      >
        <span className="flex items-center gap-3">
          <CalendarDays size={18} />
          {selectedRange}
        </span>

        <ChevronDown
          size={15}
          className={`text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[56px] z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.12)]">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => {
                setSelectedRange(range);
                setOpen(false);
              }}
              className={`flex h-11 w-full items-center px-4 text-left text-sm font-black transition ${
                selectedRange === range
                  ? "bg-[#fff0ea] text-[#FF6B35]"
                  : "text-[#061638] hover:bg-orange-50 hover:text-[#FF6B35]"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DashboardStatCard({ icon: Icon, iconClass, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[190px] rounded-xl border border-slate-200 bg-white p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-[#FF6B35] hover:shadow-[0_18px_38px_rgba(255,107,53,0.15)]"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon size={20} />
      </div>

      <p className="mt-8 text-xs font-black uppercase tracking-[0.14em] text-[#061638]">
        {label}
      </p>

      <p className="mt-4 text-4xl font-black text-[#061638]">{value}</p>
    </button>
  );
}

function ProjectAnalytics({ projects = [] }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const visibleProjects = Array.isArray(projects) ? projects : [];
  const projectsPerPage = 3;
  const totalPages = Math.max(
    1,
    Math.ceil(visibleProjects.length / projectsPerPage)
  );

  const safePage = Math.min(page, totalPages - 1);
  const startIndex = safePage * projectsPerPage;
  const currentProjects = visibleProjects.slice(
    startIndex,
    startIndex + projectsPerPage
  );

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(0);
    }
  }, [page, totalPages]);

  function goPrevious() {
    setPage((current) => {
      if (current <= 0) return totalPages - 1;
      return current - 1;
    });
  }

  function goNext() {
    setPage((current) => {
      if (current >= totalPages - 1) return 0;
      return current + 1;
    });
  }

  function openProject(project, index) {
    const projectId = getProjectId(project, index);
    navigate(`/admin/projects/${projectId}`);
  }

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-[#061638]">
          Project Analytics
        </h2>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrevious}
            disabled={visibleProjects.length <= projectsPerPage}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#FF6B35] hover:text-[#FF6B35] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="min-w-[45px] text-center text-sm font-black text-slate-500">
            {safePage + 1} / {totalPages}
          </span>

          <button
            type="button"
            onClick={goNext}
            disabled={visibleProjects.length <= projectsPerPage}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#FF6B35] hover:text-[#FF6B35] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {currentProjects.length ? (
        <div className="grid grid-cols-3 gap-4">
          {currentProjects.map((project, index) => {
            const realIndex = startIndex + index;
            const progress = getProjectProgress(project);
            const radius = 42;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset =
              circumference - (progress / 100) * circumference;

            return (
              <article
                key={getProjectId(project, realIndex)}
                onClick={() => openProject(project, realIndex)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openProject(project, realIndex);
                  }
                }}
                className="flex min-h-[235px] cursor-pointer flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:border-[#FF6B35] hover:shadow-[0_16px_35px_rgba(255,107,53,0.16)]"
              >
                <h3 className="line-clamp-2 min-h-[44px] text-[15px] font-black leading-5 text-[#061638]">
                  {getProjectName(project, realIndex)}
                </h3>

                <div className="flex justify-center">
                  <div className="relative h-[115px] w-[115px]">
                    <svg
                      viewBox="0 0 110 110"
                      className="h-full w-full rotate-[-90deg]"
                    >
                      <circle
                        cx="55"
                        cy="55"
                        r={radius}
                        fill="none"
                        stroke="#edf2f7"
                        strokeWidth="10"
                      />

                      <circle
                        cx="55"
                        cy="55"
                        r={radius}
                        fill="none"
                        stroke={ORANGE}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-[#061638]">
                        {progress}%
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[235px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm font-semibold text-slate-500">
          No projects found.
        </div>
      )}
    </section>
  );
}

function Announcements() {
  const items = [
    {
      title: "Welcome to Valencia Nutrition EMS",
      message:
        "Real project data and employee accounts are now connected with the local SQLite backend.",
      type: "System",
    },
    {
      title: "Mandatory login tracking",
      message:
        "Employees should login daily from Monday to Saturday to avoid missed-login strikes.",
      type: "Attendance",
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-center gap-3">
        <Megaphone size={24} className="text-[#FF6B35]" />
        <h2 className="text-2xl font-black text-[#061638]">Announcements</h2>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-black text-[#061638]">{item.title}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  {item.message}
                </p>
              </div>

              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#FF6B35]">
                {item.type}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecentActivity({ projects = [], users = [] }) {
  const projectCount = projects.length;
  const userCount = users.length;

  const activities = [
    {
      icon: Briefcase,
      title: `${projectCount} real projects loaded`,
      message: "Project analytics are now based on imported project data.",
    },
    {
      icon: UsersRound,
      title: `${userCount} employees/admins available`,
      message: "User accounts are connected with the backend database.",
    },
    {
      icon: Clock3,
      title: "Pending task count updated",
      message: "Pending tasks are calculated from project open task counts.",
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex items-center gap-3">
        <BarChart3 size={24} className="text-[#FF6B35]" />
        <h2 className="text-2xl font-black text-[#061638]">Recent Activity</h2>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = activity.icon;

          return (
            <article
              key={activity.title}
              className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FF6B35]">
                <Icon size={18} />
              </div>

              <div>
                <h3 className="font-black text-[#061638]">{activity.title}</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  {activity.message}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}