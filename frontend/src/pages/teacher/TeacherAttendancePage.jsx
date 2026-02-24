import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";

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

const toDisplayDateTime = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString();
};

const buildStatusMap = (students, existingMap = {}) =>
  students.reduce((acc, item) => {
    const studentId = item.student?._id;
    if (studentId) {
      acc[studentId] = existingMap[studentId] || "present";
    }
    return acc;
  }, {});

const TeacherAttendancePage = () => {
  const { data: courses, loading } = useAsyncData(teacherService.getCourses, []);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [selectedSection, setSelectedSection] = useState("all");
  const [statusMap, setStatusMap] = useState({});
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loadingDateAttendance, setLoadingDateAttendance] = useState(false);
  const [loadingLogHistory, setLoadingLogHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!courses?.length) return;
    setSelectedCourse((prev) => prev || courses[0]._id);
  }, [courses]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedCourse) return;
      try {
        const students = await teacherService.getCourseStudents(selectedCourse);
        const sections = Array.from(new Set(
          students
            .map((item) => (item.section || item.profile?.section || "A").toUpperCase())
            .filter(Boolean),
        )).sort();

        setAllStudents(students);
        setSectionOptions(sections);
        setSelectedSection((prev) => (prev === "all" || sections.includes(prev) ? prev : "all"));
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load students.");
      }
    };
    loadStudents();
  }, [selectedCourse]);

  const classStudents = useMemo(
    () =>
      selectedSection === "all"
        ? allStudents
        : allStudents.filter((item) => (item.section || item.profile?.section || "A").toUpperCase() === selectedSection),
    [allStudents, selectedSection],
  );

  useEffect(() => {
    const loadDateAttendance = async () => {
      if (!selectedCourse || !classStudents.length) return;
      setLoadingDateAttendance(true);
      try {
        const dailyAttendance = await teacherService.getAttendanceForDate(
          selectedCourse,
          date,
          selectedSection !== "all" ? selectedSection : "",
        );
        const existingMap = (dailyAttendance?.records || []).reduce((acc, item) => {
          if (item.studentId) {
            acc[item.studentId] = item.status;
          }
          return acc;
        }, {});
        setStatusMap(buildStatusMap(classStudents, existingMap));
      } catch (error) {
        setStatusMap(buildStatusMap(classStudents));
        toast.error(error?.response?.data?.message || "Failed to load attendance for selected date.");
      } finally {
        setLoadingDateAttendance(false);
      }
    };
    loadDateAttendance();
  }, [selectedCourse, classStudents, date, refreshToken, selectedSection]);

  useEffect(() => {
    const loadAttendanceLogs = async () => {
      if (!selectedCourse) {
        setAttendanceLogs([]);
        return;
      }
      setLoadingLogHistory(true);
      try {
        const logs = await teacherService.getAttendanceLogs(
          selectedCourse,
          120,
          selectedSection !== "all" ? selectedSection : "",
        );
        setAttendanceLogs(logs);
      } catch (error) {
        setAttendanceLogs([]);
        toast.error(error?.response?.data?.message || "Failed to load attendance logs.");
      } finally {
        setLoadingLogHistory(false);
      }
    };
    loadAttendanceLogs();
  }, [selectedCourse, refreshToken, selectedSection]);

  const attendanceRecords = useMemo(
    () =>
      classStudents.map((item) => ({
        studentId: item.student._id,
        status: statusMap[item.student._id] || "present",
      })),
    [classStudents, statusMap],
  );

  const handleSubmit = async () => {
    if (!selectedCourse || !attendanceRecords.length || !date) {
      toast.error("Select course, date, and at least one student.");
      return;
    }
    setSubmitting(true);
    try {
      await teacherService.markAttendance({
        courseId: selectedCourse,
        section: selectedSection !== "all" ? selectedSection : null,
        date,
        records: attendanceRecords,
      });
      toast.success("Attendance saved.");
      setRefreshToken((prev) => prev + 1);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <GlassCard>Loading courses...</GlassCard>;

  return (
    <div className="space-y-5">
      <GlassCard className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Course
          </label>
          <select
            className="input-field"
            value={selectedCourse}
            onChange={(event) => setSelectedCourse(event.target.value)}
          >
            {courses?.map((course) => (
              <option value={course._id} key={course._id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Section
          </label>
          <select
            className="input-field"
            value={selectedSection}
            onChange={(event) => setSelectedSection(event.target.value)}
          >
            <option value="all">All Sections</option>
            {sectionOptions.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Date
          </label>
          <input
            className="input-field"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button type="button" className="btn-primary w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Student Attendance Status
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {loadingDateAttendance ? "Loading saved statuses..." : `Viewing ${toDisplayDate(date)}`}
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {classStudents.length ? (
            classStudents.map((item) => (
              <div
                key={item.enrollmentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 p-3 dark:bg-slate-800/60"
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{item.student.name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {item.profile?.rollNumber || "No roll number"} | Section {item.section || item.profile?.section || "A"}
                  </p>
                </div>
                <select
                  className="input-field max-w-[160px]"
                  value={statusMap[item.student._id] || "present"}
                  onChange={(event) =>
                    setStatusMap((prev) => ({ ...prev, [item.student._id]: event.target.value }))
                  }
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">No enrolled students.</p>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Daily Attendance Logs
        </h2>
        {loadingLogHistory ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading attendance logs...</p>
        ) : attendanceLogs.length ? (
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {attendanceLogs.map((item) => (
              <div
                key={item.attendanceId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 p-3 dark:bg-slate-800/60"
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {item.student?.name || "Unknown Student"}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {toDisplayDate(item.date)} | {item.course?.code || "N/A"} | {toDisplayDateTime(item.markedAt)}
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
            No attendance logs recorded for this course yet.
          </p>
        )}
      </GlassCard>
    </div>
  );
};

export default TeacherAttendancePage;
