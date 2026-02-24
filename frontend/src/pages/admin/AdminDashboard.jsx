import { BookOpen, CalendarDays, FileStack, GraduationCap, Users } from "lucide-react";
import EnrollmentChart from "../../components/charts/EnrollmentChart";
import GlassCard from "../../components/ui/GlassCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import StatCard from "../../components/ui/StatCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { adminService } from "../../services/adminService";

const AdminDashboard = () => {
  const { data, loading } = useAsyncData(adminService.getDashboard, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  const totals = data?.totals || {};
  const sessions = data?.recentSessions || [];

  return (
    <div className="dashboard-dynamic-bg student-dashboard-theme relative overflow-hidden rounded-3xl p-3 sm:p-4">
      <div className="relative z-10 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Students" value={totals.students || 0} icon={GraduationCap} tone="cyan" />
        <StatCard title="Total Teachers" value={totals.teachers || 0} icon={Users} tone="emerald" />
        <StatCard title="Courses" value={totals.courses || 0} icon={BookOpen} tone="cyan" />
        <StatCard title="Enrollments" value={totals.enrollments || 0} icon={FileStack} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <GlassCard className="xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#2f1b0d] dark:text-orange-50">Admission Trend</h2>
            <span className="rounded-full border border-orange-300/65 bg-orange-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:border-orange-400/45 dark:bg-orange-500/15 dark:text-orange-100">
              Last 6 Months
            </span>
          </div>
          <div className="mt-5">
            <EnrollmentChart data={data?.monthlyTrend || []} />
          </div>
        </GlassCard>

        <GlassCard className="xl:col-span-2">
          <h2 className="font-display text-xl font-semibold text-[#2f1b0d] dark:text-orange-50">Recent Academic Sessions</h2>
          <div className="mt-4 space-y-3">
            {sessions.length ? (
              sessions.map((session) => (
                <div key={session._id} className="glass-tile p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[#3a220f] dark:text-orange-50">
                      {session.year} {session.semester}
                    </p>
                    {session.isCurrent ? (
                      <span className="rounded-full border border-orange-300/65 bg-orange-100/75 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:border-orange-400/45 dark:bg-orange-500/15 dark:text-orange-100">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[#8c5a37] dark:text-orange-200/80">
                    {new Date(session.startDate).toLocaleDateString()} to {" "}
                    {new Date(session.endDate).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#8c5a37] dark:text-orange-200/80">No sessions available.</p>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="font-display text-xl font-semibold text-[#2f1b0d] dark:text-orange-50">Admin Focus Board</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="glass-tile p-4">
            <div className="mb-2 flex items-center gap-2 text-orange-700 dark:text-orange-100">
              <CalendarDays size={16} />
              <p className="text-sm font-semibold">Semester Planning</p>
            </div>
            <p className="text-sm text-[#8c5a37] dark:text-orange-200/80">Track registrations and publish schedules before next intake.</p>
          </div>
          <div className="glass-tile p-4">
            <div className="mb-2 flex items-center gap-2 text-orange-700 dark:text-orange-100">
              <Users size={16} />
              <p className="text-sm font-semibold">Faculty Allocation</p>
            </div>
            <p className="text-sm text-[#8c5a37] dark:text-orange-200/80">Balance course load and monitor low faculty bandwidth.</p>
          </div>
          <div className="glass-tile p-4">
            <div className="mb-2 flex items-center gap-2 text-orange-700 dark:text-orange-100">
              <BookOpen size={16} />
              <p className="text-sm font-semibold">Curriculum Updates</p>
            </div>
            <p className="text-sm text-[#8c5a37] dark:text-orange-200/80">Push revised course outcomes to students and faculty portals.</p>
          </div>
        </div>
      </GlassCard>
      </div>
    </div>
  );
};

export default AdminDashboard;

