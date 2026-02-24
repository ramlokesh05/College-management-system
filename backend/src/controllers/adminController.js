const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const TeacherProfile = require("../models/TeacherProfile");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Notice = require("../models/Notice");
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Fee = require("../models/Fee");
const AcademicSession = require("../models/AcademicSession");
const Section = require("../models/Section");
const ProfileEditRequest = require("../models/ProfileEditRequest");
const TeacherLeave = require("../models/TeacherLeave");
const { normalizeAvatar, isValidAvatar } = require("../utils/avatarUtils");

const LEAVE_DEDUCTION_AMOUNT = 1500;
const leaveStatuses = ["pending", "approved", "rejected"];
const USERNAME_REGEX = /^[a-z0-9._-]{3,40}$/;

const normalizeUsername = (value) => String(value || "").trim().toLowerCase();
const normalizeSectionName = (value) => String(value || "").trim().toUpperCase();
const normalizeSubjectCode = (value) => String(value || "").trim().toUpperCase();
const uniqueStringList = (values = []) =>
  Array.from(new Set((Array.isArray(values) ? values : []).map((item) => String(item)).filter(Boolean)));
const toObjectIdList = (values = []) => uniqueStringList(values).map((item) => item);

const validateAndNormalizeSubjects = (subjects = []) => {
  const normalizedSubjects = (Array.isArray(subjects) ? subjects : []).map((item) => ({
    code: normalizeSubjectCode(item?.code),
    title: String(item?.title || "").trim(),
    credits: Number(item?.credits || 0),
    department: String(item?.department || "").trim(),
  }));

  const invalidRow = normalizedSubjects.find(
    (item) => !item.code || !item.title || !Number.isFinite(item.credits) || item.credits < 0 || item.credits > 12,
  );
  if (invalidRow) {
    throw new ApiError(400, "Each subject must have valid code, title and credits (0-12).");
  }

  const uniqueCodes = new Set();
  normalizedSubjects.forEach((item) => {
    if (uniqueCodes.has(item.code)) {
      throw new ApiError(409, `Duplicate subject code found: ${item.code}`);
    }
    uniqueCodes.add(item.code);
  });

  return normalizedSubjects;
};

const ensureStudentUsers = async (studentIds = []) => {
  if (!studentIds.length) return [];
  const students = await User.find({ _id: { $in: studentIds }, role: "student" }).select("_id");
  if (students.length !== studentIds.length) {
    throw new ApiError(400, "One or more studentIds are invalid.");
  }
  return students;
};

const syncSectionStudentsAcrossData = async ({
  sectionName,
  department,
  year,
  semester,
  academicYear,
  studentIds = [],
}) => {
  if (!studentIds.length) return;
  const scopedStudentIds = toObjectIdList(studentIds);

  await Promise.all([
    StudentProfile.updateMany(
      { user: { $in: scopedStudentIds } },
      {
        $set: {
          section: sectionName,
          department,
          year,
          semester,
        },
      },
    ),
    Enrollment.updateMany(
      {
        student: { $in: scopedStudentIds },
        semester,
        academicYear,
        status: "active",
      },
      { $set: { section: sectionName } },
    ),
  ]);
};

const mapProfilesByUser = (profiles) =>
  profiles.reduce((acc, profile) => {
    acc[profile.user.toString()] = profile;
    return acc;
  }, {});

const studentProfileEditableFields = [
  "department",
  "year",
  "semester",
  "section",
  "phone",
  "address",
  "guardianName",
];

const getDashboardAnalytics = asyncHandler(async (_req, res) => {
  const [students, teachers, admins, courses, enrollments, notices, sessions] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher" }),
    User.countDocuments({ role: "admin" }),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    Notice.countDocuments(),
    AcademicSession.find().sort({ startDate: -1 }).limit(5),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totals: {
        students,
        teachers,
        admins,
        courses,
        enrollments,
        notices,
      },
      recentSessions: sessions,
      monthlyTrend: [
        { month: "Jan", admissions: Math.max(5, Math.round(students * 0.08)) },
        { month: "Feb", admissions: Math.max(7, Math.round(students * 0.1)) },
        { month: "Mar", admissions: Math.max(9, Math.round(students * 0.12)) },
        { month: "Apr", admissions: Math.max(6, Math.round(students * 0.09)) },
        { month: "May", admissions: Math.max(4, Math.round(students * 0.07)) },
        { month: "Jun", admissions: Math.max(3, Math.round(students * 0.05)) },
      ],
    },
  });
});

