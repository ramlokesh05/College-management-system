import api from "./api";

export const adminService = {
  getDashboard: async () => (await api.get("/admin/dashboard/analytics")).data.data,
  updateMyAvatar: async (payload) => (await api.patch("/admin/profile/avatar", payload)).data.data,

  listStudents: async () => (await api.get("/admin/students")).data.data,
  listProfileEditRequests: async (status = "") =>
    (await api.get("/admin/profile-edit-requests", { params: status ? { status } : {} })).data.data,
  reviewProfileEditRequest: async (id, payload) =>
    (await api.patch(`/admin/profile-edit-requests/${id}/review`, payload)).data.data,
  createStudent: async (payload) => (await api.post("/admin/students", payload)).data.data,
  updateStudent: async (id, payload) => (await api.put(`/admin/students/${id}`, payload)).data.data,
  deleteStudent: async (id) => (await api.delete(`/admin/students/${id}`)).data,

  listTeachers: async () => (await api.get("/admin/teachers")).data.data,
  listTeacherLeaveRequests: async (status = "", teacherId = "") =>
    (await api.get("/admin/teacher-leaves", {
      params: {
        ...(status ? { status } : {}),
        ...(teacherId ? { teacherId } : {}),
      },
    })).data.data,
  reviewTeacherLeaveRequest: async (id, payload) =>
    (await api.patch(`/admin/teacher-leaves/${id}/review`, payload)).data.data,
  createTeacher: async (payload) => (await api.post("/admin/teachers", payload)).data.data,
  updateTeacher: async (id, payload) => (await api.put(`/admin/teachers/${id}`, payload)).data.data,
  deleteTeacher: async (id) => (await api.delete(`/admin/teachers/${id}`)).data,

  listCourses: async () => (await api.get("/admin/courses")).data.data,
  createCourse: async (payload) => (await api.post("/admin/courses", payload)).data.data,
  updateCourse: async (id, payload) => (await api.put(`/admin/courses/${id}`, payload)).data.data,
  deleteCourse: async (id) => (await api.delete(`/admin/courses/${id}`)).data,
  assignTeacher: async (courseId, teacherId) =>
    (await api.post(`/admin/courses/${courseId}/assign-teacher`, { teacherId })).data.data,

  listEnrollments: async () => (await api.get("/admin/enrollments")).data.data,
  createEnrollment: async (payload) => (await api.post("/admin/enrollments", payload)).data.data,
  deleteEnrollment: async (id) => (await api.delete(`/admin/enrollments/${id}`)).data,

  listSections: async (academicSessionId = "") =>
    (await api.get("/admin/sections", {
      params: academicSessionId ? { academicSessionId } : {},
    })).data.data,
  createSection: async (payload) => (await api.post("/admin/sections", payload)).data.data,
  updateSection: async (id, payload) => (await api.put(`/admin/sections/${id}`, payload)).data.data,
  assignSectionStudents: async (id, studentIds) =>
    (await api.patch(`/admin/sections/${id}/students`, { studentIds })).data.data,
  deleteSection: async (id) => (await api.delete(`/admin/sections/${id}`)).data,

  listAcademicSessions: async () => (await api.get("/admin/academic-sessions")).data.data,
  createAcademicSession: async (payload) =>
    (await api.post("/admin/academic-sessions", payload)).data.data,
  updateAcademicSession: async (id, payload) =>
    (await api.put(`/admin/academic-sessions/${id}`, payload)).data.data,
  addAcademicSessionSubject: async (sessionId, payload) =>
    (await api.post(`/admin/academic-sessions/${sessionId}/subjects`, payload)).data.data,
  removeAcademicSessionSubject: async (sessionId, subjectCode) =>
    (await api.delete(`/admin/academic-sessions/${sessionId}/subjects/${encodeURIComponent(subjectCode)}`)).data.data,
  deleteAcademicSession: async (id) => (await api.delete(`/admin/academic-sessions/${id}`)).data,

  listNotices: async () => (await api.get("/admin/notices")).data.data,
  createNotice: async (payload) => (await api.post("/admin/notices", payload)).data.data,
  deleteNotice: async (id) => (await api.delete(`/admin/notices/${id}`)).data,
};
