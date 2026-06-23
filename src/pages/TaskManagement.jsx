import { Filter, Plus, Search } from "lucide-react";
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
import { createTask, deleteTask, getTasks, updateTask } from "../services/taskService";
import { getUsers } from "../services/userService";
import { reviewSubmission, submitTaskWork } from "../services/workProgressService";

const blankTask = {
  title: "",
  description: "",
  projectId: "",
  assignedTo: "",
  assignedBy: "",
  status: "todo",
  priority: "medium",
  startDate: "",
  dueDate: "",
  progress: 0,
};

export default function TaskManagement() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [form, setForm] = useState(blankTask);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const canManage = ["admin", "manager"].includes(profile?.role);
  const canReview = ["admin", "manager"].includes(profile?.role);

  const load = async () => {
    const [taskData, projectData, userData] = await Promise.all([getTasks(profile), getProjects(profile), getUsers()]);
    setTasks(taskData);
    setProjects(projectData);
    setUsers(userData);
  };

  useEffect(() => {
    if (profile) {
      load();
    }
  }, [profile]);

  const filtered = useMemo(() => {
    const normalized = search.toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = `${task.title} ${task.description} ${task.project?.name} ${task.employee?.name}`.toLowerCase().includes(normalized);
      const matchesPriority = priority === "all" || task.priority === priority;
      return matchesSearch && matchesPriority;
    });
  }, [priority, search, tasks]);

  const stats = useMemo(() => ({
    assigned: tasks.length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    critical: tasks.filter((task) => task.priority === "critical" && task.status !== "completed").length,
    success: tasks.length ? Math.round((tasks.filter((task) => task.status === "completed").length / tasks.length) * 100) : 0,
  }), [tasks]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const openCreate = () => {
    setForm({
      ...blankTask,
      assignedBy: profile.uid,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
    setTaskModalOpen(true);
  };

  const openEdit = (task) => {
    setForm(task);
    setTaskModalOpen(true);
  };

  const saveTask = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.projectId || !form.assignedTo || !form.startDate || !form.dueDate) {
      toast.error("Task title, description, project, assignee, and dates are required.");
      return;
    }
    if (new Date(form.dueDate) < new Date(form.startDate)) {
      toast.error("Due date must be after start date.");
      return;
    }

    const payload = { ...form, assignedBy: form.assignedBy || profile.uid, progress: Number(form.progress || 0) };
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
      toast.error(error.message);
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
    if (!form.id) {
      return;
    }
    await deleteTask(form.id, profile);
    toast.success("Task deleted.");
    setTaskModalOpen(false);
    await load();
  };

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section>
          <h1 className="text-4xl font-black leading-tight">Task Management</h1>
          <p className="muted mt-2">Manage nutrition R&D and operational workflows.</p>
          <div className="mt-5 flex gap-3">
            <Button variant="secondary" icon={Filter} onClick={() => setPriority(priority === "all" ? "critical" : "all")}>Filters</Button>
            {canManage ? <Button icon={Plus} onClick={openCreate}>New Task</Button> : null}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Assigned" value={stats.assigned} />
          <StatCard label="In Progress" value={stats.inProgress} />
          <StatCard label="Critical Due" value={String(stats.critical).padStart(2, "0")} tone="red" />
          <StatCard label="Success Rate" value={`${stats.success}%`} tone="green" meta="up" />
        </div>

        <section className="card p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Input icon={Search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search task, project, employee..." />
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-11 rounded-md border border-valencia-line bg-white px-3 text-sm">
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canManage={canManage}
              canSubmit={task.assignedTo === profile.uid && task.status !== "completed"}
              canReview={canReview && task.submission && ["submitted", "under_review", "changes_requested"].includes(task.submission.status)}
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

        {!filtered.length ? <div className="card p-8 text-center text-valencia-muted">No tasks match your filters.</div> : null}
      </div>

      <Modal
        open={taskModalOpen}
        title={form.id ? "Edit Task" : "Create Task"}
        onClose={() => setTaskModalOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {form.id ? <Button variant="danger" onClick={removeTask}>Delete</Button> : null}
            <Button variant="secondary" onClick={() => setTaskModalOpen(false)}>Cancel</Button>
            <Button onClick={saveTask}>{form.id ? "Save Task" : "Create Task"}</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Task Title" name="title" value={form.title} onChange={update} />
          <label className="block">
            <span className="label mb-2 block">Project</span>
            <select name="projectId" value={form.projectId} onChange={update} className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm">
              <option value="">Select project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2 block">
            <span className="label mb-2 block">Description</span>
            <textarea name="description" value={form.description} onChange={update} rows={3} className="w-full rounded-md border border-valencia-line px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="label mb-2 block">Assign To</span>
            <select name="assignedTo" value={form.assignedTo} onChange={update} className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm">
              <option value="">Select employee</option>
              {users.filter((user) => user.status !== "blocked").map((user) => <option key={user.uid} value={user.uid}>{user.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label mb-2 block">Status</span>
            <select name="status" value={form.status} onChange={update} className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm">
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed" disabled={profile.role === "employee"}>Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
          <label className="block">
            <span className="label mb-2 block">Priority</span>
            <select name="priority" value={form.priority} onChange={update} className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <Input label="Progress %" name="progress" type="number" min="0" max="100" value={form.progress} onChange={update} />
          <Input label="Start Date" name="startDate" type="date" value={form.startDate} onChange={update} />
          <Input label="Due Date" name="dueDate" type="date" value={form.dueDate} onChange={update} />
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
        user={users.find((user) => user.uid === selectedSubmission?.submittedBy)}
        onReview={review}
      />
    </main>
  );
}
