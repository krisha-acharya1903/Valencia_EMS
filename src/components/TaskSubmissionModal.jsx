import { Paperclip, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Button from "./Button";
import Input from "./Input";
import Modal from "./Modal";

const initialForm = {
  projectId: "",
  taskId: "",
  title: "",
  description: "",
  workSummary: "",
  completionPercentage: 50,
  proofLinks: "",
  attachments: [],
  files: [],
  remarks: "",
};

export default function TaskSubmissionModal({ open, onClose, task, tasks = [], projects = [], profile, onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setForm((current) => ({
        ...current,
        projectId: task.projectId,
        taskId: task.id,
        title: `${task.title} update`,
        completionPercentage: Math.max(task.progress || 0, 80),
      }));
    } else if (open) {
      setForm(initialForm);
    }
  }, [open, task]);

  const allowedProjects = useMemo(() => {
    if (!profile) {
      return [];
    }
    return projects.filter((project) => profile.role !== "employee" || project.members?.includes(profile.uid));
  }, [profile, projects]);

  const allowedTasks = useMemo(() => {
    return tasks.filter((item) => {
      const projectMatches = !form.projectId || item.projectId === form.projectId;
      const assigned = profile?.role === "employee" ? item.assignedTo === profile.uid : true;
      return projectMatches && assigned && item.status !== "completed";
    });
  }, [form.projectId, profile, tasks]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async () => {
    if (!form.projectId || !form.taskId || !form.title.trim() || !form.workSummary.trim()) {
      toast.error("Project, task, title, and work summary are required.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(form);
      toast.success("Work submitted for review.");
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Submit Work"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading} icon={Send}>
            {loading ? "Submitting..." : "Submit Work"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label mb-2 block">Project</span>
          <select name="projectId" value={form.projectId} onChange={update} className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm">
            <option value="">Select project</option>
            {allowedProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label mb-2 block">Task</span>
          <select name="taskId" value={form.taskId} onChange={update} className="h-11 w-full rounded-md border border-valencia-line bg-white px-3 text-sm">
            <option value="">Select task</option>
            {allowedTasks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <Input label="Work Title" name="title" value={form.title} onChange={update} />
        <Input label="Completion Percentage" name="completionPercentage" type="number" min="0" max="100" value={form.completionPercentage} onChange={update} />
        <label className="block sm:col-span-2">
          <span className="label mb-2 block">Work Summary</span>
          <textarea
            name="workSummary"
            value={form.workSummary}
            onChange={update}
            rows={4}
            className="w-full rounded-md border border-valencia-line bg-white px-3 py-2 text-sm outline-none focus:border-valencia-orange focus:ring-2 focus:ring-orange-100"
            placeholder="Describe completed work, blockers, proof, and next steps."
          />
        </label>
        <Input label="Proof Link" name="proofLinks" value={form.proofLinks} onChange={update} placeholder="https://..." />
        <Input label="Remarks" name="remarks" value={form.remarks} onChange={update} />
        <label className="sm:col-span-2 flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-valencia-line bg-slate-50 text-sm text-valencia-muted">
          <Paperclip size={18} />
          <span>{form.attachments?.length ? `${form.attachments.length} attachment selected` : "Attach supporting file"}</span>
          <input
            type="file"
            className="hidden"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                files: Array.from(event.target.files || []),
                attachments: Array.from(event.target.files || []).map((file) => ({
                  name: file.name,
                  size: file.size,
                  type: file.type,
                })),
              }))
            }
          />
        </label>
      </div>
    </Modal>
  );
}
