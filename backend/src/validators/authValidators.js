const { body } = require("express-validator");

const loginValidation = [
  body("identifier")
    .custom((value, { req }) => {
      const resolved = String(value || req.body?.email || "").trim();
      if (!resolved) {
        throw new Error("Username or email is required.");
      }
      return true;
    }),
  body("password")
    .notEmpty()
    .withMessage("Password is required."),
];

const changePasswordBaseValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("currentPassword is required.")
    .isLength({ min: 6 })
    .withMessage("currentPassword must be at least 6 characters."),
  body("newPassword")
    .notEmpty()
    .withMessage("newPassword is required.")
    .isLength({ min: 6 })
    .withMessage("newPassword must be at least 6 characters."),
  body("confirmPassword")
    .notEmpty()
    .withMessage("confirmPassword is required.")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("confirmPassword must match newPassword."),
];

const requestPasswordChangeCodeValidation = [...changePasswordBaseValidation];

const changePasswordValidation = [
  ...changePasswordBaseValidation,
  body("verificationCode")
    .notEmpty()
    .withMessage("verificationCode is required.")
    .matches(/^\d{6}$/)
    .withMessage("verificationCode must be a 6-digit code."),
];

const requestEmailOtpValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("email is required.")
    .isEmail()
    .withMessage("Provide a valid email address."),
];

const verifyEmailOtpValidation = [
  ...requestEmailOtpValidation,
  body("otp")
    .notEmpty()
    .withMessage("otp is required.")
    .matches(/^\d{6}$/)
    .withMessage("otp must be a 6-digit code."),
];

const forgotPasswordRequestValidation = [...requestEmailOtpValidation];

const forgotPasswordResetValidation = [
  ...requestEmailOtpValidation,
  body("otp")
    .notEmpty()
    .withMessage("otp is required.")
    .matches(/^\d{6}$/)
    .withMessage("otp must be a 6-digit code."),
  body("newPassword")
    .notEmpty()
    .withMessage("newPassword is required.")
    .isLength({ min: 6 })
    .withMessage("newPassword must be at least 6 characters."),
  body("confirmPassword")
    .notEmpty()
    .withMessage("confirmPassword is required.")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("confirmPassword must match newPassword."),
];

module.exports = {
  loginValidation,
  requestPasswordChangeCodeValidation,
  changePasswordValidation,
  requestEmailOtpValidation,
  verifyEmailOtpValidation,
  forgotPasswordRequestValidation,
  forgotPasswordResetValidation,
};
