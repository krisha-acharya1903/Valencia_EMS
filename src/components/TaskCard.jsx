import { AlertTriangle, CalendarDays, CheckCircle2, Send, SlidersHorizontal } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";

export default function TaskCard({ task, canManage, canSubmit, canReview, onEdit, onSubmit, onReview }) {
  return (
    <article className="card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black leading-tight text-valencia-navy">{task.title}</h3>
            <p className="mt-1 text-sm text-valencia-muted">By: {task.employee?.name || "Unassigned"}</p>
          </div>
          
        </div>

        <p className="mt-4 text-sm leading-6 text-valencia-ink">{task.description}</p>

        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label">Project</p>
            <p className="mt-1 font-semibold">{task.project?.name || task.projectId}</p>
          </div>
          <div>
            <p className="label">Status</p>
            <div className="mt-1">
              <Badge value={task.status} />
            </div>
          </div>
          <div>
            <p className="label">Due Date</p>
            <p className="mt-1 flex items-center gap-1 font-semibold">
              <CalendarDays size={15} />
              {task.dueDate}
            </p>
          </div>
          <div>
            <p className="label">Submission</p>
            <p className="mt-1 font-semibold">{task.submission?.status?.replaceAll("_", " ") || "Not submitted"}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-semibold">Completion</span>
            <span className="font-black text-valencia-orangeDark">{task.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-valencia-orange" style={{ width: `${task.progress || 0}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 border-t border-valencia-line p-4 sm:grid-cols-3">
        {canSubmit ? (
          <Button variant="primary" icon={Send} onClick={() => onSubmit(task)}>
            Submit Work
          </Button>
        ) : null}
        {canReview && task.submission ? (
          <Button variant="dark" icon={CheckCircle2} onClick={() => onReview(task.submission)}>
            Review
          </Button>
        ) : null}
        {canManage ? (
          <Button variant="secondary" icon={SlidersHorizontal} onClick={() => onEdit(task)}>
            Edit Task
          </Button>
        ) : null}
        {task.status === "overdue" ? (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            <AlertTriangle size={16} />
            Overdue
          </div>
        ) : null}
      </div>
    </article>
  );
}
