import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AdminReviewModal from "../components/AdminReviewModal";
import Button from "../components/Button";
import Input from "../components/Input";
import Modal from "../components/Modal";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import TaskSubmissionModal from "../components/TaskSubmissionModal";
import { useAuth } from "../context/AuthContext";
import { getProjects } from "../services/projectService";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from "../services/taskService";
import { getUsers } from "../services/userService";
import {
  reviewSubmission,
  submitTaskWork,
} from "../services/workProgressService";

const blankTask = {
  title: "",
  description: "",
  projectId: "",
  assignedTo: "",
  assignedBy: "",
  status: "todo",
  startDate: "",
  dueDate: "",
  progress: 0,
};

function normalizeDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function getProjectStartDate(project) {
  return normalizeDate(
    project?.startDate ||
      project?.start_date ||
      project?.fromDate ||
      project?.from_date ||
      project?.createdAt ||
      project?.created_at ||
      ""
  );
}

function getProjectEndDate(project) {
  return normalizeDate(
    project?.endDate ||
      project?.end_date ||
      project?.dueDate ||
      project?.due_date ||
      project?.deadline ||
      project?.toDate ||
      project?.to_date ||
      ""
  );
}

function getUserId(user) {
  return String(user?.uid || user?.id || user?.userId || user?.user_id || "");
}

function getProjectId(project) {
  return String(project?.id || project?.projectId || project?.project_id || "");
}

