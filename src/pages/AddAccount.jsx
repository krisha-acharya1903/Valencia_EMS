import {
  Building2,
  BriefcaseBusiness,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  createAccountByAdministrator,
  getAccountAdministratorAccess,
} from "../services/accountAdministratorService";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  department: "",
  designation: "",
  phone: "",
};

function generatePassword() {
  const a = Math.random().toString(36).slice(2, 6);
  const b = Math.random().toString(36).slice(2, 6);
  return `Valencia@${a}${b}`;
}

export default function AddAccount() {
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const result = await getAccountAdministratorAccess();

        if (active) {
          setAllowed(result.canCreateAccounts === true);
        }
      } catch {
        if (active) {
          setAllowed(false);
        }
      } finally {
        if (active) {
          setCheckingAccess(false);
        }
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    if (!form.email.trim()) {
      toast.error("Email is required.");
      return;
    }

    if (!form.password.trim() || form.password.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setCreatedAccount(null);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        role: form.role,
        department: form.department.trim(),
        division: form.department.trim(),
        designation: form.designation.trim(),
        phone: form.phone.trim(),
      };

      const result = await createAccountByAdministrator(payload);

      setCreatedAccount(payload);
      setForm(initialForm);

      toast.success(result?.message || "Account created successfully.");
    } catch (error) {
      toast.error(error?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#F8F6F2] px-4 py-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B35]">
            <ShieldCheck size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Access Restricted</h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            You do not have permission to create employee, admin, or superadmin accounts.
          </p>
        </div>
      </div>
    );
  }

  const roleOptions = [
    {
      value: "employee",
      label: "Employee",
      description: "Employee dashboard",
    },
    {
      value: "admin",
      label: "Admin",
      description: "Admin dashboard",
    },
    {
      value: "superAdmin",
      label: "SuperAdmin",
      description: "Full access",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-[#FF6B35] to-[#ff8b61] p-6 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                Delegated Authority
              </p>

              <h1 className="mt-2 text-3xl font-extrabold">Add Account</h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">
                Create employee, admin, or superadmin accounts from this authorized employee account.
              </p>
            </div>

            <div className="hidden h-16 w-16 items-center justify-center rounded-3xl bg-white/20 md:flex">
              <UserPlus size={34} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Create New Account</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select account type carefully. SuperAdmin accounts have highest authority.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Account Type
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  {roleOptions.map((option) => {
                    const active = form.role === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("role", option.value)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          active
                            ? "border-[#FF6B35] bg-orange-50 text-[#FF6B35]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              active ? "bg-[#FF6B35] text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <ShieldCheck size={20} />
                          </div>

                          <div>
                            <p className="font-bold">{option.label}</p>
                            <p className="text-xs opacity-70">{option.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Full Name
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <UserRound size={18} className="text-slate-400" />
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Mail size={18} className="text-slate-400" />
                  <input
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="name@valencia.com"
                    type="email"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <LockKeyhole size={18} className="text-slate-400" />
                  <input
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => updateField("password", generatePassword())}
                  className="mt-2 text-xs font-bold text-[#FF6B35]"
                >
                  Generate password
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Division / Department
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Building2 size={18} className="text-slate-400" />
                  <input
                    value={form.department}
                    onChange={(event) => updateField("department", event.target.value)}
                    placeholder="Example: Nutrition"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Designation
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <BriefcaseBusiness size={18} className="text-slate-400" />
                  <input
                    value={form.designation}
                    onChange={(event) => updateField("designation", event.target.value)}
                    placeholder="Example: Executive"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Phone size={18} className="text-slate-400" />
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      updateField("phone", event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="10 digit phone number"
                    maxLength={10}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 rounded-2xl bg-[#FF6B35] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#f15f2c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Rules</h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>This employee still remains an employee.</p>
              <p>He can create employee, admin, and superadmin accounts.</p>
              <p>Every created account is logged in the backend.</p>
              <p>Normal employees cannot access this page.</p>
            </div>

            {createdAccount && (
              <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-sm font-bold text-green-800">Account Created</p>

                <div className="mt-3 space-y-2 text-sm text-green-900">
                  <p>
                    <span className="font-semibold">Name:</span> {createdAccount.name}
                  </p>
                  <p>
                    <span className="font-semibold">Email:</span> {createdAccount.email}
                  </p>
                  <p>
                    <span className="font-semibold">Password:</span> {createdAccount.password}
                  </p>
                  <p>
                    <span className="font-semibold">Role:</span> {createdAccount.role}
                  </p>
                </div>

                <p className="mt-3 text-xs text-green-700">
                  Copy these credentials before leaving this page.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}