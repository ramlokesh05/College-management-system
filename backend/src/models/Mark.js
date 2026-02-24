const mongoose = require("mongoose");

const markSchema = new mongoose.Schema(
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
    examType: {
      type: String,
      required: true,
      trim: true,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    obtainedMarks: {
      type: Number,
      required: true,
      min: 0,
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
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Mark", markSchema);

