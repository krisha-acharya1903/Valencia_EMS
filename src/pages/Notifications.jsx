import { Megaphone, Send } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/Button";
import ChartCard from "../components/ChartCard";
import Input from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { getDepartments } from "../services/departmentService";
import { sendNotification } from "../services/notificationService";

const initialNotification = {
  audience: "all",
  targetDepartment: "",
  type: "notification",
  title: "",
  message: "",
};

export default function Notifications() {
  const { profile } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [notification, setNotification] = useState(initialNotification);

  useEffect(() => {
    getDepartments()
      .then((data) => {
        setDepartments(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Departments load error:", error);
        setDepartments([]);
        toast.error("Departments failed to load.");
      });
  }, []);

  const updateNotification = (event) => {
    const { name, value } = event.target;

    setNotification((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const submitNotification = async (event) => {
    event.preventDefault();

    if (!notification.title.trim()) {
      toast.error("Notification title is required.");
      return;
    }

    if (!notification.message.trim()) {
      toast.error("Notification message is required.");
      return;
    }

    if (
      notification.audience === "department" &&
      !notification.targetDepartment
    ) {
      toast.error("Select a department.");
      return;
    }

    try {
      await sendNotification(profile, notification);
      toast.success("Notification sent.");
      setNotification(initialNotification);
    } catch (error) {
      toast.error(error.message || "Failed to send notification.");
    }
  };

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section>
          <h1 className="text-3xl font-black leading-tight sm:text-4xl">
            Notifications
          </h1>

          <p className="muted mt-1">
            Send company-wide or department-wise announcements to employees.
          </p>
        </section>

        <ChartCard title="Send Notification" eyebrow="Admin only">
          <form className="grid gap-4" onSubmit={submitNotification}>
            <div className="grid gap-3 sm:grid-cols-3">
              <label>
                <span className="label mb-2 block">Audience</span>
                <select
                  name="audience"
                  value={notification.audience}
                  onChange={updateNotification}
                  className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm"
                >
                  <option value="all">General — All Employees</option>
                  <option value="department">Department-wise</option>
                </select>
              </label>

              <label>
                <span className="label mb-2 block">Type</span>
                <select
                  name="type"
                  value={notification.type}
                  onChange={updateNotification}
                  className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm"
                >
                  <option value="notification">Standard Notification</option>
                  <option value="warning">Warning</option>
                </select>
              </label>

              <label>
                <span className="label mb-2 block">Department</span>
                <select
                  name="targetDepartment"
                  value={notification.targetDepartment}
                  onChange={updateNotification}
                  disabled={notification.audience !== "department"}
                  className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm disabled:bg-slate-100"
                >
                  <option value="">Select department</option>

                  {departments.map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Input
              label="Title"
              name="title"
              value={notification.title}
              onChange={updateNotification}
              icon={Megaphone}
              placeholder="Example: Weekly task review reminder"
            />

            <label>
              <span className="label mb-2 block">Message</span>
              <textarea
                name="message"
                value={notification.message}
                onChange={updateNotification}
                rows={5}
                placeholder="Write the notification message here..."
                className="w-full rounded-md border border-valencia-line px-3 py-2 text-sm"
              />
            </label>

            <div className="flex justify-end">
              <Button type="submit" icon={Send}>
                Send Notification
              </Button>
            </div>
          </form>
        </ChartCard>
      </div>
    </main>
  );
}