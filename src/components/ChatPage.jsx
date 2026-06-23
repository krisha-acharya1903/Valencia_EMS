import {
  Briefcase,
  ChevronDown,
  Hash,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ChatComposer from "./ChatComposer";
import { useAuth } from "../context/AuthContext";
import * as projectService from "../services/projectService";
import * as userService from "../services/userService";
import * as chatStorage from "../utils/chatStorage";

function fallbackExtractArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function clean(value) {
  return String(value || "").trim();
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function getInitials(value) {
  const name = clean(value);

  if (!name) return "U";

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarColor(index = 0) {
  const colors = [
    "bg-[#FF6B35]",
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-sky-500",
    "bg-violet-500",
  ];

  return colors[index % colors.length];
}

function fallbackNormalizeChatUser(user = {}, index = 0) {
  const name =
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    user?.displayName ||
    user?.display_name ||
    user?.employeeName ||
    user?.employee_name ||
    user?.email ||
    "User";

  const email = user?.email || "";

  const key = lower(
    user?.id ||
      user?._id ||
      user?.uid ||
      user?.userId ||
      user?.user_id ||
      user?.employeeId ||
      user?.employee_id ||
      email ||
      name
  );

  const role = user?.role || user?.designation || user?.position || "employee";

  const subtitle =
    user?.department ||
    user?.departmentName ||
    user?.department_name ||
    user?.division ||
    user?.divisionName ||
    user?.division_name ||
    role ||
    email ||
    "Team Member";

  return {
    ...user,
    key,
    id: key,
    name,
    email,
    role,
    subtitle,
    initials: getInitials(name),
    color: user?.color || getAvatarColor(index),
  };
}

function normalizeRole(role) {
  return String(role || "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .toLowerCase();
}

function isEmployeeLikeFallback(role) {
  const cleanRole = normalizeRole(role);
  return (
    cleanRole === "employee" ||
    cleanRole === "teammember" ||
    cleanRole === "staff" ||
    cleanRole === "user" ||
    cleanRole === "member"
  );
}

function isAdminLike(role) {
  const cleanRole = normalizeRole(role);

  return (
    cleanRole === "admin" ||
    cleanRole === "manager" ||
    cleanRole === "superadmin" ||
    cleanRole === "superadministrator"
  );
}

function canShowPersonForMode(person, mode) {
  const cleanMode = normalizeRole(mode);
  const role = person?.role;

  const isEmployeeLike =
    typeof chatStorage.isEmployeeLike === "function"
      ? chatStorage.isEmployeeLike
      : isEmployeeLikeFallback;

  if (cleanMode === "superadmin") {
    return true;
  }

  if (cleanMode === "admin") {
    return isEmployeeLike(role);
  }

  if (cleanMode === "employee") {
    return true;
  }

  return true;
}

function getProjectName(project, index) {
  return (
    project?.name ||
    project?.title ||
    project?.projectName ||
    project?.project_name ||
    `Project ${index + 1}`
  );
}

function getProjectId(project, index) {
  const raw =
    project?.id ||
    project?._id ||
    project?.projectId ||
    project?.project_id ||
    getProjectName(project, index);

  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getProjectSubtitle(project) {
  return (
    project?.departmentName ||
    project?.department_name ||
    project?.department ||
    project?.division ||
    project?.divisionName ||
    project?.manager ||
    "Project channel"
  );
}

function extractArray(response) {
  if (typeof chatStorage.extractArray === "function") {
    return chatStorage.extractArray(response);
  }

  return fallbackExtractArray(response);
}

function normalizeChatUser(user, index) {
  if (typeof chatStorage.normalizeChatUser === "function") {
    return chatStorage.normalizeChatUser(user, index);
  }

  return fallbackNormalizeChatUser(user, index);
}

function readChatUsers() {
  if (typeof chatStorage.readChatUsers === "function") {
    return chatStorage.readChatUsers();
  }

  return [];
}

function saveChatUsers(users) {
  if (typeof chatStorage.saveChatUsers === "function") {
    chatStorage.saveChatUsers(users);
  }
}

function registerChatUser(user) {
  if (typeof chatStorage.registerChatUser === "function") {
    chatStorage.registerChatUser(user);
  }
}

function mergeChatUsers(...groups) {
  if (typeof chatStorage.mergeChatUsers === "function") {
    return chatStorage.mergeChatUsers(...groups);
  }

  const map = new Map();

  groups.flat().forEach((user, index) => {
    const normalized = normalizeChatUser(user, index);

    if (normalized?.key) {
      map.set(normalized.key, {
        ...(map.get(normalized.key) || {}),
        ...normalized,
      });
    }
  });

  return Array.from(map.values());
}

function makeDirectChatId(userA, userB) {
  if (typeof chatStorage.makeDirectChatId === "function") {
    return chatStorage.makeDirectChatId(userA, userB);
  }

  const a = userA?.key || userA?.id || userA?.email || "a";
  const b = userB?.key || userB?.id || userB?.email || "b";

  return `dm:${[a, b].map(lower).sort().join("__")}`;
}

function makeChannelChatId(channelKey) {
  if (typeof chatStorage.makeChannelChatId === "function") {
    return chatStorage.makeChannelChatId(channelKey);
  }

  return `channel:${channelKey}`;
}

function getMessagesForChat(chatId) {
  if (typeof chatStorage.getMessagesForChat === "function") {
    return chatStorage.getMessagesForChat(chatId);
  }

  return [];
}

function getChatStatsForUser(chatId, userKey) {
  if (typeof chatStorage.getChatStatsForUser === "function") {
    return chatStorage.getChatStatsForUser(chatId, userKey);
  }

  const messages = getMessagesForChat(chatId);
  const latestMessage = messages[messages.length - 1] || null;

  return {
    unreadCount: 0,
    latestTime: latestMessage?.createdAt
      ? new Date(latestMessage.createdAt).getTime()
      : 0,
    latestMessage,
  };
}

function markChatRead(chatId, userKey) {
  if (typeof chatStorage.markChatRead === "function") {
    chatStorage.markChatRead(chatId, userKey);
  }
}

function appendDirectMessage(payload) {
  if (typeof chatStorage.appendDirectMessage === "function") {
    chatStorage.appendDirectMessage(payload);
  }
}

function appendChannelMessage(payload) {
  if (typeof chatStorage.appendChannelMessage === "function") {
    chatStorage.appendChannelMessage(payload);
  }
}

function subscribeChatUpdates(callback) {
  if (typeof chatStorage.subscribeChatUpdates === "function") {
    return chatStorage.subscribeChatUpdates(callback);
  }

  return () => {};
}

function getDirectPartnersForUser(userKey) {
  if (typeof chatStorage.getDirectPartnersForUser === "function") {
    return chatStorage.getDirectPartnersForUser(userKey);
  }

  return [];
}

function Avatar({ initials, color = "bg-indigo-500", size = "h-10 w-10" }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full ${color} text-[13px] font-black text-white`}
    >
      {initials || "U"}
    </div>
  );
}

function Badge({ children }) {
  if (!children || Number(children) === 0) return null;

  return (
    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#FF6B35] px-2 text-[11px] font-black text-white">
      {children}
    </span>
  );
}

function SectionTitle({ title, count }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-2">
      <div className="flex items-center gap-2">
        <ChevronDown size={15} className="text-[#777]" />
        <p className="text-[13px] font-black uppercase tracking-[0.12em] text-[#777]">
          {title}
        </p>
      </div>

      <span className="text-[13px] font-black text-[#777]">{count}</span>
    </div>
  );
}

function SidebarRow({
  icon,
  title,
  subtitle,
  badge,
  active,
  initials,
  color,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
        active
          ? "border border-orange-200 bg-[#fff0ea]"
          : "hover:bg-[#fff5f1]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {initials ? (
          <Avatar initials={initials} color={color} size="h-9 w-9" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4ef] text-[17px] font-black text-black">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <p
            className={`truncate text-[14px] font-black ${
              active ? "text-[#FF6B35]" : "text-black"
            }`}
          >
            {title}
          </p>

          {subtitle ? (
            <p className="mt-0.5 max-w-[165px] truncate text-[12px] font-medium text-[#777]">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      <Badge>{badge}</Badge>
    </button>
  );
}

function MessageBubble({ message, currentUser }) {
  const mine = message.mine ?? message.fromKey === currentUser.key;

  const sender = message.sender || message.fromName || "User";
  const initials =
    message.initials || message.senderInitials || message.fromInitials || "U";
  const color =
    message.color ||
    message.senderColor ||
    message.fromColor ||
    "bg-indigo-500";

  if (mine) {
    return (
      <div className="mb-7 flex justify-end">
        <div className="flex max-w-[420px] items-start gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex justify-end gap-2 text-[12px]">
              <span className="font-medium text-[#777]">{message.time}</span>
              <span className="font-black text-black">{sender}</span>
            </div>

            <div className="rounded-[20px] bg-gradient-to-br from-[#ff7a42] to-[#ff4b17] px-5 py-4 text-white shadow-[0_10px_28px_rgba(255,107,53,0.35)]">
              <p className="text-[15px] font-medium leading-7">
                {message.text}
              </p>
            </div>
          </div>

          <Avatar initials={initials} color={color} size="h-10 w-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-7 flex justify-start">
      <div className="flex max-w-[470px] items-start gap-3">
        <Avatar initials={initials} color={color} size="h-10 w-10" />

        <div className="min-w-0">
          <div className="mb-1 flex gap-2 text-[12px]">
            <span className="font-black text-black">{sender}</span>
            <span className="font-medium text-[#777]">{message.time}</span>
          </div>

          <div className="rounded-[20px] bg-[#fff0ee] px-5 py-4 text-black">
            <p className="text-[15px] font-medium leading-7">
              {message.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage({ mode = "employee" }) {
  const { profile } = useAuth();

  const currentUser = useMemo(() => normalizeChatUser(profile || {}, 0), [
    profile,
  ]);

  const [activeType, setActiveType] = useState("general");
  const [activeProject, setActiveProject] = useState(null);
  const [activePerson, setActivePerson] = useState(null);

  const [people, setPeople] = useState([]);
  const [projects, setProjects] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageRevision, setMessageRevision] = useState(0);

  useEffect(() => {
    if (currentUser?.key) {
      registerChatUser(currentUser);
    }
  }, [currentUser?.key]);

  useEffect(() => {
    return subscribeChatUpdates(() => {
      setMessageRevision((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPeople() {
      try {
        setPeopleLoading(true);

        const response =
          typeof userService.getUsers === "function"
            ? await userService.getUsers()
            : [];

        if (!active) return;

        const apiUsers = extractArray(response).map((user, index) =>
          normalizeChatUser(user, index)
        );

        const cachedUsers = readChatUsers();
        const messagePartners = getDirectPartnersForUser(currentUser.key);

        const mergedUsers = mergeChatUsers(apiUsers, cachedUsers, messagePartners, [
          currentUser,
        ]);

        saveChatUsers(mergedUsers);

        const visiblePeople = mergedUsers
          .filter((user) => user.key !== currentUser.key)
          .filter((user) => canShowPersonForMode(user, mode));

        setPeople(visiblePeople);
      } catch {
        if (!active) return;

        const cachedUsers = readChatUsers()
          .map((user, index) => normalizeChatUser(user, index))
          .filter((user) => user.key !== currentUser.key);

        const messagePartners = getDirectPartnersForUser(currentUser.key);

        const mergedUsers = mergeChatUsers(cachedUsers, messagePartners).filter(
          (user) => canShowPersonForMode(user, mode)
        );

        setPeople(mergedUsers);
      } finally {
        if (active) {
          setPeopleLoading(false);
        }
      }
    }

    if (currentUser?.key) {
      loadPeople();
    }

    return () => {
      active = false;
    };
  }, [currentUser?.key, mode]);

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

        const realProjects = extractArray(response).map((project, index) => ({
          id: getProjectId(project, index),
          name: getProjectName(project, index),
          subtitle: getProjectSubtitle(project),
          original: project,
        }));

        setProjects(realProjects);
      } catch {
        if (!active) return;
        setProjects([]);
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
  }, []);

  const generalChatId = makeChannelChatId("general");

  const generalStats = useMemo(() => {
    return getChatStatsForUser(generalChatId, currentUser.key);
  }, [generalChatId, currentUser.key, messageRevision]);

  const projectRows = useMemo(() => {
    const query = lower(searchText);

    return projects
      .filter((project) => {
        if (!query) return true;

        return (
          lower(project.name).includes(query) ||
          lower(project.subtitle).includes(query)
        );
      })
      .map((project) => {
        const chatId = makeChannelChatId(`project-${project.id}`);
        const stats = getChatStatsForUser(chatId, currentUser.key);

        return {
          ...project,
          chatId,
          unreadCount: stats.unreadCount,
          latestTime: stats.latestTime,
          preview: stats.latestMessage
            ? `${stats.latestMessage.sender}: ${stats.latestMessage.text}`
            : project.subtitle,
        };
      })
      .sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }

        if (b.latestTime !== a.latestTime) {
          return b.latestTime - a.latestTime;
        }

        return a.name.localeCompare(b.name);
      });
  }, [projects, currentUser.key, messageRevision, searchText]);

  const directRows = useMemo(() => {
    const query = lower(searchText);

    const cachedPeople = readChatUsers()
      .map((user, index) => normalizeChatUser(user, index))
      .filter((user) => user.key !== currentUser.key);

    const messagePartners = getDirectPartnersForUser(currentUser.key);

    let mergedPeople = mergeChatUsers(people, cachedPeople, messagePartners)
      .filter((user) => user.key !== currentUser.key)
      .filter((user) => canShowPersonForMode(user, mode));

    if (query) {
      mergedPeople = mergedPeople.filter((person) => {
        return (
          lower(person.name).includes(query) ||
          lower(person.subtitle).includes(query) ||
          lower(person.email).includes(query) ||
          lower(person.role).includes(query)
        );
      });
    }

    return mergedPeople
      .map((person) => {
        const chatId = makeDirectChatId(currentUser, person);
        const stats = getChatStatsForUser(chatId, currentUser.key);

        return {
          ...person,
          chatId,
          unreadCount: stats.unreadCount,
          latestTime: stats.latestTime,
          preview: stats.latestMessage
            ? `${stats.latestMessage.sender}: ${stats.latestMessage.text}`
            : person.subtitle,
        };
      })
      .sort((a, b) => {
        const aAdmin = isAdminLike(a.role) ? 1 : 0;
        const bAdmin = isAdminLike(b.role) ? 1 : 0;

        if (b.unreadCount !== a.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }

        if (b.latestTime !== a.latestTime) {
          return b.latestTime - a.latestTime;
        }

        if (bAdmin !== aAdmin) {
          return bAdmin - aAdmin;
        }

        return a.name.localeCompare(b.name);
      });
  }, [people, currentUser, searchText, mode, messageRevision]);

  const activeChatId = useMemo(() => {
    if (activeType === "dm" && activePerson) {
      return makeDirectChatId(currentUser, activePerson);
    }

    if (activeType === "project" && activeProject) {
      return makeChannelChatId(`project-${activeProject.id}`);
    }

    return generalChatId;
  }, [activeType, activePerson, activeProject, currentUser, generalChatId]);

  const activeMessages = useMemo(() => {
    return getMessagesForChat(activeChatId);
  }, [activeChatId, messageRevision]);

  useEffect(() => {
    if (!activeChatId || !currentUser.key) return;

    const stats = getChatStatsForUser(activeChatId, currentUser.key);

    if (stats.unreadCount > 0) {
      markChatRead(activeChatId, currentUser.key);
      setMessageRevision((prev) => prev + 1);
    }
  }, [activeChatId, currentUser.key, messageRevision]);

  function selectGeneral() {
    setActiveType("general");
    setActiveProject(null);
    setActivePerson(null);
  }

  function selectProject(project) {
    setActiveType("project");
    setActiveProject(project);
    setActivePerson(null);
  }

  function selectPerson(person) {
    setActiveType("dm");
    setActivePerson(person);
    setActiveProject(null);
  }

  function sendMessage(event) {
    event.preventDefault();

    const cleanText = messageText.trim();

    if (!cleanText) return;

    if (activeType === "dm" && activePerson) {
      appendDirectMessage({
        chatId: makeDirectChatId(currentUser, activePerson),
        fromUser: currentUser,
        toUser: activePerson,
        text: cleanText,
      });
    } else {
      appendChannelMessage({
        chatId: activeChatId,
        fromUser: currentUser,
        text: cleanText,
      });
    }

    setMessageText("");
    setMessageRevision((prev) => prev + 1);
  }

  const headerTitle =
    activeType === "dm"
      ? activePerson?.name
      : activeType === "project"
      ? activeProject?.name
      : "# General";

  const headerSubtitle =
    activeType === "dm"
      ? activePerson?.subtitle
      : activeType === "project"
      ? activeProject?.subtitle
      : mode === "superadmin"
      ? "All departments"
      : "Company-wide chat";

  const headerIcon =
    activeType === "dm" ? (
      <Avatar
        initials={activePerson?.initials}
        color={activePerson?.color}
        size="h-10 w-10"
      />
    ) : activeType === "project" ? (
      <Briefcase size={20} />
    ) : (
      <Hash size={20} />
    );

  const placeholder =
    activeType === "dm"
      ? `Message ${activePerson?.name || ""}...`
      : activeType === "project"
      ? `Message ${activeProject?.name || "project"}...`
      : "Message #general...";

  return (
    <div className="h-[calc(100vh-76px)] overflow-hidden bg-white px-7 py-6 text-black">
      <div className="grid h-full grid-cols-[280px_1fr] overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.07)]">
        <aside className="flex min-h-0 flex-col border-r border-[#e8e8e8] bg-[#fbfbfb]">
          <div className="border-b border-[#e8e8e8] p-3">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-[#e8e8e8] bg-white px-3">
              <Search size={15} className="text-[#999]" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search messages..."
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[#999]"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <SidebarRow
              icon={<Hash size={17} />}
              title="General"
              subtitle={
                generalStats.latestMessage
                  ? `${generalStats.latestMessage.sender}: ${generalStats.latestMessage.text}`
                  : mode === "superadmin"
                  ? "All departments"
                  : "Company-wide chat"
              }
              badge={generalStats.unreadCount}
              active={activeType === "general"}
              onClick={selectGeneral}
            />

            <SectionTitle
              title="Project Channels"
              count={projectsLoading ? "..." : projectRows.length}
            />

            {projectsLoading ? (
              <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-[#777]">
                Loading projects...
              </div>
            ) : projectRows.length === 0 ? (
              <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-[#777]">
                No project channels found
              </div>
            ) : (
              projectRows.map((project) => (
                <SidebarRow
                  key={project.id}
                  icon={<Briefcase size={17} />}
                  title={project.name}
                  subtitle={project.preview}
                  badge={project.unreadCount}
                  active={
                    activeType === "project" && activeProject?.id === project.id
                  }
                  onClick={() => selectProject(project)}
                />
              ))
            )}

            <SectionTitle
              title="Direct Messages"
              count={peopleLoading ? "..." : directRows.length}
            />

            {peopleLoading ? (
              <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-[#777]">
                Loading users...
              </div>
            ) : directRows.length === 0 ? (
              <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-[#777]">
                No users found
              </div>
            ) : (
              directRows.map((person) => (
                <SidebarRow
                  key={person.key}
                  initials={person.initials}
                  color={person.color}
                  title={person.name}
                  subtitle={person.preview}
                  badge={person.unreadCount}
                  active={
                    activeType === "dm" && activePerson?.key === person.key
                  }
                  onClick={() => selectPerson(person)}
                />
              ))
            )}
          </div>

          <div className="border-t border-[#e8e8e8] bg-white p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar
                  initials={currentUser.initials}
                  color="bg-[#FF6B35]"
                  size="h-10 w-10"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#20c997]" />
              </div>

              <div>
                <p className="text-[13px] font-black text-black">
                  {currentUser.name}
                </p>
                <p className="text-[12px] font-medium text-[#777]">
                  {mode === "superadmin" ? "Super Admin" : "Online"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-white">
          <header className="flex h-[66px] shrink-0 items-center border-b border-[#e8e8e8] px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0ea] text-[20px] font-black text-black">
                {headerIcon}
              </div>

              <div>
                <h1 className="text-[17px] font-black text-black">
                  {headerTitle}
                </h1>
                <p className="mt-0.5 text-[13px] font-medium text-[#777]">
                  {headerSubtitle}
                </p>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {activeMessages.length > 0 ? (
              activeMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                />
              ))
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm font-semibold text-[#999]">
                  No messages yet. Start the conversation.
                </p>
              </div>
            )}
          </div>

          <ChatComposer
            value={messageText}
            onValueChange={setMessageText}
            onSubmit={sendMessage}
            placeholder={placeholder}
          />
        </section>
      </div>
    </div>
  );
}