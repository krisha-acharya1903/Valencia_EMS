import BlockedAccountWatcher from "./components/BlockedAccountWatcher";
import JayEmployees from "./pages/JayEmployees";
import {
  Bell,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";

import AppLayout from "./layouts/AppLayout";

import Login from "./pages/login";
import Register from "./pages/Register";

import UserDashboard from "./pages/UserDashboard";
import UserProjects from "./pages/UserProjects";
import UserAttendanceDetail from "./pages/UserAttendanceDetail";
import UserProjectDetails from "./pages/UserProjectDetails";
import UserChatbox from "./pages/UserChatbox";
import UserProfile from "./pages/UserProfile";

import AdminDashboard from "./pages/AdminDashboard";
import AdminChatbox from "./pages/AdminChatbox";
import AdminNotifications from "./pages/AdminNotifications";
import UserManagement from "./pages/UserManagement";
import UserProgressDetail from "./pages/UserProgressDetail";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import AttendanceManagement from "./pages/AttendanceManagement";
import Departments from "./pages/Departments";

import SuperAdminChatbox from "./pages/SuperAdminChatbox";
import SuperAdminDepartmentSelect from "./pages/SuperAdminDepartmentSelect";
import SuperAdminDepartmentDashboard from "./pages/SuperAdminDepartmentDashboard";

const VALENCIA_LOGO_URL = "/valencia_logo.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getStoredToken() {
  return (
    localStorage.getItem("valencia_auth_token") ||
    sessionStorage.getItem("valencia_auth_token") ||
    ""
  );
}

async function apiRequest(path, options = {}) {
  const token = getStoredToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request failed.");
  }

  return data;
}

function formatNotificationTime(value) {
  if (!value) return "";

  const parsed = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 16);
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ValenciaLogo() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
      {logoError ? (
        <span className="text-[22px] font-black text-[#FF6B35]">V</span>
      ) : (
        <img
          src={VALENCIA_LOGO_URL}
          alt="Valencia Nutrition"
          className="h-full w-full object-contain"
          onError={() => setLogoError(true)}
        />
      )}
    </div>
  );
}

function normalizeRole(role) {
  return String(role || "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .toLowerCase();
}

function getLandingPath(profile) {
  const role = normalizeRole(profile?.role);

  if (role === "superadmin") {
    return "/superadmin";
  }

  if (role === "admin" || role === "manager") {
    return "/admin";
  }

  return "/dashboard";
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-sm font-semibold text-slate-500">
      Loading...
    </div>
  );
}

function RoleRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getLandingPath(profile)} replace />;
}

function PublicRoute({ children }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (profile) {
    return <Navigate to={getLandingPath(profile)} replace />;
  }

  return children;
}

function EmployeeOnlyRoute({ children }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(profile?.role);

  if (role === "admin" || role === "manager") {
    return <Navigate to="/admin" replace />;
  }

  if (role === "superadmin") {
    return <Navigate to="/superadmin" replace />;
  }

  return (
    <>
      <BlockedAccountWatcher />
      {children}
    </>
  );
}

function AdminOnlyRoute({ children }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(profile?.role);

  if (role === "superadmin") {
    return <Navigate to="/superadmin" replace />;
  }

  if (role !== "admin" && role !== "manager") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <BlockedAccountWatcher />
      {children}
    </>
  );
}

function SuperAdminOnlyRoute({ children }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(profile?.role);

  if (role !== "superadmin") {
    return <Navigate to={getLandingPath(profile)} replace />;
  }

  return (
    <>
      <BlockedAccountWatcher />
      {children}
    </>
  );
}

const adminNavItems = [
  {
    label: "Overview",
    path: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Employees",
    path: "/admin/users",
    icon: UsersRound,
  },
  
  {
    label: "Projects",
    path: "/admin/projects",
    icon: FolderKanban,
  },
  {
    label: "Attendance",
    path: "/admin/attendance-management",
    icon: CalendarCheck,
  },
  {
    label: "Notifications",
    path: "/admin/notifications",
    icon: Bell,
  },
  {
    label: "Chatbox",
    path: "/admin/chatbox",
    icon: MessageCircle,
  },
];