const listStudents = asyncHandler(async (_req, res) => {
  const students = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });
  const profiles = await StudentProfile.find({ user: { $in: students.map((item) => item._id) } });
  const profileMap = mapProfilesByUser(profiles);

  const response = students.map((student) => ({
    ...student.toObject(),
    profile: profileMap[student._id.toString()] || null,
  }));

  res.status(200).json({ success: true, data: response });
});

const listProfileEditRequests = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const filter = {};

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }

  const requests = await ProfileEditRequest.find(filter)
    .populate("student", "name email role")
    .populate("reviewedBy", "name email role")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: requests,
  });
});

const updateOwnAvatar = asyncHandler(async (req, res) => {
  const avatar = normalizeAvatar(req.body?.avatar);
  if (!avatar) {
    throw new ApiError(400, "avatar is required.");
  }
  if (!isValidAvatar(avatar)) {
    throw new ApiError(400, "avatar must be a valid image URL or base64 image.");
  }

  const user = await User.findById(req.user._id);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User is not authorized.");
  }

  if (String(user.avatar || "") === avatar) {
    throw new ApiError(400, "New profile picture is same as current one.");
  }

  user.avatar = avatar;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully.",
    data: {
      user: {
        id: user._id,
        name: user.name,
        username: user.username || "",
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: Boolean(user.isEmailVerified),
        emailVerifiedAt: user.emailVerifiedAt,
      },
    },
  });
});

const reviewProfileEditRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, adminNote = "" } = req.body || {};

  if (!["approved", "rejected"].includes(decision)) {
    throw new ApiError(400, "decision must be either approved or rejected.");
  }

  const request = await ProfileEditRequest.findById(id);
  if (!request) {
    throw new ApiError(404, "Profile edit request not found.");
  }

  if (request.status !== "pending") {
    throw new ApiError(400, "This profile edit request has already been reviewed.");
  }

  if (decision === "approved") {
    const targetUser = await User.findById(request.student);
    if (!targetUser) {
      throw new ApiError(404, "Requested user not found.");
    }

    if (request.requestedChanges?.avatar !== undefined) {
      const avatar = normalizeAvatar(request.requestedChanges.avatar);
      if (!isValidAvatar(avatar)) {
        throw new ApiError(400, "Requested avatar is invalid.");
      }
      targetUser.avatar = avatar;
      await targetUser.save();
    }

    if (targetUser.role === "student") {
      const updatePayload = studentProfileEditableFields.reduce((acc, field) => {
        if (request.requestedChanges?.[field] !== undefined) {
          acc[field] = request.requestedChanges[field];
        }
        return acc;
      }, {});

      if (Object.keys(updatePayload).length) {
        const updatedProfile = await StudentProfile.findOneAndUpdate(
          { user: request.student },
          updatePayload,
          { new: true, runValidators: true },
        );

        if (!updatedProfile) {
          throw new ApiError(404, "Student profile not found.");
        }
      }
    }

    if (targetUser.role === "teacher") {
      const profileExists = await TeacherProfile.exists({ user: request.student });
      if (!profileExists) {
        throw new ApiError(404, "Teacher profile not found.");
      }
    }
  }

  request.status = decision;
  request.adminNote = String(adminNote || "");
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();

  const populated = await ProfileEditRequest.findById(request._id)
    .populate("student", "name email role")
    .populate("reviewedBy", "name email role");

  res.status(200).json({
    success: true,
    message:
      decision === "approved"
        ? "Profile edit request approved and profile updated."
        : "Profile edit request rejected.",
    data: populated,
  });
});

const createStudent = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    username = "",
    rollNumber,
    department,
    year,
    semester,
    section = "A",
    phone = "",
    address = "",
    guardianName = "",
  } = req.body;

  const normalizedUsername = normalizeUsername(username);
  if (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) {
    throw new ApiError(400, "username must be 3-40 chars and use letters, numbers, dot, underscore, or hyphen.");
  }
  if (!String(password || "").trim()) {
    throw new ApiError(400, "password is required.");
  }

  const existing = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
    ],
  });
  if (existing) {
    throw new ApiError(409, normalizedUsername && existing.username === normalizedUsername
      ? "User with this username already exists."
      : "User with this email already exists.");
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    ...(normalizedUsername ? { username: normalizedUsername } : {}),
    role: "student",
  });

  const profile = await StudentProfile.create({
    user: user._id,
    rollNumber,
    department,
    year,
    semester,
    section,
    phone,
    address,
    guardianName,
  });

  const fee = await Fee.create({
    student: user._id,
    semester,
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    totalFee: 50000,
    paidAmount: 0,
    dueDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
  });

  res.status(201).json({
    success: true,
    message: "Student created successfully.",
    data: {
      user: {
        id: user._id,
        name: user.name,
        username: user.username || "",
        email: user.email,
        role: user.role,
      },
      profile,
      initialFee: fee,
    },
  });
});