export default function TaskManagement() {
  const { profile } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [form, setForm] = useState(blankTask);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const role = String(profile?.role || "").toLowerCase();
  const canManage = ["admin", "manager", "superadmin", "super_admin"].includes(
    role
  );
  const canReview = ["admin", "manager", "superadmin", "super_admin"].includes(
    role
  );

  const selectedProject = useMemo(() => {
    return (
      projects.find(
        (project) => String(getProjectId(project)) === String(form.projectId)
      ) || null
    );
  }, [projects, form.projectId]);

  const selectedProjectStartDate = getProjectStartDate(selectedProject);
  const selectedProjectEndDate = getProjectEndDate(selectedProject);

  const load = async () => {
    try {
      const [taskData, projectData, userData] = await Promise.all([
        getTasks(profile),
        getProjects(profile),
        getUsers(),
      ]);

      setTasks(Array.isArray(taskData) ? taskData : []);
      setProjects(Array.isArray(projectData) ? projectData : []);
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (error) {
      console.error("Task management load error:", error);
      toast.error(error?.message || "Failed to load task data.");
    }
  };

  useEffect(() => {
    if (profile) {
      load();
    }
  }, [profile]);

  const filtered = useMemo(() => {
    const normalized = search.toLowerCase().trim();

    if (!normalized) return tasks;

    return tasks.filter((task) => {
      const searchable = [
        task.title,
        task.name,
        task.description,
        task.project?.name,
        task.projectName,
        task.project_name,
        task.employee?.name,
        task.assigneeName,
        task.assignedToName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalized);
    });
  }, [tasks, search]);

  const stats = useMemo(
    () => ({
      assigned: tasks.length,
      inProgress: tasks.filter(
        (task) =>
          task.status === "in_progress" ||
          task.status === "In Progress" ||
          task.status === "in progress"
      ).length,
      underReview: tasks.filter(
        (task) =>
          task.status === "review" ||
          task.status === "under_review" ||
          task.status === "Under Review" ||
          task.status === "under review"
      ).length,
      success: tasks.length
        ? Math.round(
            (tasks.filter(
              (task) =>
                task.status === "completed" ||
                task.status === "Completed" ||
                task.status === "done" ||
                task.status === "Done"
            ).length /
              tasks.length) *
              100
          )
        : 0,
    }),
    [tasks]
  );

  const update = (event) => {
    const { name, value } = event.target;

    setForm((current) => {
      const next = { ...current, [name]: value };

      if (name === "projectId") {
        const project = projects.find(
          (item) => String(getProjectId(item)) === String(value)
        );

        const projectStart = getProjectStartDate(project);
        const projectEnd = getProjectEndDate(project);

        if (projectStart && (!next.startDate || next.startDate < projectStart)) {
          next.startDate = projectStart;
        }

        if (projectEnd && (!next.dueDate || next.dueDate > projectEnd)) {
          next.dueDate = projectEnd;
        }
      }

      return next;
    });
  };

  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10);

    setForm({
      ...blankTask,
      assignedBy: profile?.uid || profile?.id || "",
      startDate: today,
      dueDate: today,
    });

    setTaskModalOpen(true);
  };

  const openEdit = (task) => {
    setForm({
      ...blankTask,
      ...task,
      projectId: String(task.projectId || task.project_id || ""),
      assignedTo: String(task.assignedTo || task.assigned_to || ""),
      startDate: normalizeDate(task.startDate || task.start_date || ""),
      dueDate: normalizeDate(task.dueDate || task.due_date || task.deadline || ""),
    });

    setTaskModalOpen(true);
  };

  const saveTask = async () => {
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.projectId ||
      !form.assignedTo ||
      !form.startDate ||
      !form.dueDate
    ) {
      toast.error(
        "Task title, description, project, assignee, start date, and due date are required."
      );
      return;
    }

    if (new Date(form.dueDate) < new Date(form.startDate)) {
      toast.error("Due date must be after start date.");
      return;
    }

    const project = projects.find(
      (item) => String(getProjectId(item)) === String(form.projectId)
    );

    if (!project) {
      toast.error("Select a valid project.");
      return;
    }

    const projectStart = getProjectStartDate(project);
    const projectEnd = getProjectEndDate(project);

    if (projectStart && form.startDate < projectStart) {
      toast.error(`Task start date cannot be before project start date.`);
      return;
    }

    if (projectEnd && form.dueDate > projectEnd) {
      toast.error(`Task due date cannot be after project deadline.`);
      return;
    }

    if (projectEnd && form.startDate > projectEnd) {
      toast.error("Task start date cannot be after project deadline.");
      return;
    }

    const payload = {
      ...form,
      assignedBy: form.assignedBy || profile?.uid || profile?.id || "",
      progress: Number(form.progress || 0),
    };

    try {
      if (form.id) {
        await updateTask(form.id, payload, profile);
        toast.success("Task updated.");
      } else {
        await createTask(payload, profile);
        toast.success("Task created.");
      }

      setTaskModalOpen(false);
      await load();
    } catch (error) {
      console.error("Save task error:", error);
      toast.error(error?.message || "Failed to save task.");
    }
  };

  const submitWork = async (payload) => {
    await submitTaskWork(profile, payload);
    await load();
  };

  const review = async (action, comment) => {
    await reviewSubmission(profile, selectedSubmission.id, action, comment);
    await load();
  };

  const removeTask = async () => {
    if (!form.id) return;

    const confirmed = window.confirm("Delete this task permanently?");

    if (!confirmed) return;

    try {
      await deleteTask(form.id, profile);
      toast.success("Task deleted.");
      setTaskModalOpen(false);
      await load();
    } catch (error) {
      console.error("Delete task error:", error);
      toast.error(error?.message || "Failed to delete task.");
    }
  };

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section>
          <h1 className="text-4xl font-black leading-tight">Task Management</h1>
          <p className="muted mt-2">
            Manage nutrition R&D and operational workflows.
          </p>

          <div className="mt-5 flex gap-3">
            {canManage ? (
              <Button icon={Plus} onClick={openCreate}>
                New Task
              </Button>
            ) : null}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Assigned" value={stats.assigned} />
          <StatCard label="In Progress" value={stats.inProgress} />
          <StatCard label="Under Review" value={stats.underReview} />
          <StatCard
            label="Success Rate"
            value={`${stats.success}%`}
            tone="green"
            meta="up"
          />
        </div>

        <section className="card p-4">
          <Input
            icon={Search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search task, project, employee..."
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canManage={canManage}
              canSubmit={
                String(task.assignedTo || task.assigned_to) ===
                  String(profile?.uid || profile?.id) &&
                task.status !== "completed"
              }
              canReview={
                canReview &&
                task.submission &&
                ["submitted", "under_review", "changes_requested"].includes(
                  task.submission.status
                )
              }
              onEdit={openEdit}
              onSubmit={(nextTask) => {
                setSelectedTask(nextTask);
                setSubmissionOpen(true);
              }}
              onReview={(submission) => {
                setSelectedTask(task);
                setSelectedSubmission(submission);
                setReviewOpen(true);
              }}
            />
          ))}
        </div>

        {!filtered.length ? (
          <div className="card p-8 text-center text-valencia-muted">
            No tasks match your search.
          </div>
        ) : null}
      </div>

      <Modal
        open={taskModalOpen}
        title={form.id ? "Edit Task" : "Create Task"}
        onClose={() => setTaskModalOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {form.id ? (
              <Button variant="danger" onClick={removeTask}>
                Delete
              </Button>
            ) : null}

            <Button variant="secondary" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </Button>

            <Button onClick={saveTask}>
              {form.id ? "Save Task" : "Create Task"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Task Title"
            name="title"
            value={form.title}
            onChange={update}
          />

          <label className="block">
            <span className="label mb-2 block">Project</span>
            <select
              name="projectId"
              value={form.projectId}
              onChange={update}
              className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={getProjectId(project)} value={getProjectId(project)}>
                  {project.name || project.title || "Project"}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="label mb-2 block">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={update}
              rows={3}
              className="w-full rounded-md border border-valencia-line px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="label mb-2 block">Assign To</span>
            <select
              name="assignedTo"
              value={form.assignedTo}
              onChange={update}
              className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm"
            >
              <option value="">Select employee</option>
              {users
                .filter((user) => user.status !== "blocked")
                .map((user) => (
                  <option key={getUserId(user)} value={getUserId(user)}>
                    {user.name || user.fullName || user.email || "Employee"}
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className="label mb-2 block">Status</span>
            <select
              name="status"
              value={form.status}
              onChange={update}
              className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed" disabled={role === "employee"}>
                Completed
              </option>
              <option value="overdue">Overdue</option>
            </select>
          </label>

          <Input
            label="Progress %"
            name="progress"
            type="number"
            min="0"
            max="100"
            value={form.progress}
            onChange={update}
          />

          <Input
            label="Start Date"
            name="startDate"
            type="date"
            value={form.startDate}
            min={selectedProjectStartDate || undefined}
            max={selectedProjectEndDate || undefined}
            onChange={update}
          />

          <Input
            label="Due Date"
            name="dueDate"
            type="date"
            value={form.dueDate}
            min={form.startDate || selectedProjectStartDate || undefined}
            max={selectedProjectEndDate || undefined}
            onChange={update}
          />

          {selectedProject ? (
            <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#FF6B35] sm:col-span-2">
              Task dates must be inside project timeline:{" "}
              <b>{selectedProjectStartDate || "No start date"}</b> to{" "}
              <b>{selectedProjectEndDate || "No deadline"}</b>.
            </div>
          ) : null}
        </div>
      </Modal>

      <TaskSubmissionModal
        open={submissionOpen}
        onClose={() => setSubmissionOpen(false)}
        task={selectedTask}
        tasks={tasks}
        projects={projects}
        profile={profile}
        onSubmit={submitWork}
      />

      <AdminReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        submission={selectedSubmission}
        task={selectedTask}
        user={users.find(
          (user) => getUserId(user) === String(selectedSubmission?.submittedBy)
        )}
        onReview={review}
      />
    </main>
  );
}