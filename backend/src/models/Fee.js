const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    totalFee: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["paid", "partial", "due"],
      default: "due",
    },
  },
  { timestamps: true },
);

feeSchema.pre("save", function setStatus() {
  if (this.paidAmount <= 0) {
    this.status = "due";
  } else if (this.paidAmount >= this.totalFee) {
    this.status = "paid";
  } else {
    this.status = "partial";
  }
});

module.exports = mongoose.model("Fee", feeSchema);

