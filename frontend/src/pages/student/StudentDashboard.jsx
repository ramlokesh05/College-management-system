import { useEffect, useState } from "react";
import { Bell, CalendarDays, ClipboardCheck, GraduationCap, Wallet } from "lucide-react";
import TileModal from "../../components/common/TileModal";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import GlassCard from "../../components/ui/GlassCard";
import SkeletonCard from "../../components/ui/SkeletonCard";
import { useAsyncData } from "../../hooks/useAsyncData";
import { studentService } from "../../services/studentService";

const piePalette = ["#c97f4f", "#b39a84", "#e2c8b0", "#8d6a50", "#d4b59a", "#7a5944"];

const transparentTileClass =
  "border-slate-300/60 !bg-white/60 dark:border-black/20 dark:!bg-white/5 !backdrop-blur-[5px] before:opacity-0 shadow-[0_10px_22px_rgba(0,0,0,0.08)]";

const getGradePoint = (obtainedMarks, maxMarks) => {
  const percentage = maxMarks ? (Number(obtainedMarks || 0) / Number(maxMarks || 1)) * 100 : 0;
  if (percentage >= 90) return 10;
  if (percentage >= 80) return 9;
  if (percentage >= 70) return 8;
  if (percentage >= 60) return 7;
  if (percentage >= 50) return 6;
  return 5;
};

const toSafeNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const buildCgpaBreakdownFromMarks = (marks = []) => {
  const grouped = marks.reduce((acc, mark) => {
    const subject = mark?.course?.code || mark?.courseCode || mark?.course?.title || "Subject";
    const points =
      typeof mark?.gradePoint === "number"
        ? mark.gradePoint
        : getGradePoint(mark?.obtainedMarks, mark?.maxMarks);

    if (!acc[subject]) {
      acc[subject] = { subject, totalPoints: 0, count: 0 };
    }
    acc[subject].totalPoints += points;
    acc[subject].count += 1;
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      subject: item.subject,
      points: Number((item.totalPoints / item.count).toFixed(2)),
    }))
    .sort((a, b) => b.points - a.points);
};

