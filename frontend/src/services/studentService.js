import api from "./api";

export const studentService = {
  getDashboard: async () => (await api.get("/student/dashboard")).data.data,
  getProfile: async () => (await api.get("/student/profile")).data.data,
  getProfileEditRequests: async () => (await api.get("/student/profile-edit-requests")).data.data,
  createProfileEditRequest: async (payload) =>
    (await api.post("/student/profile-edit-requests", payload)).data.data,
  getCourses: async () => (await api.get("/student/courses")).data.data,
  getTimetable: async () => (await api.get("/student/timetable")).data.data,
  getAttendance: async () => (await api.get("/student/attendance")).data.data,
  getAttendanceLogs: async (limit = 120) =>
    (await api.get("/student/attendance/logs", { params: { limit } })).data.data,
  getMarks: async () => (await api.get("/student/marks")).data.data,
  getNotices: async () => (await api.get("/student/notices")).data.data,
  getExamSchedule: async () => (await api.get("/student/exam-schedule")).data.data,
  getAssignments: async () => (await api.get("/student/assignments")).data.data,
  submitAssignment: async (assignmentId, payload) =>
    (await api.post(`/student/assignments/${assignmentId}/submit`, payload)).data.data,
  getFees: async () => (await api.get("/student/fees")).data.data,
};
