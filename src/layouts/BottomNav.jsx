import { BriefcaseBusiness, CalendarCheck, CheckCircle2, Fingerprint, Home, User, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const employeeItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { to: "/attendance", label: "Check In", icon: Fingerprint },
  { to: "/profile", label: "Profile", icon: User },
];

const managerItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { to: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { to: "/attendance", label: "Check In", icon: Fingerprint },
  { to: "/profile", label: "Profile", icon: User },
];

const adminItems = [
  { to: "/admin", label: "Home", icon: Home },
  { to: "/users", label: "Users", icon: Users },
  { to: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { to: "/attendance-management", label: "Attendance", icon: CalendarCheck },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const { profile } = useAuth();
  const items = profile?.role === "admin" ? adminItems : profile?.role === "manager" ? managerItems : employeeItems;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-valencia-line bg-white/95 px-2 pb-2 pt-1 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-[430px] gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-xs transition ${
                isActive ? "bg-valencia-orange text-valencia-navy" : "text-valencia-ink"
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
