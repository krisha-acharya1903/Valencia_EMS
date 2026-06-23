import { ArrowRight, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { resolveLandingPath } from "../services/authService";

const LOGO_PATH = `${import.meta.env.BASE_URL}valencia-logo.png`;

export default function Login() {
  const { login, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    identifier: "",
    password: "",
    remember: true,
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [theme, setTheme] = useState("dark");

  const isDark = theme === "dark";

  if (profile) {
    return <Navigate to={resolveLandingPath(profile)} replace />;
  }

  const update = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const email = String(form.identifier || "").trim().toLowerCase();
    const password = String(form.password || "");

    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const nextProfile = await login(email, password, form.remember);

      const firstName = nextProfile?.name
        ? nextProfile.name.split(" ")[0]
        : "User";

      toast.success(`Welcome back, ${firstName}`);

      const redirectPath =
        location.state?.from?.pathname || resolveLandingPath(nextProfile);

      navigate(redirectPath, {
        replace: true,
      });
    } catch (error) {
      toast.error(error?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${
        isDark ? "bg-[#25110b] text-white" : "bg-[#fff3ea] text-[#1f120d]"
      }`}
    >
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_36%,rgba(255,99,24,0.48),transparent_24%),radial-gradient(circle_at_72%_66%,rgba(243,121,42,0.42),transparent_26%),linear-gradient(135deg,#2a130d_0%,#4a1f11_44%,#24100b_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(135deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:900px_900px]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_36%,rgba(255,112,38,0.35),transparent_25%),radial-gradient(circle_at_72%_66%,rgba(255,172,92,0.48),transparent_28%),linear-gradient(135deg,#fff8f2_0%,#ffd8bd_45%,#fff4ea_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(120,50,20,0.05)_1px,transparent_1px),linear-gradient(135deg,rgba(120,50,20,0.04)_1px,transparent_1px)] bg-[size:900px_900px]" />
        </>
      )}

      <button
        type="button"
        onClick={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
        className={`absolute right-8 top-8 z-20 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-xl transition ${
          isDark
            ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
            : "border-orange-200 bg-white/70 text-[#3a1b10] hover:bg-white"
        }`}
        aria-label="Toggle theme"
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div
        className={`absolute left-1/2 top-[6%] h-[340px] w-[340px] -translate-x-[8%] rounded-full border ${
          isDark ? "border-white/5" : "border-orange-900/5"
        }`}
      />
      <div
        className={`absolute left-1/2 top-[10%] h-[230px] w-[230px] translate-x-[4%] rounded-full border ${
          isDark ? "border-white/5" : "border-orange-900/5"
        }`}
      />
      <div
        className={`absolute left-1/2 top-[14%] h-[135px] w-[135px] translate-x-[25%] rounded-full border ${
          isDark ? "border-white/5" : "border-orange-900/5"
        }`}
      />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div
          className={`w-full max-w-[595px] rounded-[28px] px-10 py-12 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition sm:px-14 sm:py-16 ${
            isDark
              ? "border border-white/20 bg-white/[0.095]"
              : "border border-white/70 bg-white/45 shadow-[0_28px_80px_rgba(156,68,25,0.24)]"
          }`}
        >
          <div className="mb-9 flex items-center justify-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
              {!logoError ? (
                <img
                  src={LOGO_PATH}
                  alt="Valencia Logo"
                  className="h-8 w-8 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6D35] text-xs font-black text-white">
                  VN
                </div>
              )}
            </div>

            <p
              className={`text-xs font-medium uppercase tracking-[0.34em] ${
                isDark ? "text-white/80" : "text-[#4c2818]/80"
              }`}
            >
              Valencia Nutritions
            </p>
          </div>

          <div>
            <h1
              className={`text-[32px] font-black leading-tight tracking-[-0.03em] sm:text-[38px] ${
                isDark ? "text-white" : "text-[#27130c]"
              }`}
            >
              Welcome back
            </h1>

            <p
              className={`mt-2 text-sm font-semibold ${
                isDark ? "text-white/35" : "text-[#6f4b3a]/70"
              }`}
            >
              Sign in to your super admin account
            </p>
          </div>

          <form className="mt-9 space-y-6" onSubmit={submit}>
            <div>
              <label
                className={`mb-3 block text-xs font-bold uppercase tracking-[0.22em] ${
                  isDark ? "text-white/55" : "text-[#6f4b3a]/75"
                }`}
              >
                Email Address
              </label>

              <input
                name="identifier"
                type="email"
                value={form.identifier}
                onChange={update}
                placeholder="admin@valencianutritions.com"
                autoComplete="username"
                className={`h-[56px] w-full rounded-2xl border px-5 text-sm font-bold outline-none transition ${
                  isDark
                    ? "border-white/55 bg-white/[0.075] text-white placeholder:text-white/70 focus:border-[#FF6D35] focus:bg-white/[0.11] focus:ring-4 focus:ring-[#FF6D35]/10"
                    : "border-[#8a5a43]/45 bg-white/55 text-[#2b160e] placeholder:text-[#6f4b3a]/65 focus:border-[#FF6D35] focus:bg-white/80 focus:ring-4 focus:ring-[#FF6D35]/15"
                }`}
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <label
                  className={`block text-xs font-bold uppercase tracking-[0.22em] ${
                    isDark ? "text-white/55" : "text-[#6f4b3a]/75"
                  }`}
                >
                  Password
                </label>

                <button
                  type="button"
                  onClick={() =>
                    toast("Please contact admin to reset your password.")
                  }
                  className={`text-xs font-semibold transition ${
                    isDark
                      ? "text-[#FF6D35]/80 hover:text-[#FF6D35]"
                      : "text-[#FF6D35] hover:text-[#e85c28]"
                  }`}
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={update}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`h-[56px] w-full rounded-2xl border px-5 pr-12 text-sm font-bold outline-none transition ${
                    isDark
                      ? "border-white/55 bg-white/[0.075] text-white placeholder:text-white/85 focus:border-[#FF6D35] focus:bg-white/[0.11] focus:ring-4 focus:ring-[#FF6D35]/10"
                      : "border-[#8a5a43]/45 bg-white/55 text-[#2b160e] placeholder:text-[#6f4b3a]/65 focus:border-[#FF6D35] focus:bg-white/80 focus:ring-4 focus:ring-[#FF6D35]/15"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className={`absolute right-5 top-1/2 -translate-y-1/2 transition ${
                    isDark
                      ? "text-white/35 hover:text-white/70"
                      : "text-[#6f4b3a]/55 hover:text-[#3a1b10]"
                  }`}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <label
              className={`flex cursor-pointer select-none items-center gap-3 text-sm font-bold ${
                isDark ? "text-white/70" : "text-[#4d2a1a]/75"
              }`}
            >
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={update}
                className="peer sr-only"
              />

              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[#FF6D35]/50 bg-[#FF6D35]/10 shadow-[0_0_18px_rgba(255,109,53,0.18)] transition peer-checked:border-[#FF6D35] peer-checked:bg-[#FF6D35]">
                <span className="h-[7px] w-[7px] rounded-full bg-white opacity-0 transition peer-checked:opacity-100" />
              </span>

              Keep me signed in
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group flex h-[62px] w-full items-center justify-center gap-3 rounded-2xl bg-[#FF6D35] text-sm font-black text-white shadow-[0_18px_35px_rgba(255,109,53,0.32)] transition hover:translate-y-[-1px] hover:bg-[#ff5f22] hover:shadow-[0_22px_45px_rgba(255,109,53,0.42)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing In..." : "Sign In"}

              {!loading ? (
                <ArrowRight
                  size={17}
                  className="transition group-hover:translate-x-1"
                />
              ) : null}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}