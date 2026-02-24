import { useState } from "react";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const toDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const monthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const TeacherEarningsPage = () => {
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const { data, loading } = useAsyncData(
    () => teacherService.getEarnings(month, year),
    [month, year],
  );

  const approvedLeaves = data?.approvedLeaves || [];
  const pendingLeaves = data?.pendingLeaves || [];

  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Month
            </label>
            <select
              className="input-field"
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {monthOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Year
            </label>
            <select
              className="input-field"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Salary Cycle
            </label>
            <div className="glass-tile rounded-xl px-3 py-2 text-sm font-semibold">
              {data?.period?.label || "-"}
            </div>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard>Loading earnings...</GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <GlassCard className="p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                Base Salary
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
                {currency(data?.baseSalary)}
              </p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                Approved Leaves
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
                {data?.approvedLeaveCount || 0}
              </p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                Total Deduction
              </p>
              <p className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-300">
                {currency(data?.totalDeduction)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                {currency(data?.deductionPerLeave)} per approved leave
              </p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                Net Salary
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {currency(data?.netSalary)}
              </p>
            </GlassCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <GlassCard>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Approved Leaves
              </h2>
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      <th className="py-2">Leave Date</th>
                      <th className="py-2">Reason</th>
                      <th className="py-2 text-right">Deduction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedLeaves.length ? (
                      approvedLeaves.map((item) => (
                        <tr key={item._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                          <td className="py-2 text-slate-700 dark:text-slate-200">{toDate(item.leaveDate)}</td>
                          <td className="py-2 text-slate-700 dark:text-slate-200">{item.reason || "-"}</td>
                          <td className="py-2 text-right font-semibold text-rose-700 dark:text-rose-300">
                            {currency(item.deductionAmount || data?.deductionPerLeave)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={3}>
                          No approved leaves in this cycle.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Pending Leaves
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Pending requests do not affect salary until admin approves them.
              </p>
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      <th className="py-2">Leave Date</th>
                      <th className="py-2">Reason</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeaves.length ? (
                      pendingLeaves.map((item) => (
                        <tr key={item._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                          <td className="py-2 text-slate-700 dark:text-slate-200">{toDate(item.leaveDate)}</td>
                          <td className="py-2 text-slate-700 dark:text-slate-200">{item.reason || "-"}</td>
                          <td className="py-2">
                            <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-500/45 dark:bg-amber-500/20 dark:text-amber-100">
                              Pending
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={3}>
                          No pending leaves in this cycle.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherEarningsPage;
