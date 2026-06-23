import {
  CalendarDays,
  Check,
  ChevronDown,
  CloudUpload,
  Minus,
  PartyPopper,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const ORANGE = "#FF6B35";

const weekData = [
  { day: "Mon", date: "Jun 15", status: "present", label: "8h 10min" },
  { day: "Tue", date: "Jun 16", status: "present", label: "8h 0min" },
  { day: "Wed", date: "Jun 17", status: "half", label: "Half Day" },
  { day: "Thu", date: "Jun 18", status: "present", label: "8h 30min" },
  { day: "Fri", date: "Jun 19", status: "leave", label: "Leave" },
  { day: "Sat", date: "Jun 18", status: "present", label: "8h 30min" },
  { day: "Mon", date: "Jun 22", status: "empty", label: "..." },
  { day: "Tue", date: "Jun 23", status: "empty", label: "..." },
];

const initialLeaveHistory = [
  {
    id: 1,
    title: "Sick Leave",
    date: "Jun 19, 2026",
    status: "Approved",
    type: "sick",
  },
  {
    id: 2,
    title: "Casual Leave",
    date: "May 18 - May 20, 2026",
    status: "Approved",
    type: "casual",
  },
  {
    id: 3,
    title: "Casual Leave",
    date: "April 2026",
    status: "Rejected",
    type: "casual",
  },
];

function formatDateForHistory(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function AttendanceRing({ value = 96 }) {
  return (
    <div
      className="relative flex h-[156px] w-[156px] items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${ORANGE} ${value * 3.6}deg, #eee 0deg)`,
      }}
    >
      <div className="flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full bg-[#fff7ef]">
        <p className="text-[42px] font-black leading-none text-black">
          {value}%
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

  if (status === "half") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffe4b9] text-[#ffb24d]">
        <div className="h-6 w-3 rounded-l-full bg-[#ffb24d]" />
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

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eeeeee] text-[#c4c4c4]">
      <Minus size={20} strokeWidth={3} />
    </div>
  );
}

function LeaveHistoryIcon({ type }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fffaf2] text-[24px]">
      {type === "sick" ? "🤒" : "🏖️"}
    </div>
  );
}

