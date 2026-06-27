import {
  Ban,
  CheckCircle2,
  KeyRound,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AdminCsvImport from "../components/AdminCsvImport";
import { useAuth } from "../context/AuthContext";
import {
  deleteJayEmployee,
  getJaySoftwareEmployees,
  resetJayEmployeePassword,
  toggleJayEmployeeBlock,
} from "../services/jayEmployeeService";

const JAY_MORE_EMAIL = "jay.more@valencianutrition.com";
const API_BASE = "http://localhost:5000/api";

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function getInitials(name) {
  return (
    String(name || "User")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

function statusClass(status) {
  const cleanStatus = clean(status);

  if (cleanStatus === "blocked") {
    return "bg-red-50 text-red-600 border-red-100";
  }

  return "bg-emerald-50 text-emerald-600 border-emerald-100";
}

function getAuthToken() {
  return (
    localStorage.getItem("valencia_auth_token") ||
    sessionStorage.getItem("valencia_auth_token") ||
    ""
  );
}

async function createJayEmployeeDirect(payload) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Missing authorization token. Please logout and login again.");
  }

  const response = await fetch(`${API_BASE}/jay-more/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = {
      message: text,
    };
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Failed to add employee.");
  }

  return data?.employee || data?.user || data;
}

const emptyEmployeeForm = {
  name: "",
  email: "",
  department: "Software Team",
  role: "employee",
  phone: "",
  password: "",
};

export default function JayEmployees() {
  const { profile } = useAuth();

  const [importOpen, setImportOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [menuOpenId, setMenuOpenId] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);

  const [confirmAction, setConfirmAction] = useState(null);

  const isJayMore = clean(profile?.email) === JAY_MORE_EMAIL;

  const filteredEmployees = useMemo(() => {
    const query = clean(searchText);

    if (!query) return employees;

    return employees.filter((employee) => {
      return (
        clean(employee.name).includes(query) ||
        clean(employee.email).includes(query) ||
        clean(employee.role).includes(query) ||
        clean(employee.department).includes(query) ||
        clean(employee.status).includes(query)
      );
    });
  }, [employees, searchText]);

  async function loadEmployees() {
    try {
      setLoading(true);
      const data = await getJaySoftwareEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load employees error:", error);
      toast.error(error?.message || "Failed to load employees.");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isJayMore) {
      loadEmployees();
    }
  }, [isJayMore]);

  function updateEmployeeForm(field, value) {
    setEmployeeForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handlePhoneChange(value) {
    const digitsOnly = String(value || "")
      .replace(/\D/g, "")
      .slice(0, 10);

    updateEmployeeForm("phone", digitsOnly);
  }

  function openAddEmployeeModal() {
    setEmployeeForm(emptyEmployeeForm);
    setAddOpen(true);
  }

  function closeAddEmployeeModal() {
    if (creatingEmployee) return;

    setAddOpen(false);
    setEmployeeForm(emptyEmployeeForm);
  }

  async function handleCreateEmployee(event) {
    event.preventDefault();

    const payload = {
      name: employeeForm.name.trim(),
      email: employeeForm.email.trim(),
      department: employeeForm.department.trim() || "Software Team",
      role: employeeForm.role || "employee",
      phone: employeeForm.phone.trim(),
      password: employeeForm.password.trim(),
    };

    if (!payload.name) {
      toast.error("Employee full name is required.");
      return;
    }

    if (!payload.email) {
      toast.error("Employee email is required.");
      return;
    }

    if (!payload.email.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (payload.phone && !/^\d{10}$/.test(payload.phone)) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    if (!payload.password || payload.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    try {
      setCreatingEmployee(true);

      const createdEmployee = await createJayEmployeeDirect(payload);

      if (createdEmployee?.id) {
        setEmployees((current) => [createdEmployee, ...current]);
      }

      toast.success("Employee added successfully.");

      setAddOpen(false);
      setEmployeeForm(emptyEmployeeForm);

      await loadEmployees();
    } catch (error) {
      console.error("Create employee error:", error);
      toast.error(error?.message || "Failed to add employee.");
    } finally {
      setCreatingEmployee(false);
    }
  }

  function openBlockConfirm(employee) {
    setMenuOpenId("");

    setConfirmAction({
      type: "block",
      employee,
      title: employee.isBlocked ? "Unblock Employee" : "Block Employee",
      message: employee.isBlocked
        ? `Are you sure you want to unblock ${employee.name}? They will be able to sign in again.`
        : `Are you sure you want to block ${employee.name}? They will be logged out and will not be able to sign in.`,
      confirmText: employee.isBlocked ? "Unblock Employee" : "Block Employee",
      danger: !employee.isBlocked,
    });
  }

  function openDeleteConfirm(employee) {
    setMenuOpenId("");

    setConfirmAction({
      type: "delete",
      employee,
      title: "Delete Employee",
      message: `Are you sure you want to delete ${employee.name}? This will remove the employee from the active employee list.`,
      confirmText: "Delete Employee",
      danger: true,
    });
  }

  async function executeBlockAction(employee) {
    try {
      setActionLoadingId(employee.id);

      const updatedEmployee = await toggleJayEmployeeBlock(employee.id);

      setEmployees((current) =>
        current.map((item) =>
          String(item.id) === String(employee.id) ? updatedEmployee : item
        )
      );

      toast.success(
        employee.isBlocked
          ? "Employee unblocked successfully."
          : "Employee blocked successfully."
      );
    } catch (error) {
      console.error("Block/unblock employee error:", error);
      toast.error(error?.message || "Failed to update employee.");
    } finally {
      setActionLoadingId("");
      setConfirmAction(null);
    }
  }

  async function executeDeleteAction(employee) {
    try {
      setActionLoadingId(employee.id);

      await deleteJayEmployee(employee.id);

      setEmployees((current) =>
        current.filter((item) => String(item.id) !== String(employee.id))
      );

      toast.success("Employee deleted successfully.");
    } catch (error) {
      console.error("Delete employee error:", error);
      toast.error(error?.message || "Failed to delete employee.");
    } finally {
      setActionLoadingId("");
      setConfirmAction(null);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction?.employee) return;

    if (confirmAction.type === "block") {
      await executeBlockAction(confirmAction.employee);
      return;
    }

    if (confirmAction.type === "delete") {
      await executeDeleteAction(confirmAction.employee);
    }
  }

  function openResetModal(employee) {
    setResetTarget(employee);
    setNewPassword("");
    setMenuOpenId("");
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    const password = newPassword.trim();

    if (!resetTarget?.id) {
      toast.error("Employee is missing.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    try {
      setActionLoadingId(resetTarget.id);

      await resetJayEmployeePassword(resetTarget.id, password);

      toast.success("Password reset successfully.");
      setResetTarget(null);
      setNewPassword("");
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(error?.message || "Failed to reset password.");
    } finally {
      setActionLoadingId("");
    }
  }

  if (!isJayMore) {
    return (
      <div className="min-h-full bg-white px-7 py-6 text-black">
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
          <h1 className="text-[20px] font-black text-red-600">
            Access denied
          </h1>
          <p className="mt-1 text-[14px] font-semibold text-red-500">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white px-7 py-6 text-black">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-black text-black">Employees</h1>
          <p className="mt-1 text-[14px] font-semibold text-[#777]">
            View and manage employees.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={openAddEmployeeModal}
            className="flex h-11 items-center gap-2 rounded-xl border border-[#FF6B35] bg-white px-5 text-[14px] font-black text-[#FF6B35] shadow-[0_10px_24px_rgba(255,107,53,0.12)] transition hover:bg-[#fff0ea]"
          >
            <Plus size={18} />
            Add Employee
          </button>

          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl bg-[#FF6B35] px-5 text-[14px] font-black text-white shadow-[0_10px_24px_rgba(255,107,53,0.24)] transition hover:bg-[#ef5f2d]"
          >
            <UploadCloud size={18} />
            Import CSV
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="flex h-11 items-center gap-3 rounded-xl border border-[#eeeeee] bg-white px-4">
          <Search size={18} className="text-[#999]" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search employees..."
            className="h-full flex-1 bg-transparent text-[14px] font-semibold text-black outline-none placeholder:text-[#999]"
          />
        </div>

        <div className="rounded-xl border border-orange-100 bg-[#fff7f2] px-4 py-3 text-[13px] font-black text-[#FF6B35]">
          {loading ? "..." : filteredEmployees.length} Employees
        </div>
      </div>

      <div className="overflow-visible rounded-2xl border border-[#eeeeee] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_80px] border-b border-[#eeeeee] bg-[#fff7f2] px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-[#777]">
          <span>Employee</span>
          <span>Department</span>
          <span>Role</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm font-bold text-[#777]">
            <Loader2 size={18} className="animate-spin text-[#FF6B35]" />
            Loading employees...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <UserRound size={34} className="mx-auto mb-3 text-[#FF6B35]" />
            <p className="text-[15px] font-black text-black">
              No employees found.
            </p>
            <p className="mt-1 text-[13px] font-semibold text-[#777]">
              Add one employee manually or import users using CSV.
            </p>
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_80px] items-center border-b border-[#f1f1f1] px-5 py-4 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF6B35] text-[13px] font-black text-white">
                  {getInitials(employee.name)}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[14px] font-black text-black">
                    {employee.name}
                  </p>
                  <p className="truncate text-[12px] font-semibold text-[#777]">
                    {employee.email}
                  </p>
                </div>
              </div>

              <p className="truncate text-[13px] font-bold text-[#555]">
                {employee.department || "Not assigned"}
              </p>

              <p className="truncate text-[13px] font-bold capitalize text-[#555]">
                {employee.role || "employee"}
              </p>

              <span
                className={`w-fit rounded-full border px-3 py-1 text-[11px] font-black capitalize ${statusClass(
                  employee.status
                )}`}
              >
                {employee.isBlocked ? "Blocked" : "Active"}
              </span>

              <div className="relative flex justify-end">
                <button
                  type="button"
                  disabled={actionLoadingId === employee.id}
                  onClick={() =>
                    setMenuOpenId((current) =>
                      current === employee.id ? "" : employee.id
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff7f2] text-[#FF6B35] transition hover:bg-[#ffede4] disabled:opacity-50"
                >
                  {actionLoadingId === employee.id ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <MoreVertical size={18} />
                  )}
                </button>

                {menuOpenId === employee.id ? (
                  <div className="absolute bottom-10 right-0 z-50 w-[220px] overflow-hidden rounded-xl border border-[#eeeeee] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
                    <button
                      type="button"
                      onClick={() => openResetModal(employee)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-black text-black hover:bg-orange-50"
                    >
                      <KeyRound size={16} className="text-[#FF6B35]" />
                      Reset Password
                    </button>

                    <button
                      type="button"
                      onClick={() => openBlockConfirm(employee)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-black text-black hover:bg-orange-50"
                    >
                      {employee.isBlocked ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <Ban size={16} className="text-red-500" />
                      )}
                      {employee.isBlocked
                        ? "Unblock Employee"
                        : "Block Employee"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(employee)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-black text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Delete Employee
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-5 py-8">
          <form
            onSubmit={handleCreateEmployee}
            className="w-full max-w-[620px] overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-black text-black">
                  Add Employee
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-[#777]">
                  Create a new employee, admin, or super admin account.
                </p>
              </div>

              <button
                type="button"
                disabled={creatingEmployee}
                onClick={closeAddEmployeeModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-6">
              <div>
                <label className="mb-2 block text-[12px] font-black uppercase tracking-[0.12em] text-[#777]">
                  Full Name
                </label>
                <input
                  value={employeeForm.name}
                  onChange={(event) =>
                    updateEmployeeForm("name", event.target.value)
                  }
                  placeholder="Employee full name"
                  className="h-12 w-full rounded-xl border border-[#eeeeee] px-4 text-[14px] font-semibold text-black outline-none transition focus:border-[#FF6B35]"
                />
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-black uppercase tracking-[0.12em] text-[#777]">
                  Email
                </label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(event) =>
                    updateEmployeeForm("email", event.target.value)
                  }
                  placeholder="employee@valencianutrition.com"
                  className="h-12 w-full rounded-xl border border-[#eeeeee] px-4 text-[14px] font-semibold text-black outline-none transition focus:border-[#FF6B35]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[12px] font-black uppercase tracking-[0.12em] text-[#777]">
                    Department
                  </label>
                  <input
                    value={employeeForm.department}
                    onChange={(event) =>
                      updateEmployeeForm("department", event.target.value)
                    }
                    placeholder="Software Team"
                    className="h-12 w-full rounded-xl border border-[#eeeeee] px-4 text-[14px] font-semibold text-black outline-none transition focus:border-[#FF6B35]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-black uppercase tracking-[0.12em] text-[#777]">
                    Role
                  </label>
                  <select
                    value={employeeForm.role}
                    onChange={(event) =>
                      updateEmployeeForm("role", event.target.value)
                    }
                    className="h-12 w-full rounded-xl border border-[#eeeeee] bg-white px-4 text-[14px] font-black text-black outline-none transition focus:border-[#FF6B35]"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[12px] font-black uppercase tracking-[0.12em] text-[#777]">
                    Phone
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={employeeForm.phone}
                    onChange={(event) => handlePhoneChange(event.target.value)}
                    placeholder="Phone number"
                    className="h-12 w-full rounded-xl border border-[#eeeeee] px-4 text-[14px] font-semibold text-black outline-none transition focus:border-[#FF6B35]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-black uppercase tracking-[0.12em] text-[#777]">
                    Password
                  </label>
                  <input
                    type="text"
                    value={employeeForm.password}
                    onChange={(event) =>
                      updateEmployeeForm("password", event.target.value)
                    }
                    placeholder="Temporary password"
                    className="h-12 w-full rounded-xl border border-[#eeeeee] px-4 text-[14px] font-semibold text-black outline-none transition focus:border-[#FF6B35]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#eeeeee] px-6 py-5">
              <button
                type="button"
                disabled={creatingEmployee}
                onClick={closeAddEmployeeModal}
                className="flex h-11 items-center justify-center rounded-xl border border-[#eeeeee] bg-white px-5 text-[14px] font-black text-black transition hover:bg-[#f7f7f7] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creatingEmployee}
                className="flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-5 text-[14px] font-black text-white transition hover:bg-[#ef5f2d] disabled:opacity-60"
              >
                {creatingEmployee ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                Save Employee
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-5 py-8">
          <div className="relative max-h-[90vh] w-full max-w-[980px] overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-black text-black">
                  Import Users by CSV
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-[#777]">
                  Upload employee/admin data in bulk using a CSV file.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setImportOpen(false);
                  loadEmployees();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
              >
                <X size={20} />
              </button>
            </div>

            <AdminCsvImport />
          </div>
        </div>
      ) : null}

      {resetTarget ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-5">
          <form
            onSubmit={handleResetPassword}
            className="w-full max-w-[460px] rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-black text-black">
                  Reset Password
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-[#777]">
                  Set a new password for {resetTarget.name}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResetTarget(null);
                  setNewPassword("");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <label className="mb-2 block text-[13px] font-black text-black">
              New Password
            </label>

            <input
              type="text"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              className="mb-5 h-12 w-full rounded-xl border border-[#eeeeee] px-4 text-[14px] font-semibold outline-none focus:border-[#FF6B35]"
            />

            <button
              type="submit"
              disabled={actionLoadingId === resetTarget.id}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] text-[14px] font-black text-white transition hover:bg-[#ef5f2d] disabled:opacity-60"
            >
              {actionLoadingId === resetTarget.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <KeyRound size={18} />
              )}
              Reset Password
            </button>
          </form>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-5">
          <div className="w-full max-w-[460px] rounded-3xl bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    confirmAction.danger
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {confirmAction.type === "delete" ? (
                    <Trash2 size={22} />
                  ) : confirmAction.employee?.isBlocked ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <Ban size={22} />
                  )}
                </div>

                <h2 className="text-[22px] font-black text-black">
                  {confirmAction.title}
                </h2>

                <p className="mt-2 text-[14px] font-semibold leading-6 text-[#777]">
                  {confirmAction.message}
                </p>
              </div>

              <button
                type="button"
                disabled={Boolean(actionLoadingId)}
                onClick={() => setConfirmAction(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f6f6] text-[#777] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(actionLoadingId)}
                onClick={() => setConfirmAction(null)}
                className="flex h-11 items-center justify-center rounded-xl border border-[#eeeeee] bg-white px-5 text-[14px] font-black text-black transition hover:bg-[#f7f7f7] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(actionLoadingId)}
                onClick={handleConfirmAction}
                className={`flex h-11 min-w-[145px] items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-black text-white transition disabled:opacity-60 ${
                  confirmAction.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {actionLoadingId ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : null}
                {confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}