const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await User.findById(id).select("+password");

  if (!student || student.role !== "student") {
    throw new ApiError(404, "Student not found.");
  }

  const {
    name,
    email,
    username,
    password,
    isActive,
    rollNumber,
    department,
    year,
    semester,
    section,
    phone,
    address,
    guardianName,
  } = req.body;

  if (name !== undefined) student.name = name;
  if (email !== undefined) student.email = email.toLowerCase();
  if (username !== undefined) {
    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) {
      throw new ApiError(400, "username must be 3-40 chars and use letters, numbers, dot, underscore, or hyphen.");
    }
    if (normalizedUsername) {
      const existingByUsername = await User.findOne({
        _id: { $ne: student._id },
        username: normalizedUsername,
      });
      if (existingByUsername) {
        throw new ApiError(409, "User with this username already exists.");
      }
      student.username = normalizedUsername;
    } else {
      student.username = undefined;
    }
  }
  if (password && password.trim()) student.password = password;
  if (typeof isActive === "boolean") student.isActive = isActive;
  await student.save();

  const profile = await StudentProfile.findOneAndUpdate(
    { user: id },
    {
      ...(rollNumber !== undefined ? { rollNumber } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(year !== undefined ? { year } : {}),
      ...(semester !== undefined ? { semester } : {}),
      ...(section !== undefined ? { section } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(guardianName !== undefined ? { guardianName } : {}),
    },
    { new: true, runValidators: true, upsert: true },
  );

  res.status(200).json({
    success: true,
    message: "Student updated successfully.",
    data: {
      user: {
        id: student._id,
        name: student.name,
        username: student.username || "",
        email: student.email,
        role: student.role,
        isActive: student.isActive,
      },
      profile,
    },
  });
});

const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await User.findById(id);
  if (!student || student.role !== "student") {
    throw new ApiError(404, "Student not found.");
  }

  const assignments = await Assignment.find({}).select("_id");
  const assignmentIds = assignments.map((item) => item._id);

  await Promise.all([
    User.findByIdAndDelete(id),
    StudentProfile.deleteOne({ user: id }),
    ProfileEditRequest.deleteMany({ student: id }),
    Section.updateMany({}, { $pull: { students: id } }),
    Enrollment.deleteMany({ student: id }),
    Attendance.deleteMany({ student: id }),
    Mark.deleteMany({ student: id }),
    AssignmentSubmission.deleteMany({ student: id, assignment: { $in: assignmentIds } }),
    Fee.deleteMany({ student: id }),
  ]);

  res.status(200).json({ success: true, message: "Student deleted successfully." });
});

const listTeachers = asyncHandler(async (_req, res) => {
  const teachers = await User.find({ role: "teacher" }).select("-password").sort({ createdAt: -1 });
  const profiles = await TeacherProfile.find({ user: { $in: teachers.map((item) => item._id) } });
  const profileMap = mapProfilesByUser(profiles);

  const response = teachers.map((teacher) => ({
    ...teacher.toObject(),
    profile: profileMap[teacher._id.toString()] || null,
  }));

  res.status(200).json({ success: true, data: response });
});

const listTeacherLeaves = asyncHandler(async (req, res) => {
  const status = String(req.query.status || "").toLowerCase();
  const teacherId = String(req.query.teacherId || "").trim();

  const query = {
    ...(leaveStatuses.includes(status) ? { status } : {}),
  };

  if (teacherId) {
    const teacher = await User.findById(teacherId).select("_id role");
    if (!teacher || teacher.role !== "teacher") {
      throw new ApiError(400, "Invalid teacher selected.");
    }
    query.teacher = teacherId;
  }

  const leaves = await TeacherLeave.find(query)
    .sort({ leaveDate: -1, createdAt: -1 })
    .populate("teacher", "name email role")
    .populate("reviewedBy", "name email role");

  const response = leaves.map((item) => ({
    ...item.toObject(),
    salaryImpact: item.status === "approved" ? Number(item.deductionAmount || LEAVE_DEDUCTION_AMOUNT) : 0,
  }));

  res.status(200).json({ success: true, data: response });
});

const reviewTeacherLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const decision = String(req.body.decision || "").toLowerCase();
  const adminNote = String(req.body.adminNote || "").trim();

  if (!["approved", "rejected"].includes(decision)) {
    throw new ApiError(400, "decision must be either approved or rejected.");
  }

  const leave = await TeacherLeave.findById(id);
  if (!leave) {
    throw new ApiError(404, "Leave request not found.");
  }
  if (leave.status !== "pending") {
    throw new ApiError(400, "This leave request has already been reviewed.");
  }

  leave.status = decision;
  leave.adminNote = adminNote;
  leave.reviewedBy = req.user._id;
  leave.reviewedAt = new Date();
  leave.deductionAmount = Number(leave.deductionAmount || LEAVE_DEDUCTION_AMOUNT);
  await leave.save();

  const populated = await TeacherLeave.findById(leave._id)
    .populate("teacher", "name email role")
    .populate("reviewedBy", "name email role");

  res.status(200).json({
    success: true,
    message: decision === "approved" ? "Leave request approved." : "Leave request rejected.",
    data: populated,
  });
});

const createTeacher = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    username = "",
    employeeId,
    department,
    designation,
    phone = "",
    qualification = "",
  } = req.body;

  const normalizedUsername = normalizeUsername(username);
  if (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) {
    throw new ApiError(400, "username must be 3-40 chars and use letters, numbers, dot, underscore, or hyphen.");
  }
  if (!String(password || "").trim()) {
    throw new ApiError(400, "password is required.");
  }

  const existing = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
    ],
  });
  if (existing) {
    throw new ApiError(409, normalizedUsername && existing.username === normalizedUsername
      ? "User with this username already exists."
      : "User with this email already exists.");
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    ...(normalizedUsername ? { username: normalizedUsername } : {}),
    role: "teacher",
  });

  const profile = await TeacherProfile.create({
    user: user._id,
    employeeId,
    department,
    designation,
    phone,
    qualification,
  });

  res.status(201).json({
    success: true,
    message: "Teacher created successfully.",
    data: {
      user: {
        id: user._id,
        name: user.name,
        username: user.username || "",
        email: user.email,
        role: user.role,
      },
      profile,
    },
  });
});

const updateTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const teacher = await User.findById(id).select("+password");

  if (!teacher || teacher.role !== "teacher") {
    throw new ApiError(404, "Teacher not found.");
  }

  const {
    name,
    email,
    username,
    password,
    isActive,
    employeeId,
    department,
    designation,
    phone,
    qualification,
  } = req.body;

  if (name !== undefined) teacher.name = name;
  if (email !== undefined) teacher.email = email.toLowerCase();
  if (username !== undefined) {
    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) {
      throw new ApiError(400, "username must be 3-40 chars and use letters, numbers, dot, underscore, or hyphen.");
    }
    if (normalizedUsername) {
      const existingByUsername = await User.findOne({
        _id: { $ne: teacher._id },
        username: normalizedUsername,
      });
      if (existingByUsername) {
        throw new ApiError(409, "User with this username already exists.");
      }
      teacher.username = normalizedUsername;
    } else {
      teacher.username = undefined;
    }
  }
  if (password && password.trim()) teacher.password = password;
  if (typeof isActive === "boolean") teacher.isActive = isActive;
  await teacher.save();

  const profile = await TeacherProfile.findOneAndUpdate(
    { user: id },
    {
      ...(employeeId !== undefined ? { employeeId } : {}),
      ...(department !== undefined ? { department } : {}),
      ...(designation !== undefined ? { designation } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(qualification !== undefined ? { qualification } : {}),
    },
    { new: true, runValidators: true, upsert: true },
  );

  res.status(200).json({
    success: true,
    message: "Teacher updated successfully.",
    data: {
      user: {
        id: teacher._id,
        name: teacher.name,
        username: teacher.username || "",
        email: teacher.email,
        role: teacher.role,
        isActive: teacher.isActive,
      },
      profile,
    },
  });
});

const deleteTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const teacher = await User.findById(id);
  if (!teacher || teacher.role !== "teacher") {
    throw new ApiError(404, "Teacher not found.");
  }

  await Promise.all([
    User.findByIdAndDelete(id),
    TeacherProfile.deleteOne({ user: id }),
    ProfileEditRequest.deleteMany({ student: id }),
    Course.updateMany({ teacher: id }, { $set: { teacher: null } }),
    TeacherLeave.deleteMany({ teacher: id }),
    TeacherLeave.updateMany({ reviewedBy: id }, { $set: { reviewedBy: null } }),
  ]);

  res.status(200).json({ success: true, message: "Teacher deleted successfully." });
});

