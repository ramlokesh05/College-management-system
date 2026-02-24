import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { adminService } from "../../services/adminService";

const statusClassMap = {
  pending:
    "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/45 dark:bg-amber-500/20 dark:text-amber-100",
  approved:
    "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/45 dark:bg-emerald-500/20 dark:text-emerald-100",
  rejected:
    "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/45 dark:bg-rose-500/20 dark:text-rose-100",
};

const filters = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "" },
];

const toDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const toCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const AdminTeacherLeavesPage = () => {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [reviewingId, setReviewingId] = useState("");
  const [adminNotes, setAdminNotes] = useState({});

  const { data: teacherData } = useAsyncData(adminService.listTeachers, []);
  const {
    data: leaveData,
    loading,
    execute,
  } = useAsyncData(
    () => adminService.listTeacherLeaveRequests(statusFilter, teacherFilter),
    [statusFilter, teacherFilter],
  );

  const teachers = useMemo(() => teacherData || [], [teacherData]);
  const leaves = useMemo(() => leaveData || [], [leaveData]);

  const handleReview = async (leaveId, decision) => {
    setReviewingId(leaveId);
    try {
      await adminService.reviewTeacherLeaveRequest(leaveId, {
        decision,
        adminNote: adminNotes[leaveId] || "",
      });
      toast.success(decision === "approved" ? "Leave request approved." : "Leave request rejected.");
      setAdminNotes((prev) => ({ ...prev, [leaveId]: "" }));
      await execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to review leave request.");
    } finally {
      setReviewingId("");
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`btn-secondary !px-3 !py-1.5 text-xs ${
                    statusFilter === item.value
                      ? "!border-sky-500 !bg-sky-100 !text-sky-800 dark:!border-sky-400/45 dark:!bg-sky-500/20 dark:!text-sky-100"
                      : ""
                  }`}
                  onClick={() => setStatusFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Teacher
            </label>
            <select
              className="input-field"
              value={teacherFilter}
              onChange={(event) => setTeacherFilter(event.target.value)}
            >
              <option value="">All Teachers</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.name} ({teacher.profile?.employeeId || "N/A"})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Salary Rule
            </label>
            <div className="glass-tile rounded-xl px-3 py-2 text-sm font-semibold">
              {toCurrency(1500)} deduction per approved leave
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Teacher Leave Requests
        </h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading leave requests...</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <th className="py-2">Teacher</th>
                  <th className="py-2">Leave Date</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Deduction</th>
                  <th className="py-2">Admin Note</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length ? (
                  leaves.map((item) => {
                    const isPending = item.status === "pending";
                    const isReviewing = reviewingId === item._id;

                    return (
                      <tr key={item._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                        <td className="py-2 text-slate-700 dark:text-slate-200">
                          <p className="font-semibold">{item.teacher?.name || "-"}</p>
                          <p className="text-xs">{item.teacher?.email || "-"}</p>
                        </td>
                        <td className="py-2 text-slate-700 dark:text-slate-200">{toDate(item.leaveDate)}</td>
                        <td className="py-2 text-slate-700 dark:text-slate-200">{item.reason || "-"}</td>
                        <td className="py-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              statusClassMap[item.status] || "border-slate-300 bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2 text-slate-700 dark:text-slate-200">
                          {toCurrency(item.salaryImpact || 0)}
                        </td>
                        <td className="py-2">
                          {isPending ? (
                            <textarea
                              className="input-field min-h-[78px] resize-y !py-2 text-xs"
                              placeholder="Optional note for teacher"
                              value={adminNotes[item._id] || ""}
                              onChange={(event) =>
                                setAdminNotes((prev) => ({
                                  ...prev,
                                  [item._id]: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            <p className="text-slate-700 dark:text-slate-200">{item.adminNote || "-"}</p>
                          )}
                        </td>
                        <td className="py-2">
                          {isPending ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn-primary !px-2 !py-1 text-xs"
                                disabled={isReviewing}
                                onClick={() => handleReview(item._id, "approved")}
                              >
                                {isReviewing ? "Saving..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary !border-rose-300 !px-2 !py-1 text-xs !text-rose-700 dark:!border-rose-500/40 dark:!text-rose-200"
                                disabled={isReviewing}
                                onClick={() => handleReview(item._id, "rejected")}
                              >
                                {isReviewing ? "Saving..." : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-300">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={7}>
                      No leave requests found for this filter.
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

export default AdminTeacherLeavesPage;
