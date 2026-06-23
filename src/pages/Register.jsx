import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { resolveLandingPath } from "../services/authService";

const departments = [
  "Aroma De Valencia",
  "Crunzzo",
  "Sales team",
  "Bounce Super Water",
  "ERP / Accounts / Finance",
  "High Altitude Water",
  "Natal care",
  "Vending Machine",
];

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  department: "Sales team",
  designation: "Team Member",
  role: "employee",
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;

    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setForm((current) => ({ ...current, phone: digitsOnly }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Name, email, and password are required.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    setLoading(true);

    try {
      const profile = await register(form);
      toast.success("Account created successfully.");
      navigate(resolveLandingPath(profile), { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-valencia-bg px-4 py-10 text-valencia-navy">
      <section className="w-full max-w-2xl rounded-xl bg-white px-6 py-8 shadow-lift sm:px-10">
        <h1 className="text-3xl font-black">Sign up</h1>

        <p className="mt-2 text-valencia-muted">
          Create your Valencia Nutrition EMS profile.
        </p>

        <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <Input
            label="Full Name"
            name="name"
            icon={UserRound}
            value={form.name}
            onChange={update}
            placeholder="Enter full name"
          />

          <Input
            label="Email"
            name="email"
            type="email"
            icon={Mail}
            value={form.email}
            onChange={update}
            placeholder="email@valencia.com"
          />

          <Input
            label="Phone"
            name="phone"
            icon={Phone}
            value={form.phone}
            onChange={update}
            placeholder="10-digit phone number"
            maxLength={10}
          />

          <div>
            <span className="label mb-2 block">Password</span>

            <div className="relative">
              <LockKeyhole
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className="h-11 w-full rounded-md border border-valencia-line bg-white px-11 pr-12 text-sm text-valencia-navy outline-none transition focus:border-valencia-orange focus:ring-2 focus:ring-valencia-orange/20"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-valencia-navy"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Input
            label="Designation"
            name="designation"
            value={form.designation}
            onChange={update}
          />

          <label className="block">
            <span className="label mb-2 block">Department</span>

            <select
              name="department"
              value={form.department}
              onChange={update}
              className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm"
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label mb-2 block">Role</span>

            <select
              name="role"
              value={form.role}
              onChange={update}
              className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
              icon={ArrowRight}
            >
              {loading ? "Creating..." : "Create Account"}
            </Button>

            <Link
              to="/login"
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md border border-valencia-line bg-white px-4 py-2 text-sm font-semibold"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
