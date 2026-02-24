import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";

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

const toLocalDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const toReadableDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const toReadableDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const TeacherLeavesPage = () => {
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    leaveDate: toLocalDateInput(),
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, execute } = useAsyncData(
    () => teacherService.getLeaveRequests(filter),
    [filter],
  );

  const requests = useMemo(() => data || [], [data]);
  const stats = useMemo(
    () =>
      requests.reduce(
        (acc, item) => {
          acc.total += 1;
          if (item.status === "pending") acc.pending += 1;
          if (item.status === "approved") acc.approved += 1;
          if (item.status === "rejected") acc.rejected += 1;
          return acc;
        },
        { total: 0, pending: 0, approved: 0, rejected: 0 },
      ),
    [requests],
  );

  const hasPendingForSelectedDate = requests.some(
    (item) => item.status === "pending" && toLocalDateInput(item.leaveDate) === form.leaveDate,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await teacherService.applyLeave({
        leaveDate: form.leaveDate,
        reason: form.reason,
      });
      toast.success("Leave request submitted.");
      setForm((prev) => ({ ...prev, reason: "" }));
      await execute();
      setFilter("pending");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Apply Leave
          </h2>
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <span className="rounded-lg border border-slate-200/80 bg-white/65 px-2 py-1 text-center dark:border-slate-700/70 dark:bg-slate-800/50">
              Total: {stats.total}
            </span>
            <span className="rounded-lg border border-amber-200 bg-amber-100/80 px-2 py-1 text-center dark:border-amber-500/40 dark:bg-amber-500/20">
              Pending: {stats.pending}
            </span>
            <span className="rounded-lg border border-emerald-200 bg-emerald-100/80 px-2 py-1 text-center dark:border-emerald-500/40 dark:bg-emerald-500/20">
              Approved: {stats.approved}
            </span>
            <span className="rounded-lg border border-rose-200 bg-rose-100/80 px-2 py-1 text-center dark:border-rose-500/40 dark:bg-rose-500/20">
              Rejected: {stats.rejected}
            </span>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Leave requests are reviewed by admin. Salary deduction applies only to approved leaves.
        </p>

        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Leave Date
            </label>
            <input
              className="input-field"
              type="date"
              value={form.leaveDate}
              onChange={(event) => setForm((prev) => ({ ...prev, leaveDate: event.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Reason
            </label>
            <input
              className="input-field"
              placeholder="Optional reason"
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              maxLength={500}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={submitting || hasPendingForSelectedDate}
            >
              {submitting
                ? "Submitting..."
                : hasPendingForSelectedDate
                  ? "Pending for Date"
                  : "Submit Leave Request"}
            </button>
          </div>
        </form>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Leave Request History
          </h2>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`btn-secondary !px-3 !py-1.5 text-xs ${
                  filter === item.value
                    ? "!border-sky-500 !bg-sky-100 !text-sky-800 dark:!border-sky-400/45 dark:!bg-sky-500/20 dark:!text-sky-100"
                    : ""
                }`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading leave requests...</p>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  <th className="py-2">Leave Date</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Admin Note</th>
                  <th className="py-2">Reviewed At</th>
                </tr>
              </thead>
              <tbody>
                {requests.length ? (
                  requests.map((item) => (
                    <tr key={item._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                      <td className="py-2 text-slate-700 dark:text-slate-200">{toReadableDate(item.leaveDate)}</td>
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
                      <td className="py-2 text-slate-700 dark:text-slate-200">{item.adminNote || "-"}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-200">
                        {toReadableDateTime(item.reviewedAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={5}>
                      No leave requests found.
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

export default TeacherLeavesPage;
