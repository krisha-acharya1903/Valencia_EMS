import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ClipboardList,
  Download,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import {
  createEmployeeSubtask,
  deleteEmployeeSubtask,
  downloadEmployeeSubtaskAttachment,
  getEmployeeProjectBoard,
  submitEmployeeSubtask,
  updateEmployeeSubtaskStatus,
} from "../services/employeeProjectBoardService";

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function isSubtaskDone(subtask) {
  const status = clean(subtask?.status);

  return (
    subtask?.completed === true ||
    status === "completed" ||
    status === "complete" ||
    status === "done" ||
    status === "finished"
  );
}

function getTaskStage(task) {
  const status = clean(task?.status);
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const completedCount = subtasks.filter(isSubtaskDone).length;

  const hasAdminReview =
    Boolean(task?.reviewedAt) ||
    Boolean(task?.reviewed_at) ||
    Boolean(task?.reviewedBy) ||
    Boolean(task?.reviewed_by);

  /*
    Done should happen ONLY after admin approval.
    If all subtasks are completed but admin has not approved,
    show task in Under Review.
  */
  if (subtasks.length > 0 && completedCount === subtasks.length && !hasAdminReview) {
    return "review";
  }

  if (
    status === "under review" ||
    status === "underreview" ||
    status === "review" ||
    status === "pending review"
  ) {
    return "review";
  }

  if (
    hasAdminReview &&
    (status === "completed" ||
      status === "complete" ||
      status === "done" ||
      status === "finished")
  ) {
    return "done";
  }

  if (subtasks.length === 0) return "todo";

  if (completedCount === 0) return "todo";

  return "progress";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTaskDeadline(task) {
  return (
    task?.dueDate ||
    task?.due_date ||
    task?.deadline ||
    task?.endDate ||
    task?.end_date ||
    task?.toDate ||
    task?.to_date ||
    ""
  );
}

function getProgress(task) {
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];

  if (subtasks.length === 0) return 0;

  const completedCount = subtasks.filter(isSubtaskDone).length;

  return Math.round((completedCount / subtasks.length) * 100);
}

function getCompletedCount(task) {
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
  return subtasks.filter(isSubtaskDone).length;
}

function stageLabel(stage) {
  if (stage === "progress") return "In Progress";
  if (stage === "review") return "Under Review";
  if (stage === "done") return "Done";
  return "To Do";
}

function stageTone(stage) {
  if (stage === "review") {
    return {
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700",
      border: "border-amber-100",
      header: "text-amber-700",
      progress: "bg-amber-500",
    };
  }

  if (stage === "done") {
    return {
      dot: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700",
      border: "border-emerald-100",
      header: "text-emerald-700",
      progress: "bg-emerald-500",
    };
  }

  if (stage === "progress") {
    return {
      dot: "bg-blue-500",
      badge: "bg-blue-50 text-blue-700",
      border: "border-blue-100",
      header: "text-blue-700",
      progress: "bg-blue-500",
    };
  }

  return {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700",
    border: "border-slate-100",
    header: "text-slate-700",
    progress: "bg-[#FF6B35]",
  };
}

function EmptyColumn({ stage }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-white/60 px-4 py-10 text-center">
      <ClipboardList size={28} className="mx-auto mb-3 text-[#FF6B35]" />
      <p className="text-[13px] font-black text-black">
        No {stageLabel(stage).toLowerCase()} tasks
      </p>
      <p className="mt-1 text-[12px] font-semibold text-[#888]">
        Tasks move here automatically.
      </p>
    </div>
  );
}

