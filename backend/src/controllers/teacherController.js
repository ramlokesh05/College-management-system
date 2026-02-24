const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Notice = require("../models/Notice");
const StudentProfile = require("../models/StudentProfile");
const TeacherProfile = require("../models/TeacherProfile");
const TeacherLeave = require("../models/TeacherLeave");
const ProfileEditRequest = require("../models/ProfileEditRequest");
const { normalizeAvatar, isValidAvatar } = require("../utils/avatarUtils");

const TEACHER_BASE_SALARY = 75000;
const LEAVE_DEDUCTION_AMOUNT = 1500;
const leaveStatuses = ["pending", "approved", "rejected"];
const teacherProfileEditableFields = ["avatar"];

const sanitizeRequestedChanges = (payload = {}) =>
  teacherProfileEditableFields.reduce((acc, field) => {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== "") {
      if (field === "avatar") {
        const avatar = normalizeAvatar(payload[field]);
        if (!isValidAvatar(avatar)) {
          throw new ApiError(400, "avatar must be a valid image URL or base64 image.");
        }
        acc[field] = avatar;
      }
    }
    return acc;
  }, {});

const ensureTeacherCourse = async (teacherId, courseId) => {
  const course = await Course.findOne({ _id: courseId, teacher: teacherId });
  if (!course) {
    throw new ApiError(403, "Course not found in your assigned list.");
  }
  return course;
};

const normalizeAttendanceDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "date must be valid.");
  }
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
};

const parseLimit = (value, fallback = 60, max = 365) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), 1), max);
};

const normalizeSection = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim().toUpperCase();
};

const normalizeLeaveDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "leaveDate must be valid.");
  }
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
};

const resolveMonthYear = (monthValue, yearValue) => {
  const nowDate = new Date();
  const nowYear = nowDate.getUTCFullYear();
  const nowMonth = nowDate.getUTCMonth() + 1;

  const parsedYear = Number(yearValue);
  const parsedMonth = Number(monthValue);

  const year =
    Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : nowYear;
  const month =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : nowMonth;

  return { month, year };
};

const buildMonthWindow = (month, year) => ({
  start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
  end: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
});

const getProfile = asyncHandler(async (req, res) => {
  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) {
    throw new ApiError(404, "Teacher profile not found.");
  }

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      profile,
    },
  });
});

const createProfileEditRequest = asyncHandler(async (req, res) => {
  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) {
    throw new ApiError(404, "Teacher profile not found.");
  }

  const requestedChanges = sanitizeRequestedChanges(req.body?.requestedChanges || req.body || {});
  if (!Object.keys(requestedChanges).length) {
    throw new ApiError(400, "Provide at least one valid profile field for update request.");
  }

  const pendingRequest = await ProfileEditRequest.findOne({
    student: req.user._id,
    status: "pending",
  });
  if (pendingRequest) {
    throw new ApiError(409, "You already have a pending profile edit request.");
  }

  const hasAnyChange = Object.entries(requestedChanges).some(([field, value]) => {
    if (field === "avatar") {
      return String(req.user?.avatar ?? "") !== String(value ?? "");
    }
    return false;
  });
  if (!hasAnyChange) {
    throw new ApiError(400, "Requested values are same as your current profile.");
  }

  const request = await ProfileEditRequest.create({
    student: req.user._id,
    requestedChanges,
  });

  res.status(201).json({
    success: true,
    message: "Profile edit request submitted for admin approval.",
    data: request,
  });
});

const getProfileEditRequests = asyncHandler(async (req, res) => {
  const requests = await ProfileEditRequest.find({ student: req.user._id })
    .populate("reviewedBy", "name email role")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: requests,
  });
});

const getCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ teacher: req.user._id }).sort({ title: 1 });
  res.status(200).json({ success: true, data: courses });
});

