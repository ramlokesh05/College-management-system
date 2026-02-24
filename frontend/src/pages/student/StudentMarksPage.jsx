import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const StudentMarksPage = () => {
  const { data, loading } = useAsyncData(studentService.getMarks, []);

  if (loading) return <GlassCard>Loading marks...</GlassCard>;

  return (
    <GlassCard>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
              <th className="py-2">Course</th>
              <th className="py-2">Exam</th>
              <th className="py-2">Score</th>
              <th className="py-2">Grade</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.length ? (
              data.map((mark) => (
                <tr key={mark.id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                  <td className="py-2 text-slate-700 dark:text-slate-200">{mark.course?.code}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{mark.examType}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">
                    {mark.obtainedMarks}/{mark.maxMarks}
                  </td>
                  <td className="py-2 font-semibold text-brand-700 dark:text-brand-300">{mark.grade}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">
                    {new Date(mark.examDate).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={5}>
                  No marks uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

export default StudentMarksPage;

