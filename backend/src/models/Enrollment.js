const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    section: {
      type: String,
      default: "A",
      trim: true,
      uppercase: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "dropped", "completed"],
      default: "active",
    },
  },
  { timestamps: true },
);

enrollmentSchema.index(
  { student: 1, course: 1, semester: 1, academicYear: 1 },
  { unique: true },
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);
