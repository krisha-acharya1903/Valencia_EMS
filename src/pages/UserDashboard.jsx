import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as projectService from "../services/projectService";

function extractArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function getProfileKeys(profile) {
  return [
    profile?.id,
    profile?._id,
    profile?.uid,
    profile?.userId,
    profile?.user_id,
    profile?.employeeId,
    profile?.employee_id,
    profile?.email,
    profile?.name,
    profile?.fullName,
    profile?.full_name,
    profile?.displayName,
    profile?.display_name,
    profile?.employeeName,
    profile?.employee_name,
  ]
    .filter(Boolean)
    .map(clean);
}

function getPersonKeys(person) {
  if (!person) return [];

  if (typeof person === "string" || typeof person === "number") {
    return [clean(person)];
  }

  return [
    person?.id,
    person?._id,
    person?.uid,
    person?.userId,
    person?.user_id,
    person?.employeeId,
    person?.employee_id,
    person?.email,
    person?.name,
    person?.fullName,
    person?.full_name,
    person?.displayName,
    person?.display_name,
    person?.employeeName,
    person?.employee_name,
  ]
    .filter(Boolean)
    .map(clean);
}

function collectProjectPeople(project) {
  const fields = [
    project?.assignedTo,
    project?.assigned_to,
    project?.assignee,
    project?.assignees,
    project?.assignedUser,
    project?.assigned_user,
    project?.assignedUsers,
    project?.assigned_users,
    project?.assignedEmployee,
    project?.assigned_employee,
    project?.assignedEmployees,
    project?.assigned_employees,
    project?.members,
    project?.member,
    project?.team,
    project?.teamMembers,
    project?.team_members,
    project?.employees,
    project?.employee,
    project?.employeeIds,
    project?.employee_ids,
    project?.users,
    project?.participants,
    project?.contributors,
  ];

  return fields.flatMap((field) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    return [field];
  });
}

function profileDepartmentKeys(profile) {
  return [
    profile?.department,
    profile?.departmentName,
    profile?.department_name,
    profile?.division,
    profile?.divisionName,
    profile?.division_name,
  ]
    .filter(Boolean)
    .map(clean);
}

function projectDepartmentKeys(project) {
  return [
    project?.department,
    project?.departmentName,
    project?.department_name,
    project?.division,
    project?.divisionName,
    project?.division_name,
  ]
    .filter(Boolean)
    .map(clean);
}

function isEmployeeInProject(project, profile) {
  const profileKeys = getProfileKeys(profile);

  if (profileKeys.length === 0) return false;

  const projectPeople = collectProjectPeople(project);
  const projectPeopleKeys = projectPeople.flatMap(getPersonKeys);

  const directMatch = profileKeys.some((key) => projectPeopleKeys.includes(key));

  if (directMatch) return true;

  const employeeDepartments = profileDepartmentKeys(profile);
  const projectDepartments = projectDepartmentKeys(project);

  return (
    employeeDepartments.length > 0 &&
    projectDepartments.length > 0 &&
    employeeDepartments.some((department) =>
      projectDepartments.includes(department)
    )
  );
}

function getProjectTitle(project, index) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    `Project ${index + 1}`
  );
}

function getTasks(project) {
  const tasks =
    project?.tasks ||
    project?.taskList ||
    project?.task_list ||
    project?.todos ||
    project?.toDos ||
    project?.checklist ||
    [];

  return Array.isArray(tasks) ? tasks : [];
}

function isTaskDone(task) {
  if (typeof task === "string") return false;

  const status = clean(task?.status || task?.state || task?.progressStatus);

  return (
    task?.completed === true ||
    task?.done === true ||
    task?.isCompleted === true ||
    status === "done" ||
    status === "complete" ||
    status === "completed" ||
    status === "finished"
  );
}

function getProjectStats(project) {
  const tasks = getTasks(project);

  const total =
    Number(project?.totalTasks) ||
    Number(project?.total_tasks) ||
    Number(project?.taskCount) ||
    tasks.length ||
    0;

  const completed =
    Number(project?.completedTasks) ||
    Number(project?.completed_tasks) ||
    Number(project?.doneTasks) ||
    tasks.filter(isTaskDone).length ||
    0;

  const explicitProgress =
    project?.progress ??
    project?.progressPercent ??
    project?.progress_percent ??
    project?.completion ??
    project?.completionPercent ??
    project?.completion_percent;

  const progress =
    explicitProgress !== undefined && explicitProgress !== null
      ? Math.max(0, Math.min(100, Number(explicitProgress) || 0))
      : total > 0
      ? Math.round((completed / total) * 100)
      : 0;

  return {
    total,
    completed,
    progress,
  };
}

