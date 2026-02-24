import { useEffect, useState } from "react";
import { Bell, BookOpen, CalendarDays, NotebookPen, Users } from "lucide-react";
import TileModal from "../../components/common/TileModal";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import GlassCard from "../../components/ui/GlassCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { teacherService } from "../../services/teacherService";

const piePalette = ["#c97f4f", "#b39a84", "#e2c8b0", "#8d6a50", "#d4b59a", "#7a5944"];

const transparentTileClass =
  "border-slate-300/60 !bg-white/60 dark:border-sky-300/25 dark:!bg-white/5 !backdrop-blur-[5px] before:opacity-0 shadow-[0_10px_22px_rgba(14,23,38,0.14)]";

const dayOrder = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const toSafeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const fetchDashboardBundle = async () => {
  const dashboard = await teacherService.getDashboard();

  const [coursesRes, assignmentsRes] = await Promise.allSettled([
    teacherService.getCourses(),
    teacherService.getAssignments(),
  ]);

  const courses =
    coursesRes.status === "fulfilled"
      ? coursesRes.value
      : Array.isArray(dashboard?.courses)
        ? dashboard.courses
        : [];

  const assignments =
    assignmentsRes.status === "fulfilled"
      ? assignmentsRes.value
      : Array.isArray(dashboard?.recentAssignments)
        ? dashboard.recentAssignments
        : [];

  const notices = (Array.isArray(dashboard?.recentAnnouncements) ? dashboard.recentAnnouncements : []).map(
    (item) => ({
      _id: item._id,
      title: item.title,
      message: item.message,
      sender: dashboard?.user?.name || "Faculty",
      createdAt: item.createdAt,
    }),
  );

  const recentMarks = Array.isArray(dashboard?.recentMarks) ? dashboard.recentMarks : [];

  const courseStudentCountsResults = courses.length
    ? await Promise.allSettled(courses.map((course) => teacherService.getCourseStudents(course._id)))
    : [];

  const courseStudentCounts = courses.map((course, index) => {
    const result = courseStudentCountsResults[index];
    const studentCount =
      result?.status === "fulfilled" && Array.isArray(result.value) ? result.value.length : 0;
    return {
      _id: course._id,
      code: course.code || "-",
      title: course.title || "Untitled Course",
      studentCount,
    };
  });

  const timetableRows = courses
    .flatMap((course) =>
      (Array.isArray(course.schedule) ? course.schedule : []).map((slot) => ({
        courseId: course._id,
        courseCode: course.code || "-",
        courseTitle: course.title || "-",
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
      })),
    )
    .sort((a, b) => dayOrder[a.day] - dayOrder[b.day] || String(a.startTime).localeCompare(String(b.startTime)));

  const assignmentDistribution = assignments
    .map((item) => ({
      key: item._id,
      subject: item.course?.code || item.title || "Assignment",
      title: item.title || "Untitled Assignment",
      points: toSafeNumber(item.submissionsCount, 0),
      dueDate: item.dueDate,
    }))
    .sort((a, b) => b.points - a.points);

  return {
    ...dashboard,
    courses,
    assignments,
    notices,
    recentMarks,
    courseStudentCounts,
    timetableRows,
    assignmentDistribution,
    kpis: {
      ...(dashboard?.kpis || {}),
      assignedCourses:
        typeof dashboard?.kpis?.assignedCourses === "number"
          ? dashboard.kpis.assignedCourses
          : courses.length,
      assignmentsPublished:
        typeof dashboard?.kpis?.assignmentsPublished === "number"
          ? dashboard.kpis.assignmentsPublished
          : assignments.length,
    },
  };
};

