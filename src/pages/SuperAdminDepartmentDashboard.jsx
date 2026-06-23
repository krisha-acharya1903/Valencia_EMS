import ChatPage from "../components/ChatPage";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Moon,
  Paperclip,
  Plus,
  Search,
  Send,
  Sun,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { getAllAttendance } from "../services/attendanceService";
import { getDepartments } from "../services/departmentService";
import { getLeaveRequests } from "../services/leaveService";
import { getAllProjects } from "../services/projectService";
import { getAllTasks } from "../services/taskService";
import { getUsers } from "../services/userService";
import "../styles/darkMode.css";

const ORANGE = "#FF6B35";

const fallbackDivisions = [
  { id: "aroma-de-valencia", name: "Aroma De Valencia" },
  { id: "bounce-super-water", name: "Bounce Super Water" },
  { id: "can-beverages", name: "Can Beverages" },
  { id: "crunzzo", name: "Crunzzo" },
  { id: "erp-accounts-finance", name: "ERP / Accounts / Finance" },
  { id: "high-altitude-water", name: "High Altitude Water" },
  { id: "sales-team", name: "Sales Team" },
  { id: "soda-fountain-machine", name: "Soda Fountain Machine" },
  { id: "software-team", name: "Software Team" },
  { id: "vending-machine", name: "Vending Machine" },
];

const navItems = [
  { key: "dashboard", label: "Overview", icon: LayoutDashboard },
  { key: "employees", label: "Employees", icon: Users },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
  { key: "approvals", label: "Approvals", icon: CheckCircle2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "chatbox", label: "Chatbox", icon: MessageSquare },
];

const defaultDepartmentFilters = [
  "All",
  "Marketing",
  "Engineering",
  "Finance",
  "Operations",
  "HR",
  "Sales",
  "R&D",
  "Logistics",
  "Design",
  "Creatives",
];

function normalize(value) {
  return String(value || "").toLowerCase().replaceAll("_", " ").trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromSlug(value) {
  return String(value || "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDivisionName(item) {
  if (typeof item === "string") return item;

  return (
    item?.name ||
    item?.department ||
    item?.departmentName ||
    item?.division ||
    item?.divisionName ||
    ""
  );
}

function getInitials(name = "") {
  const words = String(name).trim().split(" ").filter(Boolean);

  if (!words.length) return "SA";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getProjectName(project) {
  return project?.name || project?.title || project?.projectName || "Untitled";
}

function getProjectId(project) {
  return String(project?.id || project?.projectId || project?.project_id || "");
}

function getProjectDeadline(project) {
  return (
    project?.deadline ||
    project?.dueDate ||
    project?.due_date ||
    project?.endDate ||
    project?.end_date ||
    "-"
  );
}

function getTaskProjectId(task) {
  return String(task?.projectId || task?.project_id || "");
}

function getTaskAssignedId(task) {
  return String(
    task?.assignedTo ||
      task?.assigned_to ||
      task?.userId ||
      task?.user_id ||
      task?.employeeId ||
      task?.employee_id ||
      ""
  );
}

function getUserId(user) {
  return String(user?.uid || user?.id || user?.userId || user?.user_id || "");
}

function getEmployeeName(user) {
  return (
    user?.name || user?.fullName || user?.full_name || user?.email || "Emp name"
  );
}

function getEmployeeRole(user) {
  return (
    user?.designation || user?.position || user?.jobTitle || user?.role || "Role"
  );
}

function getEmployeeDepartment(user) {
  return (
    user?.division ||
    user?.divisionName ||
    user?.department ||
    user?.departmentName ||
    "General"
  );
}

function getActivityDate(item) {
  return (
    item?.updatedAt ||
    item?.updated_at ||
    item?.createdAt ||
    item?.created_at ||
    item?.date ||
    item?.deadline ||
    item?.dueDate ||
    ""
  );
}

function getTimestamp(value) {
  if (!value) return 0;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 0;

  return date.getTime();
}

function formatDate(value) {
  if (!value || value === "-") return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isCompletedStatus(value) {
  const status = normalize(value);
  return ["completed", "complete", "done", "closed"].includes(status);
}

function isSubtaskCompleted(subtask) {
  return (
    Boolean(subtask?.completed) ||
    Boolean(subtask?.isCompleted) ||
    Boolean(subtask?.is_completed) ||
    isCompletedStatus(subtask?.status)
  );
}

function isActiveStatus(value) {
  const status = normalize(value);
  return ["active", "open", "in progress", "ongoing", "started"].includes(
    status
  );
}

function isPendingReview(value) {
  const status = normalize(value);
  return ["review", "in review", "pending review", "submitted"].includes(status);
}

function getSavedTheme() {
  const saved = localStorage.getItem("valencia_theme");

  if (saved === "dark" || saved === "light") {
    return saved;
  }

  return "light";
}

function readStoredNotifications() {
  const keys = [
    "valencia_notifications",
    "notifications",
    "ems_notifications",
    "app_notifications",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);

    if (!value) continue;

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.notifications)) return parsed.notifications;
      if (Array.isArray(parsed?.data)) return parsed.data;
    } catch {
      // ignore invalid stored data
    }
  }

  return [];
}

function normalizeNotification(item, index) {
  return {
    id:
      item.id ||
      item.notificationId ||
      item.notification_id ||
      `notification-${index}`,
    title: item.title || item.heading || item.subject || "Notification",
    message: item.message || item.description || item.body || "",
    type: item.type || item.category || "System",
    time:
      item.time || item.createdAt || item.created_at || item.date || "Recently",
    unread: Boolean(item.unread ?? item.isUnread ?? item.is_unread ?? false),
  };
}

