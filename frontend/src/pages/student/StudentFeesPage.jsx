import GlassCard from "../../components/ui/GlassCard";
import StatCard from "../../components/ui/StatCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const StudentFeesPage = () => {
  const { data, loading } = useAsyncData(studentService.getFees, []);

  if (loading) return <GlassCard>Loading fee details...</GlassCard>;

  const summary = data?.summary || {};
  const records = data?.records || [];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Fee" value={`Rs ${summary.totalFee || 0}`} />
        <StatCard title="Paid Amount" value={`Rs ${summary.totalPaid || 0}`} />
        <StatCard title="Outstanding Due" value={`Rs ${summary.totalDue || 0}`} accent="orange" />
      </div>

      <GlassCard>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                <th className="py-2">Semester</th>
                <th className="py-2">Academic Year</th>
                <th className="py-2">Total</th>
                <th className="py-2">Paid</th>
                <th className="py-2">Status</th>
                <th className="py-2">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? (
                records.map((item) => (
                  <tr key={item._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                    <td className="py-2 text-slate-700 dark:text-slate-200">{item.semester}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">{item.academicYear}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">Rs {item.totalFee}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">Rs {item.paidAmount}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.status === "paid"
                            ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
                            : item.status === "partial"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200"
                              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={6}>
                    No fee records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default StudentFeesPage;

