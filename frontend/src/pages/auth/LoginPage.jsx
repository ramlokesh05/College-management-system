import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import { Eye, EyeOff, GraduationCap, LoaderCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";

const MotionDiv = motion.div;

const LoginPage = () => {
  const { login, authFx } = useAuth();
  const reduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [forgotForm, setForgotForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [forgotMeta, setForgotMeta] = useState({
    destination: "",
    expiresInMinutes: 10,
    delivery: "",
    debugOtp: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(form);
    } catch (error) {
      const message = error?.response?.data?.message
        || (error?.request
          ? "Cannot reach backend server. Start backend on http://localhost:5000."
          : "Login failed.");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isSigningIn = authFx === "logging-in" || submitting;

  const handleRequestForgotOtp = async () => {
    const normalizedEmail = String(forgotForm.email || "").trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }

    setRequestingOtp(true);
    try {
      const response = await authService.requestForgotPasswordOtp({ email: normalizedEmail });
      setForgotMeta({
        destination: response?.data?.destination || "",
        expiresInMinutes: Number(response?.data?.expiresInMinutes || 10),
        delivery: response?.data?.delivery || "",
        debugOtp: response?.data?.debugOtp || "",
      });
      toast.success(response?.message || "OTP sent to your email.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send OTP.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleResetForgotPassword = async (event) => {
    event.preventDefault();
    const normalizedEmail = String(forgotForm.email || "").trim().toLowerCase();

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(String(forgotForm.otp || "").trim())) {
      toast.error("Enter a valid 6-digit OTP.");
      return;
    }
    if (String(forgotForm.newPassword).length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      toast.error("New password and confirm password must match.");
      return;
    }

    setResettingPassword(true);
    try {
      await authService.resetForgotPassword({
        email: normalizedEmail,
        otp: forgotForm.otp,
        newPassword: forgotForm.newPassword,
        confirmPassword: forgotForm.confirmPassword,
      });
      toast.success("Password reset successful. Login with your new password.");
      setForm((prev) => ({ ...prev, identifier: normalizedEmail, password: "" }));
      setForgotForm({
        email: normalizedEmail,
        otp: "",
        newPassword: "",
        confirmPassword: "",
      });
      setForgotMeta({
        destination: "",
        expiresInMinutes: 10,
        delivery: "",
        debugOtp: "",
      });
      setShowForgotPassword(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reset password.");
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="login-page-shell relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <span className="floating-orb left-[12%] top-[12%] h-52 w-52 bg-orange-300/35 dark:bg-orange-500/22" />
      <span className="floating-orb right-[10%] bottom-[10%] h-56 w-56 bg-sky-300/26 dark:bg-sky-500/20" />
      <MotionDiv
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{
          opacity: isSigningIn ? 0.94 : 1,
          y: isSigningIn ? -3 : 0,
        }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card motion-perf relative z-10 w-full max-w-md p-7 ring-1 ring-orange-300/35 dark:ring-orange-500/30"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300/45 bg-orange-500/20 text-orange-700 shadow-[0_0_20px_rgba(249,115,22,0.34)] dark:text-orange-200">
            <GraduationCap size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2f1a0c] dark:text-orange-50">
            Rusheel UMS
          </h1>
          <p className="mt-1 text-sm text-[#875433] dark:text-orange-200/75">
            Secure role-based login portal
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#734325] dark:text-orange-100">
              Username or Email
            </label>
            <input
              className="input-field"
              type="text"
              required
              value={form.identifier}
              onChange={(event) => setForm((prev) => ({ ...prev, identifier: event.target.value }))}
              placeholder="admin.1234 or admin@domain.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#734325] dark:text-orange-100">
              Password
            </label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Enter secure password"
              />
              <button
                type="button"
                className="absolute right-2 top-2 rounded-md p-2 text-[#8a5633] hover:bg-orange-100/65 dark:text-orange-200 dark:hover:bg-orange-500/15"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              className="text-xs font-semibold text-[#7c4a2a] underline-offset-2 hover:underline dark:text-orange-200"
              onClick={() => setShowForgotPassword((prev) => !prev)}
            >
              {showForgotPassword ? "Back to Login" : "Forgot Password?"}
            </button>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={isSigningIn}>
            {isSigningIn ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle size={16} className="animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {showForgotPassword ? (
          <form className="mt-5 space-y-3 border-t border-orange-300/35 pt-4 dark:border-orange-500/30" onSubmit={handleResetForgotPassword}>
            <p className="text-sm font-semibold text-[#2f1a0c] dark:text-orange-50">Reset Password via Email OTP</p>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#734325] dark:text-orange-100">
                Email
              </label>
              <input
                className="input-field"
                type="email"
                required
                value={forgotForm.email}
                onChange={(event) => setForgotForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="your-email@example.com"
              />
            </div>

            <button
              type="button"
              className="btn-secondary w-full"
              disabled={requestingOtp || resettingPassword}
              onClick={handleRequestForgotOtp}
            >
              {requestingOtp ? "Sending OTP..." : "Send OTP"}
            </button>

            {forgotMeta.destination ? (
              <p className="text-xs text-[#7c4a2a] dark:text-orange-200/80">
                OTP sent to {forgotMeta.destination}. Expires in {forgotMeta.expiresInMinutes} minutes.
              </p>
            ) : null}
            {forgotMeta.debugOtp ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Dev OTP: {forgotMeta.debugOtp}
              </p>
            ) : null}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#734325] dark:text-orange-100">
                OTP
              </label>
              <input
                className="input-field"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={forgotForm.otp}
                onChange={(event) =>
                  setForgotForm((prev) => ({
                    ...prev,
                    otp: event.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                placeholder="Enter 6-digit OTP"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#734325] dark:text-orange-100">
                New Password
              </label>
              <input
                className="input-field"
                type="password"
                minLength={6}
                required
                value={forgotForm.newPassword}
                onChange={(event) => setForgotForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#734325] dark:text-orange-100">
                Confirm New Password
              </label>
              <input
                className="input-field"
                type="password"
                minLength={6}
                required
                value={forgotForm.confirmPassword}
                onChange={(event) => setForgotForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={resettingPassword || requestingOtp}
            >
              {resettingPassword ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : null}
      </MotionDiv>
    </div>
  );
};

export default LoginPage;
