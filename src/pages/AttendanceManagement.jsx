import {
  CalendarDays,
  Clock3,
  LogIn,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { apiGet } from "../services/api";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim();
}

function getUserId(user) {
  return String(user?.id || user?.uid || user?.userId || user?.user_id || "");
}

function getUserName(user) {
  return (
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    user?.displayName ||
    user?.email ||
    "Unnamed Employee"
  );
}

function getUserEmail(user) {
  return user?.email || user?.mail || "-";
}

function getAttendanceUserId(record) {
  return String(
    record?.userId ||
      record?.user_id ||
      record?.employeeId ||
      record?.employee_id ||
      record?.uid ||
      record?.user?.id ||
      record?.employee?.id ||
      ""
  );
}

function getLeaveUserId(leave) {
  return String(
    leave?.userId ||
      leave?.user_id ||
      leave?.employeeId ||
      leave?.employee_id ||
      leave?.uid ||
      leave?.user?.id ||
      leave?.employee?.id ||
      ""
  );
}

function getLeaveEmployeeName(leave, users) {
  if (leave?.employeeName) return leave.employeeName;
  if (leave?.employee_name) return leave.employee_name;
  if (leave?.user?.name) return leave.user.name;
  if (leave?.employee?.name) return leave.employee.name;

  const userId = getLeaveUserId(leave);
  const user = users.find((item) => getUserId(item) === userId);

  return getUserName(user);
}

function getLeaveEmployeeEmail(leave, users) {
  if (leave?.employeeEmail) return leave.employeeEmail;
  if (leave?.employee_email) return leave.employee_email;
  if (leave?.user?.email) return leave.user.email;
  if (leave?.employee?.email) return leave.employee.email;

  const userId = getLeaveUserId(leave);
  const user = users.find((item) => getUserId(item) === userId);

  return getUserEmail(user);
}

function getLeaveFromDate(leave) {
  return (
    leave?.fromDate ||
    leave?.from_date ||
    leave?.startDate ||
    leave?.start_date ||
    leave?.date ||
    leave?.createdAt ||
    leave?.created_at ||
    ""
  );
}

function getLeaveToDate(leave) {
  return (
    leave?.toDate ||
    leave?.to_date ||
    leave?.endDate ||
    leave?.end_date ||
    leave?.date ||
    ""
  );
}

function getLeaveType(leave) {
  return (
    leave?.type ||
    leave?.leaveType ||
    leave?.leave_type ||
    leave?.category ||
    "Leave"
  );
}

function getLeaveReason(leave) {
  return leave?.reason || leave?.message || leave?.description || "-";
}

function getLeaveStatus(leave) {
  return leave?.status || "pending";
}

function getRecordDate(record) {
  return (
    record?.date ||
    record?.attendanceDate ||
    record?.attendance_date ||
    record?.loginDate ||
    record?.login_date ||
    record?.createdAt ||
    record?.created_at ||
    record?.checkIn ||
    record?.check_in ||
    record?.checkInTime ||
    record?.check_in_time ||
    record?.loginTime ||
    record?.login_time ||
    ""
  );
}

function getCheckIn(record) {
  return (
    record?.checkIn ||
    record?.check_in ||
    record?.checkInTime ||
    record?.check_in_time ||
    record?.loginTime ||
    record?.login_time ||
    record?.createdAt ||
    record?.created_at ||
    ""
  );
}

function getCheckOut(record) {
  return (
    record?.checkOut ||
    record?.check_out ||
    record?.checkOutTime ||
    record?.check_out_time ||
    record?.logoutTime ||
    record?.logout_time ||
    ""
  );
}

function getLastActivityDate(record) {
  return (
    record?.lastActivity ||
    record?.last_activity ||
    record?.updatedAt ||
    record?.updated_at ||
    record?.checkOut ||
    record?.check_out ||
    record?.checkout ||
    record?.createdAt ||
    record?.created_at ||
    getRecordDate(record)
  );
}

function getTotalHours(record) {
  const direct =
    record?.totalHours ??
    record?.total_hours ??
    record?.hours ??
    record?.durationHours ??
    record?.duration_hours;

  const directNumber = Number(direct);

  if (Number.isFinite(directNumber)) {
    return directNumber;
  }

  const checkIn = getCheckIn(record);
  const checkOut = getCheckOut(record);

  if (!checkIn || !checkOut) return 0;

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diff = end.getTime() - start.getTime();

  if (diff <= 0) return 0;

  return diff / (1000 * 60 * 60);
}

