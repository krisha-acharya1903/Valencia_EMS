import { Clock } from "lucide-react";
import { useState } from "react";
import Badge from "./Badge";

const columns = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "In Review" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
];

export default function WorkProgressKanban({ tasks, onSelectTask, onStatusChange }) {
  const [draggedTaskId, setDraggedTaskId] = useState("");
  const [overColumn, setOverColumn] = useState("");

  const completeDrop = async (status) => {
    const task = tasks.find((item) => item.id === draggedTaskId);
    setDraggedTaskId("");
    setOverColumn("");
    if (task && task.status !== status) {
      await onStatusChange?.(task, status);
    }
  };

  return (
    <div className="grid gap-4 overflow-x-auto pb-2 scrollbar-thin lg:grid-cols-5">
      {columns.map((column) => {
        const items = tasks.filter((task) => task.status === column.key);
        return (
          <section
            key={column.key}
            onDragOver={(event) => {
              event.preventDefault();
              setOverColumn(column.key);
            }}
            onDragLeave={() => setOverColumn("")}
            onDrop={(event) => {
              event.preventDefault();
              completeDrop(column.key);
            }}
            className={`min-w-[260px] rounded-lg border bg-white p-3 transition ${overColumn === column.key ? "border-valencia-orange shadow-card" : "border-valencia-line"}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-black text-valencia-navy">{column.label}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{items.length}</span>
            </div>
            <div className="space-y-3">
              {items.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  draggable={Boolean(onStatusChange)}
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onDragEnd={() => {
                    setDraggedTaskId("");
                    setOverColumn("");
                  }}
                  onClick={() => onSelectTask?.(task)}
                  className={`w-full rounded-md border border-valencia-line bg-valencia-bg p-3 text-left transition hover:border-valencia-orange ${onStatusChange ? "cursor-grab active:cursor-grabbing" : ""} ${draggedTaskId === task.id ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold leading-tight">{task.title}</p>
                    
                  </div>
                  <p className="mt-2 text-xs text-valencia-muted">{task.employee?.name || "Unassigned"} - {task.project?.department}</p>
                  <p className="mt-1 text-xs text-valencia-muted">{task.project?.name}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
                    <div className="h-full rounded-full bg-valencia-orange" style={{ width: `${task.progress}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-valencia-muted">
                    <span className="flex items-center gap-1"><Clock size={13} /> {task.dueDate}</span>
                    <span>{new Date(task.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
              {!items.length ? <p className="rounded-md border border-dashed border-valencia-line p-4 text-center text-sm text-valencia-muted">No tasks</p> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
