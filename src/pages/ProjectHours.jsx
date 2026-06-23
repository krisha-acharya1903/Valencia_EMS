import {
  CalendarDays,
  Eye,
  RefreshCcw,
  TimerReset,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getProjectHoursSummary } from "../services/api";

const ONE_WORKING_DAY_MINUTES = 510;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWorkingDaysCount(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  if (end < start) return 1;

  let count = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (cursor.getDay() !== 0) {
      count += 1;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.max(count, 1);
}

function minutesToDays(minutes) {
  return Number(minutes || 0) / ONE_WORKING_DAY_MINUTES;
}

function formatDayValue(value) {
  const number = Number(value || 0);
  const absolute = Math.abs(number);
  const rounded = Math.round(absolute * 10) / 10;
  const sign = number < 0 ? "-" : "";

  if (rounded === 1) return `${sign}1 day`;

  if (Number.isInteger(rounded)) {
    return `${sign}${rounded} days`;
  }

  return `${sign}${rounded.toFixed(1)} days`;
}

function formatStatus(value) {
  return String(value || "not_logged")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTone(status) {
  const value = String(status || "").toLowerCase();

  if (value === "fully_logged") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (value === "overlogged") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value === "not_logged") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-orange-200 bg-orange-50 text-[#FF6B35]";
}

function computeRow(row, workingDays) {
  const expectedDays = workingDays;
  const loggedDays = minutesToDays(row.loggedMinutes || 0);
  const unallocatedDays = expectedDays - loggedDays;

  let status = "underlogged";

  if (loggedDays === 0) {
    status = "not_logged";
  } else if (unallocatedDays === 0) {
    status = "fully_logged";
  } else if (unallocatedDays < 0) {
    status = "overlogged";
  }

  return {
    ...row,
    expectedDays,
    loggedDays,
    unallocatedDays,
    status,
    expectedLabel: formatDayValue(expectedDays),
    loggedLabel: formatDayValue(loggedDays),
    unallocatedLabel: formatDayValue(unallocatedDays),
    utilizationPercent: expectedDays
      ? Math.round((loggedDays / expectedDays) * 100)
      : 0,
  };
}

function normalizeDay(day) {
  const loggedDays = minutesToDays(day.loggedMinutes || 0);
  const expectedDays = 1;
  const unallocatedDays = expectedDays - loggedDays;

  let status = "underlogged";

  if (loggedDays === 0) {
    status = "not_logged";
  } else if (unallocatedDays === 0) {
    status = "fully_logged";
  } else if (unallocatedDays < 0) {
    status = "overlogged";
  }

  return {
    ...day,
    loggedDays,
    expectedDays,
    unallocatedDays,
    status,
    loggedLabel: formatDayValue(loggedDays),
    expectedLabel: formatDayValue(expectedDays),
    unallocatedLabel: formatDayValue(unallocatedDays),
    projects: Array.isArray(day.projects)
      ? day.projects.map((project) => ({
          ...project,
          dayValue: minutesToDays(project.minutes || 0),
          dayLabel: formatDayValue(minutesToDays(project.minutes || 0)),
        }))
      : [],
  };
}

export default function ProjectHours() {
  const today = todayKey();

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const workingDays = useMemo(() => {
    return getWorkingDaysCount(startDate, endDate);
  }, [startDate, endDate]);

  const rows = useMemo(() => {
    return summary
      .map((row) => computeRow(row, workingDays))
      .sort((a, b) => {
        if (a.status === "not_logged" && b.status !== "not_logged") return -1;
        if (b.status === "not_logged" && a.status !== "not_logged") return 1;
        return a.utilizationPercent - b.utilizationPercent;
      });
  }, [summary, workingDays]);

  const selectedUser = useMemo(() => {
    if (!rows.length) return null;

    return (
      rows.find((row) => String(row.userId) === String(selectedUserId)) ||
      rows[0]
    );
  }, [rows, selectedUserId]);

  const selectedDays = useMemo(() => {
    if (!selectedUser || !Array.isArray(selectedUser.days)) return [];

    return selectedUser.days.map(normalizeDay);
  }, [selectedUser]);

  const metrics = useMemo(() => {
    const expectedDays = rows.reduce(
      (sum, row) => sum + Number(row.expectedDays || 0),
      0
    );

    const loggedDays = rows.reduce(
      (sum, row) => sum + Number(row.loggedDays || 0),
      0
    );

    const unallocatedDays = expectedDays - loggedDays;

    return {
      employees: rows.length,
      expectedDays,
      loggedDays,
      unallocatedDays,
      utilization: expectedDays
        ? Math.round((loggedDays / expectedDays) * 100)
        : 0,
      underlogged: rows.filter((row) =>
        ["underlogged", "not_logged"].includes(row.status)
      ).length,
    };
  }, [rows]);

  const load = async () => {
    try {
      setLoading(true);

      const data = await getProjectHoursSummary(startDate, endDate);
      setSummary(Array.isArray(data?.summary) ? data.summary : []);
    } catch (error) {
      console.error("Project days error:", error);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [startDate, endDate]);

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-6">
        <section className="rounded-3xl bg-[#061536] p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-200">
                Project Days
              </p>

              <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                Employee Project Day Allocation
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-medium text-slate-300">
                Review which project each employee dedicated their working day
                to. One project day is equal to 8.5 working hours.
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#061536] transition hover:bg-orange-50 disabled:opacity-60"
            >
              <RefreshCcw size={17} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                Start Date
              </span>

              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value || today)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-[#061536] outline-none transition focus:border-[#FF6B35]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                End Date
              </span>

              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value || today)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-[#061536] outline-none transition focus:border-[#FF6B35]"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setStartDate(today);
                setEndDate(today);
              }}
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black text-[#061536] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => {
                setStartDate(addDays(today, -6));
                setEndDate(today);
              }}
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black text-[#061536] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
            >
              Last 7 Days
            </button>

            <button
              type="button"
              onClick={() => {
                setStartDate(addDays(today, -29));
                setEndDate(today);
              }}
              className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-black text-[#061536] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
            >
              Last 30 Days
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={Users}
            label="Employees"
            value={metrics.employees}
            meta="Visible employees"
          />

          <MetricCard
            icon={CalendarDays}
            label="Expected Days"
            value={formatDayValue(metrics.expectedDays)}
            meta={`${workingDays} working day${workingDays === 1 ? "" : "s"}`}
          />

          <MetricCard
            icon={TimerReset}
            label="Logged Days"
            value={formatDayValue(metrics.loggedDays)}
            meta={`${metrics.utilization}% allocation`}
          />

          <MetricCard
            icon={CalendarDays}
            label="Unallocated Days"
            value={formatDayValue(metrics.unallocatedDays)}
            meta="Expected - logged"
          />

          <MetricCard
            icon={UserRoundCheck}
            label="Underlogged"
            value={metrics.underlogged}
            meta="Need follow-up"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-xl font-black text-[#061536]">
                Employee-wise Day Allocation
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Expected allocation is counted day-wise. One working day equals
                8.5 hours.
              </p>
            </div>

            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Employee</th>
                    <th className="px-5 py-4">Expected Days</th>
                    <th className="px-5 py-4">Logged Days</th>
                    <th className="px-5 py-4">Unallocated Days</th>
                    <th className="px-5 py-4">Allocation</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">View</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-sm">
                  {rows.map((row) => {
                    const isSelected =
                      String(selectedUser?.userId) === String(row.userId);

                    return (
                      <tr
                        key={row.userId}
                        className={isSelected ? "bg-orange-50/70" : "bg-white"}
                      >
                        <td className="px-5 py-4">
                          <p className="font-black text-[#061536]">
                            {row.employeeName}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {row.department || "No department"}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-black text-[#061536]">
                          {row.expectedLabel}
                        </td>

                        <td className="px-5 py-4 font-black text-[#061536]">
                          {row.loggedLabel}
                        </td>

                        <td
                          className={`px-5 py-4 font-black ${
                            row.unallocatedDays > 0
                              ? "text-[#FF6B35]"
                              : row.unallocatedDays < 0
                              ? "text-blue-700"
                              : "text-green-700"
                          }`}
                        >
                          {row.unallocatedLabel}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-24 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-[#FF6B35]"
                                style={{
                                  width: `${Math.min(
                                    row.utilizationPercent,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>

                            <span className="font-black text-[#061536]">
                              {row.utilizationPercent}%
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${getTone(
                              row.status
                            )}`}
                          >
                            {formatStatus(row.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedUserId(row.userId)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#061536] transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
                          >
                            <Eye size={15} />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!rows.length ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-bold text-slate-500"
                      >
                        {loading
                          ? "Loading project-day data..."
                          : "No employees found for project-day review."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Selected Employee
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#061536]">
                {selectedUser?.employeeName || "No employee selected"}
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Project-wise day breakdown for the selected range.
              </p>
            </div>

            {selectedUser ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <SmallStat
                    label="Expected Days"
                    value={selectedUser.expectedLabel}
                  />
                  <SmallStat
                    label="Logged Days"
                    value={selectedUser.loggedLabel}
                  />
                  <SmallStat
                    label="Unallocated Days"
                    value={selectedUser.unallocatedLabel}
                  />
                  <SmallStat
                    label="Allocation"
                    value={`${selectedUser.utilizationPercent}%`}
                  />
                </div>

                <div className="mt-5 space-y-3">
                  {selectedDays.length ? (
                    selectedDays.map((day) => (
                      <div
                        key={day.workDate}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black text-[#061536]">
                              {formatDate(day.workDate)}
                            </h3>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {day.loggedLabel} logged out of{" "}
                              {day.expectedLabel}
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${getTone(
                              day.status
                            )}`}
                          >
                            {formatStatus(day.status)}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {day.projects.length ? (
                            day.projects.map((project) => (
                              <div
                                key={`${day.workDate}-${project.projectId}`}
                                className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                              >
                                <span className="text-sm font-bold text-[#061536]">
                                  {project.projectName || "Project"}
                                </span>

                                <span className="text-sm font-black text-[#FF6B35]">
                                  {project.dayLabel}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="rounded-xl bg-white p-3 text-sm font-semibold text-slate-500">
                              No project day allocation submitted.
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h3 className="font-black text-[#061536]">
                        No project days submitted
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-500">
                        This employee has not submitted project-wise day
                        allocation for the selected range.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, meta }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B35]">
          <Icon size={22} />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>

          <h3 className="mt-2 text-2xl font-black text-[#061536]">{value}</h3>

          <p className="mt-1 text-xs font-bold text-slate-500">{meta}</p>
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-[#061536]">{value}</p>
    </div>
  );
}