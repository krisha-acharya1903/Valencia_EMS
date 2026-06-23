import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CloudUpload,
  FolderKanban,
  Grid2X2,
  LogOut,
  MessageCircle,
  Minus,
  Moon,
  Search,
  Umbrella,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAttendanceForUser } from "../services/attendanceService";
import { getLeaveRequests } from "../services/leaveService";

const API_BASE = "http://localhost:5000/api";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRole(role) {
  return String(role || "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .toLowerCase();
}

function normalizeId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function getToken() {
  return (
    sessionStorage.getItem("valencia_auth_token") ||
    localStorage.getItem("valencia_auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function getInitials(profile) {
  const name =
    profile?.name ||
    profile?.fullName ||
    profile?.username ||
    profile?.email ||
    "Employee Name";

  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function parseDate(value) {
  if (!value) return null;

  const safeValue = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T");

  const date = new Date(safeValue);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function formatTime(value) {
  const date = parseDate(value);

  if (!date) return "--:-- --";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateLong(value) {
  const date = parseDate(value || todayKey());

  if (!date) return "Jun 17, 2026";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatDateShort(value) {
  const date = parseDate(value);

  if (!date) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeAttendance(item) {
  if (!item) return null;

  return {
    ...item,
    id: normalizeId(item.id),
    date: item.date || "",
    type: item.type || item.status || "",
    checkIn:
      item.checkIn ||
      item.check_in ||
      item.clockIn ||
      item.clock_in ||
      (String(item.type || "").toLowerCase().includes("check in")
        ? item.createdAt || item.created_at
        : ""),
    checkOut:
      item.checkOut ||
      item.check_out ||
      item.clockOut ||
      item.clock_out ||
      (String(item.type || "").toLowerCase().includes("check out")
        ? item.createdAt || item.created_at
        : ""),
    createdAt: item.createdAt || item.created_at || "",
  };
}

function normalizeLeave(item) {
  return {
    ...item,
    id: normalizeId(item.id || item.leaveId || item.leave_id),
    type:
      item.leaveType ||
      item.leave_type ||
      item.type ||
      item.title ||
      "Leave",
    status: String(item.status || "pending").toLowerCase(),
    reason: item.reason || "",
    startDate: item.startDate || item.start_date || item.fromDate || "",
    endDate: item.endDate || item.end_date || item.toDate || "",
  };
}

function formatLeaveDateRange(leave) {
  const startDate =
    leave.startDate || leave.start_date || leave.fromDate || leave.from_date;
  const endDate =
    leave.endDate || leave.end_date || leave.toDate || leave.to_date;

  if (!startDate && !endDate) return "Date not available";

  if (startDate && endDate && startDate !== endDate) {
    return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
  }

  return formatDateShort(startDate || endDate);
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "approved") {
    return "border-[#b8f0df] bg-[#ddfff3] text-[#17bc8f]";
  }

  if (value === "rejected") {
    return "border-[#ffc6d6] bg-[#ffe7ef] text-[#ec5a85]";
  }

  return "border-[#ffe1a7] bg-[#fff3d6] text-[#e29b21]";
}

function formatStatus(status) {
  const value = String(status || "pending").toLowerCase();

  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
}

function getTodayAttendance(attendance) {
  const today = todayKey();

  const todayLogs = attendance.filter((item) => {
    const dateValue =
      item.date || item.createdAt || item.checkIn || item.checkOut;
    return String(dateValue || "").slice(0, 10) === today;
  });

  const checkInLog =
    todayLogs.find((item) => item.checkIn) ||
    todayLogs.find((item) =>
      String(item.type || "").toLowerCase().includes("check in")
    );

  const checkOutLog =
    todayLogs.find((item) => item.checkOut) ||
    todayLogs.find((item) =>
      String(item.type || "").toLowerCase().includes("check out")
    );

  return {
    checkIn: checkInLog?.checkIn || checkInLog?.createdAt || "",
    checkOut: checkOutLog?.checkOut || checkOutLog?.createdAt || "",
  };
}

function getWorkingDuration(checkInValue, checkOutValue) {
  const checkIn = parseDate(checkInValue);
  const checkOut = parseDate(checkOutValue) || new Date();

  if (!checkIn) {
    return {
      label: "4h 23m",
      since: "10:52AM",
    };
  }

  const diffMs = Math.max(0, checkOut.getTime() - checkIn.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    label: `${hours}h ${minutes}m`,
    since: formatTime(checkInValue).replace(" ", ""),
  };
}

function getWeekItems() {
  return [
    { day: "Mon", dateLabel: "Jun 15", type: "present", minutes: "8h 10min" },
    { day: "Tue", dateLabel: "Jun 16", type: "present", minutes: "8h 0min" },
    { day: "Wed", dateLabel: "Jun 17", type: "half", minutes: "Half Day" },
    { day: "Thu", dateLabel: "Jun 18", type: "present", minutes: "8h 30min" },
    { day: "Fri", dateLabel: "Jun 19", type: "leave", minutes: "Leave" },
    { day: "Sat", dateLabel: "Jun 18", type: "present", minutes: "8h 30min" },
    { day: "Mon", dateLabel: "Jun 22", type: "empty", minutes: "..." },
    { day: "Tue", dateLabel: "Jun 23", type: "empty", minutes: "..." },
  ].map((item, index) => ({
    ...item,
    id: `week-${index}`,
  }));
}

export default function AttendanceLeave() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();

  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [selectedDate, setSelectedDate] = useState("2026-06-17");
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");

  const [leaveForm, setLeaveForm] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const employeeName = profile?.name || profile?.fullName || "Employee Name";
  const employeeEmail = profile?.email || "emp_name@valencia.com";
  const role = normalizeRole(profile?.role);

  const isAdminLike =
    role === "admin" || role === "manager" || role === "superadmin";

  const load = async () => {
    if (!profile || isAdminLike) return;

    try {
      const [attendanceResult, leaveResult] = await Promise.allSettled([
        getAttendanceForUser(profile.uid || profile.id),
        getLeaveRequests(profile),
      ]);

      if (attendanceResult.status === "fulfilled") {
        const rawAttendance = attendanceResult.value;
        const list = Array.isArray(rawAttendance)
          ? rawAttendance
          : rawAttendance?.attendance || [];

        setAttendance(
          (Array.isArray(list) ? list : [])
            .map(normalizeAttendance)
            .filter(Boolean)
        );
      }

      if (leaveResult.status === "fulfilled") {
        setLeaves((leaveResult.value || []).map(normalizeLeave));
      }
    } catch (error) {
      toast.error(error.message || "Attendance failed to load.");
    }
  };

  useEffect(() => {
    load();
  }, [profile]);

  const todayAttendance = useMemo(() => {
    return getTodayAttendance(attendance);
  }, [attendance]);

  const workingDuration = useMemo(() => {
    return getWorkingDuration(todayAttendance.checkIn, todayAttendance.checkOut);
  }, [todayAttendance]);

  const weekItems = useMemo(() => {
    return getWeekItems();
  }, []);

  const sortedLeaves = useMemo(() => {
    return [...leaves].sort((a, b) => {
      const aDate = parseDate(a.startDate)?.getTime() || 0;
      const bDate = parseDate(b.startDate)?.getTime() || 0;
      return bDate - aDate;
    });
  }, [leaves]);

  const updateLeaveForm = (key, value) => {
    setLeaveForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const submitLeaveRequest = async (event) => {
    event.preventDefault();

    if (!leaveForm.leaveType.trim()) {
      toast.error("Please enter leave title/type.");
      return;
    }

    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast.error("Please select from and to dates.");
      return;
    }

    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) {
      toast.error("To date cannot be before from date.");
      return;
    }

    if (!leaveForm.reason.trim()) {
      toast.error("Please write reason for leave.");
      return;
    }

    try {
      setSubmittingLeave(true);

      const token = getToken();

      const response = await fetch(`${API_BASE}/leave-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          leaveType: leaveForm.leaveType,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          reason: attachmentName
            ? `${leaveForm.reason}\n\nAttachment: ${attachmentName}`
            : leaveForm.reason,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to submit leave request.");
      }

      toast.success("Leave request submitted.");

      setLeaveForm({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
      });
      setAttachmentName("");

      await load();
    } catch (error) {
      toast.error(error.message || "Failed to submit leave request.");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
    }

    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("profile");
    localStorage.removeItem("authUser");

    sessionStorage.removeItem("valencia_auth_token");
    sessionStorage.removeItem("valencia_auth_user");

    navigate("/login", { replace: true });
  };

  const checkInTime = todayAttendance.checkIn
    ? formatTime(todayAttendance.checkIn)
    : "10:52 AM";

  const checkOutTime =
    todayAttendance.checkIn && todayAttendance.checkOut
      ? formatTime(todayAttendance.checkOut)
      : "--:-- --";

  return (
    <div className="fixed inset-0 z-[999] min-h-screen overflow-auto bg-white text-[#151515]">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[247px] flex-col border-r border-[#eeeeee] bg-white">
        <div className="flex h-[66px] items-center justify-between border-b border-[#eeeeee] px-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <img
              src="/valencia_logo.png"
              alt=""
              className="h-8 w-8 object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />

            <span className="text-[16px] font-extrabold text-[#ff6b35]">
              Valencia Nutritions
            </span>
          </button>

          <button
            type="button"
            className="text-[#777777]"
            onClick={() => navigate("/dashboard")}
          >
            ‹
          </button>
        </div>

        <nav className="flex-1 px-2 py-8">
          <EmployeeNavItem
            icon={Grid2X2}
            label="Overview"
            onClick={() => navigate("/dashboard")}
          />
          <EmployeeNavItem
            icon={FolderKanban}
            label="Projects"
            onClick={() => navigate("/projects")}
          />
          <EmployeeNavItem active icon={CalendarDays} label="Attendance" />
          <EmployeeNavItem
            icon={MessageCircle}
            label="Chatbox"
            onClick={() => toast("Chatbox will be connected here.")}
          />
          <EmployeeNavItem
            icon={UserRound}
            label="Profile"
            onClick={() => navigate("/profile")}
          />
        </nav>

        <div className="px-2 pb-6">
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-[#fff7f2] px-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff6b35] text-sm font-extrabold text-white">
              {getInitials(profile) || "SA"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-[#151515]">
                {employeeName}
              </p>

              <p className="truncate text-[12px] text-[#7b7b7b]">
                {employeeEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-around">
            <button
              type="button"
              className="rounded-full p-2 text-[#151515] transition hover:bg-[#fff4ed] hover:text-[#ff6b35]"
              onClick={() => toast("Theme toggle kept here.")}
            >
              <Moon size={18} />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full p-2 text-[#151515] transition hover:bg-[#fff4ed] hover:text-[#ff6b35]"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen pl-[247px]">
        <div className="border-b border-[#eeeeee] bg-white">
          <div className="ml-[38px] flex h-[66px] max-w-[1068px] items-center gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ff6b35] text-white shadow-sm transition hover:bg-[#f2521a]"
              >
                <ArrowLeft size={19} />
              </button>

              <button
                type="button"
                onClick={() => navigate(1)}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-[#ff6b35] text-white shadow-sm transition hover:bg-[#f2521a]"
              >
                <ArrowRight size={19} />
              </button>
            </div>

            <div className="flex h-11 flex-1 items-center rounded-2xl border border-[#e7e7e7] px-5">
              <Search size={21} className="mr-4 text-[#777777]" />

              <input
                placeholder="Search projects, tasks, people...."
                className="h-full w-full bg-transparent text-[14px] font-medium text-[#151515] outline-none placeholder:text-[#b0b0b0]"
              />
            </div>
          </div>
        </div>

        <div className="ml-[38px] max-w-[1068px] py-5">
          <section className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[23px] font-semibold text-black">
                Attendance
              </h1>

              <p className="mt-1 text-[14px] font-medium text-[#777777]">
                Track your attendance, check-ins and leave status
              </p>
            </div>

            <label className="relative flex h-11 min-w-[152px] items-center gap-2 rounded-lg border border-[#ff6b35]/60 bg-white px-4 text-[13px] font-semibold text-black">
              <CalendarDays size={18} />

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value || "2026-06-17")
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />

              <span>{formatDateLong(selectedDate)}</span>
              <ChevronDown size={16} />
            </label>
          </section>

          <section className="mb-[18px] overflow-hidden rounded-xl border border-[#eeeeee] bg-[#fff8f1] shadow-[0_8px_28px_rgba(0,0,0,0.10)]">
            <div className="relative h-[188px] px-[30px]">
              <div className="absolute inset-x-0 bottom-0 h-[70px] bg-gradient-to-r from-[#fff4e7] via-[#ffece6] to-[#fff8f1]" />
              <div className="absolute bottom-0 left-[120px] h-[76px] w-[320px] rounded-t-[70%] bg-[#ffe9e2]/55" />

              <div className="relative z-10 grid h-full grid-cols-[220px_158px_280px_210px_150px] items-center gap-2">
                <div className="border-r border-[#eaded4] pr-5">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#13c779]" />
                    <span className="text-[14px] font-medium text-black">
                      Checked In Today
                    </span>
                  </div>

                  <p className="text-[34px] font-light leading-tight text-black">
                    {checkInTime}
                  </p>

                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-[12px] text-[#777777]">
                      {formatDateLong(selectedDate)}
                    </span>

                    <span className="rounded-full bg-[#c9f5df] px-3 py-1 text-[11px] font-bold text-[#22aa69]">
                      On Time
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[14px] font-medium text-[#777777]">
                    Working Time
                  </p>

                  <p className="text-[30px] font-semibold leading-tight text-[#ff6b35]">
                    {workingDuration.label}
                  </p>

                  <p className="text-[12px] text-[#777777]">
                    since {workingDuration.since}
                  </p>
                </div>

                <div className="flex justify-center">
                  <LaptopIllustration />
                </div>

                <div className="text-center">
                  <div className="mb-3 flex items-center justify-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#ff416f]" />
                    <span className="text-[14px] font-medium text-black">
                      Checked Out Today
                    </span>
                  </div>

                  <p className="text-[34px] font-light leading-tight tracking-[0.2em] text-[#777777]">
                    {checkOutTime}
                  </p>

                  <p className="text-[12px] text-[#777777]">
                    {formatDateLong(selectedDate)}
                  </p>
                </div>

                <AttendanceRing value={96} />
              </div>
            </div>
          </section>

          <section className="mb-[18px] rounded-xl border border-[#eeeeee] bg-white px-[32px] py-[24px] shadow-[0_8px_28px_rgba(0,0,0,0.10)]">
            <h2 className="mb-5 text-[30px] font-semibold text-black">
              This Week
            </h2>

            <div className="grid grid-cols-8 gap-4">
              {weekItems.map((item) => (
                <WeekDayCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[580px_472px]">
            <form
              onSubmit={submitLeaveRequest}
              className="rounded-xl border border-[#eeeeee] bg-white p-7 shadow-[0_8px_28px_rgba(0,0,0,0.10)]"
            >
              <h2 className="mb-5 text-[24px] font-semibold text-black">
                Apply for Leave
              </h2>

              <label className="mb-5 block">
                <span className="mb-2 block text-[12px] font-semibold text-[#777777]">
                  Leave Title/Type
                </span>

                <input
                  value={leaveForm.leaveType}
                  onChange={(event) =>
                    updateLeaveForm("leaveType", event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-[#eeeeee] px-4 text-[14px] outline-none transition focus:border-[#ff6b35]"
                />
              </label>

              <div className="mb-5 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold text-[#777777]">
                    From Date
                  </span>

                  <div className="relative">
                    <input
                      type="date"
                      value={leaveForm.startDate}
                      onChange={(event) =>
                        updateLeaveForm("startDate", event.target.value)
                      }
                      className="h-11 w-full rounded-lg border border-[#eeeeee] px-4 text-[13px] text-[#999999] outline-none transition focus:border-[#ff6b35]"
                    />

                    <CalendarDays
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#bbbbbb]"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold text-[#777777]">
                    To Date
                  </span>

                  <div className="relative">
                    <input
                      type="date"
                      value={leaveForm.endDate}
                      onChange={(event) =>
                        updateLeaveForm("endDate", event.target.value)
                      }
                      className="h-11 w-full rounded-lg border border-[#eeeeee] px-4 text-[13px] text-[#999999] outline-none transition focus:border-[#ff6b35]"
                    />

                    <CalendarDays
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#bbbbbb]"
                    />
                  </div>
                </label>
              </div>

              <label className="mb-5 block">
                <span className="mb-2 block text-[12px] font-semibold text-[#777777]">
                  Reason for Leave
                </span>

                <div className="relative">
                  <textarea
                    value={leaveForm.reason}
                    maxLength={250}
                    onChange={(event) =>
                      updateLeaveForm("reason", event.target.value)
                    }
                    placeholder="Write the reason for your leave..."
                    rows={5}
                    className="w-full resize-none rounded-lg border border-[#eeeeee] px-4 py-3 text-[14px] outline-none transition placeholder:text-[#bbbbbb] focus:border-[#ff6b35]"
                  />

                  <span className="absolute bottom-3 right-4 text-[12px] text-[#999999]">
                    {leaveForm.reason.length}/250
                  </span>
                </div>
              </label>

              <label className="mb-5 block">
                <span className="mb-2 block text-[12px] font-semibold text-[#777777]">
                  Add Attachment (Optional)
                </span>

                <div className="relative flex min-h-[74px] cursor-pointer flex-col items-center justify-center rounded-lg border border-[#eeeeee] bg-[#fafafa] px-4 text-center transition hover:border-[#ff6b35]">
                  <input
                    type="file"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setAttachmentName(file?.name || "");
                    }}
                  />

                  <div className="flex items-center gap-2 text-[13px] font-medium text-[#777777]">
                    <CloudUpload size={17} />
                    <span>
                      {attachmentName ? (
                        attachmentName
                      ) : (
                        <>
                          Drag and drop your file here, or{" "}
                          <span className="text-[#ff6b35]">browse</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] text-[#999999]">
                    Supports: PDF, JPG, PNG (Max. 5MB)
                  </p>
                </div>
              </label>

              <button
                type="submit"
                disabled={submittingLeave}
                className="h-11 w-full rounded-full bg-[#ff6b35] text-[14px] font-semibold text-white shadow-[0_8px_14px_rgba(255,107,53,0.25)] transition hover:bg-[#f2521a] disabled:opacity-60"
              >
                {submittingLeave ? "Submitting..." : "Submit Request"}
              </button>
            </form>

            <section className="rounded-xl border border-[#eeeeee] bg-white p-7 shadow-[0_8px_28px_rgba(0,0,0,0.10)]">
              <h2 className="mb-5 text-[24px] font-semibold text-black">
                Leave History
              </h2>

              <div className="space-y-3">
                {sortedLeaves.length ? (
                  sortedLeaves.map((leave) => (
                    <LeaveHistoryCard key={leave.id} leave={leave} />
                  ))
                ) : (
                  <>
                    <LeaveHistoryCard
                      leave={{
                        id: "fallback-sick",
                        type: "Sick Leave",
                        status: "approved",
                        startDate: "2026-06-19",
                        endDate: "2026-06-19",
                      }}
                    />

                    <LeaveHistoryCard
                      leave={{
                        id: "fallback-casual",
                        type: "Casual Leave",
                        status: "approved",
                        startDate: "2026-05-18",
                        endDate: "2026-05-20",
                      }}
                    />

                    <LeaveHistoryCard
                      leave={{
                        id: "fallback-rejected",
                        type: "Casual Leave",
                        status: "rejected",
                        startDate: "2026-04-01",
                        endDate: "2026-04-01",
                      }}
                    />
                  </>
                )}
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

function EmployeeNavItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2 flex w-full items-center gap-4 rounded-md px-4 py-3 text-left text-[15px] font-semibold transition ${
        active
          ? "bg-[#ff6b35] text-white"
          : "text-black hover:bg-[#fff4ef] hover:text-[#ff6b35]"
      }`}
    >
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}

function AttendanceRing({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div
      className="relative flex h-[145px] w-[145px] items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(#ff4a0a ${
          safeValue * 3.6
        }deg, #e7e7e7 0deg)`,
      }}
    >
      <div className="flex h-[110px] w-[110px] flex-col items-center justify-center rounded-full bg-[#fff8f1]">
        <p className="text-[38px] font-semibold leading-none text-black">
          {safeValue}%
        </p>

        <p className="mt-1 text-center text-[15px] leading-tight text-[#777777]">
          Attendance
          <br />
          this month
        </p>
      </div>
    </div>
  );
}

function LaptopIllustration() {
  return (
    <div className="relative h-[136px] w-[242px]">
      <div className="absolute left-[70px] top-[4px] h-[78px] w-[118px] rotate-[-7deg] rounded-md border-[5px] border-[#222222] bg-white shadow-sm">
        <div className="h-full w-full bg-[linear-gradient(135deg,#f7f7f7_25%,transparent_25%,transparent_50%,#f7f7f7_50%,#f7f7f7_75%,transparent_75%)] bg-[length:15px_15px]" />
      </div>

      <div className="absolute left-[60px] top-[82px] h-[13px] w-[140px] rotate-[-7deg] rounded-b-md bg-[#222222]" />

      <div className="absolute left-[92px] top-[79px] h-[57px] w-[17px] rotate-[8deg] rounded-full bg-[#f3aa73]" />
      <div className="absolute left-[116px] top-[74px] h-[63px] w-[17px] rotate-[4deg] rounded-full bg-[#f3aa73]" />
      <div className="absolute left-[140px] top-[74px] h-[63px] w-[17px] rotate-[-3deg] rounded-full bg-[#f3aa73]" />
      <div className="absolute left-[164px] top-[79px] h-[56px] w-[17px] rotate-[-10deg] rounded-full bg-[#f3aa73]" />

      <div className="absolute right-[32px] top-[69px] h-[45px] w-[45px] rounded-full bg-[#7a3d19] shadow-sm" />
      <div className="absolute right-[27px] top-[58px] h-3 w-3 rounded-full bg-[#2ca5df]" />

      <div className="absolute right-[6px] top-[91px] h-[55px] w-[46px] rotate-[-10deg] rounded-md border border-[#7fb7dc] bg-[#effaff]" />
      <div className="absolute right-[18px] top-[104px] h-[3px] w-[24px] rotate-[-10deg] rounded bg-[#ff6b35]" />
      <div className="absolute right-[16px] top-[118px] h-[3px] w-[28px] rotate-[-10deg] rounded bg-[#65bfe9]" />

      <div className="absolute left-[12px] top-[88px] h-[1px] w-[58px] bg-[#f4d6c8]" />
      <div className="absolute left-[65px] top-[85px] h-2 w-2 rounded-full bg-[#ff6b35]" />
    </div>
  );
}

function WeekDayCard({ item }) {
  const isPresent = item.type === "present";
  const isHalf = item.type === "half";
  const isLeave = item.type === "leave";

  return (
    <div className="flex flex-col items-center">
      <p className="text-[16px] font-semibold text-black">{item.day}</p>

      <p className="mt-1 text-[13px] text-[#777777]">{item.dateLabel}</p>

      <div
        className={`mt-3 flex h-10 w-10 items-center justify-center rounded-full ${
          isPresent
            ? "bg-[#c9f8e5] text-[#18c786]"
            : isHalf
            ? "bg-[#ffe2b3] text-[#e9a13c]"
            : isLeave
            ? "bg-[#e9c8ff] text-[#b14de9]"
            : "bg-[#eeeeee] text-[#b5b5b5]"
        }`}
      >
        {isPresent ? (
          <Check size={22} strokeWidth={3} />
        ) : isHalf ? (
          <span className="h-7 w-3 rounded-l-full bg-[#f7af56]" />
        ) : isLeave ? (
          <Umbrella size={21} />
        ) : (
          <Minus size={21} />
        )}
      </div>

      <p
        className={`mt-2 text-[12px] font-semibold ${
          isPresent
            ? "text-[#18c786]"
            : isHalf
            ? "text-[#e9a13c]"
            : isLeave
            ? "text-[#b14de9]"
            : "text-[#b5b5b5]"
        }`}
      >
        {item.minutes}
      </p>
    </div>
  );
}

function LeaveHistoryCard({ leave }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#eeeeee] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff8f1] text-[22px]">
          {String(leave.type || "").toLowerCase().includes("sick") ? "🤒" : "🏖️"}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-black">
            {leave.type || "Leave"}
          </p>

          <p className="mt-0.5 truncate text-[12px] text-[#999999]">
            {formatLeaveDateRange(leave)}
          </p>
        </div>
      </div>

      <span
        className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-semibold ${getStatusClass(
          leave.status
        )}`}
      >
        {String(leave.status || "").toLowerCase() === "rejected" ? (
          <X size={13} />
        ) : (
          <Check size={13} />
        )}
        {formatStatus(leave.status)}
      </span>
    </div>
  );
}