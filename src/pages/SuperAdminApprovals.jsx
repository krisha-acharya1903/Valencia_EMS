import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Paperclip,
  Search,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

const divisions = [
  "All Divisions",
  "Aroma De Valencia",
  "Bounce Super Water",
  "Can Beverages",
  "High Altitude",
  "Crunzzo",
];

const initialApprovals = [
  {
    id: 1,
    type: "project",
    title: "Q3 Brand Campaign – Final Artwork",
    division: "Aroma De Valencia",
    department: "Marketing",
    submittedBy: "Sarah Mitchell",
    sentTime: "2 hours ago",
    attachments: 3,
    status: "pending",
    description:
      "Final campaign artwork submitted for Super Admin approval before release.",
  },
  {
    id: 2,
    type: "project",
    title: "ERP Upgrade – Technical Spec Document",
    division: "Can Beverages",
    department: "Engineering",
    submittedBy: "Raghav Sinha",
    sentTime: "5 hours ago",
    attachments: 2,
    status: "pending",
    description:
      "Technical specification document for ERP upgrade approval.",
  },
  {
    id: 3,
    type: "project",
    title: "NutraCare Packaging Design",
    division: "Bounce Super Water",
    department: "Design",
    submittedBy: "Aisha Yusuf",
    sentTime: "13 hours ago",
    attachments: 6,
    status: "pending",
    description:
      "Packaging design submitted for review before production handoff.",
  },
  {
    id: 4,
    type: "leave",
    title: "Leave Request",
    division: "High Altitude",
    department: "Operations",
    submittedBy: "Employee Name",
    sentTime: "1 day ago",
    attachments: 0,
    status: "approved",
    description: "Employee leave request already approved.",
  },
  {
    id: 5,
    type: "purchase",
    title: "Raw Material Purchase Request",
    division: "Crunzzo",
    department: "Procurement",
    submittedBy: "Employee Name",
    sentTime: "2 days ago",
    attachments: 1,
    status: "rejected",
    description: "Purchase request rejected due to incomplete vendor details.",
  },
];

const tabs = [
  {
    key: "project",
    label: "Project Approvals",
    icon: ClipboardList,
  },
  {
    key: "leave",
    label: "Leave Approvals",
    icon: FileText,
  },
  {
    key: "purchase",
    label: "Purchase Approvals",
    icon: ShoppingCart,
  },
];

export default function SuperAdminApprovals() {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [activeTab, setActiveTab] = useState("project");
  const [selectedDivision, setSelectedDivision] = useState("All Divisions");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [openId, setOpenId] = useState(null);

  const filteredApprovals = useMemo(() => {
    return approvals.filter((item) => {
      const matchesTab = item.type === activeTab;

      const matchesDivision =
        selectedDivision === "All Divisions" ||
        item.division === selectedDivision;

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const search = searchTerm.toLowerCase();

      const matchesSearch =
        item.title.toLowerCase().includes(search) ||
        item.department.toLowerCase().includes(search) ||
        item.submittedBy.toLowerCase().includes(search) ||
        item.division.toLowerCase().includes(search);

      return matchesTab && matchesDivision && matchesStatus && matchesSearch;
    });
  }, [approvals, activeTab, selectedDivision, statusFilter, searchTerm]);

  const getCount = (type) => {
    return approvals.filter((item) => item.type === type).length;
  };

  const handleApproval = (id, newStatus) => {
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );

    if (newStatus === "approved") {
      toast.success("Request approved successfully");
    } else {
      toast.error("Request rejected");
    }
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const statusBadge = (status) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
          <CheckCircle2 size={14} />
          Approved
        </span>
      );
    }

    if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">
          <XCircle size={14} />
          Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-500">
        Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-white px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review pending requests across all divisions and categories
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-orange-400"
          >
            {divisions.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-orange-400"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex h-16 items-center justify-between rounded-2xl border px-5 transition ${
                isActive
                  ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-200"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={22} />
                <span className="text-sm font-semibold">{tab.label}</span>
              </span>

              <span
                className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[#FF6B35] text-white"
                }`}
              >
                {getCount(tab.key)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Search size={18} className="text-slate-400" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by project, employee, division or department..."
          className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No approval requests found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try changing the division, status or search filter.
            </p>
          </div>
        ) : (
          filteredApprovals.map((item) => {
            const isOpen = openId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4 px-5 py-5">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-[#FF6B35]">
                      {getInitials(item.submittedBy)}
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-950">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {item.division} • {item.department} • Submitted by{" "}
                        {item.submittedBy} • {item.sentTime}
                      </p>

                      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <Paperclip size={14} />
                        {item.attachments} attachment
                        {item.attachments !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {item.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleApproval(item.id, "approved")}
                          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600 transition hover:bg-emerald-100"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>

                        <button
                          onClick={() => handleApproval(item.id, "rejected")}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-500 transition hover:bg-rose-100"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </>
                    ) : (
                      statusBadge(item.status)
                    )}

                    <button
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                    >
                      {isOpen ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Division
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {item.division}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Department
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {item.department}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Submitted By
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {item.submittedBy}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-400">
                          Status
                        </p>
                        <div className="mt-1">{statusBadge(item.status)}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-400">
                        Description
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}