const getCourseStudents = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  await ensureTeacherCourse(req.user._id, courseId);
  const sectionFilter = normalizeSection(req.query.section);

  const enrollments = await Enrollment.find({ course: courseId, status: "active" })
    .populate("student", "name email")
    .sort({ createdAt: -1 });

  const scopedEnrollments = sectionFilter
    ? enrollments.filter((item) => normalizeSection(item.section) === sectionFilter)
    : enrollments;

  const studentIds = scopedEnrollments.map((item) => item.student?._id).filter(Boolean);
  const profiles = await StudentProfile.find({ user: { $in: studentIds } });
  const profileMap = profiles.reduce((acc, item) => {
    acc[item.user.toString()] = item;
    return acc;
  }, {});

  const response = scopedEnrollments.map((item) => ({
    enrollmentId: item._id,
    student: item.student,
    profile: item.student ? profileMap[item.student._id.toString()] || null : null,
    section: normalizeSection(item.section) || normalizeSection(profileMap[item.student?._id?.toString()]?.section) || "A",
    semester: item.semester,
    academicYear: item.academicYear,
    status: item.status,
  }));

  res.status(200).json({ success: true, data: response });
});

const markAttendance = asyncHandler(async (req, res) => {
  const {
    courseId,
    date,
    records,
    section,
  } = req.body;
  await ensureTeacherCourse(req.user._id, courseId);
  const sectionFilter = normalizeSection(section);

  const attendanceDate = normalizeAttendanceDate(date);
  const enrollmentQuery = {
    course: courseId,
    status: "active",
    ...(sectionFilter ? { section: sectionFilter } : {}),
  };
  const enrollments = await Enrollment.find(enrollmentQuery).select("student section");
  if (!enrollments.length) {
    throw new ApiError(400, sectionFilter
      ? `No active students found in section ${sectionFilter} for this course.`
      : "No active students found for this course.");
  }
  const enrolledStudentIds = new Set(enrollments.map((item) => item.student.toString()));
  const invalidRecord = records.find((record) => !enrolledStudentIds.has(String(record.studentId)));
  if (invalidRecord) {
    throw new ApiError(400, "One or more students are not actively enrolled in this course.");
  }

  const operations = records.map((record) => ({
    updateOne: {
      filter: {
        course: courseId,
        student: record.studentId,
        date: attendanceDate,
      },
      update: {
        course: courseId,
        student: record.studentId,
        date: attendanceDate,
        status: record.status,
        markedBy: req.user._id,
      },
      upsert: true,
    },
  }));
  await Attendance.bulkWrite(operations, { ordered: false });

  const savedRecords = await Attendance.find({
    course: courseId,
    date: attendanceDate,
    student: { $in: records.map((record) => record.studentId) },
  })
    .populate("student", "name email")
    .sort({ createdAt: 1 });

  const counts = savedRecords.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );

  res.status(200).json({
    success: true,
    message: "Attendance saved successfully.",
    data: {
      courseId,
      section: sectionFilter || null,
      date: attendanceDate.toISOString(),
      summary: {
        total: savedRecords.length,
        ...counts,
      },
      records: savedRecords.map((item) => ({
        attendanceId: item._id,
        studentId: item.student?._id || item.student,
        studentName: item.student?.name || "Unknown",
        status: item.status,
        date: item.date,
      })),
    },
  });
});