const TeacherDashboard = () => {
  const { data, loading } = useAsyncData(fetchDashboardBundle, []);
  const [activeTile, setActiveTile] = useState("");
  const kpis = data?.kpis || {};

  useEffect(() => {
    if (!activeTile) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveTile("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTile]);

  useEffect(() => {
    if (!activeTile) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeTile]);

  const assignedCourses = toSafeNumber(kpis.assignedCourses, 0);
  const enrolledStudents = toSafeNumber(kpis.enrolledStudents, 0);
  const assignmentsPublished = toSafeNumber(kpis.assignmentsPublished, 0);

  const allCourseLoads = (Array.isArray(data?.courseStudentCounts) ? data.courseStudentCounts : [])
    .map((item) => ({
      ...item,
      studentCount: toSafeNumber(item.studentCount, 0),
    }))
    .sort((a, b) => b.studentCount - a.studentCount);

  const courseLoadPreview = allCourseLoads.slice(0, 6);
  const maxCourseLoad = allCourseLoads.length
    ? Math.max(...allCourseLoads.map((item) => item.studentCount), 1)
    : 1;

  const allAssignments = Array.isArray(data?.assignmentDistribution) ? data.assignmentDistribution : [];
  const assignmentPieData = allAssignments.filter((item) => item.points > 0);

  const recentMarks = Array.isArray(data?.recentMarks) ? data.recentMarks : [];
  const marksPreview = recentMarks.slice(0, 8);

  const allNotices = Array.isArray(data?.notices) ? data.notices : [];
  const notices = allNotices.slice(0, 5);
  const featuredNotice = notices[0];
  const nextNoticeItems = notices.slice(1, 4);

  const allTimetableRows = Array.isArray(data?.timetableRows) ? data.timetableRows : [];
  const timetableRows = allTimetableRows.slice(0, 6);

  const statCards = [
    {
      key: "courses",
      label: "Assigned Courses",
      value: assignedCourses.toString(),
      note: "Total Active Courses",
      icon: BookOpen,
    },
    {
      key: "students",
      label: "Students",
      value: enrolledStudents.toString(),
      note: "Unique Enrolled Learners",
      icon: Users,
    },
    {
      key: "assignments",
      label: "Assignments",
      value: assignmentsPublished.toString(),
      note: "Published Assessments",
      icon: NotebookPen,
    },
  ];

  const modalTitles = {
    courses: "Assigned Courses Details",
    students: "Student Coverage",
    assignments: "Assignment Details",
    courseLoad: "Course-wise Student Load",
    assignmentMix: "Assignment Submission Mix",
    marks: "Recent Marks Uploaded",
    notices: "Notice Board",
    timetable: "Teaching Timetable",
  };

  const renderTileModalContent = () => {
    if (activeTile === "courses" || activeTile === "students" || activeTile === "courseLoad") {
      return allCourseLoads.length ? (
        <div className="space-y-2.5">
          {allCourseLoads.map((item) => (
            <div key={item._id || item.code} className="glass-tile rounded-xl p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {item.code} - {item.title}
                </p>
                <p className="text-sm font-bold">{item.studentCount} Students</p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-300/40 dark:bg-slate-700/30">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-[#cc8f5d] to-[#a36d46]"
                  style={{
                    width: `${Math.max(6, Math.min((item.studentCount / maxCourseLoad) * 100, 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">No assigned courses found.</p>
      );
    }

    if (activeTile === "assignments" || activeTile === "assignmentMix") {
      return (
        <div className="space-y-4">
          <div className="glass-tile rounded-xl p-3">
            <p className="text-sm font-semibold">Assignments Published</p>
            <p className="mt-1 text-3xl font-bold">{assignmentsPublished}</p>
          </div>

          <div className="glass-tile rounded-xl p-3">
            <p className="mb-2 text-sm font-semibold">Submission Distribution</p>
            {allAssignments.length ? (
              <div className="space-y-2">
                {allAssignments.map((item) => (
                  <div key={item.key || item.subject} className="flex items-center justify-between text-sm">
                    <p>
                      {item.subject} | {item.title}
                    </p>
                    <p className="font-semibold">{item.points} submissions</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm">No assignments found.</p>
            )}
          </div>
        </div>
      );
    }

    if (activeTile === "marks") {
      return recentMarks.length ? (
        <div className="space-y-2">
          {recentMarks.map((mark) => (
            <div key={mark._id || `${mark.course?.code}-${mark.student?._id}`} className="glass-tile rounded-xl p-3">
              <p className="text-sm font-semibold">
                {mark.course?.code || "-"} | {mark.examType || "-"}
              </p>
              <p className="mt-1 text-sm">
                Student: {mark.student?.name || "-"} | Score: {toSafeNumber(mark.obtainedMarks, 0)}/
                {toSafeNumber(mark.maxMarks, 0)}
              </p>
              <p className="mt-1 text-xs font-medium">{formatDateTime(mark.examDate || mark.createdAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">No marks uploaded yet.</p>
      );
    }

    if (activeTile === "notices") {
      return allNotices.length ? (
        <div className="space-y-2">
          {allNotices.map((notice) => (
            <div key={notice._id} className="glass-tile rounded-xl p-3">
              <p className="text-sm font-semibold">{notice.title}</p>
              <p className="mt-1 text-sm">{notice.message}</p>
              <p className="mt-1 text-xs font-medium">
                {formatDate(notice.createdAt)} | {notice.sender}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">No announcements available.</p>
      );
    }

    if (activeTile === "timetable") {
      return allTimetableRows.length ? (
        <div className="space-y-2">
          {allTimetableRows.map((slot, index) => (
            <div
              key={`${slot.courseId || slot.courseCode}-${index}`}
              className="glass-tile rounded-xl p-3"
            >
              <p className="text-sm font-semibold">
                {slot.day || "-"} | {slot.startTime || "-"} - {slot.endTime || "-"}
              </p>
              <p className="mt-1 text-sm">
                {slot.courseCode || "-"} - {slot.courseTitle || "-"}
              </p>
              <p className="mt-1 text-xs font-medium">Room {slot.room || "-"}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">Teaching schedule not available.</p>
      );
    }

    return <p className="text-sm">No details available.</p>;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <SkeletonCard className="h-[290px]" />
            <SkeletonCard className="h-[260px]" />
          </div>
          <div className="space-y-4">
            <SkeletonCard className="h-[220px]" />
            <SkeletonCard className="h-[320px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-dynamic-bg student-dashboard-theme relative overflow-hidden rounded-3xl p-3 sm:p-4">
        <div className="relative z-10 space-y-4 text-black dark:text-white">
          <div className="grid gap-4 sm:grid-cols-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <GlassCard
                  key={card.key}
                  onClick={() => setActiveTile(card.key)}
                  className={`${transparentTileClass} cursor-pointer border-[#ebe1d8] px-3.5 py-3 transition hover:border-sky-400/65 dark:hover:border-sky-300/35`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black dark:text-white">
                        {card.label}
                      </p>
                      <p className="mt-1.5 text-lg font-bold text-black dark:text-white">{card.value}</p>
                      <p className="mt-1 text-[11px] text-black dark:text-white">{card.note}</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/70 dark:text-white">
                        Tap to Expand
                      </p>
                    </div>
                    <span className="rounded-lg bg-white/20 p-1.5 text-black dark:text-white">
                      <Icon size={13} />
                    </span>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <GlassCard
                  onClick={() => setActiveTile("courseLoad")}
                  className={`${transparentTileClass} cursor-pointer border-[#ece3d9] p-4 transition hover:border-sky-400/65 dark:hover:border-sky-300/35`}
                >
                  <p className="text-xs font-semibold text-black dark:text-white">Course-wise Student Load</p>
                  <p className="mt-1 text-[34px] font-bold leading-none text-black dark:text-white">
                    {enrolledStudents}
                  </p>
                  <p className="mt-1 text-[11px] text-black dark:text-white">Total Active Students</p>

                  <div className="mt-4 max-h-[178px] space-y-2.5 overflow-y-auto pr-1">
                    {courseLoadPreview.length ? (
                      courseLoadPreview.map((item) => (
                        <div key={item._id || item.code} className="glass-tile rounded-xl p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[11px] font-semibold text-black dark:text-white">
                              {item.code} - {item.title}
                            </p>
                            <p className="text-[11px] font-semibold text-black dark:text-white">
                              {item.studentCount}
                            </p>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-300/40 dark:bg-slate-700/30">
                            <div
                              className="h-1.5 rounded-full bg-gradient-to-r from-[#cc8f5d] to-[#a36d46]"
                              style={{
                                width: `${Math.max(
                                  6,
                                  Math.min((item.studentCount / maxCourseLoad) * 100, 100),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-black dark:text-white">
                        No assigned course loads available.
                      </p>
                    )}
                  </div>
                </GlassCard>

                <GlassCard
                  onClick={() => setActiveTile("assignmentMix")}
                  className={`${transparentTileClass} cursor-pointer border-[#ece3d9] p-4 transition hover:border-sky-400/65 dark:hover:border-sky-300/35`}
                >
                  <p className="text-xs font-semibold text-black dark:text-white">Assignment Submission Mix</p>
                  <div className="mt-2 h-[150px]">
                    {assignmentPieData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={assignmentPieData}
                            dataKey="points"
                            nameKey="subject"
                            cx="50%"
                            cy="50%"
                            outerRadius={58}
                            innerRadius={32}
                            paddingAngle={2}
                          >
                            {assignmentPieData.map((item, index) => (
                              <Cell key={`${item.subject}-${index}`} fill={piePalette[index % piePalette.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value} submissions`, "Count"]}
                            contentStyle={{
                              borderRadius: "0.75rem",
                              border: "1px solid #1f1f1f33",
                              background: "rgba(255,255,255,0.96)",
                              color: "#000000",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-[11px] text-black dark:text-white">
                        No submission data available.
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-black dark:text-white">
                    Assignments:{" "}
                    <span className="font-semibold text-black dark:text-white">{assignmentsPublished}</span>
                  </p>
                </GlassCard>
              </div>

              <GlassCard
                onClick={() => setActiveTile("marks")}
                className={`${transparentTileClass} cursor-pointer overflow-hidden border-[#ece3d9] !p-0 transition hover:border-sky-400/65 dark:hover:border-sky-300/35`}
              >
                <div className="flex items-center justify-between border-b border-slate-300/50 dark:border-slate-700/40 px-4 py-3">
                  <h2 className="text-sm font-semibold text-black dark:text-white">Recent Marks Uploaded</h2>
                  <span className="text-xs font-semibold text-black dark:text-white">
                    {recentMarks.length} Entries
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[760px] w-full text-left">
                    <thead className="bg-white/10 text-[11px] uppercase tracking-[0.12em] text-black dark:text-white">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Date</th>
                        <th className="px-4 py-2.5 font-semibold">Course</th>
                        <th className="px-4 py-2.5 font-semibold">Student</th>
                        <th className="px-4 py-2.5 font-semibold">Exam</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marksPreview.length ? (
                        marksPreview.map((mark) => (
                          <tr
                            key={mark._id || `${mark.course?.code}-${mark.student?._id}`}
                            className="border-t border-slate-300/45 dark:border-slate-700/35 text-[11px] text-black dark:text-white"
                          >
                            <td className="px-4 py-2.5 font-semibold">
                              {formatDate(mark.examDate || mark.createdAt)}
                            </td>
                            <td className="px-4 py-2.5 font-semibold">{mark.course?.code || "-"}</td>
                            <td className="px-4 py-2.5">{mark.student?.name || "-"}</td>
                            <td className="px-4 py-2.5">{mark.examType || "-"}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">
                              {toSafeNumber(mark.obtainedMarks, 0)}/{toSafeNumber(mark.maxMarks, 0)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-4 text-sm text-black dark:text-white" colSpan={5}>
                            No marks uploaded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>

            <div className="space-y-4">
              <GlassCard
                onClick={() => setActiveTile("notices")}
                className={`${transparentTileClass} cursor-pointer border-[#ece3d9] p-4 transition hover:border-sky-400/65 dark:hover:border-sky-300/35`}
              >
                <div className="mb-2 flex items-center gap-2 text-black dark:text-white">
                  <Bell size={14} />
                  <p className="text-[11px] uppercase tracking-[0.15em] text-black dark:text-white">
                    Notice Board
                  </p>
                </div>
                {featuredNotice ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-black dark:text-white">
                      {featuredNotice.title}
                    </p>
                    <p className="text-[11px] text-black dark:text-white">
                      {featuredNotice.message?.length > 110
                        ? `${featuredNotice.message.slice(0, 110)}...`
                        : featuredNotice.message}
                    </p>
                    <p className="mt-2 text-[11px] text-black dark:text-white">
                      {formatDate(featuredNotice.createdAt)} | {featuredNotice.sender}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[11px] text-black dark:text-white">No announcements available.</p>
                )}

                {nextNoticeItems.length ? (
                  <div className="mt-4 space-y-2 border-t border-slate-300/50 dark:border-slate-700/40 pt-3">
                    {nextNoticeItems.map((notice) => (
                      <div key={notice._id} className="glass-tile rounded-lg p-2.5">
                        <p className="text-[11px] font-semibold text-black dark:text-white">{notice.title}</p>
                        <p className="mt-0.5 text-[11px] text-black dark:text-white">
                          {formatDate(notice.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </GlassCard>

              <GlassCard
                onClick={() => setActiveTile("timetable")}
                className={`${transparentTileClass} cursor-pointer border-[#ece3d9] p-4 transition hover:border-sky-400/65 dark:hover:border-sky-300/35`}
              >
                <div className="mb-2 flex items-center gap-2 text-black dark:text-white">
                  <CalendarDays size={14} />
                  <p className="text-xs font-semibold text-black dark:text-white">Teaching Timetable</p>
                </div>

                <div className="space-y-2.5">
                  {timetableRows.length ? (
                    timetableRows.map((slot, index) => (
                      <div
                        key={`${slot.courseId || slot.courseCode}-${index}`}
                        className="glass-tile rounded-xl px-2.5 py-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-semibold text-black dark:text-white">
                            {slot.day || "-"}
                          </p>
                          <p className="text-[11px] font-semibold text-black dark:text-white">
                            {slot.startTime || "-"} - {slot.endTime || "-"}
                          </p>
                        </div>
                        <p className="mt-1 text-[11px] text-black dark:text-white">
                          {slot.courseCode || "-"} - {slot.courseTitle || "-"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-black dark:text-white">
                          Room {slot.room || "-"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-black dark:text-white">
                      Timetable not available.
                    </p>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      <TileModal
        isOpen={Boolean(activeTile)}
        title={modalTitles[activeTile] || "Details"}
        onClose={() => setActiveTile("")}
        overlayClassName="bg-gradient-to-br from-sky-200/70 via-white/72 to-cyan-100/72 dark:from-slate-900/65 dark:via-slate-800/60 dark:to-slate-900/65"
        panelClassName="glass-tile border-sky-300/55 bg-white/88 text-[#1d2433] shadow-[0_30px_70px_rgba(14,30,55,0.28)] dark:border-sky-300/35 dark:bg-slate-900/70 dark:text-slate-100"
        headerClassName="border-sky-300/45 dark:border-sky-300/30"
        closeButtonClassName="border-sky-300/55 bg-white/60 text-sky-900 hover:bg-sky-100/70 dark:border-sky-300/40 dark:bg-slate-900/45 dark:text-sky-100 dark:hover:bg-sky-900/35"
      >
        {renderTileModalContent()}
      </TileModal>
    </>
  );
};

export default TeacherDashboard;

