const express = require("express");
const {
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
} = require("../controllers/studentController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { submissionValidation } = require("../validators/teacherValidators");

const router = express.Router();

router.use(protect, authorizeRoles("student"));

router.get("/dashboard", getDashboard);
router.get("/profile", getProfile);
router.get("/profile-edit-requests", getProfileEditRequests);
router.post("/profile-edit-requests", createProfileEditRequest);
router.get("/courses", getCourses);
router.get("/timetable", getTimetable);
router.get("/attendance", getAttendance);
router.get("/attendance/logs", getAttendanceLogs);
router.get("/marks", getMarks);
router.get("/exam-schedule", getExamSchedule);
router.get("/notices", getNotices);
router.get("/assignments", getAssignments);
router.post("/assignments/:assignmentId/submit", submissionValidation, validateRequest, submitAssignment);
router.get("/fees", getFees);

module.exports = router;