const getAttendanceForDate = asyncHandler(async (req, res) => {
  const { courseId, date } = req.query;
  if (!courseId) {
    throw new ApiError(400, "courseId is required.");
  }
  if (!date) {
    throw new ApiError(400, "date is required.");
  }
  await ensureTeacherCourse(req.user._id, courseId);
  const sectionFilter = normalizeSection(req.query.section);

  const attendanceDate = normalizeAttendanceDate(date);
  const enrollments = await Enrollment.find({
    course: courseId,
    status: "active",
    ...(sectionFilter ? { section: sectionFilter } : {}),
  }).select("student section");

  const scopedStudentIds = enrollments.map((item) => item.student);
  const sectionMap = enrollments.reduce((acc, item) => {
    acc[item.student.toString()] = normalizeSection(item.section) || "A";
    return acc;
  }, {});

  const records = await Attendance.find({
    course: courseId,
    date: attendanceDate,
    ...(sectionFilter ? { student: { $in: scopedStudentIds } } : {}),
  })
    .populate("student", "name email")
    .sort({ createdAt: 1 });

  const counts = records.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );

  res.status(200).json({
    success: true,
    data: {
      courseId,
      section: sectionFilter || null,
      date: attendanceDate.toISOString(),
      summary: {
        total: records.length,
        ...counts,
      },
      records: records.map((item) => ({
        attendanceId: item._id,
        studentId: item.student?._id || item.student,
        studentName: item.student?.name || "Unknown",
        section: item.student ? sectionMap[item.student._id.toString()] || null : null,
        status: item.status,
        date: item.date,
        markedAt: item.updatedAt,
      })),
    },
  });
});

const getAttendanceLogs = asyncHandler(async (req, res) => {
  const teacherCourses = await Course.find({ teacher: req.user._id }).select("_id code title");
  const teacherCourseMap = teacherCourses.reduce((acc, item) => {
    acc[item._id.toString()] = item;
    return acc;
  }, {});
  const teacherCourseIds = Object.keys(teacherCourseMap);

  const { courseId } = req.query;
  if (courseId) {
    await ensureTeacherCourse(req.user._id, courseId);
  }
  const sectionFilter = normalizeSection(req.query.section);
  if (sectionFilter && !courseId) {
    throw new ApiError(400, "courseId is required when filtering attendance logs by section.");
  }

  const limit = parseLimit(req.query.limit, 90, 500);
  const scopedCourseIds = courseId ? [courseId] : teacherCourseIds;

  const scopedEnrollments = await Enrollment.find({
    course: { $in: scopedCourseIds },
    status: "active",
    ...(sectionFilter ? { section: sectionFilter } : {}),
  }).select("course student section");

  const sectionMap = scopedEnrollments.reduce((acc, item) => {
    const key = `${item.course.toString()}|${item.student.toString()}`;
    acc[key] = normalizeSection(item.section) || "A";
    return acc;
  }, {});

  const logs = await Attendance.find({
    course: { $in: scopedCourseIds },
  })
    .populate("student", "name email")
    .sort({ date: -1, updatedAt: -1 })
    .limit(Math.max(limit * (sectionFilter ? 3 : 1), limit));

  const filteredLogs = (sectionFilter
    ? logs.filter((item) => {
        const key = `${item.course?.toString?.()}|${item.student?._id?.toString?.() || item.student?.toString?.()}`;
        return Boolean(sectionMap[key]);
      })
    : logs).slice(0, limit);

  res.status(200).json({
    success: true,
    data: filteredLogs.map((item) => {
      const courseData = teacherCourseMap[item.course?.toString?.()] || null;
      const mapKey = `${item.course?.toString?.()}|${item.student?._id?.toString?.() || item.student?.toString?.()}`;
      return {
        attendanceId: item._id,
        date: item.date,
        status: item.status,
        student: item.student
          ? {
              _id: item.student._id,
              name: item.student.name,
              email: item.student.email,
            }
          : null,
        course: courseData
          ? {
              _id: courseData._id,
              code: courseData.code,
              title: courseData.title,
            }
          : null,
        section: sectionMap[mapKey] || null,
        markedAt: item.updatedAt,
      };
    }),
  });
});

