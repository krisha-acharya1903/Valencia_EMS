import { getToken } from "./api";

const API_BASE = "http://localhost:5000/api";

function getAuthToken() {
  const tokenFromApi = getToken?.();

  if (tokenFromApi && tokenFromApi !== "undefined" && tokenFromApi !== "null") {
    return tokenFromApi;
  }

  const keys = [
    "token",
    "authToken",
    "valenciaToken",
    "valencia-token",
    "valencia_auth_token",
    "emsToken",
    "jwt",
    "accessToken",
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);

      if (value && value !== "undefined" && value !== "null") {
        return value;
      }
    }

    for (const key of Object.keys(storage)) {
      const value = storage.getItem(key);

      if (!value) continue;

      try {
        const parsed = JSON.parse(value);

        if (parsed?.token) return parsed.token;
        if (parsed?.authToken) return parsed.authToken;
        if (parsed?.accessToken) return parsed.accessToken;
        if (parsed?.jwt) return parsed.jwt;
        if (parsed?.session?.token) return parsed.session.token;
        if (parsed?.auth?.token) return parsed.auth.token;
        if (parsed?.data?.token) return parsed.data.token;
      } catch {
        // ignore invalid JSON
      }
    }
  }

  return "";
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Missing authorization token. Please logout and login again.");
  }

  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();

  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed: ${options.method || "GET"} ${path}`
    );
  }

  return data;
}

function extractArray(response, keys = []) {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }

  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;

  return [];
}

function getInitials(name) {
  const parts = String(name || "U").split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return String(parts[0] || "U").slice(0, 2).toUpperCase();
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(11, 16);
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

export function normalizeChatUser(user = {}, index = 0) {
  const id = String(
    user.id ||
      user.userId ||
      user.user_id ||
      user.employeeId ||
      user.employee_id ||
      ""
  );

  const name =
    user.name ||
    user.fullName ||
    user.full_name ||
    user.displayName ||
    user.display_name ||
    user.employeeName ||
    user.employee_name ||
    user.email ||
    "User";

  const email = user.email || "";

  const role = user.role || user.designation || user.position || "employee";

  const department =
    user.department ||
    user.departmentName ||
    user.department_name ||
    user.division ||
    user.divisionName ||
    user.division_name ||
    "";

  return {
    ...user,
    id,
    key: id || email || name,
    type: "person",
    chatType: "person",
    name,
    title: name,
    email,
    role,
    department,
    subtitle: [role, department].filter(Boolean).join(" • ") || email,

    unreadCount: Number(user.unreadCount || user.unread_count || 0),
    unread_count: Number(user.unreadCount || user.unread_count || 0),

    initials: getInitials(name),
    color: user.color || getAvatarColor(index),
  };
}

export function normalizeChatRoom(room = {}, index = 0) {
  const id = String(
    room.id ||
      room.roomId ||
      room.room_id ||
      (room.type === "general" ? "general" : "")
  );

  const type = room.type || room.roomType || room.room_type || "general";

  const name =
    room.name ||
    room.title ||
    (type === "project" ? "Project Chat" : "General Chat");

  const subtitle =
    room.subtitle ||
    room.description ||
    room.department ||
    (type === "project" ? "Project discussion" : "Company-wide discussion");

  return {
    ...room,
    id,
    roomId: id,
    room_id: id,
    type,
    roomType: type,
    room_type: type,
    chatType: "room",
    name,
    title: name,
    subtitle,
    projectId: room.projectId || room.project_id || "",

    unreadCount: Number(room.unreadCount || room.unread_count || 0),
    unread_count: Number(room.unreadCount || room.unread_count || 0),

    initials: type === "general" ? "GC" : "PC",
    color: type === "general" ? "bg-[#FF6B35]" : getAvatarColor(index + 1),
  };
}

export function normalizeChatMessage(message = {}) {
  const id = String(message.id || message.messageId || message.message_id || "");

  const senderId = String(
    message.senderId ||
      message.sender_id ||
      message.fromUserId ||
      message.from_user_id ||
      ""
  );

  const receiverId = String(
    message.receiverId ||
      message.receiver_id ||
      message.toUserId ||
      message.to_user_id ||
      ""
  );

  const roomId = String(message.roomId || message.room_id || "");

  const text =
    message.text ||
    message.messageText ||
    message.message_text ||
    message.body ||
    "";

  const createdAt = message.createdAt || message.created_at || "";

  const sender =
    message.sender && typeof message.sender === "object"
      ? normalizeChatUser(message.sender)
      : null;

  const receiver =
    message.receiver && typeof message.receiver === "object"
      ? normalizeChatUser(message.receiver)
      : null;

  return {
    ...message,

    id,
    messageId: id,

    roomId,
    room_id: roomId,

    senderId,
    sender_id: senderId,

    receiverId,
    receiver_id: receiverId,

    text,
    messageText: text,

    sender,
    receiver,

    senderName:
      message.senderName ||
      message.sender_name ||
      sender?.name ||
      message.fromName ||
      "User",

    receiverName:
      message.receiverName ||
      message.receiver_name ||
      receiver?.name ||
      "User",

    mine: Boolean(message.mine),

    createdAt,
    created_at: createdAt,
    time: message.time || formatTime(createdAt),

    hasAttachment: Boolean(
  message.hasAttachment === true ||
    message.has_attachment === true ||
    message.attachmentFilename ||
    message.attachment_filename ||
    message.attachmentOriginalName ||
    message.attachment_original_name ||
    message.attachmentMimeType ||
    message.attachment_mime_type ||
    Number(message.attachmentSize || message.attachment_size || 0) > 0
),

    attachmentFilename:
      message.attachmentFilename || message.attachment_filename || "",

    attachmentOriginalName:
      message.attachmentOriginalName ||
      message.attachment_original_name ||
      message.originalName ||
      message.original_name ||
      "",

    attachmentMimeType:
      message.attachmentMimeType || message.attachment_mime_type || "",

    attachmentSize: Number(message.attachmentSize || message.attachment_size || 0),

    attachmentUrl:
  message.hasAttachment === true ||
  message.has_attachment === true ||
  message.attachmentFilename ||
  message.attachment_filename ||
  message.attachmentOriginalName ||
  message.attachment_original_name ||
  Number(message.attachmentSize || message.attachment_size || 0) > 0
    ? message.attachmentUrl ||
      message.attachment_url ||
      (roomId
        ? `/api/chat/rooms/messages/${id}/attachment`
        : id
        ? `/api/chat/messages/${id}/attachment`
        : "")
    : "",
  };
}

/* ---------------- DIRECT PEOPLE CHAT ---------------- */

export async function getChatUsers() {
  const response = await apiRequest("/chat/users", {
    method: "GET",
  });

  return extractArray(response, ["users", "people"])
    .map(normalizeChatUser)
    .filter((user) => user.id);
}

export async function getChatConversations() {
  const response = await apiRequest("/chat/conversations", {
    method: "GET",
  });

  return extractArray(response, ["conversations"]);
}

export async function getChatMessages(receiverId) {
  if (!receiverId) {
    return [];
  }

  const response = await apiRequest(`/chat/messages/${receiverId}`, {
    method: "GET",
  });

  return extractArray(response, ["messages"])
    .map(normalizeChatMessage)
    .filter((message) => message.id);
}

export async function sendChatMessage({ receiverId, text = "", attachment = null }) {
  if (!receiverId) {
    throw new Error("Receiver is missing.");
  }

  const formData = new FormData();

  formData.append("receiverId", receiverId);
  formData.append("messageText", text || "");

  if (attachment) {
    formData.append("attachment", attachment);
  }

  const response = await apiRequest("/chat/messages", {
    method: "POST",
    body: formData,
  });

  return normalizeChatMessage(response?.message || response?.data || response);
}

/* ---------------- ROOM CHAT: GENERAL + PROJECTS ---------------- */

export async function getChatRooms() {
  const response = await apiRequest("/chat/rooms", {
    method: "GET",
  });

  return extractArray(response, ["rooms"])
    .map(normalizeChatRoom)
    .filter((room) => room.id);
}

export async function getChatRoomMessages(roomId) {
  if (!roomId) {
    return [];
  }

  const response = await apiRequest(`/chat/rooms/${roomId}/messages`, {
    method: "GET",
  });

  return extractArray(response, ["messages"])
    .map(normalizeChatMessage)
    .filter((message) => message.id);
}

export async function sendChatRoomMessage({
  roomId,
  text = "",
  attachment = null,
}) {
  if (!roomId) {
    throw new Error("Room is missing.");
  }

  const formData = new FormData();

  formData.append("messageText", text || "");

  if (attachment) {
    formData.append("attachment", attachment);
  }

  const response = await apiRequest(`/chat/rooms/${roomId}/messages`, {
    method: "POST",
    body: formData,
  });

  return normalizeChatMessage(response?.message || response?.data || response);
}

/* ---------------- EDIT / DELETE CHAT MESSAGE ---------------- */

export async function editChatMessage({
  messageId,
  text = "",
  roomMessage = false,
}) {
  if (!messageId) {
    throw new Error("Message ID is missing.");
  }

  const path = roomMessage
    ? `/chat/rooms/messages/${messageId}`
    : `/chat/messages/${messageId}`;

  const response = await apiRequest(path, {
    method: "PATCH",
    body: JSON.stringify({
      messageText: text,
    }),
  });

  return normalizeChatMessage(response?.message || response?.data || response);
}

export async function deleteChatMessage(messageId, options = {}) {
  if (!messageId) {
    throw new Error("Message ID is missing.");
  }

  const isRoomMessage = Boolean(options.roomMessage || options.isRoomMessage);

  const path = isRoomMessage
    ? `/chat/rooms/messages/${messageId}`
    : `/chat/messages/${messageId}`;

  const response = await apiRequest(path, {
    method: "DELETE",
  });

  return response;
}

/* ---------------- ATTACHMENT DOWNLOAD ---------------- */

export async function downloadChatAttachment(
  messageId,
  filename = "chat-attachment",
  options = {}
) {
  if (!messageId) {
    throw new Error("Message ID is missing.");
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error("Missing authorization token. Please logout and login again.");
  }

  const isRoomMessage = Boolean(options.roomMessage || options.isRoomMessage);

  const path = isRoomMessage
    ? `/chat/rooms/messages/${messageId}/attachment`
    : `/chat/messages/${messageId}/attachment`;

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = "Failed to download attachment.";

    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename || "chat-attachment";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);

  return true;
}