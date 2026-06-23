import { ArrowRight, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDepartments } from "../services/departmentService";
import { getAllProjects } from "../services/projectService";
import { getUsers } from "../services/userService";

const fallbackDivisions = [
  {
    id: "aroma-de-valencia",
    name: "Aroma De Valencia",
  },
  {
    id: "bounce-super-water",
    name: "Bounce Super Water",
  },
  {
    id: "can-beverages",
    name: "Can Beverages",
  },
  {
    id: "crunzzo",
    name: "Crunzzo",
  },
  {
    id: "erp-accounts-finance",
    name: "ERP / Accounts / Finance",
  },
  {
    id: "high-altitude-water",
    name: "High Altitude Water",
  },
  {
    id: "sales-team",
    name: "Sales Team",
  },
  {
    id: "soda-fountain-machine",
    name: "Soda Fountain Machine",
  },
  {
    id: "software-team",
    name: "Software Team",
  },
  {
    id: "vending-machine",
    name: "Vending Machine",
  },
];

function PerfumeIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6" />
      <path d="M10 3v4h4V3" />
      <path d="M8 9h8" />
      <path d="M7 10.5C7 9.7 7.7 9 8.5 9h7c.8 0 1.5.7 1.5 1.5V19c0 1.1-.9 2-2 2H9c-1.1 0-2-.9-2-2v-8.5Z" />
      <path d="M10 13h4" />
      <path d="M10 16h4" />
    </svg>
  );
}

function BottleIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2h4" />
      <path d="M10.5 2v4.5L8 9v10c0 1.7 1.3 3 3 3h2c1.7 0 3-1.3 3-3V9l-2.5-2.5V2" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function CanIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="5" ry="2" />
      <path d="M7 5v14c0 1.1 2.2 2 5 2s5-.9 5-2V5" />
      <path d="M7 12c0 1.1 2.2 2 5 2s5-.9 5-2" />
      <path d="M10 8h4" />
    </svg>
  );
}

function MountainIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 20h18" />
      <path d="m4 20 6.5-12 4 7 2-3L21 20" />
      <path d="m10.5 8 1.5 3h-3" />
    </svg>
  );
}

function WaferPacketIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 6.5 7.5 4 10 6.5 12.5 4 15 6.5 17.5 4 19 5.5v13L17.5 20 15 17.5 12.5 20 10 17.5 7.5 20 5 17.5v-11Z" />
      <path d="M8 9h8" />
      <path d="M8 12h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

function FinanceIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 3 5-7" />
      <path d="M16 7h3v3" />
    </svg>
  );
}

function MachineIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <circle cx="12" cy="16" r="2" />
    </svg>
  );
}

function SoftwareIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </svg>
  );
}

function DefaultDivisionIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 4 7l8 4 8-4-8-4Z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 17l8 4 8-4" />
    </svg>
  );
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function divisionMeta(name, index) {
  const lower = normalize(name);

  if (lower.includes("aroma") || lower.includes("perfume")) {
    return {
      icon: PerfumeIcon,
      iconClass: "bg-pink-500",
    };
  }

  if (lower.includes("bounce") || lower.includes("water")) {
    return {
      icon: lower.includes("high altitude") ? MountainIcon : BottleIcon,
      iconClass: lower.includes("high altitude") ? "bg-sky-600" : "bg-cyan-500",
    };
  }

  if (lower.includes("can") || lower.includes("beverage")) {
    return {
      icon: CanIcon,
      iconClass: "bg-orange-500",
    };
  }

  if (lower.includes("crunzzo") || lower.includes("wafer")) {
    return {
      icon: WaferPacketIcon,
      iconClass: "bg-yellow-500",
    };
  }

  if (lower.includes("accounts") || lower.includes("finance")) {
    return {
      icon: FinanceIcon,
      iconClass: "bg-purple-500",
    };
  }

  if (lower.includes("soda") || lower.includes("vending") || lower.includes("machine")) {
    return {
      icon: MachineIcon,
      iconClass: "bg-emerald-500",
    };
  }

  if (lower.includes("software")) {
    return {
      icon: SoftwareIcon,
      iconClass: "bg-indigo-500",
    };
  }

  if (lower.includes("sales")) {
    return {
      icon: FinanceIcon,
      iconClass: "bg-purple-500",
    };
  }

  return {
    icon: DefaultDivisionIcon,
    iconClass: index % 2 === 0 ? "bg-sky-500" : "bg-cyan-500",
  };
}

