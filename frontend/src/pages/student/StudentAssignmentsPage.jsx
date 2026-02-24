import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const StudentAssignmentsPage = () => {
  const { data, loading, execute } = useAsyncData(studentService.getAssignments, []);
  const [forms, setForms] = useState({});
  const [submittingId, setSubmittingId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("all");

  const courseOptions = useMemo(() => {
    const optionsMap = new Map();
    (data || []).forEach((item) => {
      if (!item.course?._id) return;
      optionsMap.set(String(item.course._id), {
        id: String(item.course._id),
        code: item.course.code || "N/A",
        title: item.course.title || "Unknown Course",
      });
    });
    return Array.from(optionsMap.values()).sort((a, b) =>
      `${a.code} ${a.title}`.localeCompare(`${b.code} ${b.title}`),
    );
  }, [data]);

  const selectedCourseIdSafe = courseOptions.some((item) => item.id === selectedCourseId)
    ? selectedCourseId
    : "all";

  const filteredAssignments = useMemo(
    () =>
      selectedCourseIdSafe === "all"
        ? data || []
        : (data || []).filter((item) => String(item.course?._id || "") === selectedCourseIdSafe),
    [data, selectedCourseIdSafe],
  );

  const pendingAssignments = useMemo(
    () => filteredAssignments.filter((item) => !item.submitted),
    [filteredAssignments],
  );

  const handleSubmit = async (assignmentId) => {
    const payload = forms[assignmentId] || {};
    setSubmittingId(assignmentId);
    try {
      await studentService.submitAssignment(assignmentId, payload);
      toast.success("Assignment submitted.");
      await execute();
    } catch {
      // Handled by useAsyncData/toast.
    } finally {
      setSubmittingId("");
    }
  };

  if (loading) return <GlassCard>Loading assignments...</GlassCard>;

  return (
    <div className="space-y-5">
      <GlassCard className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Subject Filter
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Choose a subject to view subject-wise assignments.
          </p>
        </div>
        <div className="w-full md:w-[320px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Subject
          </label>
          <select
            className="input-field"
            value={selectedCourseIdSafe}
            onChange={(event) => setSelectedCourseId(event.target.value)}
          >
            <option value="all">All Subjects</option>
            {courseOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.title}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Pending Submission
        </h2>
        <div className="mt-4 space-y-3">
          {pendingAssignments.length ? (
            pendingAssignments.map((assignment) => (
              <div key={assignment.id} className="glass-tile rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  {assignment.course?.code} | {assignment.section ? `Section ${assignment.section}` : "All Sections"}
                </p>
                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                  {assignment.title}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{assignment.description}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
                  Due: {new Date(assignment.dueDate).toLocaleString()}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    className="input-field"
                    placeholder="Submission text"
                    value={forms[assignment.id]?.submissionText || ""}
                    onChange={(event) =>
                      setForms((prev) => ({
                        ...prev,
                        [assignment.id]: {
                          ...prev[assignment.id],
                          submissionText: event.target.value,
                        },
                      }))
                    }
                  />
                  <input
                    className="input-field"
                    placeholder="File URL (optional)"
                    value={forms[assignment.id]?.fileUrl || ""}
                    onChange={(event) =>
                      setForms((prev) => ({
                        ...prev,
                        [assignment.id]: {
                          ...prev[assignment.id],
                          fileUrl: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary mt-3"
                  disabled={submittingId === assignment.id}
                  onClick={() => handleSubmit(assignment.id)}
                >
                  {submittingId === assignment.id ? "Submitting..." : "Submit Assignment"}
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              No pending assignments for the selected subject.
            </p>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          All Assignments
        </h2>
        <div className="mt-3 space-y-3">
          {filteredAssignments.map((assignment) => (
            <div key={assignment.id} className="glass-tile rounded-xl p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {assignment.course?.code} - {assignment.title}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    assignment.submissionStatus === "submitted"
                      ? "bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200"
                      : assignment.submissionStatus === "late"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  {assignment.submissionStatus}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Due: {new Date(assignment.dueDate).toLocaleDateString()}
              </p>
              {assignment.attachmentUrl ? (
                <a
                  href={assignment.attachmentUrl}
                  className="mt-1 inline-block text-sm font-semibold text-brand-700 underline dark:text-brand-300"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download Assignment
                </a>
              ) : null}
            </div>
          ))}
          {!filteredAssignments.length ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              No assignments found for the selected subject.
            </p>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
};

export default StudentAssignmentsPage;

