import { CalendarDays, OctagonX, PauseCircle, Pencil, PlayCircle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "./Badge";
import Button from "./Button";

export default function ProjectCard({ project, manager, members = [], canManage, onEdit, onDelete, onStatusChange }) {
  return (
    <article className="card overflow-hidden">
      <div className="border-b border-valencia-line bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge value={project.status} />
              <span className="label">{project.projectCode || project.id}</span>
            </div>
            <Link to={`/projects/${project.id}`} className="text-2xl font-black leading-tight text-valencia-navy hover:text-valencia-orangeDark">
              {project.name}
            </Link>
            <p className="mt-3 text-sm leading-6 text-valencia-ink">{project.description}</p>
          </div>
          <Badge value={project.priority} />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-valencia-ink">Progress</span>
            <span className="font-black text-valencia-orangeDark">{project.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div className="h-full rounded-full bg-valencia-orange" style={{ width: `${project.progress || 0}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-5 text-sm">
        <div>
          <p className="label">Manager</p>
          <p className="mt-1 font-semibold">{manager?.name || "Unassigned"}</p>
        </div>
        <div>
          <p className="label">Department</p>
          <p className="mt-1 font-semibold">{project.department}</p>
        </div>
        <div>
          <p className="label">Timeline</p>
          <p className="mt-1 flex items-center gap-1 font-semibold">
            <CalendarDays size={15} />
            {project.startDate} - {project.deadline}
          </p>
        </div>
        <div>
          <p className="label">Team</p>
          <p className="mt-1 font-semibold">{members.length} members</p>
        </div>
      </div>

      {canManage ? (
        <div className="grid gap-2 border-t border-valencia-line p-4 sm:grid-cols-2 xl:grid-cols-5">
          <Button variant="secondary" icon={Pencil} onClick={() => onEdit(project)}>
            Edit
          </Button>
          <Button variant="ghost" icon={PlayCircle} onClick={() => onStatusChange(project, "active")}>
            Start
          </Button>
          <Button variant="ghost" icon={PauseCircle} onClick={() => onStatusChange(project, "on_hold")}>
            Pause
          </Button>
          <Button variant="ghost" className="text-red-700" icon={OctagonX} onClick={() => onStatusChange(project, "cancelled")}>
            Abort
          </Button>
          <Button variant="ghost" className="text-red-700" icon={Trash2} onClick={() => onDelete(project)}>
            Delete
          </Button>
        </div>
      ) : null}
    </article>
  );
}
