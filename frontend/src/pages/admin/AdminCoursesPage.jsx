import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { adminService } from "../../services/adminService";

const initialForm = {
  code: "",
  title: "",
  description: "",
  credits: 4,
  department: "Computer Science",
  semester: 1,
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  teacherId: "",
};

const AdminCoursesPage = () => {
  const { data: courses, loading, execute } = useAsyncData(adminService.listCourses, []);
  const { data: teachers } = useAsyncData(adminService.listTeachers, []);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const teacherOptions = useMemo(() => teachers || [], [teachers]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        credits: Number(form.credits),
        semester: Number(form.semester),
      };
      if (!payload.teacherId) delete payload.teacherId;

      if (editingId) {
        await adminService.updateCourse(editingId, payload);
        toast.success("Course updated.");
      } else {
        await adminService.createCourse(payload);
        toast.success("Course created.");
      }
      resetForm();
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save course.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (course) => {
    setEditingId(course._id);
    setForm({
      code: course.code || "",
      title: course.title || "",
      description: course.description || "",
      credits: course.credits || 4,
      department: course.department || "",
      semester: course.semester || 1,
      academicYear: course.academicYear || "",
      teacherId: course.teacher?._id || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this course and linked records?")) return;
    try {
      await adminService.deleteCourse(id);
      toast.success("Course deleted.");
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete course.");
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          {editingId ? "Update Course" : "Create Course"}
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
          <input
            className="input-field"
            placeholder="Course code"
            value={form.code}
            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="number"
            placeholder="Credits"
            value={form.credits}
            onChange={(event) => setForm((prev) => ({ ...prev, credits: event.target.value }))}
            required
          />
          <input
            className="input-field md:col-span-3"
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Department"
            value={form.department}
            onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="number"
            placeholder="Semester"
            value={form.semester}
            onChange={(event) => setForm((prev) => ({ ...prev, semester: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Academic year"
            value={form.academicYear}
            onChange={(event) => setForm((prev) => ({ ...prev, academicYear: event.target.value }))}
            required
          />
          <select
            className="input-field md:col-span-2"
            value={form.teacherId}
            onChange={(event) => setForm((prev) => ({ ...prev, teacherId: event.target.value }))}
          >
            <option value="">Assign teacher (optional)</option>
            {teacherOptions.map((teacher) => (
              <option value={teacher._id} key={teacher._id}>
                {teacher.name} ({teacher.profile?.employeeId || "N/A"})
              </option>
            ))}
          </select>
          <div className="flex gap-2 md:col-span-3">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Update Course" : "Create Course"}
            </button>
            {editingId ? (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Course Catalog</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading courses...</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <th className="py-2">Code</th>
                  <th className="py-2">Title</th>
                  <th className="py-2">Semester</th>
                  <th className="py-2">Teacher</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(courses || []).length ? (
                  courses.map((course) => (
                    <tr key={course._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                      <td className="py-2 text-slate-700 dark:text-slate-200">{course.code}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{course.title}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{course.semester}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{course.teacher?.name || "Unassigned"}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleEdit(course)}>
                            Edit
                          </button>
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleDelete(course._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={5}>
                      No courses found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default AdminCoursesPage;

