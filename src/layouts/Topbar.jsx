import { Search } from "lucide-react";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center border-b border-[#eeeeee] bg-white px-8">
      <div className="flex h-10 w-full items-center gap-4 rounded-xl border border-[#e8e8e8] bg-white px-5">
        <Search size={20} className="text-[#6b6b7a]" />

        <input
          type="text"
          placeholder="Search projects, tasks, people..."
          className="h-full w-full bg-transparent text-[14px] font-medium text-black outline-none placeholder:text-[#7d7d8a]"
        />
      </div>
    </header>
  );
}