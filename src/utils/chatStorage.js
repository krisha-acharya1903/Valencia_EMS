const CHAT_MESSAGES_KEY = "valencia_shared_chat_messages_v2";
const CHAT_USERS_KEY = "valencia_chat_users_registry_v2";
const CHAT_READS_KEY = "valencia_chat_read_receipts_v2";
const CHAT_EVENT_NAME = "valencia-chat-updated";

export function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function extractArray(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.projects)) return response.projects;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

export function normalizeRole(role) {
  return String(role || "")
    .replaceAll("_", "")
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .toLowerCase();
}

export function isEmployeeLike(role) {
  const cleanRole = normalizeRole(role);

  return (
    cleanRole === "employee" ||
    cleanRole === "user" ||
    cleanRole === "teammember" ||
    cleanRole === "staff" ||
    cleanRole === ""
  );
}

export function getUserKey(user) {
  return String(
    user?.email ||
      user?.id ||
      user?._id ||
      user?.uid ||
      user?.userId ||
      user?.user_id ||
      user?.phone ||
      user?.name ||
      user?.fullName ||
      ""
  )
    .trim()
    .toLowerCase();
}

export function getUserName(user, fallback = "User") {
  return (
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    user?.displayName ||
    user?.display_name ||
    user?.employeeName ||
    user?.employee_name ||
    user?.email?.split("@")?.[0] ||
    fallback
  );
}

export function getUserSubtitle(user) {
  return (
    user?.designation ||
    user?.position ||
    user?.roleTitle ||
    user?.role_title ||
    user?.departmentName ||
    user?.department_name ||
    user?.department ||
    user?.division ||
    user?.role ||
    user?.email ||
    "Team Member"
  );
}

export function getInitials(name) {
  const cleanName = String(name || "").trim();

  if (!cleanName) return "U";

  return cleanName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getAvatarColor(index) {
  const colors = [
    "bg-[#FF6B35]",
    "bg-emerald-400",
    "bg-yellow-400",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-purple-500",
    "bg-lime-500",
    "bg-red-500",
    "bg-blue-500",
  ];

  return colors[Math.abs(index) % colors.length];
}

export function normalizeChatUser(user, index = 0) {
  const name = getUserName(user, `User ${index + 1}`);
  const key = getUserKey(user) || `user-${index + 1}`;

  return {
    id: key,
    key,
    rawId:
      user?.id ||
      user?._id ||
      user?.uid ||
      user?.userId ||
      user?.user_id ||
      key,
    name,
    initials: getInitials(name),
    subtitle: getUserSubtitle(user),
    role: user?.role || "",
    email: user?.email || "",
    color: user?.color || getAvatarColor(index),
    original: user,
  };
}

function stableUserForStorage(user) {
  return {
    id: user.id || user.key,
    key: user.key,
    rawId: user.rawId,
    name: user.name,
    initials: user.initials,
    subtitle: user.subtitle,
    role: user.role || "",
    email: user.email || "",
    color: user.color || "bg-[#FF6B35]",
  };
}

function areSameJson(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function readChatUsers() {
  const users = safeParse(localStorage.getItem(CHAT_USERS_KEY), []);
  return Array.isArray(users) ? users : [];
}

export function saveChatUsers(users) {
  const cleanUsers = Array.isArray(users)
    ? users
        .map((user, index) =>
          stableUserForStorage(normalizeChatUser(user, index))
        )
        .filter((user) => user.key)
    : [];

  const currentUsers = readChatUsers().map((user, index) =>
    stableUserForStorage(normalizeChatUser(user, index))
  );

  if (areSameJson(currentUsers, cleanUsers)) return;

  localStorage.setItem(CHAT_USERS_KEY, JSON.stringify(cleanUsers));
  window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME));
}

export function registerChatUser(user) {
  const normalized = normalizeChatUser(user, 0);

  if (!normalized.key) return normalized;

  const existing = readChatUsers();
  const map = new Map();

  existing.forEach((item, index) => {
    const clean = normalizeChatUser(item, index);
    if (clean.key) map.set(clean.key, clean);
  });

  map.set(normalized.key, {
    ...map.get(normalized.key),
    ...normalized,
  });

  saveChatUsers(Array.from(map.values()));

  return normalized;
}

export function mergeChatUsers(...groups) {
  const map = new Map();

  groups.flat().forEach((user, index) => {
    const normalized = normalizeChatUser(user, index);

    if (!normalized.key) return;

    map.set(normalized.key, {
      ...map.get(normalized.key),
      ...normalized,
    });
  });

  return Array.from(map.values());
}

export function makeDirectChatId(userA, userB) {
  const keyA =
    typeof userA === "string" ? userA : userA?.key || getUserKey(userA);
  const keyB =
    typeof userB === "string" ? userB : userB?.key || getUserKey(userB);

  return `dm:${[keyA, keyB].sort().join("__")}`;
}

export function makeChannelChatId(channelId) {
  return `channel:${channelId}`;
}

export function readAllChatMessages() {
  const data = safeParse(localStorage.getItem(CHAT_MESSAGES_KEY), {});
  return data && typeof data === "object" ? data : {};
}

export function saveAllChatMessages(data) {
  const currentData = readAllChatMessages();

  if (areSameJson(currentData, data)) return;

  localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME));
}

