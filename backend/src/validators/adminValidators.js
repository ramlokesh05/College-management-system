const { body } = require("express-validator");

const userCommonValidation = [
  body("name").trim().notEmpty().withMessage("name is required."),
  body("username")
    .optional()
    .trim()
    .matches(/^[a-z0-9._-]{3,40}$/)
    .withMessage("username must be 3-40 chars and use letters, numbers, dot, underscore, or hyphen."),
  body("email").trim().isEmail().withMessage("valid email is required."),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("password must be at least 6 characters."),
];

const studentValidation = [
  ...userCommonValidation,
  body("rollNumber").trim().notEmpty().withMessage("rollNumber is required."),
  body("department").trim().notEmpty().withMessage("department is required."),
  body("year").isInt({ min: 1, max: 6 }).withMessage("year must be between 1 and 6."),
  body("semester")
    .isInt({ min: 1, max: 12 })
    .withMessage("semester must be between 1 and 12."),
];

const teacherValidation = [
  ...userCommonValidation,
  body("employeeId").trim().notEmpty().withMessage("employeeId is required."),
  body("department").trim().notEmpty().withMessage("department is required."),
  body("designation").trim().notEmpty().withMessage("designation is required."),
];

const courseValidation = [
  body("code").trim().notEmpty().withMessage("code is required."),
  body("title").trim().notEmpty().withMessage("title is required."),
  body("credits").isInt({ min: 1 }).withMessage("credits must be greater than 0."),
  body("department").trim().notEmpty().withMessage("department is required."),
  body("semester")
    .isInt({ min: 1, max: 12 })
    .withMessage("semester must be between 1 and 12."),
  body("academicYear").trim().notEmpty().withMessage("academicYear is required."),
];

const enrollmentValidation = [
  body("studentId").notEmpty().withMessage("studentId is required."),
  body("courseId").notEmpty().withMessage("courseId is required."),
  body("section")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("section must be between 1 and 20 characters."),
  body("semester")
    .isInt({ min: 1, max: 12 })
    .withMessage("semester must be between 1 and 12."),
  body("academicYear").trim().notEmpty().withMessage("academicYear is required."),
];

const noticeValidation = [
  body("title").trim().notEmpty().withMessage("title is required."),
  body("message").trim().notEmpty().withMessage("message is required."),
  body("audienceType")
    .optional()
    .isIn(["global", "role", "course"])
    .withMessage("audienceType must be global, role, or course."),
  body("targetRoles")
    .optional()
    .isArray()
    .withMessage("targetRoles must be an array."),
];

const academicSessionValidation = [
  body("year").trim().notEmpty().withMessage("year is required."),
  body("semester").trim().notEmpty().withMessage("semester is required."),
  body("startDate").isISO8601().withMessage("startDate must be valid."),
  body("endDate").isISO8601().withMessage("endDate must be valid."),
  body("subjects")
    .optional()
    .isArray()
    .withMessage("subjects must be an array."),
];

const leaveReviewValidation = [
  body("decision")
    .notEmpty()
    .withMessage("decision is required.")
    .isIn(["approved", "rejected"])
    .withMessage("decision must be approved or rejected."),
  body("adminNote")
    .optional()
    .isString()
    .withMessage("adminNote must be a string.")
    .isLength({ max: 500 })
    .withMessage("adminNote must be at most 500 characters."),
];

const sectionValidation = [
  body("name").trim().notEmpty().withMessage("name is required."),
  body("department").trim().notEmpty().withMessage("department is required."),
  body("year").isInt({ min: 1, max: 6 }).withMessage("year must be between 1 and 6."),
  body("semester")
    .isInt({ min: 1, max: 12 })
    .withMessage("semester must be between 1 and 12."),
  body("academicSessionId").notEmpty().withMessage("academicSessionId is required."),
  body("studentIds")
    .optional()
    .isArray()
    .withMessage("studentIds must be an array."),
];

const sectionStudentsValidation = [
  body("studentIds")
    .isArray()
    .withMessage("studentIds must be an array."),
];

const subjectValidation = [
  body("code").trim().notEmpty().withMessage("code is required."),
  body("title").trim().notEmpty().withMessage("title is required."),
  body("credits")
    .optional()
    .isFloat({ min: 0, max: 12 })
    .withMessage("credits must be between 0 and 12."),
  body("department")
    .optional()
    .isString()
    .withMessage("department must be a string."),
];

const passwordChangeValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("currentPassword is required."),
  body("newPassword")
    .notEmpty()
    .withMessage("newPassword is required.")
    .isLength({ min: 5 })
    .withMessage("newPassword must be at least 5 characters."),
];

const feeValidation = [
  body("studentId").notEmpty().withMessage("studentId is required."),
  body("semester")
    .isInt({ min: 1, max: 12 })
    .withMessage("semester must be between 1 and 12."),
  body("academicYear")
    .trim()
    .notEmpty()
    .withMessage("academicYear is required."),
  body("totalFee")
    .isFloat({ min: 0 })
    .withMessage("totalFee must be a positive number."),
  body("paidAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("paidAmount must be a positive number."),
  body("dueDate")
    .isISO8601()
    .withMessage("dueDate must be a valid date."),
];

module.exports = {
  studentValidation,
  teacherValidation,
  courseValidation,
  enrollmentValidation,
  noticeValidation,
  academicSessionValidation,
  leaveReviewValidation,
  sectionValidation,
  sectionStudentsValidation,
  subjectValidation,
  passwordChangeValidation,
  feeValidation,
};