function TaskCard({
  task,
  expanded,
  onToggleExpand,
  newSubtaskText,
  setNewSubtaskText,
  onAddSubtask,
  onOpenSubtask,
  onToggleSubtaskStatus,
  onDeleteSubtask,
  actionLoading,
}) {
  const stage = getTaskStage(task);
  const tone = stageTone(stage);
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : [];
  const progress = getProgress(task);
  const completedCount = getCompletedCount(task);

  return (
    <div
      className={`rounded-3xl border ${tone.border} bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)]`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#fff0ea] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#FF6B35]">
              {task.priority || "Medium"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${tone.badge}`}
            >
              {stageLabel(stage)}
            </span>
          </div>

          <h3 className="text-[16px] font-black leading-6 text-black">
            {task.title || task.name || "Main Task"}
          </h3>

          {task.description ? (
            <p className="mt-2 text-[12px] font-semibold leading-5 text-[#777]">
              {task.description}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 rounded-2xl bg-[#fff7f2] px-3 py-2 text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#999]">
            Deadline
          </p>
          <p className="mt-1 whitespace-nowrap text-[11px] font-black text-[#FF6B35]">
            {formatDate(getTaskDeadline(task))}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-[12px] font-black text-[#777]">
          <span>{progress}% completed</span>
          <span>
            {completedCount}/{subtasks.length} subtasks
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[#eef1f6]">
          <div
            className={`h-full rounded-full ${tone.progress} transition-all duration-700`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggleExpand(task.id)}
        className="flex h-11 w-full items-center justify-between rounded-2xl border border-[#ffe1d6] bg-[#fff8f4] px-4 text-left transition hover:bg-[#fff0ea]"
      >
        <span className="flex items-center gap-2">
          <ClipboardList size={16} className="text-[#FF6B35]" />
          <span className="text-[13px] font-black text-black">Subtasks</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#FF6B35]">
            {subtasks.length}
          </span>
        </span>

        <span className="flex items-center gap-2 text-[12px] font-black text-[#777]">
          {expanded ? "Hide" : "Show"}
          {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </span>
      </button>

      {expanded ? (
        <div className="mt-4">
          <div className="mb-4 space-y-2">
            {subtasks.length ? (
              subtasks.map((subtask) => {
                const completed = isSubtaskDone(subtask);

                return (
                  <div
                    key={subtask.id}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-300 ${
                      completed
                        ? "border-emerald-100 bg-emerald-50/70"
                        : "border-[#eeeeee] bg-[#fbfbfb]"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={actionLoading === `toggle-${subtask.id}`}
                      onClick={() => onToggleSubtaskStatus(task, subtask)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                        completed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-[#d0d5dd] bg-white text-[#999] hover:border-[#FF6B35] hover:text-[#FF6B35]"
                      } disabled:opacity-60`}
                      title={completed ? "Mark as pending" : "Mark as complete"}
                    >
                      {actionLoading === `toggle-${subtask.id}` ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : completed ? (
                        <CheckCircle2 size={15} />
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSubtask(task, subtask)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p
                        className={`truncate text-[13px] font-black ${
                          completed
                            ? "text-emerald-700 line-through decoration-2"
                            : "text-black"
                        }`}
                      >
                        {subtask.title || subtask.name || "Subtask"}
                      </p>

                      <p className="mt-0.5 text-[10px] font-semibold text-[#999]">
                        {subtask.submittedAt
                          ? `Submitted ${formatDateTime(subtask.submittedAt)}`
                          : "Click to add description / file"}
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading === `delete-${subtask.id}`}
                      onClick={() => onDeleteSubtask(task, subtask)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#999] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-60"
                      title="Delete subtask"
                    >
                      {actionLoading === `delete-${subtask.id}` ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-[#fffaf7] px-4 py-5 text-center">
                <p className="text-[12px] font-black text-black">
                  No subtasks yet
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#888]">
                  Add your first subtask below.
                </p>
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              onAddSubtask(task);
            }}
            className="flex items-center gap-2 rounded-2xl border border-[#ffe1d6] bg-[#fff8f4] p-2"
          >
            <input
              value={newSubtaskText}
              onChange={(event) =>
                setNewSubtaskText(task.id, event.target.value)
              }
              placeholder="Add subtask only..."
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[13px] font-bold text-black outline-none placeholder:text-[#aaa]"
            />

            <button
              type="submit"
              disabled={actionLoading === `add-${task.id}`}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-[12px] font-black text-white shadow-[0_10px_20px_rgba(255,107,53,0.22)] transition hover:bg-[#ef5f2d] disabled:opacity-60"
            >
              {actionLoading === `add-${task.id}` ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              Add
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function SubtaskSubmitModal({
  selected,
  description,
  setDescription,
  link,
  setLink,
  file,
  setFile,
  onClose,
  onSubmit,
  onDownload,
  submitting,
}) {
  if (!selected) return null;

  const { task, subtask } = selected;

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowed.includes(selectedFile.type)) {
      toast.error("Only PDF, JPG, PNG, DOC, or DOCX files are allowed.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File must be 5MB or smaller.");
      return;
    }

    setFile(selectedFile);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-5 py-8">
      <div className="max-h-[92vh] w-full max-w-[900px] overflow-y-auto rounded-[28px] border border-[#eadfd9] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.25)]">
        <div className="rounded-t-[28px] bg-[#fff5ef] px-8 py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[30px] font-black leading-tight text-black">
                {subtask.title || "Subtask"}
              </h2>

              <p className="mt-2 text-[13px] font-semibold text-[#777]">
                Main task:{" "}
                <span className="font-black text-[#FF6B35]">
                  {task.title || task.name || "Task"}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 transition hover:bg-red-50 disabled:opacity-50"
            >
              <X size={21} />
            </button>
          </div>
        </div>

        <div className="px-8 py-7">
          <label className="mb-2 block text-[13px] font-black text-black">
            Description Optional
          </label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add description..."
            className="mb-5 min-h-[120px] w-full resize-none rounded-2xl border border-[#e5e7eb] px-4 py-4 text-[14px] font-semibold text-black outline-none transition focus:border-[#FF6B35]"
          />

          <label className="mb-2 block text-[13px] font-black text-black">
            Add Attachment Optional
          </label>

          <label className="mb-4 flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#ffd8c8] bg-[#fff8f4] px-4 py-5 text-center transition hover:bg-[#fff0ea]">
            <UploadCloud size={22} className="mb-2 text-[#FF6B35]" />

            {file ? (
              <span className="text-[13px] font-black text-black">
                {file.name}
              </span>
            ) : (
              <span className="text-[13px] font-semibold text-[#777]">
                Drag and drop your file here, or{" "}
                <span className="font-black text-[#FF6B35]">browse</span>
              </span>
            )}

            <span className="mt-1 text-[11px] font-semibold text-[#aaa]">
              Supports PDF, JPG, PNG, DOC, DOCX. Max 5MB.
            </span>

            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileChange}
            />
          </label>

          {file ? (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-[#eeeeee] bg-white px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip size={16} className="shrink-0 text-[#FF6B35]" />
                <span className="truncate text-[13px] font-black text-black">
                  {file.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-[12px] font-black text-red-500"
              >
                Remove
              </button>
            </div>
          ) : null}

          {subtask.hasAttachment ? (
            <button
              type="button"
              onClick={() => onDownload(subtask)}
              className="mb-4 flex h-10 items-center gap-2 rounded-xl border border-orange-100 bg-[#fff7f2] px-4 text-[13px] font-black text-[#FF6B35]"
            >
              <Download size={16} />
              Download submitted file
            </button>
          ) : null}

          <div className="mb-3 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#eeeeee]" />
            <span className="text-[12px] font-semibold text-[#aaa]">
              or paste link
            </span>
            <div className="h-px flex-1 bg-[#eeeeee]" />
          </div>

          <div className="mb-5 flex h-12 items-center gap-3 rounded-2xl border border-[#e5e7eb] px-4">
            <LinkIcon size={17} className="text-[#aaa]" />
            <input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="http://"
              className="h-full flex-1 bg-transparent text-[14px] font-semibold text-black outline-none placeholder:text-[#aaa]"
            />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] text-[14px] font-black text-white shadow-[0_14px_28px_rgba(255,107,53,0.28)] transition hover:bg-[#ef5f2d] disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [newSubtasks, setNewSubtasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const [selectedSubtask, setSelectedSubtask] = useState(null);
  const [submissionDescription, setSubmissionDescription] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadBoard() {
    try {
      setLoading(true);

      const data = await getEmployeeProjectBoard(projectId);

      setProject(data?.project || null);
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);

      const initialExpanded = {};
      (Array.isArray(data?.tasks) ? data.tasks : []).forEach((task) => {
        initialExpanded[String(task.id)] = false;
      });

      setExpandedTasks(initialExpanded);
    } catch (error) {
      console.error("Employee project board load error:", error);
      toast.error(error?.message || "Failed to load project.");
      setProject(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, [projectId]);

  const groupedTasks = useMemo(() => {
    const groups = {
      todo: [],
      progress: [],
      review: [],
      done: [],
    };

    tasks.forEach((task) => {
      groups[getTaskStage(task)].push(task);
    });

    return groups;
  }, [tasks]);

  function toggleTaskExpand(taskId) {
    setExpandedTasks((current) => ({
      ...current,
      [String(taskId)]: !current[String(taskId)],
    }));
  }

  function setNewSubtaskText(taskId, value) {
    setNewSubtasks((current) => ({
      ...current,
      [taskId]: value,
    }));
  }

  function replaceTask(updatedTask) {
    if (!updatedTask?.id) return;

    setTasks((current) =>
      current.map((task) =>
        String(task.id) === String(updatedTask.id) ? updatedTask : task
      )
    );
  }

  function openSubtask(task, subtask) {
    setSelectedSubtask({
      mode: "edit",
      task,
      subtask,
    });

    setSubmissionDescription(subtask.submissionDescription || "");
    setSubmissionLink(subtask.submissionLink || "");
    setSubmissionFile(null);
  }

  function closeSubtask() {
    if (submitting) return;

    setSelectedSubtask(null);
    setSubmissionDescription("");
    setSubmissionLink("");
    setSubmissionFile(null);
  }

  async function handleAddSubtask(task) {
    const title = String(newSubtasks[task.id] || "").trim();

    if (!title) {
      toast.error("Subtask name is required.");
      return;
    }

    setSelectedSubtask({
      mode: "create",
      task,
      subtask: {
        id: "__new__",
        title,
        name: title,
        status: "Pending",
        completed: false,
      },
    });

    setSubmissionDescription("");
    setSubmissionLink("");
    setSubmissionFile(null);
  }

  async function handleToggleSubtaskStatus(task, subtask) {
    const completed = !isSubtaskDone(subtask);

    try {
      setActionLoading(`toggle-${subtask.id}`);

      const data = await updateEmployeeSubtaskStatus(subtask.id, completed);

      replaceTask(data?.task);

      toast.success(
        completed
          ? "Subtask marked as completed."
          : "Subtask moved back to pending."
      );
    } catch (error) {
      console.error("Toggle subtask status error:", error);
      toast.error(error?.message || "Failed to update subtask.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSubmitSubtask() {
    if (!selectedSubtask?.task?.id || !selectedSubtask?.subtask) return;

    const description = submissionDescription.trim();
    const link = submissionLink.trim();

    try {
      setSubmitting(true);

      let createdSubtask = selectedSubtask.subtask;
      let updatedTask = null;

      if (selectedSubtask.mode === "create") {
        const createData = await createEmployeeSubtask(
          selectedSubtask.task.id,
          selectedSubtask.subtask.title
        );

        createdSubtask = createData?.subtask;
        updatedTask = createData?.task;

        if (!createdSubtask?.id) {
          throw new Error("Subtask was not created properly.");
        }
      }

      const submitData = await submitEmployeeSubtask(createdSubtask.id, {
        description,
        link,
        file: submissionFile,
      });

      const finalTask = submitData?.task || updatedTask;

      replaceTask(finalTask);

      setExpandedTasks((current) => ({
        ...current,
        [String(selectedSubtask.task.id)]: true,
      }));

      setNewSubtasks((current) => ({
        ...current,
        [selectedSubtask.task.id]: "",
      }));

      toast.success("Subtask saved. Tick the checkbox to complete it.");
      closeSubtask();
    } catch (error) {
      console.error("Submit subtask error:", error);
      toast.error(error?.message || "Failed to submit subtask.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSubtask(task, subtask) {
    const confirmed = window.confirm(`Delete subtask "${subtask.title}"?`);

    if (!confirmed) return;

    try {
      setActionLoading(`delete-${subtask.id}`);

      const data = await deleteEmployeeSubtask(subtask.id);

      replaceTask(data?.task);

      toast.success("Subtask deleted.");
    } catch (error) {
      console.error("Delete subtask error:", error);
      toast.error(error?.message || "Failed to delete subtask.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleDownloadAttachment(subtask) {
    try {
      await downloadEmployeeSubtaskAttachment(
        subtask.id,
        subtask.attachmentOriginalName || "subtask-attachment"
      );
    } catch (error) {
      toast.error(error?.message || "Failed to download attachment.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white px-8 py-8 text-black">
        <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-[#eeeeee] bg-white">
          <div className="flex items-center gap-3 text-[15px] font-black text-[#777]">
            <Loader2 size={20} className="animate-spin text-[#FF6B35]" />
            Loading project board...
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white px-8 py-8 text-black">
        <button
          type="button"
          onClick={() => navigate("/dashboard/projects")}
          className="mb-5 flex h-10 items-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-[13px] font-black text-white"
        >
          <ChevronLeft size={17} />
          Back
        </button>

        <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-[#eeeeee] bg-[#fffaf7] text-center">
          <div>
            <ClipboardList size={36} className="mx-auto mb-3 text-[#FF6B35]" />
            <h2 className="text-[20px] font-black text-black">
              Project not found
            </h2>
            <p className="mt-2 text-[14px] font-semibold text-[#777]">
              This project is missing or not assigned to you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "todo",
      title: "To Do",
      tasks: groupedTasks.todo,
    },
    {
      key: "progress",
      title: "In Progress",
      tasks: groupedTasks.progress,
    },
    {
      key: "review",
      title: "Under Review",
      tasks: groupedTasks.review,
    },
    {
      key: "done",
      title: "Done",
      tasks: groupedTasks.done,
    },
  ];

  return (
    <div className="min-h-screen bg-white px-8 py-7 text-black">
      <div className="mb-7 rounded-[28px] bg-[#fff8f4] px-8 py-7 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/dashboard/projects")}
              className="mb-5 flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-black text-[#FF6B35] shadow-sm transition hover:bg-[#fff0ea]"
            >
              <ChevronLeft size={17} />
              Back to Projects
            </button>

            <h1 className="text-[34px] font-black leading-tight text-black">
              {project.name || project.title || "Project"}
            </h1>

            <p className="mt-3 max-w-[900px] text-[14px] font-semibold leading-6 text-[#777]">
              {project.description ||
                "Complete all subtasks to send the main task for admin review."}
            </p>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-4 rounded-2xl bg-white/70 p-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777]">
                Created
              </p>
              <p className="mt-1 text-[13px] font-black text-[#FF6B35]">
                {formatDate(project.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777]">
                Deadline
              </p>
              <p className="mt-1 text-[13px] font-black text-[#FF6B35]">
                {formatDate(project.deadline)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777]">
                Department
              </p>
              <p className="mt-1 text-[13px] font-black text-black">
                {project.department || "-"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#777]">
                Progress
              </p>
              <p className="mt-1 text-[13px] font-black text-black">
                {project.progress || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#e5e7eb] bg-[#fffaf7] px-8 py-16 text-center">
          <ClipboardList size={42} className="mx-auto mb-4 text-[#FF6B35]" />
          <h2 className="text-[22px] font-black text-black">
            No main task assigned yet
          </h2>
          <p className="mx-auto mt-2 max-w-[520px] text-[14px] font-semibold leading-6 text-[#777]">
            Employee can add subtasks only after Admin creates at least one main
            task and assigns it to this employee.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-4">
          {columns.map((column) => {
            const tone = stageTone(column.key);

            return (
              <section
                key={column.key}
                className="min-h-[520px] rounded-[28px] border border-[#eeeeee] bg-[#fafafa] p-4"
              >
                <div className="mb-4 flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${tone.dot}`} />
                    <h2 className={`text-[17px] font-black ${tone.header}`}>
                      {column.title}
                    </h2>
                  </div>

                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-[12px] font-black text-[#777] shadow-sm">
                    {column.tasks.length}
                  </span>
                </div>

                <div className="space-y-4 transition-all duration-500">
                  {column.tasks.length ? (
                    column.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        expanded={Boolean(expandedTasks[String(task.id)])}
                        onToggleExpand={toggleTaskExpand}
                        newSubtaskText={newSubtasks[task.id] || ""}
                        setNewSubtaskText={setNewSubtaskText}
                        onAddSubtask={handleAddSubtask}
                        onOpenSubtask={openSubtask}
                        onToggleSubtaskStatus={handleToggleSubtaskStatus}
                        onDeleteSubtask={handleDeleteSubtask}
                        actionLoading={actionLoading}
                      />
                    ))
                  ) : (
                    <EmptyColumn stage={column.key} />
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-orange-100 bg-[#fff7f2] px-5 py-4">
        <p className="text-[13px] font-black text-black">Status rule:</p>
        <p className="mt-1 text-[13px] font-semibold leading-6 text-[#777]">
          Submit saves description, file, or link only. Tick the checkbox to
          complete a subtask. Once all subtasks are completed, the main task moves
          to <b> Under Review</b>. Only after Admin approves it, the task moves
          to <b> Done</b>.
        </p>
      </div>

      <SubtaskSubmitModal
        selected={selectedSubtask}
        description={submissionDescription}
        setDescription={setSubmissionDescription}
        link={submissionLink}
        setLink={setSubmissionLink}
        file={submissionFile}
        setFile={setSubmissionFile}
        onClose={closeSubtask}
        onSubmit={handleSubmitSubtask}
        onDownload={handleDownloadAttachment}
        submitting={submitting}
      />
    </div>
  );
}