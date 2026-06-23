import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("employee_theme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("employee_theme", darkMode ? "dark" : "light");

    document.documentElement.classList.toggle("employee-dark", darkMode);
    document.body.classList.toggle("employee-dark", darkMode);
  }, [darkMode]);

  return (
    <div
      className={`employee-app-shell min-h-screen text-black ${
        darkMode ? "employee-dark-shell bg-[#07111f]" : "bg-white"
      }`}
    >
      <style>
        {`
          .employee-dark-shell {
            background: #07111f !important;
            color: #e5edf7 !important;
          }

          .employee-dark-shell aside,
          .employee-dark-shell header,
          .employee-dark-shell main {
            background-color: #07111f !important;
            color: #e5edf7 !important;
          }

          .employee-dark-shell [class*="bg-white"] {
            background-color: #111827 !important;
          }

          .employee-dark-shell [class*="bg-[#fff8ef]"],
          .employee-dark-shell [class*="bg-[#fff8f2]"],
          .employee-dark-shell [class*="bg-[#fbfbfb]"],
          .employee-dark-shell [class*="bg-[#fff5f2]"],
          .employee-dark-shell [class*="bg-[#fff0ee]"],
          .employee-dark-shell [class*="bg-[#fff0ea]"],
          .employee-dark-shell [class*="bg-[#FFF7F3]"],
          .employee-dark-shell [class*="bg-orange-50"] {
            background-color: #172033 !important;
          }

          .employee-dark-shell [class*="text-black"],
          .employee-dark-shell [class*="text-[#061638]"],
          .employee-dark-shell [class*="text-[#061536]"],
          .employee-dark-shell [class*="text-[#1E1E1E]"] {
            color: #f8fafc !important;
          }

          .employee-dark-shell [class*="text-[#777"],
          .employee-dark-shell [class*="text-[#6b"],
          .employee-dark-shell [class*="text-[#5f"],
          .employee-dark-shell [class*="text-slate-"],
          .employee-dark-shell [class*="text-[#8c"],
          .employee-dark-shell [class*="text-[#9a"] {
            color: #94a3b8 !important;
          }

          .employee-dark-shell [class*="border-[#e"],
          .employee-dark-shell [class*="border-[#f"],
          .employee-dark-shell [class*="border-slate-"] {
            border-color: #263244 !important;
          }

          .employee-dark-shell input,
          .employee-dark-shell textarea,
          .employee-dark-shell select {
            background-color: transparent !important;
            color: #f8fafc !important;
          }

          .employee-dark-shell input::placeholder,
          .employee-dark-shell textarea::placeholder {
            color: #94a3b8 !important;
          }

          .employee-dark-shell .shadow-2xl,
          .employee-dark-shell [class*="shadow-"] {
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35) !important;
          }
        `}
      </style>

      <Sidebar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      <div className="min-h-screen pl-[255px]">
        <header
          className={`sticky top-0 z-30 flex h-[68px] items-center border-b px-8 ${
            darkMode
              ? "border-[#263244] bg-[#07111f]"
              : "border-[#eeeeee] bg-white"
          }`}
        >
          <div className="flex w-full items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded bg-[#FF6B35] text-white shadow-sm transition hover:bg-[#ef5f2d]"
              >
                <ChevronLeft size={21} />
              </button>

              <button
                type="button"
                onClick={() => navigate(1)}
                className="flex h-9 w-9 items-center justify-center rounded bg-[#FF6B35] text-white shadow-sm transition hover:bg-[#ef5f2d]"
              >
                <ChevronRight size={21} />
              </button>
            </div>

            <div
              className={`flex h-10 flex-1 items-center gap-4 rounded-xl border px-5 ${
                darkMode
                  ? "border-[#263244] bg-[#111827]"
                  : "border-[#e8e8e8] bg-white"
              }`}
            >
              <Search
                size={20}
                className={darkMode ? "text-slate-400" : "text-[#6b6b7a]"}
              />

              <input
                type="text"
                placeholder="Search projects, tasks, people..."
                className={`h-full w-full bg-transparent text-[14px] font-medium outline-none ${
                  darkMode
                    ? "text-white placeholder:text-slate-400"
                    : "text-black placeholder:text-[#7d7d8a]"
                }`}
              />
            </div>
          </div>
        </header>

        <main
          className={`min-h-[calc(100vh-68px)] ${
            darkMode ? "bg-[#07111f]" : "bg-white"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}