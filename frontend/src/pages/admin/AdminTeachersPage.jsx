import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { adminService } from "../../services/adminService";

const initialForm = {
  name: "",
  email: "",
  password: "",
  employeeId: "",
  department: "Computer Science",
  designation: "Assistant Professor",
  phone: "",
  qualification: "",
};

const AdminTeachersPage = () => {
  const { data, loading, execute } = useAsyncData(adminService.listTeachers, []);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const teachers = useMemo(() => data || [], [data]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await adminService.updateTeacher(editingId, form);
        toast.success("Teacher updated.");
      } else {
        await adminService.createTeacher(form);
        toast.success("Teacher created.");
      }
      resetForm();
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to save teacher.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (teacher) => {
    setEditingId(teacher._id);
    setForm({
      name: teacher.name || "",
      email: teacher.email || "",
      password: "",
      employeeId: teacher.profile?.employeeId || "",
      department: teacher.profile?.department || "",
      designation: teacher.profile?.designation || "",
      phone: teacher.profile?.phone || "",
      qualification: teacher.profile?.qualification || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this teacher record?")) return;
    try {
      await adminService.deleteTeacher(id);
      toast.success("Teacher deleted.");
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete teacher.");
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          {editingId ? "Update Teacher" : "Create Teacher"}
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
          <input
            className="input-field"
            placeholder="Full name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder={editingId ? "Password (optional)" : "Password"}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required={!editingId}
          />
          <input
            className="input-field"
            placeholder="Employee ID"
            value={form.employeeId}
            onChange={(event) => setForm((prev) => ({ ...prev, employeeId: event.target.value }))}
            required
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
            placeholder="Designation"
            value={form.designation}
            onChange={(event) => setForm((prev) => ({ ...prev, designation: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <input
            className="input-field md:col-span-2"
            placeholder="Qualification"
            value={form.qualification}
            onChange={(event) => setForm((prev) => ({ ...prev, qualification: event.target.value }))}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Update" : "Create"}
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
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Teacher Directory</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading teachers...</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <th className="py-2">Name</th>
                  <th className="py-2">Employee ID</th>
                  <th className="py-2">Department</th>
                  <th className="py-2">Designation</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.length ? (
                  teachers.map((teacher) => (
                    <tr key={teacher._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                      <td className="py-2 text-slate-700 dark:text-slate-200">
                        <p className="font-semibold">{teacher.name}</p>
                        <p className="text-xs">{teacher.email}</p>
                      </td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{teacher.profile?.employeeId}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{teacher.profile?.department}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{teacher.profile?.designation}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleEdit(teacher)}>
                            Edit
                          </button>
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleDelete(teacher._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={5}>
                      No teacher records found.
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

export default AdminTeachersPage;

