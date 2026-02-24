require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const TeacherProfile = require("../models/TeacherProfile");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Mark");
const Notice = require("../models/Notice");
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Fee = require("../models/Fee");
const AcademicSession = require("../models/AcademicSession");
const Section = require("../models/Section");
const ProfileEditRequest = require("../models/ProfileEditRequest");
const TeacherLeave = require("../models/TeacherLeave");

const clearDatabase = async () => {
  await Promise.all([
    AssignmentSubmission.deleteMany({}),
    Assignment.deleteMany({}),
    Attendance.deleteMany({}),
    Mark.deleteMany({}),
    Enrollment.deleteMany({}),
    Notice.deleteMany({}),
    Fee.deleteMany({}),
    TeacherLeave.deleteMany({}),
    ProfileEditRequest.deleteMany({}),
    Section.deleteMany({}),
    Course.deleteMany({}),
    StudentProfile.deleteMany({}),
    TeacherProfile.deleteMany({}),
    AcademicSession.deleteMany({}),
    User.deleteMany({}),
  ]);
};

const seed = async () => {
  await connectDB();
  await clearDatabase();

  const adminName = process.env.SEED_ADMIN_NAME || "System Admin";
  const adminUsername = process.env.SEED_ADMIN_USERNAME || "Rusheel007";
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin.1234@rusheelums.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "12345";

  const hashedPassword = await bcrypt.hash(String(adminPassword), 10);
  const now = new Date();
  const insertResult = await User.collection.insertOne({
    name: adminName,
    username: String(adminUsername).trim().toLowerCase(),
    email: String(adminEmail).trim().toLowerCase(),
    password: hashedPassword,
    role: "admin",
    avatar: "",
    isEmailVerified: false,
    emailVerifiedAt: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  const admin = await User.findById(insertResult.insertedId);

  // eslint-disable-next-line no-console
  console.log("Database initialized successfully.");
  // eslint-disable-next-line no-console
  console.log("Bootstrap Admin Credentials:");
  // eslint-disable-next-line no-console
  console.log(`Username -> ${admin.username}`);
  // eslint-disable-next-line no-console
  console.log(`Password -> ${adminPassword}`);
  // eslint-disable-next-line no-console
  console.log(`Email    -> ${admin.email}`);

  process.exit(0);
};

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", error.message);
  process.exit(1);
});
