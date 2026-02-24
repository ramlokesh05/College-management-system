const express = require("express");
const {
  login,
  getMe,
  requestPasswordChangeCode,
  changePassword,
  requestEmailVerificationOtp,
  verifyEmailOtp,
  requestForgotPasswordOtp,
  resetForgotPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  loginValidation,
  requestPasswordChangeCodeValidation,
  changePasswordValidation,
  requestEmailOtpValidation,
  verifyEmailOtpValidation,
  forgotPasswordRequestValidation,
  forgotPasswordResetValidation,
} = require("../validators/authValidators");

const router = express.Router();

router.post("/login", loginValidation, validateRequest, login);
router.post("/forgot-password/request-otp", forgotPasswordRequestValidation, validateRequest, requestForgotPasswordOtp);
router.post("/forgot-password/reset", forgotPasswordResetValidation, validateRequest, resetForgotPassword);
router.get("/me", protect, getMe);
router.post(
  "/change-password/request-code",
  protect,
  requestPasswordChangeCodeValidation,
  validateRequest,
  requestPasswordChangeCode,
);
router.patch("/change-password", protect, changePasswordValidation, validateRequest, changePassword);
router.post("/email/request-otp", protect, requestEmailOtpValidation, validateRequest, requestEmailVerificationOtp);
router.post("/email/verify-otp", protect, verifyEmailOtpValidation, validateRequest, verifyEmailOtp);

module.exports = router;