function getAdminHeaderTitle(pathname) {
  if (pathname === "/admin" || pathname === "/admin/") {
    return {
      title: "Overview",
      subtitle: "Enterprise performance and management",
    };
  }

  if (pathname.startsWith("/admin/users")) {
    return {
      title: "Employees",
      subtitle: "Manage employees, attendance, and work records",
    };
  }

  if (pathname.startsWith("/admin/departments")) {
    return {
      title: "Divisions",
      subtitle: "Manage company divisions and teams",
    };
  }

  if (pathname.startsWith("/admin/projects")) {
    return {
      title: "Projects",
      subtitle: "Create, assign, and track project progress",
    };
  }

  if (pathname.startsWith("/admin/attendance-management")) {
    return {
      title: "Attendance",
      subtitle: "Monitor employee attendance and leave activity",
    };
  }

  if (pathname.startsWith("/admin/notifications")) {
    return {
      title: "Notifications",
      subtitle: "Send announcements and track user alerts",
    };
  }

  if (pathname.startsWith("/admin/chatbox")) {
    return {
      title: "Chatbox",
      subtitle: "Team communication and project messages",
    };
  }

  return {
    title: "Admin",
    subtitle: "Valencia Nutrition EMS",
  };
}

function AdminNotificationBell() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const unreadCount = notifications.filter(
    (item) => !item.isRead && !item.read_at
  ).length;

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await apiRequest("/notifications?limit=20");
      setNotifications(data?.notifications || []);
    } catch (error) {
      console.error("Admin notifications load error:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(loadNotifications, 30000);

    return () => window.clearInterval(interval);
  }, []);

  async function markAsRead(id) {
    try {
      await apiRequest(`/notifications/${id}/read`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      setNotifications((current) =>
        current.map((item) =>
          String(item.id) === String(id)
            ? {
                ...item,
                isRead: true,
                read_at: item.read_at || new Date().toISOString(),
              }
            : item
        )
      );
    } catch (error) {
      console.error("Mark notification read error:", error);
    }
  }

  async function openNotification(item) {
    await markAsRead(item.id);
    setOpen(false);

    if (item.entityType === "project" || item.entity_type === "project") {
      navigate(`/admin/projects/${item.entityId || item.entity_id}`);
      return;
    }

    if (item.entityType === "attendance" || item.entity_type === "attendance") {
      navigate("/admin/attendance-management");
      return;
    }

    navigate("/admin/notifications");
  }

  async function markAllRead() {
    try {
      await apiRequest("/notifications/mark-all-read", {
        method: "POST",
        body: JSON.stringify({}),
      });

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error("Mark all notifications read error:", error);
    }
  }

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#061638] transition hover:bg-orange-50 hover:text-[#FF6B35]"
        title="Notifications"
      >
        <Bell size={20} />

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black leading-none text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-[999] w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-black text-[#061638]">
                Notifications
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[310px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length ? (
              notifications.map((item) => {
                const isRead = Boolean(item.isRead || item.read_at);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    className="flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-orange-50/60"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        isRead ? "bg-slate-300" : "bg-[#FF6B35]"
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-[#061638]">
                        {item.title}
                      </span>

                      {item.message ? (
                        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                          {item.message}
                        </span>
                      ) : null}

                      <span className="mt-2 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {formatNotificationTime(
                          item.createdAt || item.created_at
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                No notifications yet.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-black text-[#FF6B35]"
            >
              Mark all as read
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/admin/notifications");
              }}
              className="rounded-lg bg-[#FF6B35] px-3 py-2 text-xs font-black text-white"
            >
              View all
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, logout } = useAuth();

  const [searchText, setSearchText] = useState(() => searchParams.get("q") || "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const name = profile?.name || profile?.fullName || "Admin";
  const email = profile?.email || "admin@valencia.com";

  useEffect(() => {
    setSearchText(searchParams.get("q") || "");
  }, [location.pathname, searchParams]);

  useEffect(() => {
  const query = String(searchText || "").trim();

  if (!query) {
    setSearchResults([]);
    setSearchOpen(false);
    setSearchLoading(false);
    return;
  }

  let active = true;

  const timer = window.setTimeout(async () => {
    try {
      setSearchLoading(true);

      const data = await apiRequest(
        `/search?q=${encodeURIComponent(query)}`
      );

      if (!active) return;

      const results = data?.results || {};

      const users = Array.isArray(results.users)
        ? results.users.map((item) => ({
            ...item,
            resultType: "employee",
          }))
        : [];

      const projects = Array.isArray(results.projects)
        ? results.projects.map((item) => ({
            ...item,
            resultType: "project",
          }))
        : [];

      const tasks = Array.isArray(results.tasks)
        ? results.tasks.map((item) => ({
            ...item,
            resultType: "task",
          }))
        : [];

      const activity = Array.isArray(results.activity)
        ? results.activity.map((item) => ({
            ...item,
            resultType: "activity",
          }))
        : [];

      setSearchResults([...users, ...projects, ...tasks, ...activity].slice(0, 8));
      setSearchOpen(true);
    } catch (error) {
      console.error("Admin search error:", error);

      if (active) {
        setSearchResults([]);
        setSearchOpen(true);
      }
    } finally {
      if (active) {
        setSearchLoading(false);
      }
    }
  }, 300);

  return () => {
    active = false;
    window.clearTimeout(timer);
  };
}, [searchText]);

  function updateSearch(value) {
    setSearchText(value);

    const nextParams = new URLSearchParams(searchParams);
    const cleanValue = String(value || "").trim();

    if (cleanValue) {
      nextParams.set("q", cleanValue);
    } else {
      nextParams.delete("q");
    }

    setSearchParams(nextParams, {
      replace: true,
    });
  }

  function getSearchResultTitle(item) {
  return (
    item?.name ||
    item?.fullName ||
    item?.full_name ||
    item?.title ||
    item?.projectName ||
    item?.project_name ||
    item?.taskName ||
    item?.task_name ||
    item?.email ||
    "Search result"
  );
}

function getSearchResultSubtitle(item) {
  if (item.resultType === "employee") {
    return item.email || item.department || "Employee";
  }

  if (item.resultType === "project") {
    return item.department || item.status || "Project";
  }

  if (item.resultType === "task") {
    return item.projectName || item.project_name || item.status || "Task";
  }

  return item.message || item.type || "Activity";
}

function getSearchResultLabel(item) {
  if (item.resultType === "employee") return "Employee";
  if (item.resultType === "project") return "Project";
  if (item.resultType === "task") return "Task";
  return "Activity";
}

function openSearchResult(item) {
  setSearchOpen(false);

  if (item.resultType === "employee") {
    const userId = item.id || item.userId || item.user_id || item.uid;

    if (userId) {
      navigate(`/admin/users/${userId}/progress`);
      return;
    }

    navigate("/admin/users");
    return;
  }

  if (item.resultType === "project") {
    const projectId = item.id || item.projectId || item.project_id || item.uid;

    if (projectId) {
      navigate(`/admin/projects/${projectId}`);
      return;
    }

    navigate("/admin/projects");
    return;
  }

  if (item.resultType === "task") {
    const projectId = item.projectId || item.project_id || item.parentProjectId || item.parent_project_id;

    if (projectId) {
      navigate(`/admin/projects/${projectId}`);
      return;
    }

    navigate("/admin/projects");
    return;
  }

  navigate("/admin/notifications");
}

  const adminPageOrder = [
  "/admin",
  "/admin/users",
  "/admin/projects",
  "/admin/attendance-management",
  "/admin/notifications",
  "/admin/chatbox",
];

function getCurrentAdminPageIndex() {
  const pathname = location.pathname;

  const exactIndex = adminPageOrder.findIndex((path) => pathname === path);

  if (exactIndex >= 0) return exactIndex;

  if (pathname.startsWith("/admin/users")) return 1;
  if (pathname.startsWith("/admin/projects")) return 2;
  if (pathname.startsWith("/admin/attendance-management")) return 3;
  if (pathname.startsWith("/admin/notifications")) return 4;
  if (pathname.startsWith("/admin/chatbox")) return 5;

  return 0;
}

function goBack() {
  const currentIndex = getCurrentAdminPageIndex();
  const previousIndex = Math.max(currentIndex - 1, 0);

  navigate(adminPageOrder[previousIndex]);
}

function goForward() {
  const currentIndex = getCurrentAdminPageIndex();
  const nextIndex = Math.min(currentIndex + 1, adminPageOrder.length - 1);

  navigate(adminPageOrder[nextIndex]);
}

  const initials =
    name
      ?.split(" ")
      ?.filter(Boolean)
      ?.map((part) => part[0])
      ?.join("")
      ?.slice(0, 2)
      ?.toUpperCase() || "A";

  const hideSearchBar =
    location.pathname === "/admin" ||
    location.pathname === "/admin/" ||
    location.pathname === "/admin/users" ||
    location.pathname.startsWith("/admin/users/") ||
    location.pathname === "/admin/departments" ||
    location.pathname.startsWith("/admin/departments/") ||
    location.pathname === "/admin/projects" ||
    location.pathname.startsWith("/admin/projects/") ||
    location.pathname === "/admin/notifications" ||
    location.pathname.startsWith("/admin/notifications/");

  const headerInfo = getAdminHeaderTitle(location.pathname);

  function handleLogout() {
    if (logout) {
      logout();
    }

    sessionStorage.removeItem("valencia_auth_token");
    sessionStorage.removeItem("valencia_auth_user");
    localStorage.removeItem("valencia_auth_token");
    localStorage.removeItem("valencia_auth_user");

    navigate("/login", { replace: true });
  }

  function isActive(path, exact) {
    if (exact) {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

  return (
    <div className="min-h-screen bg-white text-[#061638]">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-[#eef1f6] bg-white">
        <div className="flex h-[76px] items-center justify-between border-b border-[#eef1f6] px-5">
          <div className="flex items-center gap-3">
            <ValenciaLogo />

            <div>
              <h1 className="text-[16px] font-black leading-tight text-[#FF6B35]">
                Valencia Nutrition
              </h1>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-7">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex h-11 items-center gap-3 rounded-xl px-4 text-[14px] font-black transition ${
                  active
                    ? "bg-[#FF6B35] text-white shadow-sm"
                    : "text-[#061638] hover:bg-[#fff0ea] hover:text-[#FF6B35]"
                }`}
              >
                <Icon size={19} strokeWidth={2.2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#eef1f6] p-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#fff6f2] px-3 py-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-sm font-black text-white">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#061638]">
                {name}
              </p>
              <p className="truncate text-xs font-semibold text-slate-500">
                {email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-full items-center gap-3 rounded-xl px-4 text-sm font-black text-[#061638] transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-h-screen pl-[280px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center border-b border-[#eef1f6] bg-white px-7">
          <div className="flex w-full items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35] text-white shadow-sm transition hover:opacity-90"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={goForward}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35] text-white shadow-sm transition hover:opacity-90"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="min-w-[220px]">
              <h2 className="text-[22px] font-black leading-tight text-[#FF6B35]">
                {headerInfo.title}
              </h2>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                {headerInfo.subtitle}
              </p>
            </div>

            {hideSearchBar ? (
              <div className="flex-1" />
            ) : (
              <div className="relative ml-auto max-w-[720px] flex-1">
  <div className="flex h-11 items-center gap-3 rounded-xl border border-[#e8edf4] bg-white px-4">
    <Search size={19} className="text-slate-400" />

    <input
      type="text"
      value={searchText}
      onFocus={() => {
        if (searchText.trim()) {
          setSearchOpen(true);
        }
      }}
      onChange={(event) => updateSearch(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && searchResults[0]) {
          openSearchResult(searchResults[0]);
        }
      }}
      placeholder="Search employees, projects, tasks..."
      className="h-full w-full bg-transparent text-sm font-semibold text-[#061638] outline-none placeholder:text-slate-400"
    />
  </div>

  {searchOpen && searchText.trim() ? (
    <div className="absolute left-0 right-0 top-13 z-[999] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
      {searchLoading ? (
        <div className="px-4 py-5 text-sm font-semibold text-slate-500">
          Searching...
        </div>
      ) : searchResults.length ? (
        <div className="max-h-[360px] overflow-y-auto">
          {searchResults.map((item, index) => (
            <button
              key={`${item.resultType}-${item.id || item.uid || index}`}
              type="button"
              onClick={() => openSearchResult(item)}
              className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-orange-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-[#061638]">
                  {getSearchResultTitle(item)}
                </span>

                <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                  {getSearchResultSubtitle(item)}
                </span>
              </span>

              <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-black uppercase text-[#FF6B35]">
                {getSearchResultLabel(item)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-5 text-sm font-semibold text-slate-500">
          No matching results found.
        </div>
      )}
    </div>
  ) : null}
</div>
            )}

            <AdminNotificationBell />
          </div>
        </header>

        <main className="min-h-[calc(100vh-76px)] bg-[#f7f9fc]">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminPage({ children }) {
  return (
    <AdminOnlyRoute>
      <AdminShell>{children}</AdminShell>
    </AdminOnlyRoute>
  );
}

function LegacyUserProgressRedirect() {
  const { userId } = useParams();
  return <Navigate to={`/admin/users/${userId}/progress`} replace />;
}

function LegacyUserAttendanceRedirect() {
  return <Navigate to="/admin/attendance-management" replace />;
}

function LegacyProjectRedirect() {
  const { projectId } = useParams();
  return <Navigate to={`/admin/projects/${projectId}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      <Route path="/" element={<RoleRedirect />} />

      <Route
        path="/dashboard"
        element={
          <EmployeeOnlyRoute>
            <AppLayout />
          </EmployeeOnlyRoute>
        }
      >
        <Route index element={<UserDashboard />} />
        <Route path="projects" element={<UserProjects />} />
        <Route path="projects/:projectId" element={<UserProjectDetails />} />
        <Route path="attendance" element={<UserAttendanceDetail />} />
        <Route path="chatbox" element={<UserChatbox />} />
        <Route path="employees" element={<JayEmployees />} />
        <Route path="divisions" element={<Departments />} />
        <Route path="profile" element={<UserProfile />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminPage>
            <AdminDashboard />
          </AdminPage>
        }
      />

      <Route
        path="/admin/users"
        element={
          <AdminPage>
            <UserManagement />
          </AdminPage>
        }
      />

      <Route
        path="/admin/users/:userId/progress"
        element={
          <AdminPage>
            <UserProgressDetail />
          </AdminPage>
        }
      />

      <Route
        path="/admin/users/:userId/attendance"
        element={
          <AdminPage>
            <AttendanceManagement />
          </AdminPage>
        }
      />

      <Route path="/admin/departments" element={<Navigate to="/admin" replace />} />

      <Route
        path="/admin/projects"
        element={
          <AdminPage>
            <Projects />
          </AdminPage>
        }
      />

      <Route
        path="/admin/projects/:projectId"
        element={
          <AdminPage>
            <ProjectDetails />
          </AdminPage>
        }
      />

      <Route
        path="/admin/attendance-management"
        element={
          <AdminPage>
            <AttendanceManagement />
          </AdminPage>
        }
      />

      <Route
        path="/admin/notifications"
        element={
          <AdminPage>
            <AdminNotifications />
          </AdminPage>
        }
      />

      <Route
        path="/admin/chatbox"
        element={
          <AdminPage>
            <AdminChatbox />
          </AdminPage>
        }
      />

      <Route path="/admin/work-progress" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/attendance-leave" element={<Navigate to="/admin" replace />} />
      <Route path="/admin/employee-analytics" element={<Navigate to="/admin" replace />} />

      <Route path="/users" element={<Navigate to="/admin/users" replace />} />
      <Route
        path="/users/:userId/progress"
        element={<LegacyUserProgressRedirect />}
      />
      <Route
        path="/users/:userId/attendance"
        element={<LegacyUserAttendanceRedirect />}
      />
      <Route path="/departments" element={<Navigate to="/dashboard/divisions" replace />} />
      <Route path="/projects" element={<Navigate to="/admin/projects" replace />} />
      <Route path="/projects/:projectId" element={<LegacyProjectRedirect />} />
      <Route path="/work-progress" element={<Navigate to="/admin" replace />} />
      <Route path="/attendance-leave" element={<Navigate to="/admin" replace />} />
      <Route path="/employee-analytics" element={<Navigate to="/admin" replace />} />

      <Route
        path="/superadmin"
        element={
          <SuperAdminOnlyRoute>
            <SuperAdminDepartmentSelect />
          </SuperAdminOnlyRoute>
        }
      />

      <Route
        path="/superadmin/chatbox"
        element={
          <SuperAdminOnlyRoute>
            <SuperAdminChatbox />
          </SuperAdminOnlyRoute>
        }
      />

      <Route
        path="/superadmin/department/:departmentSlug"
        element={
          <SuperAdminOnlyRoute>
            <SuperAdminDepartmentDashboard />
          </SuperAdminOnlyRoute>
        }
      />

      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}