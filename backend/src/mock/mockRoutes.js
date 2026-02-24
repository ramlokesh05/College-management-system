const express = require("express");
const { randomUUID, randomInt, createHash } = require("crypto");

const router = express.Router();

const now = () => new Date().toISOString();
const uid = (p) => `${p}_${randomUUID().slice(0, 8)}`;
const stamp = (x) => ({ ...x, createdAt: now(), updatedAt: now() });
const TEACHER_BASE_SALARY = 75000;
const LEAVE_DEDUCTION_AMOUNT = 1500;
const PASSWORD_CHANGE_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_CHANGE_OTP_COOLDOWN_MS = 60 * 1000;
const PASSWORD_CHANGE_OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFICATION_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_OTP_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS = 5;
const FORGOT_PASSWORD_OTP_TTL_MS = 10 * 60 * 1000;
const FORGOT_PASSWORD_OTP_COOLDOWN_MS = 60 * 1000;
const FORGOT_PASSWORD_OTP_MAX_ATTEMPTS = 5;
const AVATAR_MAX_CHARS = 1_500_000;

const db = {
  users: [
    stamp({
      _id: "u_admin",
      name: "System Admin",
      username: "admin.1234",
      email: "admin.1234@rusheelums.local",
      isEmailVerified: false,
      emailVerifiedAt: null,
      password: "123456",
      role: "admin",
      isActive: true,
    }),
  ],
  studentProfiles: [],
  teacherProfiles: [],
  courses: [],
  enrollments: [],
  attendance: [],
  marks: [],
  assignments: [],
  exams: [],
  submissions: [],
  fees: [],
  profileEditRequests: [],
  sessions: [],
  sections: [],
  notices: [],
  teacherLeaves: [],
  tokens: {},
  passwordChangeOtps: {},
  emailVerificationOtps: {},
  forgotPasswordOtps: {},
};

const ok = (res, data, message, code = 200) => {
  const out = { success: true };
  if (message) out.message = message;
  if (data !== undefined) out.data = data;
  return res.status(code).json(out);
};
const bad = (res, code, message) => res.status(code).json({ success: false, message });

const uById = (id) => db.users.find((u) => u._id === id);
const cById = (id) => db.courses.find((c) => c._id === id);
const sProfile = (uid_) => db.studentProfiles.find((p) => p.user === uid_) || null;
const tProfile = (uid_) => db.teacherProfiles.find((p) => p.user === uid_) || null;
const safe = (u) => (u ? {
  _id: u._id,
  id: u._id,
  name: u.name,
  username: u.username || "",
  email: u.email,
  role: u.role,
  avatar: u.avatar || "",
  isActive: u.isActive,
  isEmailVerified: Boolean(u.isEmailVerified),
  emailVerifiedAt: u.emailVerifiedAt || null,
} : null);
const profile = (u) => (u?.role === "student" ? sProfile(u._id) : u?.role === "teacher" ? tProfile(u._id) : null);
const withTeacher = (c) => (c ? { ...c, teacher: safe(uById(c.teacher)) } : null);
const noticeOut = (n) => ({ ...n, postedBy: safe(uById(n.postedBy)), course: n.course ? (() => { const c = cById(n.course); return c ? { _id: c._id, code: c.code, title: c.title } : null; })() : null });
const enrolledCourses = (sid) => db.enrollments.filter((e) => e.student === sid && e.status === "active");
const asGrade = (m) => (m >= 90 ? "A+" : m >= 80 ? "A" : m >= 70 ? "B" : m >= 60 ? "C" : m >= 50 ? "D" : "F");
const scorePct = (obtainedMarks, maxMarks) => (maxMarks ? (obtainedMarks / maxMarks) * 100 : 0);
const gradePoint = (pct) => (pct >= 90 ? 10 : pct >= 80 ? 9 : pct >= 70 ? 8 : pct >= 60 ? 7 : pct >= 50 ? 6 : 5);
const editableProfileFields = ["department", "year", "semester", "section", "phone", "address", "guardianName", "avatar"];
const normalizeAvatar = (value) => String(value || "").trim();
const isValidAvatar = (value) => {
  const avatar = normalizeAvatar(value);
  if (!avatar) return false;
  if (avatar.length > AVATAR_MAX_CHARS) return false;
  return /^https?:\/\/\S+$/i.test(avatar)
    || /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/.test(avatar);
};
const sanitizeRequestedChanges = (payload = {}) =>
  editableProfileFields.reduce((acc, field) => {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== "") {
      if (field === "avatar") {
        const avatar = normalizeAvatar(payload[field]);
        if (!isValidAvatar(avatar)) {
          throw new Error("avatar must be a valid image URL or base64 image.");
        }
        acc[field] = avatar;
      } else {
        acc[field] = payload[field];
      }
    }
    return acc;
  }, {});
const normalizeAttendanceDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed.toISOString();
};
const parseLimit = (value, fallback = 90, max = 500) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), 1), max);
};
const hashValue = (value) =>
  createHash("sha256")
    .update(String(value || ""))
    .digest("hex");
const hashVerificationCode = (userId, code) =>
  hashValue(`${String(userId)}:${String(code)}:${process.env.JWT_SECRET || "rusheel-ums"}`);
