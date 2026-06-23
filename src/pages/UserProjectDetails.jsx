import {
  Check,
  FileText,
  Plus,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProjects } from "../services/projectService";
import { getTasks } from "../services/taskService";

const ORANGE = "#FF6B35";

const fallbackProject = {
  id: "aroma-de-valencia",
  name: "Aroma De Valencia",
  priority: "High",
  created: "Mar 23, 10:34 PM",
  deadline: "Jun 02, 04:01 PM",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur in fermentum felis, eu luctus lectus. Pellentesque lacus neque, iaculis in posuere vel, ullamcorper vitae diam. Curabitur ut est lectus. Quisque ac maximus augue. In hac habitasse platea dictumst. Integer ac urna et diam sagittis maximus. Sed molestie tempus ante, quis vestibulum mauris tempor sed.",
};

const fallbackTasks = [
  {
    id: 1,
    status: "todo",
    category: ["STRATEGY"],
    title: "Define product positioning and messaging",
    progress: 0,
    members: ["TT", "TH"],
    extra: 1,
    subtasks: [
      { title: "Competitor analysis", done: false },
      { title: "Draft positioning statement", done: false },
    ],
  },
  {
    id: 2,
    status: "todo",
    category: ["DESIGN"],
    title: "Design retail shelf display units",
    progress: 0,
    members: ["P"],
    extra: 1,
    subtasks: [
      { title: "Brief design agency", done: false },
      { title: "Review concepts", done: false },
      { title: "Finalise artwork", done: false },
    ],
  },
  {
    id: 3,
    status: "progress",
    category: ["ARTWORK", "PRINT"],
    title: "Packaging artwork approval",
    progress: 65,
    members: ["SM", "J"],
    extra: 1,
    subtasks: [
      { title: "Submit artwork to brand team", done: true },
      { title: "Review print proofs", done: true },
      { title: "Final sign-off from MD", done: false },
    ],
  },
  {
    id: 4,
    status: "progress",
    category: ["REGULATORY"],
    title: "Regulatory compliance submission",
    progress: 40,
    members: ["PN", "TH"],
    extra: 1,
    subtasks: [
      { title: "EU dossier prepared", done: true },
      { title: "MENA dossier prepared", done: false },
      { title: "Submit to authority", done: false },
    ],
  },
  {
    id: 5,
    status: "done",
    category: ["R&D", "QA"],
    title: "Stability & shelf-life testing",
    progress: 100,
    members: ["J"],
    extra: 1,
    subtasks: [
      { title: "Set up test batches", done: true },
      { title: "12-month accelerated test", done: true },
      { title: "Document results", done: true },
    ],
  },
  {
    id: 6,
    status: "done",
    category: ["R&D"],
    title: "Formula sign-off with R&D lead",
    progress: 100,
    members: ["J", "SM"],
    extra: 1,
    subtasks: [
      { title: "Final formula review", done: true },
      { title: "MD sign-off obtained", done: true },
    ],
  },
];

const reviewFiles = [
  {
    id: 1,
    name: "Packaging_Artwork_v4.pdf",
    meta: "2.4 MB · Sent 2h ago",
    status: "Under Review",
    statusClass: "bg-orange-50 text-orange-500",
    iconClass: "bg-red-100 text-red-500",
    note: "",
    reviewers: ["SM", "TL", "AD"],
  },
  {
    id: 2,
    name: "Stability_Test.xlsx",
    meta: "1.1 MB · Sent 1d ago",
    status: "Approved",
    statusClass: "bg-green-50 text-green-600",
    iconClass: "bg-green-100 text-green-600",
    note: "",
    reviewers: ["SM", "TL"],
  },
  {
    id: 3,
    name: "Packaging_Artwork_v4.pdf",
    meta: "2.6 MB · Sent 3d ago",
    status: "Changes Requested",
    statusClass: "bg-red-50 text-red-500",
    iconClass: "bg-red-100 text-red-500",
    note: "Logo size needs to be increased",
    reviewers: ["SM"],
  },
];

const blankTaskForm = {
  status: "todo",
  title: "",
  categories: "NEW",
  members: "ME",
  progress: 0,
  subtasks: ["New checklist item"],
};

