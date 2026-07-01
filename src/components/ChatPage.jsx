import {
  Download,
  Hash,
  Loader2,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Pencil,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  deleteChatMessage,
  downloadChatAttachment,
  editChatMessage,
  getChatMessages,
  getChatRoomMessages,
  getChatRooms,
  getChatUsers,
  normalizeChatUser,
  sendChatMessage,
  sendChatRoomMessage,
} from "../services/chatService";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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

function formatFileSize(bytes = 0) {
  const value = Number(bytes || 0);

  if (!value) return "";

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getMessageText(message) {
  return message?.text || message?.messageText || message?.message_text || "";
}

function getMessageSenderName(message) {
  return (
    message?.senderName ||
    message?.sender_name ||
    message?.sender?.name ||
    "User"
  );
}

function getMessageAttachmentName(message) {
  return (
    message?.attachmentOriginalName ||
    message?.attachment_original_name ||
    message?.attachmentFilename ||
    message?.attachment_filename ||
    "Attachment"
  );
}

function isRoomItem(item) {
  return item?.chatType === "room" || item?.type === "general" || item?.type === "project";
}

function getItemKey(item) {
  if (!item) return "";
  return `${isRoomItem(item) ? "room" : "person"}-${item.id}`;
}

function Avatar({ initials, color = "bg-indigo-500", size = "h-10 w-10", icon = null }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full ${color} text-[13px] font-black text-white`}
    >
      {icon || initials || "U"}
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

function SectionHeader({ title, count }) {
  return (
    <div className="mb-2 mt-4 flex items-center justify-between px-2 first:mt-1">
      <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#777]">
        {title}
      </p>
      <span className="text-[12px] font-black text-[#777]">{count}</span>
    </div>
  );
}

function SidebarRow({
  title,
  subtitle,
  active,
  initials,
  color,
  badge,
  icon,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left transition ${
        active ? "border border-orange-200 bg-[#fff0ea]" : "hover:bg-[#fff5f1]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar initials={initials} color={color} size="h-9 w-9" icon={icon} />

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

function MessageAttachment({ message }) {
  if (!message?.hasAttachment) return null;

  async function handleDownload() {
    try {
      await downloadChatAttachment(message.id, getMessageAttachmentName(message), {
        roomMessage: Boolean(message.roomId || message.room_id),
      });
    } catch (error) {
      console.error("Download chat attachment error:", error);
      toast.error(error?.message || "Failed to download attachment.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="mt-3 flex max-w-full items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-left text-[12px] font-black transition hover:opacity-85"
    >
      <Download size={15} />
      <span className="truncate">{getMessageAttachmentName(message)}</span>
    </button>
  );
}

function MessageBubble({ message, currentUser, onEdit, onDelete }) {
  const mine =
    Boolean(message.mine) || String(message.senderId) === String(currentUser.id);

  const senderName = getMessageSenderName(message);
  const text = getMessageText(message);
  const initials = getInitials(senderName);
  const time = message.time || "";

  if (mine) {
    return (
      <div className="group mb-7 flex justify-end">
        <div className="flex max-w-[460px] items-start gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex justify-end gap-2 text-[12px]">
              <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                <MoreVertical size={13} className="text-[#999]" />

                {text ? (
                  <button
                    type="button"
                    onClick={() => onEdit(message)}
                    className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={11} />
                    Edit
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => onDelete(message)}
                  className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              </div>

              <span className="font-medium text-[#777]">{time}</span>
              <span className="font-black text-black">You</span>
            </div>

            <div className="rounded-[20px] bg-gradient-to-br from-[#ff7a42] to-[#ff4b17] px-5 py-4 text-white shadow-[0_10px_28px_rgba(255,107,53,0.35)]">
              {text ? (
                <p className="whitespace-pre-wrap text-[15px] font-medium leading-7">
                  {text}
                </p>
              ) : null}

              <MessageAttachment message={message} />
            </div>
          </div>

          <Avatar
            initials={currentUser.initials}
            color="bg-[#FF6B35]"
            size="h-10 w-10"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-7 flex justify-start">
      <div className="flex max-w-[470px] items-start gap-3">
        <Avatar initials={initials} color="bg-indigo-500" size="h-10 w-10" />

        <div className="min-w-0">
          <div className="mb-1 flex gap-2 text-[12px]">
            <span className="font-black text-black">{senderName}</span>
            <span className="font-medium text-[#777]">{time}</span>
          </div>

          <div className="rounded-[20px] bg-[#fff0ee] px-5 py-4 text-black">
            {text ? (
              <p className="whitespace-pre-wrap text-[15px] font-medium leading-7">
                {text}
              </p>
            ) : null}

            {message?.hasAttachment ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadChatAttachment(
                      message.id,
                      getMessageAttachmentName(message),
                      {
                        roomMessage: Boolean(message.roomId || message.room_id),
                      }
                    );
                  } catch (error) {
                    toast.error(error?.message || "Failed to download attachment.");
                  }
                }}
                className="mt-3 flex max-w-full items-center gap-2 rounded-xl border border-orange-100 bg-white px-3 py-2 text-left text-[12px] font-black text-[#FF6B35] transition hover:bg-orange-50"
              >
                <Download size={15} />
                <span className="truncate">
                  {getMessageAttachmentName(message)}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage({ mode = "employee" }) {
  const { profile } = useAuth();

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentUser = useMemo(() => {
    const normalized = normalizeChatUser(profile || {}, 0);

    return {
      ...normalized,
      id:
        normalized.id ||
        String(profile?.id || profile?.userId || profile?.user_id || ""),
      initials: normalized.initials || getInitials(normalized.name),
      color: "bg-[#FF6B35]",
    };
  }, [profile]);

  const [rooms, setRooms] = useState([]);
  const [people, setPeople] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [messages, setMessages] = useState([]);

  const [roomsLoading, setRoomsLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [messageText, setMessageText] = useState("");
  const [attachment, setAttachment] = useState(null);

  const generalRooms = useMemo(() => {
    return rooms.filter((room) => room.type === "general" || room.id === "general");
  }, [rooms]);

  const projectRooms = useMemo(() => {
    return rooms.filter((room) => room.type === "project");
  }, [rooms]);

  const filteredGeneralRooms = useMemo(() => {
    const query = lower(searchText);

    if (!query) return generalRooms;

    return generalRooms.filter((room) => {
      return (
        lower(room.name).includes(query) ||
        lower(room.subtitle).includes(query)
      );
    });
  }, [generalRooms, searchText]);

  const filteredProjectRooms = useMemo(() => {
    const query = lower(searchText);

    if (!query) return projectRooms;

    return projectRooms.filter((room) => {
      return (
        lower(room.name).includes(query) ||
        lower(room.subtitle).includes(query)
      );
    });
  }, [projectRooms, searchText]);

  const filteredPeople = useMemo(() => {
    const query = lower(searchText);

    if (!query) return people;

    return people.filter((person) => {
      return (
        lower(person.name).includes(query) ||
        lower(person.email).includes(query) ||
        lower(person.role).includes(query) ||
        lower(person.department).includes(query) ||
        lower(person.subtitle).includes(query)
      );
    });
  }, [people, searchText]);

  async function loadRoomsAndPeople() {
    try {
      setRoomsLoading(true);
      setPeopleLoading(true);

      const [loadedRooms, loadedUsers] = await Promise.allSettled([
        getChatRooms(),
        getChatUsers(),
      ]);

      const visibleRooms =
        loadedRooms.status === "fulfilled" ? loadedRooms.value : [];

      const visibleUsers =
        loadedUsers.status === "fulfilled" ? loadedUsers.value : [];

      if (loadedRooms.status === "rejected") {
        console.error("Load chat rooms error:", loadedRooms.reason);
        toast.error(loadedRooms.reason?.message || "Failed to load chat rooms.");
      }

      if (loadedUsers.status === "rejected") {
        console.error("Load chat users error:", loadedUsers.reason);
        toast.error(loadedUsers.reason?.message || "Failed to load people.");
      }

      const normalizedRooms = visibleRooms.map((room, index) => ({
        ...room,
        initials: room.initials || (room.type === "general" ? "GC" : "PC"),
        color:
          room.color ||
          (room.type === "general" ? "bg-[#FF6B35]" : getAvatarColor(index + 1)),
      }));

      const normalizedUsers = visibleUsers.map((user, index) => ({
        ...user,
        initials: user.initials || getInitials(user.name),
        color: user.color || getAvatarColor(index),
      }));

      setRooms(normalizedRooms);
      setPeople(normalizedUsers);

      setActiveItem((current) => {
        const allItems = [...normalizedRooms, ...normalizedUsers];

        if (
          current &&
          allItems.some((item) => getItemKey(item) === getItemKey(current))
        ) {
          return current;
        }

        return (
          normalizedRooms.find((room) => room.id === "general") ||
          normalizedRooms[0] ||
          normalizedUsers[0] ||
          null
        );
      });
    } finally {
      setRoomsLoading(false);
      setPeopleLoading(false);
    }
  }

  async function loadMessages(item = activeItem) {
    if (!item?.id) {
      setMessages([]);
      return;
    }

    try {
      setMessagesLoading(true);

      const loadedMessages = isRoomItem(item)
        ? await getChatRoomMessages(item.id)
        : await getChatMessages(item.id);

      setMessages(loadedMessages);
      if (isRoomItem(item)) {
  setRooms((current) =>
    current.map((room) =>
      String(room.id) === String(item.id)
        ? { ...room, unreadCount: 0, unread_count: 0 }
        : room
    )
  );
} else {
  setPeople((current) =>
    current.map((person) =>
      String(person.id) === String(item.id)
        ? { ...person, unreadCount: 0, unread_count: 0 }
        : person
    )
  );
}
    } catch (error) {
      console.error("Load messages error:", error);
      toast.error(error?.message || "Failed to load messages.");
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }

  useEffect(() => {
    loadRoomsAndPeople();
  }, []);

  useEffect(() => {
    if (activeItem?.id) {
      loadMessages(activeItem);
    } else {
      setMessages([]);
    }
  }, [activeItem?.id, activeItem?.chatType, activeItem?.type]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [messages, messagesLoading, activeItem?.id]);

  function validateAndSetFile(file) {
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      toast.error("Unsupported file type. Upload PDF, JPG, PNG, DOC or DOCX.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Attachment must be 5MB or smaller.");
      return;
    }

    setAttachment(file);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    validateAndSetFile(file);
  }

  function removeAttachment() {
    setAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSend(event) {
    event.preventDefault();

    if (!activeItem?.id) {
      toast.error("Select a chat first.");
      return;
    }

    const cleanText = messageText.trim();

    if (!cleanText && !attachment) {
      return;
    }

    setSending(true);

    try {
      if (isRoomItem(activeItem)) {
        await sendChatRoomMessage({
          roomId: activeItem.id,
          text: cleanText,
          attachment,
        });
      } else {
        await sendChatMessage({
          receiverId: activeItem.id,
          text: cleanText,
          attachment,
        });
      }

      setMessageText("");
      removeAttachment();

      await loadMessages(activeItem);

      window.setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 120);
    } catch (error) {
      console.error("Send chat message error:", error);
      toast.error(error?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

    function isActiveRoomMessage(message) {
    return Boolean(message?.roomId || message?.room_id || isRoomItem(activeItem));
  }

  async function handleEditExistingMessage(message) {
    const currentText = getMessageText(message);

    if (!currentText) {
      toast.error("Only text messages can be edited.");
      return;
    }

    const nextText = window.prompt("Edit your message:", currentText);

    if (nextText === null) return;

    const cleanText = nextText.trim();

    if (!cleanText) {
      toast.error("Message cannot be empty.");
      return;
    }

    if (cleanText === currentText.trim()) return;

    try {
      setSending(true);

      await editChatMessage({
        messageId: message.id,
        text: cleanText,
        roomMessage: isActiveRoomMessage(message),
      });

      toast.success("Message updated.");
      await loadMessages(activeItem);
    } catch (error) {
      console.error("Edit message error:", error);
      toast.error(error?.message || "Failed to edit message.");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteExistingMessage(message) {
    const confirmed = window.confirm("Delete this message permanently?");

    if (!confirmed) return;

    try {
      setSending(true);

      await deleteChatMessage(message.id, {
        roomMessage: isActiveRoomMessage(message),
      });

      toast.success("Message deleted.");
      await loadMessages(activeItem);
    } catch (error) {
      console.error("Delete message error:", error);
      toast.error(error?.message || "Failed to delete message.");
    } finally {
      setSending(false);
    }
  }
  
  function handleTextareaKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  }

  const headerTitle = activeItem?.name || "Chatbox";
  const headerSubtitle = activeItem
    ? activeItem.subtitle ||
      activeItem.department ||
      activeItem.email ||
      "Start chatting"
    : "Select a chat to start messaging";

  const isLoadingList = roomsLoading || peopleLoading;

  return (
    <div className="h-[calc(100vh-76px)] overflow-hidden bg-white px-7 py-6 text-black">
      <div className="grid h-full grid-cols-[310px_1fr] overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.07)] max-lg:grid-cols-1">
        <aside className="flex min-h-0 flex-col border-r border-[#e8e8e8] bg-[#fbfbfb] max-lg:h-[320px] max-lg:border-b max-lg:border-r-0">
          <div className="border-b border-[#e8e8e8] p-3">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-[#e8e8e8] bg-white px-3">
              <Search size={15} className="text-[#999]" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search chats..."
                className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none placeholder:text-[#999]"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isLoadingList ? (
              <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-[#777]">
                Loading chats...
              </div>
            ) : (
              <>
                <SectionHeader title="General" count={filteredGeneralRooms.length} />

                {filteredGeneralRooms.length ? (
                  filteredGeneralRooms.map((room) => (
                    <SidebarRow
  key={room.id}
  initials={room.initials}
  color={room.color}
  icon={<Hash size={17} />}
  title={room.name}
  subtitle={room.subtitle}
  badge={room.unreadCount}
  active={getItemKey(activeItem) === getItemKey(room)}
  onClick={() => setActiveItem(room)}
/>
                  ))
                ) : (
                  <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-[#777]">
                    No general chat found.
                  </div>
                )}

                <SectionHeader
                  title="Project Chats"
                  count={filteredProjectRooms.length}
                />

                {filteredProjectRooms.length ? (
                  filteredProjectRooms.map((room) => (
                    <SidebarRow
  key={room.id}
  initials={room.initials}
  color={room.color}
  icon={<MessageCircle size={16} />}
  title={room.name}
  subtitle={room.subtitle}
  badge={room.unreadCount}
  active={getItemKey(activeItem) === getItemKey(room)}
  onClick={() => setActiveItem(room)}
/>
                  ))
                ) : (
                  <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-[#777]">
                    No project chats found.
                  </div>
                )}

                <SectionHeader title="People" count={filteredPeople.length} />

                {filteredPeople.length ? (
                  filteredPeople.map((person) => (
                    <SidebarRow
  key={person.id || person.key}
  initials={person.initials}
  color={person.color}
  icon={null}
  title={person.name}
  subtitle={person.subtitle}
  badge={person.unreadCount}
  active={getItemKey(activeItem) === getItemKey(person)}
  onClick={() => setActiveItem(person)}
/>
                  ))
                ) : (
                  <div className="rounded-xl bg-white px-3 py-4 text-center text-[12px] font-bold text-[#777]">
                    No people found.
                  </div>
                )}
              </>
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

              <div className="min-w-0">
                <p className="truncate text-[13px] font-black text-black">
                  {currentUser.name}
                </p>
                <p className="text-[12px] font-medium text-[#777]">
                  {mode === "superadmin"
                    ? "Super Admin"
                    : mode === "admin"
                    ? "Admin"
                    : "Online"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-white">
          <header className="flex h-[66px] shrink-0 items-center border-b border-[#e8e8e8] px-6">
            <div className="flex items-center gap-4">
              {activeItem ? (
                <Avatar
                  initials={activeItem.initials}
                  color={activeItem.color}
                  icon={
                    isRoomItem(activeItem) ? (
                      activeItem.type === "general" ? (
                        <Hash size={18} />
                      ) : (
                        <MessageCircle size={17} />
                      )
                    ) : null
                  }
                  size="h-10 w-10"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0ea] text-[20px] font-black text-[#FF6B35]">
                  #
                </div>
              )}

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
            {!activeItem ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm font-semibold text-[#999]">
                  Select a chat to start messaging.
                </p>
              </div>
            ) : messagesLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-sm font-bold text-[#777]">
                  <Loader2 size={18} className="animate-spin text-[#FF6B35]" />
                  Loading messages...
                </div>
              </div>
            ) : messages.length > 0 ? (
              <>
                {messages.map((message) => (
                 <MessageBubble
  key={message.id}
  message={message}
  currentUser={currentUser}
  onEdit={handleEditExistingMessage}
  onDelete={handleDeleteExistingMessage}
/>
                ))}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Users size={32} className="mx-auto mb-3 text-[#FF6B35]" />
                  <p className="text-sm font-semibold text-[#999]">
                    No messages yet. Start the conversation.
                  </p>
                </div>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="shrink-0 border-t border-[#e8e8e8] bg-white px-5 py-4"
          >
            {attachment ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-orange-100 bg-[#fff7f2] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black text-black">
                    {attachment.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#777]">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-orange-100 bg-white px-3 py-1.5 text-[11px] font-black text-[#FF6B35]"
                  >
                    Change
                  </button>

                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex items-end gap-3 rounded-2xl border border-[#e8e8e8] bg-[#fbfbfb] px-3 py-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                disabled={sending || !activeItem}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#777] transition hover:text-[#FF6B35] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Paperclip size={18} />
              </button>

              <textarea
                value={messageText}
                disabled={sending || !activeItem}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={
                  activeItem
                    ? `Message ${activeItem.name}...`
                    : "Select a chat first..."
                }
                rows={1}
                className="max-h-[120px] min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-[14px] font-medium text-black outline-none placeholder:text-[#999] disabled:cursor-not-allowed"
              />

              <button
                type="submit"
                disabled={
                  sending || !activeItem || (!messageText.trim() && !attachment)
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B35] text-white shadow-[0_8px_20px_rgba(255,107,53,0.28)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[#999]">
              <span>Enter to send • Shift + Enter for new line</span>
              <span>PDF, JPG, PNG, DOC, DOCX up to 5MB</span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}