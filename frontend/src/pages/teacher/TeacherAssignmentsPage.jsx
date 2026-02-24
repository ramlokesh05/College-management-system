import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";

const initialForm = {
  courseId: "",
  section: "",
  title: "",
  description: "",
  dueDate: "",
  attachmentUrl: "",
};

const TeacherAssignmentsPage = () => {
  const { data: courses } = useAsyncData(teacherService.getCourses, []);
  const { data: assignments, loading, execute } = useAsyncData(teacherService.getAssignments, []);
  const [form, setForm] = useState(initialForm);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (courses?.length) {
      setForm((prev) => ({ ...prev, courseId: prev.courseId || courses[0]._id }));
    }
  }, [courses]);

  useEffect(() => {
    const loadSections = async () => {
      if (!form.courseId) return;
      try {
        const rows = await teacherService.getCourseStudents(form.courseId);
        const sections = Array.from(new Set(
          rows.map((entry) => (entry.section || entry.profile?.section || "A").toUpperCase()),
        )).sort();
        setSectionOptions(sections);
        setForm((prev) => ({
          ...prev,
          section: prev.section && sections.includes(prev.section) ? prev.section : "",
        }));
      } catch {
        setSectionOptions([]);
      }
    };
    loadSections();
  }, [form.courseId]);

  const visibleAssignments = useMemo(
    () =>
      (assignments || []).filter((item) => {
        if (form.courseId && item.course?._id !== form.courseId) return false;
        if (!form.section) return true;
        return (item.section || "").toUpperCase() === form.section;
      }),
    [assignments, form.courseId, form.section],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await teacherService.uploadAssignment(form);
      toast.success("Assignment uploaded.");
      setForm((prev) => ({ ...initialForm, courseId: prev.courseId, section: prev.section }));
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Create Assignment
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <select
            className="input-field"
            value={form.courseId}
            onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}
            required
          >
            <option value="">Select course</option>
            {(courses || []).map((course) => (
              <option value={course._id} key={course._id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
          <select
            className="input-field"
            value={form.section}
            onChange={(event) => setForm((prev) => ({ ...prev, section: event.target.value }))}
          >
            <option value="">All Sections</option>
            {sectionOptions.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Assignment title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <textarea
            className="input-field md:col-span-2"
            rows={3}
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="datetime-local"
            value={form.dueDate}
            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Attachment URL (optional)"
            value={form.attachmentUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, attachmentUrl: event.target.value }))}
          />
          <button type="submit" className="btn-primary md:col-span-2" disabled={submitting}>
            {submitting ? "Publishing..." : "Publish Assignment"}
          </button>
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Published Assignments
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading...</p>
        ) : (
          <div className="mt-3 space-y-3">
            {(assignments || []).length ? (
              visibleAssignments.map((item) => (
                <div key={item._id} className="rounded-xl bg-white/60 p-3 dark:bg-slate-800/60">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {item.course?.code} - {item.title}
                    {item.section ? ` (Section ${item.section})` : " (All Sections)"}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Due: {new Date(item.dueDate).toLocaleString()} | Submissions: {item.submissionsCount}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No assignments published.</p>
            )}
            {(assignments || []).length && !visibleAssignments.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">
                No assignments found for the selected course/section filter.
              </p>
            ) : null}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default TeacherAssignmentsPage;
