import api from "./api";

export const authService = {
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data.data;
  },
  requestForgotPasswordOtp: async (payload) => {
    const response = await api.post("/auth/forgot-password/request-otp", payload);
    return response.data;
  },
  resetForgotPassword: async (payload) => {
    const response = await api.post("/auth/forgot-password/reset", payload);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data.data;
  },
  requestPasswordChangeCode: async (payload) => {
    const response = await api.post("/auth/change-password/request-code", payload);
    return response.data;
  },
  requestEmailOtp: async (payload) => {
    const response = await api.post("/auth/email/request-otp", payload);
    return response.data;
  },
  verifyEmailOtp: async (payload) => {
    const response = await api.post("/auth/email/verify-otp", payload);
    return response.data;
  },
  changePassword: async (payload) => {
    const response = await api.patch("/auth/change-password", payload);
    return response.data;
  },
};