export function getMessagesForChat(chatId) {
  if (!chatId) return [];

  const allMessages = readAllChatMessages();
  const messages = allMessages[chatId];

  return Array.isArray(messages) ? messages : [];
}

export function setMessagesForChat(chatId, messages) {
  if (!chatId) return;

  const allMessages = readAllChatMessages();

  saveAllChatMessages({
    ...allMessages,
    [chatId]: messages,
  });
}

function createMessage({ chatId, fromUser, text, type = "direct", toUser }) {
  const now = new Date();

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    chatId,
    type,

    fromKey: fromUser.key,
    fromName: fromUser.name,
    fromInitials: fromUser.initials,
    fromColor: fromUser.color || "bg-[#FF6B35]",

    toKey: toUser?.key || "",
    toName: toUser?.name || "",
    toInitials: toUser?.initials || "",
    toColor: toUser?.color || "bg-[#FF6B35]",

    sender: fromUser.name,
    senderInitials: fromUser.initials,
    senderColor: fromUser.color || "bg-[#FF6B35]",

    text,
    createdAt: now.toISOString(),
    time: now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

export function appendDirectMessage({ chatId, fromUser, toUser, text }) {
  if (!chatId || !fromUser?.key || !toUser?.key) return null;

  const mergedUsers = mergeChatUsers(readChatUsers(), [fromUser, toUser]);
  saveChatUsers(mergedUsers);

  const message = createMessage({
    chatId,
    fromUser,
    toUser,
    text,
    type: "direct",
  });

  const currentMessages = getMessagesForChat(chatId);
  setMessagesForChat(chatId, [...currentMessages, message]);

  return message;
}

export function appendChannelMessage({ chatId, fromUser, text }) {
  if (!chatId || !fromUser?.key) return null;

  registerChatUser(fromUser);

  const message = createMessage({
    chatId,
    fromUser,
    text,
    type: "channel",
  });

  const currentMessages = getMessagesForChat(chatId);
  setMessagesForChat(chatId, [...currentMessages, message]);

  return message;
}

export function getDirectPartnersForUser(currentUserKey) {
  if (!currentUserKey) return [];

  const allMessages = readAllChatMessages();
  const users = [];

  Object.entries(allMessages).forEach(([chatId, messages]) => {
    if (!chatId.startsWith("dm:")) return;
    if (!Array.isArray(messages)) return;

    messages.forEach((message) => {
      if (message.fromKey === currentUserKey && message.toKey) {
        users.push({
          key: message.toKey,
          id: message.toKey,
          name: message.toName || message.toKey.split("@")[0] || "User",
          initials: message.toInitials || getInitials(message.toName),
          subtitle: "Direct message",
          role: "",
          email: message.toKey.includes("@") ? message.toKey : "",
          color: message.toColor || "bg-[#FF6B35]",
        });
      }

      if (message.toKey === currentUserKey && message.fromKey) {
        users.push({
          key: message.fromKey,
          id: message.fromKey,
          name:
            message.fromName ||
            message.sender ||
            message.fromKey.split("@")[0] ||
            "User",
          initials:
            message.fromInitials ||
            message.senderInitials ||
            getInitials(message.fromName || message.sender),
          subtitle: "Direct message",
          role: "",
          email: message.fromKey.includes("@") ? message.fromKey : "",
          color:
            message.fromColor ||
            message.senderColor ||
            "bg-[#FF6B35]",
        });
      }
    });
  });

  return mergeChatUsers(users);
}

export function readChatReads() {
  const reads = safeParse(localStorage.getItem(CHAT_READS_KEY), {});
  return reads && typeof reads === "object" ? reads : {};
}

export function saveChatReads(reads) {
  const currentReads = readChatReads();

  if (areSameJson(currentReads, reads)) return;

  localStorage.setItem(CHAT_READS_KEY, JSON.stringify(reads));
  window.dispatchEvent(new CustomEvent(CHAT_EVENT_NAME));
}

export function getLastReadAt(chatId, userKey) {
  if (!chatId || !userKey) return "";

  const reads = readChatReads();

  return reads?.[userKey]?.[chatId] || "";
}

export function markChatRead(chatId, userKey) {
  if (!chatId || !userKey) return;

  const reads = readChatReads();

  const nextReads = {
    ...reads,
    [userKey]: {
      ...(reads[userKey] || {}),
      [chatId]: new Date().toISOString(),
    },
  };

  saveChatReads(nextReads);
}

export function getChatStatsForUser(chatId, currentUserKey) {
  const messages = getMessagesForChat(chatId);
  const latestMessage = messages[messages.length - 1] || null;

  const lastReadAt = getLastReadAt(chatId, currentUserKey);
  const lastReadTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;

  const unreadCount = messages.filter((message) => {
    const createdTime = message?.createdAt
      ? new Date(message.createdAt).getTime()
      : 0;

    return message.fromKey !== currentUserKey && createdTime > lastReadTime;
  }).length;

  return {
    latestMessage,
    unreadCount,
    latestTime: latestMessage?.createdAt
      ? new Date(latestMessage.createdAt).getTime()
      : 0,
  };
}

export function subscribeChatUpdates(callback) {
  function handleStorage(event) {
    if (
      event.key === CHAT_MESSAGES_KEY ||
      event.key === CHAT_USERS_KEY ||
      event.key === CHAT_READS_KEY
    ) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHAT_EVENT_NAME, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHAT_EVENT_NAME, callback);
  };
}