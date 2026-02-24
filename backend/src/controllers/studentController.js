const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const StudentProfile = require("../models/StudentProfile");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Notice = require("../models/Notice");
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Fee = require("../models/Fee");
const ProfileEditRequest = require("../models/ProfileEditRequest");
const { normalizeAvatar, isValidAvatar } = require("../utils/avatarUtils");

const dayOrder = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const profileEditableFields = [
  "department",
  "year",
  "semester",
  "section",
  "phone",
  "address",
  "guardianName",
  "avatar",
];

const sanitizeRequestedChanges = (payload = {}) =>
  profileEditableFields.reduce((acc, field) => {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== "") {
      if (field === "avatar") {
        const avatar = normalizeAvatar(payload[field]);
        if (!isValidAvatar(avatar)) {
          throw new ApiError(400, "avatar must be a valid image URL or base64 image.");
        }
        acc[field] = avatar;
      } else {
        acc[field] = payload[field];
      }
    }
    return acc;
  }, {});

const buildGrade = (obtainedMarks, maxMarks) => {
  const percentage = (obtainedMarks / maxMarks) * 100;
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
};

const getEnrollments = (studentId) =>
  Enrollment.find({ student: studentId, status: "active" })
    .populate({
      path: "course",
      populate: { path: "teacher", select: "name email" },
    })
    .sort({ createdAt: -1 });

const getCourseIds = async (studentId) => {
  const enrollments = await Enrollment.find({ student: studentId, status: "active" }).select("course");
  return enrollments.map((item) => item.course);
};

const buildExamSchedule = async (studentId) => {
  const courseIds = await getCourseIds(studentId);
  if (!courseIds.length) return [];

  const marks = await Mark.find({
    course: { $in: courseIds },
    examDate: { $ne: null },
  })
    .populate("course", "title code")
    .sort({ examDate: 1 });

  const seen = new Set();
  return marks.reduce((acc, item) => {
    if (!item.course || !item.examDate) return acc;

    const examType = item.examType || "Exam";
    const date = new Date(item.examDate);
    if (Number.isNaN(date.getTime())) return acc;

    const key = `${item.course._id.toString()}|${examType}|${date.toISOString().slice(0, 10)}`;
    if (seen.has(key)) return acc;
    seen.add(key);

    acc.push({
      _id: key,
      title: `${item.course.title} ${examType}`.trim(),
      examType,
      examDate: item.examDate,
      startTime: "TBD",
      endTime: "TBD",
      venue: "TBD",
      course: {
        _id: item.course._id,
        code: item.course.code,
        title: item.course.title,
      },
    });
    return acc;
  }, []);
};

const buildAttendanceSummary = async (studentId) => {
  const attendance = await Attendance.find({ student: studentId }).populate("course", "title code");
  const byCourse = {};

  attendance.forEach((item) => {
    if (!item.course) return;
    const key = item.course._id.toString();
    if (!byCourse[key]) {
      byCourse[key] = {
        courseId: item.course._id,
        courseName: item.course.title,
        courseCode: item.course.code,
        totalClasses: 0,
        present: 0,
        absent: 0,
        late: 0,
      };
    }
    byCourse[key].totalClasses += 1;
    byCourse[key][item.status] += 1;
  });

  const result = Object.values(byCourse).map((item) => ({
    ...item,
    percentage: item.totalClasses
      ? Number(((item.present / item.totalClasses) * 100).toFixed(2))
      : 0,
  }));

  return result;
};

const buildAttendanceLogs = async (studentId, { limit = 120 } = {}) => {
  const attendance = await Attendance.find({ student: studentId })
    .populate("course", "title code")
    .populate("markedBy", "name email")
    .sort({ date: -1, updatedAt: -1 })
    .limit(limit);

  return attendance
    .filter((item) => item.course)
    .map((item) => ({
      attendanceId: item._id,
      date: item.date,
      status: item.status,
      course: {
        _id: item.course._id,
        code: item.course.code,
        title: item.course.title,
      },
      markedBy: item.markedBy
        ? {
            _id: item.markedBy._id,
            name: item.markedBy.name,
            email: item.markedBy.email,
          }
        : null,
      markedAt: item.updatedAt,
    }));
};

