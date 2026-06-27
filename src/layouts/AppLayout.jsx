import {
  Bell,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Moon,
  Search,
  Sun,
  User,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const VALENCIA_LOGO_URL = "/valencia_logo.png";
const JAY_MORE_EMAIL = "jay.more@valencianutrition.com";

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
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
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

function getInitials(name) {
  const cleanName = String(name || "User").trim();

  return (
    cleanName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

function EmployeeNotificationBell({ darkMode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead && !item.read_at).length,
    [notifications]
  );

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await apiRequest("/notifications?limit=20");
      setNotifications(data?.notifications || []);
    } catch (error) {
      console.error("Employee notifications load error:", error);
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

  async function markAsRead(notificationId) {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "POST",
        body: JSON.stringify({}),
      });

      setNotifications((current) =>
        current.map((item) =>
          String(item.id) === String(notificationId)
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
          darkMode
            ? "bg-[#111827] text-slate-200 hover:bg-[#172033]"
            : "bg-white text-[#061638] hover:bg-orange-50 hover:text-[#FF6B35]"
        }`}
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
        <div
          className={`absolute right-0 top-12 z-[999] w-[360px] overflow-hidden rounded-2xl border shadow-[0_18px_55px_rgba(15,23,42,0.18)] ${
            darkMode
              ? "border-[#263244] bg-[#111827]"
              : "border-slate-200 bg-white"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-3 ${
              darkMode ? "border-[#263244]" : "border-slate-100"
            }`}
          >
            <div>
              <h3
                className={`text-sm font-black ${
                  darkMode ? "text-white" : "text-[#061638]"
                }`}
              >
                Notifications
              </h3>
              <p
                className={`text-xs font-semibold ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                darkMode
                  ? "text-slate-400 hover:bg-[#172033] hover:text-white"
                  : "text-slate-400 hover:bg-red-50 hover:text-red-500"
              }`}
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div
                className={`px-4 py-6 text-center text-sm font-semibold ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Loading notifications...
              </div>
            ) : notifications.length ? (
              notifications.map((item) => {
                const isRead = Boolean(item.isRead || item.read_at);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className={`flex w-full gap-3 border-b px-4 py-4 text-left transition ${
                      darkMode
                        ? "border-[#263244] hover:bg-[#172033]"
                        : "border-slate-100 hover:bg-orange-50/60"
                    }`}
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        isRead ? "bg-slate-300" : "bg-[#FF6B35]"
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-black ${
                          darkMode ? "text-white" : "text-[#061638]"
                        }`}
                      >
                        {item.title}
                      </span>

                      {item.message ? (
                        <span
                          className={`mt-1 block text-xs font-semibold leading-5 ${
                            darkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {item.message}
                        </span>
                      ) : null}

                      <span
                        className={`mt-2 block text-[11px] font-black uppercase tracking-[0.12em] ${
                          darkMode ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {formatNotificationTime(
                          item.createdAt || item.created_at
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <div
                className={`px-4 py-8 text-center text-sm font-semibold ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                No notifications yet.
              </div>
            )}
          </div>

          {notifications.length ? (
            <div
              className={`flex items-center justify-between px-4 py-3 ${
                darkMode ? "bg-[#172033]" : "bg-slate-50"
              }`}
            >
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
                  loadNotifications();
                }}
                className="rounded-lg bg-[#FF6B35] px-3 py-2 text-xs font-black text-white"
              >
                Refresh
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmployeeSidebar({ darkMode, onToggleDarkMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout } = useAuth();

  const name = profile?.name || profile?.fullName || "User";
  const email = profile?.email || "";
  const initials = getInitials(name);

  const isJayMore =
    String(email || "").trim().toLowerCase() === JAY_MORE_EMAIL;

  const navItems = [
    {
      label: "Overview",
      path: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Projects",
      path: "/dashboard/projects",
      icon: FolderKanban,
    },
    {
      label: "Attendance",
      path: "/dashboard/attendance",
      icon: CalendarCheck,
    },
    {
      label: "Chatbox",
      path: "/dashboard/chatbox",
      icon: MessageCircle,
    },
    ...(isJayMore
      ? [
          {
            label: "Employees",
            path: "/dashboard/employees",
            icon: UsersRound,
          },
        ]
      : []),
    {
      label: "Profile",
      path: "/dashboard/profile",
      icon: User,
    },
  ];

  function isActive(path, exact) {
    if (exact) {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }

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

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen w-[255px] flex-col border-r ${
        darkMode
          ? "border-[#263244] bg-[#07111f]"
          : "border-[#eeeeee] bg-white"
      }`}
    >
      <div
        className={`flex h-[68px] items-center border-b px-5 ${
          darkMode ? "border-[#263244]" : "border-[#eeeeee]"
        }`}
      >
        <div className="flex items-center gap-3">
          <ValenciaLogo />

          <div>
            <h1 className="text-[17px] font-black leading-tight text-[#FF6B35]">
              Valencia
            </h1>
            <p className="text-[17px] font-black leading-tight text-[#FF6B35]">
              Nutritions
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-3 py-8">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex h-11 items-center gap-3 rounded-lg px-4 text-[15px] font-black transition ${
                active
                  ? "bg-[#FF6B35] text-white shadow-sm"
                  : darkMode
                  ? "text-slate-200 hover:bg-[#172033] hover:text-white"
                  : "text-black hover:bg-[#fff0ea] hover:text-[#FF6B35]"
              }`}
            >
              <Icon size={19} strokeWidth={2.3} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 pb-5">
        <div
          className={`mb-4 flex items-center gap-3 rounded-xl px-3 py-3 ${
            darkMode ? "bg-[#111827]" : "bg-[#fff6f2]"
          }`}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-sm font-black text-white">
            {initials}
          </div>

          <div className="min-w-0">
            <p
              className={`truncate text-sm font-black ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              {name}
            </p>
            <p
              className={`truncate text-xs font-semibold ${
                darkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {email}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-7">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              darkMode
                ? "bg-[#111827] text-yellow-300 hover:bg-[#172033]"
                : "bg-white text-[#061638] hover:bg-orange-50"
            }`}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              darkMode
                ? "bg-[#111827] text-slate-300 hover:bg-red-950 hover:text-red-300"
                : "bg-white text-[#061638] hover:bg-red-50 hover:text-red-600"
            }`}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("employee_theme") === "dark";
  });

  const [searchText, setSearchText] = useState(() => searchParams.get("q") || "");

  useEffect(() => {
    localStorage.setItem("employee_theme", darkMode ? "dark" : "light");

    document.documentElement.classList.toggle("employee-dark", darkMode);
    document.body.classList.toggle("employee-dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    setSearchText(searchParams.get("q") || "");
  }, [location.pathname, searchParams]);

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

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/dashboard", { replace: false });
  }

  function goForward() {
    navigate(1);
  }

  return (
    <div
      className={`employee-app-shell min-h-screen text-black ${
        darkMode ? "employee-dark-shell bg-[#07111f]" : "bg-white"
      }`}
    >
      <style>
        {`
          .employee-dark-shell {
            background: #07111f !important;
            color: #e5edf7 !important;
          }

          .employee-dark-shell aside,
          .employee-dark-shell header,
          .employee-dark-shell main {
            background-color: #07111f !important;
            color: #e5edf7 !important;
          }

          .employee-dark-shell [class*="bg-white"] {
            background-color: #111827 !important;
          }

          .employee-dark-shell [class*="bg-[#fff8ef]"],
          .employee-dark-shell [class*="bg-[#fff8f2]"],
          .employee-dark-shell [class*="bg-[#fbfbfb]"],
          .employee-dark-shell [class*="bg-[#fff5f2]"],
          .employee-dark-shell [class*="bg-[#fff0ee]"],
          .employee-dark-shell [class*="bg-[#fff0ea]"],
          .employee-dark-shell [class*="bg-[#FFF7F3]"],
          .employee-dark-shell [class*="bg-orange-50"] {
            background-color: #172033 !important;
          }

          .employee-dark-shell [class*="text-black"],
          .employee-dark-shell [class*="text-[#061638]"],
          .employee-dark-shell [class*="text-[#061536]"],
          .employee-dark-shell [class*="text-[#1E1E1E]"] {
            color: #f8fafc !important;
          }

          .employee-dark-shell input,
          .employee-dark-shell textarea,
          .employee-dark-shell select {
            background-color: transparent !important;
            color: #f8fafc !important;
          }

          .employee-dark-shell input::placeholder,
          .employee-dark-shell textarea::placeholder {
            color: #94a3b8 !important;
          }

          .employee-dark-shell .shadow-2xl,
          .employee-dark-shell [class*="shadow-"] {
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35) !important;
          }
        `}
      </style>

      <EmployeeSidebar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      <div className="min-h-screen pl-[255px]">
        <header
          className={`sticky top-0 z-30 flex h-[68px] items-center border-b px-8 ${
            darkMode
              ? "border-[#263244] bg-[#07111f]"
              : "border-[#eeeeee] bg-white"
          }`}
        >
          <div className="flex w-full items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="flex h-9 w-9 items-center justify-center rounded bg-[#FF6B35] text-white shadow-sm transition hover:bg-[#ef5f2d]"
                title="Back"
              >
                <ChevronLeft size={21} />
              </button>

              <button
                type="button"
                onClick={goForward}
                className="flex h-9 w-9 items-center justify-center rounded bg-[#FF6B35] text-white shadow-sm transition hover:bg-[#ef5f2d]"
                title="Forward"
              >
                <ChevronRight size={21} />
              </button>
            </div>

            <div
              className={`flex h-10 flex-1 items-center gap-4 rounded-xl border px-5 ${
                darkMode
                  ? "border-[#263244] bg-[#111827]"
                  : "border-[#e8e8e8] bg-white"
              }`}
            >
              <Search
                size={20}
                className={darkMode ? "text-slate-400" : "text-[#6b6b7a]"}
              />

              <input
                type="text"
                value={searchText}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Search projects, tasks, recent activity..."
                className={`h-full w-full bg-transparent text-[14px] font-medium outline-none ${
                  darkMode
                    ? "text-white placeholder:text-slate-400"
                    : "text-black placeholder:text-[#7d7d8a]"
                }`}
              />
            </div>

            <EmployeeNotificationBell darkMode={darkMode} />
          </div>
        </header>

        <main
          className={`min-h-[calc(100vh-68px)] ${
            darkMode ? "bg-[#07111f]" : "bg-white"
          }`}
        >
          <Outlet
            context={{
              darkMode,
              searchQuery: searchText.trim(),
              setSearchQuery: updateSearch,
            }}
          />
        </main>
      </div>
    </div>
  );
}