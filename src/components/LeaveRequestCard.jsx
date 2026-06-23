import { CalendarDays } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";

export default function LeaveRequestCard({ request, user, canReview, onApprove, onReject }) {
  return (
    <article className="rounded-md border border-valencia-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-valencia-ink">
            <CalendarDays size={18} />
          </div>
          <div>
            <h3 className="font-bold text-valencia-navy">{request.leaveType}</h3>
            <p className="text-sm text-valencia-muted">{user?.name || "Employee"} - {request.startDate} - {request.endDate}</p>
          </div>
        </div>
        <Badge value={request.status} />
      </div>
      <p className="mt-3 text-sm text-valencia-ink">{request.reason}</p>
      {request.adminComment ? <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-valencia-muted">{request.adminComment}</p> : null}
      {canReview && request.status === "pending" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => onApprove(request)}>
            Approve
          </Button>
          <Button variant="danger" onClick={() => onReject(request)}>
            Reject
          </Button>
        </div>
      ) : null}
    </article>
  );
}
