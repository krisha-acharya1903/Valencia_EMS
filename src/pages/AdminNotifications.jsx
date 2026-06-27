import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Megaphone,
  Plus,
  Send,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiGet, apiPost } from "../services/api";

const ORANGE = "#FF6B35";

function extractArray(response, key) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.[key])) return response[key];
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.notifications)) return response.notifications;
  if (Array.isArray(response?.departments)) return response.departments;
  if (Array.isArray(response?.loginStrikes)) return response.loginStrikes;
  return [];
}

function getDepartmentName(department) {
  return department?.name || department?.department || String(department || "");
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState("create");
  const [targetMode, setTargetMode] = useState("general");

  const [departments, setDepartments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [strikes, setStrikes] = useState([]);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [department, setDepartment] = useState("");

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [notificationResponse, departmentResponse, strikeResponse] =
        await Promise.allSettled([
          apiGet("/notifications"),
          apiGet("/departments"),
          apiGet("/login-strikes"),
        ]);

      if (notificationResponse.status === "fulfilled") {
        setNotifications(
          extractArray(notificationResponse.value, "notifications")
        );
      }

      if (departmentResponse.status === "fulfilled") {
        setDepartments(extractArray(departmentResponse.value, "departments"));
      }

      if (strikeResponse.status === "fulfilled") {
        setStrikes(extractArray(strikeResponse.value, "loginStrikes"));
      }
    } catch (error) {
      console.error("Notification data load error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const departmentOptions = useMemo(() => {
    return departments
      .map(getDepartmentName)
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  }, [departments]);

  async function handleSendNotification(event) {
    event.preventDefault();

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

    if (targetMode === "division" && !department) {
      toast.error("Please select a division.");
      return;
    }

    setSending(true);

    try {
      await apiPost("/notifications", {
        title: cleanTitle,
        message: cleanMessage,
        severity: "standard",
        target_type: targetMode === "general" ? "General" : "Department",
        department: targetMode === "division" ? department : "",
      });

      toast.success("Notification sent successfully.");

      setTitle("");
      setMessage("");
      setDepartment("");

      await loadData();
      setActiveTab("history");
    } catch (error) {
      console.error("Send notification error:", error);
      toast.error(error?.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="mobile-frame">
        <section className="mb-10">
          <h1 className="text-[26px] font-black leading-tight text-[#061638]">
            Notifications
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Send announcements, view history, and track user strikes
          </p>
        </section>

        <section className="mb-8 grid grid-cols-3 border-b border-slate-200">
          <TabButton
            active={activeTab === "create"}
            icon={Plus}
            label="Create Notification"
            onClick={() => setActiveTab("create")}
          />

          <TabButton
            active={activeTab === "history"}
            icon={Megaphone}
            label="Announcement History"
            onClick={() => setActiveTab("history")}
          />

          <TabButton
            active={activeTab === "strikes"}
            icon={AlertTriangle}
            label="User Strikes Data"
            onClick={() => setActiveTab("strikes")}
          />
        </section>

        {activeTab === "create" ? (
          <form onSubmit={handleSendNotification} className="max-w-[1025px]">
            <div className="mb-7 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setTargetMode("general")}
                className={`flex h-14 items-center justify-center gap-3 rounded-lg border text-sm font-black transition ${
                  targetMode === "general"
                    ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-[0_14px_24px_rgba(255,107,53,0.24)]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#FF6B35]"
                }`}
              >
                <UsersRound size={18} />
                General - All Staff
              </button>

              <button
                type="button"
                onClick={() => setTargetMode("division")}
                className={`flex h-14 items-center justify-center gap-3 rounded-lg border text-sm font-black transition ${
                  targetMode === "division"
                    ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-[0_14px_24px_rgba(255,107,53,0.24)]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#FF6B35]"
                }`}
              >
                <Building2 size={18} />
                Division-specific
              </button>
            </div>

            {targetMode === "division" ? (
              <label className="mb-5 block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Select Division
                </span>

                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-[#061638] outline-none transition focus:border-[#FF6B35]"
                >
                  <option value="">Choose division...</option>

                  {departmentOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="mb-5 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Notification Title
              </span>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Q3 Review Reminder"
                className="h-12 w-full rounded-lg border border-[#FF6B35] bg-white px-4 text-sm font-black text-[#061638] outline-none placeholder:text-slate-400"
              />
            </label>

            <label className="mb-7 block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Message Body
              </span>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your announcement here..."
                rows={7}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm font-black leading-6 text-[#061638] outline-none placeholder:text-slate-400 focus:border-[#FF6B35]"
              />
            </label>

            <button
              type="submit"
              disabled={sending}
              className="flex h-12 min-w-[205px] items-center justify-center gap-3 rounded-xl bg-[#FF6B35] px-6 text-sm font-black text-white shadow-[0_14px_24px_rgba(255,107,53,0.22)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={17} />
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </form>
        ) : null}

        {activeTab === "history" ? (
          <AnnouncementHistory loading={loading} notifications={notifications} />
        ) : null}

        {activeTab === "strikes" ? (
          <UserStrikes loading={loading} strikes={strikes} />
        ) : null}
      </div>
    </main>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-16 items-center justify-center gap-3 border-b-2 text-sm font-black transition ${
        active
          ? "border-[#FF6B35] text-[#FF6B35]"
          : "border-transparent text-slate-500 hover:text-[#FF6B35]"
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function AnnouncementHistory({ loading, notifications }) {
  return (
    <section className="max-w-[1025px] rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-3 text-xl font-black text-[#061638]">
        <Megaphone size={22} className="text-[#FF6B35]" />
        Announcement History
      </h2>

      {loading ? (
        <div className="py-10 text-center text-sm font-semibold text-slate-500">
          Loading announcements...
        </div>
      ) : notifications.length ? (
        <div className="space-y-3">
          {notifications.map((item) => (
            <article
              key={item.id || item.created_at || item.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-[#061638]">
                    {item.title || "Notification"}
                  </h3>

                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {item.message || "-"}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#FF6B35]">
                  {item.target_type || item.targetType || "General"}
                </span>
              </div>

              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                {formatDate(item.created_at || item.createdAt)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm font-semibold text-slate-500">
          No announcement history found.
        </div>
      )}
    </section>
  );
}

function UserStrikes({ loading, strikes }) {
  return (
    <section className="max-w-[1025px] rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-3 text-xl font-black text-[#061638]">
        <AlertTriangle size={22} className="text-[#FF6B35]" />
        User Strikes Data
      </h2>

      {loading ? (
        <div className="py-10 text-center text-sm font-semibold text-slate-500">
          Loading user strikes...
        </div>
      ) : strikes.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Strikes</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {strikes.map((item) => (
                <tr
                  key={item.userId || item.email}
                  className="border-t border-slate-100"
                >
                  <td className="px-4 py-4">
                    <p className="font-black text-[#061638]">
                      {item.name || item.userName || "-"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {item.email || item.userEmail || "-"}
                    </p>
                  </td>

                  <td className="px-4 py-4 font-semibold text-slate-600">
                    {item.department || "-"}
                  </td>

                  <td className="px-4 py-4 font-black text-[#061638]">
                    {item.strikes || 0}
                  </td>

                  <td className="px-4 py-4 font-semibold text-slate-600">
                    {item.lastReason || "-"}
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
                      <AlertTriangle size={13} />
                      {item.status || "active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm font-semibold text-slate-500">
          <CheckCircle2 className="mx-auto mb-3 text-green-500" size={30} />
          No active user strikes found.
        </div>
      )}
    </section>
  );
}