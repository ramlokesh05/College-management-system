const mongoose = require("mongoose");

const requestedChangesSchema = new mongoose.Schema(
  {
    department: { type: String, trim: true },
    year: { type: Number, min: 1, max: 6 },
    semester: { type: Number, min: 1, max: 12 },
    section: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    avatar: { type: String, trim: true },
  },
  { _id: false },
);

const profileEditRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requestedChanges: {
      type: requestedChangesSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
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
  },
  { timestamps: true },
);

module.exports = mongoose.model("ProfileEditRequest", profileEditRequestSchema);
