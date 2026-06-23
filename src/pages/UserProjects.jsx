import { ArrowRight, FolderKanban } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    return String(person)
      .split(",")
      .map(clean)
      .filter(Boolean);
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

    if (typeof field === "string") {
      return field
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

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

function getProjectId(project, index) {
  return (
    project?.id ||
    project?._id ||
    project?.projectId ||
    project?.project_id ||
    project?.slug ||
    `project-${index}`
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

function getPersonName(person, index) {
  if (typeof person === "string") return person;

  return (
    person?.name ||
    person?.fullName ||
    person?.full_name ||
    person?.displayName ||
    person?.display_name ||
    person?.employeeName ||
    person?.employee_name ||
    person?.email ||
    `U${index + 1}`
  );
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

function getVisibleAssignees(project, profile) {
  const people = collectProjectPeople(project);

  const source =
    people.length > 0
      ? people
      : [
          {
            name:
              profile?.name ||
              profile?.fullName ||
              profile?.displayName ||
              profile?.employeeName ||
              profile?.email ||
              "Me",
            email: profile?.email,
          },
        ];

  return source.slice(0, 4).map((person, index) => {
    const name = getPersonName(person, index);

    return {
      id:
        typeof person === "string"
          ? person
          : person?.id || person?._id || person?.email || name,
      initials: initialsFromName(name),
      color:
        index % 4 === 0
          ? "bg-[#6675ff]"
          : index % 4 === 1
          ? "bg-[#ff6b35]"
          : index % 4 === 2
          ? "bg-[#35c6ad]"
          : "bg-[#cfd6e4]",
    };
  });
}

function getFolderColor(index) {
  const colors = [
    "from-[#fff0b8] via-[#ffedbd] to-[#ffe7a8]",
    "from-[#ffe3ee] via-[#ffe4f0] to-[#ffddeb]",
    "from-[#e7f4ff] via-[#dff2ff] to-[#d5ebff]",
    "from-[#e9fff4] via-[#ddfbe9] to-[#d1f4df]",
    "from-[#f3e9ff] via-[#eadcff] to-[#dfd1ff]",
    "from-[#fff0e8] via-[#ffe4d7] to-[#ffd9c9]",
  ];

  return colors[index % colors.length];
}

function ProjectFolderCard({ project, index, profile, onOpen }) {
  const title = getProjectTitle(project, index);
  const stats = getProjectStats(project);
  const assignees = getVisibleAssignees(project, profile);
  const totalPeople = collectProjectPeople(project).length;
  const extraCount = Math.max(0, totalPeople - 4);
  const folderColor = getFolderColor(index);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative h-[235px] w-[300px] overflow-hidden rounded-[22px] bg-gradient-to-br ${folderColor} p-6 text-left shadow-[0_12px_26px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.13)]`}
    >
      <div className="absolute left-0 top-0 h-[46px] w-[96px] rounded-br-[30px] bg-white/55" />
      <div className="absolute left-[70px] top-0 h-[30px] w-[65px] skew-x-[35deg] bg-white/55" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-5 flex -space-x-2">
          {assignees.map((person) => (
            <div
              key={person.id}
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-black text-white ${person.color}`}
            >
              {person.initials}
            </div>
          ))}

          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#cfd6e4] text-[10px] font-black text-white">
            +{extraCount}
          </div>
        </div>

        <h3 className="line-clamp-2 min-h-[56px] text-[23px] font-black leading-tight text-[#a86d5c]">
          {title}
        </h3>

        <p className="mt-1 text-[15px] font-bold text-[#a86d5c]">
          {stats.completed}/{stats.total} Tasks
        </p>

        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/85">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-[#ff6b35]"
              style={{ width: `${stats.progress}%` }}
            />

            <span
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#ff6b35] ring-2 ring-white"
              style={{
                left:
                  stats.progress === 0
                    ? "0px"
                    : `calc(${stats.progress}% - 6px)`,
              }}
            />
          </div>

          <span className="text-[15px] font-black text-[#ff6b35]">
            {stats.progress}%
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4 text-[12px] font-black text-[#9a6a58]">
          <span>View details</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
}


export default function UserProjects() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProjects() {
      try {
        setLoading(true);

        const response =
          typeof projectService.getAllProjects === "function"
            ? await projectService.getAllProjects()
            : typeof projectService.getProjects === "function"
            ? await projectService.getProjects()
            : [];

        if (!active) return;

        const allProjects = extractArray(response);

        const assignedProjects = allProjects.filter((project) =>
          isEmployeeInProject(project, profile)
        );

        setProjects(assignedProjects);
      } catch (error) {
        console.error("Failed to load assigned employee projects:", error);

        if (active) {
          setProjects([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      active = false;
    };
  }, [profile]);

  const assignedProjects = useMemo(() => projects, [projects]);

  function openProject(project, index) {
    const projectId = getProjectId(project, index);

    navigate(`/dashboard/projects/${projectId}`, {
      state: {
        project,
      },
    });
  }

  return (
    <div className="min-h-screen bg-white px-10 py-8 text-black">
      <div className="mb-16">
        <h1 className="text-[26px] font-black text-black">My Projects</h1>
        <p className="mt-2 text-[15px] font-bold text-[#777]">View</p>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb]">
          <p className="text-[15px] font-black text-[#777]">
            Loading your assigned projects...
          </p>
        </div>
      ) : assignedProjects.length === 0 ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-[#fffaf7] px-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0ea] text-[#ff6b35]">
            <FolderKanban size={34} />
          </div>

          <h2 className="text-[20px] font-black text-black">
            No assigned projects found
          </h2>

          <p className="mt-2 max-w-[430px] text-[14px] font-semibold leading-6 text-[#777]">
            Only projects assigned to this employee profile will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,300px))] gap-x-12 gap-y-12">
          {assignedProjects.map((project, index) => (
            <ProjectFolderCard
              key={
                project?.id ||
                project?._id ||
                project?.projectId ||
                project?.project_id ||
                project?.name ||
                index
              }
              project={project}
              index={index}
              profile={profile}
              onOpen={() => openProject(project, index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}