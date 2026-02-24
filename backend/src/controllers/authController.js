const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const generateToken = require("../utils/generateToken");
const { createHash, randomInt } = require("crypto");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const TeacherProfile = require("../models/TeacherProfile");
const { sendPasswordChangeVerificationEmail, sendEmailVerificationOtp } = require("../utils/emailService");

const PASSWORD_CHANGE_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_CHANGE_OTP_COOLDOWN_MS = 60 * 1000;
const PASSWORD_CHANGE_OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFICATION_OTP_TTL_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_OTP_COOLDOWN_MS = 60 * 1000;
const EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS = 5;
const FORGOT_PASSWORD_OTP_TTL_MS = 10 * 60 * 1000;
const FORGOT_PASSWORD_OTP_COOLDOWN_MS = 60 * 1000;
const FORGOT_PASSWORD_OTP_MAX_ATTEMPTS = 5;
const passwordChangeOtpStore = new Map();
const emailVerificationOtpStore = new Map();
const forgotPasswordOtpStore = new Map();

const getRoleProfile = async (userId, role) => {
  if (role === "student") {
    return StudentProfile.findOne({ user: userId });
  }
  if (role === "teacher") {
    return TeacherProfile.findOne({ user: userId });
  }
  return null;
};

const resolveLoginIdentifier = (payload = {}) =>
  String(payload.identifier || payload.email || "")
    .trim()
    .toLowerCase();

const hashValue = (value) =>
  createHash("sha256")
    .update(String(value || ""))
    .digest("hex");

const hashVerificationCode = (userId, code) =>
  hashValue(`${String(userId)}:${String(code)}:${process.env.JWT_SECRET || "rusheel-ums"}`);

