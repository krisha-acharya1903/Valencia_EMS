import {
  CalendarDays,
  Check,
  ChevronDown,
  CloudUpload,
  Download,
  Loader2,
  Minus,
  PartyPopper,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getMyAttendanceSummary } from "../services/attendanceService";
import {
  createLeaveRequest,
  downloadLeaveAttachment,
  getLeaveRequests,
} from "../services/leaveService";

const ORANGE = "#FF6B35";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getTodayInputDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatAttendancePickerDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateForHistory(value) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(value) {
  const clean = String(value || "pending").toLowerCase();

  if (clean === "approved") return "Approved";
  if (clean === "rejected") return "Rejected";
  if (clean === "pending") return "Pending";

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function getLeaveTypeIcon(type = "") {
  const clean = String(type).toLowerCase();

  if (clean.includes("sick")) return "🤒";
  if (clean.includes("casual")) return "🏖️";
  if (clean.includes("emergency")) return "🚨";

  return "📝";
}

function getDateRangeLabel(startDate, endDate) {
  const from = formatDateForHistory(startDate);
  const to = formatDateForHistory(endDate);

  if (!from && !to) return "-";
  if (from === to || !to) return from;

  return `${from} - ${to}`;
}

function formatFileSize(bytes = 0) {
  const value = Number(bytes || 0);

  if (!value) return "";

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function DateInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-semibold text-[#777486]">
        {label}
      </label>

      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-[#dedede] bg-white px-3 text-[13px] font-medium text-black outline-none transition focus:border-[#FF6B35]"
      />
    </div>
  );
}

function AttendanceRing({ value = 0 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div
      className="relative flex h-[156px] w-[156px] items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${ORANGE} ${safeValue * 3.6}deg, #eee 0deg)`,
      }}
    >
      <div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full bg-[#fff7ef]">
        <p className="text-[42px] font-black leading-none text-black">
          {safeValue}%
        </p>

        <p className="mt-1 text-center text-[14px] font-semibold leading-tight text-[#6b6170]">
          Attendance
          <br />
          this month
        </p>
      </div>
    </div>
  );
}

function WorkIllustration() {
  return (
    <div className="relative h-[150px] w-[260px] overflow-hidden">
      <div className="absolute left-[82px] top-[16px] h-[86px] w-[122px] rotate-[-7deg] rounded-lg bg-[#2a2d33] p-[7px] shadow-lg">
        <div className="h-full w-full rounded bg-white">
          <div
            className="h-full w-full opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(#d7d7d7 1px, transparent 1px), linear-gradient(90deg, #d7d7d7 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
        </div>
      </div>

      <div className="absolute left-[84px] top-[94px] h-[13px] w-[125px] rotate-[-7deg] rounded-b-lg bg-[#2a2d33]" />

      <div className="absolute left-[72px] top-[83px] h-[63px] w-[28px] rotate-[10deg] rounded-full bg-[#efad7f]" />
      <div className="absolute left-[112px] top-[80px] h-[70px] w-[28px] rotate-[-4deg] rounded-full bg-[#efad7f]" />

      <div className="absolute right-[30px] top-[68px] h-[46px] w-[46px] rounded-full bg-[#8b5b2e] shadow-md">
        <div className="absolute -right-2 top-0 h-3 w-3 rounded-full bg-[#45a8db]" />
        <div className="absolute inset-2 rounded-full border border-[#b9824b]" />
      </div>

      <div className="absolute right-[8px] top-[105px] h-[60px] w-[80px] rotate-[-10deg] rounded bg-[#e9f5ff] shadow-sm">
        <div className="absolute left-3 top-3 h-[35px] w-[55px] rounded border border-[#8ac1e8]" />
      </div>

      <div className="absolute left-[8px] bottom-0 h-[40px] w-[244px] rounded-[50%] bg-[#ffe8dd]" />
    </div>
  );
}

function WeekStatusIcon({ status }) {
  if (status === "present") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#bdf2d7] text-[#12b76a]">
        <Check size={20} strokeWidth={3} />
      </div>
    );
  }

  if (status === "late") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffe4b9] text-[#ffb24d]">
        <span className="text-[12px] font-black">L</span>
      </div>
    );
  }

  if (status === "leave") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#efccff] text-[#ba5ce8]">
        <PartyPopper size={19} />
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1c2] text-[#d99800]">
        <span className="text-[12px] font-black">P</span>
      </div>
    );
  }

  if (status === "absent") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffe1e7] text-[#ff5d7d]">
        <X size={18} strokeWidth={3} />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eeeeee] text-[#c4c4c4]">
      <Minus size={20} strokeWidth={3} />
    </div>
  );
}

