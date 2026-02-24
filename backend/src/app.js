const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const mockRoutes = require("./mock/mockRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((item) => item.trim());
const isDevelopment = process.env.NODE_ENV !== "production";

const isLocalOrPrivateHost = (hostname) =>
  /^(localhost|127\.0\.0\.1|::1)$/.test(hostname)
  || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
  || /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (isDevelopment) {
        try {
          const { hostname } = new URL(origin);
          if (isLocalOrPrivateHost(hostname)) {
            return callback(null, true);
          }
        } catch (_error) {
          // Fall through to the explicit CORS error below.
        }
      }
      return callback(new Error("CORS blocked by server policy."));
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy.",
    mode: process.env.MOCK_MODE === "true" ? "mock" : "database",
    timestamp: new Date().toISOString(),
  });
});

if (process.env.MOCK_MODE === "true") {
  app.use("/api", mockRoutes);
} else {
  app.use("/api/auth", authRoutes);
  app.use("/api/student", studentRoutes);
  app.use("/api/teacher", teacherRoutes);
  app.use("/api/admin", adminRoutes);
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
