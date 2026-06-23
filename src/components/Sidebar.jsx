import {
  CalendarDays,
  ChevronLeft,
  Grid2X2,
  LogOut,
  MessageCircle,
  Moon,
  Sun,
  User,
  UsersRound,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProfileAvatar from "./ProfileAvatar";

function getName(profile) {
  return (
    profile?.name ||
    profile?.fullName ||
    profile?.full_name ||
    profile?.displayName ||
    profile?.employeeName ||
    "Employee"
  );
}

function getEmail(profile) {
  return profile?.email || "";
}

const navItems = [
  {
    label: "Overview",
    icon: Grid2X2,
    to: "/dashboard",
    end: true,
  },
  {
    label: "Projects",
    icon: UsersRound,
    to: "/dashboard/projects",
  },
  {
    label: "Attendance",
    icon: CalendarDays,
    to: "/dashboard/attendance",
  },
  {
    label: "Chatbox",
    icon: MessageCircle,
    to: "/dashboard/chatbox",
  },
  {
    label: "Profile",
    icon: User,
    to: "/dashboard/profile",
  },
];

export default function UserSidebar() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("valencia_theme") === "dark";
  });

  const name = useMemo(() => getName(profile), [profile]);
  const email = useMemo(() => getEmail(profile), [profile]);

  useEffect(() => {
    localStorage.setItem("valencia_theme", darkMode ? "dark" : "light");

    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  async function handleLogout() {
    try {
      if (typeof logout === "function") {
        await logout();
      }
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[255px] flex-col border-r border-[#ededed] bg-white text-black">
      <div className="flex h-[66px] items-center justify-between border-b border-[#ededed] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff0ea] text-[22px] font-black text-[#ff6b35]">
            V
          </div>

          <div className="leading-tight">
            <p className="text-[16px] font-black text-[#ff6b35]">Valencia</p>
            <p className="text-[16px] font-black text-[#ff6b35]">Nutritions</p>
          </div>
        </div>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#333] transition hover:bg-[#fff0ea] hover:text-[#ff6b35]"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-8">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-3 rounded-lg px-4 text-[15px] font-black transition ${
                    isActive
                      ? "bg-[#ff6b35] text-white"
                      : "text-black hover:bg-[#fff0ea] hover:text-[#ff6b35]"
                  }`
                }
              >
                <Icon size={18} strokeWidth={2.4} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="px-3 pb-5">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#fff6f2] p-3">
          <ProfileAvatar size="h-11 w-11" textSize="text-[16px]" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-black text-black">
              {name}
            </p>
            <p className="truncate text-[12px] font-medium text-[#777]">
              {email}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-around">
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-black transition hover:bg-[#fff0ea] hover:text-[#ff6b35]"
            title="Toggle theme"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-black transition hover:bg-[#fff0ea] hover:text-[#ff6b35]"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}