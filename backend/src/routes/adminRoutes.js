const express = require("express");
const {
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
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  studentValidation,
  teacherValidation,
  courseValidation,
  enrollmentValidation,
  sectionValidation,
  sectionStudentsValidation,
  noticeValidation,
  academicSessionValidation,
  subjectValidation,
  leaveReviewValidation,
  passwordChangeValidation,
  feeValidation,
} = require("../validators/adminValidators");

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

router.get("/dashboard/analytics", getDashboardAnalytics);
router.patch("/profile/avatar", updateOwnAvatar);

router.get("/students", listStudents);
router.get("/profile-edit-requests", listProfileEditRequests);
router.patch("/profile-edit-requests/:id/review", reviewProfileEditRequest);
router.post("/students", studentValidation, validateRequest, createStudent);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);

router.get("/teachers", listTeachers);
router.get("/teacher-leaves", listTeacherLeaves);
router.patch("/teacher-leaves/:id/review", leaveReviewValidation, validateRequest, reviewTeacherLeave);
router.post("/teachers", teacherValidation, validateRequest, createTeacher);
router.put("/teachers/:id", updateTeacher);
router.delete("/teachers/:id", deleteTeacher);

router.get("/courses", listCourses);
router.post("/courses", courseValidation, validateRequest, createCourse);
router.put("/courses/:id", updateCourse);
router.delete("/courses/:id", deleteCourse);
router.post("/courses/:id/assign-teacher", assignTeacher);

router.get("/enrollments", listEnrollments);
router.post("/enrollments", enrollmentValidation, validateRequest, createEnrollment);
router.delete("/enrollments/:id", deleteEnrollment);

router.get("/sections", listSections);
router.post("/sections", sectionValidation, validateRequest, createSection);
router.put("/sections/:id", sectionValidation, validateRequest, updateSection);
router.patch("/sections/:id/students", sectionStudentsValidation, validateRequest, assignStudentsToSection);
router.delete("/sections/:id", deleteSection);

router.get("/academic-sessions", listAcademicSessions);
router.post("/academic-sessions", academicSessionValidation, validateRequest, createAcademicSession);
router.put("/academic-sessions/:id", updateAcademicSession);
router.post("/academic-sessions/:id/subjects", subjectValidation, validateRequest, addAcademicSessionSubject);
router.delete("/academic-sessions/:id/subjects/:subjectCode", removeAcademicSessionSubject);
router.delete("/academic-sessions/:id", deleteAcademicSession);

router.get("/notices", listNotices);
router.post("/notices", noticeValidation, validateRequest, createNotice);
router.delete("/notices/:id", deleteNotice);

router.post("/change-password", passwordChangeValidation, validateRequest, changePassword);

router.get("/fees", listFees);
router.post("/fees", feeValidation, validateRequest, createFee);
router.get("/fees/:id", getFeeDetails);
router.put("/fees/:id", updateFee);
router.delete("/fees/:id", deleteFee);

module.exports = router;
