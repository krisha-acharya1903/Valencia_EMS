import { Building2, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as departmentService from "../services/departmentService";

const LOCAL_DEPARTMENTS_KEY = "valencia_local_departments";

function readLocalDepartments() {
  try {
    const stored = localStorage.getItem(LOCAL_DEPARTMENTS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalDepartments(departments) {
  localStorage.setItem(LOCAL_DEPARTMENTS_KEY, JSON.stringify(departments));
}

function cleanText(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "[object Object]") return "";
    if (trimmed === "undefined") return "";
    if (trimmed === "null") return "";

    return trimmed;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    return getDepartmentName(value);
  }

  return "";
}

function getDepartmentName(department) {
  if (typeof department === "string") {
    return cleanText(department);
  }

  if (!department || typeof department !== "object") {
    return "";
  }

  const possibleNames = [
    department.name,
    department.departmentName,
    department.department_name,
    department.title,
    department.label,
    department.value,
  ];

  for (const possibleName of possibleNames) {
    const name = cleanText(possibleName);

    if (name) {
      return name;
    }
  }

  return "";
}

function getDepartmentId(department, index) {
  if (typeof department === "string") {
    return `local-${index}-${department}`;
  }

  return (
    department?.id ||
    department?._id ||
    department?.departmentId ||
    department?.department_id ||
    department?.slug ||
    `local-${index}-${Date.now()}`
  );
}

function normalizeDepartment(department, index) {
  return {
    id: getDepartmentId(department, index),
    name: getDepartmentName(department),
    original: department,
    localOnly: Boolean(department?.localOnly),
  };
}

function extractDepartmentArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.departments)) return response.departments;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

async function tryCreateDepartment(cleanName) {
  const attempts = [];

  if (typeof departmentService.createDepartment === "function") {
    attempts.push(() => departmentService.createDepartment(cleanName));
    attempts.push(() => departmentService.createDepartment({ name: cleanName }));
  }

  if (typeof departmentService.addDepartment === "function") {
    attempts.push(() => departmentService.addDepartment(cleanName));
    attempts.push(() => departmentService.addDepartment({ name: cleanName }));
  }

  let lastError = null;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No create department function found");
}

async function tryUpdateDepartment(departmentId, cleanName) {
  const attempts = [];

  if (typeof departmentService.updateDepartment === "function") {
    attempts.push(() => departmentService.updateDepartment(departmentId, cleanName));
    attempts.push(() =>
      departmentService.updateDepartment(departmentId, { name: cleanName })
    );
  }

  if (typeof departmentService.editDepartment === "function") {
    attempts.push(() => departmentService.editDepartment(departmentId, cleanName));
    attempts.push(() =>
      departmentService.editDepartment(departmentId, { name: cleanName })
    );
  }

  let lastError = null;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No update department function found");
}

async function tryDeleteDepartment(departmentId) {
  const attempts = [];

  if (typeof departmentService.deleteDepartment === "function") {
    attempts.push(() => departmentService.deleteDepartment(departmentId));
  }

  if (typeof departmentService.removeDepartment === "function") {
    attempts.push(() => departmentService.removeDepartment(departmentId));
  }

  let lastError = null;

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No delete department function found");
}

