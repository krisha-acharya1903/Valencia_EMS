const toneClasses = {
  orange: "bg-orange-50 text-valencia-orangeDark",
  blue: "bg-blue-50 text-valencia-ink",
  green: "bg-lime-100 text-green-700",
  red: "bg-red-50 text-red-700",
  navy: "bg-valencia-navy text-white",
};

export default function StatCard({ label, value, meta, icon: Icon, tone = "orange", className = "" }) {
  return (
    <article className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClasses[tone] || toneClasses.orange}`}>
          {Icon ? <Icon size={18} /> : null}
        </div>
        {meta ? <div className="text-xs font-semibold text-green-700">{meta}</div> : null}
      </div>
      <p className="label mt-6">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-valencia-navy">{value}</p>
    </article>
  );
}
