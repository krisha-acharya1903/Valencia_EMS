import {
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
} from "lucide-react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import AppLayout from "./layouts/AppLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";

import UserDashboard from "./pages/UserDashboard";
import UserProjects from "./pages/UserProjects";
import UserAttendanceDetail from "./pages/UserAttendanceDetail";
import UserProjectDetails from "./pages/UserProjectDetails";
import UserChatbox from "./pages/UserChatbox";
import UserProfile from "./pages/UserProfile";

import AdminDashboard from "./pages/AdminDashboard";
import AdminChatbox from "./pages/AdminChatbox";
import UserManagement from "./pages/UserManagement";
import UserProgressDetail from "./pages/UserProgressDetail";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import AttendanceManagement from "./pages/AttendanceManagement";
import Departments from "./pages/Departments";

import SuperAdminChatbox from "./pages/SuperAdminChatbox";
import SuperAdminDepartmentSelect from "./pages/SuperAdminDepartmentSelect";
import SuperAdminDepartmentDashboard from "./pages/SuperAdminDepartmentDashboard";

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

  return children;
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

  return children;
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

  return children;
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
    label: "Divisions",
    path: "/admin/departments",
    icon: Building2,
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

function AdminShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, logout } = useAuth();

  const name = profile?.name || profile?.fullName || "Admin";
  const email = profile?.email || "admin@valencia.com";

  const initials =
    name
      ?.split(" ")
      ?.filter(Boolean)
      ?.map((part) => part[0])
      ?.join("")
      ?.slice(0, 2)
      ?.toUpperCase() || "A";

  const hideSearchBar =
    location.pathname === "/admin" || location.pathname === "/admin/";

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0ea] text-[22px] font-black text-[#FF6B35]">
              V
            </div>

            <div>
              <h1 className="text-[16px] font-black leading-tight text-[#FF6B35]">
                Valencia Nutrition
              </h1>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Admin Panel
              </p>
            </div>
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-orange-50 hover:text-[#FF6B35]"
          >
            <ChevronLeft size={16} />
          </button>
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
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6B35] text-white shadow-sm transition hover:opacity-90"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={() => navigate(1)}
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
              <div className="ml-auto flex h-11 max-w-[720px] flex-1 items-center gap-3 rounded-xl border border-[#e8edf4] bg-white px-4">
                <Search size={19} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employees, projects, tasks..."
                  className="h-full w-full bg-transparent text-sm font-semibold text-[#061638] outline-none placeholder:text-slate-400"
                />
              </div>
            )}
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

      <Route
        path="/admin/departments"
        element={
          <AdminPage>
            <Departments />
          </AdminPage>
        }
      />

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
        path="/admin/chatbox"
        element={
          <AdminPage>
            <AdminChatbox />
          </AdminPage>
        }
      />

      <Route
        path="/admin/work-progress"
        element={<Navigate to="/admin" replace />}
      />
      <Route
        path="/admin/attendance-leave"
        element={<Navigate to="/admin" replace />}
      />
      <Route
        path="/admin/employee-analytics"
        element={<Navigate to="/admin" replace />}
      />

      <Route path="/users" element={<Navigate to="/admin/users" replace />} />
      <Route
        path="/users/:userId/progress"
        element={<LegacyUserProgressRedirect />}
      />
      <Route
        path="/users/:userId/attendance"
        element={<LegacyUserAttendanceRedirect />}
      />
      <Route
        path="/departments"
        element={<Navigate to="/admin/departments" replace />}
      />
      <Route
        path="/projects"
        element={<Navigate to="/admin/projects" replace />}
      />
      <Route path="/projects/:projectId" element={<LegacyProjectRedirect />} />
      <Route path="/work-progress" element={<Navigate to="/admin" replace />} />
      <Route
        path="/attendance-leave"
        element={<Navigate to="/admin" replace />}
      />
      <Route
        path="/employee-analytics"
        element={<Navigate to="/admin" replace />}
      />

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