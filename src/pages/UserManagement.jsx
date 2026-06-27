import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  Plus,
  Search,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/Button";
import Input from "../components/Input";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import * as projectService from "../services/projectService";
import * as userService from "../services/userService";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function normalizeId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value.id ||
        value._id ||
        value.uid ||
        value.userId ||
        value.user_id ||
        value.employeeId ||
        value.employee_id ||
        value.email ||
        value.name ||
        ""
    ).trim();
  }

  return String(value).trim();
}

function extractArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.employees)) return response.employees;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function getUserId(user) {
  return String(
    user?.id ||
      user?._id ||
      user?.uid ||
      user?.userId ||
      user?.user_id ||
      user?.employeeId ||
      user?.employee_id ||
      user?.email ||
      user?.name ||
      ""
  );
}

function getEmployeeName(user) {
  return (
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    user?.displayName ||
    user?.display_name ||
    user?.employeeName ||
    user?.employee_name ||
    user?.username ||
    user?.email ||
    "Employee"
  );
}

function getEmployeeEmail(user) {
  return user?.email || user?.userEmail || user?.user_email || "-";
}

function getEmployeeDepartment(user) {
  return (
    user?.department ||
    user?.departmentName ||
    user?.department_name ||
    user?.division ||
    user?.divisionName ||
    user?.division_name ||
    "Unassigned"
  );
}

function getEmployeeRole(user) {
  return user?.designation || user?.role || user?.position || "Team Member";
}

