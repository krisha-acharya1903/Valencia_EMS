import {
  AlertCircle,
  Bell,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const initialNotifications = [
  {
    id: 1,
    title: "Project Deadline coming up",
    message: "Bio-Enzyme Supplement R&D deadline is approaching soon.",
    time: "10 min ago",
    type: "warning",
    icon: CalendarClock,
    unread: true,
  },
  {
    id: 2,
    title: "Task marked complete",
    message: "One of your assigned tasks has been completed successfully.",
    time: "35 min ago",
    type: "success",
    icon: CheckCircle2,
    unread: true,
  },
  {
    id: 3,
    title: "Project update",
    message: "A new update was added to your active project.",
    time: "1 hr ago",
    type: "info",
    icon: FolderKanban,
    unread: false,
  },
  {
    id: 4,
    title: "Attendance reminder",
    message: "Please make sure your attendance is marked for today.",
    time: "2 hrs ago",
    type: "alert",
    icon: AlertCircle,
    unread: false,
  },
];

function getNotificationStyle(type) {
  if (type === "success") {
    return {
      iconBox: "bg-green-50 text-green-700",
      dot: "bg-green-500",
    };
  }

  if (type === "warning") {
    return {
      iconBox: "bg-orange-50 text-[#FF6B35]",
      dot: "bg-[#FF6B35]",
    };
  }

  if (type === "alert") {
    return {
      iconBox: "bg-red-50 text-red-600",
      dot: "bg-red-500",
    };
  }

  return {
    iconBox: "bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
  };
}

export default function NotificationBell() {
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((item) => item.unread).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapperRef.current) return;

      if (!wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleMarkAllRead() {
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        unread: false,
      }))
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#061536] shadow-sm transition hover:border-orange-200 hover:text-[#FF6B35]"
      >
        <Bell size={22} strokeWidth={2.3} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FF6B35] px-1.5 text-xs font-extrabold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-[390px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#061536]">
                Notifications
              </h3>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount > 1 ? "s" : ""
                    }`
                  : "All caught up"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-extrabold text-[#FF6B35] transition hover:bg-orange-100"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto p-3">
            {notifications.map((notification) => {
              const Icon = notification.icon;
              const style = getNotificationStyle(notification.type);

              return (
                <div
                  key={notification.id}
                  className={`flex gap-3 rounded-2xl p-3 transition hover:bg-orange-50/40 ${
                    notification.unread ? "bg-orange-50/50" : "bg-white"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.iconBox}`}
                  >
                    <Icon size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-extrabold text-[#061536]">
                        {notification.title}
                      </h4>

                      {notification.unread && (
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                        />
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {notification.message}
                    </p>

                    <p className="mt-2 text-[11px] font-bold text-slate-400">
                      {notification.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 px-5 py-3">
            <p className="text-center text-xs font-semibold text-slate-400">
              Recent employee dashboard updates
            </p>
          </div>
        </div>
      )}
    </div>
  );
}