function getWeekTextColor(status) {
  if (status === "present") return "text-[#12b76a]";
  if (status === "late") return "text-[#ffb24d]";
  if (status === "leave") return "text-[#ba5ce8]";
  if (status === "pending") return "text-[#d99800]";
  if (status === "absent") return "text-[#ff5d7d]";

  return "text-[#b8b8b8]";
}

function LeaveHistoryIcon({ type }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fffaf2] text-[24px]">
      {getLeaveTypeIcon(type)}
    </div>
  );
}

function LeaveStatusBadge({ status }) {
  const clean = String(status || "pending").toLowerCase();

  const className =
    clean === "approved"
      ? "border-[#a8efd8] bg-[#ddfff2] text-[#20c997]"
      : clean === "rejected"
      ? "border-[#ffc6d2] bg-[#fff0f4] text-[#ff5d7d]"
      : "border-[#ffe1a6] bg-[#fff8df] text-[#d99800]";

  return (
    <div
      className={`flex h-8 items-center gap-2 rounded-full border px-4 text-[12px] font-bold ${className}`}
    >
      {clean === "approved" ? (
        <Check size={14} />
      ) : clean === "rejected" ? (
        <X size={14} />
      ) : (
        <Minus size={14} />
      )}
      {formatStatus(clean)}
    </div>
  );
}

