import { CheckCircle2, MessageSquareWarning, XCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import Badge from "./Badge";
import Button from "./Button";
import Modal from "./Modal";

export default function AdminReviewModal({ open, onClose, submission, task, user, onReview }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const review = async (action) => {
    if (["request_changes", "reject"].includes(action) && !comment.trim()) {
      toast.error("A review comment is required.");
      return;
    }
    setLoading(true);
    try {
      await onReview(action, comment);
      toast.success("Review saved.");
      setComment("");
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title="Review Submitted Work" onClose={onClose}>
      {submission ? (
        <div className="space-y-5">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-valencia-navy">{submission.title}</h3>
                <p className="mt-1 text-sm text-valencia-muted">
                  {user?.name || "Employee"} - {task?.title || submission.taskId}
                </p>
              </div>
              <Badge value={submission.status} />
            </div>
            <p className="mt-4 text-sm leading-6 text-valencia-ink">{submission.workSummary}</p>
            <p className="mt-3 text-sm font-bold text-valencia-orangeDark">{submission.completionPercentage}% complete</p>
          </div>

          {submission.proofLinks?.length ? (
            <div>
              <p className="label mb-2">Proof Links</p>
              {submission.proofLinks.map((link) => (
                <a key={link} href={link} target="_blank" rel="noreferrer" className="block text-sm font-semibold text-blue-700 underline">
                  {link}
                </a>
              ))}
            </div>
          ) : null}

          <label className="block">
            <span className="label mb-2 block">Review Comment</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-valencia-line px-3 py-2 text-sm outline-none focus:border-valencia-orange focus:ring-2 focus:ring-orange-100"
              placeholder="Required when requesting changes or rejecting."
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button disabled={loading} icon={CheckCircle2} onClick={() => review("approve")}>
              Approve
            </Button>
            <Button disabled={loading} variant="secondary" icon={MessageSquareWarning} onClick={() => review("request_changes")}>
              Request Changes
            </Button>
            <Button disabled={loading} variant="danger" icon={XCircle} onClick={() => review("reject")}>
              Reject
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