function formatHours(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  const rounded = Math.round(number * 10) / 10;

  return String(rounded);
}

function formatStatus(value) {
  return String(value || "Pending")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusClass(value) {
  const status = normalize(value);

  if (status === "approved" || status === "accepted") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected" || status === "declined") {
    return "bg-red-50 text-red-700";
  }

  if (status === "cancelled" || status === "canceled") {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-amber-50 text-amber-700";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateKey(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function extractList(data, possibleKeys = []) {
  if (Array.isArray(data)) return data;

  for (const key of possibleKeys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

async function tryApiGet(paths) {
  for (const path of paths) {
    try {
      const data = await apiGet(path);
      return data;
    } catch (error) {
      console.warn(`Failed API path: ${path}`, error);
    }
  }

  return [];
}

export default function AttendanceManagement() {
  const { profile } = useAuth();

  const [users, setUsers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [appLoginRecords, setAppLoginRecords] = useState([]);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCard, setActiveCard] = useState("attendance");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAttendanceData = async () => {
    setLoading(true);

    try {
      const [usersData, attendanceData, appLoginData, leaveData] =
        await Promise.all([
          tryApiGet([
            "/users",
            "/admin/users",
            "/employees",
            "/admin/employees",
            "/me/users",
          ]),
          tryApiGet([
            "/attendance",
            "/attendance/admin",
            "/attendance/reports",
            "/admin/attendance",
            "/attendance-management",
          ]),
          tryApiGet([
            "/app-logins",
            "/app-login",
            "/admin/app-logins",
            "/app-logins/admin",
            "/login-records",
            "/app_logins",
          ]),
          tryApiGet([
            "/leaves",
            "/leave-requests",
            "/admin/leaves",
            "/attendance/leaves",
          ]),
        ]);

      setUsers(
        extractList(usersData, ["users", "employees"]).filter((user) => {
          const role = normalize(user?.role);
          return role !== "superadmin" && role !== "super admin";
        })
      );

      setAttendanceRecords(
        extractList(attendanceData, [
          "attendance",
          "records",
          "attendanceRecords",
          "reports",
        ])
      );

      setAppLoginRecords(
        extractList(appLoginData, [
          "appLogins",
          "app_logins",
          "logins",
          "records",
          "loginRecords",
        ])
      );

      setLeaveRecords(
        extractList(leaveData, ["leaves", "leaveRequests", "requests"])
      );
    } catch (error) {
      console.error("Attendance management load error:", error);
      toast.error(error?.message || "Failed to load attendance data.");
      setUsers([]);
      setAttendanceRecords([]);
      setAppLoginRecords([]);
      setLeaveRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceData();
  }, [profile]);

  const employeeReports = useMemo(() => {
    return users.map((user) => {
      const userId = getUserId(user);

      const userAttendance = attendanceRecords.filter(
        (record) => getAttendanceUserId(record) === userId
      );

      const userAppLogins = appLoginRecords.filter(
        (record) => getAttendanceUserId(record) === userId
      );

      const dateKeys = new Set();

      userAttendance.forEach((record) => {
        const dateKey = formatDateKey(getRecordDate(record));
        if (dateKey) dateKeys.add(dateKey);
      });

      userAppLogins.forEach((record) => {
        const dateKey = formatDateKey(getRecordDate(record));
        if (dateKey) dateKeys.add(dateKey);
      });

      const totalHours = userAttendance.reduce(
        (sum, record) => sum + getTotalHours(record),
        0
      );

      const allActivity = [...userAttendance, ...userAppLogins]
        .map((record) => getLastActivityDate(record))
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime());

      return {
        id: userId,
        name: getUserName(user),
        email: getUserEmail(user),
        daysAttended: dateKeys.size,
        totalHours,
        lastActivity: allActivity[0] || null,
        user,
      };
    });
  }, [users, attendanceRecords, appLoginRecords]);

  const appLoginReports = useMemo(() => {
    return users.map((user) => {
      const userId = getUserId(user);

      const userAppLogins = appLoginRecords.filter(
        (record) => getAttendanceUserId(record) === userId
      );

      const loginDates = new Set();

      userAppLogins.forEach((record) => {
        const dateKey = formatDateKey(getRecordDate(record));
        if (dateKey) loginDates.add(dateKey);
      });

      const lastLogin = userAppLogins
        .map((record) => getLastActivityDate(record))
        .filter(Boolean)
        .map((value) => new Date(value))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        id: userId,
        name: getUserName(user),
        email: getUserEmail(user),
        loginDays: loginDates.size,
        loginRecords: userAppLogins.length,
        lastLogin: lastLogin || null,
      };
    });
  }, [users, appLoginRecords]);

  const filteredEmployeeReports = useMemo(() => {
    const query = normalize(search);

    return employeeReports.filter((employee) => {
      const searchable = normalize(`${employee.name} ${employee.email}`);
      return !query || searchable.includes(query);
    });
  }, [employeeReports, search]);

  const filteredAppLoginReports = useMemo(() => {
    const query = normalize(search);

    return appLoginReports.filter((employee) => {
      const searchable = normalize(`${employee.name} ${employee.email}`);
      return !query || searchable.includes(query);
    });
  }, [appLoginReports, search]);

  const pendingLeaves = useMemo(() => {
    return leaveRecords.filter((leave) => {
      const status = normalize(getLeaveStatus(leave));
      return status === "pending" || status === "requested" || status === "open";
    });
  }, [leaveRecords]);

  const leaveHistory = useMemo(() => {
    return [...leaveRecords].sort((a, b) => {
      const dateA = new Date(getLeaveFromDate(a) || a?.createdAt || a?.created_at);
      const dateB = new Date(getLeaveFromDate(b) || b?.createdAt || b?.created_at);

      if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
        return 0;
      }

      return dateB.getTime() - dateA.getTime();
    });
  }, [leaveRecords]);

  const stats = useMemo(() => {
    const attendanceUserIds = new Set(
      attendanceRecords
        .map((record) => getAttendanceUserId(record))
        .filter(Boolean)
    );

    const appLoginUserIds = new Set(
      appLoginRecords
        .map((record) => getAttendanceUserId(record))
        .filter(Boolean)
    );

    return {
      employeesAttendance: attendanceUserIds.size || employeeReports.length,
      appLoginEmployees: appLoginUserIds.size || appLoginReports.length,
      pendingLeave: pendingLeaves.length,
      leaveHistory: leaveHistory.length,
    };
  }, [
    attendanceRecords,
    appLoginRecords,
    employeeReports,
    appLoginReports,
    pendingLeaves,
    leaveHistory,
  ]);

  const selectedEmployeeRows = useMemo(() => {
    if (!selectedEmployee?.id) return [];

    const employeeId = selectedEmployee.id;

    const attendanceRows = attendanceRecords
      .filter((record) => getAttendanceUserId(record) === employeeId)
      .map((record, index) => ({
        id: `attendance-${record?.id || index}`,
        date: getRecordDate(record),
        checkIn: getCheckIn(record),
        checkOut: getCheckOut(record),
        totalHours: getTotalHours(record),
      }));

    const appLoginRows = appLoginRecords
      .filter((record) => getAttendanceUserId(record) === employeeId)
      .map((record, index) => ({
        id: `app-login-${record?.id || index}`,
        date: getRecordDate(record),
        checkIn: getCheckIn(record),
        checkOut: getCheckOut(record),
        totalHours: 0,
      }));

    return [...attendanceRows, ...appLoginRows].sort((a, b) => {
      const dateA = new Date(a.date || a.checkIn);
      const dateB = new Date(b.date || b.checkIn);

      if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
        return 0;
      }

      return dateB.getTime() - dateA.getTime();
    });
  }, [selectedEmployee, attendanceRecords, appLoginRecords]);

  const openFullAttendance = (employee) => {
    setSelectedEmployee(employee);
  };

  const closeFullAttendance = () => {
    setSelectedEmployee(null);
  };

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section>
          <h1 className="text-3xl font-black sm:text-4xl">
            Attendance Management
          </h1>

          <p className="muted mt-1">
            Monitor employee attendance, app login activity, leave requests, and
            work-hour records.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            active={activeCard === "attendance"}
            onClick={() => setActiveCard("attendance")}
            icon={UserCheck}
            iconClass="bg-orange-50 text-valencia-orange"
            label="Employees Attendance"
            value={stats.employeesAttendance}
          />

          <DashboardCard
            active={activeCard === "app-login"}
            onClick={() => setActiveCard("app-login")}
            icon={LogIn}
            iconClass="bg-blue-50 text-blue-700"
            label="App Login Employees"
            value={stats.appLoginEmployees}
          />

          <DashboardCard
            active={activeCard === "pending-leave"}
            onClick={() => setActiveCard("pending-leave")}
            icon={CalendarDays}
            iconClass="bg-amber-50 text-amber-700"
            label="Pending Leave"
            value={stats.pendingLeave}
          />

          <DashboardCard
            active={activeCard === "leave-history"}
            onClick={() => setActiveCard("leave-history")}
            icon={Clock3}
            iconClass="bg-emerald-50 text-emerald-700"
            label="Leave History"
            value={stats.leaveHistory}
          />
        </section>

        {activeCard === "attendance" ? (
          <AttendanceReports
            search={search}
            setSearch={setSearch}
            employees={filteredEmployeeReports}
            loading={loading}
            onOpenFullAttendance={openFullAttendance}
          />
        ) : null}

        {activeCard === "app-login" ? (
          <AppLoginReports
            search={search}
            setSearch={setSearch}
            employees={filteredAppLoginReports}
            loading={loading}
          />
        ) : null}

        {activeCard === "pending-leave" ? (
          <LeaveTable
            title="Pending Leave"
            subtitle="Pending leave requests from employees."
            leaves={pendingLeaves}
            users={users}
            emptyText="No pending leave requests found."
          />
        ) : null}

        {activeCard === "leave-history" ? (
          <LeaveTable
            title="Leave History"
            subtitle="All leave requests and their current status."
            leaves={leaveHistory}
            users={users}
            emptyText="No leave history found."
          />
        ) : null}

        {loading ? (
          <div className="fixed bottom-5 right-5 rounded-full bg-valencia-navy px-4 py-2 text-sm font-black text-white shadow-lift">
            Loading attendance...
          </div>
        ) : null}
      </div>

      {selectedEmployee ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-valencia-line bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-valencia-line p-5">
              <div>
                <h2 className="text-2xl font-black text-valencia-navy">
                  Full Attendance
                </h2>

                <p className="mt-1 text-sm font-semibold text-valencia-muted">
                  {selectedEmployee.name} • {selectedEmployee.email}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFullAttendance}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-valencia-line bg-white text-valencia-navy transition hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-valencia-line bg-slate-50 text-xs uppercase tracking-[0.12em] text-valencia-muted">
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Check In</th>
                    <th className="px-4 py-4">Check Out</th>
                    <th className="px-4 py-4">Hours</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedEmployeeRows.map((record, index) => (
                    <tr
                      key={`${record.id}-${index}`}
                      className="border-b border-valencia-line"
                    >
                      <td className="px-4 py-4 font-black text-valencia-navy">
                        {formatDate(record.date || record.checkIn)}
                      </td>

                      <td className="px-4 py-4 font-semibold text-valencia-muted">
                        {formatTime(record.checkIn)}
                      </td>

                      <td className="px-4 py-4 font-semibold text-valencia-muted">
                        {formatTime(record.checkOut)}
                      </td>

                      <td className="px-4 py-4 font-black text-valencia-navy">
                        {formatHours(record.totalHours)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!selectedEmployeeRows.length ? (
                <div className="p-10 text-center text-sm font-semibold text-valencia-muted">
                  No attendance records found for this employee.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function DashboardCard({ active, onClick, icon: Icon, iconClass, label, value }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card p-5 text-left transition ${
        active
          ? "border-valencia-orange ring-1 ring-valencia-orange"
          : "hover:border-valencia-orange"
      }`}
    >
      <div
        className={`mb-5 flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon size={20} />
      </div>

      <p className="text-xs font-black uppercase tracking-[0.12em] text-valencia-muted">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-valencia-navy">{value}</p>
    </button>
  );
}

function SearchBox({ search, setSearch }) {
  return (
    <div className="relative mt-4">
      <Search
        size={19}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-valencia-muted"
      />

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search employee or email..."
        className="h-12 w-full rounded-md border border-valencia-line bg-white pl-11 pr-4 text-sm font-semibold text-valencia-navy outline-none transition placeholder:text-slate-400 focus:border-valencia-orange focus:ring-2 focus:ring-orange-100"
      />
    </div>
  );
}

function AttendanceReports({
  search,
  setSearch,
  employees,
  loading,
  onOpenFullAttendance,
}) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-valencia-line p-5">
        <h2 className="text-2xl font-black text-valencia-navy">
          Attendance Reports
        </h2>

        <p className="muted mt-1 text-sm">
          Every employee is shown here. Click View Full Attendance to see
          day-wise records.
        </p>

        <SearchBox search={search} setSearch={setSearch} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-valencia-line bg-slate-50 text-xs uppercase tracking-[0.12em] text-valencia-muted">
              <th className="px-4 py-4">Employee</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Days Attended</th>
              <th className="px-4 py-4">Total Hours</th>
              <th className="px-4 py-4">Last Activity</th>
              <th className="px-4 py-4">Action</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id || employee.email}
                className="border-b border-valencia-line transition hover:bg-orange-50/30"
              >
                <td className="px-4 py-4">
                  <p className="font-black text-valencia-navy">
                    {employee.name}
                  </p>
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {employee.email}
                </td>

                <td className="px-4 py-4 font-black text-valencia-navy">
                  {employee.daysAttended}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {formatHours(employee.totalHours)}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {employee.lastActivity
                    ? formatDateTime(employee.lastActivity)
                    : "-"}
                </td>

                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onOpenFullAttendance(employee)}
                    className="text-sm font-black text-valencia-orange transition hover:text-valencia-orangeDark"
                  >
                    View Full Attendance
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!employees.length ? (
          <div className="p-8 text-center text-sm font-semibold text-valencia-muted">
            {loading ? "Loading attendance reports..." : "No employees found."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AppLoginReports({ search, setSearch, employees, loading }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-valencia-line p-5">
        <h2 className="text-2xl font-black text-valencia-navy">
          App Login Employees
        </h2>

        <p className="muted mt-1 text-sm">
          Employees who have app login activity.
        </p>

        <SearchBox search={search} setSearch={setSearch} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-valencia-line bg-slate-50 text-xs uppercase tracking-[0.12em] text-valencia-muted">
              <th className="px-4 py-4">Employee</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Login Days</th>
              <th className="px-4 py-4">Login Records</th>
              <th className="px-4 py-4">Last Login</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id || employee.email}
                className="border-b border-valencia-line transition hover:bg-orange-50/30"
              >
                <td className="px-4 py-4 font-black text-valencia-navy">
                  {employee.name}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {employee.email}
                </td>

                <td className="px-4 py-4 font-black text-valencia-navy">
                  {employee.loginDays}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {employee.loginRecords}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {employee.lastLogin ? formatDateTime(employee.lastLogin) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!employees.length ? (
          <div className="p-8 text-center text-sm font-semibold text-valencia-muted">
            {loading ? "Loading app login records..." : "No app login data found."}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function LeaveTable({ title, subtitle, leaves, users, emptyText }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-valencia-line p-5">
        <h2 className="text-2xl font-black text-valencia-navy">{title}</h2>

        <p className="muted mt-1 text-sm">{subtitle}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-valencia-line bg-slate-50 text-xs uppercase tracking-[0.12em] text-valencia-muted">
              <th className="px-4 py-4">Employee</th>
              <th className="px-4 py-4">Email</th>
              <th className="px-4 py-4">Leave Type</th>
              <th className="px-4 py-4">From</th>
              <th className="px-4 py-4">To</th>
              <th className="px-4 py-4">Reason</th>
              <th className="px-4 py-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {leaves.map((leave, index) => (
              <tr
                key={leave?.id || leave?.leaveId || index}
                className="border-b border-valencia-line transition hover:bg-orange-50/30"
              >
                <td className="px-4 py-4 font-black text-valencia-navy">
                  {getLeaveEmployeeName(leave, users)}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {getLeaveEmployeeEmail(leave, users)}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {getLeaveType(leave)}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {formatDate(getLeaveFromDate(leave))}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {formatDate(getLeaveToDate(leave))}
                </td>

                <td className="px-4 py-4 font-semibold text-valencia-muted">
                  {getLeaveReason(leave)}
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getStatusClass(
                      getLeaveStatus(leave)
                    )}`}
                  >
                    {formatStatus(getLeaveStatus(leave))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!leaves.length ? (
          <div className="p-8 text-center text-sm font-semibold text-valencia-muted">
            {emptyText}
          </div>
        ) : null}
      </div>
    </section>
  );
}