const uploadMarks = asyncHandler(async (req, res) => {
  const {
    courseId,
    studentId,
    examType,
    maxMarks,
    obtainedMarks,
    semester,
    academicYear,
    examDate,
    section,
  } = req.body;

  await ensureTeacherCourse(req.user._id, courseId);
  const sectionFilter = normalizeSection(section);

  const enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    status: "active",
    ...(sectionFilter ? { section: sectionFilter } : {}),
  });

  if (!enrollment) {
    throw new ApiError(
      400,
      sectionFilter
        ? `Student is not enrolled in section ${sectionFilter} for this course.`
        : "Student is not enrolled in this course.",
    );
  }

  const mark = await Mark.create({
    student: studentId,
    course: courseId,
    examType,
    maxMarks,
    obtainedMarks,
    semester,
    academicYear,
    gradedBy: req.user._id,
    examDate: examDate ? new Date(examDate) : new Date(),
  });

  res.status(201).json({
    success: true,
    message: "Marks uploaded successfully.",
    data: mark,
  });
});

const uploadAssignment = asyncHandler(async (req, res) => {
  const {
    courseId,
    title,
    description,
    dueDate,
    attachmentUrl = "",
    section,
  } = req.body;
  await ensureTeacherCourse(req.user._id, courseId);
  const sectionFilter = normalizeSection(section);

  if (sectionFilter) {
    const hasSectionEnrollments = await Enrollment.exists({
      course: courseId,
      status: "active",
      section: sectionFilter,
    });
    if (!hasSectionEnrollments) {
      throw new ApiError(400, `No active students found in section ${sectionFilter} for this course.`);
    }
  }

  const assignment = await Assignment.create({
    course: courseId,
    title,
    description,
    section: sectionFilter || null,
    dueDate: new Date(dueDate),
    attachmentUrl,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Assignment uploaded successfully.",
    data: assignment,
  });
});

const postAnnouncement = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    audienceType = "role",
    targetRoles = ["student"],
    courseId = null,
    attachmentUrl = "",
  } = req.body;

  if (audienceType === "course") {
    if (!courseId) {
      throw new ApiError(400, "courseId is required for course announcements.");
    }
    await ensureTeacherCourse(req.user._id, courseId);
  }

  const notice = await Notice.create({
    title,
    message,
    attachmentUrl,
    audienceType,
    targetRoles,
    course: courseId,
    postedBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Announcement posted successfully.",
    data: notice,
  });
});

