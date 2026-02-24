import { useCallback, useMemo, useState } from "react";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const statusBadgeClass = {
  present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  absent: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  late: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const toStatusLabel = (value) => {
  if (!value) return "Unknown";
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
};

const toDisplayDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Invalid date";
  return parsed.toLocaleDateString();
};

const StudentAttendancePage = () => {
  const fetchAttendanceSummary = useCallback(() => studentService.getAttendance(), []);
  const fetchAttendanceLogs = useCallback(() => studentService.getAttendanceLogs(120), []);
  const [selectedCourseId, setSelectedCourseId] = useState("all");

  const { data: summary, loading: loadingSummary } = useAsyncData(fetchAttendanceSummary, []);
  const { data: logs, loading: loadingLogs } = useAsyncData(fetchAttendanceLogs, []);
  const courseOptions = useMemo(() => {
    const optionsMap = new Map();

    (summary || []).forEach((item) => {
      if (!item.courseId) return;
      optionsMap.set(String(item.courseId), {
        id: String(item.courseId),
        code: item.courseCode || "N/A",
        title: item.courseName || "Unknown Course",
      });
    });

    (logs || []).forEach((item) => {
      if (!item.course?._id) return;
      optionsMap.set(String(item.course._id), {
        id: String(item.course._id),
        code: item.course.code || "N/A",
        title: item.course.title || "Unknown Course",
      });
    });

    return Array.from(optionsMap.values()).sort((a, b) =>
      `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`),
    );
  }, [logs, summary]);

  const selectedCourseIdSafe = courseOptions.some((item) => item.id === selectedCourseId)
    ? selectedCourseId
    : "all";

  const filteredLogs = useMemo(
    () =>
      selectedCourseIdSafe === "all"
        ? logs || []
        : (logs || []).filter((item) => String(item.course?._id || "") === selectedCourseIdSafe),
    [logs, selectedCourseIdSafe],
  );

  if (loadingSummary || loadingLogs) return <GlassCard>Loading attendance...</GlassCard>;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {summary?.length ? (
          summary.map((item) => (
            <GlassCard key={item.courseId}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  {item.courseCode} - {item.courseName}
                </h3>
                <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                  {item.percentage}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-2 rounded-full bg-brand-500"
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
                <p>Present: {item.present}</p>
                <p>Absent: {item.absent}</p>
                <p>Late: {item.late}</p>
              </div>
            </GlassCard>
          ))
        ) : (
          <GlassCard>No attendance records yet.</GlassCard>
        )}
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Daily Attendance Logs
          </h2>
          <div className="w-full md:w-[320px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Subject
            </label>
            <select
              className="input-field"
              value={selectedCourseIdSafe}
              onChange={(event) => setSelectedCourseId(event.target.value)}
            >
              <option value="all">All Subjects</option>
              {courseOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        {filteredLogs.length ? (
          <div className="mt-3 max-h-[460px] space-y-2 overflow-y-auto pr-1">
            {filteredLogs.map((item) => (
              <div
                key={item.attendanceId}
                className="flex flex-wrap items-center justify-between gap-3 glass-tile rounded-xl p-3"
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {item.course?.code || "N/A"} - {item.course?.title || "Unknown Course"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {toDisplayDate(item.date)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    statusBadgeClass[item.status] || "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                  }`}
                >
                  {toStatusLabel(item.status)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
            No attendance logs found for the selected subject.
          </p>
        )}
      </GlassCard>
    </div>
  );
};

export default StudentAttendancePage;

