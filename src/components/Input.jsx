export default function Input({ label, error, className = "", icon: Icon, ...props }) {
  return (
    <label className="block">
      {label ? <span className="label mb-2 block">{label}</span> : null}
      <span className="relative block">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-valencia-muted" size={18} /> : null}
        <input
          className={`h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm text-valencia-navy outline-none transition placeholder:text-slate-400 focus:border-valencia-orange focus:ring-2 focus:ring-orange-100 ${Icon ? "pl-10" : ""} ${className}`}
          {...props}
        />
      </span>
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