const listCourses = asyncHandler(async (_req, res) => {
  const courses = await Course.find().populate("teacher", "name email").sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: courses });
});

const createCourse = asyncHandler(async (req, res) => {
  const {
    code,
    title,
    description = "",
    credits,
    department,
    semester,
    academicYear,
    teacherId = null,
    schedule = [],
  } = req.body;

  if (teacherId) {
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      throw new ApiError(400, "Invalid teacher selected.");
    }
  }

  const course = await Course.create({
    code,
    title,
    description,
    credits,
    department,
    semester,
    academicYear,
    teacher: teacherId,
    schedule,
  });

  res.status(201).json({
    success: true,
    message: "Course created successfully.",
    data: course,
  });
});

const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = { ...req.body };

  if (payload.teacherId) {
    const teacher = await User.findById(payload.teacherId);
    if (!teacher || teacher.role !== "teacher") {
      throw new ApiError(400, "Invalid teacher selected.");
    }
  }

  if (payload.teacherId !== undefined) {
    payload.teacher = payload.teacherId;
    delete payload.teacherId;
  }

  const course = await Course.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!course) {
    throw new ApiError(404, "Course not found.");
  }

  res.status(200).json({
    success: true,
    message: "Course updated successfully.",
    data: course,
  });
});

const deleteCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const course = await Course.findById(id);
  if (!course) {
    throw new ApiError(404, "Course not found.");
  }

  const assignments = await Assignment.find({ course: id }).select("_id");
  const assignmentIds = assignments.map((item) => item._id);

  await Promise.all([
    Course.findByIdAndDelete(id),
    Enrollment.deleteMany({ course: id }),
    Attendance.deleteMany({ course: id }),
    Mark.deleteMany({ course: id }),
    Notice.deleteMany({ course: id }),
    Assignment.deleteMany({ course: id }),
    AssignmentSubmission.deleteMany({ assignment: { $in: assignmentIds } }),
  ]);

  res.status(200).json({ success: true, message: "Course deleted successfully." });
});

const assignTeacher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { teacherId } = req.body;

  const [course, teacher] = await Promise.all([
    Course.findById(id),
    User.findById(teacherId),
  ]);

  if (!course) throw new ApiError(404, "Course not found.");
  if (!teacher || teacher.role !== "teacher") {
    throw new ApiError(400, "Teacher not found.");
  }

  course.teacher = teacherId;
  await course.save();

  res.status(200).json({
    success: true,
    message: "Teacher assigned successfully.",
    data: course,
  });
});

const listEnrollments = asyncHandler(async (_req, res) => {
  const enrollments = await Enrollment.find()
    .populate("student", "name email")
    .populate("course", "title code semester academicYear")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: enrollments });
});

const createEnrollment = asyncHandler(async (req, res) => {
  const {
    studentId,
    courseId,
    semester,
    academicYear,
    section,
  } = req.body;

  const [student, course, studentProfile] = await Promise.all([
    User.findById(studentId),
    Course.findById(courseId),
    StudentProfile.findOne({ user: studentId }).select("section"),
  ]);

  if (!student || student.role !== "student") {
    throw new ApiError(400, "Invalid student.");
  }
  if (!course) {
    throw new ApiError(400, "Invalid course.");
  }

  const resolvedSection = String(section || studentProfile?.section || "A").trim().toUpperCase();

  const existingEnrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
    semester,
    academicYear,
  });

  if (existingEnrollment) {
    existingEnrollment.section = resolvedSection || "A";
    existingEnrollment.status = "active";
    await existingEnrollment.save();

    res.status(200).json({
      success: true,
      message: "Enrollment updated successfully.",
      data: existingEnrollment,
    });
    return;
  }

  const enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
    section: resolvedSection || "A",
    semester,
    academicYear,
    status: "active",
  });

  res.status(201).json({
    success: true,
    message: "Enrollment created successfully.",
    data: enrollment,
  });
});

const deleteEnrollment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Enrollment.findByIdAndDelete(id);
  if (!deleted) {
    throw new ApiError(404, "Enrollment not found.");
  }

  res.status(200).json({ success: true, message: "Enrollment deleted successfully." });
});

const listSections = asyncHandler(async (req, res) => {
  const academicSessionId = String(req.query.academicSessionId || "").trim();
  const query = {
    ...(academicSessionId ? { academicSession: academicSessionId } : {}),
  };

  const sections = await Section.find(query)
    .populate("academicSession", "year semester startDate endDate isCurrent subjects")
    .populate("students", "name username email role")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: sections });
});

