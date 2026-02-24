import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../../components/ui/GlassCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";

const initialForm = {
  courseId: "",
  studentId: "",
  examType: "Midterm",
  maxMarks: 100,
  obtainedMarks: 0,
  semester: 4,
  academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  examDate: new Date().toISOString().slice(0, 10),
};

const TeacherMarksPage = () => {
  const { data: courses, loading } = useAsyncData(teacherService.getCourses, []);
  const [students, setStudents] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [selectedSection, setSelectedSection] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!courses?.length) return;
    setForm((prev) => ({
      ...prev,
      courseId: prev.courseId || courses[0]._id,
    }));
  }, [courses]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!form.courseId) return;
      try {
        const allRows = await teacherService.getCourseStudents(form.courseId);
        const sections = Array.from(new Set(
          allRows.map((entry) => (entry.section || entry.profile?.section || "A").toUpperCase()),
        )).sort();
        setSectionOptions(sections);
        setSelectedSection((prev) => (prev === "all" || sections.includes(prev) ? prev : "all"));

        const response = selectedSection === "all"
          ? allRows
          : allRows.filter(
              (entry) => (entry.section || entry.profile?.section || "A").toUpperCase() === selectedSection,
            );
        setStudents(response);
        if (response.length) {
          setForm((prev) => ({ ...prev, studentId: prev.studentId || response[0].student._id }));
        } else {
          setForm((prev) => ({ ...prev, studentId: "" }));
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load class students.");
      }
    };
    loadStudents();
  }, [form.courseId, selectedSection]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await teacherService.uploadMarks({
        ...form,
        section: selectedSection !== "all" ? selectedSection : null,
        maxMarks: Number(form.maxMarks),
        obtainedMarks: Number(form.obtainedMarks),
        semester: Number(form.semester),
      });
      toast.success("Marks uploaded successfully.");
      setForm((prev) => ({ ...prev, obtainedMarks: 0 }));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload marks.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <GlassCard>Loading courses...</GlassCard>;

  return (
    <GlassCard>
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Upload Marks</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Course
          </label>
          <select
            className="input-field"
            value={form.courseId}
            onChange={(event) => setForm((prev) => ({ ...prev, courseId: event.target.value, studentId: "" }))}
          >
            {courses?.map((course) => (
              <option value={course._id} key={course._id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Section
          </label>
          <select
            className="input-field"
            value={selectedSection}
            onChange={(event) => {
              const section = event.target.value;
              setSelectedSection(section);
              setForm((prev) => ({ ...prev, studentId: "" }));
            }}
          >
            <option value="all">All Sections</option>
            {sectionOptions.map((section) => (
              <option key={section} value={section}>
                Section {section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Student
          </label>
          <select
            className="input-field"
            value={form.studentId}
            onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
          >
            {students.map((item) => (
              <option value={item.student._id} key={item.student._id}>
                {item.student.name} ({item.profile?.rollNumber || "No Roll"}) - Sec {item.section || item.profile?.section || "A"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Exam Type
          </label>
          <input
            className="input-field"
            value={form.examType}
            onChange={(event) => setForm((prev) => ({ ...prev, examType: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Exam Date
          </label>
          <input
            className="input-field"
            type="date"
            value={form.examDate}
            onChange={(event) => setForm((prev) => ({ ...prev, examDate: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Max Marks
          </label>
          <input
            className="input-field"
            type="number"
            value={form.maxMarks}
            onChange={(event) => setForm((prev) => ({ ...prev, maxMarks: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Obtained Marks
          </label>
          <input
            className="input-field"
            type="number"
            value={form.obtainedMarks}
            onChange={(event) => setForm((prev) => ({ ...prev, obtainedMarks: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Semester
          </label>
          <input
            className="input-field"
            type="number"
            value={form.semester}
            onChange={(event) => setForm((prev) => ({ ...prev, semester: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Academic Year
          </label>
          <input
            className="input-field"
            value={form.academicYear}
            onChange={(event) => setForm((prev) => ({ ...prev, academicYear: event.target.value }))}
          />
        </div>

        <button type="submit" className="btn-primary md:col-span-2" disabled={submitting}>
          {submitting ? "Uploading..." : "Upload Marks"}
        </button>
      </form>
    </GlassCard>
  );
};

export default TeacherMarksPage;