const getAssignments = asyncHandler(async (req, res) => {
  const courses = await Course.find({ teacher: req.user._id }).select("_id");
  const courseIds = courses.map((item) => item._id);
  const requestedCourseId = req.query.courseId ? String(req.query.courseId) : "";
  if (requestedCourseId) {
    await ensureTeacherCourse(req.user._id, requestedCourseId);
  }
  const sectionFilter = normalizeSection(req.query.section);

  const assignmentQuery = {
    course: { $in: requestedCourseId ? [requestedCourseId] : courseIds },
    ...(sectionFilter ? { section: sectionFilter } : {}),
  };

  const assignments = await Assignment.find(assignmentQuery)
    .populate("course", "code title")
    .sort({ dueDate: 1 });

  const assignmentIds = assignments.map((item) => item._id);
  const submissions = await AssignmentSubmission.find({ assignment: { $in: assignmentIds } });
  const submissionCountMap = submissions.reduce((acc, item) => {
    const key = item.assignment.toString();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const response = assignments.map((item) => ({
    ...item.toObject(),
    submissionsCount: submissionCountMap[item._id.toString()] || 0,
  }));

  res.status(200).json({ success: true, data: response });
});

const applyLeaveRequest = asyncHandler(async (req, res) => {
  const leaveDate = normalizeLeaveDate(req.body.leaveDate);
  const reason = String(req.body.reason || "").trim();

  const existing = await TeacherLeave.findOne({
    teacher: req.user._id,
    leaveDate,
    status: { $in: ["pending", "approved"] },
  });

  if (existing) {
    throw new ApiError(
      409,
      "A pending or approved leave request already exists for this date.",
    );
  }

  const leave = await TeacherLeave.create({
    teacher: req.user._id,
    leaveDate,
    reason,
    status: "pending",
    deductionAmount: LEAVE_DEDUCTION_AMOUNT,
  });

  res.status(201).json({
    success: true,
    message: "Leave request submitted for admin approval.",
    data: leave,
  });
});

const getLeaveRequests = asyncHandler(async (req, res) => {
  const statusFilter = String(req.query.status || "").toLowerCase();

  const query = {
    teacher: req.user._id,
    ...(leaveStatuses.includes(statusFilter) ? { status: statusFilter } : {}),
  };

  const leaves = await TeacherLeave.find(query)
    .sort({ leaveDate: -1, createdAt: -1 })
    .populate("reviewedBy", "name email role");

  res.status(200).json({
    success: true,
    data: leaves,
  });
});

const getEarnings = asyncHandler(async (req, res) => {
  const { month, year } = resolveMonthYear(req.query.month, req.query.year);
  const { start, end } = buildMonthWindow(month, year);

  const approvedFilter = {
    teacher: req.user._id,
    status: "approved",
    leaveDate: { $gte: start, $lt: end },
  };
  const pendingFilter = {
    teacher: req.user._id,
    status: "pending",
    leaveDate: { $gte: start, $lt: end },
  };
  const rejectedFilter = {
    teacher: req.user._id,
    status: "rejected",
    leaveDate: { $gte: start, $lt: end },
  };

  const [approvedLeaves, pendingLeaves, approvedLeaveCount, pendingLeaveCount, rejectedLeaveCount] =
    await Promise.all([
      TeacherLeave.find(approvedFilter).sort({ leaveDate: -1, createdAt: -1 }),
      TeacherLeave.find(pendingFilter).sort({ leaveDate: -1, createdAt: -1 }),
      TeacherLeave.countDocuments(approvedFilter),
      TeacherLeave.countDocuments(pendingFilter),
      TeacherLeave.countDocuments(rejectedFilter),
    ]);

  const totalDeduction = approvedLeaveCount * LEAVE_DEDUCTION_AMOUNT;
  const netSalary = Math.max(TEACHER_BASE_SALARY - totalDeduction, 0);

  res.status(200).json({
    success: true,
    data: {
      period: {
        month,
        year,
        label: start.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
      },
      baseSalary: TEACHER_BASE_SALARY,
      deductionPerLeave: LEAVE_DEDUCTION_AMOUNT,
      approvedLeaveCount,
      pendingLeaveCount,
      rejectedLeaveCount,
      totalDeduction,
      netSalary,
      approvedLeaves,
      pendingLeaves,
    },
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const courses = await Course.find({ teacher: req.user._id }).select("_id title code");
  const courseIds = courses.map((item) => item._id);

  const [enrollments, recentAssignments, recentAnnouncements, recentMarks, pendingLeaves] = await Promise.all([
    Enrollment.find({ course: { $in: courseIds }, status: "active" }),
    Assignment.find({ course: { $in: courseIds } }).sort({ createdAt: -1 }).limit(5).populate("course", "title code"),
    Notice.find({ postedBy: req.user._id }).sort({ createdAt: -1 }).limit(5),
    Mark.find({ course: { $in: courseIds }, gradedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("course", "title code")
      .populate("student", "name email"),
    TeacherLeave.countDocuments({ teacher: req.user._id, status: "pending" }),
  ]);

  const uniqueStudents = new Set(enrollments.map((item) => item.student.toString()));

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      kpis: {
        assignedCourses: courses.length,
        enrolledStudents: uniqueStudents.size,
        assignmentsPublished: recentAssignments.length,
        announcements: recentAnnouncements.length,
        pendingLeaves,
      },
      courses,
      recentAssignments,
      recentAnnouncements,
      recentMarks,
    },
  });
});

module.exports = {
  getProfile,
  createProfileEditRequest,
  getProfileEditRequests,
  getCourses,
  getCourseStudents,
  markAttendance,
  getAttendanceForDate,
  getAttendanceLogs,
  uploadMarks,
  uploadAssignment,
  postAnnouncement,
  getAssignments,
  applyLeaveRequest,
  getLeaveRequests,
  getEarnings,
  getDashboard,
};