const getProfile = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) {
    throw new ApiError(404, "Student profile not found.");
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
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) {
    throw new ApiError(404, "Student profile not found.");
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

  const hasAnyChange = Object.entries(requestedChanges).some(
    ([field, value]) => {
      if (field === "avatar") {
        return String(req.user?.avatar ?? "") !== String(value ?? "");
      }
      return String(profile[field] ?? "") !== String(value ?? "");
    },
  );

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
  const enrollments = await getEnrollments(req.user._id);
  res.status(200).json({
    success: true,
    data: enrollments,
  });
});

const getTimetable = asyncHandler(async (req, res) => {
  const enrollments = await getEnrollments(req.user._id);
  const timetable = enrollments.flatMap((enrollment) => {
    if (!enrollment.course) return [];
    return (enrollment.course.schedule || []).map((slot) => ({
      courseId: enrollment.course._id,
      courseCode: enrollment.course.code,
      courseTitle: enrollment.course.title,
      teacherName: enrollment.course.teacher?.name || "TBA",
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
    }));
  });

  timetable.sort((a, b) => dayOrder[a.day] - dayOrder[b.day] || a.startTime.localeCompare(b.startTime));

  res.status(200).json({
    success: true,
    data: timetable,
  });
});

const getAttendance = asyncHandler(async (req, res) => {
  const summary = await buildAttendanceSummary(req.user._id);
  res.status(200).json({
    success: true,
    data: summary,
  });
});

const getAttendanceLogs = asyncHandler(async (req, res) => {
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 500)
    : 120;
  const logs = await buildAttendanceLogs(req.user._id, { limit });

  res.status(200).json({
    success: true,
    data: logs,
  });
});

const getMarks = asyncHandler(async (req, res) => {
  const marks = await Mark.find({ student: req.user._id })
    .populate("course", "title code")
    .sort({ examDate: -1 });

  const transformed = marks.map((item) => ({
    id: item._id,
    course: item.course,
    examType: item.examType,
    maxMarks: item.maxMarks,
    obtainedMarks: item.obtainedMarks,
    grade: buildGrade(item.obtainedMarks, item.maxMarks),
    semester: item.semester,
    academicYear: item.academicYear,
    examDate: item.examDate,
  }));

  res.status(200).json({
    success: true,
    data: transformed,
  });
});

const getExamSchedule = asyncHandler(async (req, res) => {
  const schedule = await buildExamSchedule(req.user._id);
  res.status(200).json({
    success: true,
    data: schedule,
  });
});

const getNotices = asyncHandler(async (req, res) => {
  const courseIds = await getCourseIds(req.user._id);

  const notices = await Notice.find({
    $or: [
      { audienceType: "global" },
      { targetRoles: "student" },
      { audienceType: "course", course: { $in: courseIds } },
    ],
  })
    .populate("postedBy", "name role")
    .populate("course", "code title")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: notices,
  });
});

const getAssignments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id, status: "active" }).select("course section");
  const courseIds = enrollments.map((item) => item.course);
  const sectionByCourse = enrollments.reduce((acc, item) => {
    acc[item.course.toString()] = String(item.section || "A").trim().toUpperCase();
    return acc;
  }, {});

  const [assignments, submissions] = await Promise.all([
    Assignment.find({ course: { $in: courseIds } })
      .populate("course", "title code")
      .sort({ dueDate: 1 }),
    AssignmentSubmission.find({ student: req.user._id }),
  ]);

  const submissionMap = submissions.reduce((acc, item) => {
    acc[item.assignment.toString()] = item;
    return acc;
  }, {});

  const transformed = assignments
    .filter((assignment) => {
      const courseSection = sectionByCourse[assignment.course?._id?.toString?.() || ""];
      const assignmentSection = String(assignment.section || "").trim().toUpperCase();
      return !assignmentSection || assignmentSection === courseSection;
    })
    .map((assignment) => {
      const submission = submissionMap[assignment._id.toString()];
      return {
        id: assignment._id,
        course: assignment.course,
        section: assignment.section || null,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        attachmentUrl: assignment.attachmentUrl,
        submitted: Boolean(submission),
        submissionStatus: submission
          ? submission.status
          : new Date(assignment.dueDate) < new Date()
            ? "missing"
            : "pending",
        submission,
      };
    });

  res.status(200).json({
    success: true,
    data: transformed,
  });
});

const submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { submissionText = "", fileUrl = "" } = req.body;

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    throw new ApiError(404, "Assignment not found.");
  }

  const enrollment = await Enrollment.findOne({
    student: req.user._id,
    course: assignment.course,
    status: "active",
  });

  if (!enrollment) {
    throw new ApiError(403, "You are not enrolled in this course.");
  }

  const assignmentSection = String(assignment.section || "").trim().toUpperCase();
  const enrollmentSection = String(enrollment.section || "A").trim().toUpperCase();
  if (assignmentSection && assignmentSection !== enrollmentSection) {
    throw new ApiError(403, "This assignment is not assigned to your section.");
  }

  const now = new Date();
  const status = now > assignment.dueDate ? "late" : "submitted";

  const submission = await AssignmentSubmission.findOneAndUpdate(
    { assignment: assignment._id, student: req.user._id },
    {
      submissionText,
      fileUrl,
      status,
      submittedAt: now,
    },
    { upsert: true, new: true, runValidators: true },
  );

  res.status(200).json({
    success: true,
    message: "Assignment submitted successfully.",
    data: submission,
  });
});

const getFees = asyncHandler(async (req, res) => {
  const fees = await Fee.find({ student: req.user._id }).sort({ dueDate: 1 });
  const totalFee = fees.reduce((acc, item) => acc + item.totalFee, 0);
  const totalPaid = fees.reduce((acc, item) => acc + item.paidAmount, 0);

  res.status(200).json({
    success: true,
    data: {
      records: fees,
      summary: {
        totalFee,
        totalPaid,
        totalDue: Math.max(totalFee - totalPaid, 0),
      },
    },
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const [profile, enrollments, attendanceSummary, marks, notices, fees, examSchedule, courseIds, submissions] =
    await Promise.all([
      StudentProfile.findOne({ user: req.user._id }),
      getEnrollments(req.user._id),
      buildAttendanceSummary(req.user._id),
      Mark.find({ student: req.user._id }).populate("course", "title code").sort({ examDate: -1 }).limit(5),
      Notice.find({ $or: [{ audienceType: "global" }, { targetRoles: "student" }] }).sort({ createdAt: -1 }).limit(5),
      Fee.find({ student: req.user._id }),
      buildExamSchedule(req.user._id),
      Enrollment.find({ student: req.user._id, status: "active" }).select("course section"),
      AssignmentSubmission.find({ student: req.user._id }).select("assignment"),
    ]);

  const courseIdList = courseIds.map((item) => item.course);
  const sectionByCourse = courseIds.reduce((acc, item) => {
    acc[item.course.toString()] = String(item.section || "A").trim().toUpperCase();
    return acc;
  }, {});
  const submittedAssignmentIds = new Set(submissions.map((item) => item.assignment.toString()));
  const dueAssignments = await Assignment.find({
    course: { $in: courseIdList },
    dueDate: { $gte: new Date() },
  }).select("course section");

  const pendingAssignmentsCount = dueAssignments.filter((assignment) => {
    if (submittedAssignmentIds.has(assignment._id.toString())) return false;
    const assignmentSection = String(assignment.section || "").trim().toUpperCase();
    if (!assignmentSection) return true;
    const studentSection = sectionByCourse[assignment.course.toString()] || "";
    return assignmentSection === studentSection;
  }).length;

  const totalClasses = attendanceSummary.reduce((acc, item) => acc + item.totalClasses, 0);
  const totalPresent = attendanceSummary.reduce((acc, item) => acc + item.present, 0);
  const attendancePercentage = totalClasses ? Number(((totalPresent / totalClasses) * 100).toFixed(2)) : 0;
  const totalFee = fees.reduce((acc, item) => acc + item.totalFee, 0);
  const totalPaid = fees.reduce((acc, item) => acc + item.paidAmount, 0);

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      profile,
      kpis: {
        enrolledCourses: enrollments.length,
        attendancePercentage,
        pendingAssignments: pendingAssignmentsCount,
        upcomingExams: examSchedule.length,
        feeDue: Math.max(totalFee - totalPaid, 0),
      },
      courses: enrollments,
      attendanceSummary,
      recentMarks: marks.map((item) => ({
        ...item.toObject(),
        grade: buildGrade(item.obtainedMarks, item.maxMarks),
      })),
      notices,
      examSchedule,
    },
  });
});

module.exports = {
  getProfile,
  createProfileEditRequest,
  getProfileEditRequests,
  getCourses,
  getTimetable,
  getAttendance,
  getAttendanceLogs,
  getMarks,
  getExamSchedule,
  getNotices,
  getAssignments,
  submitAssignment,
  getFees,
  getDashboard,
};
