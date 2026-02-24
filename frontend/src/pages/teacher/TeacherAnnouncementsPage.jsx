import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";

const initialForm = {
  title: "",
  message: "",
  audienceType: "role",
  roleTarget: "student",
  courseId: "",
  attachmentUrl: "",
};

const TeacherAnnouncementsPage = () => {
  const { data: dashboard, execute } = useAsyncData(teacherService.getDashboard, []);
  const { data: courses } = useAsyncData(teacherService.getCourses, []);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (courses?.length) {
      setForm((prev) => ({ ...prev, courseId: prev.courseId || courses[0]._id }));
    }
  }, [courses]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        message: form.message,
        audienceType: form.audienceType,
        attachmentUrl: form.attachmentUrl,
        targetRoles:
          form.audienceType === "global"
            ? ["student", "teacher", "admin"]
            : form.audienceType === "role"
              ? [form.roleTarget]
              : ["student"],
        courseId: form.audienceType === "course" ? form.courseId : null,
      };

      await teacherService.postAnnouncement(payload);
      toast.success("Announcement posted.");
      setForm((prev) => ({ ...initialForm, courseId: prev.courseId }));
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to post announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Post Announcement
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            className="input-field md:col-span-2"
            placeholder="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <textarea
            className="input-field md:col-span-2"
            rows={3}
            placeholder="Message"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            required
          />
          <select
            className="input-field"
            value={form.audienceType}
            onChange={(event) => setForm((prev) => ({ ...prev, audienceType: event.target.value }))}
          >
            <option value="role">Role specific</option>
            <option value="course">Course specific</option>
            <option value="global">Global</option>
          </select>

          {form.audienceType === "role" ? (
            <select
              className="input-field"
              value={form.roleTarget}
              onChange={(event) => setForm((prev) => ({ ...prev, roleTarget: event.target.value }))}
            >
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="admin">Admins</option>
            </select>
          ) : null}

          {form.audienceType === "course" ? (
            <select
              className="input-field"
              value={form.courseId}
              onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}
            >
              {(courses || []).map((course) => (
                <option value={course._id} key={course._id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </select>
          ) : null}

          <input
            className="input-field md:col-span-2"
            placeholder="Attachment URL (optional)"
            value={form.attachmentUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, attachmentUrl: event.target.value }))}
          />
          <button type="submit" className="btn-primary md:col-span-2" disabled={submitting}>
            {submitting ? "Posting..." : "Post Announcement"}
          </button>
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Recent Announcements
        </h2>
        <div className="mt-3 space-y-2">
          {(dashboard?.recentAnnouncements || []).length ? (
            dashboard.recentAnnouncements.map((item) => (
              <div key={item._id} className="rounded-xl bg-white/60 p-3 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                  <span className="text-xs text-slate-500 dark:text-slate-300">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">No announcements posted yet.</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default TeacherAnnouncementsPage;