const createSection = asyncHandler(async (req, res) => {
  const {
    name,
    department,
    year,
    semester,
    academicSessionId,
    studentIds = [],
  } = req.body;

  const normalizedName = normalizeSectionName(name);
  const scopedStudentIds = toObjectIdList(studentIds);
  await ensureStudentUsers(scopedStudentIds);

  const session = await AcademicSession.findById(academicSessionId).select("year");
  if (!session) {
    throw new ApiError(404, "Academic session not found.");
  }

  const existing = await Section.findOne({
    name: normalizedName,
    department,
    year,
    semester,
    academicSession: academicSessionId,
  });
  if (existing) {
    throw new ApiError(409, "Section already exists for this academic session.");
  }

  const section = await Section.create({
    name: normalizedName,
    department,
    year,
    semester,
    academicSession: academicSessionId,
    students: scopedStudentIds,
  });

  if (scopedStudentIds.length) {
    await Section.updateMany(
      {
        _id: { $ne: section._id },
        academicSession: academicSessionId,
      },
      { $pull: { students: { $in: scopedStudentIds } } },
    );

    await syncSectionStudentsAcrossData({
      sectionName: normalizedName,
      department,
      year,
      semester,
      academicYear: session.year,
      studentIds: scopedStudentIds,
    });
  }

  const populated = await Section.findById(section._id)
    .populate("academicSession", "year semester startDate endDate isCurrent subjects")
    .populate("students", "name username email role");

  res.status(201).json({
    success: true,
    message: "Section created successfully.",
    data: populated,
  });
});

const updateSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const section = await Section.findById(id);
  if (!section) {
    throw new ApiError(404, "Section not found.");
  }

  const nextName = req.body.name !== undefined ? normalizeSectionName(req.body.name) : section.name;
  const nextDepartment = req.body.department !== undefined ? req.body.department : section.department;
  const nextYear = req.body.year !== undefined ? Number(req.body.year) : section.year;
  const nextSemester = req.body.semester !== undefined ? Number(req.body.semester) : section.semester;
  const nextAcademicSessionId = req.body.academicSessionId || section.academicSession.toString();
  const nextStudentIds = req.body.studentIds !== undefined
    ? toObjectIdList(req.body.studentIds)
    : section.students.map((item) => item.toString());

  await ensureStudentUsers(nextStudentIds);

  const session = await AcademicSession.findById(nextAcademicSessionId).select("year");
  if (!session) {
    throw new ApiError(404, "Academic session not found.");
  }

  const duplicate = await Section.findOne({
    _id: { $ne: id },
    name: nextName,
    department: nextDepartment,
    year: nextYear,
    semester: nextSemester,
    academicSession: nextAcademicSessionId,
  });
  if (duplicate) {
    throw new ApiError(409, "Another section with same details already exists.");
  }

  section.name = nextName;
  section.department = nextDepartment;
  section.year = nextYear;
  section.semester = nextSemester;
  section.academicSession = nextAcademicSessionId;
  section.students = nextStudentIds;
  await section.save();

  if (nextStudentIds.length) {
    await Section.updateMany(
      {
        _id: { $ne: section._id },
        academicSession: nextAcademicSessionId,
      },
      { $pull: { students: { $in: nextStudentIds } } },
    );
  }

  await syncSectionStudentsAcrossData({
    sectionName: nextName,
    department: nextDepartment,
    year: nextYear,
    semester: nextSemester,
    academicYear: session.year,
    studentIds: nextStudentIds,
  });

  const populated = await Section.findById(section._id)
    .populate("academicSession", "year semester startDate endDate isCurrent subjects")
    .populate("students", "name username email role");

  res.status(200).json({
    success: true,
    message: "Section updated successfully.",
    data: populated,
  });
});

const assignStudentsToSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const section = await Section.findById(id).populate("academicSession", "year");
  if (!section) {
    throw new ApiError(404, "Section not found.");
  }

  const scopedStudentIds = toObjectIdList(req.body.studentIds);
  await ensureStudentUsers(scopedStudentIds);

  section.students = scopedStudentIds;
  await section.save();

  if (scopedStudentIds.length) {
    await Section.updateMany(
      {
        _id: { $ne: section._id },
        academicSession: section.academicSession?._id || section.academicSession,
      },
      { $pull: { students: { $in: scopedStudentIds } } },
    );
  }

  await syncSectionStudentsAcrossData({
    sectionName: section.name,
    department: section.department,
    year: section.year,
    semester: section.semester,
    academicYear: section.academicSession?.year || "",
    studentIds: scopedStudentIds,
  });

  const populated = await Section.findById(section._id)
    .populate("academicSession", "year semester startDate endDate isCurrent subjects")
    .populate("students", "name username email role");

  res.status(200).json({
    success: true,
    message: "Students assigned to section successfully.",
    data: populated,
  });
});

const deleteSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const section = await Section.findById(id).populate("academicSession", "year");
  if (!section) {
    throw new ApiError(404, "Section not found.");
  }

  const studentIds = section.students.map((item) => item.toString());
  await Section.findByIdAndDelete(id);

  if (studentIds.length) {
    await Promise.all([
      StudentProfile.updateMany(
        {
          user: { $in: toObjectIdList(studentIds) },
          section: section.name,
          semester: section.semester,
        },
        { $set: { section: "A" } },
      ),
      Enrollment.updateMany(
        {
          student: { $in: toObjectIdList(studentIds) },
          section: section.name,
          semester: section.semester,
          academicYear: section.academicSession?.year,
        },
        { $set: { section: "A" } },
      ),
    ]);
  }

  res.status(200).json({ success: true, message: "Section deleted successfully." });
});

const listAcademicSessions = asyncHandler(async (_req, res) => {
  const sessions = await AcademicSession.find().sort({ startDate: -1 });
  res.status(200).json({ success: true, data: sessions });
});

const createAcademicSession = asyncHandler(async (req, res) => {
  const {
    year,
    semester,
    startDate,
    endDate,
    isCurrent = false,
    subjects = [],
  } = req.body;

  if (isCurrent) {
    await AcademicSession.updateMany({}, { $set: { isCurrent: false } });
  }

  const normalizedSubjects = validateAndNormalizeSubjects(subjects);

  const session = await AcademicSession.create({
    year,
    semester,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    isCurrent,
    subjects: normalizedSubjects,
  });

  res.status(201).json({
    success: true,
    message: "Academic session created successfully.",
    data: session,
  });
});

const updateAcademicSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payload = { ...req.body };

  if (payload.isCurrent) {
    await AcademicSession.updateMany({}, { $set: { isCurrent: false } });
  }

  if (payload.startDate) payload.startDate = new Date(payload.startDate);
  if (payload.endDate) payload.endDate = new Date(payload.endDate);
  if (payload.subjects !== undefined) {
    payload.subjects = validateAndNormalizeSubjects(payload.subjects);
  }

  const session = await AcademicSession.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!session) {
    throw new ApiError(404, "Academic session not found.");
  }

  res.status(200).json({
    success: true,
    message: "Academic session updated successfully.",
    data: session,
  });
});

const addAcademicSessionSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await AcademicSession.findById(id);
  if (!session) {
    throw new ApiError(404, "Academic session not found.");
  }

  const [subject] = validateAndNormalizeSubjects([req.body]);
  const duplicate = (session.subjects || []).some(
    (item) => normalizeSubjectCode(item.code) === subject.code,
  );
  if (duplicate) {
    throw new ApiError(409, `Subject code ${subject.code} already exists in this session.`);
  }

  session.subjects.push(subject);
  await session.save();

  res.status(201).json({
    success: true,
    message: "Subject added to academic session successfully.",
    data: session,
  });
});

const removeAcademicSessionSubject = asyncHandler(async (req, res) => {
  const { id, subjectCode } = req.params;
  const normalizedCode = normalizeSubjectCode(decodeURIComponent(subjectCode || ""));
  const session = await AcademicSession.findById(id);
  if (!session) {
    throw new ApiError(404, "Academic session not found.");
  }

  const nextSubjects = (session.subjects || []).filter(
    (item) => normalizeSubjectCode(item.code) !== normalizedCode,
  );
  if (nextSubjects.length === (session.subjects || []).length) {
    throw new ApiError(404, "Subject not found in this academic session.");
  }

  session.subjects = nextSubjects;
  await session.save();

  res.status(200).json({
    success: true,
    message: "Subject removed from academic session successfully.",
    data: session,
  });
});

const deleteAcademicSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await AcademicSession.findByIdAndDelete(id);
  if (!deleted) {
    throw new ApiError(404, "Academic session not found.");
  }

  await Section.deleteMany({ academicSession: id });

  res.status(200).json({ success: true, message: "Academic session deleted successfully." });
});

const listNotices = asyncHandler(async (_req, res) => {
  const notices = await Notice.find()
    .populate("postedBy", "name role")
    .populate("course", "title code")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: notices });
});

