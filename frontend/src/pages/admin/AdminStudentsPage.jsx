import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { adminService } from "../../services/adminService";

const initialForm = {
  name: "",
  email: "",
  password: "",
  rollNumber: "",
  department: "Computer Science",
  year: 1,
  semester: 1,
  section: "A",
  phone: "",
  address: "",
  guardianName: "",
};

const requestFilters = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "" },
];

const statusClassMap = {
  pending:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/45 dark:bg-amber-500/20 dark:text-amber-100",
  approved:
    "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-500/45 dark:bg-orange-500/20 dark:text-orange-100",
  rejected:
    "border-red-200 bg-red-100 text-red-800 dark:border-red-500/45 dark:bg-red-500/20 dark:text-red-100",
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const formatChanges = (changes = {}) =>
  Object.entries(changes)
    .map(([key, value]) => (key === "avatar" ? "avatar: image update requested" : `${key}: ${value}`))
    .join(" | ");

const AdminStudentsPage = () => {
  const {
    data: studentData,
    loading: studentsLoading,
    execute: fetchStudents,
  } = useAsyncData(adminService.listStudents, []);
  const [requestFilter, setRequestFilter] = useState("pending");
  const {
    data: requestData,
    loading: requestsLoading,
    execute: fetchRequests,
  } = useAsyncData(() => adminService.listProfileEditRequests(requestFilter), [requestFilter]);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState("");
  const [requestNotes, setRequestNotes] = useState({});

  const students = useMemo(() => studentData || [], [studentData]);
  const editRequests = useMemo(() => requestData || [], [requestData]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await adminService.updateStudent(editingId, form);
        toast.success("Student updated.");
      } else {
        await adminService.createStudent(form);
        toast.success("Student created.");
      }
      resetForm();
      await fetchStudents();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to save student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student) => {
    setEditingId(student._id);
    setForm({
      name: student.name || "",
      email: student.email || "",
      password: "",
      rollNumber: student.profile?.rollNumber || "",
      department: student.profile?.department || "Computer Science",
      year: student.profile?.year || 1,
      semester: student.profile?.semester || 1,
      section: student.profile?.section || "A",
      phone: student.profile?.phone || "",
      address: student.profile?.address || "",
      guardianName: student.profile?.guardianName || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this student record?")) return;
    try {
      await adminService.deleteStudent(id);
      toast.success("Student deleted.");
      await fetchStudents();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete student.");
    }
  };

  const handleReviewRequest = async (requestId, decision) => {
    setReviewingRequestId(requestId);
    try {
      await adminService.reviewProfileEditRequest(requestId, {
        decision,
        adminNote: requestNotes[requestId] || "",
      });
      toast.success(
        decision === "approved"
          ? "Profile edit request approved."
          : "Profile edit request rejected.",
      );
      setRequestNotes((prev) => ({ ...prev, [requestId]: "" }));
      await Promise.all([fetchStudents(), fetchRequests()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to review edit request.");
    } finally {
      setReviewingRequestId("");
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          {editingId ? "Update Student" : "Create Student"}
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
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder={editingId ? "Password (optional)" : "Password"}
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required={!editingId}
          />
          <input
            className="input-field"
            placeholder="Roll number"
            value={form.rollNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, rollNumber: event.target.value }))}
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
            type="number"
            placeholder="Year"
            value={form.year}
            onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
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
            placeholder="Section"
            value={form.section}
            onChange={(event) => setForm((prev) => ({ ...prev, section: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <input
            className="input-field"
            placeholder="Guardian Name"
            value={form.guardianName}
            onChange={(event) => setForm((prev) => ({ ...prev, guardianName: event.target.value }))}
          />
          <input
            className="input-field md:col-span-2"
            placeholder="Address"
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
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
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Student Directory</h2>
        {studentsLoading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading students...</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <th className="py-2">Name</th>
                  <th className="py-2">Roll</th>
                  <th className="py-2">Department</th>
                  <th className="py-2">Semester</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length ? (
                  students.map((student) => (
                    <tr key={student._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                      <td className="py-2 text-slate-700 dark:text-slate-200">
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-xs">{student.email}</p>
                      </td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{student.profile?.rollNumber}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{student.profile?.department}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">{student.profile?.semester}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleEdit(student)}>
                            Edit
                          </button>
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleDelete(student._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={5}>
                      No student records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Profile Edit Requests
          </h2>
          <div className="flex flex-wrap gap-2">
            {requestFilters.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`btn-secondary !px-3 !py-1.5 text-xs ${
                  requestFilter === item.value
                    ? "!border-brand-500 !bg-brand-100 !text-brand-800 dark:!bg-brand-500/20 dark:!text-brand-200"
                    : ""
                }`}
                onClick={() => setRequestFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {requestsLoading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
            Loading profile edit requests...
          </p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <th className="py-2">User</th>
                  <th className="py-2">Requested Changes</th>
                  <th className="py-2">Requested At</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Admin Note</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {editRequests.length ? (
                  editRequests.map((request) => {
                    const isPending = request.status === "pending";
                    const isReviewing = reviewingRequestId === request._id;

                    return (
                      <tr key={request._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                        <td className="py-2 text-slate-700 dark:text-slate-200">
                          <p className="font-semibold">{request.student?.name || "Unknown User"}</p>
                          <p className="text-xs">{request.student?.email || "-"}</p>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                            {request.student?.role || "unknown"}
                          </p>
                        </td>
                        <td className="py-2 text-slate-700 dark:text-slate-200">
                          {formatChanges(request.requestedChanges)}
                        </td>
                        <td className="py-2 text-slate-700 dark:text-slate-200">
                          {formatDateTime(request.createdAt)}
                        </td>
                        <td className="py-2 text-slate-700 dark:text-slate-200">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              statusClassMap[request.status] ||
                              "border-slate-300 bg-slate-100 text-slate-700"
                            }`}
                          >
                            {request.status}
                          </span>
                          {request.reviewedBy ? (
                            <p className="mt-1 text-xs">
                              by {request.reviewedBy.name || "Admin"} on{" "}
                              {formatDateTime(request.reviewedAt)}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-2">
                          {isPending ? (
                            <textarea
                              className="input-field min-h-[80px] resize-y !py-2 text-xs"
                              placeholder="Optional note for student"
                              value={requestNotes[request._id] || ""}
                              onChange={(event) =>
                                setRequestNotes((prev) => ({
                                  ...prev,
                                  [request._id]: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            <p className="text-slate-700 dark:text-slate-200">{request.adminNote || "-"}</p>
                          )}
                        </td>
                        <td className="py-2">
                          {isPending ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn-primary !px-2 !py-1 text-xs"
                                disabled={isReviewing}
                                onClick={() => handleReviewRequest(request._id, "approved")}
                              >
                                {isReviewing ? "Saving..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary !border-rose-300 !px-2 !py-1 text-xs !text-rose-700 dark:!border-rose-500/40 dark:!text-rose-200"
                                disabled={isReviewing}
                                onClick={() => handleReviewRequest(request._id, "rejected")}
                              >
                                {isReviewing ? "Saving..." : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-300">
                              Reviewed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={6}>
                      No profile edit requests found for this filter.
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

export default AdminStudentsPage;