function getInitials(name) {
  const cleanName = String(name || "E").trim();

  if (!cleanName) return "E";

  return cleanName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isEmployeeLike(user) {
  const role = normalize(getEmployeeRole(user));

  if (!role) return true;

  return (
    role === "employee" ||
    role === "team member" ||
    role === "teammember" ||
    role === "staff" ||
    role === "user" ||
    role === "member"
  );
}

function getAttendancePercent(user) {
  const direct =
    user?.attendancePercentage ||
    user?.attendance_percentage ||
    user?.attendancePercent ||
    user?.attendance_percent ||
    user?.attendance?.percentage ||
    user?.attendance?.percent;

  if (direct !== undefined && direct !== null && direct !== "") {
    const number = Number(String(direct).replace("%", ""));

    return Number.isFinite(number)
      ? Math.max(0, Math.min(100, Math.round(number)))
      : 0;
  }

  return 0;
}

function getWeeklyHours(user) {
  const value =
    user?.weeklyHours ||
    user?.weekly_hours ||
    user?.hoursThisWeek ||
    user?.hours_this_week ||
    user?.workHours ||
    user?.work_hours ||
    user?.attendance?.weeklyHours ||
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getProjectId(project) {
  return String(
    project?.id ||
      project?._id ||
      project?.projectId ||
      project?.project_id ||
      project?.uid ||
      ""
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

function getProjectDescription(project) {
  return (
    project?.description ||
    project?.details ||
    project?.summary ||
    project?.projectDescription ||
    project?.project_description ||
    "-"
  );
}

function getProjectStatus(project) {
  return project?.status || project?.projectStatus || "active";
}

function getProjectPriority(project) {
  return project?.priority || project?.projectPriority || "medium";
}

function getProjectEndDate(project) {
  return (
    project?.endDate ||
    project?.end_date ||
    project?.dueDate ||
    project?.due_date ||
    project?.deadline ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getProjectTasks(project) {
  const tasks =
    project?.tasks ||
    project?.taskList ||
    project?.task_list ||
    project?.todos ||
    project?.toDos ||
    project?.checklist ||
    [];

  return Array.isArray(tasks) ? tasks : [];
}

function getTaskStatus(task) {
  return String(task?.status || task?.taskStatus || "").toLowerCase();
}

function getTaskAssignedRaw(task) {
  return (
    task?.assignedTo ||
    task?.assigned_to ||
    task?.assignee ||
    task?.assigneeName ||
    task?.assignee_name ||
    task?.assignedToName ||
    task?.assigned_to_name ||
    task?.employee ||
    task?.employeeName ||
    task?.employee_name ||
    task?.user ||
    ""
  );
}

function getTaskAssignedId(task) {
  return normalizeId(
    task?.assignedToId ||
      task?.assigned_to_id ||
      task?.assigneeId ||
      task?.assignee_id ||
      task?.employeeId ||
      task?.employee_id ||
      task?.userId ||
      task?.user_id ||
      getTaskAssignedRaw(task)
  );
}

function getProjectProgress(project) {
  const direct =
    project?.progress ??
    project?.completion ??
    project?.completionPercentage ??
    project?.completion_percentage ??
    project?.progressPercentage ??
    project?.progress_percentage;

  const directNumber = Number(direct);

  if (Number.isFinite(directNumber)) {
    return Math.max(0, Math.min(100, Math.round(directNumber)));
  }

  const tasks = getProjectTasks(project);

  if (!tasks.length) return 0;

  const completed = tasks.filter((task) => {
    const status = getTaskStatus(task);

    return (
      task?.done === true ||
      status === "done" ||
      status === "complete" ||
      status === "completed"
    );
  }).length;

  return Math.round((completed / tasks.length) * 100);
}

function getUserKeys(user) {
  return [
    getUserId(user),
    user?.id,
    user?._id,
    user?.uid,
    user?.userId,
    user?.user_id,
    user?.employeeId,
    user?.employee_id,
    user?.email,
    user?.name,
    user?.fullName,
    user?.full_name,
    user?.displayName,
    user?.display_name,
    user?.employeeName,
    user?.employee_name,
  ]
    .filter(Boolean)
    .map((item) => normalizeId(item).toLowerCase());
}

function getProjectMemberSources(project) {
  const fields = [
    project?.members,
    project?.member,
    project?.assignedMembers,
    project?.assigned_members,
    project?.assignedUsers,
    project?.assigned_users,
    project?.assignedEmployees,
    project?.assigned_employees,
    project?.users,
    project?.employees,
    project?.team,
    project?.teamMembers,
    project?.team_members,
    project?.participants,
    project?.contributors,
    project?.assignedTo,
    project?.assigned_to,
    project?.assignee,
    project?.assignees,
    project?.assignedUser,
    project?.assigned_user,
    project?.assignedEmployee,
    project?.assigned_employee,
    project?.employeeIds,
    project?.employee_ids,
  ];

  return fields.flatMap((field) => {
    if (!field) return [];

    if (Array.isArray(field)) return field;

    if (typeof field === "string") {
      return field
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [field];
  });
}

function isEmployeeAssignedToProject(employee, project) {
  const userKeys = getUserKeys(employee);

  const projectMemberKeys = getProjectMemberSources(project)
    .flatMap((member) => {
      if (typeof member === "object" && member) {
        return getUserKeys(member);
      }

      return [normalizeId(member).toLowerCase()];
    })
    .filter(Boolean);

  const memberMatch = userKeys.some((key) => projectMemberKeys.includes(key));

  if (memberMatch) return true;

  return getProjectTasks(project).some((task) => {
    const taskKeys = [
      getTaskAssignedId(task),
      getTaskAssignedRaw(task),
      task?.assignedToId,
      task?.assigned_to_id,
      task?.assigneeId,
      task?.assignee_id,
      task?.employeeId,
      task?.employee_id,
      task?.userId,
      task?.user_id,
    ]
      .filter(Boolean)
      .flatMap((item) => {
        if (typeof item === "object" && item) {
          return getUserKeys(item);
        }

        return [normalizeId(item).toLowerCase()];
      });

    return userKeys.some((key) => taskKeys.includes(key));
  });
}

function getEmployeeProjects(employee, projects) {
  if (!employee) return [];

  return projects.filter((project) =>
    isEmployeeAssignedToProject(employee, project)
  );
}

function getEmployeeTaskStats(employee, projects) {
  if (!employee) {
    return {
      total: 0,
      completed: 0,
    };
  }

  const userKeys = getUserKeys(employee);

  const tasks = projects.flatMap((project) =>
    getProjectTasks(project).filter((task) => {
      const taskKeys = [
        getTaskAssignedId(task),
        getTaskAssignedRaw(task),
        task?.assignedToId,
        task?.assigned_to_id,
        task?.assigneeId,
        task?.assignee_id,
        task?.employeeId,
        task?.employee_id,
        task?.userId,
        task?.user_id,
      ]
        .filter(Boolean)
        .flatMap((item) => {
          if (typeof item === "object" && item) {
            return getUserKeys(item);
          }

          return [normalizeId(item).toLowerCase()];
        });

      return userKeys.some((key) => taskKeys.includes(key));
    })
  );

  const completed = tasks.filter((task) => {
    const status = getTaskStatus(task);

    return (
      task?.done === true ||
      status === "done" ||
      status === "complete" ||
      status === "completed"
    );
  }).length;

  return {
    total: tasks.length,
    completed,
  };
}

function getEmployeeProgress(employee, projects) {
  const assignedProjects = getEmployeeProjects(employee, projects);

  if (!assignedProjects.length) return 0;

  const totalProgress = assignedProjects.reduce(
    (sum, project) => sum + getProjectProgress(project),
    0
  );

  return Math.round(totalProgress / assignedProjects.length);
}

function statusClass(status) {
  const value = normalize(status);

  if (value === "active" || value === "approved" || value === "ongoing") {
    return "bg-orange-50 text-[#FF6B35]";
  }

  if (value === "completed" || value === "done") {
    return "bg-emerald-50 text-emerald-600";
  }

  if (value === "on hold" || value === "paused") {
    return "bg-yellow-50 text-yellow-700";
  }

  return "bg-slate-100 text-slate-600";
}

async function fetchUsers(profile) {
  if (typeof userService.getUsers === "function") {
    return userService.getUsers(profile);
  }

  if (typeof userService.fetchUsers === "function") {
    return userService.fetchUsers(profile);
  }

  if (typeof userService.getAllUsers === "function") {
    return userService.getAllUsers(profile);
  }

  throw new Error("User fetch function not found.");
}

async function fetchProjects(profile) {
  if (typeof projectService.getAllProjects === "function") {
    return projectService.getAllProjects(profile);
  }

  if (typeof projectService.getProjects === "function") {
    return projectService.getProjects(profile);
  }

  if (typeof projectService.fetchProjects === "function") {
    return projectService.fetchProjects(profile);
  }

  return [];
}

async function createEmployeeRecord(payload, profile) {
  if (typeof userService.createUser === "function") {
    return userService.createUser(payload, profile);
  }

  if (typeof userService.addUser === "function") {
    return userService.addUser(payload, profile);
  }

  if (typeof userService.createEmployee === "function") {
    return userService.createEmployee(payload, profile);
  }

  if (typeof userService.addEmployee === "function") {
    return userService.addEmployee(payload, profile);
  }

  throw new Error("Create employee function not found.");
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-xl font-black text-valencia-navy">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-valencia-line bg-white text-valencia-navy transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { profile } = useAuth();

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    role: "Employee",
    phone: "",
    password: "",
  });

  async function loadData() {
    setLoading(true);

    try {
      const [userResponse, projectResponse] = await Promise.all([
        fetchUsers(profile),
        fetchProjects(profile),
      ]);

      const userList = extractArray(userResponse).filter(isEmployeeLike);
      const projectList = extractArray(projectResponse);

      setUsers(userList);
      setProjects(projectList);

      setSelectedUserId((current) => {
        if (current && userList.some((user) => getUserId(user) === current)) {
          return current;
        }

        return "";
      });
    } catch (error) {
      console.error("Employee load error:", error);
      toast.error(error?.message || "Failed to load employees.");
      setUsers([]);
      setProjects([]);
      setSelectedUserId("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [profile]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(users.map((user) => getEmployeeDepartment(user)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filteredEmployees = useMemo(() => {
    const query = normalize(search);

    return users.filter((user) => {
      const department = getEmployeeDepartment(user);

      const searchable = normalize(
        `${getEmployeeName(user)} ${getEmployeeEmail(user)} ${department} ${getEmployeeRole(
          user
        )}`
      );

      const matchesSearch = !query || searchable.includes(query);
      const matchesDepartment =
        departmentFilter === "all" ||
        normalize(department) === normalize(departmentFilter);

      return matchesSearch && matchesDepartment;
    });
  }, [users, search, departmentFilter]);

  const selectedEmployee = useMemo(() => {
    if (!selectedUserId) return null;

    return users.find((user) => getUserId(user) === selectedUserId) || null;
  }, [users, selectedUserId]);

  const selectedEmployeeProjects = useMemo(() => {
    return getEmployeeProjects(selectedEmployee, projects);
  }, [selectedEmployee, projects]);

  const selectedTaskStats = useMemo(() => {
    return getEmployeeTaskStats(selectedEmployee, projects);
  }, [selectedEmployee, projects]);

  const selectedProgress = useMemo(() => {
    return getEmployeeProgress(selectedEmployee, projects);
  }, [selectedEmployee, projects]);

  const stats = useMemo(() => {
    return {
      employees: users.length,
      departments: departments.length,
    };
  }, [users, departments]);

  function updateForm(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm({
      name: "",
      email: "",
      department: "",
      role: "Employee",
      phone: "",
      password: "",
    });
  }

  async function submitEmployee(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Employee name is required.");
      return;
    }

    if (!form.email.trim()) {
      toast.error("Employee email is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        fullName: form.name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        departmentName: form.department.trim(),
        division: form.department.trim(),
        role: form.role || "Employee",
        designation: form.role || "Employee",
        phone: form.phone.trim(),
        password: form.password,
      };

      await createEmployeeRecord(payload, profile);

      toast.success("Employee added.");
      setAddOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to add employee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-valencia-navy sm:text-4xl">
              Employee Management
            </h1>

            <p className="muted mt-1">
              Review employee access, attendance, and leave records from one place.
            </p>
          </div>

          <Button
            icon={Plus}
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
          >
            Add Employee
          </Button>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            label="Employees Visible"
            value={stats.employees}
            icon={UserRound}
          />

          <StatCard
            label="Departments"
            value={stats.departments}
            icon={Building2}
            tone="green"
          />
        </div>

        <section className="card p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
            <Input
              icon={Search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, department..."
            />

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="h-11 rounded-md border border-valencia-line bg-white px-3 text-sm font-semibold text-valencia-navy outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </section>

        {selectedEmployee ? (
          <section className="grid gap-4 xl:grid-cols-[410px_1fr]">
            <EmployeeList
              employees={filteredEmployees}
              selectedUserId={selectedUserId}
              loading={loading}
              onSelect={(employee) => setSelectedUserId(getUserId(employee))}
            />

            <EmployeeDetailPanel
              employee={selectedEmployee}
              projects={selectedEmployeeProjects}
              progress={selectedProgress}
              taskStats={selectedTaskStats}
              onClose={() => setSelectedUserId("")}
              onAssignTask={() =>
                toast("Use the project detail page to assign tasks.")
              }
              onAddRemark={() => toast("Remark feature can be connected next.")}
              onMessage={() => toast("Open Chatbox and select this employee.")}
            />
          </section>
        ) : (
          <EmployeeNormalTable
            employees={filteredEmployees}
            projects={projects}
            loading={loading}
            onSelect={(employee) => setSelectedUserId(getUserId(employee))}
          />
        )}

        {loading ? (
          <div className="fixed bottom-5 right-5 rounded-full bg-valencia-navy px-4 py-2 text-sm font-black text-white shadow-lift">
            Loading employees...
          </div>
        ) : null}
      </div>

      {addOpen ? (
        <Modal title="Add Employee" onClose={() => setAddOpen(false)}>
          <form onSubmit={submitEmployee} className="grid gap-4">
            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                Full Name
              </span>

              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Employee full name"
                className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                Email
              </span>

              <div className="flex h-11 items-center gap-3 rounded-xl border border-valencia-line bg-white px-4 focus-within:border-valencia-orange">
                <Mail size={17} className="text-valencia-muted" />

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                  placeholder="employee@valencia.com"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-valencia-navy outline-none"
                />
              </div>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Department
                </span>

                <input
                  value={form.department}
                  onChange={(event) =>
                    updateForm("department", event.target.value)
                  }
                  placeholder="Department"
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Role
                </span>

                <select
                  value={form.role}
                  onChange={(event) => updateForm("role", event.target.value)}
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                >
                  <option value="Employee">Employee</option>
                  <option value="Team Member">Team Member</option>
                  <option value="Manager">Manager</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Phone
                </span>

                <input
                  value={form.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                  placeholder="Phone number"
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                />
              </label>

              <label>
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
                  Password
                </span>

                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateForm("password", event.target.value)
                  }
                  placeholder="Temporary password"
                  className="h-11 w-full rounded-xl border border-valencia-line bg-white px-4 text-sm font-bold text-valencia-navy outline-none focus:border-valencia-orange"
                />
              </label>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={saving}
                className="h-11 rounded-xl border border-valencia-line bg-white px-5 text-sm font-black text-valencia-navy transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-valencia-orange px-6 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </main>
  );
}

function EmployeeList({ employees, selectedUserId, loading, onSelect }) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[1fr_130px] border-b border-valencia-line bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-valencia-muted">
        <span>Employee</span>
        <span>Department</span>
      </div>

      <div className="max-h-[620px] overflow-y-auto">
        {employees.length ? (
          employees.map((employee, index) => {
            const id =
              getUserId(employee) || `${getEmployeeEmail(employee)}-${index}`;
            const active = id === selectedUserId;
            const name = getEmployeeName(employee);
            const department = getEmployeeDepartment(employee);

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(employee)}
                className={`grid w-full grid-cols-[1fr_130px] items-center gap-4 border-b border-valencia-line px-5 py-5 text-left transition ${
                  active ? "bg-[#fff0ea]" : "bg-white hover:bg-orange-50/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-sm font-black text-white">
                    {getInitials(name)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-valencia-navy">
                      {name}
                    </p>
                    <p className="truncate text-xs font-semibold text-valencia-muted">
                      {getEmployeeRole(employee)}
                    </p>
                  </div>
                </div>

                <p className="text-sm font-semibold leading-5 text-valencia-muted">
                  {department}
                </p>
              </button>
            );
          })
        ) : (
          <div className="px-5 py-10 text-center text-sm font-semibold text-valencia-muted">
            {loading ? "Loading employees..." : "No employees found."}
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeNormalTable({ employees, projects, loading, onSelect }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-valencia-line px-5 py-5">
        <h2 className="text-xl font-black text-valencia-navy">Employees</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-valencia-line bg-slate-50 text-xs uppercase tracking-[0.14em] text-valencia-muted">
              <th className="px-5 py-4">Employee</th>
              <th className="px-5 py-4">Department</th>
              <th className="px-5 py-4">Progress</th>
              <th className="px-5 py-4">Tasks</th>
              <th className="px-5 py-4">Attendance</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {employees.length ? (
              employees.map((employee, index) => {
                const name = getEmployeeName(employee);
                const id =
                  getUserId(employee) || `${getEmployeeEmail(employee)}-${index}`;
                const progress = getEmployeeProgress(employee, projects);
                const taskStats = getEmployeeTaskStats(employee, projects);
                const attendance = getAttendancePercent(employee);

                return (
                  <tr
                    key={id}
                    onClick={() => onSelect(employee)}
                    className="cursor-pointer border-b border-valencia-line transition hover:bg-orange-50/60"
                  >
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-sm font-black text-white">
                          {getInitials(name)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black text-valencia-navy">
                            {name}
                          </p>
                          <p className="truncate text-xs font-semibold text-valencia-muted">
                            {getEmployeeRole(employee)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-5 font-semibold text-valencia-muted">
                      {getEmployeeDepartment(employee)}
                    </td>

                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#FF6B35]"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="font-black text-valencia-muted">
                          {progress}%
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-5 font-black text-valencia-navy">
                      {taskStats.completed}/{taskStats.total}
                    </td>

                    <td className="px-5 py-5 font-black text-valencia-navy">
                      {attendance}%
                    </td>

                    <td className="px-5 py-5">
                      <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-700">
                        Present
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-sm font-semibold text-valencia-muted"
                >
                  {loading ? "Loading employees..." : "No employees found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmployeeDetailPanel({
  employee,
  projects,
  progress,
  taskStats,
  onClose,
  onAssignTask,
  onAddRemark,
  onMessage,
}) {
  const name = getEmployeeName(employee);
  const email = getEmployeeEmail(employee);
  const department = getEmployeeDepartment(employee);
  const role = getEmployeeRole(employee);
  const attendance = getAttendancePercent(employee);
  const weeklyHours = getWeeklyHours(employee);

  return (
    <div className="card min-h-[560px] p-5">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B35] text-lg font-black text-white">
              {getInitials(name)}
            </div>

            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black text-valencia-navy">
              {name}
            </h2>

            <p className="mt-1 text-sm font-bold text-valencia-muted">
              {role} | {department}
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-valencia-muted">
              {email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100"
          title="Close employee details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MiniMetric icon={TrendingUp} label="Progress" value={`${progress}%`} />

        <MiniMetric
          icon={CheckCircle2}
          label="Tasks Done"
          value={`${taskStats.completed}/${taskStats.total}`}
        />

        <MiniMetric
          icon={CalendarCheck}
          label="Attendance"
          value={`${attendance}%`}
        />

        <MiniMetric
          icon={Clock3}
          label="Weekly Hours"
          value={`${weeklyHours}h 00m`}
        />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <button
          type="button"
          onClick={onAssignTask}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-sm font-black text-white shadow-[0_10px_24px_rgba(255,107,53,0.25)] transition hover:opacity-90"
        >
          <Plus size={18} />
          Assign Task
        </button>

        <button
          type="button"
          onClick={onAddRemark}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f59e0b] text-sm font-black text-white shadow-[0_10px_24px_rgba(245,158,11,0.22)] transition hover:opacity-90"
        >
          <UserRound size={18} />
          Add Remark
        </button>

        <button
          type="button"
          onClick={onMessage}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#6366f1] text-sm font-black text-white shadow-[0_10px_24px_rgba(99,102,241,0.22)] transition hover:opacity-90"
        >
          <MessageCircle size={18} />
          Message Employee
        </button>
      </div>

      <div className="mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-black text-valencia-navy">
            <span className="h-6 w-1 rounded-full bg-[#FF6B35]" />
            Projects
          </h3>

          <p className="text-sm font-semibold text-valencia-muted">
            {projects.length} assigned
          </p>
        </div>

        {projects.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project, index) => {
              const projectProgress = getProjectProgress(project);

              return (
                <div
                  key={getProjectId(project) || index}
                  className="rounded-xl border border-valencia-line bg-white p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="line-clamp-2 text-base font-black leading-tight text-valencia-navy">
                        {getProjectName(project, index)}
                      </h4>

                      <p className="mt-2 line-clamp-2 text-sm font-medium text-valencia-muted">
                        {getProjectDescription(project)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusClass(
                        getProjectStatus(project)
                      )}`}
                    >
                      {getProjectStatus(project)}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center justify-between text-xs font-black text-valencia-muted">
                    <span>Completion</span>
                    <span>{projectProgress}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-[#FF6B35]"
                      style={{ width: `${projectProgress}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm font-semibold text-valencia-muted">
                    <span>{getProjectPriority(project)}</span>
                    <span>Due {formatDate(getProjectEndDate(project))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-valencia-line bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-valencia-muted">
            No projects assigned to this employee.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-orange-100 bg-[#fff7f3] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#FF6B35]">
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-2xl font-black leading-none text-valencia-navy">
            {value}
          </p>

          <p className="mt-1 text-xs font-semibold text-valencia-muted">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}