function normalizeId(value) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeStatus(status) {
  const clean = String(status || "").toLowerCase().replaceAll("_", " ");

  if (
    clean.includes("done") ||
    clean.includes("complete") ||
    clean.includes("finished") ||
    clean.includes("closed")
  ) {
    return "done";
  }

  if (
    clean.includes("progress") ||
    clean.includes("working") ||
    clean.includes("ongoing") ||
    clean.includes("active")
  ) {
    return "progress";
  }

  return "todo";
}

function getProjectId(project, index = 0) {
  return normalizeId(
    project?.id ||
      project?._id ||
      project?.projectId ||
      project?.project_id ||
      project?.slug ||
      `project-${index + 1}`
  );
}

function getProjectName(project) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    "Aroma De Valencia"
  );
}

function getProjectDescription(project) {
  return project?.description || project?.details || fallbackProject.description;
}

function formatDateTime(value, fallback) {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
  });
}

function getTaskProjectId(task) {
  return normalizeId(
    task?.projectId ||
      task?.project_id ||
      task?.project ||
      task?.parentProjectId ||
      task?.parent_project_id
  );
}

function getTaskTitle(task) {
  return task?.title || task?.name || task?.task || task?.taskName || "Untitled Task";
}

function getTaskProgress(task) {
  const direct =
    Number(task?.progress) ||
    Number(task?.completion) ||
    Number(task?.percentage);

  if (Number.isFinite(direct) && direct > 0) {
    return Math.max(0, Math.min(100, Math.round(direct)));
  }

  const subtasks = Array.isArray(task?.subtasks)
    ? task.subtasks
    : Array.isArray(task?.sub_tasks)
    ? task.sub_tasks
    : [];

  if (subtasks.length) {
    const done = subtasks.filter((item) => {
      const status = String(item?.status || "").toLowerCase();
      return item?.done === true || status === "done" || status === "completed";
    }).length;

    return Math.round((done / subtasks.length) * 100);
  }

  return normalizeStatus(task?.status) === "done" ? 100 : 0;
}

function getTaskSubtasks(task) {
  const subtasks = task?.subtasks || task?.sub_tasks || task?.children || [];

  if (Array.isArray(subtasks) && subtasks.length > 0) {
    return subtasks.map((item, index) => ({
      title: item?.title || item?.name || `Subtask ${index + 1}`,
      done:
        item?.done === true ||
        ["done", "complete", "completed"].includes(
          String(item?.status || "").toLowerCase()
        ),
    }));
  }

  return [];
}

function getInitials(name) {
  const cleanName = String(name || "").trim();

  if (!cleanName) return "U";

  return cleanName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function calculateTaskProgress(subtasks, fallback = 0) {
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return fallback;
  }

  const doneCount = subtasks.filter((subtask) => subtask.done).length;
  return Math.round((doneCount / subtasks.length) * 100);
}

function calculateTaskStatus(currentStatus, subtasks) {
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return currentStatus;
  }

  const doneCount = subtasks.filter((subtask) => subtask.done).length;

  if (doneCount === subtasks.length) return "done";
  if (doneCount > 0) return "progress";
  return currentStatus === "done" ? "progress" : currentStatus;
}

function normalizeTask(task, index) {
  const status = normalizeStatus(task?.status);
  const subtasks = getTaskSubtasks(task);

  return {
    id: task?.id || task?._id || `task-${index + 1}`,
    status,
    category: [String(task?.priority || task?.category || "TASK").toUpperCase()],
    title: getTaskTitle(task),
    progress: getTaskProgress(task),
    members: [getInitials(task?.assigneeName || task?.assignedTo || "SM")],
    extra: 1,
    subtasks:
      subtasks.length > 0
        ? subtasks
        : [
            {
              title: "Task checklist item",
              done: status === "done",
            },
          ],
  };
}

