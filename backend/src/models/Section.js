const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
      index: true,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

sectionSchema.index(
  { name: 1, department: 1, year: 1, semester: 1, academicSession: 1 },
  { unique: true },
);

module.exports = mongoose.model("Section", sectionSchema);