export default function UserAttendanceDetail() {
  const hiddenDateInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(getTodayInputDate());
  const [attendanceData, setAttendanceData] = useState(null);
  const [history, setHistory] = useState([]);

  const [form, setForm] = useState({
    title: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reasonLength = useMemo(() => form.reason.length, [form.reason]);

  const today = attendanceData?.today || {};
  const month = attendanceData?.month || {};
  const weekDays = attendanceData?.week?.days || [];

  async function loadPageData(date = selectedDate) {
    setLoading(true);

    try {
      const [attendanceResponse, leaveResponse] = await Promise.all([
        getMyAttendanceSummary(date),
        getLeaveRequests(),
      ]);

      setAttendanceData(attendanceResponse || null);
      setHistory(Array.isArray(leaveResponse) ? leaveResponse : []);
    } catch (error) {
      console.error("Attendance page load error:", error);
      toast.error(error?.message || "Failed to load attendance.");
      setAttendanceData(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPageData(selectedDate);
  }, [selectedDate]);

  function openDatePicker() {
    if (hiddenDateInputRef.current?.showPicker) {
      hiddenDateInputRef.current.showPicker();
    } else {
      hiddenDateInputRef.current?.click();
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      title: "",
      fromDate: "",
      toDate: "",
      reason: "",
    });

    setAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function validateAndSetFile(file) {
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      toast.error("Unsupported file type. Upload PDF, JPG, PNG, DOC or DOCX.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Attachment must be 5MB or smaller.");
      return;
    }

    setAttachment(file);
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    validateAndSetFile(file);
  }

  function removeAttachment() {
    setAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Please enter leave title/type.");
      return;
    }

    if (!form.fromDate || !form.toDate) {
      toast.error("Please select from and to dates.");
      return;
    }

    if (new Date(form.toDate) < new Date(form.fromDate)) {
      toast.error("To date cannot be before from date.");
      return;
    }

    if (!form.reason.trim()) {
      toast.error("Please enter reason for leave.");
      return;
    }

    setSubmitting(true);

    try {
      await createLeaveRequest(
        {
          leaveType: form.title.trim(),
          startDate: form.fromDate,
          endDate: form.toDate,
          reason: form.reason.trim(),
        },
        attachment
      );

      toast.success("Leave request submitted as pending.");
      resetForm();
      await loadPageData(selectedDate);
    } catch (error) {
      console.error("Leave submit error:", error);
      toast.error(error?.message || "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadAttachment(leave) {
    try {
      await downloadLeaveAttachment(
        leave.id || leave.leaveId,
        leave.attachmentOriginalName || leave.attachmentFilename || "leave-attachment"
      );
    } catch (error) {
      console.error("Download attachment error:", error);
      toast.error(error?.message || "Failed to download attachment.");
    }
  }

  return (
    <div className="min-h-screen bg-white px-9 py-6 text-black">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-black leading-tight text-black">
            Attendance
          </h1>
          <p className="mt-2 text-[14px] font-medium text-[#777486]">
            Track your attendance, check-ins and leave status
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={openDatePicker}
            className="flex h-11 items-center gap-3 rounded-lg border border-[#ffb199] bg-white px-4 text-[14px] font-semibold text-black transition hover:bg-orange-50"
          >
            <CalendarDays size={18} />
            <span>{formatAttendancePickerDate(selectedDate)}</span>
            <ChevronDown size={17} />
          </button>

          <input
            ref={hiddenDateInputRef}
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="absolute left-0 top-0 h-0 w-0 opacity-0"
            tabIndex={-1}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-[#e8e8e8] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 text-[14px] font-bold text-[#777486]">
            <Loader2 size={18} className="animate-spin text-[#FF6B35]" />
            Loading real attendance data...
          </div>
        </div>
      ) : (
        <>
          <section className="mb-5 overflow-hidden rounded-xl border border-[#f0e7dd] bg-[#fff8ef] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <div className="grid min-h-[188px] grid-cols-[1.15fr_1fr_1.25fr_1fr_0.95fr] items-center px-8 max-xl:grid-cols-2 max-xl:gap-6 max-md:grid-cols-1 max-md:py-6">
              <div className="border-r border-[#eadfda] max-xl:border-r-0">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      today.rawCheckIn ? "bg-[#20c56b]" : "bg-[#c4c4c4]"
                    }`}
                  />
                  <p className="text-[14px] font-semibold text-black">
                    Checked In Today
                  </p>
                </div>

                <p className="text-[42px] font-light leading-none text-black">
                  {today.checkIn || "--:--"}
                </p>

                <div className="mt-3 flex items-center gap-4">
                  <p className="text-[12px] text-[#8c8390]">
                    {formatMonthDate(today.date)}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      today.status === "late"
                        ? "bg-[#fff1d9] text-[#ff9f1c]"
                        : today.rawCheckIn
                        ? "bg-[#baf2d7] text-[#12b76a]"
                        : "bg-[#eeeeee] text-[#8c8390]"
                    }`}
                  >
                    {today.status === "late"
                      ? "Late"
                      : today.rawCheckIn
                      ? "On Time"
                      : "No Check In"}
                  </span>
                </div>
              </div>

              <div className="px-12 max-xl:px-0">
                <p className="text-[15px] font-medium text-[#8c8390]">
                  Working Time
                </p>
                <p className="mt-1 text-[34px] font-black leading-none text-[#FF6B35]">
                  {today.label && today.label !== "..." ? today.label : "0m"}
                </p>
                <p className="mt-2 text-[13px] text-[#8c8390]">
                  {today.rawCheckIn ? `since ${today.checkIn}` : "No check-in today"}
                </p>
              </div>

              <div className="flex justify-center">
                <WorkIllustration />
              </div>

              <div className="px-6 max-xl:px-0">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      today.rawCheckOut ? "bg-[#ff4770]" : "bg-[#c4c4c4]"
                    }`}
                  />
                  <p className="text-[14px] font-semibold text-black">
                    Checked Out Today
                  </p>
                </div>

                <p className="text-[34px] font-black tracking-[0.2em] text-[#8c8390]">
                  {today.checkOut || "--:--"}
                </p>

                <p className="mt-3 text-[12px] text-[#8c8390]">
                  {formatMonthDate(today.date)}
                </p>
              </div>

              <div className="flex justify-end max-xl:justify-start">
                <AttendanceRing value={month.attendancePercent || month.percentage || 0} />
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-xl border border-[#e8e8e8] bg-white px-8 py-7 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[32px] font-black leading-none text-black">
                  This Week
                </h2>
                <p className="mt-2 text-[13px] font-semibold text-[#777486]">
                  Current week from real attendance records
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-black max-md:hidden">
                <div className="rounded-lg bg-[#e9fff4] px-3 py-2 text-[#12b76a]">
                  Present: {month.present || 0}
                </div>
                <div className="rounded-lg bg-[#fff4df] px-3 py-2 text-[#ff9f1c]">
                  Late: {month.late || 0}
                </div>
                <div className="rounded-lg bg-[#f5e7ff] px-3 py-2 text-[#ba5ce8]">
                  Leave: {month.leave || 0}
                </div>
                <div className="rounded-lg bg-[#fff8df] px-3 py-2 text-[#d99800]">
                  Pending: {month.pending || 0}
                </div>
                <div className="rounded-lg bg-[#fff0f4] px-3 py-2 text-[#ff5d7d]">
                  Absent: {month.absent || 0}
                </div>
              </div>
            </div>

            {weekDays.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#dedede] px-5 py-10 text-center text-[14px] font-bold text-[#777486]">
                No attendance data available for this week.
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-5 max-xl:grid-cols-4 max-md:grid-cols-2">
                {weekDays.map((item, index) => (
                  <button
                    key={`${item.day}-${item.date}-${index}`}
                    type="button"
                    className="flex flex-col items-center rounded-xl py-2 transition hover:bg-orange-50"
                  >
                    <p className="text-[17px] font-black leading-none text-black">
                      {item.day}
                    </p>
                    <p className="mt-1 text-[14px] font-medium text-[#777486]">
                      {item.displayDate}
                    </p>

                    <div className="mt-3">
                      <WeekStatusIcon status={item.status} />
                    </div>

                    <p className={`mt-2 text-[11px] font-bold ${getWeekTextColor(item.status)}`}>
                      {item.label || "..."}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-[1.1fr_0.9fr] gap-5 max-xl:grid-cols-1">
            <section className="rounded-xl border border-[#e8e8e8] bg-white px-7 py-7 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              <h2 className="mb-5 text-[24px] font-black text-black">
                Apply for Leave
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="mb-2 block text-[12px] font-semibold text-[#777486]">
                    Leave Title/Type
                  </label>
                  <input
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Sick Leave, Casual Leave, etc."
                    className="h-10 w-full rounded-lg border border-[#dedede] px-3 text-[13px] outline-none transition focus:border-[#FF6B35]"
                  />
                </div>

                <div className="mb-5 grid grid-cols-2 gap-5 max-md:grid-cols-1">
                  <DateInput
                    label="From Date"
                    value={form.fromDate}
                    onChange={(value) => updateField("fromDate", value)}
                  />

                  <DateInput
                    label="To Date"
                    value={form.toDate}
                    onChange={(value) => updateField("toDate", value)}
                  />
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-[12px] font-semibold text-[#777486]">
                    Reason for Leave
                  </label>

                  <div className="relative">
                    <textarea
                      value={form.reason}
                      onChange={(event) =>
                        updateField("reason", event.target.value.slice(0, 250))
                      }
                      placeholder="Write the reason for your leave..."
                      className="h-[88px] w-full resize-none rounded-lg border border-[#dedede] px-3 py-3 text-[13px] outline-none transition placeholder:text-[#b8b8b8] focus:border-[#FF6B35]"
                    />
                    <span className="absolute bottom-3 right-3 text-[11px] text-[#9b9b9b]">
                      {reasonLength}/250
                    </span>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="mb-2 block text-[12px] font-semibold text-[#777486]">
                    Add Attachment (Optional)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {attachment ? (
                    <div className="rounded-lg border border-[#dedede] bg-[#fafafa] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-black text-black">
                            {attachment.name}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-[#777486]">
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-full border border-[#dedede] bg-white px-3 py-1.5 text-[11px] font-black text-[#FF6B35]"
                          >
                            Change
                          </button>

                          <button
                            type="button"
                            onClick={removeAttachment}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-[70px] w-full flex-col items-center justify-center rounded-lg border border-[#dedede] bg-[#fafafa] text-center transition hover:border-[#FF6B35] hover:bg-orange-50"
                    >
                      <div className="flex items-center gap-2">
                        <CloudUpload size={17} className="text-[#777486]" />
                        <span className="text-[12px] font-semibold text-[#777486]">
                          Drag and drop your file here, or{" "}
                          <span className="text-[#FF6B35]">browse</span>
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#9b9b9b]">
                        Supports: PDF, JPG, PNG, DOC, DOCX (Max. 5MB)
                      </p>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#FF6B35] text-[14px] font-bold text-white shadow-[0_5px_12px_rgba(255,107,53,0.35)] transition hover:bg-[#f05f2e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-[#e8e8e8] bg-white px-7 py-7 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
              <h2 className="mb-5 text-[24px] font-black text-black">
                Leave History
              </h2>

              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#dedede] px-5 py-12 text-center">
                  <p className="text-[14px] font-black text-black">
                    No leave requests yet.
                  </p>
                  <p className="mt-1 text-[12px] font-semibold text-[#777486]">
                    Submitted leave requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id || item.leaveId}
                      className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-3 transition hover:border-orange-200 hover:bg-orange-50/40"
                    >
                      <div className="flex w-full items-center justify-between gap-3 text-left">
                        <div className="flex min-w-0 items-center gap-3">
                          <LeaveHistoryIcon type={item.leaveType} />

                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-black text-black">
                              {item.leaveType || "Leave"}
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#aaa]">
                              {getDateRangeLabel(item.startDate, item.endDate)}
                            </p>
                          </div>
                        </div>

                        <LeaveStatusBadge status={item.status} />
                      </div>

                      {item.reason ? (
                        <p className="mt-3 line-clamp-2 text-[12px] font-semibold leading-5 text-[#777486]">
                          {item.reason}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-[#aaa]">
                          Applied: {formatDateForHistory(String(item.createdAt || "").slice(0, 10))}
                        </p>

                        {item.hasAttachment ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(item)}
                            className="flex items-center gap-1 rounded-full border border-[#dedede] bg-white px-3 py-1.5 text-[11px] font-black text-[#FF6B35] transition hover:bg-orange-50"
                          >
                            <Download size={13} />
                            {item.attachmentOriginalName ||
                              item.attachmentFilename ||
                              "Attachment"}
                          </button>
                        ) : null}
                      </div>

                      {item.adminComment ? (
                        <div className="mt-3 rounded-lg bg-[#fafafa] px-3 py-2 text-[11px] font-semibold text-[#777486]">
                          Admin comment: {item.adminComment}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}