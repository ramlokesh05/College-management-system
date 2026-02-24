import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const StudentExamsPage = () => {
  const { data, loading } = useAsyncData(studentService.getExamSchedule, []);

  if (loading) return <GlassCard>Loading exam schedule...</GlassCard>;

  return (
    <GlassCard>
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
        Exam Schedule
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
              <th className="py-2">Date</th>
              <th className="py-2">Time</th>
              <th className="py-2">Course</th>
              <th className="py-2">Exam</th>
              <th className="py-2">Venue</th>
            </tr>
          </thead>
          <tbody>
            {data?.length ? (
              data.map((exam) => (
                <tr key={exam._id} className="border-t border-slate-200/70 dark:border-slate-700/70">
                  <td className="py-2 text-slate-700 dark:text-slate-200">
                    {new Date(exam.examDate).toLocaleDateString()}
                  </td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">
                    {exam.startTime} - {exam.endTime}
                  </td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{exam.course?.code}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{exam.title}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-200">{exam.venue}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={5}>
                  No upcoming exams.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};

export default StudentExamsPage;
