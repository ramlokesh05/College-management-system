import { useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { adminService } from "../../services/adminService";

const initialForm = {
  title: "",
  message: "",
  audienceType: "global",
  roleTarget: "student",
  courseId: "",
  attachmentUrl: "",
};

const AdminNoticesPage = () => {
  const { data: notices, loading, execute } = useAsyncData(adminService.listNotices, []);
  const { data: courses } = useAsyncData(adminService.listCourses, []);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createNotice({
        title: form.title,
        message: form.message,
        audienceType: form.audienceType,
        courseId: form.audienceType === "course" ? form.courseId : null,
        targetRoles:
          form.audienceType === "global"
            ? ["student", "teacher", "admin"]
            : form.audienceType === "role"
              ? [form.roleTarget]
              : ["student"],
        attachmentUrl: form.attachmentUrl,
      });
      toast.success("Notice published.");
      setForm(initialForm);
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create notice.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notice?")) return;
    try {
      await adminService.deleteNotice(id);
      toast.success("Notice deleted.");
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete notice.");
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Create Notice
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            className="input-field md:col-span-2"
            placeholder="Notice title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <textarea
            className="input-field md:col-span-2"
            rows={3}
            placeholder="Notice message"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            required
          />
          <select
            className="input-field"
            value={form.audienceType}
            onChange={(event) => setForm((prev) => ({ ...prev, audienceType: event.target.value }))}
          >
            <option value="global">Global</option>
            <option value="role">Role based</option>
            <option value="course">Course based</option>
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
              <option value="">Select course</option>
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
            {submitting ? "Publishing..." : "Publish Notice"}
          </button>
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Published Notices</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading notices...</p>
        ) : (
          <div className="mt-3 space-y-3">
            {(notices || []).length ? (
              notices.map((notice) => (
                <div key={notice._id} className="rounded-xl bg-white/60 p-3 dark:bg-slate-800/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{notice.title}</p>
                    <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleDelete(notice._id)}>
                      Delete
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notice.message}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Posted by {notice.postedBy?.name || "Admin"} |{" "}
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No notices found.</p>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default AdminNoticesPage;

