import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";

const TeacherCoursesPage = () => {
  const { data: courses, loading } = useAsyncData(teacherService.getCourses, []);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [students, setStudents] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [selectedSection, setSelectedSection] = useState("all");
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!courses?.length) return;
    setSelectedCourse((prev) => prev || courses[0]._id);
  }, [courses]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedCourse) return;
      setLoadingStudents(true);
      try {
        const allRows = await teacherService.getCourseStudents(selectedCourse);
        const sections = Array.from(new Set(
          allRows.map((entry) => (entry.section || entry.profile?.section || "A").toUpperCase()),
        )).sort();
        setSectionOptions(sections);
        setSelectedSection((prev) => (prev === "all" || sections.includes(prev) ? prev : "all"));

        const response = selectedSection === "all"
          ? allRows
          : allRows.filter(
              (entry) => (entry.section || entry.profile?.section || "A").toUpperCase() === selectedSection,
            );
        setStudents(response);
      } catch (error) {
        const message = error?.response?.data?.message || "Failed to fetch class students.";
        toast.error(message);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [selectedCourse, selectedSection]);

  if (loading) return <GlassCard>Loading courses...</GlassCard>;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr,1.2fr]">
      <div className="space-y-4">
        {(courses || []).map((course) => (
          <GlassCard
            key={course._id}
            className={`cursor-pointer transition ${selectedCourse === course._id ? "ring-2 ring-brand-500" : ""}`}
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => setSelectedCourse(course._id)}
            >
              <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">
                {course.code}
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
                {course.title}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {course.department} | Semester {course.semester}
              </p>
            </button>
          </GlassCard>
        ))}
        {!courses?.length ? <GlassCard>No courses assigned.</GlassCard> : null}
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Enrolled Students
          </h2>
          <div className="w-full md:w-[220px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
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
        </div>
        {loadingStudents ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Loading students...</p>
        ) : (
          <div className="mt-3 space-y-2">
            {students.length ? (
              students.map((entry) => (
                <div key={entry.enrollmentId} className="rounded-xl bg-white/60 p-3 dark:bg-slate-800/60">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{entry.student?.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {entry.student?.email} | Roll: {entry.profile?.rollNumber || "-"} | Section {entry.section || entry.profile?.section || "A"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No students enrolled.</p>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default TeacherCoursesPage;
