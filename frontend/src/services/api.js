import axios from "axios";

const resolveApiBaseURL = () => {
  const envBaseURL = import.meta.env.VITE_API_URL?.trim();
  if (envBaseURL) {
    return envBaseURL;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol || "http:";
    const hostname = window.location.hostname || "localhost";
    return `${protocol}//${hostname}:5000/api`;
  }

  return "http://localhost:5000/api";
};

const api = axios.create({
  baseURL: resolveApiBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("cms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("cms_token");
      localStorage.removeItem("cms_user");
      localStorage.removeItem("cms_profile");
    }
    return Promise.reject(error);
  },
);

export default api;
