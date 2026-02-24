import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const StudentCoursesPage = () => {
  const { data, loading } = useAsyncData(studentService.getCourses, []);

  if (loading) return <GlassCard>Loading courses...</GlassCard>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(data || []).map((enrollment) => (
        <GlassCard key={enrollment._id}>
          <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {enrollment.course?.code}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
            {enrollment.course?.title}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Teacher: {enrollment.course?.teacher?.name || "TBA"}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Semester: {enrollment.semester} | Section: {enrollment.section || "A"} | Year: {enrollment.academicYear}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Credits: {enrollment.course?.credits} | Department: {enrollment.course?.department}
          </p>
        </GlassCard>
      ))}
      {!data?.length ? <GlassCard>No courses enrolled.</GlassCard> : null}
    </div>
  );
};

export default StudentCoursesPage;
