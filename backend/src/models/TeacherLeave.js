const mongoose = require("mongoose");

const teacherLeaveSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leaveDate: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    deductionAmount: {
      type: Number,
      default: 1500,
      min: 0,
    },
  },
  { timestamps: true },
);

teacherLeaveSchema.index({ teacher: 1, leaveDate: 1, status: 1 });

module.exports = mongoose.model("TeacherLeave", teacherLeaveSchema);