const maskEmail = (email) => {
  const value = String(email || "").trim();
  const [localPart, domainPart] = value.split("@");
  if (!localPart || !domainPart) return value;
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(localPart.length - 2, 2))}@${domainPart}`;
};

const clearPasswordChangeChallenge = (userId) => {
  passwordChangeOtpStore.delete(String(userId));
};

const clearEmailVerificationChallenge = (userId) => {
  emailVerificationOtpStore.delete(String(userId));
};

const clearForgotPasswordChallenge = (email) => {
  forgotPasswordOtpStore.delete(String(email || "").trim().toLowerCase());
};

const requestPasswordChangeCode = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  const user = await User.findById(req.user._id).select("+password");
  if (!user || !user.isActive) {
    throw new ApiError(401, "User is not authorized.");
  }

  const isCurrentPasswordValid = await user.comparePassword(String(currentPassword || ""));
  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  if (String(currentPassword) === String(newPassword)) {
    throw new ApiError(400, "New password must be different from current password.");
  }

  if (String(newPassword) !== String(confirmPassword)) {
    throw new ApiError(400, "confirmPassword must match newPassword.");
  }

  const now = Date.now();
  const userKey = String(user._id);
  const existingChallenge = passwordChangeOtpStore.get(userKey);
  if (existingChallenge && now - existingChallenge.requestedAt < PASSWORD_CHANGE_OTP_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((PASSWORD_CHANGE_OTP_COOLDOWN_MS - (now - existingChallenge.requestedAt)) / 1000);
    throw new ApiError(429, `Please wait ${secondsLeft}s before requesting a new verification code.`);
  }

  const code = String(randomInt(100000, 1000000));
  const challenge = {
    codeHash: hashVerificationCode(userKey, code),
    passwordHash: hashValue(newPassword),
    expiresAt: now + PASSWORD_CHANGE_OTP_TTL_MS,
    requestedAt: now,
    attemptsLeft: PASSWORD_CHANGE_OTP_MAX_ATTEMPTS,
  };

  passwordChangeOtpStore.set(userKey, challenge);

  try {
    const delivery = await sendPasswordChangeVerificationEmail({
      to: user.email,
      name: user.name,
      code,
      expiresInMinutes: Math.round(PASSWORD_CHANGE_OTP_TTL_MS / (60 * 1000)),
    });

    res.status(200).json({
      success: true,
      message: "Verification code sent to your registered email.",
      data: {
        destination: maskEmail(user.email),
        expiresInMinutes: Math.round(PASSWORD_CHANGE_OTP_TTL_MS / (60 * 1000)),
        delivery: delivery.channel,
        ...(delivery.channel === "console" && process.env.NODE_ENV !== "production"
          ? { debugVerificationCode: code }
          : {}),
      },
    });
  } catch (error) {
    clearPasswordChangeChallenge(userKey);
    throw new ApiError(500, "Failed to send verification code email. Please try again.");
  }
});

const requestEmailVerificationOtp = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();

  const user = await User.findById(req.user._id);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User is not authorized.");
  }

  const emailInUse = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: user._id },
  }).select("_id");
  if (emailInUse) {
    throw new ApiError(409, "This email is already used by another account.");
  }

  const now = Date.now();
  const userKey = String(user._id);
  const existingChallenge = emailVerificationOtpStore.get(userKey);
  if (existingChallenge && now - existingChallenge.requestedAt < EMAIL_VERIFICATION_OTP_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((EMAIL_VERIFICATION_OTP_COOLDOWN_MS - (now - existingChallenge.requestedAt)) / 1000);
    throw new ApiError(429, `Please wait ${secondsLeft}s before requesting a new OTP.`);
  }

  const otp = String(randomInt(100000, 1000000));
  const challenge = {
    email: normalizedEmail,
    codeHash: hashVerificationCode(userKey, otp),
    expiresAt: now + EMAIL_VERIFICATION_OTP_TTL_MS,
    requestedAt: now,
    attemptsLeft: EMAIL_VERIFICATION_OTP_MAX_ATTEMPTS,
  };

  emailVerificationOtpStore.set(userKey, challenge);

  try {
    const delivery = await sendEmailVerificationOtp({
      to: normalizedEmail,
      name: user.name,
      code: otp,
      expiresInMinutes: Math.round(EMAIL_VERIFICATION_OTP_TTL_MS / (60 * 1000)),
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to the provided email.",
      data: {
        destination: maskEmail(normalizedEmail),
        expiresInMinutes: Math.round(EMAIL_VERIFICATION_OTP_TTL_MS / (60 * 1000)),
        delivery: delivery.channel,
        ...(delivery.channel === "console" && process.env.NODE_ENV !== "production"
          ? { debugOtp: otp }
          : {}),
      },
    });
  } catch (_error) {
    clearEmailVerificationChallenge(userKey);
    throw new ApiError(500, "Failed to send OTP email. Please try again.");
  }
});

const requestForgotPasswordOtp = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
  const now = Date.now();
  const existingChallenge = forgotPasswordOtpStore.get(normalizedEmail);

  if (existingChallenge && now - existingChallenge.requestedAt < FORGOT_PASSWORD_OTP_COOLDOWN_MS) {
    const secondsLeft = Math.ceil((FORGOT_PASSWORD_OTP_COOLDOWN_MS - (now - existingChallenge.requestedAt)) / 1000);
    throw new ApiError(429, `Please wait ${secondsLeft}s before requesting a new OTP.`);
  }

  const user = await User.findOne({ email: normalizedEmail, isActive: true });
  if (!user) {
    res.status(200).json({
      success: true,
      message: "If an account exists for this email, OTP will be sent.",
    });
    return;
  }

  const otp = String(randomInt(100000, 1000000));
  forgotPasswordOtpStore.set(normalizedEmail, {
    userId: user._id.toString(),
    codeHash: hashVerificationCode(normalizedEmail, otp),
    expiresAt: now + FORGOT_PASSWORD_OTP_TTL_MS,
    requestedAt: now,
    attemptsLeft: FORGOT_PASSWORD_OTP_MAX_ATTEMPTS,
  });

  try {
    const delivery = await sendPasswordChangeVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      code: otp,
      expiresInMinutes: Math.round(FORGOT_PASSWORD_OTP_TTL_MS / (60 * 1000)),
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
      data: {
        destination: maskEmail(normalizedEmail),
        expiresInMinutes: Math.round(FORGOT_PASSWORD_OTP_TTL_MS / (60 * 1000)),
        delivery: delivery.channel,
        ...(delivery.channel === "console" && process.env.NODE_ENV !== "production"
          ? { debugOtp: otp }
          : {}),
      },
    });
  } catch (_error) {
    clearForgotPasswordChallenge(normalizedEmail);
    throw new ApiError(500, "Failed to send OTP email. Please try again.");
  }
});

const resetForgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
  const otp = String(req.body?.otp || "").trim();
  const newPassword = String(req.body?.newPassword || "");
  const confirmPassword = String(req.body?.confirmPassword || "");

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "confirmPassword must match newPassword.");
  }

  const challenge = forgotPasswordOtpStore.get(normalizedEmail);
  if (!challenge) {
    throw new ApiError(400, "Request OTP before resetting password.");
  }

  if (Date.now() > challenge.expiresAt) {
    clearForgotPasswordChallenge(normalizedEmail);
    throw new ApiError(400, "OTP expired. Request a new OTP.");
  }

  const otpMatches = hashVerificationCode(normalizedEmail, otp) === challenge.codeHash;
  if (!otpMatches) {
    challenge.attemptsLeft -= 1;
    if (challenge.attemptsLeft <= 0) {
      clearForgotPasswordChallenge(normalizedEmail);
      throw new ApiError(401, "OTP invalid. Request a new OTP.");
    }
    forgotPasswordOtpStore.set(normalizedEmail, challenge);
    throw new ApiError(401, `Invalid OTP. Attempts left: ${challenge.attemptsLeft}`);
  }

  const user = await User.findOne({
    _id: challenge.userId,
    email: normalizedEmail,
    isActive: true,
  }).select("+password");

  if (!user) {
    clearForgotPasswordChallenge(normalizedEmail);
    throw new ApiError(404, "Account not found for this email.");
  }

  const isSamePassword = await user.comparePassword(newPassword);
  if (isSamePassword) {
    throw new ApiError(400, "New password must be different from current password.");
  }

  user.password = newPassword;
  await user.save();
  clearForgotPasswordChallenge(normalizedEmail);

  res.status(200).json({
    success: true,
    message: "Password reset successful. You can now login with new password.",
  });
});

const verifyEmailOtp = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
  const otp = String(req.body?.otp || "").trim();

  const user = await User.findById(req.user._id);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User is not authorized.");
  }

  const userKey = String(user._id);
  const challenge = emailVerificationOtpStore.get(userKey);
  if (!challenge) {
    throw new ApiError(400, "Request OTP before verifying email.");
  }

  if (Date.now() > challenge.expiresAt) {
    clearEmailVerificationChallenge(userKey);
    throw new ApiError(400, "OTP expired. Request a new OTP.");
  }

  if (challenge.email !== normalizedEmail) {
    throw new ApiError(400, "Email does not match latest OTP request.");
  }

  const otpMatches = hashVerificationCode(userKey, otp) === challenge.codeHash;
  if (!otpMatches) {
    challenge.attemptsLeft -= 1;
    if (challenge.attemptsLeft <= 0) {
      clearEmailVerificationChallenge(userKey);
      throw new ApiError(401, "OTP invalid. Request a new OTP.");
    }
    emailVerificationOtpStore.set(userKey, challenge);
    throw new ApiError(401, `Invalid OTP. Attempts left: ${challenge.attemptsLeft}`);
  }

  const emailInUse = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: user._id },
  }).select("_id");
  if (emailInUse) {
    clearEmailVerificationChallenge(userKey);
    throw new ApiError(409, "This email is already used by another account.");
  }

  user.email = normalizedEmail;
  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save();

  clearEmailVerificationChallenge(userKey);

  res.status(200).json({
    success: true,
    message: "Email verified successfully.",
    data: {
      user: {
        id: user._id,
        name: user.name,
        username: user.username || "",
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: Boolean(user.isEmailVerified),
        emailVerifiedAt: user.emailVerifiedAt,
      },
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const identifier = resolveLoginIdentifier(req.body);
  const { password } = req.body || {};

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select("+password");
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid username/email or password.");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid username/email or password.");
  }

  const token = generateToken(user);
  const profile = await getRoleProfile(user._id, user.role);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username || "",
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: Boolean(user.isEmailVerified),
        emailVerifiedAt: user.emailVerifiedAt,
      },
      profile,
    },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword, verificationCode } = req.body || {};

  const user = await User.findById(req.user._id).select("+password");
  if (!user || !user.isActive) {
    throw new ApiError(401, "User is not authorized.");
  }

  const userKey = String(user._id);
  const challenge = passwordChangeOtpStore.get(userKey);
  if (!challenge) {
    throw new ApiError(400, "Request a verification code before changing password.");
  }

  if (Date.now() > challenge.expiresAt) {
    clearPasswordChangeChallenge(userKey);
    throw new ApiError(400, "Verification code expired. Request a new one.");
  }

  if (hashValue(newPassword) !== challenge.passwordHash) {
    throw new ApiError(400, "New password changed after verification request. Request code again.");
  }

  const codeMatches = hashVerificationCode(userKey, verificationCode) === challenge.codeHash;
  if (!codeMatches) {
    challenge.attemptsLeft -= 1;
    if (challenge.attemptsLeft <= 0) {
      clearPasswordChangeChallenge(userKey);
      throw new ApiError(401, "Verification code invalid. Request a new code.");
    }
    passwordChangeOtpStore.set(userKey, challenge);
    throw new ApiError(401, `Invalid verification code. Attempts left: ${challenge.attemptsLeft}`);
  }

  const isCurrentPasswordValid = await user.comparePassword(String(currentPassword || ""));
  if (!isCurrentPasswordValid) {
    throw new ApiError(401, "Current password is incorrect.");
  }

  if (String(currentPassword) === String(newPassword)) {
    throw new ApiError(400, "New password must be different from current password.");
  }

  if (String(newPassword) !== String(confirmPassword)) {
    throw new ApiError(400, "confirmPassword must match newPassword.");
  }

  user.password = String(newPassword);
  await user.save();
  clearPasswordChangeChallenge(userKey);

  res.status(200).json({
    success: true,
    message: "Password changed successfully.",
  });
});

const getMe = asyncHandler(async (req, res) => {
  const profile = await getRoleProfile(req.user._id, req.user.role);

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
      profile,
    },
  });
});

module.exports = {
  login,
  getMe,
  requestPasswordChangeCode,
  changePassword,
  requestEmailVerificationOtp,
  verifyEmailOtp,
  requestForgotPasswordOtp,
  resetForgotPassword,
};
