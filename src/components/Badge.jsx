const tones = {
  active: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  approved: "bg-green-100 text-green-700",
  in_progress: "bg-orange-100 text-valencia-orangeDark",
  review: "bg-blue-100 text-blue-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-blue-100 text-blue-700",
  pending: "bg-orange-100 text-valencia-orangeDark",
  changes_requested: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  blocked: "bg-red-100 text-red-700",
  overdue: "bg-red-100 text-red-700",
  critical: "bg-red-50 text-red-700",
  high: "bg-orange-50 text-valencia-orangeDark",
  medium: "bg-slate-100 text-valencia-ink",
  low: "bg-blue-50 text-blue-700",
  inactive: "bg-slate-100 text-slate-600",
  todo: "bg-slate-100 text-slate-600",
  planning: "bg-blue-50 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

const format = (value) => String(value || "").replaceAll("_", " ");

export default function Badge({ value, children, className = "" }) {
  const key = String(value || children || "").toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${tones[key] || "bg-slate-100 text-slate-700"} ${className}`}>
      {children || format(value)}
    </span>
  );
}