export default function UserAttendanceDetail() {
  const [form, setForm] = useState({
    title: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const [history, setHistory] = useState(initialLeaveHistory);

  const reasonLength = useMemo(() => form.reason.length, [form.reason]);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter leave title/type.");
      return;
    }

    if (!form.fromDate || !form.toDate) {
      alert("Please select from and to dates.");
      return;
    }

    if (!form.reason.trim()) {
      alert("Please enter reason for leave.");
      return;
    }

    const formattedFrom = formatDateForHistory(form.fromDate);
    const formattedTo = formatDateForHistory(form.toDate);

    setHistory((prev) => [
      {
        id: Date.now(),
        title: form.title.trim(),
        date:
          formattedFrom === formattedTo
            ? formattedFrom
            : `${formattedFrom} - ${formattedTo}`,
        status: "Approved",
        type: "casual",
      },
      ...prev,
    ]);

    setForm({
      title: "",
      fromDate: "",
      toDate: "",
      reason: "",
    });
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

        <button
          type="button"
          className="flex h-11 items-center gap-3 rounded-lg border border-[#ffb199] bg-white px-4 text-[14px] font-semibold text-black transition hover:bg-orange-50"
        >
          <CalendarDays size={18} />
          <span>Jun 17, 2026</span>
          <ChevronDown size={17} />
        </button>
      </div>

      <section className="mb-5 overflow-hidden rounded-xl border border-[#f0e7dd] bg-[#fff8ef] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        <div className="grid h-[188px] grid-cols-[1.15fr_1fr_1.25fr_1fr_0.95fr] items-center px-8">
          <div className="border-r border-[#eadfda]">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#20c56b]" />
              <p className="text-[14px] font-semibold text-black">
                Checked In Today
              </p>
            </div>

            <p className="text-[42px] font-light leading-none text-black">
              10:52 AM
            </p>

            <div className="mt-3 flex items-center gap-4">
              <p className="text-[12px] text-[#8c8390]">June 17, 2026</p>
              <span className="rounded-full bg-[#baf2d7] px-3 py-1 text-[11px] font-bold text-[#12b76a]">
                On Time
              </span>
            </div>
          </div>

          <div className="px-12">
            <p className="text-[15px] font-medium text-[#8c8390]">
              Working Time
            </p>
            <p className="mt-1 text-[34px] font-black leading-none text-[#FF6B35]">
              4h 23m
            </p>
            <p className="mt-2 text-[13px] text-[#8c8390]">since 10:52AM</p>
          </div>

          <div className="flex justify-center">
            <WorkIllustration />
          </div>

          <div className="px-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ff4770]" />
              <p className="text-[14px] font-semibold text-black">
                Checked Out Today
              </p>
            </div>

            <p className="text-[34px] font-black tracking-[0.2em] text-[#8c8390]">
              --:-- --
            </p>

            <p className="mt-3 text-[12px] text-[#8c8390]">June 17, 2026</p>
          </div>

          <div className="flex justify-end">
            <AttendanceRing value={96} />
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-[#e8e8e8] bg-white px-8 py-7 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        <h2 className="mb-6 text-[32px] font-black leading-none text-black">
          This Week
        </h2>

        <div className="grid grid-cols-8 gap-5">
          {weekData.map((item, index) => (
            <button
              key={`${item.day}-${item.date}-${index}`}
              type="button"
              className="flex flex-col items-center rounded-xl py-2 transition hover:bg-orange-50"
            >
              <p className="text-[17px] font-black leading-none text-black">
                {item.day}
              </p>
              <p className="mt-1 text-[14px] font-medium text-[#777486]">
                {item.date}
              </p>

              <div className="mt-3">
                <WeekStatusIcon status={item.status} />
              </div>

              <p
                className={`mt-2 text-[11px] font-bold ${
                  item.status === "present"
                    ? "text-[#12b76a]"
                    : item.status === "half"
                    ? "text-[#ffb24d]"
                    : item.status === "leave"
                    ? "text-[#ba5ce8]"
                    : "text-[#b8b8b8]"
                }`}
              >
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-5">
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
                className="h-10 w-full rounded-lg border border-[#dedede] px-3 text-[13px] outline-none transition focus:border-[#FF6B35]"
              />
            </div>

            <div className="mb-5 grid grid-cols-2 gap-5">
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

              <button
                type="button"
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
                  Supports: PDF, JPG, PNG (Max. 5MB)
                </p>
              </button>
            </div>

            <button
              type="submit"
              className="h-10 w-full rounded-full bg-[#FF6B35] text-[14px] font-bold text-white shadow-[0_5px_12px_rgba(255,107,53,0.35)] transition hover:bg-[#f05f2e]"
            >
              Submit Request
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-[#e8e8e8] bg-white px-7 py-7 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <h2 className="mb-5 text-[24px] font-black text-black">
            Leave History
          </h2>

          <div className="space-y-3">
            {history.map((item) => {
              const approved = item.status === "Approved";

              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-[#e5e5e5] bg-white px-3 py-3 text-left transition hover:border-orange-200 hover:bg-orange-50/40"
                >
                  <div className="flex items-center gap-3">
                    <LeaveHistoryIcon type={item.type} />

                    <div>
                      <p className="text-[14px] font-black text-black">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-[#aaa]">
                        {item.date}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex h-8 items-center gap-2 rounded-full border px-4 text-[12px] font-bold ${
                      approved
                        ? "border-[#a8efd8] bg-[#ddfff2] text-[#20c997]"
                        : "border-[#ffc6d2] bg-[#fff0f4] text-[#ff5d7d]"
                    }`}
                  >
                    {approved ? <Check size={14} /> : <X size={14} />}
                    {item.status}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}