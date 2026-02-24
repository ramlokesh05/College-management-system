import { useMemo, useState } from "react";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const StudentTimetablePage = () => {
  const { data, loading } = useAsyncData(studentService.getTimetable, []);
  const [selectedCourseId, setSelectedCourseId] = useState("all");

  const courseOptions = useMemo(() => {
    const optionsMap = new Map();
    (data || []).forEach((item) => {
      if (!item.courseId) return;
      optionsMap.set(String(item.courseId), {
        id: String(item.courseId),
        code: item.courseCode || "N/A",
        title: item.courseTitle || "Unknown Course",
      });
    });
    return Array.from(optionsMap.values()).sort((a, b) =>
      `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`),
    );
  }, [data]);

  const selectedCourseIdSafe = courseOptions.some((item) => item.id === selectedCourseId)
    ? selectedCourseId
    : "all";

  const filteredRows = useMemo(
    () =>
      selectedCourseIdSafe === "all"
        ? data || []
        : (data || []).filter((item) => String(item.courseId || "") === selectedCourseIdSafe),
    [data, selectedCourseIdSafe],
  );

  if (loading) return <GlassCard>Loading timetable...</GlassCard>;

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Timetable
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

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
              <th className="py-2">Day</th>
              <th className="py-2">Time</th>
              <th className="py-2">Course</th>
              <th className="py-2">Teacher</th>
              <th className="py-2">Room</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length ? (
              filteredRows.map((item, index) => (
                <tr key={`${item.courseId}-${index}`} className="border-t border-slate-200/70 dark:border-slate-700/70">
                  <td className="py-2 text-slate-700 dark:text-slate-200">{item.day}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">
                    {item.startTime} - {item.endTime}
                  </td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">
                    {item.courseCode} - {item.courseTitle}
                  </td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{item.teacherName}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{item.room || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-slate-500 dark:text-slate-300">
                  No timetable entries found for the selected subject.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

export default StudentTimetablePage;
