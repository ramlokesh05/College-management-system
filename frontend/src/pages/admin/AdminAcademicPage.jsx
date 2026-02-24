import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { adminService } from "../../services/adminService";

const initialSessionForm = {
  year: "",
  semester: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
};

const initialSubjectForm = {
  code: "",
  title: "",
  credits: "",
  department: "",
};

const initialSectionForm = {
  name: "",
  department: "",
  year: 1,
  semester: 1,
  academicSessionId: "",
  studentIds: [],
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const AdminAcademicPage = () => {
  const sessionsState = useAsyncData(adminService.listAcademicSessions, []);
  const studentsState = useAsyncData(adminService.listStudents, []);

  const [sectionSessionFilter, setSectionSessionFilter] = useState("");
  const sectionsState = useAsyncData(
    () => adminService.listSections(sectionSessionFilter),
    [sectionSessionFilter],
  );

  const sessions = useMemo(() => sessionsState.data || [], [sessionsState.data]);
  const students = useMemo(() => studentsState.data || [], [studentsState.data]);
  const sections = useMemo(() => sectionsState.data || [], [sectionsState.data]);

  const [sessionForm, setSessionForm] = useState(initialSessionForm);
  const [editingSessionId, setEditingSessionId] = useState("");
  const [sessionSubmitting, setSessionSubmitting] = useState(false);

  const [subjectSessionId, setSubjectSessionId] = useState("");
  const [subjectForm, setSubjectForm] = useState(initialSubjectForm);
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);

  const [sectionForm, setSectionForm] = useState(initialSectionForm);
  const [editingSectionId, setEditingSectionId] = useState("");
  const [sectionSubmitting, setSectionSubmitting] = useState(false);

  useEffect(() => {
    if (!sessions.length) return;
    setSubjectSessionId((prev) => prev || sessions[0]._id);
    setSectionForm((prev) => ({
      ...prev,
      academicSessionId: prev.academicSessionId || sessions[0]._id,
    }));
    setSectionSessionFilter((prev) => prev || sessions[0]._id);
  }, [sessions]);

  const resetSessionForm = () => {
    setSessionForm(initialSessionForm);
    setEditingSessionId("");
  };

const resetSectionForm = () => {
    setSectionForm({
      ...initialSectionForm,
      academicSessionId: sessions[0]?._id || "",
    });
    setEditingSectionId("");
  };

  const handleSessionSubmit = async (event) => {
    event.preventDefault();
    setSessionSubmitting(true);
    try {
      if (editingSessionId) {
        await adminService.updateAcademicSession(editingSessionId, sessionForm);
        toast.success("Academic session updated.");
      } else {
        await adminService.createAcademicSession(sessionForm);
        toast.success("Academic session created.");
      }
      resetSessionForm();
      await Promise.all([sessionsState.execute(), sectionsState.execute()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save academic session.");
    } finally {
      setSessionSubmitting(false);
    }
  };

  const handleSessionEdit = (session) => {
    setEditingSessionId(session._id);
    setSessionForm({
      year: session.year || "",
      semester: session.semester || "",
      startDate: toDateInput(session.startDate),
      endDate: toDateInput(session.endDate),
      isCurrent: Boolean(session.isCurrent),
    });
  };

  const handleSessionDelete = async (id) => {
    if (!window.confirm("Delete this academic session? Related sections will also be deleted.")) return;
    try {
      await adminService.deleteAcademicSession(id);
      toast.success("Academic session deleted.");
      if (subjectSessionId === id) setSubjectSessionId("");
      await Promise.all([sessionsState.execute(), sectionsState.execute()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete academic session.");
    }
  };

  const selectedSubjectSession = sessions.find((session) => session._id === subjectSessionId) || null;
  const sessionSubjects = selectedSubjectSession?.subjects || [];

  const handleAddSubject = async (event) => {
    event.preventDefault();
    if (!subjectSessionId) {
      toast.error("Select an academic session first.");
      return;
    }
    setSubjectSubmitting(true);
    try {
      await adminService.addAcademicSessionSubject(subjectSessionId, {
        ...subjectForm,
        credits: subjectForm.credits === "" ? 0 : Number(subjectForm.credits),
      });
      toast.success("Subject added to session.");
      setSubjectForm(initialSubjectForm);
      await sessionsState.execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add subject.");
    } finally {
      setSubjectSubmitting(false);
    }
  };

  const handleRemoveSubject = async (subjectCode) => {
    if (!subjectSessionId) return;
    if (!window.confirm(`Remove subject ${subjectCode} from this session?`)) return;
    try {
      await adminService.removeAcademicSessionSubject(subjectSessionId, subjectCode);
      toast.success("Subject removed from session.");
      await sessionsState.execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove subject.");
    }
  };

  const toggleSectionStudent = (studentId) => {
    setSectionForm((prev) => {
      const hasStudent = prev.studentIds.includes(studentId);
      return {
        ...prev,
        studentIds: hasStudent
          ? prev.studentIds.filter((item) => item !== studentId)
          : [...prev.studentIds, studentId],
      };
    });
  };

  const handleSectionSubmit = async (event) => {
    event.preventDefault();
    setSectionSubmitting(true);
    try {
      const payload = {
        ...sectionForm,
        name: String(sectionForm.name || "").trim().toUpperCase(),
        year: Number(sectionForm.year),
        semester: Number(sectionForm.semester),
      };

      if (editingSectionId) {
        await adminService.updateSection(editingSectionId, payload);
        toast.success("Section updated.");
      } else {
        await adminService.createSection(payload);
        toast.success("Section created.");
      }

      resetSectionForm();
      await Promise.all([sectionsState.execute(), studentsState.execute()]);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save section.");
    } finally {
      setSectionSubmitting(false);
    }
  };

  const handleSectionEdit = (section) => {
    setEditingSectionId(section._id);
    setSectionForm({
      name: section.name || "",
      department: section.department || "",
      year: Number(section.year || 1),
      semester: Number(section.semester || 1),
      academicSessionId: section.academicSession?._id || section.academicSession || "",
      studentIds: (section.students || []).map((item) => item._id || item.id || item),
    });
  };

  const handleSectionDelete = async (id) => {
    if (!window.confirm("Delete this section?")) return;
    try {
      await adminService.deleteSection(id);
      toast.success("Section deleted.");
      await sectionsState.execute();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete section.");
    }
  };

  const loading = sessionsState.loading || studentsState.loading || sectionsState.loading;

  return (
    <div className="space-y-5">
      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          {editingSessionId ? "Update Academic Session" : "Create Academic Session"}
        </h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSessionSubmit}>
          <input
            className="input-field"
            placeholder="Year (e.g. 2026-2027)"
            value={sessionForm.year}
            onChange={(event) => setSessionForm((prev) => ({ ...prev, year: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Semester Label (e.g. Semester 1)"
            value={sessionForm.semester}
            onChange={(event) => setSessionForm((prev) => ({ ...prev, semester: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="date"
            value={sessionForm.startDate}
            onChange={(event) => setSessionForm((prev) => ({ ...prev, startDate: event.target.value }))}
            required
          />
          <input
            className="input-field"
            type="date"
            value={sessionForm.endDate}
            onChange={(event) => setSessionForm((prev) => ({ ...prev, endDate: event.target.value }))}
            required
          />
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={sessionForm.isCurrent}
              onChange={(event) => setSessionForm((prev) => ({ ...prev, isCurrent: event.target.checked }))}
            />
            Set as current session
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={sessionSubmitting}>
              {sessionSubmitting ? "Saving..." : editingSessionId ? "Update Session" : "Create Session"}
            </button>
            {editingSessionId ? (
              <button type="button" className="btn-secondary" onClick={resetSessionForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </GlassCard>

      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            Academic Sessions
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Subjects can be configured per session.
          </p>
        </div>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Loading session data...</p>
        ) : (
          <div className="mt-3 space-y-2">
            {sessions.length ? (
              sessions.map((session) => (
                <div key={session._id} className="glass-tile rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {session.year} - {session.semester}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}
                        {" | "}
                        Subjects: {session.subjects?.length || 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.isCurrent ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                          Current
                        </span>
                      ) : null}
                      <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleSessionEdit(session)}>
                        Edit
                      </button>
                      <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleSessionDelete(session._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No sessions created yet.</p>
            )}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Session Subjects
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Academic Session
            </label>
            <select
              className="input-field"
              value={subjectSessionId}
              onChange={(event) => setSubjectSessionId(event.target.value)}
              disabled={!sessions.length}
            >
              {!sessions.length ? <option value="">No sessions available</option> : null}
              {sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.year} - {session.semester}
                </option>
              ))}
            </select>
          </div>
        </div>
        <form className="mt-3 grid gap-3 md:grid-cols-4" onSubmit={handleAddSubject}>
          <input
            className="input-field"
            placeholder="Code (e.g. CS101)"
            value={subjectForm.code}
            onChange={(event) => setSubjectForm((prev) => ({ ...prev, code: event.target.value }))}
            required
            disabled={!subjectSessionId}
          />
          <input
            className="input-field"
            placeholder="Subject Title"
            value={subjectForm.title}
            onChange={(event) => setSubjectForm((prev) => ({ ...prev, title: event.target.value }))}
            required
            disabled={!subjectSessionId}
          />
          <input
            className="input-field"
            type="number"
            min={0}
            max={12}
            placeholder="Credits"
            value={subjectForm.credits}
            onChange={(event) => setSubjectForm((prev) => ({ ...prev, credits: event.target.value }))}
            disabled={!subjectSessionId}
          />
          <div className="flex gap-2">
            <input
              className="input-field"
              placeholder="Department"
              value={subjectForm.department}
              onChange={(event) => setSubjectForm((prev) => ({ ...prev, department: event.target.value }))}
              disabled={!subjectSessionId}
            />
            <button type="submit" className="btn-primary !px-3" disabled={subjectSubmitting || !subjectSessionId}>
              {subjectSubmitting ? "..." : "Add"}
            </button>
          </div>
        </form>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
                <th className="py-2">Code</th>
                <th className="py-2">Title</th>
                <th className="py-2">Credits</th>
                <th className="py-2">Department</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessionSubjects.length ? (
                sessionSubjects.map((subject) => (
                  <tr key={subject.code} className="border-t border-slate-200/70 dark:border-slate-700/70">
                    <td className="py-2 text-slate-700 dark:text-slate-200">{subject.code}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">{subject.title}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">{subject.credits}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-200">{subject.department || "-"}</td>
                    <td className="py-2">
                      <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleRemoveSubject(subject.code)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-4 text-slate-500 dark:text-slate-300" colSpan={5}>
                    No subjects added for selected session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          Sections and Student Mapping
        </h2>
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={handleSectionSubmit}>
          <input
            className="input-field"
            placeholder="Section Name (e.g. A)"
            value={sectionForm.name}
            onChange={(event) => setSectionForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder="Department"
            value={sectionForm.department}
            onChange={(event) => setSectionForm((prev) => ({ ...prev, department: event.target.value }))}
            required
          />
          <select
            className="input-field"
            value={sectionForm.academicSessionId}
            onChange={(event) => setSectionForm((prev) => ({ ...prev, academicSessionId: event.target.value }))}
            required
          >
            <option value="">Select Academic Session</option>
            {sessions.map((session) => (
              <option key={session._id} value={session._id}>
                {session.year} - {session.semester}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            type="number"
            min={1}
            max={6}
            placeholder="Year"
            value={sectionForm.year}
            onChange={(event) => setSectionForm((prev) => ({ ...prev, year: Number(event.target.value) }))}
            required
          />
          <input
            className="input-field"
            type="number"
            min={1}
            max={12}
            placeholder="Semester"
            value={sectionForm.semester}
            onChange={(event) => setSectionForm((prev) => ({ ...prev, semester: Number(event.target.value) }))}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={sectionSubmitting}>
              {sectionSubmitting ? "Saving..." : editingSectionId ? "Update Section" : "Create Section"}
            </button>
            {editingSectionId ? (
              <button type="button" className="btn-secondary" onClick={resetSectionForm}>
                Cancel
              </button>
            ) : null}
          </div>

          <div className="md:col-span-3">
            <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Assign Students</p>
            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-slate-200/70 bg-white/45 p-3 dark:border-slate-700/70 dark:bg-slate-800/40 md:grid-cols-2">
              {students.length ? (
                students.map((student) => (
                  <label key={student._id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/55 dark:hover:bg-slate-700/35">
                    <input
                      type="checkbox"
                      checked={sectionForm.studentIds.includes(student._id)}
                      onChange={() => toggleSectionStudent(student._id)}
                    />
                    <span className="text-sm">
                      {student.name} ({student.profile?.rollNumber || "No Roll"})
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-300">No students available.</p>
              )}
            </div>
          </div>
        </form>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">Existing Sections</h3>
            <select
              className="input-field max-w-xs"
              value={sectionSessionFilter}
              onChange={(event) => setSectionSessionFilter(event.target.value)}
            >
              <option value="">All Sessions</option>
              {sessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.year} - {session.semester}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            {sections.length ? (
              sections.map((section) => (
                <div key={section._id} className="glass-tile rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        Section {section.name} | {section.department}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Year {section.year} | Semester {section.semester} | Session {section.academicSession?.year || "-"} {section.academicSession?.semester || ""}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Students: {section.students?.length || 0}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleSectionEdit(section)}>
                        Edit
                      </button>
                      <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => handleSectionDelete(section._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {section.students?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {section.students.map((student) => (
                        <span key={student._id} className="rounded-full bg-white/70 px-2 py-0.5 text-xs dark:bg-slate-700/60">
                          {student.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-300">No sections created yet.</p>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default AdminAcademicPage;
