import {
  Building2,
  Mail,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/Button";
import Input from "../components/Input";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import * as userService from "../services/userService";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function extractArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.employees)) return response.employees;
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
  return user?.designation || user?.role || user?.position || "Employee";
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

function getDaysAttended(user) {
  const value =
    user?.daysAttended ||
    user?.days_attended ||
    user?.attendedDays ||
    user?.attended_days ||
    user?.attendanceDays ||
    user?.attendance_days ||
    user?.presentDays ||
    user?.present_days ||
    user?.attendance?.daysAttended ||
    user?.attendance?.presentDays ||
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getLeavesTaken(user) {
  const value =
    user?.leavesTaken ||
    user?.leaves_taken ||
    user?.leaveCount ||
    user?.leave_count ||
    user?.totalLeaves ||
    user?.total_leaves ||
    user?.leaves?.taken ||
    user?.leaves?.total ||
    0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
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

  const days = getDaysAttended(user);

  if (!days) return 0;

  const total =
    user?.totalWorkingDays ||
    user?.total_working_days ||
    user?.workingDays ||
    user?.working_days ||
    user?.attendance?.totalDays ||
    22;

  const totalNumber = Number(total) || 22;

  return Math.max(0, Math.min(100, Math.round((days / totalNumber) * 100)));
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

  async function loadUsers() {
    setLoading(true);

    try {
      const response = await fetchUsers(profile);
      const list = extractArray(response);

      setUsers(list.filter(isEmployeeLike));
    } catch (error) {
      console.error("Employee load error:", error);
      toast.error(error?.message || "Failed to load employees.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
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
      await loadUsers();
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

        <section className="card overflow-hidden">
          <div className="border-b border-valencia-line px-4 py-5">
            <h2 className="text-xl font-black text-valencia-navy">Employees</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b border-valencia-line bg-slate-50 text-xs uppercase tracking-[0.14em] text-valencia-muted">
                  <th className="px-4 py-4">Employee</th>
                  <th className="px-4 py-4">Days Attended</th>
                  <th className="px-4 py-4">Leaves Taken</th>
                  <th className="px-4 py-4">Attendance</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.length ? (
                  filteredEmployees.map((employee, index) => {
                    const name = getEmployeeName(employee);
                    const email = getEmployeeEmail(employee);
                    const department = getEmployeeDepartment(employee);
                    const daysAttended = getDaysAttended(employee);
                    const leavesTaken = getLeavesTaken(employee);
                    const attendancePercent = getAttendancePercent(employee);

                    return (
                      <tr
                        key={getUserId(employee) || `${email}-${index}`}
                        className="border-b border-valencia-line transition hover:bg-orange-50/40"
                      >
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-black text-valencia-navy">
                              {getInitials(name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-black text-valencia-navy">
                                {name}
                              </p>

                              <div className="mt-1 flex min-w-0 flex-col gap-0.5">
                                <p className="truncate text-xs font-semibold text-valencia-muted">
                                  {email}
                                </p>

                                <p className="truncate text-xs font-black text-valencia-muted">
                                  {department}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 align-middle text-center font-black text-valencia-navy">
                          {daysAttended}
                        </td>

                        <td className="px-4 py-4 align-middle text-center font-black text-valencia-navy">
                          {leavesTaken}
                        </td>

                        <td className="px-4 py-4 align-middle text-center font-black text-valencia-navy">
                          {attendancePercent}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm font-semibold text-valencia-muted"
                    >
                      {loading ? "Loading employees..." : "No employees found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

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