const createNotice = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    attachmentUrl = "",
    audienceType = "global",
    targetRoles = ["student", "teacher", "admin"],
    courseId = null,
  } = req.body;

  if (audienceType === "course" && !courseId) {
    throw new ApiError(400, "courseId is required for course notices.");
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
    message: "Notice created successfully.",
    data: notice,
  });
});

const deleteNotice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Notice.findByIdAndDelete(id);
  if (!deleted) {
    throw new ApiError(404, "Notice not found.");
  }
  res.status(200).json({ success: true, message: "Notice deleted successfully." });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required.");
  }

  if (newPassword.length < 5) {
    throw new ApiError(400, "New password must be at least 5 characters long.");
  }

  const admin = await User.findById(req.user._id).select("+password");
  if (!admin) {
    throw new ApiError(404, "Admin not found.");
  }

  const isPasswordMatch = await admin.comparePassword(currentPassword);
  if (!isPasswordMatch) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  admin.password = newPassword;
  await admin.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully.",
  });
});

const listFees = asyncHandler(async (req, res) => {
  const { studentId, status, semester } = req.query;
  
  const filter = {};
  if (studentId) filter.student = studentId;
  if (status) filter.status = status;
  if (semester) filter.semester = Number(semester);

  const fees = await Fee.find(filter)
    .populate("student", "fullName username email rollNumber")
    .sort({ dueDate: -1 });

  res.status(200).json({
    success: true,
    data: fees,
  });
});

const createFee = asyncHandler(async (req, res) => {
  const { studentId, semester, academicYear, totalFee, paidAmount, dueDate } = req.body;

  if (!studentId || !semester || !academicYear || !totalFee || !dueDate) {
    throw new ApiError(400, "All required fields must be provided.");
  }

  const student = await User.findById(studentId);
  if (!student || student.role !== "student") {
    throw new ApiError(404, "Student not found.");
  }

  const fee = await Fee.create({
    student: studentId,
    semester: Number(semester),
    academicYear,
    totalFee: Number(totalFee),
    paidAmount: Number(paidAmount || 0),
    dueDate: new Date(dueDate),
  });

  const populatedFee = await Fee.findById(fee._id)
    .populate("student", "fullName username email rollNumber");

  res.status(201).json({
    success: true,
    message: "Fee record created successfully.",
    data: populatedFee,
  });
});

const updateFee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { semester, academicYear, totalFee, paidAmount, dueDate } = req.body;

  const fee = await Fee.findById(id);
  if (!fee) {
    throw new ApiError(404, "Fee record not found.");
  }

  if (semester !== undefined) fee.semester = Number(semester);
  if (academicYear !== undefined) fee.academicYear = academicYear;
  if (totalFee !== undefined) fee.totalFee = Number(totalFee);
  if (paidAmount !== undefined) fee.paidAmount = Number(paidAmount);
  if (dueDate !== undefined) fee.dueDate = new Date(dueDate);

  await fee.save();

  const updatedFee = await Fee.findById(id)
    .populate("student", "fullName username email rollNumber");

  res.status(200).json({
    success: true,
    message: "Fee record updated successfully.",
    data: updatedFee,
  });
});

const deleteFee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const fee = await Fee.findByIdAndDelete(id);
  if (!fee) {
    throw new ApiError(404, "Fee record not found.");
  }

  res.status(200).json({
    success: true,
    message: "Fee record deleted successfully.",
  });
});

const getFeeDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const fee = await Fee.findById(id)
    .populate("student", "fullName username email rollNumber");

  if (!fee) {
    throw new ApiError(404, "Fee record not found.");
  }

  res.status(200).json({
    success: true,
    data: fee,
  });
});

module.exports = {
  getDashboardAnalytics,
  listStudents,
  listProfileEditRequests,
  updateOwnAvatar,
  reviewProfileEditRequest,
  createStudent,
  updateStudent,
  deleteStudent,
  listTeachers,
  listTeacherLeaves,
  reviewTeacherLeave,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  assignTeacher,
  listEnrollments,
  createEnrollment,
  deleteEnrollment,
  listSections,
  createSection,
  updateSection,
  assignStudentsToSection,
  deleteSection,
  listAcademicSessions,
  createAcademicSession,
  updateAcademicSession,
  addAcademicSessionSubject,
  removeAcademicSessionSubject,
  deleteAcademicSession,
  listNotices,
  createNotice,
  deleteNotice,
  changePassword,
  listFees,
  createFee,
  updateFee,
  deleteFee,
  getFeeDetails,
};
