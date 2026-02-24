const { body } = require("express-validator");

const attendanceValidation = [
  body("courseId").notEmpty().withMessage("courseId is required."),
  body("section")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("section must be between 1 and 20 characters."),
  body("date").notEmpty().withMessage("date is required.").isISO8601().withMessage("date must be valid."),
  body("records")
    .isArray({ min: 1 })
    .withMessage("records must be a non-empty array."),
  body("records.*.studentId").notEmpty().withMessage("studentId is required."),
  body("records.*.status")
    .isIn(["present", "absent", "late"])
    .withMessage("status must be present, absent, or late."),
];

const markValidation = [
  body("courseId").notEmpty().withMessage("courseId is required."),
  body("section")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("section must be between 1 and 20 characters."),
  body("studentId").notEmpty().withMessage("studentId is required."),
  body("examType").trim().notEmpty().withMessage("examType is required."),
  body("maxMarks").isFloat({ gt: 0 }).withMessage("maxMarks must be greater than 0."),
  body("obtainedMarks")
    .isFloat({ min: 0 })
    .withMessage("obtainedMarks must be 0 or above."),
  body("semester").isInt({ min: 1, max: 12 }).withMessage("semester must be between 1 and 12."),
  body("academicYear").trim().notEmpty().withMessage("academicYear is required."),
];

const assignmentValidation = [
  body("courseId").notEmpty().withMessage("courseId is required."),
  body("section")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("section must be between 1 and 20 characters."),
  body("title").trim().notEmpty().withMessage("title is required."),
  body("description").trim().notEmpty().withMessage("description is required."),
  body("dueDate").isISO8601().withMessage("dueDate must be a valid date."),
];

const announcementValidation = [
  body("title").trim().notEmpty().withMessage("title is required."),
  body("message").trim().notEmpty().withMessage("message is required."),
  body("audienceType")
    .optional()
    .isIn(["global", "role", "course"])
    .withMessage("audienceType must be global, role, or course."),
  body("targetRoles")
    .optional()
    .isArray()
    .withMessage("targetRoles must be an array when provided."),
];

const submissionValidation = [
  body("submissionText")
    .optional()
    .isString()
    .withMessage("submissionText must be a string."),
  body("fileUrl").optional().isString().withMessage("fileUrl must be a string."),
];

const leaveRequestValidation = [
  body("leaveDate")
    .notEmpty()
    .withMessage("leaveDate is required.")
    .isISO8601()
    .withMessage("leaveDate must be a valid date."),
  body("reason")
    .optional()
    .isString()
    .withMessage("reason must be a string.")
    .isLength({ max: 500 })
    .withMessage("reason must be at most 500 characters."),
];

module.exports = {
  attendanceValidation,
  markValidation,
  assignmentValidation,
  announcementValidation,
  submissionValidation,
  leaveRequestValidation,
};
