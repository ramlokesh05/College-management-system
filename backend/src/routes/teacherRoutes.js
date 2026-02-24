const express = require("express");
const {
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
} = require("../controllers/teacherController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  attendanceValidation,
  markValidation,
  assignmentValidation,
  announcementValidation,
  leaveRequestValidation,
} = require("../validators/teacherValidators");

const router = express.Router();

router.use(protect, authorizeRoles("teacher"));

router.get("/dashboard", getDashboard);
router.get("/profile", getProfile);
router.get("/profile-edit-requests", getProfileEditRequests);
router.post("/profile-edit-requests", createProfileEditRequest);
router.get("/courses", getCourses);
router.get("/courses/:courseId/students", getCourseStudents);
router.get("/attendance", getAttendanceForDate);
router.get("/attendance/logs", getAttendanceLogs);
router.post("/attendance", attendanceValidation, validateRequest, markAttendance);
router.post("/marks", markValidation, validateRequest, uploadMarks);
router.post("/assignments", assignmentValidation, validateRequest, uploadAssignment);
router.get("/assignments", getAssignments);
router.post("/announcements", announcementValidation, validateRequest, postAnnouncement);
router.get("/leaves", getLeaveRequests);
router.post("/leaves", leaveRequestValidation, validateRequest, applyLeaveRequest);
router.get("/earnings", getEarnings);

module.exports = router;