function AvatarBubble({ label, index }) {
  const colors = [
    "bg-[#ef4f73]",
    "bg-[#f45f6c]",
    "bg-[#6d6ce8]",
    "bg-[#24bfa2]",
    "bg-[#d6d9e3]",
    "bg-[#f5a623]",
  ];

  return (
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold text-white ${
        colors[index % colors.length]
      }`}
    >
      {label}
    </div>
  );
}

function StatusHeading({ title, count, colorClass }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
        <h3 className="text-[15px] font-bold text-black">{title}</h3>
      </div>

      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#eef4fb] px-2 text-[12px] font-bold text-[#73a4dc]">
        {count}
      </span>
    </div>
  );
}

function TaskCard({ task, onToggleSubtask, onDeleteTask }) {
  const doneCount = task.subtasks.filter((item) => item.done).length;
  const totalCount = task.subtasks.length;

  return (
    <div className="group relative rounded-2xl border border-[#e8e8e8] bg-white px-4 py-4 shadow-[0_6px_16px_rgba(0,0,0,0.05)]">
      <button
        type="button"
        onClick={() => onDeleteTask(task.id)}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 opacity-0 transition hover:bg-red-100 group-hover:opacity-100"
        title="Delete task"
      >
        <Trash2 size={15} />
      </button>

      <div className="mb-3 flex items-start justify-between gap-10">
        <div className="flex flex-wrap gap-2">
          {task.category.map((item) => (
            <span
              key={item}
              className="rounded-lg bg-[#fff0ea] px-2 py-1 text-[12px] font-black text-[#ff7a42]"
            >
              {item}
            </span>
          ))}
        </div>

        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ef4771]" />
      </div>

      <h4 className="mb-4 pr-8 text-[15px] font-black leading-5 text-black">
        {task.title}
      </h4>

      {task.status === "progress" ? (
        <div className="mb-4">
          <p className="mb-2 text-[12px] font-medium text-[#777]">
            {task.progress}% completed
          </p>

          <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e5e5]">
            <div
              className="h-full rounded-full bg-[#FF6B35]"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      ) : task.status === "done" ? (
        <p className="mb-4 text-[12px] font-bold text-[#20bf9f]">
          Task finished
        </p>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {task.members.map((member, index) => (
            <AvatarBubble
              key={`${task.id}-${member}-${index}`}
              label={member}
              index={index}
            />
          ))}

          <AvatarBubble label={`+${task.extra}`} index={4} />
        </div>

        <p className="text-[12px] font-bold text-[#666]">
          {doneCount}/{totalCount} subtasks
        </p>
      </div>

      <div className="border-t border-[#eeeeee] pt-3">
        {task.subtasks.map((subtask, index) => (
          <button
            type="button"
            key={`${task.id}-${index}`}
            onClick={() => onToggleSubtask(task.id, index)}
            className="mb-2 flex w-full items-center gap-2 text-left last:mb-0"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                subtask.done
                  ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                  : "border-[#dddddd] bg-white"
              }`}
            >
              {subtask.done ? <Check size={11} strokeWidth={3} /> : null}
            </span>

            <p
              className={`text-[12px] font-medium ${
                subtask.done ? "text-[#777] line-through" : "text-black"
              }`}
            >
              {subtask.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewPanel() {
  return (
    <aside className="rounded-2xl border border-[#e8e8e8] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.07)]">
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-black">Reviews</h3>
        <p className="text-[11px] font-medium text-[#777]">
          Send files to admin for review
        </p>
      </div>

      <button
        type="button"
        className="mb-3 flex h-[90px] w-full flex-col items-center justify-center rounded-xl border border-[#f4c9b8] bg-[#fff4ef] text-center transition hover:border-[#FF6B35]"
      >
        <UploadCloud size={20} className="mb-2 text-[#FF6B35]" />
        <p className="text-[10px] font-semibold text-[#777]">
          Drag and drop your file here,
          <br />
          or <span className="text-[#FF6B35]">browse</span>
        </p>
        <p className="mt-1 text-[8px] text-[#aaa]">
          Supports: PDF, JPG, PNG (Max. 25MB)
        </p>
      </button>

      <button
        type="button"
        className="mb-8 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(255,107,53,0.3)] transition hover:bg-[#f15f2c]"
      >
        <Send size={14} />
        Send for Review
      </button>

      <h4 className="mb-3 text-[12px] font-bold text-black">Submitted files</h4>

      <div className="space-y-3">
        {reviewFiles.map((file) => (
          <div key={file.id} className="rounded-lg border border-[#eeeeee] bg-white px-3 py-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${file.iconClass}`}
                >
                  <FileText size={16} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black text-black">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[#999]">{file.meta}</p>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold ${file.statusClass}`}
              >
                {file.status}
              </span>
            </div>

            {file.note ? (
              <p className="mb-2 text-[9px] font-medium text-[#777]">{file.note}</p>
            ) : null}

            <div className="flex items-center gap-1">
              <span className="text-[8px] text-[#aaa]">Reviewed by</span>
              <div className="flex -space-x-1">
                {file.reviewers.map((reviewer, index) => (
                  <AvatarBubble
                    key={`${file.id}-${reviewer}-${index}`}
                    label={reviewer}
                    index={index + 2}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function Column({
  title,
  count,
  colorClass,
  tasks,
  onAddTask,
  onToggleSubtask,
  onDeleteTask,
}) {
  return (
    <section>
      <StatusHeading title={title} count={count} colorClass={colorClass} />

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleSubtask={onToggleSubtask}
            onDeleteTask={onDeleteTask}
          />
        ))}

        {title !== "Done" ? (
          <button
            type="button"
            onClick={onAddTask}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#f0cfc1] bg-[#fff3ee] text-[13px] font-semibold text-black transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
          >
            <Plus size={15} />
            Add task
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AddTaskModal({
  open,
  form,
  onClose,
  onChange,
  onSubtaskChange,
  onAddSubtask,
  onRemoveSubtask,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-[640px] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-[22px] font-black text-black">Add Task</h2>
            <p className="mt-1 text-[13px] font-medium text-[#777]">
              Enter task details and add subtasks below.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-black transition hover:bg-red-50 hover:text-red-500"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2">
              <span className="mb-2 block text-[12px] font-black text-[#555]">
                Task Title
              </span>
              <input
                value={form.title}
                onChange={(event) => onChange("title", event.target.value)}
                placeholder="Enter task title"
                className="h-11 w-full rounded-lg border border-[#dedede] px-3 text-[14px] font-medium outline-none transition focus:border-[#FF6B35]"
              />
            </label>

            <label>
              <span className="mb-2 block text-[12px] font-black text-[#555]">
                Category Tags
              </span>
              <input
                value={form.categories}
                onChange={(event) => onChange("categories", event.target.value)}
                placeholder="Example: DESIGN, PRINT"
                className="h-11 w-full rounded-lg border border-[#dedede] px-3 text-[14px] font-medium outline-none transition focus:border-[#FF6B35]"
              />
            </label>

            <label>
              <span className="mb-2 block text-[12px] font-black text-[#555]">
                Members
              </span>
              <input
                value={form.members}
                onChange={(event) => onChange("members", event.target.value)}
                placeholder="Example: SM, TL"
                className="h-11 w-full rounded-lg border border-[#dedede] px-3 text-[14px] font-medium outline-none transition focus:border-[#FF6B35]"
              />
            </label>

            <label>
              <span className="mb-2 block text-[12px] font-black text-[#555]">
                Status
              </span>
              <select
                value={form.status}
                onChange={(event) => onChange("status", event.target.value)}
                className="h-11 w-full rounded-lg border border-[#dedede] bg-white px-3 text-[14px] font-medium outline-none transition focus:border-[#FF6B35]"
              >
                <option value="todo">To Do</option>
                <option value="progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[12px] font-black text-[#555]">
                Progress %
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(event) => onChange("progress", event.target.value)}
                className="h-11 w-full rounded-lg border border-[#dedede] px-3 text-[14px] font-medium outline-none transition focus:border-[#FF6B35]"
              />
            </label>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="block text-[12px] font-black text-[#555]">
                Subtasks
              </span>

              <button
                type="button"
                onClick={onAddSubtask}
                className="flex items-center gap-1 text-[12px] font-bold text-[#FF6B35]"
              >
                <Plus size={14} />
                Add subtask
              </button>
            </div>

            <div className="space-y-2">
              {form.subtasks.map((subtask, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={subtask}
                    onChange={(event) => onSubtaskChange(index, event.target.value)}
                    placeholder={`Subtask ${index + 1}`}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#dedede] px-3 text-[14px] font-medium outline-none transition focus:border-[#FF6B35]"
                  />

                  <button
                    type="button"
                    onClick={() => onRemoveSubtask(index)}
                    disabled={form.subtasks.length === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-[#dedede] px-5 text-[14px] font-bold text-black transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="h-10 rounded-lg bg-[#FF6B35] px-5 text-[14px] font-bold text-white transition hover:bg-[#f15f2c]"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserProjectDetails() {
  const { projectId } = useParams();
  const { profile } = useAuth();

  const [project, setProject] = useState(fallbackProject);
  const [tasks, setTasks] = useState(fallbackTasks);
  const [loading, setLoading] = useState(true);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(blankTaskForm);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [projectResponse, taskResponse] = await Promise.allSettled([
          getProjects(profile),
          getTasks(profile),
        ]);

        if (!active) return;

        if (projectResponse.status === "fulfilled") {
          const rawProjects = Array.isArray(projectResponse.value)
            ? projectResponse.value
            : projectResponse.value?.projects || projectResponse.value?.data || [];

          const matchedProject =
            rawProjects.find((item, index) => getProjectId(item, index) === projectId) ||
            rawProjects[0];

          if (matchedProject) {
            setProject({
              id: getProjectId(matchedProject),
              name: getProjectName(matchedProject),
              priority: matchedProject.priority || matchedProject.status || "High",
              created: formatDateTime(
                matchedProject.createdAt || matchedProject.created_at,
                fallbackProject.created
              ),
              deadline: formatDateTime(
                matchedProject.deadline ||
                  matchedProject.dueDate ||
                  matchedProject.endDate ||
                  matchedProject.end_date,
                fallbackProject.deadline
              ),
              description: getProjectDescription(matchedProject),
            });
          }
        }

        if (taskResponse.status === "fulfilled") {
          const rawTasks = Array.isArray(taskResponse.value)
            ? taskResponse.value
            : taskResponse.value?.tasks || taskResponse.value?.data || [];

          const projectTasks = rawTasks.filter((task) => {
            const taskProjectId = getTaskProjectId(task);
            return taskProjectId === projectId;
          });

          if (projectTasks.length > 0) {
            setTasks(projectTasks.map(normalizeTask));
          }
        }
      } catch {
        setProject(fallbackProject);
        setTasks(fallbackTasks);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (profile) {
      loadData();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [profile, projectId]);

  const groupedTasks = useMemo(() => {
    return {
      todo: tasks.filter((task) => task.status === "todo"),
      progress: tasks.filter((task) => task.status === "progress"),
      done: tasks.filter((task) => task.status === "done"),
    };
  }, [tasks]);

  function openAddTask(status) {
    setTaskForm({
      ...blankTaskForm,
      status,
      progress: status === "done" ? 100 : status === "progress" ? 30 : 0,
    });
    setTaskModalOpen(true);
  }

  function updateTaskForm(field, value) {
    setTaskForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateSubtask(index, value) {
    setTaskForm((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((subtask, subtaskIndex) =>
        subtaskIndex === index ? value : subtask
      ),
    }));
  }

  function addSubtaskField() {
    setTaskForm((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, ""],
    }));
  }

  function removeSubtaskField(index) {
    setTaskForm((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, subtaskIndex) => subtaskIndex !== index),
    }));
  }

  function submitAddTask(event) {
    event.preventDefault();

    const title = taskForm.title.trim();

    if (!title) {
      alert("Please enter task title.");
      return;
    }

    const categories = taskForm.categories
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

    const members = taskForm.members
      .split(",")
      .map((item) => getInitials(item.trim()))
      .filter(Boolean);

    const cleanSubtasks = taskForm.subtasks
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({
        title: item,
        done: taskForm.status === "done",
      }));

    const finalSubtasks =
      cleanSubtasks.length > 0
        ? cleanSubtasks
        : [
            {
              title: "Checklist item",
              done: taskForm.status === "done",
            },
          ];

    const manualProgress = Math.max(
      0,
      Math.min(100, Number(taskForm.progress) || 0)
    );

    const finalProgress =
      taskForm.status === "done"
        ? 100
        : taskForm.status === "todo"
        ? 0
        : manualProgress;

    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        status: taskForm.status,
        category: categories.length ? categories : ["NEW"],
        title,
        progress: finalProgress,
        members: members.length ? members : ["ME"],
        extra: 0,
        subtasks: finalSubtasks,
      },
    ]);

    setTaskModalOpen(false);
    setTaskForm(blankTaskForm);
  }

  function toggleSubtask(taskId, subtaskIndex) {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const updatedSubtasks = task.subtasks.map((subtask, index) =>
          index === subtaskIndex
            ? {
                ...subtask,
                done: !subtask.done,
              }
            : subtask
        );

        const updatedProgress = calculateTaskProgress(updatedSubtasks, task.progress);
        const updatedStatus = calculateTaskStatus(task.status, updatedSubtasks);

        return {
          ...task,
          subtasks: updatedSubtasks,
          progress: updatedStatus === "done" ? 100 : updatedProgress,
          status: updatedStatus,
        };
      })
    );
  }

  function deleteTask(taskId) {
    const confirmDelete = window.confirm("Delete this task?");

    if (!confirmDelete) return;

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-white px-9 py-8 text-black">
      {loading ? (
        <p className="text-[14px] font-semibold text-[#777]">Loading project...</p>
      ) : null}

      <section className="mb-7 flex min-h-[112px] items-center justify-between rounded-2xl bg-[#fff8f0] px-10 py-7">
        <div className="flex items-center gap-4">
          <h1 className="text-[32px] font-medium tracking-[-0.03em] text-[#4b4b4b]">
            {project.name}
          </h1>

          <span className="rounded-full bg-[#ef405b] px-5 py-2 text-[13px] font-black text-white">
            {project.priority || "High"}
          </span>
        </div>

        <div className="flex items-center gap-12">
          <div>
            <p className="text-[12px] font-black uppercase text-[#5d5d5d]">
              Created
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[#FF6B35]">
              {project.created}
            </p>
          </div>

          <div>
            <p className="text-[12px] font-black uppercase text-[#5d5d5d]">
              Deadline
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[#FF6B35]">
              {project.deadline}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-[14px] font-black text-[#555]">Description</h2>
        <p className="max-w-[1160px] text-[14px] font-medium leading-7 text-[#8a8a8a]">
          {project.description}
        </p>
      </section>

      <div className="grid grid-cols-[1fr_1fr_1fr_270px] gap-5">
        <Column
          title="To Do"
          count={groupedTasks.todo.length}
          colorClass="bg-[#7c8795]"
          tasks={groupedTasks.todo}
          onAddTask={() => openAddTask("todo")}
          onToggleSubtask={toggleSubtask}
          onDeleteTask={deleteTask}
        />

        <Column
          title="In Progress"
          count={groupedTasks.progress.length}
          colorClass="bg-[#4e8af7]"
          tasks={groupedTasks.progress}
          onAddTask={() => openAddTask("progress")}
          onToggleSubtask={toggleSubtask}
          onDeleteTask={deleteTask}
        />

        <Column
          title="Done"
          count={groupedTasks.done.length}
          colorClass="bg-[#20bf9f]"
          tasks={groupedTasks.done}
          onAddTask={() => openAddTask("done")}
          onToggleSubtask={toggleSubtask}
          onDeleteTask={deleteTask}
        />

        <ReviewPanel />
      </div>

      <AddTaskModal
        open={taskModalOpen}
        form={taskForm}
        onClose={() => setTaskModalOpen(false)}
        onChange={updateTaskForm}
        onSubtaskChange={updateSubtask}
        onAddSubtask={addSubtaskField}
        onRemoveSubtask={removeSubtaskField}
        onSubmit={submitAddTask}
      />
    </div>
  );
}