export default function SuperAdminDepartmentSelect() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [divisions, setDivisions] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    Promise.allSettled([getDepartments(), getUsers(), getAllProjects()]).then(
      ([divisionResult, userResult, projectResult]) => {
        if (divisionResult.status === "fulfilled") {
          const items = Array.isArray(divisionResult.value)
            ? divisionResult.value
            : [];

          setDivisions(items.length ? items : fallbackDivisions);
        } else {
          setDivisions(fallbackDivisions);
        }

        if (userResult.status === "fulfilled") {
          setUsers(Array.isArray(userResult.value) ? userResult.value : []);
        } else {
          setUsers([]);
        }

        if (projectResult.status === "fulfilled") {
          setProjects(
            Array.isArray(projectResult.value) ? projectResult.value : []
          );
        } else {
          setProjects([]);
        }
      }
    );
  }, []);

  const divisionCards = useMemo(() => {
    const source = divisions.length ? divisions : fallbackDivisions;

    return source.map((division, index) => {
      const name =
        division.name ||
        division.department ||
        division.departmentName ||
        division.division ||
        division.divisionName ||
        "Division";

      const meta = divisionMeta(name, index);

      const employeeCount = users.filter((user) => {
        const userDivision =
          user.department || user.departmentName || user.division || "";

        return normalize(userDivision) === normalize(name);
      }).length;

      const projectCount = projects.filter((project) => {
        const projectDivision =
          project.department ||
          project.departmentName ||
          project.division ||
          "";

        return normalize(projectDivision) === normalize(name);
      }).length;

      return {
        id:
          division.id ||
          division.departmentId ||
          division.divisionId ||
          slugify(name),
        name,
        employeeCount,
        projectCount,
        Icon: meta.icon,
        iconClass: meta.iconClass,
      };
    });
  }, [divisions, projects, users]);

  const openDivision = (division) => {
    navigate(`/superadmin/department/${slugify(division.name)}`, {
      state: {
        departmentName: division.name,
        divisionName: division.name,
      },
    });
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#fffdfc] px-6 py-10 text-[#171717]">
      <div className="mx-auto max-w-6xl">
        <header className="relative mb-12 flex items-center justify-center">
          <div className="flex items-center justify-center gap-1">
            <img
              src="/valencia_logo.png"
              alt="Valencia Nutrition"
              onError={(event) => {
                event.currentTarget.src = "/valencia-logo.png";
              }}
              className="h-[48px] w-[48px] object-contain"
            />

            <h1 className="text-[28px] font-black leading-[48px] tracking-[-0.025em] text-[#ff6633]">
              Valencia Nutrition
            </h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-2 rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-black text-[#171717] transition hover:border-[#ff6633] hover:text-[#ff6633]"
          >
            <LogOut size={17} />
            Logout
          </button>
        </header>

        <section className="mb-6">
          <h2 className="text-[26px] font-black leading-none text-[#ff6633]">
            Select Division
          </h2>

          <p className="mt-3 text-base font-semibold text-slate-600">
            Choose a division to view its dashboard
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {divisionCards.map((division) => (
            <button
              key={division.id}
              type="button"
              onClick={() => openDivision(division)}
              className="group min-h-[132px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff6633] hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm ${division.iconClass}`}
                >
                  <division.Icon size={19} />
                </div>

                <ArrowRight
                  size={19}
                  className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#ff6633]"
                />
              </div>

              <h3 className="mt-4 text-[15px] font-black text-[#171717]">
                {division.name}
              </h3>

              <div className="mt-5 flex items-center gap-5">
                <div>
                  <p className="text-base font-black text-[#171717]">
                    {division.employeeCount || 0}
                  </p>
                  <p className="text-xs text-slate-500">Employees</p>
                </div>

                <div className="h-7 w-px bg-slate-200" />

                <div>
                  <p className="text-base font-black text-[#171717]">
                    {division.projectCount || 0}
                  </p>
                  <p className="text-xs text-slate-500">Projects</p>
                </div>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}