function initialsFromName(name) {
  return String(name || "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getVisibleAssignees(project) {
  const people = collectProjectPeople(project);

  return people.slice(0, 5).map((person, index) => {
    const name =
      typeof person === "string"
        ? person
        : person?.name ||
          person?.fullName ||
          person?.full_name ||
          person?.displayName ||
          person?.display_name ||
          person?.email ||
          `U${index + 1}`;

    return {
      id:
        typeof person === "string"
          ? person
          : person?.id || person?._id || person?.email || name,
      initials: initialsFromName(name),
      color:
        index % 4 === 0
          ? "bg-[#ff6b35] text-white"
          : index % 4 === 1
          ? "bg-[#ff7d48] text-white"
          : index % 4 === 2
          ? "bg-[#ff8f5a] text-white"
          : "bg-[#ececf4] text-[#aaa]",
    };
  });
}

function ProjectCard({ project, index }) {
  const title = getProjectTitle(project, index);
  const stats = getProjectStats(project);
  const assignees = getVisibleAssignees(project);

  return (
    <div className="rounded-xl border border-[#efefef] bg-white px-4 py-4 shadow-[0_7px_22px_rgba(0,0,0,0.08)]">
      <div className="mb-5">
        <h3 className="line-clamp-1 text-[14px] font-black text-[#ff6b35]">
          {title}
        </h3>
      </div>

      <div className="mb-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ffd8cf]">
          <div
            className="h-full rounded-full bg-[#ff6b35]"
            style={{ width: `${stats.progress}%` }}
          />
        </div>

        <span className="w-8 text-right text-[11px] font-black text-black">
          {stats.progress}%
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-[#666]">
          {stats.completed}/{stats.total} tasks
        </p>

        <div className="flex -space-x-2">
          {assignees.length > 0 ? (
            assignees.map((person) => (
              <div
                key={person.id}
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[7px] font-black ${person.color}`}
              >
                {person.initials}
              </div>
            ))
          ) : (
            <>
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#ff6b35] text-[7px] font-black text-white">
                ME
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#ececf4] text-[7px] font-black text-[#aaa]">
                +7
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OverallProgress({ projects }) {
  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce(
            (sum, project) => sum + getProjectStats(project).progress,
            0
          ) / projects.length
        )
      : 0;

  const chartValues =
    projects.length > 0
      ? projects
          .slice(0, 6)
          .map((project) => Math.max(8, getProjectStats(project).progress))
      : [0, 0, 0, 0, 0, 0];

  while (chartValues.length < 6) chartValues.push(0);

  return (
    <div className="h-[230px] rounded-xl border border-[#efefef] bg-white p-6 shadow-[0_7px_22px_rgba(0,0,0,0.08)]">
      <div className="grid h-full grid-cols-[210px_1fr] items-center gap-6">
        <div className="flex items-center justify-center">
          <div
            className="relative flex h-40 w-40 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#ff6b35 ${averageProgress}%, #e9e9e9 0)`,
            }}
          >
            <div className="flex h-[116px] w-[116px] flex-col items-center justify-center rounded-full bg-white">
              <p className="text-[39px] font-black leading-none text-black">
                {averageProgress}%
              </p>
              <p className="mt-2 text-[13px] font-bold text-[#667085]">
                Complete
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[42px_1fr] gap-5">
          <div className="flex h-36 flex-col justify-between py-1 text-right text-[10px] font-bold text-[#8a8a95]">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div className="flex h-36 items-end justify-between border-l border-[#e5e7eb] pl-7">
            {chartValues.map((value, index) => (
              <div key={index} className="flex flex-col items-center gap-3">
                <div
                  className="w-4 rounded-t-full bg-[#ff6b35]"
                  style={{ height: `${value}%` }}
                />
                <span className="text-[11px] font-bold text-[#667085]">
                  {projects[index]?.name
                    ? `P${index + 1}`
                    : index < projects.length
                    ? `P${index + 1}`
                    : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CryingCharacter() {
  return (
    <div className="relative h-[104px] w-[104px]">
      <style>
        {`
          @keyframes vnSadBounce {
            0%, 100% { transform: translate(-50%, 0) scale(1); }
            50% { transform: translate(-50%, 4px) scale(0.98); }
          }

          @keyframes vnTearDrop {
            0% { transform: translateY(0); opacity: 0; }
            25% { opacity: 1; }
            100% { transform: translateY(20px); opacity: 0; }
          }

          .vn-sad-body {
            animation: vnSadBounce 1.7s ease-in-out infinite;
          }

          .vn-tear-left {
            animation: vnTearDrop 1.3s ease-in-out infinite;
          }

          .vn-tear-right {
            animation: vnTearDrop 1.3s ease-in-out 0.35s infinite;
          }
        `}
      </style>

      <div className="vn-sad-body absolute left-1/2 top-2 h-[82px] w-[82px] rounded-[44%_48%_52%_46%] bg-[#5fb4f2] shadow-[inset_-9px_-11px_0_rgba(41,121,196,0.18),0_14px_24px_rgba(52,133,210,0.22)]">
        <div className="absolute left-[24px] top-[26px] h-4 w-2 rounded-full bg-[#143d64]" />
        <div className="absolute right-[24px] top-[26px] h-4 w-2 rounded-full bg-[#143d64]" />

        <div className="vn-tear-left absolute left-[21px] top-[40px] h-3 w-2 rounded-full bg-[#dff5ff]" />
        <div className="vn-tear-right absolute right-[21px] top-[40px] h-3 w-2 rounded-full bg-[#dff5ff]" />

        <div className="absolute left-1/2 top-[50px] h-5 w-8 -translate-x-1/2 rounded-t-full border-t-[4px] border-[#143d64]" />

        <div className="absolute -left-3 top-[47px] h-8 w-5 rotate-[-25deg] rounded-full bg-[#4ca6ea]" />
        <div className="absolute -right-3 top-[47px] h-8 w-5 rotate-[25deg] rounded-full bg-[#4ca6ea]" />

        <div className="absolute bottom-[-9px] left-5 h-6 w-5 rounded-full bg-[#4ca6ea]" />
        <div className="absolute bottom-[-9px] right-5 h-6 w-5 rounded-full bg-[#4ca6ea]" />
      </div>
    </div>
  );
}

function ToDoCard() {
  const [taskText, setTaskText] = useState("");
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("employee_dashboard_todos_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("employee_dashboard_todos_v1", JSON.stringify(tasks));
  }, [tasks]);

  function addTask(event) {
    event.preventDefault();

    const cleanText = taskText.trim();
    if (!cleanText) return;

    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: cleanText,
        completed: false,
      },
    ]);

    setTaskText("");
  }

  function toggleTask(id) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  return (
    <section className="relative h-[305px] overflow-hidden rounded-xl border border-[#efefef] bg-[#fffaf3] p-5 shadow-[0_7px_22px_rgba(0,0,0,0.08)]">
      <div
        className="absolute inset-0 opacity-75"
        style={{
          backgroundImage:
            "linear-gradient(#f3e5d8 1px, transparent 1px), linear-gradient(90deg, #f3e5d8 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-[#ff6b35]" />
            <h2 className="text-[19px] font-black text-black">To-Do List</h2>
          </div>

          <div className="rounded-sm bg-[#f6d6ef] px-6 py-2 text-[10px] font-black text-white">
            TODO!
          </div>
        </div>

        <form
          onSubmit={addTask}
          className="relative z-20 mx-auto mb-3 flex h-8 w-[88%] shrink-0 items-center gap-2"
        >
          <button
            type="button"
            className="h-4 w-4 shrink-0 rounded-[3px] border border-[#b8b8b8] bg-white/70"
            aria-label="Task marker"
          />

          <input
            value={taskText}
            onChange={(event) => setTaskText(event.target.value)}
            placeholder="Add text..."
            className="h-8 min-w-0 flex-1 border-b border-[#cfcfcf] bg-transparent px-1 text-[12px] font-semibold text-black outline-none placeholder:text-[#a0a0a0] focus:border-[#ff6b35]"
          />

          <button
            type="submit"
            className="absolute -right-7 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff6b35] text-white shadow-[0_8px_20px_rgba(255,107,53,0.28)] transition hover:scale-105"
          >
            <Plus size={21} />
          </button>
        </form>

        {tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center pt-2 text-center">
            <CryingCharacter />

            <p className="mt-3 text-[11px] font-black text-[#777]">
              Your goals are crying.
            </p>
            <p className="mt-0.5 text-[11px] font-black text-black">
              Tap to Fix it!
            </p>
          </div>
        ) : (
          <div className="mt-3 max-h-[190px] space-y-2 overflow-y-auto pr-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-lg border border-[#efdcd3] bg-white/85 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    task.completed
                      ? "border-[#ff6b35] bg-[#ff6b35]"
                      : "border-[#c7c7c7] bg-white"
                  }`}
                >
                  {task.completed ? (
                    <CheckCircle2 size={14} className="text-white" />
                  ) : null}
                </button>

                <p
                  className={`min-w-0 flex-1 text-[12px] font-bold ${
                    task.completed ? "text-[#999] line-through" : "text-black"
                  }`}
                >
                  {task.text}
                </p>

                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#999] hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function NotificationsCard({ projects }) {
  const notifications = [
    {
      id: 1,
      icon: CalendarDays,
      color: "bg-[#ffe4f2] text-[#ff5ca8]",
      title: "Project Deadline coming up",
      subtitle:
        projects.length > 0
          ? `${getProjectTitle(projects[0], 0)} is due in 3 days`
          : "No urgent project deadlines",
      time: "Today",
    },
    {
      id: 2,
      icon: CheckCircle2,
      color: "bg-[#e3fff0] text-[#28c76f]",
      title: "Task reminder",
      subtitle: "Check your assigned project tasks",
      time: "Today",
    },
    {
      id: 3,
      icon: UsersRound,
      color: "bg-[#e5f1ff] text-[#4aa3ff]",
      title: "Team update",
      subtitle: "Stay connected with your team",
      time: "Today",
    },
  ];

  return (
    <section className="h-[305px] overflow-hidden rounded-xl border border-[#efefef] bg-white p-5 shadow-[0_7px_22px_rgba(0,0,0,0.08)]">
      <h2 className="mb-3 text-[20px] font-black text-black">
        Notifications
      </h2>

      <div className="h-[236px] overflow-y-auto pr-2">
        {notifications.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#f0f0f0] py-3 last:border-b-0"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.color}`}
              >
                <Icon size={16} />
              </div>

              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-[12px] font-black leading-tight text-black">
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold leading-tight text-[#999]">
                  {item.subtitle}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="whitespace-nowrap text-[10px] font-bold text-[#888]">
                  {item.time}
                </span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b35]" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function UserDashboard() {
  const { profile } = useAuth();

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        setProjectsLoading(true);

        const response =
          typeof projectService.getAllProjects === "function"
            ? await projectService.getAllProjects()
            : typeof projectService.getProjects === "function"
            ? await projectService.getProjects()
            : [];

        if (!active) return;

        const allProjects = extractArray(response);

        const myProjects = allProjects.filter((project) =>
          isEmployeeInProject(project, profile)
        );

        setProjects(myProjects);
      } catch (error) {
        console.error("Failed to load employee projects:", error);

        if (active) {
          setProjects([]);
        }
      } finally {
        if (active) {
          setProjectsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, [profile]);

  return (
    <div className="min-h-screen bg-white px-7 py-5 text-black">
      <div className="grid grid-cols-[0.42fr_0.58fr] items-start gap-5">
        <section className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[18px] font-black text-black">
                Active Projects
              </h2>

              <div className="flex items-center gap-1 rounded-full bg-[#fff0ea] px-3 py-1 text-[11px] font-black text-[#ff6b35]">
                <FolderKanban size={13} />
                {projects.length}
              </div>
            </div>

            {projectsLoading ? (
              <div className="rounded-xl border border-[#efefef] bg-white p-8 text-center text-sm font-bold text-[#777] shadow-[0_7px_22px_rgba(0,0,0,0.08)]">
                Loading your assigned projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-xl border border-[#efefef] bg-white p-8 text-center shadow-[0_7px_22px_rgba(0,0,0,0.08)]">
                <FolderKanban
                  size={30}
                  className="mx-auto mb-3 text-[#ff6b35]"
                />
                <p className="text-sm font-black text-black">
                  No assigned projects found
                </p>
                <p className="mt-1 text-xs font-medium text-[#777]">
                  Once admin assigns you to a project, it will appear here.
                </p>
              </div>
            ) : (
              <div className="max-h-[250px] space-y-3 overflow-y-auto pr-2">
                {projects.map((project, index) => (
                  <ProjectCard
                    key={
                      project?.id ||
                      project?._id ||
                      project?.projectId ||
                      project?.name ||
                      index
                    }
                    project={project}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          <ToDoCard />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="mb-2 text-[18px] font-black text-black">
              Overall Progress
            </h2>

            <OverallProgress projects={projects} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex h-[75px] flex-col items-center justify-center rounded-xl bg-[#ffb347] text-white shadow-[0_7px_22px_rgba(0,0,0,0.08)]">
              <p className="text-[36px] font-light leading-none">0%</p>
              <p className="text-[15px] font-black leading-none">Attendance</p>
              <p className="text-[10px] font-bold">no data this month</p>
            </div>

            <div className="flex h-[75px] items-center justify-center rounded-xl bg-[#43a579] px-8 text-center text-[18px] font-serif font-black leading-tight text-white shadow-[0_7px_22px_rgba(0,0,0,0.08)]">
              In the end, we only regret the chances we didn’t take.”
            </div>
          </div>

          <NotificationsCard projects={projects} />
        </section>
      </div>
    </div>
  );
}