function getDefaultNotifications(departmentName, profile) {
  return [
    {
      id: "department-dashboard",
      title: "Division dashboard opened",
      message: `${departmentName} overview is ready for review.`,
      type: "Dashboard",
      time: "Now",
      unread: true,
    },
    {
      id: "project-review",
      title: "Project review pending",
      message: "Check active projects and pending reviews from the overview.",
      type: "Projects",
      time: "Today",
      unread: true,
    },
    {
      id: "welcome-superadmin",
      title: "Welcome back",
      message: `Signed in as ${profile?.email || "Super Admin"}.`,
      type: "Account",
      time: "Today",
      unread: false,
    },
  ];
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getEmployeeTaskStats(user, tasks) {
  const userId = getUserId(user);

  const assignedTasks = tasks.filter(
    (task) => getTaskAssignedId(task) === String(userId)
  );

  const total = assignedTasks.length;
  const completed = assignedTasks.filter((task) =>
    isCompletedStatus(task.status)
  ).length;

  const progress = total ? Math.round((completed / total) * 100) : 0;

  return {
    completed,
    total,
    progress,
  };
}

function getLatestAttendance(user, attendance) {
  const userId = getUserId(user);

  const records = attendance
    .filter((item) => {
      const attendanceUserId = String(
        item.userId ||
          item.user_id ||
          item.employeeId ||
          item.employee_id ||
          item.uid ||
          ""
      );

      return attendanceUserId === String(userId);
    })
    .sort(
      (a, b) =>
        getTimestamp(getActivityDate(b)) - getTimestamp(getActivityDate(a))
    );

  return records[0] || null;
}

function getAttendancePercentage(user, attendance) {
  const userId = getUserId(user);

  const records = attendance.filter((item) => {
    const attendanceUserId = String(
      item.userId ||
        item.user_id ||
        item.employeeId ||
        item.employee_id ||
        item.uid ||
        ""
    );

    return attendanceUserId === String(userId);
  });

  if (!records.length) return "-";

  const presentRecords = records.filter((item) => {
    const status = normalize(item.status || item.type);
    return status.includes("present") || status.includes("check in");
  });

  return `${Math.round((presentRecords.length / records.length) * 100)}%`;
}

function getEmployeeStatus(user, attendance) {
  const latest = getLatestAttendance(user, attendance);
  const userStatus = normalize(user?.status);

  if (userStatus.includes("inactive") || userStatus.includes("absent")) {
    return "Absent";
  }

  if (latest) {
    const status = normalize(latest.status || latest.type);

    if (status.includes("absent")) return "Absent";
    if (status.includes("present") || status.includes("check in")) {
      return "Present";
    }
  }

  return "Present";
}

function getWeeklyHours(user, attendance) {
  const userId = getUserId(user);

  const now = new Date();
  const sevenDaysAgo = new Date();

  sevenDaysAgo.setDate(now.getDate() - 7);

  const records = attendance.filter((item) => {
    const attendanceUserId = String(
      item.userId ||
        item.user_id ||
        item.employeeId ||
        item.employee_id ||
        item.uid ||
        ""
    );

    const dateValue =
      item.date ||
      item.createdAt ||
      item.created_at ||
      item.checkIn ||
      item.check_in ||
      item.clockIn ||
      item.clock_in ||
      "";

    const date = new Date(dateValue);

    return (
      attendanceUserId === String(userId) &&
      !Number.isNaN(date.getTime()) &&
      date >= sevenDaysAgo
    );
  });

  const totalMinutes = records.reduce((total, item) => {
    const hours = Number(item.totalHours || item.total_hours || item.hours || 0);

    if (!Number.isFinite(hours)) return total;

    return total + Math.round(hours * 60);
  }, 0);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function getEmployeeProjectList(user, projects, tasks) {
  const userId = getUserId(user);

  return projects.filter((project) => {
    const projectId = getProjectId(project);

    const managerMatch =
      String(project.managerId || project.manager_id || "") === String(userId);

    const members = Array.isArray(project.members)
      ? project.members.map((member) => {
          if (typeof member === "object" && member !== null) {
            return String(
              member.id || member.uid || member.userId || member.user_id || ""
            );
          }

          return String(member);
        })
      : [];

    const assignedUsers = Array.isArray(project.assignedUsers)
      ? project.assignedUsers.map((member) => {
          if (typeof member === "object" && member !== null) {
            return String(
              member.id || member.uid || member.userId || member.user_id || ""
            );
          }

          return String(member);
        })
      : [];

    const memberMatch =
      members.includes(String(userId)) || assignedUsers.includes(String(userId));

    const taskMatch = tasks.some((task) => {
      return (
        getTaskProjectId(task) === String(projectId) &&
        getTaskAssignedId(task) === String(userId)
      );
    });

    return managerMatch || memberMatch || taskMatch;
  });
}

function getProjectTasks(project, tasks, user) {
  const projectId = getProjectId(project);
  const userId = getUserId(user);

  return tasks.filter((task) => {
    return (
      getTaskProjectId(task) === String(projectId) &&
      getTaskAssignedId(task) === String(userId)
    );
  });
}

function getTaskTitle(task) {
  return (
    task?.title || task?.name || task?.taskName || task?.task || "Untitled Task"
  );
}

function getTaskDeadline(task) {
  return (
    task?.deadline || task?.dueDate || task?.due_date || task?.endDate || "-"
  );
}

function getTaskPriority(task) {
  return task?.priority || "Medium";
}

function getTaskSubtasks(task) {
  if (Array.isArray(task?.subtasks)) return task.subtasks;
  if (Array.isArray(task?.sub_tasks)) return task.sub_tasks;
  if (Array.isArray(task?.children)) return task.children;
  return [];
}

function getSubtaskTitle(subtask, index) {
  return (
    subtask?.title ||
    subtask?.name ||
    subtask?.subtask ||
    subtask?.description ||
    `Subtask ${index + 1}`
  );
}

function getAssignableProjects(user, projects) {
  const employeeDepartment = normalize(getEmployeeDepartment(user));

  const departmentProjects = projects.filter((project) => {
    const projectDivision =
      project.department || project.departmentName || project.division || "";

    return normalize(projectDivision) === employeeDepartment;
  });

  const source = departmentProjects.length ? departmentProjects : projects;

  return source
    .map((project) => ({
      id: getProjectId(project),
      name: getProjectName(project),
      department: project.department || project.division || "",
      status: project.status || "ongoing",
      priority: project.priority || "medium",
      deadline: getProjectDeadline(project),
      description: project.description || project.shortDescription || "",
    }))
    .filter((project) => project.id);
}

function StatusBadgeSmall({ value }) {
  const normalized = normalize(value);

  let classes = "bg-orange-50 text-[#FF6B35] border-orange-100";

  if (isCompletedStatus(normalized)) {
    classes = "bg-emerald-50 text-emerald-600 border-emerald-100";
  } else if (normalized.includes("hold")) {
    classes = "bg-yellow-50 text-yellow-700 border-yellow-100";
  } else if (normalized.includes("cancel") || normalized.includes("abort")) {
    classes = "bg-red-50 text-red-600 border-red-100";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${classes}`}
    >
      {String(value || "Ongoing").replaceAll("_", " ")}
    </span>
  );
}

function TrendingIcon({ size = 19 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function DivisionDropdown({ value, options, onChange }) {
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const cleanOptions = useMemo(() => {
    return [...new Set((options || []).filter(Boolean))];
  }, [options]);

  const filteredOptions = useMemo(() => {
    const search = normalize(query);

    if (!search) return cleanOptions;

    return cleanOptions.filter((item) => normalize(item).includes(search));
  }, [cleanOptions, query]);

  useEffect(() => {
    function closeDropdown(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeDropdown);

    return () => {
      document.removeEventListener("mousedown", closeDropdown);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative mb-7">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
          open
            ? "border-[#FF6B35] bg-orange-50 shadow-[0_12px_28px_rgba(255,107,53,0.16)]"
            : "border-slate-100 bg-slate-50 hover:border-orange-100 hover:bg-orange-50/70"
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6B35] shadow-sm">
          <Building2 size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Division
          </p>
          <p className="mt-1 truncate text-[13px] font-black text-[#151515]">
            {value || "Select Division"}
          </p>
        </div>

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 transition ${
            open ? "rotate-180 text-[#FF6B35]" : "group-hover:text-[#FF6B35]"
          }`}
        >
          <ChevronDown size={17} />
        </div>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[78px] z-[100] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
          <div className="border-b border-slate-100 bg-orange-50/60 p-3">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-orange-100 bg-white px-3">
              <Search size={15} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search division..."
                className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#151515] outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="max-h-[295px] overflow-y-auto p-2">
            {filteredOptions.length ? (
              filteredOptions.map((division) => {
                const active = normalize(division) === normalize(value);

                return (
                  <button
                    key={division}
                    type="button"
                    onClick={() => {
                      onChange(division);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-[#FF6B35] text-white shadow-sm"
                        : "text-[#151515] hover:bg-orange-50 hover:text-[#FF6B35]"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-orange-50 text-[#FF6B35]"
                      }`}
                    >
                      {getInitials(division)}
                    </div>

                    <span className="min-w-0 flex-1 truncate text-xs font-black">
                      {division}
                    </span>

                    {active ? <CheckCircle2 size={16} /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-xs font-bold text-slate-500">
                No division found.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SuperAdminDepartmentDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { departmentSlug } = useParams();
  const notificationRef = useRef(null);

  const departmentName =
    location.state?.departmentName ||
    location.state?.divisionName ||
    titleFromSlug(departmentSlug);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [theme, setTheme] = useState(getSavedTheme);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("All");
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const isDark = theme === "dark";

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => item.unread).length;
  }, [notifications]);

  const divisionOptions = useMemo(() => {
    const apiDivisionNames = divisions.map(getDivisionName).filter(Boolean);
    const fallbackDivisionNames = fallbackDivisions.map(
      (division) => division.name
    );

    return [departmentName, ...fallbackDivisionNames, ...apiDivisionNames]
      .filter(Boolean)
      .filter((name, index, array) => {
        return (
          array.findIndex((item) => normalize(item) === normalize(name)) ===
          index
        );
      });
  }, [departmentName, divisions]);

  const handleDivisionChange = (event) => {
    const selectedDivision = event.target.value;

    if (
      !selectedDivision ||
      normalize(selectedDivision) === normalize(departmentName)
    ) {
      return;
    }

    navigate(`/superadmin/department/${slugify(selectedDivision)}`, {
      state: {
        departmentName: selectedDivision,
        divisionName: selectedDivision,
      },
    });
  };

  useEffect(() => {
    const storedNotifications = readStoredNotifications();

    if (storedNotifications.length) {
      setNotifications(storedNotifications.map(normalizeNotification));
    } else {
      setNotifications(
        getDefaultNotifications(departmentName, profile).map(
          normalizeNotification
        )
      );
    }
  }, [departmentName, profile]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isDark) {
      root.classList.add("dark");
      body.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("valencia_theme", "dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      localStorage.setItem("valencia_theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const closeDropdown = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", closeDropdown);

    return () => {
      document.removeEventListener("mousedown", closeDropdown);
    };
  }, []);

  useEffect(() => {
    Promise.allSettled([
      getUsers(),
      getAllProjects(),
      getAllTasks(),
      getAllAttendance(),
      getLeaveRequests({ role: "superAdmin" }),
      getDepartments(),
    ]).then(
      ([
        userResult,
        projectResult,
        taskResult,
        attendanceResult,
        leaveResult,
        divisionResult,
      ]) => {
        setUsers(
          userResult.status === "fulfilled" && Array.isArray(userResult.value)
            ? userResult.value
            : []
        );

        setProjects(
          projectResult.status === "fulfilled" &&
            Array.isArray(projectResult.value)
            ? projectResult.value
            : []
        );

        setTasks(
          taskResult.status === "fulfilled" && Array.isArray(taskResult.value)
            ? taskResult.value
            : []
        );

        setAttendance(
          attendanceResult.status === "fulfilled" &&
            Array.isArray(attendanceResult.value)
            ? attendanceResult.value
            : []
        );

        setLeaves(
          leaveResult.status === "fulfilled" && Array.isArray(leaveResult.value)
            ? leaveResult.value
            : []
        );

        setDivisions(
          divisionResult.status === "fulfilled" &&
            Array.isArray(divisionResult.value)
            ? divisionResult.value
            : fallbackDivisions
        );
      }
    );
  }, []);

  const employeeUsers = useMemo(() => {
    return users.filter((user) => normalize(user.role) !== "superadmin");
  }, [users]);

  const departmentFilters = useMemo(() => {
    const actualDepartments = employeeUsers
      .map((user) => getEmployeeDepartment(user))
      .filter(Boolean);

    return [...new Set([...defaultDepartmentFilters, ...actualDepartments])];
  }, [employeeUsers]);

  const departmentUsers = useMemo(() => {
    return users.filter((user) => {
      const userDivision =
        user.department || user.departmentName || user.division || "";

      return normalize(userDivision) === normalize(departmentName);
    });
  }, [departmentName, users]);

  const departmentUserIds = useMemo(() => {
    return new Set(departmentUsers.map((user) => getUserId(user)));
  }, [departmentUsers]);

  const departmentProjects = useMemo(() => {
    return projects.filter((project) => {
      const projectDivision =
        project.department ||
        project.departmentName ||
        project.division ||
        "";

      return normalize(projectDivision) === normalize(departmentName);
    });
  }, [departmentName, projects]);

  const departmentProjectIds = useMemo(() => {
    return new Set(departmentProjects.map((project) => getProjectId(project)));
  }, [departmentProjects]);

  const departmentTasks = useMemo(() => {
    return tasks.filter((task) => {
      const projectMatch = departmentProjectIds.has(getTaskProjectId(task));
      const assignedMatch = departmentUserIds.has(getTaskAssignedId(task));

      const taskDivision =
        task.department || task.departmentName || task.division || "";

      const departmentMatch = normalize(taskDivision) === normalize(departmentName);

      return projectMatch || assignedMatch || departmentMatch;
    });
  }, [departmentName, departmentProjectIds, departmentUserIds, tasks]);

  const departmentLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const userId = String(
        leave.userId ||
          leave.user_id ||
          leave.employeeId ||
          leave.employee_id ||
          leave.requestedBy ||
          leave.requested_by ||
          ""
      );

      const leaveDivision =
        leave.department || leave.departmentName || leave.division || "";

      return (
        departmentUserIds.has(userId) ||
        normalize(leaveDivision) === normalize(departmentName)
      );
    });
  }, [departmentName, departmentUserIds, leaves]);

  const metrics = useMemo(() => {
    const activeProjects = departmentProjects.filter((project) =>
      isActiveStatus(project.status || "active")
    ).length;

    const completedTasks = departmentTasks.filter((task) =>
      isCompletedStatus(task.status)
    ).length;

    const pendingReviews =
      departmentTasks.filter((task) => isPendingReview(task.status)).length +
      departmentLeaves.filter((leave) => normalize(leave.status) === "pending")
        .length;

    return {
      activeProjects,
      teamMembers: departmentUsers.length,
      completedTasks,
      pendingReviews,
    };
  }, [departmentLeaves, departmentProjects, departmentTasks, departmentUsers]);

  const topProjects = useMemo(() => {
    return [...departmentProjects]
      .sort((a, b) => {
        const aPriority = normalize(a.priority) === "high" ? 1 : 0;
        const bPriority = normalize(b.priority) === "high" ? 1 : 0;

        return (
          bPriority - aPriority ||
          Number(b.progress || 0) - Number(a.progress || 0)
        );
      })
      .slice(0, 4);
  }, [departmentProjects]);

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

    return months.map((month, index) => ({
      month,
      Projects:
        departmentProjects.filter((_, projectIndex) => projectIndex % 6 <= index)
          .length +
        10 +
        index,
      Tasks:
        departmentTasks.filter((_, taskIndex) => taskIndex % 6 <= index).length +
        7 +
        index,
    }));
  }, [departmentProjects, departmentTasks]);

  const recentActivity = useMemo(() => {
    const projectActivity = departmentProjects.map((project, index) => ({
      id: `project-${getProjectId(project) || index}`,
      name: getInitials(getProjectName(project)),
      title: `${getProjectName(project)} project updated`,
      date: getActivityDate(project),
      timestamp: getTimestamp(getActivityDate(project)),
    }));

    const taskActivity = departmentTasks.map((task, index) => ({
      id: `task-${task.id || index}`,
      name: "TM",
      title: `Task updated: ${task.title || task.name || "Untitled Task"}`,
      date: getActivityDate(task),
      timestamp: getTimestamp(getActivityDate(task)),
    }));

    const leaveActivity = departmentLeaves.map((leave, index) => ({
      id: `leave-${leave.id || index}`,
      name: getInitials(leave.userName || leave.user_name || "LA"),
      title: `${
        leave.userName || leave.user_name || "Employee"
      } submitted leave request`,
      date: getActivityDate(leave),
      timestamp: getTimestamp(getActivityDate(leave)),
    }));

    return [...projectActivity, ...taskActivity, ...leaveActivity]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [departmentLeaves, departmentProjects, departmentTasks]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  const markAllNotificationsRead = () => {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        unread: false,
      }))
    );

    toast.success("Notifications marked as read.");
  };

  const clearNotifications = () => {
    setNotifications([]);
    toast.success("Notifications cleared.");
  };

  const handleHeaderBack = () => {
    setActiveSection("employees");
  };

  return (
    <main className="min-h-screen bg-white text-[#151515]">
      <aside className="fixed left-0 top-0 z-20 flex h-screen w-[250px] flex-col border-r border-slate-100 bg-white px-4 py-5">
        <button
          type="button"
          onClick={() => navigate("/superadmin")}
          className="mb-8 flex items-center gap-2 text-left"
        >
          <img
            src="/valencia_logo.png"
            alt="Valencia Nutrition"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="h-8 w-8 object-contain"
          />

          <span className="text-sm font-black text-[#FF6B35]">
            Valencia Nutrition
          </span>

          <span className="ml-auto text-slate-400">‹</span>
        </button>

        <DivisionDropdown
          value={departmentName}
          options={divisionOptions}
          onChange={(selectedDivision) =>
            handleDivisionChange({
              target: {
                value: selectedDivision,
              },
            })
          }
        />

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSection(item.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-black transition ${
                  active
                    ? "bg-[#FF6B35] text-white"
                    : "text-[#151515] hover:bg-orange-50 hover:text-[#FF6B35]"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="mb-4 rounded-xl bg-orange-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B35] text-xs font-black text-white">
                SA
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black">Super Admin</p>
                <p className="truncate text-xs text-slate-500">
                  {profile?.email || "superadmin@valencia.com"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#FF6B35]"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <section className="ml-[250px] min-h-screen">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-8">
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={handleHeaderBack}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6B35] text-white transition hover:opacity-90"
                title="Back to Employees"
              >
                <ArrowLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("dashboard")}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6B35] text-white transition hover:opacity-90"
                title="Go to Overview"
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div>
              <h1 className="text-xl font-black text-[#FF6B35]">
                {activeSection === "dashboard"
                  ? "Overview"
                  : navItems.find((item) => item.key === activeSection)?.label}
              </h1>

              <p className="text-sm text-slate-500">
                Product innovation and formulation
              </p>
            </div>
          </div>

          <NotificationDropdown
            notificationRef={notificationRef}
            notificationOpen={notificationOpen}
            setNotificationOpen={setNotificationOpen}
            notifications={notifications}
            unreadCount={unreadCount}
            markAllNotificationsRead={markAllNotificationsRead}
            clearNotifications={clearNotifications}
          />
        </header>

        <div className="px-8 py-8">
          {activeSection === "dashboard" ? (
            <DashboardSection
              metrics={metrics}
              topProjects={topProjects}
              tasks={departmentTasks}
              users={departmentUsers}
              chartData={chartData}
              recentActivity={recentActivity}
            />
          ) : null}

          {activeSection === "employees" ? (
            <EmployeeDirectorySection
              allUsers={employeeUsers}
              projects={projects}
              tasks={tasks}
              attendance={attendance}
              search={employeeSearch}
              setSearch={setEmployeeSearch}
              activeFilter={employeeFilter}
              setActiveFilter={setEmployeeFilter}
              filters={departmentFilters}
            />
          ) : null}

         {activeSection === "attendance" ? (
  <SuperAdminAttendanceSection
    users={employeeUsers}
    attendance={attendance}
    leaves={leaves}
  />
) : null}

          {activeSection === "approvals" ? (
            <SuperAdminApprovalsSection
              projects={departmentProjects}
              leaves={departmentLeaves}
              departmentName={departmentName}
            />
          ) : null}

          {activeSection === "notifications" ? (
            <SuperAdminNotificationsSection
              departmentName={departmentName}
              users={employeeUsers}
              divisions={divisionOptions}
              notifications={notifications}
              setNotifications={setNotifications}
            />
          ) : null}

          {activeSection === "chatbox" ? <ChatboxSection /> : null}
        </div>
      </section>
    </main>
  );
}

function NotificationDropdown({
  notificationRef,
  notificationOpen,
  setNotificationOpen,
  notifications,
  unreadCount,
  markAllNotificationsRead,
  clearNotifications,
}) {
  return (
    <div className="relative" ref={notificationRef}>
      <button
        type="button"
        onClick={() => setNotificationOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-50"
        title="Notifications"
      >
        <Bell size={19} />

        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {notificationOpen ? (
        <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div>
              <h3 className="text-base font-black text-[#151515]">
                Notifications
              </h3>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                {notifications.length
                  ? `${notifications.length} notification${
                      notifications.length === 1 ? "" : "s"
                    }`
                  : "No notifications"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNotificationOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X size={17} />
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`border-b border-slate-100 px-5 py-4 ${
                    item.unread ? "bg-orange-50/60" : "bg-white"
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        item.unread
                          ? "bg-[#FF6B35] text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.unread ? (
                        <Bell size={17} />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black text-[#151515]">
                          {item.title}
                        </p>

                        {item.unread ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FF6B35]" />
                        ) : null}
                      </div>

                      {item.message ? (
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {item.message}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase text-slate-700">
                          {item.type}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                          <Clock size={12} />
                          {item.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Bell size={20} />
                </div>

                <p className="mt-3 text-sm font-black text-[#151515]">
                  No notifications yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  New alerts will appear here.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={markAllNotificationsRead}
              disabled={!notifications.length}
              className="rounded-lg px-3 py-2 text-xs font-black text-[#FF6B35] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>

            <button
              type="button"
              onClick={clearNotifications}
              disabled={!notifications.length}
              className="rounded-lg px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardSection({
  metrics,
  topProjects,
  tasks,
  users,
  chartData,
  recentActivity,
}) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-2">
        <MetricCard
          title="Active Projects"
          value={metrics.activeProjects}
          delta="+12% from last month"
          tone="blue"
        />

        <MetricCard
          title="Total Team Members"
          value={metrics.teamMembers}
          delta="+8 from last month"
          tone="purple"
        />

        <MetricCard
          title="Completed Tasks"
          value={metrics.completedTasks}
          delta="+23% from last month"
          tone="green"
        />

        <MetricCard
          title="Pending Reviews"
          value={metrics.pendingReviews}
          delta="-3 from last month"
          tone="pink"
        />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black">Top Priority Projects</h2>
            <p className="text-sm text-slate-500">
              Leading projects requiring immediate attention
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
          >
            View All →
          </button>
        </div>

        <div className="space-y-5">
          {topProjects.length ? (
            topProjects.map((project) => (
              <ProjectCard
                key={getProjectId(project) || getProjectName(project)}
                project={project}
                tasks={tasks}
                users={users}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No projects found for this division.
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black">Project Overview</h2>
        <p className="text-sm text-slate-500">Monthly project statistics</p>

        <div className="mt-4 h-[340px] rounded-2xl border border-slate-200 bg-white p-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="Projects" fill={ORANGE} radius={[8, 8, 0, 0]} />
              <Bar dataKey="Tasks" fill="#51c9c2" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-black">Recent Activity</h2>
        <p className="text-sm text-slate-500">
          Latest updates from your division
        </p>

        <div className="mt-5 divide-y divide-slate-100">
          {recentActivity.length ? (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B35] text-sm font-black text-white">
                  {activity.name}
                </div>

                <div>
                  <p className="font-semibold">{activity.title}</p>
                  <p className="text-xs text-slate-400">
                    {activity.date ? formatDate(activity.date) : "Recently"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500">
              No recent activity found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EmployeeMetricBox({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#FF6B35]">
          <Icon size={19} />
        </div>

        <div>
          <p className="text-2xl font-black leading-none text-[#061536]">
            {value}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EmployeeDirectorySection({
  allUsers,
  projects,
  tasks,
  attendance,
  search,
  setSearch,
  activeFilter,
  setActiveFilter,
  filters,
}) {
  const TASK_STORAGE_KEY = "valencia_superadmin_local_tasks";
  const REMARK_STORAGE_KEY = "valencia_superadmin_employee_remarks";
  const MESSAGE_STORAGE_KEY = "valencia_superadmin_employee_messages";

  const [directoryMode, setDirectoryMode] = useState("employees");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState("");

  const [localTasks, setLocalTasks] = useState(() =>
    readLocalJson(TASK_STORAGE_KEY, [])
  );
  const [remarks, setRemarks] = useState(() =>
    readLocalJson(REMARK_STORAGE_KEY, [])
  );
  const [messages, setMessages] = useState(() =>
    readLocalJson(MESSAGE_STORAGE_KEY, [])
  );

  const [activeModal, setActiveModal] = useState("");
  const [taskForm, setTaskForm] = useState({
    projectId: "",
    title: "",
    description: "",
    priority: "medium",
    deadline: "",
  });
  const [remarkText, setRemarkText] = useState("");
  const [messageText, setMessageText] = useState("");

  const showingAdmins = directoryMode === "admins";

  const isAdminUser = (user) => {
    const role = normalize(user?.role);
    return role.includes("admin") && !role.includes("super");
  };

  const visibleBaseUsers = useMemo(() => {
    return allUsers.filter((user) => {
      const admin = isAdminUser(user);
      return showingAdmins ? admin : !admin;
    });
  }, [allUsers, showingAdmins]);

  const displayUsers = useMemo(() => {
    const query = normalize(search);

    return visibleBaseUsers.filter((user) => {
      const department = getEmployeeDepartment(user);

      const filterMatch =
        activeFilter === "All" ||
        normalize(department) === normalize(activeFilter);

      const searchText = normalize(
        [
          getEmployeeName(user),
          user.email,
          getEmployeeRole(user),
          department,
          user.phone,
          user.role,
        ].join(" ")
      );

      return filterMatch && (!query || searchText.includes(query));
    });
  }, [activeFilter, search, visibleBaseUsers]);

  const combinedTasks = useMemo(() => {
    return [...tasks, ...localTasks];
  }, [tasks, localTasks]);

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;

    return (
      displayUsers.find((user) => getUserId(user) === selectedEmployeeId) ||
      null
    );
  }, [selectedEmployeeId, displayUsers]);

  const selectedProjects = useMemo(() => {
    if (!selectedEmployee) return [];

    const userId = getUserId(selectedEmployee);
    const realProjects = getEmployeeProjectList(
      selectedEmployee,
      projects,
      combinedTasks
    );

    const directProjectId = `direct-${userId}`;

    const hasDirectTasks = combinedTasks.some(
      (task) =>
        getTaskAssignedId(task) === String(userId) &&
        getTaskProjectId(task) === directProjectId
    );

    if (!hasDirectTasks) return realProjects;

    const alreadyExists = realProjects.some(
      (project) => getProjectId(project) === directProjectId
    );

    if (alreadyExists) return realProjects;

    return [
      {
        id: directProjectId,
        name: "Direct Assigned Tasks",
        description: "Tasks assigned directly to this user.",
        status: "ongoing",
        priority: "medium",
        progress: 0,
        deadline: "-",
      },
      ...realProjects,
    ];
  }, [selectedEmployee, projects, combinedTasks]);

  const selectedTaskStats = useMemo(() => {
    if (!selectedEmployee) {
      return {
        completed: 0,
        total: 0,
        progress: 0,
      };
    }

    return getEmployeeTaskStats(selectedEmployee, combinedTasks);
  }, [selectedEmployee, combinedTasks]);

  const selectedAttendance = selectedEmployee
    ? getAttendancePercentage(selectedEmployee, attendance)
    : "-";

  const weeklyHours = selectedEmployee
    ? getWeeklyHours(selectedEmployee, attendance)
    : "0h 00m";

  const activeProject = useMemo(() => {
    if (!selectedProjectId) return null;

    return (
      selectedProjects.find(
        (project) => getProjectId(project) === selectedProjectId
      ) || null
    );
  }, [selectedProjectId, selectedProjects]);

  useEffect(() => {
    if (!selectedProjectId) return;

    const stillExists = selectedProjects.some(
      (project) => getProjectId(project) === selectedProjectId
    );

    if (!stillExists) {
      setSelectedProjectId("");
      setExpandedTaskId("");
    }
  }, [selectedProjects, selectedProjectId]);

  const activeProjectTasks = useMemo(() => {
    if (!activeProject || !selectedEmployee) return [];

    return getProjectTasks(activeProject, combinedTasks, selectedEmployee);
  }, [activeProject, combinedTasks, selectedEmployee]);

  const latestRemark = useMemo(() => {
    if (!selectedEmployee) return null;

    return remarks
      .filter((item) => item.employeeId === getUserId(selectedEmployee))
      .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))[0];
  }, [remarks, selectedEmployee]);

  const latestMessage = useMemo(() => {
    if (!selectedEmployee) return null;

    return messages
      .filter((item) => item.employeeId === getUserId(selectedEmployee))
      .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))[0];
  }, [messages, selectedEmployee]);

  const handleDirectorySwitch = () => {
    setDirectoryMode((current) =>
      current === "employees" ? "admins" : "employees"
    );

    setSelectedEmployeeId("");
    setSelectedProjectId("");
    setExpandedTaskId("");
    setActiveModal("");
    setActiveFilter("All");
  };

  const handleEmployeeClick = (user) => {
    const employeeId = getUserId(user);

    if (!employeeId) {
      toast.error("User ID not found.");
      return;
    }

    setSelectedEmployeeId(employeeId);
    setSelectedProjectId("");
    setExpandedTaskId("");
  };

  const closeEmployeePanel = () => {
    setSelectedEmployeeId("");
    setSelectedProjectId("");
    setExpandedTaskId("");
    setActiveModal("");
  };

  const handleProjectClick = (project) => {
    const clickedProjectId = getProjectId(project);

    setSelectedProjectId((current) =>
      current === clickedProjectId ? "" : clickedProjectId
    );

    setExpandedTaskId("");
  };

  const handleTaskClick = (task, index) => {
    const taskId = String(
      task?.id ||
        task?.taskId ||
        task?.task_id ||
        `${getTaskTitle(task)}-${index}`
    );

    setExpandedTaskId((current) => (current === taskId ? "" : taskId));
  };

  const assignableProjects = selectedEmployee
    ? getAssignableProjects(selectedEmployee, projects)
    : [];

  const directProjectOption = selectedEmployee
    ? {
        id: `direct-${getUserId(selectedEmployee)}`,
        name: "Direct Assigned Tasks",
      }
    : null;

  const projectOptions = directProjectOption
    ? [directProjectOption, ...assignableProjects]
    : assignableProjects;

  const openAssignTask = () => {
    if (!selectedEmployee) {
      toast.error(`Select ${showingAdmins ? "an admin" : "an employee"} first.`);
      return;
    }

    setTaskForm({
      projectId:
        projectOptions[0]?.id || `direct-${getUserId(selectedEmployee)}`,
      title: "",
      description: "",
      priority: "medium",
      deadline: "",
    });

    setActiveModal("task");
  };

  const openRemark = () => {
    if (!selectedEmployee) {
      toast.error(`Select ${showingAdmins ? "an admin" : "an employee"} first.`);
      return;
    }

    setRemarkText("");
    setActiveModal("remark");
  };

  const openMessage = () => {
    if (!selectedEmployee) {
      toast.error(`Select ${showingAdmins ? "an admin" : "an employee"} first.`);
      return;
    }

    setMessageText("");
    setActiveModal("message");
  };

  const saveTask = (event) => {
    event.preventDefault();

    if (!selectedEmployee) {
      toast.error(`Select ${showingAdmins ? "an admin" : "an employee"} first.`);
      return;
    }

    if (!taskForm.title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    const userId = getUserId(selectedEmployee);
    const taskId = `local-task-${Date.now()}`;
    const projectId = taskForm.projectId || `direct-${userId}`;

    const newTask = {
      id: taskId,
      taskId,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      priority: taskForm.priority,
      deadline: taskForm.deadline,
      status: "pending",
      projectId,
      assignedTo: userId,
      userId,
      employeeId: userId,
      department: getEmployeeDepartment(selectedEmployee),
      createdAt: new Date().toISOString(),
      subtasks: [],
    };

    setLocalTasks((current) => {
      const updated = [newTask, ...current];
      writeLocalJson(TASK_STORAGE_KEY, updated);
      return updated;
    });

    setSelectedProjectId(projectId);
    setExpandedTaskId("");
    setActiveModal("");
    toast.success("Task assigned successfully.");
  };

  const saveRemark = (event) => {
    event.preventDefault();

    if (!selectedEmployee) {
      toast.error(`Select ${showingAdmins ? "an admin" : "an employee"} first.`);
      return;
    }

    if (!remarkText.trim()) {
      toast.error("Remark is required.");
      return;
    }

    const newRemark = {
      id: `remark-${Date.now()}`,
      employeeId: getUserId(selectedEmployee),
      employeeName: getEmployeeName(selectedEmployee),
      remark: remarkText.trim(),
      createdAt: new Date().toISOString(),
      by: "Super Admin",
    };

    setRemarks((current) => {
      const updated = [newRemark, ...current];
      writeLocalJson(REMARK_STORAGE_KEY, updated);
      return updated;
    });

    setActiveModal("");
    toast.success("Remark added successfully.");
  };

  const saveMessage = (event) => {
    event.preventDefault();

    if (!selectedEmployee) {
      toast.error(`Select ${showingAdmins ? "an admin" : "an employee"} first.`);
      return;
    }

    if (!messageText.trim()) {
      toast.error("Message is required.");
      return;
    }

    const newMessage = {
      id: `message-${Date.now()}`,
      employeeId: getUserId(selectedEmployee),
      employeeName: getEmployeeName(selectedEmployee),
      message: messageText.trim(),
      createdAt: new Date().toISOString(),
      by: "Super Admin",
      unread: true,
    };

    setMessages((current) => {
      const updated = [newMessage, ...current];
      writeLocalJson(MESSAGE_STORAGE_KEY, updated);
      return updated;
    });

    setActiveModal("");
    toast.success("Message sent successfully.");
  };

  const title = showingAdmins ? "Admins" : "Employees";
  const personLabel = showingAdmins ? "Admin" : "Employee";
  const emptyMessage = showingAdmins ? "No admins found." : "No employees found.";

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#151515]">{title}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {visibleBaseUsers.length}{" "}
            {showingAdmins ? "admins" : "team members"} across all departments
          </p>
        </div>

        <button
          type="button"
          onClick={handleDirectorySwitch}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:opacity-90"
        >
          <Users size={17} />
          {showingAdmins ? "Switch to Employees" : "Switch to Admin"}
        </button>
      </div>

      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${
            showingAdmins ? "admin" : "employee"
          } or department...`}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-[#FF6B35]"
        />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = activeFilter === filter;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
                active
                  ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-[#FF6B35] hover:text-[#FF6B35]"
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div
        className={
          selectedEmployee
            ? "grid gap-4 xl:grid-cols-[410px_1fr]"
            : "grid gap-4"
        }
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div
            className={
              selectedEmployee
                ? "grid grid-cols-[1fr_130px] border-b border-slate-100 bg-slate-50"
                : "grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] border-b border-slate-100 bg-slate-50"
            }
          >
            <div className="px-8 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              {personLabel}
            </div>

            <div className="px-8 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Department
            </div>

            {!selectedEmployee ? (
              <>
                <div className="px-8 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Progress
                </div>
                <div className="px-8 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Tasks
                </div>
                <div className="px-8 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Attendance
                </div>
                <div className="px-8 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Status
                </div>
              </>
            ) : null}
          </div>

          <div className={selectedEmployee ? "max-h-[690px] overflow-auto" : ""}>
            {displayUsers.map((user) => {
              const active =
                selectedEmployee &&
                getUserId(selectedEmployee) === getUserId(user);

              const taskStats = getEmployeeTaskStats(user, combinedTasks);
              const status = getEmployeeStatus(user, attendance);
              const present = status === "Present";

              return (
                <button
                  key={getUserId(user) || user.email}
                  type="button"
                  onClick={() => handleEmployeeClick(user)}
                  className={
                    selectedEmployee
                      ? `grid w-full grid-cols-[1fr_130px] items-center border-b border-slate-100 text-left transition last:border-b-0 hover:bg-orange-50 ${
                          active ? "bg-orange-50" : "bg-white"
                        }`
                      : "grid w-full grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-slate-100 text-left transition last:border-b-0 hover:bg-orange-50"
                  }
                >
                  <div className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B35] text-xs font-black text-white">
                        {getInitials(getEmployeeName(user))}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#151515]">
                          {getEmployeeName(user)}
                        </p>

                        <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                          {getEmployeeRole(user)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-8 py-5 text-sm font-medium text-slate-500">
                    {getEmployeeDepartment(user)}
                  </div>

                  {!selectedEmployee ? (
                    <>
                      <div className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#FF6B35]"
                              style={{ width: `${taskStats.progress}%` }}
                            />
                          </div>

                          <span className="text-sm font-medium text-slate-500">
                            {taskStats.progress}%
                          </span>
                        </div>
                      </div>

                      <div className="px-8 py-5 text-sm font-semibold text-[#151515]">
                        {taskStats.completed}/{taskStats.total}
                      </div>

                      <div className="px-8 py-5 text-sm font-semibold text-[#151515]">
                        {getAttendancePercentage(user, attendance)}
                      </div>

                      <div className="px-8 py-5">
                        <span
                          className={`inline-flex min-w-[74px] items-center justify-center rounded-full px-3 py-2 text-xs font-black ${
                            present
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-red-100 text-red-500"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </>
                  ) : null}
                </button>
              );
            })}

            {!displayUsers.length ? (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">
                {emptyMessage}
              </div>
            ) : null}
          </div>
        </div>

        {selectedEmployee ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-base font-black text-white">
                    {getInitials(getEmployeeName(selectedEmployee))}
                  </div>

                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
                </div>

                <div>
                  <h3 className="text-xl font-black text-[#151515]">
                    {getEmployeeName(selectedEmployee)}
                  </h3>

                  <p className="text-sm font-semibold text-slate-500">
                    {getEmployeeRole(selectedEmployee)} |{" "}
                    {getEmployeeDepartment(selectedEmployee)}
                  </p>

                  <p className="text-sm text-slate-500">
                    {selectedEmployee.email || "-"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeEmployeePanel}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100"
                title="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <EmployeeMetricBox
                icon={TrendingIcon}
                value={`${selectedTaskStats.progress}%`}
                label="Progress"
              />

              <EmployeeMetricBox
                icon={CheckCircle2}
                value={`${selectedTaskStats.completed}/${selectedTaskStats.total}`}
                label="Tasks Done"
              />

              <EmployeeMetricBox
                icon={CalendarCheck}
                value={selectedAttendance}
                label="Attendance"
              />

              <EmployeeMetricBox
                icon={Clock}
                value={weeklyHours}
                label="Weekly Hours"
              />
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-3">
              <button
                type="button"
                onClick={openAssignTask}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:opacity-95"
              >
                <Plus size={18} />
                Assign Task
              </button>

              <button
                type="button"
                onClick={openRemark}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-100 transition hover:opacity-95"
              >
                <UserRound size={18} />
                Add Remark
              </button>

              <button
                type="button"
                onClick={openMessage}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:opacity-95"
              >
                <MessageSquare size={18} />
                Message {showingAdmins ? "Admin" : "Employee"}
              </button>
            </div>

            {(latestRemark || latestMessage) && (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {latestRemark ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                      Latest Remark
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#151515]">
                      {latestRemark.remark}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(latestRemark.createdAt)}
                    </p>
                  </div>
                ) : null}

                {latestMessage ? (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-700">
                      Latest Message
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#151515]">
                      {latestMessage.message}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(latestMessage.createdAt)}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-[#FF6B35]" />
                  <h3 className="text-lg font-black text-[#151515]">
                    Projects
                  </h3>
                </div>

                <p className="text-sm font-semibold text-slate-500">
                  {selectedProjects.length} assigned
                </p>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2">
                {selectedProjects.length ? (
                  selectedProjects.map((project) => {
                    const projectTasks = getProjectTasks(
                      project,
                      combinedTasks,
                      selectedEmployee
                    );

                    const completed = projectTasks.filter((task) =>
                      isCompletedStatus(task.status)
                    ).length;

                    const total = projectTasks.length;
                    const progress = total
                      ? Math.round((completed / total) * 100)
                      : Number(project.progress || 0);

                    const active =
                      activeProject &&
                      getProjectId(activeProject) === getProjectId(project);

                    return (
                      <button
                        key={getProjectId(project) || getProjectName(project)}
                        type="button"
                        onClick={() => handleProjectClick(project)}
                        className={`min-w-[280px] rounded-xl border p-4 text-left transition hover:border-[#FF6B35] hover:bg-orange-50 ${
                          active
                            ? "border-[#FF6B35] bg-orange-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-black text-[#151515]">
                            {getProjectName(project)}
                          </h4>

                          <StatusBadgeSmall value={project.status || "Ongoing"} />
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                          {project.description ||
                            project.shortDescription ||
                            "Project description"}
                        </p>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                            <span>Completion</span>
                            <span>{progress}%</span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                            <div
                              className="h-full rounded-full bg-[#FF6B35]"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(100, progress)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span>{project.priority || "Medium"}</span>
                          <span>Due {formatDate(getProjectDeadline(project))}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="w-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                    No projects assigned to this user.
                  </div>
                )}
              </div>
            </div>

            {activeProject ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-5 w-1 shrink-0 rounded-full bg-[#FF6B35]" />

                    <h3 className="truncate text-base font-black text-[#151515]">
                      Tasks
                    </h3>

                    <span className="truncate text-sm font-semibold text-slate-400">
                      — {getProjectName(activeProject)}
                    </span>
                  </div>

                  <p className="shrink-0 text-sm font-semibold text-slate-500">
                    {
                      activeProjectTasks.filter((task) =>
                        isCompletedStatus(task.status)
                      ).length
                    }
                    /{activeProjectTasks.length} completed
                  </p>
                </div>

                {activeProjectTasks.length ? (
                  <div className="flex items-start gap-3 overflow-x-auto pb-1">
                    {activeProjectTasks.map((task, index) => {
                      const subtasks = getTaskSubtasks(task);
                      const completedSubtasks = subtasks.filter((subtask) =>
                        isSubtaskCompleted(subtask)
                      ).length;

                      const taskId = String(
                        task?.id ||
                          task?.taskId ||
                          task?.task_id ||
                          `${getTaskTitle(task)}-${index}`
                      );

                      const expanded = expandedTaskId === taskId;

                      return (
                        <div
                          key={taskId}
                          className={`min-w-[300px] overflow-hidden rounded-xl border bg-white text-left transition ${
                            expanded
                              ? "border-[#FF6B35] shadow-sm"
                              : "border-slate-200 hover:border-[#FF6B35]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleTaskClick(task, index)}
                            className="w-full px-4 py-3 text-left transition hover:bg-orange-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="line-clamp-1 text-sm font-black text-[#151515]">
                                {getTaskTitle(task)}
                              </h4>

                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-xs font-black text-slate-500">
                                  {subtasks.length
                                    ? `${completedSubtasks}/${subtasks.length}`
                                    : "0/0"}
                                </span>

                                <ChevronDown
                                  size={16}
                                  className={`text-slate-500 transition ${
                                    expanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                {getTaskPriority(task)}
                              </span>

                              <span>Due: {formatDate(getTaskDeadline(task))}</span>
                            </div>
                          </button>

                          {expanded ? (
                            <div className="border-t border-orange-100 bg-orange-50/60 px-4 py-3">
                              {subtasks.length ? (
                                <div className="space-y-3">
                                  {subtasks.map((subtask, subtaskIndex) => {
                                    const completed =
                                      isSubtaskCompleted(subtask);

                                    return (
                                      <div
                                        key={subtask.id || subtaskIndex}
                                        className="flex items-center gap-3 text-sm"
                                      >
                                        <span
                                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                            completed
                                              ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                                              : "border-slate-200 bg-white"
                                          }`}
                                        >
                                          {completed ? (
                                            <CheckCircle2 size={14} />
                                          ) : null}
                                        </span>

                                        <span
                                          className={`font-semibold ${
                                            completed
                                              ? "text-slate-400 line-through"
                                              : "text-slate-700"
                                          }`}
                                        >
                                          {getSubtaskTitle(
                                            subtask,
                                            subtaskIndex
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm font-semibold text-slate-500">
                                  No subtasks found.
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                    No assigned tasks found for this project.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeModal === "task" ? (
        <ActionModal title="Assign Task" onClose={() => setActiveModal("")}>
          <form onSubmit={saveTask} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Project
              </span>
              <select
                value={taskForm.projectId}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    projectId: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#FF6B35]"
              >
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Task Title
              </span>
              <input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Enter task title"
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B35]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Description
              </span>
              <textarea
                value={taskForm.description}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Enter task details"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B35]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Priority
                </span>
                <select
                  value={taskForm.priority}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#FF6B35]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Deadline
                </span>
                <input
                  type="date"
                  value={taskForm.deadline}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      deadline: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B35]"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal("")}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 hover:border-slate-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-[#FF6B35] px-5 py-2.5 text-sm font-black text-white hover:opacity-90"
              >
                Assign Task
              </button>
            </div>
          </form>
        </ActionModal>
      ) : null}

      {activeModal === "remark" ? (
        <ActionModal title="Add Remark" onClose={() => setActiveModal("")}>
          <form onSubmit={saveRemark} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Remark
              </span>
              <textarea
                value={remarkText}
                onChange={(event) => setRemarkText(event.target.value)}
                placeholder="Enter remark for this user"
                rows={5}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B35]"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal("")}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 hover:border-slate-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-black text-white hover:opacity-90"
              >
                Save Remark
              </button>
            </div>
          </form>
        </ActionModal>
      ) : null}

      {activeModal === "message" ? (
        <ActionModal title="Message User" onClose={() => setActiveModal("")}>
          <form onSubmit={saveMessage} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Message
              </span>
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Type message"
                rows={5}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B35]"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal("")}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-600 hover:border-slate-300"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-black text-white hover:opacity-90"
              >
                Send Message
              </button>
            </div>
          </form>
        </ActionModal>
      ) : null}
    </section>
  );
}



function SuperAdminNotificationsSection({
  departmentName,
  users,
  divisions,
  notifications,
  setNotifications,
}) {
  const HISTORY_STORAGE_KEY = "valencia_superadmin_notification_history";
  const STRIKE_STORAGE_KEY = "valencia_superadmin_user_strikes";

  const defaultHistory = [
    {
      id: "history-q3-review",
      title: "Q3 Performance Review Reminder",
      message:
        "This is a reminder for all team members to complete their Q3 performance review inputs before the internal review deadline. Managers should verify task completion, attendance notes, and pending review items before submission.",
      target: "General",
      audience: "general",
      audienceLabel: "🌐 General",
      tone: "general",
      age: "2 hours ago",
      recipients: 349,
      sentBy: "Super Admin",
      sentAt: "2 hours ago",
    },
    {
      id: "history-maintenance",
      title: "System Maintenance — June 15",
      message:
        "The EMS platform will undergo scheduled maintenance on June 15. Some dashboard modules may be temporarily unavailable during the maintenance window. Please save important work before the scheduled time.",
      target: "General",
      audience: "general",
      audienceLabel: "🌐 General",
      tone: "general",
      age: "1 day ago",
      recipients: 349,
      sentBy: "Super Admin",
      sentAt: "1 day ago",
    },
    {
      id: "history-nutracare",
      title: "New Product Launch Brief — NutraCare",
      message:
        "The NutraCare team has received the new product launch brief. Department leads should review the brief, align on deliverables, and submit timelines for design, formulation, and marketing execution.",
      target: "NutraCare",
      audience: "division",
      audienceLabel: "🏢 NutraCare",
      tone: "division",
      age: "2 days ago",
      recipients: 62,
      sentBy: "Super Admin",
      sentAt: "2 days ago",
    },
    {
      id: "history-artwork",
      title: "Urgent: Artwork Deadline Moved Up",
      message:
        "The artwork submission deadline has been moved up. The Aroma De Valencia team should upload final creative files, packaging references, and approval notes before the revised deadline.",
      target: "Aroma de Valencia",
      audience: "division",
      audienceLabel: "🏢 Aroma de Valencia",
      tone: "division",
      age: "3 days ago",
      recipients: 38,
      sentBy: "Super Admin",
      sentAt: "3 days ago",
    },
    {
      id: "history-budget",
      title: "Budget Submission Deadline",
      message:
        "All Bounce division budget submissions must be finalized and shared with finance for review. Pending budgets should include vendor details, expected spend, and approval requirements.",
      target: "Bounce",
      audience: "division",
      audienceLabel: "🏢 Bounce",
      tone: "division",
      age: "4 days ago",
      recipients: 41,
      sentBy: "Super Admin",
      sentAt: "4 days ago",
    },
    {
      id: "history-all-hands",
      title: "All-Hands Meeting — Friday 3 PM",
      message:
        "All staff are requested to attend the Friday all-hands meeting at 3 PM. The session will cover operational updates, product priorities, and department-wise execution goals.",
      target: "General",
      audience: "general",
      audienceLabel: "🌐 General",
      tone: "general",
      age: "1 week ago",
      recipients: 349,
      sentBy: "Super Admin",
      sentAt: "1 week ago",
    },
  ];

  const fallbackUsers = [
    {
      id: "fallback-user-1",
      name: "Katrina",
      email: "katrina@valencia.com",
      department: departmentName || "Aroma De Valencia",
      role: "employee",
    },
    {
      id: "fallback-user-2",
      name: "Direct Test Employee",
      email: "directtest@valencia.com",
      department: "Sales Team",
      role: "employee",
    },
    {
      id: "fallback-user-3",
      name: "Test Employee",
      email: "testemployee2@valencia.com",
      department: "Sales Team",
      role: "employee",
    },
  ];

  const [activeTab, setActiveTab] = useState("history");
  const [audience, setAudience] = useState("general");
  const [selectedDivision, setSelectedDivision] = useState(
    departmentName || "All Divisions"
  );
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState(() => {
    const saved = readLocalJson(HISTORY_STORAGE_KEY, null);
    return Array.isArray(saved) ? saved : defaultHistory;
  });
  const [expandedHistoryId, setExpandedHistoryId] = useState("history-q3-review");
  const [strikes, setStrikes] = useState(() =>
    readLocalJson(STRIKE_STORAGE_KEY, [])
  );
  const [strikeSearch, setStrikeSearch] = useState("");

  const availableUsers = useMemo(() => {
    const source = users?.length ? users : fallbackUsers;

    return source.filter((user) => {
      const role = normalize(user?.role);
      return !role.includes("super");
    });
  }, [users, departmentName]);

  const divisionList = useMemo(() => {
    const fallback = [
      departmentName,
      "Aroma De Valencia",
      "Bounce Super Water",
      "Can Beverages",
      "High Altitude Water",
      "Crunzzo",
      "Sales Team",
      "Software Team",
      "Vending Machine",
    ].filter(Boolean);

    return [...new Set([...(divisions || []), ...fallback])].filter(Boolean);
  }, [departmentName, divisions]);

  const strikeRows = useMemo(() => {
    const savedMap = new Map(
      strikes.map((item) => [String(item.userId || item.email), item])
    );

    return availableUsers.map((user, index) => {
      const userId = getUserId(user) || user.email || `user-${index}`;
      const saved = savedMap.get(String(userId)) || {};

      return {
        userId,
        name: getEmployeeName(user),
        email: user.email || "-",
        department: getEmployeeDepartment(user),
        strikes: Number(saved.strikes ?? (index % 4 === 0 ? 2 : index % 3)),
        lastReason:
          saved.lastReason ||
          (index % 4 === 0
            ? "Missed task deadline"
            : index % 3 === 0
            ? "Late attendance update"
            : "No active strike"),
        updatedAt: saved.updatedAt || "Recently",
      };
    });
  }, [availableUsers, strikes]);

  const filteredStrikeRows = useMemo(() => {
    const query = normalize(strikeSearch);

    if (!query) return strikeRows;

    return strikeRows.filter((item) =>
      normalize(
        `${item.name} ${item.email} ${item.department} ${item.lastReason}`
      ).includes(query)
    );
  }, [strikeRows, strikeSearch]);


  const strikeCards = useMemo(() => {
    const defaultReasons = [
      ["Unauthorized absence ×2", "Late submission of report"],
      ["Lateness without notice"],
      ["Missed deadline ×2"],
    ];

    const defaultDepartments = ["Operations", "HR", "Finance"];
    const defaultInitials = ["EN", "FA", "DO"];
    const defaultStrikeCounts = [3, 1, 2];
    const avatarClasses = [
      "bg-emerald-500 text-white shadow-lg shadow-emerald-100",
      "bg-[#FF6B35] text-white shadow-lg shadow-orange-100",
      "bg-indigo-500 text-white shadow-lg shadow-indigo-100",
    ];

    const source = filteredStrikeRows.length
      ? filteredStrikeRows
      : [
          {
            userId: "strike-demo-1",
            name: "Emp Name",
            department: "Operations",
            strikes: 3,
            lastReason: "Unauthorized absence ×2",
            updatedAt: "Now",
          },
          {
            userId: "strike-demo-2",
            name: "Emp Name",
            department: "HR",
            strikes: 1,
            lastReason: "Lateness without notice",
            updatedAt: "Now",
          },
          {
            userId: "strike-demo-3",
            name: "Emp Name",
            department: "Finance",
            strikes: 2,
            lastReason: "Missed deadline ×2",
            updatedAt: "Now",
          },
        ];

    return source.slice(0, 3).map((user, index) => ({
      ...user,
      name: user.name || "Emp Name",
      department: user.department || defaultDepartments[index] || "Operations",
      displayInitials: defaultInitials[index] || getInitials(user.name),
      avatarClass: avatarClasses[index] || avatarClasses[0],
      strikes: Math.max(
        0,
        Math.min(3, Number(user.strikes || defaultStrikeCounts[index] || 0))
      ),
      reasons:
        Array.isArray(user.reasons) && user.reasons.length
          ? user.reasons
          : defaultReasons[index] || [user.lastReason || "Conduct strike recorded"],
      statusLabel:
        Number(user.strikes || defaultStrikeCounts[index] || 0) >= 3
          ? "Escalated to you"
          : "Under review",
    }));
  }, [filteredStrikeRows]);

  const activeStrikeCount = strikeCards.filter(
    (user) => Number(user.strikes || 0) > 0
  ).length;

  const tabs = [
    {
      key: "create",
      label: "Create Notification",
      icon: Plus,
    },
    {
      key: "history",
      label: "Announcement History",
      icon: Megaphone,
    },
    {
      key: "strikes",
      label: "User Strikes Data",
      icon: AlertTriangle,
    },
  ];

  const saveNotificationHistory = (items) => {
    setHistory(items);
    writeLocalJson(HISTORY_STORAGE_KEY, items);
  };

  const saveStrikes = (items) => {
    setStrikes(items);
    writeLocalJson(STRIKE_STORAGE_KEY, items);
  };

  const getRecipientsCount = () => {
    if (audience === "general") return availableUsers.length || 349;

    const count = availableUsers.filter(
      (user) => normalize(getEmployeeDepartment(user)) === normalize(selectedDivision)
    ).length;

    return count || "Division users";
  };

  const sendNotification = () => {
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle) {
      toast.error("Notification title is required.");
      return;
    }

    if (!cleanMessage) {
      toast.error("Message body is required.");
      return;
    }

    const now = new Date();
    const recipients = getRecipientsCount();
    const target = audience === "general" ? "General" : selectedDivision;

    const notification = {
      id: `notification-${Date.now()}`,
      title: cleanTitle,
      message: cleanMessage,
      type: audience === "general" ? "General" : "Division",
      time: "Now",
      unread: true,
      audience,
      division: target,
      createdAt: now.toISOString(),
      sentBy: "Super Admin",
    };

    const historyItem = {
      ...notification,
      target,
      audienceLabel:
        audience === "general" ? "🌐 General" : `🏢 ${selectedDivision}`,
      tone: audience === "general" ? "general" : "division",
      age: "Now",
      recipients,
      sentAt: now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedNotifications = [notification, ...notifications];
    const updatedHistory = [historyItem, ...history];

    setNotifications(updatedNotifications);
    localStorage.setItem(
      "valencia_notifications",
      JSON.stringify(updatedNotifications)
    );
    saveNotificationHistory(updatedHistory);

    setTitle("");
    setMessage("");
    setActiveTab("history");
    setExpandedHistoryId(historyItem.id);
    toast.success("Notification sent successfully.");
  };

  const addStrike = (user) => {
    const reason = window.prompt("Enter strike reason:", user.lastReason || "");

    if (!reason) return;

    const updated = strikeRows.map((item) =>
      item.userId === user.userId
        ? {
            ...item,
            strikes: Number(item.strikes || 0) + 1,
            lastReason: reason,
            updatedAt: "Now",
          }
        : item
    );

    saveStrikes(updated);
    toast.success("Strike added.");
  };

  const clearStrike = (user) => {
    const updated = strikeRows.map((item) =>
      item.userId === user.userId
        ? {
            ...item,
            strikes: 0,
            lastReason: "No active strike",
            updatedAt: "Now",
          }
        : item
    );

    saveStrikes(updated);
    toast.success("User strikes cleared.");
  };

  const getHistoryToneClasses = (item) => {
    if (item.tone === "general" || item.audience === "general") {
      return {
        icon: "bg-orange-50 text-[#FF6B35]",
        badge: "bg-orange-50 text-[#FF6B35] border-orange-100",
      };
    }

    return {
      icon: "bg-indigo-50 text-indigo-500",
      badge: "bg-indigo-50 text-indigo-500 border-indigo-100",
    };
  };

  return (
    <section>
      <div className="mb-7">
        <h2 className="text-2xl font-black text-[#151515]">Notifications</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Send announcements, view history, and track user strikes
        </p>
      </div>

      <div className="mb-5 grid border-b border-slate-200 md:grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex h-14 items-center justify-center gap-3 border-b-2 text-sm font-black transition ${
                active
                  ? "border-[#FF6B35] text-[#FF6B35]"
                  : "border-transparent text-slate-500 hover:text-[#FF6B35]"
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "create" ? (
        <section className="max-w-5xl pt-3">
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setAudience("general")}
              className={`flex h-14 items-center justify-center gap-3 rounded-xl border text-sm font-black transition ${
                audience === "general"
                  ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-lg shadow-orange-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-[#FF6B35] hover:text-[#FF6B35]"
              }`}
            >
              <Users size={18} />
              General - All Staff
            </button>

            <button
              type="button"
              onClick={() => setAudience("division")}
              className={`flex h-14 items-center justify-center gap-3 rounded-xl border text-sm font-black transition ${
                audience === "division"
                  ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-lg shadow-orange-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-[#FF6B35] hover:text-[#FF6B35]"
              }`}
            >
              <Building2 size={18} />
              Division-specific
            </button>
          </div>

          {audience === "division" ? (
            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Select Division
              </span>

              <select
                value={selectedDivision}
                onChange={(event) => setSelectedDivision(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#151515] outline-none transition focus:border-[#FF6B35]"
              >
                {divisionList.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="mb-5 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Notification Title
            </span>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Q3 Review Reminder"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#151515] outline-none transition placeholder:text-slate-400 focus:border-[#FF6B35]"
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              Message Body
            </span>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write your announcement here..."
              rows={6}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold leading-6 text-[#151515] outline-none transition placeholder:text-slate-400 focus:border-[#FF6B35]"
            />
          </label>

          <button
            type="button"
            onClick={sendNotification}
            disabled={!title.trim() || !message.trim()}
            className="inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-[#FF6B35] px-7 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Send size={17} />
            Send Notification
          </button>
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="pt-3">
          <p className="mb-3 text-xs font-semibold text-slate-500">
            Click any announcement to read the full message.
          </p>

          <div className="space-y-3">
            {history.length ? (
              history.map((item) => {
                const expanded = expandedHistoryId === item.id;
                const toneClasses = getHistoryToneClasses(item);

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHistoryId(expanded ? "" : item.id)
                      }
                      className="flex min-h-[64px] w-full items-center justify-between gap-5 px-5 py-4 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClasses.icon}`}
                        >
                          {item.tone === "general" || item.audience === "general" ? (
                            <Users size={18} />
                          ) : (
                            <Building2 size={18} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-black text-[#151515]">
                              {item.title}
                            </h3>

                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-black ${toneClasses.badge}`}
                            >
                              {item.audienceLabel ||
                                (item.audience === "general"
                                  ? "🌐 General"
                                  : `🏢 ${item.target || item.division || "Division"}`)}
                            </span>
                          </div>

                          <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Clock size={13} />
                            {item.age || item.sentAt || item.time || "Recently"}
                            <span>·</span>
                            {item.recipients || item.delivered || "0"} recipients
                          </p>
                        </div>
                      </div>

                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-slate-500 transition ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {expanded ? (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
                        <p className="text-sm font-semibold leading-6 text-[#151515]">
                          {item.message}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                            Sent by {item.sentBy || "Super Admin"}
                          </span>

                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                            Target: {item.target || item.division || "General"}
                          </span>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600 ring-1 ring-emerald-100">
                            Delivered to {item.recipients || item.delivered || "0"} recipients
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
                <p className="text-sm font-black text-slate-700">
                  No announcements found.
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Sent notifications will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "strikes" ? (
        <section className="pt-3">
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-slate-600">
            <AlertTriangle size={19} className="shrink-0 text-rose-400" />
            <p>
              <span className="font-black text-rose-500">
                {activeStrikeCount} employees
              </span>{" "}
              have active conduct strikes. Review and take action as needed.
            </p>
          </div>

          <div className="space-y-4">
            {strikeCards.length ? (
              strikeCards.map((user, index) => {
                const strikeCount = Math.max(
                  0,
                  Math.min(3, Number(user.strikes || 0))
                );
                const escalated = strikeCount >= 3;

                return (
                  <article
                    key={user.userId || user.email || index}
                    className={`flex min-h-[126px] items-start justify-between gap-5 rounded-2xl border bg-white px-5 py-5 shadow-sm ${
                      escalated
                        ? "border-rose-200 bg-rose-50/10"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-base font-black ${user.avatarClass}`}
                      >
                        {user.displayInitials}
                      </div>

                      <div className="min-w-0 pt-0.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-sm font-black text-[#151515]">
                            {user.name || "Emp Name"}
                          </h3>

                          <span className="text-xs font-semibold text-slate-500">
                            {user.department}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {[0, 1, 2].map((item) => {
                            const active = item < strikeCount;

                            return (
                              <span
                                key={item}
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  active
                                    ? "bg-red-500 text-white shadow-sm shadow-red-100"
                                    : "bg-slate-100 text-slate-300"
                                }`}
                              >
                                {active ? <X size={16} strokeWidth={3} /> : null}
                              </span>
                            );
                          })}

                          <span
                            className={`ml-1 text-sm font-black ${
                              escalated
                                ? "text-red-500"
                                : strikeCount >= 2
                                ? "text-amber-500"
                                : "text-slate-600"
                            }`}
                          >
                            {strikeCount}/3 strikes
                          </span>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          {user.reasons.map((reason, reasonIndex) => (
                            <p
                              key={`${reason}-${reasonIndex}`}
                              className="flex items-center gap-2 text-sm font-medium text-slate-500"
                            >
                              <span className="text-base leading-none text-rose-400">
                                ×
                              </span>
                              {reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1">
                      {escalated ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-500">
                          <AlertTriangle size={14} />
                          Escalated to you
                        </span>
                      ) : (
                        <span className="text-xs font-semibold italic text-slate-500">
                          Under review
                        </span>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
                <p className="text-sm font-black text-slate-700">
                  No active user strikes found.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function NotificationStatCard({ value, label, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#FF6B35]">
          <Icon size={19} />
        </div>

        <div>
          <p className="text-2xl font-black leading-none text-[#151515]">
            {value}
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.10em] text-slate-500">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}


function SuperAdminApprovalsSection({ projects, leaves, departmentName }) {
  const [activeTab, setActiveTab] = useState("project");
  const [localStatus, setLocalStatus] = useState({});
  const [expandedId, setExpandedId] = useState("fallback-project-1");

  const getApprovalStatus = (value) => {
    const status = normalize(value);

    if (
      status.includes("approved") ||
      status.includes("complete") ||
      status.includes("completed") ||
      status.includes("accepted")
    ) {
      return "approved";
    }

    if (
      status.includes("rejected") ||
      status.includes("declined") ||
      status.includes("cancelled") ||
      status.includes("canceled")
    ) {
      return "rejected";
    }

    return "pending";
  };

  const fallbackProjectApprovals = [
    {
      id: "fallback-project-1",
      type: "project",
      initials: "SM",
      title: "Q3 Brand Campaign – Final Artwork",
      department: "Marketing",
      submittedBy: "Sarah Mitchell",
      sentTime: "2 hours ago",
      attachments: 3,
      status: "pending",
      description:
        "Final artwork pack for the Q3 brand campaign across all channels. Includes print-ready files, digital banners, and social media assets. Requires super admin sign-off before sending to print vendor.",
      files: [
        {
          name: "Brand_Guidelines_v3.pdf",
          size: "3.1 MB",
          type: "pdf",
        },
        {
          name: "Digital_Banners_Pack.ai",
          size: "8.7 MB",
          type: "design",
        },
        {
          name: "Q3_Campaign_Final_Artwork.zip",
          size: "14.2 MB",
          type: "zip",
        },
      ],
      note:
        "All assets reviewed by design team. Approved by Marketing Manager on 10 Jun 2026.",
    },
    {
      id: "fallback-project-2",
      type: "project",
      initials: "RS",
      title: "ERP Upgrade – Technical Spec Document",
      department: "Engineering",
      submittedBy: "Raghav Sinha",
      sentTime: "5 hours ago",
      attachments: 2,
      status: "pending",
      description:
        "Technical specification document for ERP upgrade, backend API changes, access roles, and database migration requirements.",
      files: [
        {
          name: "ERP_Technical_Spec.pdf",
          size: "2.4 MB",
          type: "pdf",
        },
        {
          name: "Database_Migration.xlsx",
          size: "1.1 MB",
          type: "sheet",
        },
      ],
      note: "Technical review pending from Super Admin.",
    },
    {
      id: "fallback-project-3",
      type: "project",
      initials: "AY",
      title: "NutraCare Packaging Design",
      department: "Design",
      submittedBy: "Aisha Yusuf",
      sentTime: "13 hours ago",
      attachments: 6,
      status: "pending",
      description:
        "Packaging design submitted for NutraCare product line. Includes front label, back label, carton design, and print layout references.",
      files: [
        {
          name: "NutraCare_Label_Front.pdf",
          size: "1.8 MB",
          type: "pdf",
        },
        {
          name: "NutraCare_Carton_Design.ai",
          size: "6.3 MB",
          type: "design",
        },
        {
          name: "Packaging_Mockups.zip",
          size: "18.6 MB",
          type: "zip",
        },
      ],
      note: "Packaging team has completed internal corrections.",
    },
    {
      id: "fallback-project-4",
      type: "project",
      initials: "-",
      title: "Project Name",
      department: "Department",
      submittedBy: "Employee Name",
      sentTime: "Sent time",
      attachments: "no. of",
      status: "rejected",
      description:
        "Project submission details will appear here after the employee submits the project for approval.",
      files: [],
      note: "Review note will appear here.",
    },
    {
      id: "fallback-project-5",
      type: "project",
      initials: "-",
      title: "Project Name",
      department: "Department",
      submittedBy: "Employee Name",
      sentTime: "Sent time",
      attachments: "no. of",
      status: "approved",
      description:
        "Project submission details will appear here after the employee submits the project for approval.",
      files: [],
      note: "Review note will appear here.",
    },
    {
      id: "fallback-project-6",
      type: "project",
      initials: "-",
      title: "Project Name",
      department: "Department",
      submittedBy: "Employee Name",
      sentTime: "Sent time",
      attachments: "no. of",
      status: "approved",
      description:
        "Project submission details will appear here after the employee submits the project for approval.",
      files: [],
      note: "Review note will appear here.",
    },
    {
      id: "fallback-project-7",
      type: "project",
      initials: "-",
      title: "Project Name",
      department: "Department",
      submittedBy: "Employee Name",
      sentTime: "Sent time",
      attachments: "no. of",
      status: "rejected",
      description:
        "Project submission details will appear here after the employee submits the project for approval.",
      files: [],
      note: "Review note will appear here.",
    },
    {
      id: "fallback-project-8",
      type: "project",
      initials: "-",
      title: "Project Name",
      department: "Department",
      submittedBy: "Employee Name",
      sentTime: "Sent time",
      attachments: "no. of",
      status: "rejected",
      description:
        "Project submission details will appear here after the employee submits the project for approval.",
      files: [],
      note: "Review note will appear here.",
    },
    {
      id: "fallback-project-9",
      type: "project",
      initials: "-",
      title: "Project Name",
      department: "Department",
      submittedBy: "Employee Name",
      sentTime: "Sent time",
      attachments: "no. of",
      status: "approved",
      description:
        "Project submission details will appear here after the employee submits the project for approval.",
      files: [],
      note: "Review note will appear here.",
    },
  ];

  const fallbackLeaveApprovals = [
    {
      id: "fallback-leave-1",
      type: "leave",
      initials: "KT",
      title: "Leave Request",
      department: departmentName || "Department",
      submittedBy: "Katrina",
      sentTime: "1 hour ago",
      attachments: 1,
      status: "pending",
      description:
        "Employee has submitted a leave request for review and approval.",
      files: [
        {
          name: "Leave_Request.pdf",
          size: "560 KB",
          type: "pdf",
        },
      ],
      note: "Leave request pending for Super Admin approval.",
    },
    {
      id: "fallback-leave-2",
      type: "leave",
      initials: "DT",
      title: "Medical Leave Request",
      department: "Sales Team",
      submittedBy: "Direct Test Employee",
      sentTime: "4 hours ago",
      attachments: 1,
      status: "pending",
      description: "Medical leave request submitted with supporting document.",
      files: [
        {
          name: "Medical_Document.pdf",
          size: "790 KB",
          type: "pdf",
        },
      ],
      note: "Medical proof attached by employee.",
    },
  ];

  const projectApprovals = useMemo(() => {
    if (!projects.length) return fallbackProjectApprovals;

    return projects.map((project, index) => {
      const projectId = `project-${getProjectId(project) || index}`;

      const managerName =
        project.managerName ||
        project.manager_name ||
        project.createdByName ||
        project.created_by_name ||
        project.createdBy ||
        project.created_by ||
        "Employee Name";

      const files = Array.isArray(project.attachments)
        ? project.attachments.map((file, fileIndex) => ({
            name:
              file.name ||
              file.filename ||
              file.fileName ||
              `Attachment ${fileIndex + 1}`,
            size: file.size || file.fileSize || "-",
            type: file.type || "file",
          }))
        : [];

      const rawStatus =
        localStatus[projectId] ||
        getApprovalStatus(project.approvalStatus || project.status);

      return {
        id: projectId,
        type: "project",
        initials: getInitials(managerName),
        title: getProjectName(project),
        department:
          project.department ||
          project.departmentName ||
          project.division ||
          departmentName ||
          "Department",
        submittedBy: managerName,
        sentTime: project.createdAt
          ? formatDate(project.createdAt)
          : project.created_at
          ? formatDate(project.created_at)
          : "Sent time",
        attachments:
          files.length ||
          project.attachmentCount ||
          project.attachment_count ||
          "no. of",
        status: rawStatus,
        description:
          project.description ||
          project.shortDescription ||
          project.details ||
          "Project submission details will appear here after the employee submits the project for approval.",
        files,
        note:
          project.reviewNote ||
          project.review_note ||
          "All assets reviewed by department team. Awaiting Super Admin decision.",
      };
    });
  }, [projects, departmentName, localStatus]);

  const leaveApprovals = useMemo(() => {
    if (!leaves.length) return fallbackLeaveApprovals;

    return leaves.map((leave, index) => {
      const leaveId = `leave-${leave.id || index}`;

      const employeeName =
        leave.userName ||
        leave.user_name ||
        leave.employeeName ||
        leave.employee_name ||
        leave.name ||
        "Employee Name";

      const files = Array.isArray(leave.attachments)
        ? leave.attachments.map((file, fileIndex) => ({
            name:
              file.name ||
              file.filename ||
              file.fileName ||
              `Attachment ${fileIndex + 1}`,
            size: file.size || file.fileSize || "-",
            type: file.type || "file",
          }))
        : [];

      const rawStatus = localStatus[leaveId] || getApprovalStatus(leave.status);

      return {
        id: leaveId,
        type: "leave",
        initials: getInitials(employeeName),
        title: leave.leaveType || leave.leave_type || "Leave Request",
        department:
          leave.department ||
          leave.departmentName ||
          leave.division ||
          departmentName ||
          "Department",
        submittedBy: employeeName,
        sentTime: leave.createdAt
          ? formatDate(leave.createdAt)
          : leave.created_at
          ? formatDate(leave.created_at)
          : "Sent time",
        attachments:
          files.length ||
          leave.attachmentCount ||
          leave.attachment_count ||
          "no. of",
        status: rawStatus,
        description:
          leave.reason ||
          leave.description ||
          "Employee has submitted a leave request for review and approval.",
        files,
        note:
          leave.reviewNote ||
          leave.review_note ||
          "Leave request is awaiting Super Admin approval.",
      };
    });
  }, [leaves, departmentName, localStatus]);

  const tabs = [
    {
      key: "project",
      label: "Project Approvals",
      icon: BriefcaseBusiness,
      count: projectApprovals.length,
    },
    {
      key: "leave",
      label: "Leave Approvals",
      icon: CalendarX2,
      count: leaveApprovals.length,
    },
  ];

  const visibleApprovals =
    activeTab === "project" ? projectApprovals : leaveApprovals;

  const updateApprovalStatus = (event, item, status) => {
    event.stopPropagation();

    setLocalStatus((current) => ({
      ...current,
      [item.id]: status,
    }));

    if (status === "approved") {
      toast.success("Request approved successfully.");
    } else {
      toast.error("Request rejected.");
    }
  };

  const renderStatus = (item) => {
    const currentStatus = localStatus[item.id] || item.status;

    if (currentStatus === "approved") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-500">
          <CheckCircle2 size={14} />
          Approved
        </span>
      );
    }

    if (currentStatus === "rejected") {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-500">
          <XCircle size={14} />
          Rejected
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(event) => updateApprovalStatus(event, item, "approved")}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-500 transition hover:bg-emerald-100"
        >
          <CheckCircle2 size={14} />
          Approve
        </button>

        <button
          type="button"
          onClick={(event) => updateApprovalStatus(event, item, "rejected")}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-500 transition hover:bg-rose-100"
        >
          <XCircle size={14} />
          Reject
        </button>
      </div>
    );
  };

  const getFileIconClasses = (type) => {
    const normalizedType = normalize(type);

    if (
      normalizedType.includes("design") ||
      normalizedType.includes("ai") ||
      normalizedType.includes("sheet")
    ) {
      return "border-blue-100 bg-blue-50 text-blue-500";
    }

    if (normalizedType.includes("zip")) {
      return "border-rose-100 bg-rose-50 text-rose-500";
    }

    return "border-pink-100 bg-pink-50 text-pink-500";
  };

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-2xl font-black text-[#151515]">Approvals</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Review pending requests across all categories
        </p>
      </div>

      <div className="mb-8 grid max-w-[720px] grid-cols-1 gap-3 sm:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedId(tab.key === "project" ? "fallback-project-1" : "fallback-leave-1");
              }}
              className={`flex h-[58px] items-center justify-between rounded-2xl border px-5 transition ${
                active
                  ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-[#FF6B35]/40"
              }`}
            >
              <span className="flex items-center gap-4">
                <Icon size={22} strokeWidth={1.8} />
                <span className="text-sm font-black">{tab.label}</span>
              </span>

              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-black ${
                  active ? "bg-white/20 text-white" : "bg-[#FF6B35] text-white"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-5">
        {visibleApprovals.map((item) => {
          const expanded = expandedId === item.id;

          return (
            <article
              key={item.id}
              onClick={() => setExpandedId(expanded ? "" : item.id)}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="flex min-h-[90px] cursor-pointer items-center justify-between gap-5 px-5 py-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-black text-[#FF6B35]">
                    {item.initials}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-[#151515]">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {item.department} * Submitted by {item.submittedBy} * {item.sentTime}
                    </p>

                    <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <Paperclip size={14} />
                      {item.attachments} attachments
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {renderStatus(item)}

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setExpandedId(expanded ? "" : item.id);
                    }}
                    className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100"
                    aria-label="Expand approval"
                  >
                    {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                  </button>
                </div>
              </div>

              {expanded ? (
                <div className="border-t border-orange-100 bg-orange-50/40 px-5 pb-5 pt-4">
                  <div className="rounded-xl border border-orange-100 bg-white/70 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Submission Details
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#151515]">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Attachments - click to preview or download
                      </p>
                    </div>

                    {item.files?.length ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        {item.files.map((file, index) => (
                          <button
                            key={`${file.name}-${index}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toast.success("Attachment preview/download can be connected to backend.");
                            }}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-[#FF6B35] hover:bg-orange-50"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${getFileIconClasses(
                                file.type
                              )}`}
                            >
                              <Paperclip size={15} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-black text-[#151515]">
                                {file.name}
                              </span>
                              <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">
                                {file.size}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-500">
                        No attachment files available for this request.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <label
                      className="flex cursor-pointer items-start gap-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        defaultChecked
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#FF6B35]"
                      />
                      <span className="text-xs font-semibold leading-5 text-slate-500">
                        {item.note}
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {!visibleApprovals.length ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
            <p className="text-sm font-black text-slate-700">
              No approval requests found.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SuperAdminAttendanceSection({ users, attendance, leaves = [] }) {
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState("attendance");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  function getValue(...values) {
    return values.find(
      (value) => value !== undefined && value !== null && String(value).trim()
    );
  }

  function getAttendanceUserId(item) {
    return String(
      item.userId ||
        item.user_id ||
        item.employeeId ||
        item.employee_id ||
        item.uid ||
        ""
    );
  }

  function getRecordCheckIn(item) {
    return getValue(item.checkIn, item.check_in, item.clockIn, item.clock_in);
  }

  function getRecordCheckOut(item) {
    return getValue(
      item.checkOut,
      item.check_out,
      item.clockOut,
      item.clock_out
    );
  }

  function getRecordHours(item) {
    const value = Number(
      item.totalHours ||
        item.total_hours ||
        item.workingHours ||
        item.working_hours ||
        item.hours ||
        0
    );

    return Number.isFinite(value) ? value : 0;
  }

  function formatTime(value) {
    if (!value) return "--";

    const raw = String(value);

    if (/^\d{1,2}:\d{2}/.test(raw)) return raw;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function formatDateTime(value) {
    if (!value) return "No activity";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getLeaveUserId(leave) {
    return String(
      leave.userId ||
        leave.user_id ||
        leave.employeeId ||
        leave.employee_id ||
        leave.requestedBy ||
        leave.requested_by ||
        leave.uid ||
        ""
    );
  }

  function getLeaveEmployeeName(leave) {
    const userId = getLeaveUserId(leave);

    const matchedUser = users.find(
      (user) => String(getUserId(user)) === String(userId)
    );

    return (
      leave.userName ||
      leave.user_name ||
      leave.employeeName ||
      leave.employee_name ||
      leave.name ||
      getEmployeeName(matchedUser) ||
      "Employee"
    );
  }

  function getLeaveDepartment(leave) {
    const userId = getLeaveUserId(leave);

    const matchedUser = users.find(
      (user) => String(getUserId(user)) === String(userId)
    );

    return (
      leave.department ||
      leave.departmentName ||
      leave.department_name ||
      leave.division ||
      leave.divisionName ||
      getEmployeeDepartment(matchedUser) ||
      "-"
    );
  }

  function getLeaveType(leave) {
    return (
      leave.leaveType ||
      leave.leave_type ||
      leave.type ||
      leave.title ||
      "Leave"
    );
  }

  function getLeaveDateRange(leave) {
    const from = getValue(
      leave.fromDate,
      leave.from_date,
      leave.startDate,
      leave.start_date,
      leave.date
    );

    const to = getValue(leave.toDate, leave.to_date, leave.endDate, leave.end_date);

    if (!from && !to) return "-";

    if (!to || normalize(from) === normalize(to)) {
      return formatDate(from);
    }

    return `${formatDate(from)} - ${formatDate(to)}`;
  }

  function getLeaveStatus(leave) {
    return leave.status || leave.approvalStatus || leave.approval_status || "Pending";
  }

  const rows = useMemo(() => {
    return users.map((user) => {
      const userId = getUserId(user);

      const userRecords = attendance
        .filter((item) => getAttendanceUserId(item) === String(userId))
        .sort(
          (a, b) =>
            getTimestamp(getActivityDate(b)) - getTimestamp(getActivityDate(a))
        );

      const presentRecords = userRecords.filter((item) => {
        const status = normalize(item.status || item.type);

        return (
          status.includes("present") ||
          status.includes("check in") ||
          status.includes("checked in") ||
          Boolean(getRecordCheckIn(item))
        );
      });

      const totalDays = Math.max(userRecords.length, 22);
      const attended = presentRecords.length;
      const percentage = totalDays
        ? Math.round((attended / totalDays) * 100)
        : 0;

      const latest = userRecords[0] || {};

      const latestStatus =
        latest.status ||
        latest.type ||
        (getRecordCheckIn(latest) ? "Present" : "No Activity");

      const totalHours = userRecords.reduce(
        (sum, item) => sum + getRecordHours(item),
        0
      );

      return {
        id: userId,
        user,
        records: userRecords,
        name: getEmployeeName(user),
        email: user.email || user.userEmail || user.user_email || "-",
        department: getEmployeeDepartment(user),
        days: `${attended}/${totalDays}`,
        attendanceCount: attended,
        totalDays,
        percentage,
        totalHours,
        lastActivity: formatDateTime(getActivityDate(latest)),
        checkIn: formatTime(getRecordCheckIn(latest)),
        checkOut: formatTime(getRecordCheckOut(latest)),
        status: latestStatus,
        hasLogin: Boolean(getRecordCheckIn(latest)),
      };
    });
  }, [users, attendance]);

  const pendingLeaves = useMemo(() => {
    return leaves.filter((leave) => normalize(getLeaveStatus(leave)).includes("pending"));
  }, [leaves]);

  const leaveHistory = useMemo(() => {
    return leaves.filter(
      (leave) => !normalize(getLeaveStatus(leave)).includes("pending")
    );
  }, [leaves]);

  const filteredRows = useMemo(() => {
    const query = normalize(search);

    if (!query) return rows;

    return rows.filter((row) =>
      normalize(`${row.name} ${row.email} ${row.department} ${row.status}`).includes(
        query
      )
    );
  }, [rows, search]);

  const filteredAppRows = useMemo(() => {
    const query = normalize(search);
    const source = rows.filter((row) => row.hasLogin);

    if (!query) return source;

    return source.filter((row) =>
      normalize(`${row.name} ${row.email} ${row.department} ${row.status}`).includes(
        query
      )
    );
  }, [rows, search]);

  const filteredPendingLeaves = useMemo(() => {
    const query = normalize(search);

    if (!query) return pendingLeaves;

    return pendingLeaves.filter((leave) =>
      normalize(
        `${getLeaveEmployeeName(leave)} ${getLeaveDepartment(leave)} ${getLeaveType(
          leave
        )} ${getLeaveStatus(leave)}`
      ).includes(query)
    );
  }, [pendingLeaves, search]);

  const filteredLeaveHistory = useMemo(() => {
    const query = normalize(search);

    if (!query) return leaveHistory;

    return leaveHistory.filter((leave) =>
      normalize(
        `${getLeaveEmployeeName(leave)} ${getLeaveDepartment(leave)} ${getLeaveType(
          leave
        )} ${getLeaveStatus(leave)}`
      ).includes(query)
    );
  }, [leaveHistory, search]);

  const metrics = useMemo(() => {
    return {
      employeeAttendance: rows.length,
      appLoginEmployees: rows.filter((row) => row.hasLogin).length,
      pendingLeave: pendingLeaves.length,
      leaveHistory: leaveHistory.length,
    };
  }, [rows, pendingLeaves, leaveHistory]);

  function changeView(view) {
    setActiveView(view);
    setSearch("");
    setSelectedEmployee(null);
  }

  function exportCurrentReport() {
    let csvRows = [];

    if (activeView === "attendance") {
      csvRows = [
        ["Employee", "Email", "Days Attended", "Total Hours", "Last Activity"],
        ...filteredRows.map((row) => [
          row.name,
          row.email,
          row.days,
          row.totalHours,
          row.lastActivity,
        ]),
      ];
    }

    if (activeView === "appLogin") {
      csvRows = [
        ["Employee", "Email", "Department", "Check In", "Check Out", "Status"],
        ...filteredAppRows.map((row) => [
          row.name,
          row.email,
          row.department,
          row.checkIn,
          row.checkOut,
          row.status,
        ]),
      ];
    }

    if (activeView === "pendingLeave") {
      csvRows = [
        ["Employee", "Department", "Leave Type", "Date", "Reason", "Status"],
        ...filteredPendingLeaves.map((leave) => [
          getLeaveEmployeeName(leave),
          getLeaveDepartment(leave),
          getLeaveType(leave),
          getLeaveDateRange(leave),
          leave.reason || leave.description || "-",
          getLeaveStatus(leave),
        ]),
      ];
    }

    if (activeView === "leaveHistory") {
      csvRows = [
        ["Employee", "Department", "Leave Type", "Date", "Reason", "Status"],
        ...filteredLeaveHistory.map((leave) => [
          getLeaveEmployeeName(leave),
          getLeaveDepartment(leave),
          getLeaveType(leave),
          getLeaveDateRange(leave),
          leave.reason || leave.description || "-",
          getLeaveStatus(leave),
        ]),
      ];
    }

    downloadCsv(`superadmin-${activeView}-report.csv`, csvRows);
    toast.success("Report exported.");
  }

  function StatusBadge({ status }) {
    const value = normalize(status);

    let classes = "border-slate-200 bg-slate-50 text-slate-600";

    if (value.includes("present") || value.includes("approved")) {
      classes = "border-emerald-100 bg-emerald-50 text-emerald-700";
    } else if (value.includes("pending")) {
      classes = "border-yellow-100 bg-yellow-50 text-yellow-700";
    } else if (value.includes("absent") || value.includes("reject")) {
      classes = "border-red-100 bg-red-50 text-red-700";
    } else if (value.includes("late")) {
      classes = "border-orange-100 bg-orange-50 text-[#FF6B35]";
    }

    return (
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${classes}`}
      >
        {status || "No Activity"}
      </span>
    );
  }

  function MetricCard({ id, title, value, Icon, tone }) {
    const active = activeView === id;

    const toneClasses = {
      orange: "bg-orange-50 text-[#FF6B35]",
      blue: "bg-blue-50 text-blue-600",
      yellow: "bg-yellow-50 text-yellow-600",
      green: "bg-emerald-50 text-emerald-600",
    };

    return (
      <button
        type="button"
        onClick={() => changeView(id)}
        className={`h-[166px] rounded-xl border bg-white px-5 py-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(15,23,42,0.08)] ${
          active
            ? "border-[#FF6B35] shadow-[0_14px_30px_rgba(255,107,53,0.13)]"
            : "border-slate-200 shadow-[0_10px_25px_rgba(15,23,42,0.04)]"
        }`}
      >
        <div
          className={`mb-6 flex h-10 w-10 items-center justify-center rounded-lg ${
            toneClasses[tone] || toneClasses.orange
          }`}
        >
          <Icon size={21} />
        </div>

        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
          {title}
        </p>

        <p className="mt-4 text-[30px] font-black leading-none text-[#061638]">
          {value}
        </p>
      </button>
    );
  }

  function EmptyState({ title }) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-black text-slate-600">{title}</p>
      </div>
    );
  }

  function EmployeeDetailPanel() {
    if (!selectedEmployee) return null;

    return (
      <div className="mb-5 rounded-xl border border-orange-100 bg-orange-50/50 p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-[#061638]">
              {selectedEmployee.name}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {selectedEmployee.email} • {selectedEmployee.department}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedEmployee(null)}
            className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#FF6B35] transition hover:bg-orange-100"
          >
            Close
          </button>
        </div>

        {selectedEmployee.records.length ? (
          <div className="overflow-hidden rounded-xl border border-orange-100 bg-white">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Check In
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Check Out
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {selectedEmployee.records.slice(0, 8).map((record, index) => (
                  <tr key={record.id || index} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-sm font-bold text-slate-600">
                      {formatDate(getActivityDate(record))}
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-[#061638]">
                      {formatTime(getRecordCheckIn(record))}
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-[#061638]">
                      {formatTime(getRecordCheckOut(record))}
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-[#061638]">
                      {getRecordHours(record)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status || record.type || "Present"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No day-wise attendance records found for this employee." />
        )}
      </div>
    );
  }

  return (
    <section className="-mx-8 -my-8 min-h-[calc(100vh-64px)] bg-[#f5f7fb] px-12 py-8">
      <div className="mb-6 flex items-start justify-between gap-5">
        <div>
          <h2 className="text-[36px] font-black leading-tight text-[#061638]">
            Attendance Management
          </h2>
          <p className="mt-1 text-[15px] font-medium text-slate-500">
            Monitor employee attendance, app login activity, leave requests, and
            work-hour records.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCurrentReport}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-6 text-sm font-black text-white transition hover:opacity-90"
        >
          <Download size={17} />
          Export Report
        </button>
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-4">
        <MetricCard
          id="attendance"
          title="Employees Attendance"
          value={metrics.employeeAttendance}
          Icon={UserRound}
          tone="orange"
        />

        <MetricCard
          id="appLogin"
          title="App Login Employees"
          value={metrics.appLoginEmployees}
          Icon={ArrowRight}
          tone="blue"
        />

        <MetricCard
          id="pendingLeave"
          title="Pending Leave"
          value={metrics.pendingLeave}
          Icon={CalendarCheck}
          tone="yellow"
        />

        <MetricCard
          id="leaveHistory"
          title="Leave History"
          value={metrics.leaveHistory}
          Icon={Clock}
          tone="green"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 px-5 py-6">
          <h3 className="text-[23px] font-black text-[#061638]">
            {activeView === "attendance"
              ? "Attendance Reports"
              : activeView === "appLogin"
              ? "App Login Employees"
              : activeView === "pendingLeave"
              ? "Pending Leave Requests"
              : "Leave History"}
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-500">
            {activeView === "attendance"
              ? "Every employee is shown here. Click View Full Attendance to see day-wise records."
              : activeView === "appLogin"
              ? "Employees with latest app login or check-in activity."
              : activeView === "pendingLeave"
              ? "Pending leave requests awaiting approval."
              : "Approved and rejected leave request history."}
          </p>

          <div className="relative mt-5">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                activeView === "attendance" || activeView === "appLogin"
                  ? "Search employee or email..."
                  : "Search employee, department or leave type..."
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-[#061638] outline-none transition placeholder:text-slate-400 focus:border-[#FF6B35]"
            />
          </div>
        </div>

        <div className="p-0">
          {activeView === "attendance" ? (
            <>
              <EmployeeDetailPanel />

              {filteredRows.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Employee
                        </th>
                        <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Email
                        </th>
                        <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Days Attended
                        </th>
                        <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Total Hours
                        </th>
                        <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Last Activity
                        </th>
                        <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((row) => (
                        <tr
                          key={row.id || row.email}
                          className="border-t border-slate-100 transition hover:bg-orange-50/40"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B35] text-sm font-black text-white">
                                {getInitials(row.name)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-[#061638]">
                                  {row.name}
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  {row.department}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                            {row.email}
                          </td>

                          <td className="px-4 py-4 text-sm font-black text-[#061638]">
                            {row.days}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                            {row.totalHours}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                            {row.lastActivity}
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => setSelectedEmployee(row)}
                              className="text-sm font-black text-[#FF6B35] transition hover:underline"
                            >
                              View Full Attendance
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState title="No employee attendance records found." />
                </div>
              )}
            </>
          ) : null}

          {activeView === "appLogin" ? (
            filteredAppRows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Employee
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Email
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Department
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Check In
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Check Out
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAppRows.map((row) => (
                      <tr
                        key={row.id || row.email}
                        className="border-t border-slate-100 transition hover:bg-orange-50/40"
                      >
                        <td className="px-4 py-4 text-sm font-black text-[#061638]">
                          {row.name}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                          {row.email}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                          {row.department}
                        </td>
                        <td className="px-4 py-4 text-sm font-black text-[#061638]">
                          {row.checkIn}
                        </td>
                        <td className="px-4 py-4 text-sm font-black text-[#061638]">
                          {row.checkOut}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6">
                <EmptyState title="No app login employees found." />
              </div>
            )
          ) : null}

          {activeView === "pendingLeave" ? (
            filteredPendingLeaves.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Employee
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Department
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Leave Type
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Date
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Reason
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPendingLeaves.map((leave, index) => (
                      <tr
                        key={leave.id || leave.leaveId || index}
                        className="border-t border-slate-100 transition hover:bg-orange-50/40"
                      >
                        <td className="px-4 py-4 text-sm font-black text-[#061638]">
                          {getLeaveEmployeeName(leave)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                          {getLeaveDepartment(leave)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                          {getLeaveType(leave)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                          {getLeaveDateRange(leave)}
                        </td>
                        <td className="max-w-[260px] truncate px-4 py-4 text-sm font-semibold text-slate-500">
                          {leave.reason || leave.description || "-"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={getLeaveStatus(leave)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6">
                <EmptyState title="No pending leave requests found." />
              </div>
            )
          ) : null}

          {activeView === "leaveHistory" ? (
            filteredLeaveHistory.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Employee
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Department
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Leave Type
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Date
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Reason
                      </th>
                      <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredLeaveHistory.map((leave, index) => (
                      <tr
                        key={leave.id || leave.leaveId || index}
                        className="border-t border-slate-100 transition hover:bg-orange-50/40"
                      >
                        <td className="px-4 py-4 text-sm font-black text-[#061638]">
                          {getLeaveEmployeeName(leave)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                          {getLeaveDepartment(leave)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                          {getLeaveType(leave)}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                          {getLeaveDateRange(leave)}
                        </td>
                        <td className="max-w-[260px] truncate px-4 py-4 text-sm font-semibold text-slate-500">
                          {leave.reason || leave.description || "-"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={getLeaveStatus(leave)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6">
                <EmptyState title="No leave history found." />
              </div>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AttendanceSummaryCard({ value, label, tone }) {
  const toneClasses = {
    green: "text-emerald-500",
    red: "text-red-500",
    yellow: "text-amber-500",
    orange: "text-[#FF6B35]",
  };

  return (
    <div className="flex h-[105px] flex-col items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/30 text-center">
      <p
        className={`text-3xl font-black ${
          toneClasses[tone] || toneClasses.orange
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-sm font-semibold text-[#151515]">{label}</p>
    </div>
  );
}

function AttendanceStatusBadge({ status }) {
  const normalized = normalize(status);

  if (normalized.includes("absent")) {
    return (
      <span className="inline-flex min-w-[82px] items-center justify-center rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-black text-red-500">
        ⊗ Absent
      </span>
    );
  }

  if (normalized.includes("late")) {
    return (
      <span className="inline-flex min-w-[82px] items-center justify-center rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-500">
        ⏱ Late
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[82px] items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-500">
      ⊙ Present
    </span>
  );
}

function ActionModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-black text-[#151515]">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, tone }) {
  const toneClasses = {
    blue: "bg-sky-100 text-sky-500",
    purple: "bg-purple-100 text-purple-500",
    green: "bg-emerald-100 text-emerald-500",
    pink: "bg-pink-100 text-pink-500",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-slate-500">{title}</p>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            toneClasses[tone] || toneClasses.blue
          }`}
        >
          <CheckCircle2 size={18} />
        </div>
      </div>

      <p className="mt-8 text-3xl font-black">{value}</p>
    </div>
  );
}
function ProjectCard({ project, tasks, users }) {
  const projectId = getProjectId(project);

  const projectTasks = tasks.filter(
    (task) => getTaskProjectId(task) === projectId
  );

  const completed = projectTasks.filter((task) =>
    isCompletedStatus(task.status)
  ).length;

  const total = projectTasks.length;
  const progress = Math.max(0, Math.min(100, Number(project.progress || 0)));

  const memberIds = [
    ...new Set(projectTasks.map((task) => getTaskAssignedId(task)).filter(Boolean)),
  ].slice(0, 4);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full bg-[#FF6B35] px-3 py-1 text-xs font-black lowercase text-white">
          {project.status || "active"}
        </span>

        <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black lowercase text-white">
          {project.priority || "high"}
        </span>
      </div>

      <h3 className="mt-6 text-xl font-black">{getProjectName(project)}</h3>
      <p className="mt-1 text-sm text-slate-500">
        {project.description || project.shortDescription || "Short Description"}
      </p>

      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-500">Progress</span>
          <span className="font-black">{progress}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#FF6B35]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-b border-slate-100 pb-4 text-sm">
        <span className="text-slate-500">Tasks</span>
        <span className="font-black">
          {completed} / {total || 0} completed
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4 text-sm">
        <span className="text-slate-500">Team</span>

        <div className="flex -space-x-2">
          {memberIds.length ? (
            memberIds.map((id) => {
              const user = users.find((item) => getUserId(item) === id);
              return (
                <span
                  key={id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FF6B35] text-[10px] font-black text-white"
                >
                  {getInitials(getEmployeeName(user))}
                </span>
              );
            })
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-slate-500">
          <Clock size={14} />
          Deadline
        </span>

        <span className="font-black">
          {formatDate(getProjectDeadline(project))}
        </span>
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
      >
        View Details
      </button>
    </article>
  );
}

function SimpleTableSection({ title, description, columns, rows }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-4 text-sm font-semibold"
                  >
                    {cell || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length ? (
        <div className="p-8 text-center text-slate-500">No records found.</div>
      ) : null}
    </section>
  );
}

function EmptySection({ title, description }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-2 text-slate-500">{description}</p>
    </section>
  );
}

function ChatboxSection() {
  return (
    <div className="-mx-8 -my-8">
      <ChatPage mode="superadmin" />
    </div>
  );
}