function DeleteDepartmentModal({
  department,
  deleting,
  onCancel,
  onConfirm,
}) {
  if (!department) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-[430px] rounded-2xl bg-white shadow-[0_22px_70px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-[22px] font-black text-[#061638]">
              Delete Department
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              This action will remove the department from the list.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[#061638] transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-[15px] font-semibold text-[#061638]">
            Are you sure you want to delete{" "}
            <span className="font-black text-[#FF6B35]">
              “{department.name}”
            </span>
            ?
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-[#061638] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={17} />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalDepartment, setDeleteModalDepartment] = useState(null);

  async function loadDepartments() {
    try {
      setLoading(true);

      const response =
        typeof departmentService.getDepartments === "function"
          ? await departmentService.getDepartments()
          : [];

      const apiDepartments = extractDepartmentArray(response);
      const localDepartments = readLocalDepartments();

      const mergedDepartments = [...apiDepartments, ...localDepartments]
        .map((department, index) => normalizeDepartment(department, index))
        .filter((department) => department.name);

      const uniqueDepartments = [];
      const seen = new Set();

      for (const department of mergedDepartments) {
        const key = department.name.toLowerCase();

        if (!seen.has(key)) {
          seen.add(key);
          uniqueDepartments.push(department);
        }
      }

      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error(error);

      const localDepartments = readLocalDepartments()
        .map((department, index) => normalizeDepartment(department, index))
        .filter((department) => department.name);

      setDepartments(localDepartments);

      if (localDepartments.length === 0) {
        toast.error("Failed to load departments");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  function updateLocalDepartmentName(id, value) {
    setDepartments((prev) =>
      prev.map((department) =>
        department.id === id
          ? {
              ...department,
              name: value,
            }
          : department
      )
    );
  }

  async function handleAddDepartment() {
    const cleanName = newDepartmentName.trim();

    if (!cleanName) {
      toast.error("Enter department name");
      return;
    }

    const alreadyExists = departments.some(
      (department) => department.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (alreadyExists) {
      toast.error("Department already exists");
      return;
    }

    try {
      setAdding(true);

      const response = await tryCreateDepartment(cleanName);

      const rawDepartment =
        response?.department ||
        response?.data ||
        response?.item ||
        response ||
        {};

      const normalizedDepartment = normalizeDepartment(
        {
          ...rawDepartment,
          name: getDepartmentName(rawDepartment) || cleanName,
        },
        Date.now()
      );

      setDepartments((prev) => [
        ...prev,
        {
          ...normalizedDepartment,
          name: normalizedDepartment.name || cleanName,
        },
      ]);

      setNewDepartmentName("");
      toast.success("Department added");
    } catch (error) {
      console.error(error);

      const localDepartment = {
        id: `local-${Date.now()}`,
        name: cleanName,
        localOnly: true,
      };

      const nextLocalDepartments = [...readLocalDepartments(), localDepartment];
      saveLocalDepartments(nextLocalDepartments);

      setDepartments((prev) => [
        ...prev,
        {
          ...localDepartment,
          original: localDepartment,
        },
      ]);

      setNewDepartmentName("");
      toast.success("Department added");
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveDepartment(department) {
    const cleanName = department.name.trim();

    if (!cleanName) {
      toast.error("Department name cannot be empty");
      return;
    }

    try {
      setSavingId(department.id);

      if (!department.localOnly && !String(department.id).startsWith("local-")) {
        await tryUpdateDepartment(department.id, cleanName);
      }

      setDepartments((prev) =>
        prev.map((item) =>
          item.id === department.id
            ? {
                ...item,
                name: cleanName,
              }
            : item
        )
      );

      const localDepartments = readLocalDepartments().map((item) =>
        item.id === department.id
          ? {
              ...item,
              name: cleanName,
            }
          : item
      );

      saveLocalDepartments(localDepartments);

      toast.success("Department saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save department");
    } finally {
      setSavingId(null);
    }
  }

  function openDeleteModal(department) {
    setDeleteModalDepartment(department);
  }

  function closeDeleteModal() {
    if (deletingId) return;
    setDeleteModalDepartment(null);
  }

  async function confirmDeleteDepartment() {
    const department = deleteModalDepartment;

    if (!department) return;

    try {
      setDeletingId(department.id);

      if (!department.localOnly && !String(department.id).startsWith("local-")) {
        await tryDeleteDepartment(department.id);
      }

      setDepartments((prev) =>
        prev.filter((item) => item.id !== department.id)
      );

      const localDepartments = readLocalDepartments().filter(
        (item) => item.id !== department.id && item.name !== department.name
      );

      saveLocalDepartments(localDepartments);

      toast.success("Department deleted");
      setDeleteModalDepartment(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete department");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#061638]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <Building2 size={25} className="text-[#FF6B35]" />
          <h1 className="text-[26px] font-black leading-none text-[#061638]">
            Editable Departments
          </h1>
        </div>

        <div className="p-6">
          <div className="mb-5 grid grid-cols-[1fr_180px] gap-3">
            <input
              value={newDepartmentName}
              onChange={(event) => setNewDepartmentName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleAddDepartment();
                }
              }}
              placeholder="Add department name..."
              className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-[15px] font-semibold text-[#061638] outline-none transition placeholder:text-slate-400 focus:border-[#FF6B35]"
            />

            <button
              type="button"
              onClick={handleAddDepartment}
              disabled={adding}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#FF6B35] text-[15px] font-black text-white shadow-sm transition hover:bg-[#f05f2e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={19} />
              {adding ? "Adding..." : "Add Department"}
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-bold text-slate-500">
                Loading departments...
              </p>
            </div>
          ) : departments.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-bold text-slate-500">
                No departments found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {departments.map((department) => (
                <div
                  key={department.id}
                  className="grid grid-cols-[1fr_90px_105px] gap-2 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <input
                    value={department.name}
                    onChange={(event) =>
                      updateLocalDepartmentName(
                        department.id,
                        event.target.value
                      )
                    }
                    className="h-11 rounded-md border border-slate-200 bg-white px-3 text-[14px] font-bold text-[#061638] outline-none transition focus:border-[#FF6B35]"
                  />

                  <button
                    type="button"
                    onClick={() => handleSaveDepartment(department)}
                    disabled={savingId === department.id}
                    className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-[14px] font-black text-[#061638] transition hover:border-[#FF6B35] hover:text-[#FF6B35] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={17} />
                    {savingId === department.id ? "..." : "Save"}
                  </button>

                  <button
                    type="button"
                    onClick={() => openDeleteModal(department)}
                    disabled={deletingId === department.id}
                    className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-[14px] font-black text-[#061638] transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={17} />
                    {deletingId === department.id ? "..." : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <DeleteDepartmentModal
        department={deleteModalDepartment}
        deleting={Boolean(deletingId)}
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteDepartment}
      />
    </div>
  );
}