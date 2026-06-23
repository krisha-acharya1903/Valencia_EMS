import Badge from "./Badge";

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const diffDays = (start, end) => Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));

export default function WorkProgressGantt({ projects, tasks, scale = "week" }) {
  const validTasks = tasks.filter((task) => task.startDate && task.dueDate);
  const starts = validTasks.map((task) => new Date(task.startDate));
  const ends = validTasks.map((task) => new Date(task.dueDate));
  const minDate = starts.length ? new Date(Math.min(...starts)) : new Date();
  const maxDate = ends.length ? new Date(Math.max(...ends)) : addDays(new Date(), 30);
  const totalDays = diffDays(minDate, maxDate) + 5;
  const step = scale === "day" ? 1 : scale === "month" ? 30 : 7;
  const markers = Array.from({ length: Math.ceil(totalDays / step) + 1 }, (_, index) => addDays(minDate, index * step));
  const todayOffset = Math.min(100, Math.max(0, (diffDays(minDate, new Date()) / totalDays) * 100));

  return (
    <div className="overflow-auto rounded-lg border border-valencia-line bg-white scrollbar-thin">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-[260px_1fr] border-b border-valencia-line bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-valencia-ink">
          <div className="p-3">Project / Task</div>
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${markers.length}, minmax(80px, 1fr))` }}>
            {markers.map((marker) => (
              <div key={marker.toISOString()} className="border-l border-valencia-line p-3">
                {marker.toLocaleDateString("en", { month: "short", day: "numeric" })}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute bottom-0 top-0 w-px bg-red-400" style={{ left: `calc(260px + ${todayOffset}%)` }} />
          {projects.map((project) => {
            const children = tasks.filter((task) => task.projectId === project.id);
            if (!children.length) {
              return null;
            }
            return (
              <div key={project.id}>
                <div className="grid grid-cols-[260px_1fr] border-b border-valencia-line bg-white">
                  <div className="p-3">
                    <p className="font-black">{project.name}</p>
                    <p className="text-xs text-valencia-muted">{project.department}</p>
                  </div>
                  <div className="relative p-3">
                    <div className="h-3 rounded-full bg-blue-100">
                      <div className="h-full rounded-full bg-valencia-navy" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                </div>
                {children.map((task) => {
                  const offset = (diffDays(minDate, task.startDate) / totalDays) * 100;
                  const width = Math.max(5, (diffDays(task.startDate, task.dueDate) / totalDays) * 100);
                  return (
                    <div key={task.id} className="grid grid-cols-[260px_1fr] border-b border-valencia-line bg-white">
                      <div className="p-3 pl-8">
                        <p className="font-semibold">{task.title}</p>
                        <p className="text-xs text-valencia-muted">{task.employee?.name}</p>
                      </div>
                      <div className="relative p-3">
                        <div
                          className={`absolute top-1/2 h-7 -translate-y-1/2 rounded-md ${task.status === "overdue" ? "bg-red-500" : task.status === "completed" ? "bg-valencia-green" : "bg-valencia-orange"}`}
                          style={{ left: `${offset}%`, width: `${width}%` }}
                          title={`${task.title}: ${task.progress}%`}
                        >
                          <span className="flex h-full items-center justify-center truncate px-2 text-xs font-bold text-white">{task.progress}%</span>
                        </div>
                        <div className="flex justify-end">
                          <Badge value={task.status} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
