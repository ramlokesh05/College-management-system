import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { adminService } from "../../services/adminService";

const initialForm = {
  studentId: "",
  courseId: "",
  section: "A",
  semester: 1,
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
};

const AdminEnrollmentsPage = () => {
  const { data: enrollments, loading, execute } = useAsyncData(adminService.listEnrollments, []);
  const { data: students } = useAsyncData(adminService.listStudents, []);
  const { data: courses } = useAsyncData(adminService.listCourses, []);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const studentOptions = useMemo(() => students || [], [students]);
  const courseOptions = useMemo(() => courses || [], [courses]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createEnrollment({
        ...form,
        semester: Number(form.semester),
      });
      toast.success("Enrollment created.");
      setForm(initialForm);
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create enrollment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this enrollment?")) return;
    try {
      await adminService.deleteEnrollment(id);
      toast.success("Enrollment removed.");
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete enrollment.");
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Enroll Student To Course
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={handleSubmit}>
          <select
            className="input-field"
            value={form.studentId}
            onChange={(event) => {
              const studentId = event.target.value;
              const selectedStudent = studentOptions.find((item) => item._id === studentId);
              setForm((prev) => ({
                ...prev,
                studentId,
                section: selectedStudent?.profile?.section || prev.section || "A",
              }));
            }}
            required
          >
            <option value="">Select student</option>
            {studentOptions.map((item) => (
              <option value={item._id} key={item._id}>
                {item.name} ({item.profile?.rollNumber || "N/A"})
              </option>
            ))}
          </select>
          <select
            className="input-field"
            value={form.courseId}
            onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value }))}
            required
          >
            <option value="">Select course</option>
            {courseOptions.map((item) => (
              <option value={item._id} key={item._id}>
                {item.code} - {item.title}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Section (e.g. A)"
            value={form.section}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, section: event.target.value.toUpperCase() }))
            }
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
          <button type="submit" className="btn-primary md:col-span-5" disabled={submitting}>
            {submitting ? "Enrolling..." : "Create Enrollment"}
          </button>
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Enrollment Records
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading enrollments...</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <th className="py-2">Student</th>
                  <th className="py-2">Course</th>
                  <th className="py-2">Section</th>
                  <th className="py-2">Semester</th>
                  <th className="py-2">Academic Year</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(enrollments || []).length ? (
                  enrollments.map((item) => (
                    <tr key={item._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                      <td className="py-2 text-slate-700 dark:text-slate-200">
                        {item.student?.name}
                      </td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">
                        {item.course?.code} - {item.course?.title}
                      </td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{item.section || "A"}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{item.semester}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{item.academicYear}</td>
                      <td className="py-2">
                        <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleDelete(item._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={6}>
                      No enrollments available.
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

export default AdminEnrollmentsPage;
