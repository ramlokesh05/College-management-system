const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    credits: {
      type: Number,
      default: 0,
      min: 0,
      max: 12,
    },
    department: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false },
);

const academicSessionSchema = new mongoose.Schema(
  {
    year: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    subjects: {
      type: [subjectSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AcademicSession", academicSessionSchema);
