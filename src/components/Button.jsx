const variants = {
  primary: "bg-valencia-orange text-white hover:bg-valencia-orangeDark focus:ring-valencia-orange",
  secondary: "border border-valencia-line bg-white text-valencia-ink hover:bg-slate-50 focus:ring-valencia-blue",
  ghost: "text-valencia-ink hover:bg-slate-100 focus:ring-valencia-blue",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300",
  dark: "bg-valencia-navy text-white hover:bg-slate-900 focus:ring-valencia-navy",
};

export default function Button({ children, className = "", variant = "primary", type = "button", icon: Icon, ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon ? <Icon size={18} /> : null}
      {children}
    </button>
  );
}
