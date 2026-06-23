import Badge from "./Badge";

export default function WorkProgressStatusView({ tasks }) {
  const groups = tasks.reduce((acc, task) => {
    const key = task.project?.name || task.projectId;
    acc[key] = acc[key] || [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([projectName, projectTasks]) => (
        <section key={projectName} className="card overflow-hidden">
          <div className="border-b border-valencia-line p-4">
            <h3 className="text-lg font-black">{projectName}</h3>
            <p className="text-sm text-valencia-muted">{projectTasks.length} linked tasks</p>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-valencia-ink">
                <tr>
                  <th className="p-3">Task</th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Completion</th>
                  <th className="p-3">Submission</th>
                  <th className="p-3">Review</th>
                  <th className="p-3">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-valencia-line">
                {projectTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="p-3 font-semibold">{task.title}</td>
                    <td className="p-3">{task.employee?.name || "Unassigned"}</td>
                    <td className="p-3">{task.project?.department}</td>
                    <td className="p-3">{task.startDate} - {task.dueDate}</td>
                    <td className="p-3">{task.progress}%</td>
                    <td className="p-3"><Badge value={task.submission?.status || "pending"} /></td>
                    <td className="p-3">{task.submission?.adminReviewComment || "No review note"}</td>
                    <td className="p-3">{new Date(task.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
