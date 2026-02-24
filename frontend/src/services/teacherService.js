import api from "./api";

export const teacherService = {
  getDashboard: async () => (await api.get("/teacher/dashboard")).data.data,
  getProfile: async () => (await api.get("/teacher/profile")).data.data,
  getProfileEditRequests: async () => (await api.get("/teacher/profile-edit-requests")).data.data,
  createProfileEditRequest: async (payload) =>
    (await api.post("/teacher/profile-edit-requests", payload)).data.data,
  getCourses: async () => (await api.get("/teacher/courses")).data.data,
  getCourseStudents: async (courseId, section = "") =>
    (await api.get(`/teacher/courses/${courseId}/students`, {
      params: section ? { section } : {},
    })).data.data,
  getAttendanceForDate: async (courseId, date, section = "") =>
    (await api.get("/teacher/attendance", {
      params: {
        courseId,
        date,
        ...(section ? { section } : {}),
      },
    })).data.data,
  getAttendanceLogs: async (courseId, limit = 90, section = "") =>
    (await api.get("/teacher/attendance/logs", {
      params: {
        courseId,
        limit,
        ...(section ? { section } : {}),
      },
    })).data.data,
  markAttendance: async (payload) => (await api.post("/teacher/attendance", payload)).data.data,
  uploadMarks: async (payload) => (await api.post("/teacher/marks", payload)).data.data,
  uploadAssignment: async (payload) =>
    (await api.post("/teacher/assignments", payload)).data.data,
  getAssignments: async (courseId = "", section = "") =>
    (await api.get("/teacher/assignments", {
      params: {
        ...(courseId ? { courseId } : {}),
        ...(section ? { section } : {}),
      },
    })).data.data,
  postAnnouncement: async (payload) =>
    (await api.post("/teacher/announcements", payload)).data.data,
  applyLeave: async (payload) => (await api.post("/teacher/leaves", payload)).data.data,
  getLeaveRequests: async (status = "") =>
    (await api.get("/teacher/leaves", {
      params: status ? { status } : {},
    })).data.data,
  getEarnings: async (month = "", year = "") =>
    (await api.get("/teacher/earnings", {
      params: {
        ...(month ? { month } : {}),
        ...(year ? { year } : {}),
      },
    })).data.data,
};
