import { ArrowLeft, BarChart3, BriefcaseBusiness, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "../components/ChartCard";
import StatCard from "../components/StatCard";
import { getEmployeeAnalytics } from "../services/userService";

export default function EmployeeAnalytics() {
  const { userId } = useParams();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    getEmployeeAnalytics(userId).then(setAnalytics);
  }, [userId]);

  const chartData = useMemo(() => {
    if (!analytics) {
      return [];
    }
    return analytics.tasks.map((task) => ({
      name: task.title.split(" ").slice(0, 2).join(" "),
      progress: task.progress,
    }));
  }, [analytics]);

  const attendanceData = useMemo(() => {
    if (!analytics) {
      return [];
    }
    return analytics.attendance.slice(0, 8).reverse().map((item) => ({
      date: item.date.slice(5),
      hours: item.totalHours,
    }));
  }, [analytics]);

  if (!analytics?.user) {
    return (
      <main className="page-shell">
        <div className="card p-8 text-center">Loading analytics...</div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="mobile-frame space-y-5">
        <section>
          <Link to="/users" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-valencia-orangeDark">
            <ArrowLeft size={16} />
            Back to Users
          </Link>
          <h1 className="text-3xl font-black">{analytics.user.name}</h1>
          <p className="muted mt-1">{analytics.user.designation} - {analytics.user.department}</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BriefcaseBusiness} label="Projects" value={analytics.assignedProjects.length} />
          <StatCard icon={CheckCircle2} label="Completed" value={analytics.completed} tone="green" />
          <StatCard icon={BarChart3} label="Success Rate" value={`${analytics.successRate}%`} tone="blue" />
          <StatCard icon={Clock} label="Total Hours" value={analytics.totalHours.toFixed(1)} />
        </div>

        <ChartCard title="Task Progress">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="progress" fill="#fb850f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Attendance Hours">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceData}>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis />
                <Tooltip />
                <Area dataKey="hours" stroke="#7fab19" fill="#d9efb2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Recent Submissions">
          <div className="space-y-3">
            {analytics.submissions.map((submission) => (
              <div key={submission.id} className="rounded-md border border-valencia-line p-3">
                <p className="font-bold">{submission.title}</p>
                <p className="text-sm text-valencia-muted">{submission.status.replaceAll("_", " ")} - {submission.completionPercentage}%</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </main>
  );
}
