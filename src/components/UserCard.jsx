import { BarChart3, CalendarDays, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "./Badge";
import Button from "./Button";

export default function UserCard({ user, onEdit, onSelect }) {
  const userId = user.uid || user.id;

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100 text-2xl font-black text-valencia-navy">
            {(user.name || "U").charAt(0).toUpperCase()}
          </div>

          <div>
            <h3 className="text-xl font-black">{user.name}</h3>
            <p className="text-sm text-valencia-muted">{user.email}</p>
          </div>
        </div>

        <Badge value={user.status || "active"} />
      </div>

      <div className="mt-5 border-t border-valencia-line pt-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="label">Department</p>
            <p className="mt-2 text-lg font-bold">{user.department || "-"}</p>
          </div>

          <div>
            <p className="label">Role</p>
            <p className="mt-2 text-lg font-bold capitalize">
              {user.role || "-"}
            </p>
          </div>

          <div>
            <p className="label">Designation</p>
            <p className="mt-2 text-lg font-bold">
              {user.designation || "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-valencia-line pt-5">
        <Button variant="ghost" icon={Edit3} onClick={() => onEdit(user)}>
          Edit
        </Button>

        <Link to={`/work-progress?userId=${userId}`}>
          <Button variant="ghost" icon={BarChart3} onClick={() => onSelect?.(user)}>
            Analytics
          </Button>
        </Link>

        <Link to={`/users/${userId}/attendance`}>
          <Button variant="ghost" icon={CalendarDays}>
            Attendance
          </Button>
        </Link>
      </div>
    </article>
  );
}