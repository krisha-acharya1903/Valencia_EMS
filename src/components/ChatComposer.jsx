import { Paperclip, Send, Smile } from "lucide-react";
import { useRef, useState } from "react";

const emojiGroups = {
  Smileys: [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
    "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😜",
    "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞",
    "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺",
    "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶",
    "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "😶",
    "😐", "😑", "😬", "🙄", "😯", "😴", "🤤", "😪", "😵", "🤐",
  ],
  Gestures: [
    "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙",
    "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋",
    "🤝", "👏", "🙌", "🫶", "🤲", "🙏", "✍️", "💪", "🦾",
  ],
  Work: [
    "✅", "☑️", "✔️", "❌", "⭕", "📌", "📍", "📎", "📝", "📄",
    "📃", "📑", "📊", "📈", "📉", "📁", "📂", "🗂️", "🗒️", "📅",
    "📆", "🕒", "⏰", "⏳", "⌛", "💼", "🧾", "📦", "📤", "📥",
    "📧", "📨", "📩", "💻", "🖥️", "⌨️", "🖱️", "🖨️", "📞",
    "📱", "🔐", "🔒", "🔓", "🔑", "⚙️", "🛠️", "🔧", "🔨", "🧰",
    "🚀", "💡", "🎯", "🏆", "🥇", "⭐", "🌟", "🔥", "💯",
  ],
  Hearts: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
    "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️",
    "✨", "💫", "🌈",
  ],
  Food: [
    "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐",
    "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🥦", "🥬",
    "🥒", "🌶️", "🌽", "🥕", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖",
    "🧀", "🥚", "🍳", "🥞", "🥓", "🥩", "🍗", "🍖", "🌭", "🍔",
    "🍟", "🍕", "🥪", "🥙", "🌮", "🌯", "🥗", "🍝", "🍜", "🍲",
    "🍛", "🍣", "🍱", "🍤", "🍙", "🍚", "🍧", "🍨", "🍦", "🧁",
    "🍰", "🎂", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪",
  ],
  Drinks: [
    "🥛", "☕", "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻",
    "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊",
  ],
  Objects: [
    "🎁", "🎈", "🎉", "🎊", "🎀", "🪄", "🧸", "🎨", "👑", "💎",
    "🔔", "🎵", "🎶", "🎧", "🎤", "🎬", "🎮", "🧩", "🔮", "💊",
    "🧪", "🔬", "🔭", "🔋", "🔌", "💡", "🕯️", "🛒", "🪑", "🛏️",
    "🧴", "🧽", "🧼",
  ],
};

const groupNames = Object.keys(emojiGroups);

export default function ChatComposer({
  value,
  onValueChange,
  onSubmit,
  placeholder,
}) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(groupNames[0]);
  const inputRef = useRef(null);

  const hasText = value.trim().length > 0;

  function addEmoji(emoji) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;

    const nextValue = value.slice(0, start) + emoji + value.slice(end);
    const nextCursor = start + emoji.length;

    onValueChange(nextValue);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  return (
    <form
      onSubmit={(event) => {
        onSubmit(event);
        setEmojiOpen(false);
      }}
      className="shrink-0 border-t border-[#e8e8e8] bg-white px-5 py-3"
    >
      <div className="relative flex h-[58px] items-center gap-3 rounded-2xl border border-[#efd8d1] bg-[#fff4f1] px-4">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#777] transition hover:bg-white hover:text-[#FF6B35]"
        >
          <Paperclip size={19} />
        </button>

        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-black outline-none placeholder:text-[#999]"
        />

        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((prev) => !prev)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              emojiOpen
                ? "bg-white text-[#FF6B35]"
                : "text-[#777] hover:bg-white hover:text-[#FF6B35]"
            }`}
          >
            <Smile size={19} />
          </button>

          {emojiOpen ? (
            <div className="absolute bottom-[48px] right-0 z-50 w-[360px] overflow-hidden rounded-2xl border border-[#efd8d1] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
              <div className="flex gap-1 overflow-x-auto border-b border-[#f0e2dd] bg-[#fff7f4] px-3 py-2">
                {groupNames.map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setActiveGroup(group)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                      activeGroup === group
                        ? "bg-[#FF6B35] text-white"
                        : "bg-white text-[#777] hover:text-[#FF6B35]"
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>

              <div className="grid max-h-[255px] grid-cols-8 gap-1 overflow-y-auto p-3">
                {emojiGroups[activeGroup].map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={() => addEmoji(emoji)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[22px] transition hover:bg-orange-50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={!hasText}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
            hasText
              ? "bg-[#FF6B35] shadow-[0_6px_16px_rgba(255,107,53,0.38)] hover:bg-[#f05f2e]"
              : "cursor-not-allowed bg-[#ffc0ad]"
          }`}
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}