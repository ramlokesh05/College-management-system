import { Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import AuthTransitionOverlay from "./components/common/AuthTransitionOverlay";
import ProtectedRoute from "./components/common/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/auth/LoginPage";
import AdminAcademicPage from "./pages/admin/AdminAcademicPage";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminEnrollmentsPage from "./pages/admin/AdminEnrollmentsPage";
import AdminTeacherLeavesPage from "./pages/admin/AdminTeacherLeavesPage";
import AdminNoticesPage from "./pages/admin/AdminNoticesPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AdminStudentsPage from "./pages/admin/AdminStudentsPage";
import AdminTeachersPage from "./pages/admin/AdminTeachersPage";
import NotFoundPage from "./pages/shared/NotFoundPage";
import StudentAssignmentsPage from "./pages/student/StudentAssignmentsPage";
import StudentAttendancePage from "./pages/student/StudentAttendancePage";
import StudentCoursesPage from "./pages/student/StudentCoursesPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentExamsPage from "./pages/student/StudentExamsPage";
import StudentFeesPage from "./pages/student/StudentFeesPage";
import StudentMarksPage from "./pages/student/StudentMarksPage";
import StudentNoticesPage from "./pages/student/StudentNoticesPage";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import StudentTimetablePage from "./pages/student/StudentTimetablePage";
import TeacherAnnouncementsPage from "./pages/teacher/TeacherAnnouncementsPage";
import TeacherAssignmentsPage from "./pages/teacher/TeacherAssignmentsPage";
import TeacherAttendancePage from "./pages/teacher/TeacherAttendancePage";
import TeacherCoursesPage from "./pages/teacher/TeacherCoursesPage";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherEarningsPage from "./pages/teacher/TeacherEarningsPage";
import TeacherLeavesPage from "./pages/teacher/TeacherLeavesPage";
import TeacherMarksPage from "./pages/teacher/TeacherMarksPage";
import TeacherProfilePage from "./pages/teacher/TeacherProfilePage";

const roleHomePath = {
  student: "/student",
  teacher: "/teacher",
  admin: "/admin",
};

const HomeRedirect = () => {
  const { token, user } = useAuth();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={roleHomePath[user.role] || "/login"} replace />;
};

const PublicLoginRoute = () => {
  const { token, user } = useAuth();
  if (token && user) {
    return <Navigate to={roleHomePath[user.role] || "/"} replace />;
  }
  return <LoginPage />;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicLoginRoute />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <DashboardLayout role="student" />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="courses" element={<StudentCoursesPage />} />
        <Route path="timetable" element={<StudentTimetablePage />} />
        <Route path="attendance" element={<StudentAttendancePage />} />
        <Route path="marks" element={<StudentMarksPage />} />
        <Route path="assignments" element={<StudentAssignmentsPage />} />
        <Route path="fees" element={<StudentFeesPage />} />
        <Route path="notices" element={<StudentNoticesPage />} />
        <Route path="exams" element={<StudentExamsPage />} />
      </Route>

      <Route
        path="/teacher"
        element={
          <ProtectedRoute allowedRoles={["teacher"]}>
            <DashboardLayout role="teacher" />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboard />} />
        <Route path="profile" element={<TeacherProfilePage />} />
        <Route path="courses" element={<TeacherCoursesPage />} />
        <Route path="attendance" element={<TeacherAttendancePage />} />
        <Route path="marks" element={<TeacherMarksPage />} />
        <Route path="assignments" element={<TeacherAssignmentsPage />} />
        <Route path="announcements" element={<TeacherAnnouncementsPage />} />
        <Route path="leaves" element={<TeacherLeavesPage />} />
        <Route path="earnings" element={<TeacherEarningsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfilePage />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="teachers" element={<AdminTeachersPage />} />
        <Route path="teacher-leaves" element={<AdminTeacherLeavesPage />} />
        <Route path="courses" element={<AdminCoursesPage />} />
        <Route path="enrollments" element={<AdminEnrollmentsPage />} />
        <Route path="academic" element={<AdminAcademicPage />} />
        <Route path="notices" element={<AdminNoticesPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <AuthTransitionOverlay />
  </BrowserRouter>
);

export default App;