const maskEmail = (email) => {
  const value = String(email || "").trim();
  const [localPart, domainPart] = value.split("@");
  if (!localPart || !domainPart) return value;
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(localPart.length - 2, 2))}@${domainPart}`;
};
const normalizeSection = (value) =>
  value === undefined || value === null
    ? ""
    : String(value).trim().toUpperCase();
const normalizeSubjectCode = (value) => String(value || "").trim().toUpperCase();
const uniqueIds = (values = []) =>
  Array.from(new Set((Array.isArray(values) ? values : []).map((item) => String(item)).filter(Boolean)));
const sessionById = (idVal) => db.sessions.find((item) => item._id === idVal) || null;
const normalizeSubjects = (subjects = []) => {
  if (!Array.isArray(subjects)) return null;
  const normalized = subjects.map((item) => ({
    code: normalizeSubjectCode(item?.code),
    title: String(item?.title || "").trim(),
    credits: Number(item?.credits ?? 0),
    department: String(item?.department || "").trim(),
  }));
  const invalid = normalized.find(
    (item) =>
      !item.code
      || !item.title
      || !Number.isFinite(item.credits)
      || item.credits < 0
      || item.credits > 12,
  );
  if (invalid) return null;
  const seen = new Set();
  for (const item of normalized) {
    if (seen.has(item.code)) return null;
    seen.add(item.code);
  }
  return normalized;
};
const sectionOut = (section) => ({
  ...section,
  academicSession: sessionById(section.academicSession),
  students: (section.students || []).map((studentId) => safe(uById(studentId))).filter(Boolean),
});
const removeStudentsFromOtherSections = (sectionId, academicSessionId, studentIds = []) => {
  if (!studentIds.length) return;
  const targets = new Set(studentIds);
  db.sections.forEach((section) => {
    if (section._id === sectionId || section.academicSession !== academicSessionId) return;
    const nextStudents = (section.students || []).filter((studentId) => !targets.has(studentId));
    if (nextStudents.length !== (section.students || []).length) {
      section.students = nextStudents;
      section.updatedAt = now();
    }
  });
};
const syncSectionStudentsAcrossData = (section) => {
  const students = uniqueIds(section.students || []);
  if (!students.length) return;
  const session = sessionById(section.academicSession);
  const academicYear = String(session?.year || "");

  students.forEach((studentId) => {
    const profileRecord = sProfile(studentId);
    if (profileRecord) {
      profileRecord.section = section.name;
      profileRecord.department = section.department;
      profileRecord.year = Number(section.year || profileRecord.year || 1);
      profileRecord.semester = Number(section.semester || profileRecord.semester || 1);
      profileRecord.updatedAt = now();
    }
  });

  db.enrollments.forEach((enrollment) => {
    if (
      students.includes(enrollment.student)
      && Number(enrollment.semester) === Number(section.semester)
      && String(enrollment.status) === "active"
      && (!academicYear || String(enrollment.academicYear) === academicYear)
    ) {
      enrollment.section = section.name;
      enrollment.updatedAt = now();
    }
  });
};
const leaveStatuses = ["pending", "approved", "rejected"];
const normalizeLeaveDate = (value) => normalizeAttendanceDate(value);
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
const leaveOut = (record) => ({
  ...record,
  teacher: safe(uById(record.teacher)),
  reviewedBy: record.reviewedBy ? safe(uById(record.reviewedBy)) : null,
});
const teacherCourseIds = (teacherId) => db.courses.filter((course) => course.teacher === teacherId).map((course) => course._id);
const attendanceOut = (record) => ({
  attendanceId: record._id,
  date: record.date,
  status: record.status,
  course: (() => {
    const course = cById(record.course);
    return course
      ? {
          _id: course._id,
          code: course.code,
          title: course.title,
        }
      : null;
  })(),
  student: safe(uById(record.student)),
  markedBy: safe(uById(record.markedBy)),
  markedAt: record.updatedAt,
});

const studentTimetable = (studentId) =>
  enrolledCourses(studentId).flatMap((enrollment) =>
    (cById(enrollment.course)?.schedule || []).map((slot) => ({
      courseId: enrollment.course,
      courseCode: cById(enrollment.course)?.code,
      courseTitle: cById(enrollment.course)?.title,
      teacherName: safe(uById(cById(enrollment.course)?.teacher))?.name || "TBA",
      section: enrollment.section || "A",
      ...slot,
    })),
  );

const studentAttendanceSummary = (studentId) => {
  const summary = {};
  db.attendance
    .filter((record) => record.student === studentId)
    .forEach((record) => {
      const course = cById(record.course);
      if (!course) return;
      if (!summary[course._id]) {
        summary[course._id] = {
          courseId: course._id,
          courseName: course.title,
          courseCode: course.code,
          totalClasses: 0,
          present: 0,
          absent: 0,
          late: 0,
        };
      }
      summary[course._id].totalClasses += 1;
      summary[course._id][record.status] += 1;
    });

  return Object.values(summary).map((item) => ({
    ...item,
    percentage: item.totalClasses ? Number(((item.present / item.totalClasses) * 100).toFixed(2)) : 0,
  }));
};

const studentAttendanceLogs = (studentId, limit = 120) =>
  db.attendance
    .filter((record) => record.student === studentId)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
    .map(attendanceOut);

const studentMarks = (studentId) =>
  db.marks
    .filter((mark) => mark.student === studentId)
    .map((mark) => ({
      id: mark._id,
      course: (() => {
        const course = cById(mark.course);
        return course ? { _id: course._id, code: course.code, title: course.title } : null;
      })(),
      examType: mark.examType,
      maxMarks: mark.maxMarks,
      obtainedMarks: mark.obtainedMarks,
      grade: asGrade(scorePct(mark.obtainedMarks, mark.maxMarks)),
      gradePoint: gradePoint(scorePct(mark.obtainedMarks, mark.maxMarks)),
      semester: mark.semester,
      academicYear: mark.academicYear,
      examDate: mark.examDate,
    }));

const studentNotices = (studentId) =>
  db.notices
    .filter(
      (notice) =>
        notice.audienceType === "global" ||
        notice.targetRoles.includes("student") ||
        (notice.audienceType === "course" && enrolledCourses(studentId).some((item) => item.course === notice.course)),
    )
    .map(noticeOut);

const studentExamSchedule = (studentId) => {
  const courseIds = enrolledCourses(studentId).map((item) => item.course);
  return db.exams
    .filter((exam) => courseIds.includes(exam.course))
    .map((exam) => ({
      _id: exam._id,
      title: exam.title,
      examType: exam.examType,
      examDate: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
      venue: exam.venue,
      course: (() => {
        const course = cById(exam.course);
        return course ? { _id: course._id, code: course.code, title: course.title } : null;
      })(),
    }))
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
};

const studentCgpaBreakdown = (studentId) => {
  const marks = studentMarks(studentId);
  const grouped = marks.reduce((acc, mark) => {
    if (!mark.course?.code) return acc;
    if (!acc[mark.course.code]) {
      acc[mark.course.code] = { subject: mark.course.code, pointsTotal: 0, count: 0 };
    }
    acc[mark.course.code].pointsTotal += mark.gradePoint;
    acc[mark.course.code].count += 1;
    return acc;
  }, {});

  return Object.values(grouped).map((item) => ({
    subject: item.subject,
    points: Number((item.pointsTotal / item.count).toFixed(2)),
  }));
};

const studentCgpa = (studentId) => {
  const breakdown = studentCgpaBreakdown(studentId);
  if (!breakdown.length) return 0;
  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  return Number((total / breakdown.length).toFixed(2));
};

const auth = (req, res, next) => {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return bad(res, 401, "Authorization token is required.");
  const token = h.split(" ")[1];
  const user = uById(db.tokens[token]);
  if (!user || !user.isActive) return bad(res, 401, "Invalid or expired token.");
  req.user = user;
  return next();
};
const role = (...roles) => (req, res, next) => (roles.includes(req.user.role) ? next() : bad(res, 403, "You are not allowed to access this resource."));

router.post("/auth/login", (req, res) => {
  const identifier = String(req.body?.identifier || req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = db.users.find(
    (u) =>
      (u.email.toLowerCase() === identifier || String(u.username || "").toLowerCase() === identifier)
      && u.password === password
      && u.isActive,
  );
  if (!user) return bad(res, 401, "Invalid username/email or password.");
  const token = `mock-${user._id}-${Date.now()}`;
  db.tokens[token] = user._id;
  return ok(res, { token, user: safe(user), profile: profile(user) }, "Login successful.");
});
router.post("/auth/forgot-password/request-otp", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return bad(res, 400, "Provide a valid email address.");
  }

  const challenge = db.forgotPasswordOtps[email];
  const nowMs = Date.now();
  if (challenge && nowMs - challenge.requestedAt < FORGOT_PASSWORD_OTP_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((FORGOT_PASSWORD_OTP_COOLDOWN_MS - (nowMs - challenge.requestedAt)) / 1000);
    return bad(res, 429, `Please wait ${secondsLeft}s before requesting a new OTP.`);
  }

  const user = db.users.find(
    (item) => String(item.email || "").toLowerCase() === email && item.isActive,
  );
  if (!user) {
    return ok(res, undefined, "If an account exists for this email, OTP will be sent.");
  }

  const otp = String(randomInt(100000, 1000000));
  db.forgotPasswordOtps[email] = {
    userId: user._id,
    codeHash: hashVerificationCode(email, otp),
    expiresAt: nowMs + FORGOT_PASSWORD_OTP_TTL_MS,
    requestedAt: nowMs,
    attemptsLeft: FORGOT_PASSWORD_OTP_MAX_ATTEMPTS,
  };

  // eslint-disable-next-line no-console
  console.log(`[MOCK_EMAIL] Forgot password code for ${email}: ${otp}`);

  return ok(
    res,
    {
      destination: maskEmail(email),
      expiresInMinutes: Math.round(FORGOT_PASSWORD_OTP_TTL_MS / (60 * 1000)),
      delivery: "console",
      ...(process.env.NODE_ENV !== "production" ? { debugOtp: otp } : {}),
    },
    "OTP sent to your email.",
  );
});
router.post("/auth/forgot-password/reset", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const otp = String(req.body?.otp || "").trim();
  const newPassword = String(req.body?.newPassword || "");
  const confirmPassword = String(req.body?.confirmPassword || "");

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return bad(res, 400, "Provide a valid email address.");
  }
  if (!/^\d{6}$/.test(otp)) {
    return bad(res, 400, "otp must be a 6-digit code.");
  }
  if (newPassword.length < 6) {
    return bad(res, 400, "newPassword must be at least 6 characters.");
  }
  if (newPassword !== confirmPassword) {
    return bad(res, 400, "confirmPassword must match newPassword.");
  }

  const challenge = db.forgotPasswordOtps[email];
  if (!challenge) {
    return bad(res, 400, "Request OTP before resetting password.");
  }
  if (Date.now() > challenge.expiresAt) {
    delete db.forgotPasswordOtps[email];
    return bad(res, 400, "OTP expired. Request a new OTP.");
  }

  const otpMatches = hashVerificationCode(email, otp) === challenge.codeHash;
  if (!otpMatches) {
    challenge.attemptsLeft -= 1;
    if (challenge.attemptsLeft <= 0) {
      delete db.forgotPasswordOtps[email];
      return bad(res, 401, "OTP invalid. Request a new OTP.");
    }
    db.forgotPasswordOtps[email] = challenge;
    return bad(res, 401, `Invalid OTP. Attempts left: ${challenge.attemptsLeft}`);
  }

  const user = db.users.find((item) => item._id === challenge.userId && item.isActive);
  if (!user || String(user.email || "").toLowerCase() !== email) {
    delete db.forgotPasswordOtps[email];
    return bad(res, 404, "Account not found for this email.");
  }
  if (user.password === newPassword) {
    return bad(res, 400, "New password must be different from current password.");
  }

  user.password = newPassword;
  user.updatedAt = now();
  delete db.forgotPasswordOtps[email];

  return ok(res, undefined, "Password reset successful. You can now login with new password.");
});
router.get("/auth/me", auth, (req, res) => ok(res, { user: safe(req.user), profile: profile(req.user) }));
router.post("/auth/email/request-otp", auth, (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return bad(res, 400, "Provide a valid email address.");
  }

  const emailInUse = db.users.find(
    (item) => item._id !== req.user._id && String(item.email || "").toLowerCase() === email,
  );
  if (emailInUse) {
    return bad(res, 409, "This email is already used by another account.");
  }

  const challenge = db.emailVerificationOtps[req.user._id];
  const nowMs = Date.now();
  if (challenge && nowMs - challenge.requestedAt < EMAIL_VERIFICATION_OTP_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((EMAIL_VERIFICATION_OTP_COOLDOWN_MS - (nowMs - challenge.requestedAt)) / 1000);
    return bad(res, 429, `Please wait ${secondsLeft}s before requesting a new OTP.`);
  }

  const otp = String(randomInt(100000, 1000000));
  db.emailVerificationOtps[req.user._id] = {
    email,
    codeHash: hashVerificationCode(req.user._id, otp),
    expiresAt: nowMs + EMAIL_VERIFICATION_OTP_TTL_MS,
    requestedAt: nowMs,
    attemptsLeft: EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS,
  };

  // eslint-disable-next-line no-console
  console.log(`[MOCK_EMAIL] Email verification code for ${email}: ${otp}`);

  return ok(
    res,
    {
      destination: maskEmail(email),
      expiresInMinutes: Math.round(EMAIL_VERIFICATION_OTP_TTL_MS / (60 * 1000)),
      delivery: "console",
      ...(process.env.NODE_ENV !== "production" ? { debugOtp: otp } : {}),
    },
    "OTP sent to the provided email.",
  );
});
router.post("/auth/email/verify-otp", auth, (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const otp = String(req.body?.otp || "").trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return bad(res, 400, "Provide a valid email address.");
  }
  if (!/^\d{6}$/.test(otp)) {
    return bad(res, 400, "otp must be a 6-digit code.");
  }

  const challenge = db.emailVerificationOtps[req.user._id];
  if (!challenge) {
    return bad(res, 400, "Request OTP before verifying email.");
  }

  if (Date.now() > challenge.expiresAt) {
    delete db.emailVerificationOtps[req.user._id];
    return bad(res, 400, "OTP expired. Request a new OTP.");
  }

  if (challenge.email !== email) {
    return bad(res, 400, "Email does not match latest OTP request.");
  }

  const otpMatches = hashVerificationCode(req.user._id, otp) === challenge.codeHash;
  if (!otpMatches) {
    challenge.attemptsLeft -= 1;
    if (challenge.attemptsLeft <= 0) {
      delete db.emailVerificationOtps[req.user._id];
      return bad(res, 401, "OTP invalid. Request a new OTP.");
    }
    db.emailVerificationOtps[req.user._id] = challenge;
    return bad(res, 401, `Invalid OTP. Attempts left: ${challenge.attemptsLeft}`);
  }

  const emailInUse = db.users.find(
    (item) => item._id !== req.user._id && String(item.email || "").toLowerCase() === email,
  );
  if (emailInUse) {
    delete db.emailVerificationOtps[req.user._id];
    return bad(res, 409, "This email is already used by another account.");
  }

  req.user.email = email;
  req.user.isEmailVerified = true;
  req.user.emailVerifiedAt = now();
  req.user.updatedAt = now();
  delete db.emailVerificationOtps[req.user._id];

  return ok(res, { user: safe(req.user) }, "Email verified successfully.");
});
router.post("/auth/change-password/request-code", auth, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const confirmPassword = String(req.body?.confirmPassword || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return bad(res, 400, "currentPassword, newPassword and confirmPassword are required.");
  }
  if (newPassword.length < 6) {
    return bad(res, 400, "newPassword must be at least 6 characters.");
  }
  if (newPassword !== confirmPassword) {
    return bad(res, 400, "confirmPassword must match newPassword.");
  }
  if (req.user.password !== currentPassword) {
    return bad(res, 401, "Current password is incorrect.");
  }
  if (currentPassword === newPassword) {
    return bad(res, 400, "New password must be different from current password.");
  }

  const challenge = db.passwordChangeOtps[req.user._id];
  const nowMs = Date.now();
  if (challenge && nowMs - challenge.requestedAt < PASSWORD_CHANGE_OTP_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((PASSWORD_CHANGE_OTP_COOLDOWN_MS - (nowMs - challenge.requestedAt)) / 1000);
    return bad(res, 429, `Please wait ${secondsLeft}s before requesting a new verification code.`);
  }

  const code = String(randomInt(100000, 1000000));
  db.passwordChangeOtps[req.user._id] = {
    codeHash: hashVerificationCode(req.user._id, code),
    passwordHash: hashValue(newPassword),
    expiresAt: nowMs + PASSWORD_CHANGE_OTP_TTL_MS,
    requestedAt: nowMs,
    attemptsLeft: PASSWORD_CHANGE_OTP_MAX_ATTEMPTS,
  };

  // eslint-disable-next-line no-console
  console.log(`[MOCK_EMAIL] Password change code for ${req.user.email}: ${code}`);

  return ok(
    res,
    {
      destination: maskEmail(req.user.email),
      expiresInMinutes: Math.round(PASSWORD_CHANGE_OTP_TTL_MS / (60 * 1000)),
      delivery: "console",
      ...(process.env.NODE_ENV !== "production" ? { debugVerificationCode: code } : {}),
    },
    "Verification code sent to your registered email.",
  );
});
router.patch("/auth/change-password", auth, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const confirmPassword = String(req.body?.confirmPassword || "");
  const verificationCode = String(req.body?.verificationCode || "").trim();

  if (!currentPassword || !newPassword || !confirmPassword || !verificationCode) {
    return bad(
      res,
      400,
      "currentPassword, newPassword, confirmPassword and verificationCode are required.",
    );
  }
  if (!/^\d{6}$/.test(verificationCode)) {
    return bad(res, 400, "verificationCode must be a 6-digit code.");
  }
  if (newPassword.length < 6) {
    return bad(res, 400, "newPassword must be at least 6 characters.");
  }
  if (newPassword !== confirmPassword) {
    return bad(res, 400, "confirmPassword must match newPassword.");
  }
  if (req.user.password !== currentPassword) {
    return bad(res, 401, "Current password is incorrect.");
  }
  if (currentPassword === newPassword) {
    return bad(res, 400, "New password must be different from current password.");
  }

  const challenge = db.passwordChangeOtps[req.user._id];
  if (!challenge) {
    return bad(res, 400, "Request a verification code before changing password.");
  }
  if (Date.now() > challenge.expiresAt) {
    delete db.passwordChangeOtps[req.user._id];
    return bad(res, 400, "Verification code expired. Request a new one.");
  }
  if (hashValue(newPassword) !== challenge.passwordHash) {
    return bad(res, 400, "New password changed after verification request. Request code again.");
  }
  const codeMatches = hashVerificationCode(req.user._id, verificationCode) === challenge.codeHash;
  if (!codeMatches) {
    challenge.attemptsLeft -= 1;
    if (challenge.attemptsLeft <= 0) {
      delete db.passwordChangeOtps[req.user._id];
      return bad(res, 401, "Verification code invalid. Request a new code.");
    }
    db.passwordChangeOtps[req.user._id] = challenge;
    return bad(res, 401, `Invalid verification code. Attempts left: ${challenge.attemptsLeft}`);
  }

  req.user.password = newPassword;
  req.user.updatedAt = now();
  delete db.passwordChangeOtps[req.user._id];
  return ok(res, undefined, "Password changed successfully.");
});

router.get("/student/profile", auth, role("student"), (req, res) => ok(res, { user: safe(req.user), profile: sProfile(req.user._id) }));
router.get("/student/profile-edit-requests", auth, role("student"), (req, res) =>
  ok(
    res,
    db.profileEditRequests
      .filter((item) => item.student === req.user._id)
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => ({
        ...item,
        student: safe(uById(item.student)),
        reviewedBy: item.reviewedBy ? safe(uById(item.reviewedBy)) : null,
      })),
  ));
router.post("/student/profile-edit-requests", auth, role("student"), (req, res) => {
  const profile = sProfile(req.user._id);
  if (!profile) return bad(res, 404, "Student profile not found.");

  let requestedChanges;
  try {
    requestedChanges = sanitizeRequestedChanges(req.body?.requestedChanges || req.body || {});
  } catch (error) {
    return bad(res, 400, error.message || "Invalid profile update payload.");
  }
  if (!Object.keys(requestedChanges).length) {
    return bad(res, 400, "Provide at least one valid profile field for update request.");
  }

  const pending = db.profileEditRequests.find((item) => item.student === req.user._id && item.status === "pending");
  if (pending) return bad(res, 409, "You already have a pending profile edit request.");

  const hasAnyChange = Object.entries(requestedChanges).some(([field, value]) => {
    if (field === "avatar") {
      return String(req.user?.avatar || "") !== String(value ?? "");
    }
    return String(profile[field] ?? "") !== String(value ?? "");
  });
  if (!hasAnyChange) return bad(res, 400, "Requested values are same as your current profile.");

  const rec = stamp({
    _id: uid("per"),
    student: req.user._id,
    requestedChanges,
    status: "pending",
    adminNote: "",
    reviewedBy: null,
    reviewedAt: null,
  });
  db.profileEditRequests.push(rec);
  return ok(res, { ...rec, student: safe(req.user), reviewedBy: null }, "Profile edit request submitted for admin approval.", 201);
});
router.get("/teacher/profile", auth, role("teacher"), (req, res) =>
  ok(res, { user: safe(req.user), profile: tProfile(req.user._id) }));
router.get("/teacher/profile-edit-requests", auth, role("teacher"), (req, res) =>
  ok(
    res,
    db.profileEditRequests
      .filter((item) => item.student === req.user._id)
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((item) => ({
        ...item,
        student: safe(uById(item.student)),
        reviewedBy: item.reviewedBy ? safe(uById(item.reviewedBy)) : null,
      })),
  ));
router.post("/teacher/profile-edit-requests", auth, role("teacher"), (req, res) => {
  const profile = tProfile(req.user._id);
  if (!profile) return bad(res, 404, "Teacher profile not found.");

  let requestedChanges;
  try {
    requestedChanges = sanitizeRequestedChanges(req.body?.requestedChanges || req.body || {});
  } catch (error) {
    return bad(res, 400, error.message || "Invalid profile update payload.");
  }
  if (!Object.keys(requestedChanges).length) {
    return bad(res, 400, "Provide at least one valid profile field for update request.");
  }

  const invalidField = Object.keys(requestedChanges).find((field) => field !== "avatar");
  if (invalidField) {
    return bad(res, 400, "Teachers can request only profile picture updates.");
  }

  const pending = db.profileEditRequests.find((item) => item.student === req.user._id && item.status === "pending");
  if (pending) return bad(res, 409, "You already have a pending profile edit request.");

  const hasAnyChange = String(req.user?.avatar || "") !== String(requestedChanges.avatar || "");
  if (!hasAnyChange) return bad(res, 400, "Requested values are same as your current profile.");

  const rec = stamp({
    _id: uid("per"),
    student: req.user._id,
    requestedChanges,
    status: "pending",
    adminNote: "",
    reviewedBy: null,
    reviewedAt: null,
  });
  db.profileEditRequests.push(rec);
  return ok(res, { ...rec, student: safe(req.user), reviewedBy: null }, "Profile edit request submitted for admin approval.", 201);
});
router.get("/student/courses", auth, role("student"), (req, res) => ok(res, enrolledCourses(req.user._id).map((e) => ({ ...e, course: withTeacher(cById(e.course)) }))));
router.get("/student/timetable", auth, role("student"), (req, res) => ok(res, studentTimetable(req.user._id)));
router.get("/student/attendance", auth, role("student"), (req, res) => ok(res, studentAttendanceSummary(req.user._id)));
router.get("/student/attendance/logs", auth, role("student"), (req, res) =>
  ok(res, studentAttendanceLogs(req.user._id, parseLimit(req.query?.limit, 120))));
router.get("/student/marks", auth, role("student"), (req, res) => ok(res, studentMarks(req.user._id)));
router.get("/student/notices", auth, role("student"), (req, res) => ok(res, studentNotices(req.user._id)));
router.get("/student/exam-schedule", auth, role("student"), (req, res) => ok(res, studentExamSchedule(req.user._id)));
router.get("/student/assignments", auth, role("student"), (req, res) => {
  const enrollmentRows = enrolledCourses(req.user._id);
  const cids = enrollmentRows.map((e) => e.course);
  const sectionByCourse = enrollmentRows.reduce((acc, item) => {
    acc[item.course] = normalizeSection(item.section) || "A";
    return acc;
  }, {});
  const subs = db.submissions.filter((s) => s.student === req.user._id).reduce((a, s) => ((a[s.assignment] = s), a), {});
  const out = db.assignments
    .filter((a) => cids.includes(a.course))
    .filter((a) => {
      const assignmentSection = normalizeSection(a.section);
      return !assignmentSection || assignmentSection === sectionByCourse[a.course];
    })
    .map((a) => ({ id: a._id, course: (() => { const c = cById(a.course); return c ? { _id: c._id, code: c.code, title: c.title } : null; })(), section: a.section || null, title: a.title, description: a.description, dueDate: a.dueDate, attachmentUrl: a.attachmentUrl, submitted: Boolean(subs[a._id]), submissionStatus: subs[a._id] ? subs[a._id].status : "pending", submission: subs[a._id] || null }));
  return ok(res, out);
});
router.post("/student/assignments/:assignmentId/submit", auth, role("student"), (req, res) => {
  const aid = req.params.assignmentId;
  const assignment = db.assignments.find((item) => item._id === aid);
  if (!assignment) return bad(res, 404, "Assignment not found.");
  const enrollment = db.enrollments.find(
    (item) => item.student === req.user._id && item.course === assignment.course && item.status === "active",
  );
  if (!enrollment) return bad(res, 403, "You are not enrolled in this course.");
  if (normalizeSection(assignment.section) && normalizeSection(assignment.section) !== normalizeSection(enrollment.section)) {
    return bad(res, 403, "This assignment is not assigned to your section.");
  }

  const ex = db.submissions.find((s) => s.assignment === aid && s.student === req.user._id);
  if (ex) {
    ex.submissionText = req.body?.submissionText || "";
    ex.fileUrl = req.body?.fileUrl || "";
    ex.status = "submitted";
    ex.submittedAt = now();
    ex.updatedAt = now();
    return ok(res, ex, "Assignment submitted successfully.");
  }
  const n = stamp({ _id: uid("sub"), assignment: aid, student: req.user._id, submissionText: req.body?.submissionText || "", fileUrl: req.body?.fileUrl || "", status: "submitted", submittedAt: now() });
  db.submissions.push(n);
  return ok(res, n, "Assignment submitted successfully.");
});
router.get("/student/fees", auth, role("student"), (req, res) => {
  const records = db.fees.filter((f) => f.student === req.user._id);
  const totalFee = records.reduce((s, f) => s + f.totalFee, 0);
  const totalPaid = records.reduce((s, f) => s + f.paidAmount, 0);
  return ok(res, { records, summary: { totalFee, totalPaid, totalDue: Math.max(totalFee - totalPaid, 0) } });
});
router.get("/student/dashboard", auth, role("student"), (req, res) => {
  const attendanceSummary = studentAttendanceSummary(req.user._id);
  const examSchedule = studentExamSchedule(req.user._id);
  const notices = studentNotices(req.user._id).slice(0, 5);
  const marks = studentMarks(req.user._id).slice(0, 5);
  const timetablePreview = studentTimetable(req.user._id).slice(0, 6);
  const cgpaBreakdown = studentCgpaBreakdown(req.user._id);
  const feeRecords = db.fees.filter((fee) => fee.student === req.user._id);
  const totalFee = feeRecords.reduce((sum, fee) => sum + fee.totalFee, 0);
  const totalPaid = feeRecords.reduce((sum, fee) => sum + fee.paidAmount, 0);
  const feeDue = Math.max(totalFee - totalPaid, 0);
  const attendancePercentage = attendanceSummary.length
    ? Number(
        (
          attendanceSummary.reduce((sum, item) => sum + item.percentage, 0) /
          attendanceSummary.length
        ).toFixed(2),
      )
    : 0;

  return ok(res, {
    user: safe(req.user),
    profile: sProfile(req.user._id),
    kpis: {
      attendancePercentage,
      cgpa: studentCgpa(req.user._id),
      upcomingExams: examSchedule.length,
      feeDue,
    },
    attendanceSummary,
    cgpaBreakdown,
    recentMarks: marks,
    notices,
    messages: notices.map((notice) => ({
      _id: notice._id,
      title: notice.title,
      message: notice.message,
      sender: notice.postedBy?.name || "Admin Office",
      createdAt: notice.createdAt,
    })),
    timetablePreview,
    examSchedule,
  });
});

router.get("/teacher/courses", auth, role("teacher"), (req, res) => ok(res, db.courses.filter((c) => c.teacher === req.user._id)));
router.get("/teacher/courses/:courseId/students", auth, role("teacher"), (req, res) => {
  const sectionFilter = normalizeSection(req.query?.section);
  const rows = db.enrollments
    .filter((e) => e.course === req.params.courseId)
    .filter((e) => !sectionFilter || normalizeSection(e.section) === sectionFilter)
    .map((e) => ({
      enrollmentId: e._id,
      student: safe(uById(e.student)),
      profile: sProfile(e.student),
      section: normalizeSection(e.section) || normalizeSection(sProfile(e.student)?.section) || "A",
      semester: e.semester,
      academicYear: e.academicYear,
      status: e.status,
    }));
  return ok(res, rows);
});
router.get("/teacher/attendance", auth, role("teacher"), (req, res) => {
  const courseId = String(req.query?.courseId || "");
  const date = String(req.query?.date || "");
  const sectionFilter = normalizeSection(req.query?.section);
  if (!courseId) return bad(res, 400, "courseId is required.");
  if (!date) return bad(res, 400, "date is required.");

  const course = cById(courseId);
  if (!course || course.teacher !== req.user._id) return bad(res, 403, "Course not found in your assigned list.");
  const day = normalizeAttendanceDate(date);
  if (!day) return bad(res, 400, "date must be valid.");
  const scopedStudentIds = db.enrollments
    .filter((item) => item.course === courseId && item.status === "active")
    .filter((item) => !sectionFilter || normalizeSection(item.section) === sectionFilter)
    .map((item) => item.student);
  const sectionByStudent = db.enrollments
    .filter((item) => item.course === courseId && item.status === "active")
    .reduce((acc, item) => {
      acc[item.student] = normalizeSection(item.section) || "A";
      return acc;
    }, {});

  const rows = db.attendance
    .filter((record) => record.course === courseId && normalizeAttendanceDate(record.date) === day)
    .filter((record) => !sectionFilter || scopedStudentIds.includes(record.student))
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const summary = rows.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );

  return ok(res, {
    courseId,
    section: sectionFilter || null,
    date: day,
    summary: { total: rows.length, ...summary },
    records: rows.map((item) => ({
      attendanceId: item._id,
      studentId: item.student,
      studentName: safe(uById(item.student))?.name || "Unknown",
      section: sectionByStudent[item.student] || null,
      status: item.status,
      date: item.date,
      markedAt: item.updatedAt,
    })),
  });
});
router.get("/teacher/attendance/logs", auth, role("teacher"), (req, res) => {
  const requestedCourseId = req.query?.courseId ? String(req.query.courseId) : "";
  const sectionFilter = normalizeSection(req.query?.section);
  const allowedCourseIds = teacherCourseIds(req.user._id);

  if (requestedCourseId && !allowedCourseIds.includes(requestedCourseId)) {
    return bad(res, 403, "Course not found in your assigned list.");
  }
  if (sectionFilter && !requestedCourseId) {
    return bad(res, 400, "courseId is required when filtering attendance logs by section.");
  }

  const limit = parseLimit(req.query?.limit, 90);
  const sectionByCourseStudent = db.enrollments
    .filter((item) => (requestedCourseId ? item.course === requestedCourseId : allowedCourseIds.includes(item.course)))
    .filter((item) => item.status === "active")
    .filter((item) => !sectionFilter || normalizeSection(item.section) === sectionFilter)
    .reduce((acc, item) => {
      acc[`${item.course}|${item.student}`] = normalizeSection(item.section) || "A";
      return acc;
    }, {});

  const rows = db.attendance
    .filter((record) => (requestedCourseId ? record.course === requestedCourseId : allowedCourseIds.includes(record.course)))
    .filter((record) => !sectionFilter || Boolean(sectionByCourseStudent[`${record.course}|${record.student}`]))
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, limit)
    .map((record) => ({
      ...attendanceOut(record),
      section: sectionByCourseStudent[`${record.course}|${record.student}`] || null,
    }));

  return ok(res, rows);
});
router.post("/teacher/attendance", auth, role("teacher"), (req, res) => {
  const b = req.body || {};
  const courseId = String(b.courseId || "");
  const sectionFilter = normalizeSection(b.section);
  const course = cById(courseId);
  if (!courseId || !course || course.teacher !== req.user._id) {
    return bad(res, 403, "Course not found in your assigned list.");
  }

  const day = normalizeAttendanceDate(b.date);
  if (!day) return bad(res, 400, "date must be valid.");
  if (!Array.isArray(b.records) || !b.records.length) return bad(res, 400, "records must be a non-empty array.");

  const validStatuses = new Set(["present", "absent", "late"]);
  const enrolledIds = new Set(
    db.enrollments
      .filter((item) => item.course === courseId && item.status === "active")
      .filter((item) => !sectionFilter || normalizeSection(item.section) === sectionFilter)
      .map((item) => item.student),
  );
  if (!enrolledIds.size) {
    return bad(
      res,
      400,
      sectionFilter
        ? `No active students found in section ${sectionFilter} for this course.`
        : "No active students found for this course.",
    );
  }
  const seenStudents = new Set();
  const updatedRows = [];

  for (const record of b.records) {
    const studentId = String(record?.studentId || "");
    const status = String(record?.status || "");
    if (!studentId) return bad(res, 400, "studentId is required.");
    if (!validStatuses.has(status)) return bad(res, 400, "status must be present, absent, or late.");
    if (!enrolledIds.has(studentId)) {
      return bad(res, 400, "One or more students are not actively enrolled in this course.");
    }
    if (seenStudents.has(studentId)) continue;
    seenStudents.add(studentId);

    const existing = db.attendance.find(
      (item) =>
        item.course === courseId &&
        item.student === studentId &&
        normalizeAttendanceDate(item.date) === day,
    );

    if (existing) {
      existing.status = status;
      existing.markedBy = req.user._id;
      existing.date = day;
      existing.updatedAt = now();
      updatedRows.push(existing);
    } else {
      const created = stamp({
        _id: uid("a"),
        student: studentId,
        course: courseId,
        status,
        date: day,
        markedBy: req.user._id,
      });
      db.attendance.push(created);
      updatedRows.push(created);
    }
  }

  const summary = updatedRows.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );

  return ok(
    res,
    {
      courseId,
      section: sectionFilter || null,
      date: day,
      summary: { total: updatedRows.length, ...summary },
      records: updatedRows.map((item) => ({
        attendanceId: item._id,
        studentId: item.student,
        studentName: safe(uById(item.student))?.name || "Unknown",
        status: item.status,
        date: item.date,
      })),
    },
    "Attendance saved successfully.",
  );
});
router.post("/teacher/marks", auth, role("teacher"), (req, res) => {
  const b = req.body || {};
  const sectionFilter = normalizeSection(b.section);
  const course = cById(b.courseId);
  if (!course || course.teacher !== req.user._id) {
    return bad(res, 403, "Course not found in your assigned list.");
  }
  const enrollment = db.enrollments.find(
    (item) =>
      item.course === b.courseId &&
      item.student === b.studentId &&
      item.status === "active" &&
      (!sectionFilter || normalizeSection(item.section) === sectionFilter),
  );
  if (!enrollment) {
    return bad(
      res,
      400,
      sectionFilter
        ? `Student is not enrolled in section ${sectionFilter} for this course.`
        : "Student is not enrolled in this course.",
    );
  }
  const rec = stamp({ _id: uid("m"), student: b.studentId, course: b.courseId, examType: b.examType, maxMarks: Number(b.maxMarks), obtainedMarks: Number(b.obtainedMarks), semester: Number(b.semester), academicYear: b.academicYear, gradedBy: req.user._id, examDate: b.examDate || now() });
  db.marks.push(rec);
  return ok(res, rec, "Marks uploaded successfully.", 201);
});
router.post("/teacher/assignments", auth, role("teacher"), (req, res) => {
  const b = req.body || {};
  const sectionFilter = normalizeSection(b.section);
  if (sectionFilter) {
    const hasSectionStudents = db.enrollments.some(
      (item) => item.course === b.courseId && item.status === "active" && normalizeSection(item.section) === sectionFilter,
    );
    if (!hasSectionStudents) {
      return bad(res, 400, `No active students found in section ${sectionFilter} for this course.`);
    }
  }
  const rec = stamp({ _id: uid("as"), course: b.courseId, section: sectionFilter || null, title: b.title, description: b.description, dueDate: b.dueDate, attachmentUrl: b.attachmentUrl || "", createdBy: req.user._id });
  db.assignments.push(rec);
  return ok(res, rec, "Assignment uploaded successfully.", 201);
});
router.get("/teacher/assignments", auth, role("teacher"), (req, res) => {
  const requestedCourseId = req.query?.courseId ? String(req.query.courseId) : "";
  const sectionFilter = normalizeSection(req.query?.section);
  const rows = db.assignments
    .filter((a) => cById(a.course)?.teacher === req.user._id)
    .filter((a) => (!requestedCourseId || a.course === requestedCourseId))
    .filter((a) => (!sectionFilter || normalizeSection(a.section) === sectionFilter))
    .map((a) => ({ ...a, course: (() => { const c = cById(a.course); return c ? { _id: c._id, code: c.code, title: c.title } : null; })(), submissionsCount: db.submissions.filter((s) => s.assignment === a._id).length }));
  return ok(res, rows);
});
router.post("/teacher/announcements", auth, role("teacher"), (req, res) => {
  const b = req.body || {};
  const rec = stamp({ _id: uid("n"), title: b.title, message: b.message, audienceType: b.audienceType || "role", targetRoles: b.targetRoles || ["student"], course: b.courseId || null, postedBy: req.user._id, attachmentUrl: b.attachmentUrl || "" });
  db.notices.push(rec);
  return ok(res, rec, "Announcement posted successfully.", 201);
});
router.post("/teacher/leaves", auth, role("teacher"), (req, res) => {
  const leaveDate = normalizeLeaveDate(req.body?.leaveDate);
  if (!leaveDate) return bad(res, 400, "leaveDate must be valid.");

  const existing = db.teacherLeaves.find(
    (item) =>
      item.teacher === req.user._id
      && item.leaveDate === leaveDate
      && ["pending", "approved"].includes(item.status),
  );
  if (existing) {
    return bad(res, 409, "A pending or approved leave request already exists for this date.");
  }

  const record = stamp({
    _id: uid("tl"),
    teacher: req.user._id,
    leaveDate,
    reason: String(req.body?.reason || ""),
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    adminNote: "",
    deductionAmount: LEAVE_DEDUCTION_AMOUNT,
  });
  db.teacherLeaves.push(record);
  return ok(res, leaveOut(record), "Leave request submitted for admin approval.", 201);
});
router.get("/teacher/leaves", auth, role("teacher"), (req, res) => {
  const status = String(req.query?.status || "").toLowerCase();
  const rows = db.teacherLeaves
    .filter((item) => item.teacher === req.user._id)
    .filter((item) => (!leaveStatuses.includes(status) ? true : item.status === status))
    .slice()
    .sort((a, b) => new Date(b.leaveDate) - new Date(a.leaveDate) || new Date(b.createdAt) - new Date(a.createdAt))
    .map(leaveOut);
  return ok(res, rows);
});
router.get("/teacher/earnings", auth, role("teacher"), (req, res) => {
  const { month, year } = resolveMonthYear(req.query?.month, req.query?.year);
  const { start, end } = buildMonthWindow(month, year);

  const inPeriod = (item) => {
    const date = new Date(item.leaveDate);
    return date >= start && date < end;
  };

  const approvedLeaves = db.teacherLeaves
    .filter((item) => item.teacher === req.user._id && item.status === "approved")
    .filter(inPeriod)
    .sort((a, b) => new Date(b.leaveDate) - new Date(a.leaveDate));
  const pendingLeaves = db.teacherLeaves
    .filter((item) => item.teacher === req.user._id && item.status === "pending")
    .filter(inPeriod)
    .sort((a, b) => new Date(b.leaveDate) - new Date(a.leaveDate));
  const rejectedLeaveCount = db.teacherLeaves
    .filter((item) => item.teacher === req.user._id && item.status === "rejected")
    .filter(inPeriod).length;

  const approvedLeaveCount = approvedLeaves.length;
  const pendingLeaveCount = pendingLeaves.length;
  const totalDeduction = approvedLeaveCount * LEAVE_DEDUCTION_AMOUNT;
  const netSalary = Math.max(TEACHER_BASE_SALARY - totalDeduction, 0);

  return ok(res, {
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
    approvedLeaves: approvedLeaves.map(leaveOut),
    pendingLeaves: pendingLeaves.map(leaveOut),
  });
});
router.get("/teacher/dashboard", auth, role("teacher"), (req, res) => {
  const teacherCourseIdsSet = new Set(db.courses.filter((c) => c.teacher === req.user._id).map((c) => c._id));
  const enrolledStudentsSet = new Set(
    db.enrollments
      .filter((item) => teacherCourseIdsSet.has(item.course) && item.status === "active")
      .map((item) => item.student),
  );

  return ok(res, {
    user: safe(req.user),
    kpis: {
      assignedCourses: db.courses.filter((c) => c.teacher === req.user._id).length,
      enrolledStudents: enrolledStudentsSet.size,
      assignmentsPublished: db.assignments.filter((a) => cById(a.course)?.teacher === req.user._id).length,
      announcements: db.notices.filter((n) => n.postedBy === req.user._id).length,
      pendingLeaves: db.teacherLeaves.filter((item) => item.teacher === req.user._id && item.status === "pending").length,
    },
    courses: db.courses.filter((c) => c.teacher === req.user._id).map((c) => ({ _id: c._id, code: c.code, title: c.title })),
    recentAssignments: db.assignments
      .filter((a) => cById(a.course)?.teacher === req.user._id)
      .slice(0, 5)
      .map((a) => ({ ...a, course: (() => { const c = cById(a.course); return c ? { _id: c._id, code: c.code, title: c.title } : null; })() })),
    recentAnnouncements: db.notices.filter((n) => n.postedBy === req.user._id).slice(0, 5).map(noticeOut),
    recentMarks: db.marks
      .filter((m) => m.gradedBy === req.user._id)
      .slice(0, 5)
      .map((m) => ({ ...m, course: (() => { const c = cById(m.course); return c ? { _id: c._id, code: c.code, title: c.title } : null; })(), student: safe(uById(m.student)) })),
  });
});

router.get("/admin/dashboard/analytics", auth, role("admin"), (_req, res) => ok(res, { totals: { students: db.users.filter((u) => u.role === "student").length, teachers: db.users.filter((u) => u.role === "teacher").length, admins: db.users.filter((u) => u.role === "admin").length, courses: db.courses.length, enrollments: db.enrollments.length, notices: db.notices.length }, recentSessions: db.sessions, monthlyTrend: [] }));
router.patch("/admin/profile/avatar", auth, role("admin"), (req, res) => {
  const avatar = normalizeAvatar(req.body?.avatar);
  if (!avatar) return bad(res, 400, "avatar is required.");
  if (!isValidAvatar(avatar)) return bad(res, 400, "avatar must be a valid image URL or base64 image.");
  if (String(req.user.avatar || "") === avatar) return bad(res, 400, "New profile picture is same as current one.");

  req.user.avatar = avatar;
  req.user.updatedAt = now();
  return ok(res, { user: safe(req.user) }, "Profile picture updated successfully.");
});

const listBy = (roleName, profileFn) => db.users.filter((u) => u.role === roleName).map((u) => ({ ...safe(u), profile: profileFn(u._id) }));
router.get("/admin/students", auth, role("admin"), (_req, res) => ok(res, listBy("student", sProfile)));
router.get("/admin/profile-edit-requests", auth, role("admin"), (req, res) => {
  const status = req.query?.status;
  const rows = db.profileEditRequests
    .filter((item) => (!status || !["pending", "approved", "rejected"].includes(status) ? true : item.status === status))
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((item) => ({
      ...item,
      student: safe(uById(item.student)),
      reviewedBy: item.reviewedBy ? safe(uById(item.reviewedBy)) : null,
    }));
  return ok(res, rows);
});
router.patch("/admin/profile-edit-requests/:id/review", auth, role("admin"), (req, res) => {
  const record = db.profileEditRequests.find((item) => item._id === req.params.id);
  if (!record) return bad(res, 404, "Profile edit request not found.");
  if (record.status !== "pending") return bad(res, 400, "This profile edit request has already been reviewed.");

  const decision = req.body?.decision;
  if (!["approved", "rejected"].includes(decision)) {
    return bad(res, 400, "decision must be either approved or rejected.");
  }

  if (decision === "approved") {
    const requestedUser = uById(record.student);
    if (!requestedUser) return bad(res, 404, "Requested user not found.");

    if (record.requestedChanges?.avatar !== undefined) {
      const avatar = normalizeAvatar(record.requestedChanges.avatar);
      if (!isValidAvatar(avatar)) return bad(res, 400, "Requested avatar is invalid.");
      requestedUser.avatar = avatar;
      requestedUser.updatedAt = now();
    }

    if (requestedUser.role === "student") {
      const profile = sProfile(record.student);
      if (!profile) return bad(res, 404, "Student profile not found.");
      editableProfileFields
        .filter((field) => field !== "avatar")
        .forEach((field) => {
          if (record.requestedChanges?.[field] !== undefined) {
            profile[field] = record.requestedChanges[field];
          }
        });
      profile.updatedAt = now();
    }

    if (requestedUser.role === "teacher") {
      const profile = tProfile(record.student);
      if (!profile) return bad(res, 404, "Teacher profile not found.");
      if (record.requestedChanges?.phone !== undefined) {
        profile.phone = record.requestedChanges.phone;
      }
      if (record.requestedChanges?.qualification !== undefined) {
        profile.qualification = record.requestedChanges.qualification;
      }
      profile.updatedAt = now();
    }
  }

  record.status = decision;
  record.adminNote = String(req.body?.adminNote || "");
  record.reviewedBy = req.user._id;
  record.reviewedAt = now();
  record.updatedAt = now();

  return ok(
    res,
    {
      ...record,
      student: safe(uById(record.student)),
      reviewedBy: safe(req.user),
    },
    decision === "approved"
      ? "Profile edit request approved and profile updated."
      : "Profile edit request rejected.",
  );
});
router.get("/admin/teachers", auth, role("admin"), (_req, res) => ok(res, listBy("teacher", tProfile)));
router.get("/admin/teacher-leaves", auth, role("admin"), (req, res) => {
  const status = String(req.query?.status || "").toLowerCase();
  const teacherId = String(req.query?.teacherId || "");

  if (teacherId && !db.users.find((item) => item._id === teacherId && item.role === "teacher")) {
    return bad(res, 400, "Invalid teacher selected.");
  }

  const rows = db.teacherLeaves
    .filter((item) => (!teacherId ? true : item.teacher === teacherId))
    .filter((item) => (!leaveStatuses.includes(status) ? true : item.status === status))
    .slice()
    .sort((a, b) => new Date(b.leaveDate) - new Date(a.leaveDate) || new Date(b.createdAt) - new Date(a.createdAt))
    .map((item) => ({
      ...leaveOut(item),
      salaryImpact: item.status === "approved" ? Number(item.deductionAmount || LEAVE_DEDUCTION_AMOUNT) : 0,
    }));
  return ok(res, rows);
});
router.patch("/admin/teacher-leaves/:id/review", auth, role("admin"), (req, res) => {
  const leave = db.teacherLeaves.find((item) => item._id === req.params.id);
  if (!leave) return bad(res, 404, "Leave request not found.");
  if (leave.status !== "pending") return bad(res, 400, "This leave request has already been reviewed.");

  const decision = String(req.body?.decision || "").toLowerCase();
  if (!["approved", "rejected"].includes(decision)) {
    return bad(res, 400, "decision must be either approved or rejected.");
  }

  leave.status = decision;
  leave.adminNote = String(req.body?.adminNote || "");
  leave.reviewedBy = req.user._id;
  leave.reviewedAt = now();
  leave.deductionAmount = Number(leave.deductionAmount || LEAVE_DEDUCTION_AMOUNT);
  leave.updatedAt = now();

  return ok(res, leaveOut(leave), decision === "approved" ? "Leave request approved." : "Leave request rejected.");
});
router.get("/admin/courses", auth, role("admin"), (_req, res) => ok(res, db.courses.map(withTeacher)));
router.get("/admin/enrollments", auth, role("admin"), (_req, res) => ok(res, db.enrollments.map((e) => ({ ...e, section: normalizeSection(e.section) || "A", student: safe(uById(e.student)), course: (() => { const c = cById(e.course); return c ? { _id: c._id, code: c.code, title: c.title, semester: c.semester, academicYear: c.academicYear } : null; })() }))));
router.get("/admin/academic-sessions", auth, role("admin"), (_req, res) => ok(res, db.sessions.map((session) => ({ ...session, subjects: Array.isArray(session.subjects) ? session.subjects : [] }))));
router.get("/admin/sections", auth, role("admin"), (req, res) => {
  const academicSessionId = String(req.query?.academicSessionId || "");
  const sections = db.sections
    .filter((section) => (!academicSessionId ? true : section.academicSession === academicSessionId))
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(sectionOut);
  return ok(res, sections);
});
router.get("/admin/notices", auth, role("admin"), (_req, res) => ok(res, db.notices.map(noticeOut)));

router.post("/admin/students", auth, role("admin"), (req, res) => {
  const b = req.body || {};
  if (!String(b.password || "").trim()) return bad(res, 400, "password is required.");
  const email = String(b.email || "").toLowerCase();
  const username = String(b.username || "").trim().toLowerCase();
  if (db.users.some((item) => item.email === email)) return bad(res, 409, "User with this email already exists.");
  if (username && db.users.some((item) => String(item.username || "") === username)) {
    return bad(res, 409, "User with this username already exists.");
  }
  const u = stamp({
    _id: uid("u"),
    name: b.name,
    username: username || undefined,
    email,
    isEmailVerified: false,
    emailVerifiedAt: null,
    password: String(b.password),
    role: "student",
    isActive: true,
  });
  const p = stamp({ _id: uid("sp"), user: u._id, rollNumber: b.rollNumber, department: b.department, year: Number(b.year || 1), semester: Number(b.semester || 1), section: b.section || "A", phone: b.phone || "", address: b.address || "", guardianName: b.guardianName || "" });
  db.users.push(u);
  db.studentProfiles.push(p);
  return ok(res, { user: safe(u), profile: p }, "Student created successfully.", 201);
});
router.post("/admin/teachers", auth, role("admin"), (req, res) => {
  const b = req.body || {};
  if (!String(b.password || "").trim()) return bad(res, 400, "password is required.");
  const email = String(b.email || "").toLowerCase();
  const username = String(b.username || "").trim().toLowerCase();
  if (db.users.some((item) => item.email === email)) return bad(res, 409, "User with this email already exists.");
  if (username && db.users.some((item) => String(item.username || "") === username)) {
    return bad(res, 409, "User with this username already exists.");
  }
  const u = stamp({
    _id: uid("u"),
    name: b.name,
    username: username || undefined,
    email,
    isEmailVerified: false,
    emailVerifiedAt: null,
    password: String(b.password),
    role: "teacher",
    isActive: true,
  });
  const p = stamp({ _id: uid("tp"), user: u._id, employeeId: b.employeeId, department: b.department, designation: b.designation, phone: b.phone || "", qualification: b.qualification || "" });
  db.users.push(u);
  db.teacherProfiles.push(p);
  return ok(res, { user: safe(u), profile: p }, "Teacher created successfully.", 201);
});
router.post("/admin/courses", auth, role("admin"), (req, res) => {
  const b = req.body || {};
  const c = stamp({ _id: uid("c"), code: String(b.code || "").toUpperCase(), title: b.title, description: b.description || "", credits: Number(b.credits || 4), department: b.department, semester: Number(b.semester || 1), academicYear: b.academicYear, teacher: b.teacherId || null, schedule: b.schedule || [] });
  db.courses.push(c);
  return ok(res, c, "Course created successfully.", 201);
});
router.post("/admin/enrollments", auth, role("admin"), (req, res) => {
  const b = req.body || {};
  const studentSection = normalizeSection(sProfile(b.studentId)?.section) || "A";
  const section = normalizeSection(b.section) || studentSection;
  const existing = db.enrollments.find(
    (item) =>
      item.student === b.studentId
      && item.course === b.courseId
      && Number(item.semester) === Number(b.semester || 1)
      && String(item.academicYear) === String(b.academicYear),
  );

  if (existing) {
    existing.section = section;
    existing.status = "active";
    existing.updatedAt = now();
    return ok(res, existing, "Enrollment updated successfully.");
  }

  const e = stamp({ _id: uid("enr"), student: b.studentId, course: b.courseId, section, semester: Number(b.semester || 1), academicYear: b.academicYear, status: "active" });
  db.enrollments.push(e);
  return ok(res, e, "Enrollment created successfully.", 201);
});
router.post("/admin/academic-sessions", auth, role("admin"), (req, res) => {
  const b = req.body || {};
  const subjects = b.subjects === undefined ? [] : normalizeSubjects(b.subjects);
  if (subjects === null) {
    return bad(res, 400, "Each subject must include valid code, title and credits between 0 and 12.");
  }
  if (Boolean(b.isCurrent)) {
    db.sessions.forEach((session) => {
      session.isCurrent = false;
      session.updatedAt = now();
    });
  }
  const s = stamp({
    _id: uid("sess"),
    year: b.year,
    semester: b.semester,
    startDate: b.startDate,
    endDate: b.endDate,
    isCurrent: Boolean(b.isCurrent),
    subjects,
  });
  db.sessions.push(s);
  return ok(res, s, "Academic session created successfully.", 201);
});
router.post("/admin/academic-sessions/:id/subjects", auth, role("admin"), (req, res) => {
  const session = sessionById(req.params.id);
  if (!session) return bad(res, 404, "Academic session not found.");
  const subjectRows = normalizeSubjects([req.body || {}]);
  if (!subjectRows) {
    return bad(res, 400, "Each subject must include valid code, title and credits between 0 and 12.");
  }
  const subject = subjectRows[0];
  const exists = (session.subjects || []).some((item) => normalizeSubjectCode(item.code) === subject.code);
  if (exists) {
    return bad(res, 409, `Subject code ${subject.code} already exists in this session.`);
  }
  session.subjects = [...(session.subjects || []), subject];
  session.updatedAt = now();
  return ok(res, session, "Subject added to academic session successfully.", 201);
});
router.post("/admin/sections", auth, role("admin"), (req, res) => {
  const b = req.body || {};
  const name = normalizeSection(b.name);
  const department = String(b.department || "").trim();
  const year = Number(b.year);
  const semester = Number(b.semester);
  const academicSessionId = String(b.academicSessionId || "").trim();
  const studentIds = uniqueIds(b.studentIds);

  if (!name || !department || !academicSessionId) {
    return bad(res, 400, "name, department and academicSessionId are required.");
  }
  if (!Number.isInteger(year) || year < 1 || year > 6) {
    return bad(res, 400, "year must be between 1 and 6.");
  }
  if (!Number.isInteger(semester) || semester < 1 || semester > 12) {
    return bad(res, 400, "semester must be between 1 and 12.");
  }
  const session = sessionById(academicSessionId);
  if (!session) return bad(res, 404, "Academic session not found.");
  const invalidStudent = studentIds.find((studentId) => !uById(studentId) || uById(studentId).role !== "student");
  if (invalidStudent) return bad(res, 400, "One or more studentIds are invalid.");

  const duplicate = db.sections.find(
    (section) =>
      section.name === name
      && section.department === department
      && Number(section.year) === year
      && Number(section.semester) === semester
      && section.academicSession === academicSessionId,
  );
  if (duplicate) {
    return bad(res, 409, "Section already exists for this academic session.");
  }

  const section = stamp({
    _id: uid("sec"),
    name,
    department,
    year,
    semester,
    academicSession: academicSessionId,
    students: studentIds,
    isActive: true,
  });
  db.sections.push(section);
  removeStudentsFromOtherSections(section._id, academicSessionId, studentIds);
  syncSectionStudentsAcrossData(section);
  return ok(res, sectionOut(section), "Section created successfully.", 201);
});
router.post("/admin/notices", auth, role("admin"), (req, res) => {
  const b = req.body || {};
  const n = stamp({ _id: uid("n"), title: b.title, message: b.message, attachmentUrl: b.attachmentUrl || "", audienceType: b.audienceType || "global", targetRoles: b.targetRoles || ["student", "teacher", "admin"], course: b.courseId || null, postedBy: req.user._id });
  db.notices.push(n);
  return ok(res, n, "Notice created successfully.", 201);
});
router.post("/admin/courses/:id/assign-teacher", auth, role("admin"), (req, res) => {
  const c = cById(req.params.id);
  if (!c) return bad(res, 404, "Course not found.");
  c.teacher = req.body?.teacherId || null;
  c.updatedAt = now();
  return ok(res, withTeacher(c), "Teacher assigned successfully.");
});

const updateById = (arr, idVal, patch) => {
  const i = arr.findIndex((x) => x._id === idVal);
  if (i === -1) return null;
  arr[i] = { ...arr[i], ...patch, updatedAt: now() };
  return arr[i];
};
const delById = (arr, idVal) => {
  const i = arr.findIndex((x) => x._id === idVal);
  if (i === -1) return false;
  arr.splice(i, 1);
  return true;
};

const toPositiveIntOrFallback = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

const updateStudentRecord = (idVal, payload = {}) => {
  const user = db.users.find((item) => item._id === idVal && item.role === "student");
  if (!user) return null;
  const previousEmail = String(user.email || "").toLowerCase();

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.email !== undefined) {
    user.email = String(payload.email).toLowerCase();
    user.isEmailVerified = false;
    user.emailVerifiedAt = null;
    delete db.forgotPasswordOtps[previousEmail];
  }
  if (payload.username !== undefined) user.username = String(payload.username || "").trim().toLowerCase() || undefined;
  if (typeof payload.password === "string" && payload.password.trim()) user.password = payload.password;
  if (typeof payload.isActive === "boolean") user.isActive = payload.isActive;
  user.updatedAt = now();

  let profile = sProfile(idVal);
  if (!profile) {
    profile = stamp({
      _id: uid("sp"),
      user: idVal,
      rollNumber: "",
      department: "",
      year: 1,
      semester: 1,
      section: "A",
      phone: "",
      address: "",
      guardianName: "",
    });
    db.studentProfiles.push(profile);
  }

  if (payload.rollNumber !== undefined) profile.rollNumber = payload.rollNumber;
  if (payload.department !== undefined) profile.department = payload.department;
  if (payload.year !== undefined) profile.year = toPositiveIntOrFallback(payload.year, profile.year || 1);
  if (payload.semester !== undefined) {
    profile.semester = toPositiveIntOrFallback(payload.semester, profile.semester || 1);
  }
  if (payload.section !== undefined) profile.section = payload.section;
  if (payload.phone !== undefined) profile.phone = payload.phone;
  if (payload.address !== undefined) profile.address = payload.address;
  if (payload.guardianName !== undefined) profile.guardianName = payload.guardianName;
  profile.updatedAt = now();

  return { user: safe(user), profile };
};

const updateTeacherRecord = (idVal, payload = {}) => {
  const user = db.users.find((item) => item._id === idVal && item.role === "teacher");
  if (!user) return null;
  const previousEmail = String(user.email || "").toLowerCase();

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.email !== undefined) {
    user.email = String(payload.email).toLowerCase();
    user.isEmailVerified = false;
    user.emailVerifiedAt = null;
    delete db.forgotPasswordOtps[previousEmail];
  }
  if (payload.username !== undefined) user.username = String(payload.username || "").trim().toLowerCase() || undefined;
  if (typeof payload.password === "string" && payload.password.trim()) user.password = payload.password;
  if (typeof payload.isActive === "boolean") user.isActive = payload.isActive;
  user.updatedAt = now();

  let profile = tProfile(idVal);
  if (!profile) {
    profile = stamp({
      _id: uid("tp"),
      user: idVal,
      employeeId: "",
      department: "",
      designation: "",
      phone: "",
      qualification: "",
    });
    db.teacherProfiles.push(profile);
  }

  if (payload.employeeId !== undefined) profile.employeeId = payload.employeeId;
  if (payload.department !== undefined) profile.department = payload.department;
  if (payload.designation !== undefined) profile.designation = payload.designation;
  if (payload.phone !== undefined) profile.phone = payload.phone;
  if (payload.qualification !== undefined) profile.qualification = payload.qualification;
  profile.updatedAt = now();

  return { user: safe(user), profile };
};

const updateCourseRecord = (idVal, payload = {}) => {
  const course = cById(idVal);
  if (!course) return null;

  if (payload.code !== undefined) course.code = String(payload.code).toUpperCase();
  if (payload.title !== undefined) course.title = payload.title;
  if (payload.description !== undefined) course.description = payload.description;
  if (payload.credits !== undefined) {
    course.credits = toPositiveIntOrFallback(payload.credits, course.credits || 1);
  }
  if (payload.department !== undefined) course.department = payload.department;
  if (payload.semester !== undefined) {
    course.semester = toPositiveIntOrFallback(payload.semester, course.semester || 1);
  }
  if (payload.academicYear !== undefined) course.academicYear = payload.academicYear;
  if (payload.schedule !== undefined) course.schedule = Array.isArray(payload.schedule) ? payload.schedule : [];
  if (payload.teacherId !== undefined) course.teacher = payload.teacherId || null;
  if (payload.teacher !== undefined) course.teacher = payload.teacher || null;
  delete course.teacherId;
  course.updatedAt = now();

  return withTeacher(course);
};

const deleteStudentRecord = (idVal) => {
  const student = db.users.find((item) => item._id === idVal && item.role === "student");
  if (!student) return false;
  const emailKey = String(student.email || "").toLowerCase();

  db.users = db.users.filter((item) => item._id !== idVal);
  db.studentProfiles = db.studentProfiles.filter((item) => item.user !== idVal);
  db.profileEditRequests = db.profileEditRequests.filter((item) => item.student !== idVal);
  db.enrollments = db.enrollments.filter((item) => item.student !== idVal);
  db.attendance = db.attendance.filter((item) => item.student !== idVal);
  db.marks = db.marks.filter((item) => item.student !== idVal);
  db.submissions = db.submissions.filter((item) => item.student !== idVal);
  db.fees = db.fees.filter((item) => item.student !== idVal);
  delete db.passwordChangeOtps[idVal];
  delete db.emailVerificationOtps[idVal];
  delete db.forgotPasswordOtps[emailKey];
  db.sections.forEach((section) => {
    const nextStudents = (section.students || []).filter((studentId) => studentId !== idVal);
    if (nextStudents.length !== (section.students || []).length) {
      section.students = nextStudents;
      section.updatedAt = now();
    }
  });

  return true;
};

const deleteTeacherRecord = (idVal) => {
  const teacher = db.users.find((item) => item._id === idVal && item.role === "teacher");
  if (!teacher) return false;
  const emailKey = String(teacher.email || "").toLowerCase();

  db.users = db.users.filter((item) => item._id !== idVal);
  db.teacherProfiles = db.teacherProfiles.filter((item) => item.user !== idVal);
  db.profileEditRequests = db.profileEditRequests.filter((item) => item.student !== idVal);
  db.teacherLeaves = db.teacherLeaves.filter((item) => item.teacher !== idVal);
  delete db.passwordChangeOtps[idVal];
  delete db.emailVerificationOtps[idVal];
  delete db.forgotPasswordOtps[emailKey];
  db.courses.forEach((course) => {
    if (course.teacher === idVal) {
      course.teacher = null;
      course.updatedAt = now();
    }
  });

  return true;
};

const deleteCourseRecord = (idVal) => {
  const exists = db.courses.some((item) => item._id === idVal);
  if (!exists) return false;

  const assignmentIds = db.assignments.filter((item) => item.course === idVal).map((item) => item._id);
  db.courses = db.courses.filter((item) => item._id !== idVal);
  db.enrollments = db.enrollments.filter((item) => item.course !== idVal);
  db.attendance = db.attendance.filter((item) => item.course !== idVal);
  db.marks = db.marks.filter((item) => item.course !== idVal);
  db.notices = db.notices.filter((item) => item.course !== idVal);
  db.assignments = db.assignments.filter((item) => item.course !== idVal);
  db.submissions = db.submissions.filter((item) => !assignmentIds.includes(item.assignment));

  return true;
};

router.put("/admin/students/:id", auth, role("admin"), (req, res) => {
  const updated = updateStudentRecord(req.params.id, req.body || {});
  if (!updated) return bad(res, 404, "Student not found.");
  return ok(res, updated, "Student updated successfully.");
});
router.put("/admin/teachers/:id", auth, role("admin"), (req, res) => {
  const updated = updateTeacherRecord(req.params.id, req.body || {});
  if (!updated) return bad(res, 404, "Teacher not found.");
  return ok(res, updated, "Teacher updated successfully.");
});
router.put("/admin/courses/:id", auth, role("admin"), (req, res) => {
  const updated = updateCourseRecord(req.params.id, req.body || {});
  if (!updated) return bad(res, 404, "Course not found.");
  return ok(res, updated, "Course updated successfully.");
});
router.put("/admin/academic-sessions/:id", auth, role("admin"), (req, res) => {
  const session = sessionById(req.params.id);
  if (!session) return bad(res, 404, "Academic session not found.");

  const b = req.body || {};
  if (b.subjects !== undefined) {
    const subjects = normalizeSubjects(b.subjects);
    if (subjects === null) {
      return bad(res, 400, "Each subject must include valid code, title and credits between 0 and 12.");
    }
    session.subjects = subjects;
  }
  if (b.isCurrent === true) {
    db.sessions.forEach((item) => {
      item.isCurrent = false;
      item.updatedAt = now();
    });
    session.isCurrent = true;
  } else if (b.isCurrent === false) {
    session.isCurrent = false;
  }
  if (b.year !== undefined) session.year = b.year;
  if (b.semester !== undefined) session.semester = b.semester;
  if (b.startDate !== undefined) session.startDate = b.startDate;
  if (b.endDate !== undefined) session.endDate = b.endDate;
  if (!Array.isArray(session.subjects)) session.subjects = [];
  session.updatedAt = now();
  return ok(res, session, "Academic session updated successfully.");
});
router.put("/admin/sections/:id", auth, role("admin"), (req, res) => {
  const section = db.sections.find((item) => item._id === req.params.id);
  if (!section) return bad(res, 404, "Section not found.");

  const b = req.body || {};
  const name = b.name !== undefined ? normalizeSection(b.name) : section.name;
  const department = b.department !== undefined ? String(b.department || "").trim() : section.department;
  const year = b.year !== undefined ? Number(b.year) : Number(section.year);
  const semester = b.semester !== undefined ? Number(b.semester) : Number(section.semester);
  const academicSessionId = b.academicSessionId !== undefined
    ? String(b.academicSessionId || "").trim()
    : section.academicSession;
  const studentIds = b.studentIds !== undefined ? uniqueIds(b.studentIds) : uniqueIds(section.students || []);

  if (!name || !department || !academicSessionId) {
    return bad(res, 400, "name, department and academicSessionId are required.");
  }
  if (!Number.isInteger(year) || year < 1 || year > 6) {
    return bad(res, 400, "year must be between 1 and 6.");
  }
  if (!Number.isInteger(semester) || semester < 1 || semester > 12) {
    return bad(res, 400, "semester must be between 1 and 12.");
  }
  if (!sessionById(academicSessionId)) {
    return bad(res, 404, "Academic session not found.");
  }
  const invalidStudent = studentIds.find((studentId) => !uById(studentId) || uById(studentId).role !== "student");
  if (invalidStudent) return bad(res, 400, "One or more studentIds are invalid.");

  const duplicate = db.sections.find(
    (item) =>
      item._id !== section._id
      && item.name === name
      && item.department === department
      && Number(item.year) === year
      && Number(item.semester) === semester
      && item.academicSession === academicSessionId,
  );
  if (duplicate) {
    return bad(res, 409, "Another section with same details already exists.");
  }

  section.name = name;
  section.department = department;
  section.year = year;
  section.semester = semester;
  section.academicSession = academicSessionId;
  section.students = studentIds;
  section.updatedAt = now();

  removeStudentsFromOtherSections(section._id, academicSessionId, studentIds);
  syncSectionStudentsAcrossData(section);
  return ok(res, sectionOut(section), "Section updated successfully.");
});
router.patch("/admin/sections/:id/students", auth, role("admin"), (req, res) => {
  const section = db.sections.find((item) => item._id === req.params.id);
  if (!section) return bad(res, 404, "Section not found.");
  if (!Array.isArray(req.body?.studentIds)) {
    return bad(res, 400, "studentIds must be an array.");
  }

  const studentIds = uniqueIds(req.body.studentIds);
  const invalidStudent = studentIds.find((studentId) => !uById(studentId) || uById(studentId).role !== "student");
  if (invalidStudent) return bad(res, 400, "One or more studentIds are invalid.");

  section.students = studentIds;
  section.updatedAt = now();
  removeStudentsFromOtherSections(section._id, section.academicSession, studentIds);
  syncSectionStudentsAcrossData(section);
  return ok(res, sectionOut(section), "Students assigned to section successfully.");
});

router.delete("/admin/students/:id", auth, role("admin"), (req, res) => (deleteStudentRecord(req.params.id) ? ok(res, undefined, "Student deleted successfully.") : bad(res, 404, "Student not found.")));
router.delete("/admin/teachers/:id", auth, role("admin"), (req, res) => (deleteTeacherRecord(req.params.id) ? ok(res, undefined, "Teacher deleted successfully.") : bad(res, 404, "Teacher not found.")));
router.delete("/admin/courses/:id", auth, role("admin"), (req, res) => (deleteCourseRecord(req.params.id) ? ok(res, undefined, "Course deleted successfully.") : bad(res, 404, "Course not found.")));
router.delete("/admin/enrollments/:id", auth, role("admin"), (req, res) => (delById(db.enrollments, req.params.id) ? ok(res, undefined, "Enrollment deleted successfully.") : bad(res, 404, "Enrollment not found.")));
router.delete("/admin/academic-sessions/:id/subjects/:subjectCode", auth, role("admin"), (req, res) => {
  const session = sessionById(req.params.id);
  if (!session) return bad(res, 404, "Academic session not found.");
  const subjectCode = normalizeSubjectCode(decodeURIComponent(req.params.subjectCode || ""));
  const nextSubjects = (session.subjects || []).filter(
    (item) => normalizeSubjectCode(item.code) !== subjectCode,
  );
  if (nextSubjects.length === (session.subjects || []).length) {
    return bad(res, 404, "Subject not found in this academic session.");
  }
  session.subjects = nextSubjects;
  session.updatedAt = now();
  return ok(res, session, "Subject removed from academic session successfully.");
});
router.delete("/admin/sections/:id", auth, role("admin"), (req, res) => {
  const index = db.sections.findIndex((item) => item._id === req.params.id);
  if (index === -1) return bad(res, 404, "Section not found.");
  const section = db.sections[index];
  db.sections.splice(index, 1);

  const students = new Set(section.students || []);
  const session = sessionById(section.academicSession);
  const academicYear = String(session?.year || "");
  db.studentProfiles.forEach((profileRow) => {
    if (
      students.has(profileRow.user)
      && normalizeSection(profileRow.section) === normalizeSection(section.name)
      && Number(profileRow.semester) === Number(section.semester)
    ) {
      profileRow.section = "A";
      profileRow.updatedAt = now();
    }
  });
  db.enrollments.forEach((enrollment) => {
    if (
      students.has(enrollment.student)
      && normalizeSection(enrollment.section) === normalizeSection(section.name)
      && Number(enrollment.semester) === Number(section.semester)
      && (!academicYear || String(enrollment.academicYear) === academicYear)
    ) {
      enrollment.section = "A";
      enrollment.updatedAt = now();
    }
  });
  return ok(res, undefined, "Section deleted successfully.");
});
router.delete("/admin/academic-sessions/:id", auth, role("admin"), (req, res) => {
  const exists = delById(db.sessions, req.params.id);
  if (!exists) return bad(res, 404, "Academic session not found.");
  db.sections = db.sections.filter((section) => section.academicSession !== req.params.id);
  return ok(res, undefined, "Academic session deleted successfully.");
});
router.delete("/admin/notices/:id", auth, role("admin"), (req, res) => (delById(db.notices, req.params.id) ? ok(res, undefined, "Notice deleted successfully.") : bad(res, 404, "Notice not found.")));

module.exports = router;
