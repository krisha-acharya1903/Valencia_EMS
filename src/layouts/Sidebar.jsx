import {
  CalendarDays,
  Grid2X2,
  LogOut,
  MessageCircle,
  Moon,
  Sun,
  UserRound,
  UsersRound,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menuItems = [
  {
    label: "Overview",
    path: "/dashboard",
    icon: Grid2X2,
    exact: true,
  },
  {
    label: "Projects",
    path: "/dashboard/projects",
    icon: UsersRound,
  },
  {
    label: "Attendance",
    path: "/dashboard/attendance",
    icon: CalendarDays,
  },
  {
    label: "Chatbox",
    path: "/dashboard/chatbox",
    icon: MessageCircle,
  },
  {
    label: "Profile",
    path: "/dashboard/profile",
    icon: UserRound,
  },
];

export default function Sidebar({ darkMode = false, onToggleDarkMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

  const name = profile?.name || profile?.fullName || "Employee Name";
  const email = profile?.email || "emp_name@valencia.com";

  const initials =
    name
      ?.split(" ")
      ?.filter(Boolean)
      ?.map((word) => word[0])
      ?.join("")
      ?.slice(0, 2)
      ?.toUpperCase() || "SA";

  function isActive(item) {
    if (item.exact) {
      return location.pathname === item.path;
    }

    return (
      location.pathname === item.path ||
      location.pathname.startsWith(`${item.path}/`)
    );
  }

  async function handleLogout() {
    try {
      if (logout) {
        await logout();
      }
    } catch {
      // continue logout cleanup
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
          ? "border-[#263244] bg-[#0f172a]"
          : "border-[#eeeeee] bg-white"
      }`}
    >
      <div
        className={`flex h-[68px] items-center justify-between border-b px-4 ${
          darkMode ? "border-[#263244]" : "border-[#eeeeee]"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-50 text-[22px] font-black text-[#FF6B35]">
            V
          </div>

          <span className="text-[17px] font-bold leading-tight text-[#F0673A]">
            Valencia
            <br />
            Nutritions
          </span>
        </div>

        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
            darkMode
              ? "text-slate-300 hover:bg-[#172033] hover:text-white"
              : "text-[#1E1E1E] hover:bg-orange-50"
          }`}
        >
          ‹
        </button>
      </div>

      <nav className="flex-1 px-3 py-8">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex h-[38px] items-center gap-3 rounded-lg px-4 text-[15px] font-semibold transition ${
                  active
                    ? "bg-[#FF6B35] text-white"
                    : darkMode
                    ? "text-slate-200 hover:bg-[#172033] hover:text-[#FF6B35]"
                    : "text-black hover:bg-orange-50 hover:text-[#FF6B35]"
                }`}
              >
                <Icon size={17} strokeWidth={2.1} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div
        className={`border-t px-3 py-6 ${
          darkMode ? "border-[#263244]" : "border-[#f1f1f1]"
        }`}
      >
        <div
          className={`mb-4 flex items-center gap-3 rounded-xl px-3 py-3 ${
            darkMode ? "bg-[#172033]" : "bg-[#FFF7F3]"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-sm font-bold text-white">
            {initials}
          </div>

          <div className="min-w-0">
            <p
              className={`truncate text-[14px] font-semibold ${
                darkMode ? "text-white" : "text-black"
              }`}
            >
              {name}
            </p>
            <p
              className={`truncate text-[12px] ${
                darkMode ? "text-slate-400" : "text-[#7b7b7b]"
              }`}
            >
              {email}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-around">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              darkMode
                ? "bg-[#1e293b] text-yellow-300 hover:bg-[#263244]"
                : "text-black hover:bg-orange-50 hover:text-[#FF6B35]"
            }`}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              darkMode
                ? "text-slate-200 hover:bg-red-950 hover:text-red-300"
                : "text-black hover:bg-orange-50 hover:text-[#FF6B35]"
            }`}
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}