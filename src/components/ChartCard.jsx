export default function ChartCard({ title, eyebrow, children, action, className = "" }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="label mb-1">{eyebrow}</p> : null}
          <h2 className="text-lg font-bold text-valencia-navy">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