const normalizeMessages = (messages, notices) => {
  if (Array.isArray(messages) && messages.length) {
    return messages;
  }

  if (!Array.isArray(notices)) {
    return [];
  }

  return notices.map((notice) => ({
    _id: notice._id,
    title: notice.title,
    message: notice.message,
    sender: notice.postedBy?.name || "Admin",
    createdAt: notice.createdAt,
  }));
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const fetchDashboardBundle = async () => {
  const dashboard = await studentService.getDashboard();

  const [attendanceRes, marksRes, noticesRes, timetableRes, examScheduleRes, feesRes] =
    await Promise.allSettled([
      studentService.getAttendance(),
      studentService.getMarks(),
      studentService.getNotices(),
      studentService.getTimetable(),
      studentService.getExamSchedule(),
      studentService.getFees(),
    ]);

  const attendanceSummary =
    attendanceRes.status === "fulfilled"
      ? attendanceRes.value
      : Array.isArray(dashboard?.attendanceSummary)
        ? dashboard.attendanceSummary
        : [];

  const allMarks =
    marksRes.status === "fulfilled"
      ? marksRes.value
      : Array.isArray(dashboard?.recentMarks)
        ? dashboard.recentMarks
        : [];

  const notices =
    noticesRes.status === "fulfilled"
      ? noticesRes.value
      : Array.isArray(dashboard?.notices)
        ? dashboard.notices
        : [];

  const timetableRows =
    timetableRes.status === "fulfilled"
      ? timetableRes.value
      : Array.isArray(dashboard?.timetablePreview)
        ? dashboard.timetablePreview
        : [];

  const examSchedule =
    examScheduleRes.status === "fulfilled"
      ? examScheduleRes.value
      : Array.isArray(dashboard?.examSchedule)
        ? dashboard.examSchedule
        : [];

  const feePayload = feesRes.status === "fulfilled" ? feesRes.value : null;
  const feeSummary = feePayload?.summary || null;
  const feeRecords = Array.isArray(feePayload?.records) ? feePayload.records : [];
  const feeDueFromFees = toSafeNumber(feeSummary?.totalDue, 0);

  const cgpaBreakdown =
    Array.isArray(dashboard?.cgpaBreakdown) && dashboard.cgpaBreakdown.length
      ? dashboard.cgpaBreakdown
      : buildCgpaBreakdownFromMarks(allMarks);

  return {
    ...dashboard,
    attendanceSummary,
    recentMarks: allMarks,
    notices,
    messages: normalizeMessages(dashboard?.messages, notices),
    timetableRows,
    examSchedule,
    cgpaBreakdown,
    feeSummary,
    feeRecords,
    kpis: {
      ...(dashboard?.kpis || {}),
      feeDue:
        typeof dashboard?.kpis?.feeDue === "number" ? dashboard.kpis.feeDue : feeDueFromFees,
    },
  };
};

const StudentDashboard = () => {
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

  const attendance = toSafeNumber(kpis.attendancePercentage, 0);
  const dueFees = toSafeNumber(kpis.feeDue, 0);

  const cgpaDistribution = (Array.isArray(data?.cgpaBreakdown) ? data.cgpaBreakdown : [])
    .map((entry) => ({
      subject: entry.subject || "Subject",
      points: toSafeNumber(entry.points, 0),
    }))
    .filter((entry) => entry.points > 0);

  const gpa =
    typeof kpis.cgpa === "number"
      ? kpis.cgpa
      : cgpaDistribution.length
        ? Number(
            (
              cgpaDistribution.reduce((sum, item) => sum + item.points, 0) /
              cgpaDistribution.length
            ).toFixed(2),
          )
        : 0;

  const attendanceSummaryRaw = Array.isArray(data?.attendanceSummary) ? data.attendanceSummary : [];

  const attendanceScale = attendanceSummaryRaw
    .map((item) => ({
      courseId: item.courseId,
      courseCode: item.courseCode || "SUB",
      courseName: item.courseName || "Subject",
      percentage: toSafeNumber(item.percentage, 0),
      present: toSafeNumber(item.present, 0),
      absent: toSafeNumber(item.absent, 0),
      late: toSafeNumber(item.late, 0),
      totalClasses: toSafeNumber(item.totalClasses, 0),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const allNotices = Array.isArray(data?.messages) ? data.messages : [];
  const notices = allNotices.slice(0, 5);
  const featuredNotice = notices[0];
  const nextNoticeItems = notices.slice(1, 4);

  const allTimetableRows = Array.isArray(data?.timetableRows) ? data.timetableRows : [];
  const timetableRows = allTimetableRows.slice(0, 6);

  const allUpcomingExams = (Array.isArray(data?.examSchedule) ? data.examSchedule : [])
    .slice()
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
  const upcomingExams = allUpcomingExams;

  const markRows = Array.isArray(data?.recentMarks) ? data.recentMarks : [];
  const feeSummary = data?.feeSummary || {};
  const feeRecords = Array.isArray(data?.feeRecords) ? data.feeRecords : [];

  const statCards = [
    {
      key: "attendance",
      label: "Attendance",
      value: `${attendance.toFixed(2)}%`,
      note: "Overall Presence",
      icon: ClipboardCheck,
    },
    {
      key: "gpa",
      label: "GPA",
      value: gpa.toFixed(2),
      note: "Current Semester Index",
      icon: GraduationCap,
    },
    {
      key: "fees",
      label: "Due Fees",
      value: `Rs ${dueFees.toLocaleString("en-IN")}`,
      note: dueFees > 0 ? "Pending Payment" : "No Dues",
      icon: Wallet,
    },
  ];

  const modalTitles = {
    attendance: "Attendance Details",
    gpa: "GPA Details",
    fees: "Fee Details",
    attendanceScale: "Subject-wise Attendance Details",
    cgpa: "CGPA Breakdown",
    exams: "Upcoming Exam Details",
    notices: "Notice Board",
    timetable: "Timetable Details",
  };

  const renderTileModalContent = () => {
    if (activeTile === "attendance" || activeTile === "attendanceScale") {
      return attendanceScale.length ? (
        <div className="space-y-2.5">
          {attendanceScale.map((item) => (
            <div key={item.courseId || item.courseCode} className="glass-tile rounded-xl p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {item.courseCode} - {item.courseName}
                </p>
                <p className="text-sm font-bold">{item.percentage.toFixed(2)}%</p>
              </div>
              <p className="mt-1 text-sm">
                Present: {item.present} | Absent: {item.absent} | Late: {item.late} | Classes:{" "}
                {item.totalClasses}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">No attendance records available.</p>
      );
    }

    if (activeTile === "gpa" || activeTile === "cgpa") {
      return (
        <div className="space-y-4">
          <div className="glass-tile rounded-xl p-3">
            <p className="text-sm font-semibold">Current GPA</p>
            <p className="mt-1 text-3xl font-bold">{gpa.toFixed(2)}</p>
          </div>

          <div className="glass-tile rounded-xl p-3">
            <p className="mb-2 text-sm font-semibold">Subject Grade Points</p>
            {cgpaDistribution.length ? (
              <div className="space-y-2">
                {cgpaDistribution.map((item) => (
                  <div key={item.subject} className="flex items-center justify-between text-sm">
                    <p>{item.subject}</p>
                    <p className="font-semibold">{item.points} GP</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm">No CGPA distribution data available.</p>
            )}
          </div>

          <div className="glass-tile rounded-xl p-3">
            <p className="mb-2 text-sm font-semibold">Recent Marks</p>
            {markRows.length ? (
              <div className="space-y-1.5">
                {markRows.map((mark) => (
                  <div key={mark.id || `${mark.course?.code}-${mark.examDate}`} className="text-sm">
                    {mark.course?.code || "-"} | {mark.examType || "-"} | {mark.obtainedMarks || 0}/
                    {mark.maxMarks || 0}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm">No marks uploaded yet.</p>
            )}
          </div>
        </div>
      );
    }

    if (activeTile === "fees") {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass-tile rounded-xl p-3">
              <p className="text-sm font-semibold">Total Fee</p>
              <p className="mt-1 text-xl font-bold">
                Rs {toSafeNumber(feeSummary?.totalFee, 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="glass-tile rounded-xl p-3">
              <p className="text-sm font-semibold">Paid</p>
              <p className="mt-1 text-xl font-bold">
                Rs {toSafeNumber(feeSummary?.totalPaid, 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="glass-tile rounded-xl p-3">
              <p className="text-sm font-semibold">Due</p>
              <p className="mt-1 text-xl font-bold">
                Rs {toSafeNumber(feeSummary?.totalDue, dueFees).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="glass-tile rounded-xl p-3">
            <p className="mb-2 text-sm font-semibold">Fee Records</p>
            {feeRecords.length ? (
              <div className="space-y-2">
                {feeRecords.map((record) => (
                  <div key={record._id || `${record.semester}-${record.academicYear}`} className="text-sm">
                    Semester {record.semester} | {record.academicYear} | Paid: Rs{" "}
                    {toSafeNumber(record.paidAmount, 0).toLocaleString("en-IN")} | Total: Rs{" "}
                    {toSafeNumber(record.totalFee, 0).toLocaleString("en-IN")} | Due Date:{" "}
                    {formatDate(record.dueDate)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm">No fee records available.</p>
            )}
          </div>
        </div>
      );
    }

    if (activeTile === "exams") {
      return upcomingExams.length ? (
        <div className="space-y-2">
          {upcomingExams.map((exam) => (
            <div key={exam._id} className="glass-tile rounded-xl p-3">
              <p className="text-sm font-semibold">
                {exam.course?.code || "-"} - {exam.title || "-"}
              </p>
              <p className="mt-1 text-sm">
                {formatDate(exam.examDate)} | {exam.startTime || "-"} - {exam.endTime || "-"} |{" "}
                {exam.venue || "-"} | {exam.examType || "-"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">No upcoming exams available.</p>
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
        <p className="text-sm">No notices available.</p>
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
              <p className="mt-1 text-xs font-medium">
                {slot.teacherName || "TBA"} | Room {slot.room || "-"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">Timetable not available.</p>
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
                className={`${transparentTileClass} cursor-pointer border-[#ebe1d8] px-3.5 py-3 transition hover:border-sky-400/65 dark:hover:border-black/35`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black dark:text-white">{card.label}</p>
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
                onClick={() => setActiveTile("attendanceScale")}
                className={`${transparentTileClass} cursor-pointer border-[#ece3d9] p-4 transition hover:border-sky-400/65 dark:hover:border-black/35`}
              >
                <p className="text-xs font-semibold text-black dark:text-white">Subject-wise Attendance Scale</p>
                <p className="mt-1 text-[34px] font-bold leading-none text-black dark:text-white">{attendance.toFixed(2)}%</p>
                <p className="mt-1 text-[11px] text-black dark:text-white">Overall Attendance</p>

                <div className="mt-4 max-h-[178px] space-y-2.5 overflow-y-auto pr-1">
                  {attendanceScale.length ? (
                    attendanceScale.map((item) => (
                      <div key={item.courseId || item.courseCode} className="glass-tile rounded-xl p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] font-semibold text-black dark:text-white">
                            {item.courseCode} - {item.courseName}
                          </p>
                          <p className="text-[11px] font-semibold text-black dark:text-white">{item.percentage.toFixed(2)}%</p>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-300/40 dark:bg-black/10">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-[#cc8f5d] to-[#a36d46]"
                            style={{ width: `${Math.max(5, Math.min(item.percentage, 100))}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-black dark:text-white">No attendance records available.</p>
                  )}
                </div>
              </GlassCard>

              <GlassCard
                onClick={() => setActiveTile("cgpa")}
                className={`${transparentTileClass} cursor-pointer border-[#ece3d9] p-4 transition hover:border-sky-400/65 dark:hover:border-black/35`}
              >
                <p className="text-xs font-semibold text-black dark:text-white">CGPA Pie Chart</p>
                <div className="mt-2 h-[150px]">
                  {cgpaDistribution.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cgpaDistribution}
                          dataKey="points"
                          nameKey="subject"
                          cx="50%"
                          cy="50%"
                          outerRadius={58}
                          innerRadius={32}
                          paddingAngle={2}
                        >
                          {cgpaDistribution.map((item, index) => (
                            <Cell key={`${item.subject}-${index}`} fill={piePalette[index % piePalette.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value} GP`, "Grade Points"]}
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
                      No mark data available.
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-black dark:text-white">
                  Current GPA: <span className="font-semibold text-black dark:text-white">{gpa.toFixed(2)}</span>
                </p>
              </GlassCard>
            </div>

            <GlassCard
              onClick={() => setActiveTile("exams")}
              className={`${transparentTileClass} cursor-pointer overflow-hidden border-[#ece3d9] !p-0 transition hover:border-sky-400/65 dark:hover:border-black/35`}
            >
              <div className="flex items-center justify-between border-b border-slate-300/50 px-4 py-3 dark:border-black/15">
                <h2 className="text-sm font-semibold text-black dark:text-white">Upcoming Exam Details</h2>
                <span className="text-xs font-semibold text-black dark:text-white">{upcomingExams.length} Scheduled</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[720px] w-full text-left">
                  <thead className="bg-white/10 text-[11px] uppercase tracking-[0.12em] text-black dark:text-white">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Date</th>
                      <th className="px-4 py-2.5 font-semibold">Course</th>
                      <th className="px-4 py-2.5 font-semibold">Exam</th>
                      <th className="px-4 py-2.5 font-semibold">Time</th>
                      <th className="px-4 py-2.5 font-semibold">Venue</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingExams.length ? (
                      upcomingExams.map((exam) => (
                        <tr key={exam._id} className="border-t border-slate-300/45 text-[11px] text-black dark:border-black/10 dark:text-white">
                          <td className="px-4 py-2.5 font-semibold">{formatDate(exam.examDate)}</td>
                          <td className="px-4 py-2.5 font-semibold">{exam.course?.code || "-"}</td>
                          <td className="px-4 py-2.5">{exam.title || "-"}</td>
                          <td className="px-4 py-2.5">
                            {exam.startTime || "-"} - {exam.endTime || "-"}
                          </td>
                          <td className="px-4 py-2.5">{exam.venue || "-"}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">{exam.examType || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-4 text-sm text-black dark:text-white" colSpan={6}>
                          No upcoming exams available.
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
              className={`${transparentTileClass} cursor-pointer border-[#ece3d9] p-4 transition hover:border-sky-400/65 dark:hover:border-black/35`}
            >
              <div className="mb-2 flex items-center gap-2 text-black dark:text-white">
                <Bell size={14} />
                <p className="text-[11px] uppercase tracking-[0.15em] text-black dark:text-white">Notice Board</p>
              </div>
              {featuredNotice ? (
                <>
                  <p className="mt-1 text-sm font-semibold text-black dark:text-white">{featuredNotice.title}</p>
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
                <p className="mt-2 text-[11px] text-black dark:text-white">No notices available.</p>
              )}

              {nextNoticeItems.length ? (
                <div className="mt-4 space-y-2 border-t border-slate-300/50 pt-3 dark:border-black/15">
                  {nextNoticeItems.map((notice) => (
                    <div key={notice._id} className="glass-tile rounded-lg p-2.5">
                      <p className="text-[11px] font-semibold text-black dark:text-white">{notice.title}</p>
                      <p className="mt-0.5 text-[11px] text-black dark:text-white">{formatDate(notice.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </GlassCard>

            <GlassCard
              onClick={() => setActiveTile("timetable")}
              className={`${transparentTileClass} cursor-pointer border-[#ece3d9] p-4 transition hover:border-sky-400/65 dark:hover:border-black/35`}
            >
              <div className="mb-2 flex items-center gap-2 text-black dark:text-white">
                <CalendarDays size={14} />
                <p className="text-xs font-semibold text-black dark:text-white">Timetable</p>
              </div>

              <div className="space-y-2.5">
                {timetableRows.length ? (
                  timetableRows.map((slot, index) => (
                    <div
                      key={`${slot.courseId || slot.courseCode}-${index}`}
                      className="glass-tile rounded-xl px-2.5 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] font-semibold text-black dark:text-white">{slot.day || "-"}</p>
                        <p className="text-[11px] font-semibold text-black dark:text-white">
                          {slot.startTime || "-"} - {slot.endTime || "-"}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-black dark:text-white">
                        {slot.courseCode || "-"} - {slot.courseTitle || "-"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-black dark:text-white">
                        {slot.teacherName || "TBA"} | Room {slot.room || "-"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-black dark:text-white">Timetable not available.</p>
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

export default StudentDashboard;

