import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import { KeyRound, LoaderCircle, LogOut, Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../services/authService";
import TileModal from "../common/TileModal";
import ThemeToggle from "../ui/ThemeToggle";

const MotionDiv = motion.div;

const routeTitle = (pathname) => {
  if (pathname === "/student" || pathname === "/teacher" || pathname === "/admin") {
    return "Dashboard";
  }
  const segment = pathname.split("/").filter(Boolean).pop();
  if (!segment) return "Dashboard";
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const Topbar = ({ onMenuClick }) => {
  const location = useLocation();
  const { user, logout, authFx } = useAuth();
  const reduceMotion = useReducedMotion();
  const title = routeTitle(location.pathname);
  const isLoggingOut = authFx === "logging-out";
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [isChangingPassword, setChangingPassword] = useState(false);
  const [isSendingVerification, setSendingVerification] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    verificationCode: "",
  });
  const [verificationMeta, setVerificationMeta] = useState({
    destination: "",
    expiresInMinutes: 10,
    delivery: "",
    debugVerificationCode: "",
  });

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      verificationCode: "",
    });
    setVerificationMeta({
      destination: "",
      expiresInMinutes: 10,
      delivery: "",
      debugVerificationCode: "",
    });
  };

  const validatePasswordInputs = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Fill all password fields.");
      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password must match.");
      return false;
    }
    return true;
  };

  const handleRequestVerificationCode = async () => {
    if (!validatePasswordInputs()) return;

    setSendingVerification(true);
    try {
      const response = await authService.requestPasswordChangeCode({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setVerificationMeta({
        destination: response?.data?.destination || "",
        expiresInMinutes: Number(response?.data?.expiresInMinutes || 10),
        delivery: response?.data?.delivery || "",
        debugVerificationCode: response?.data?.debugVerificationCode || "",
      });
      toast.success("Verification code sent. Check your email.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send verification code.");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (!validatePasswordInputs()) return;
    if (!passwordForm.verificationCode.trim()) {
      toast.error("Enter the verification code.");
      return;
    }

    setChangingPassword(true);
    try {
      await authService.changePassword(passwordForm);
      toast.success("Password changed successfully.");
      closePasswordModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <header className="glass-card mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="glass-black-control rounded-xl p-2 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          <AnimatePresence mode="wait" initial={false}>
            <MotionDiv
              key={title}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="motion-perf"
            >
              <h1 className="font-display text-xl font-semibold text-[#2f1a0c] dark:text-orange-50">
                {title}
              </h1>
              <p className="text-xs font-medium text-[#875433] dark:text-orange-200/75">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </MotionDiv>
          </AnimatePresence>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-[#2f1a0c] dark:text-orange-50">{user?.name}</p>
            <p className="text-xs uppercase tracking-[0.12em] text-[#875433] dark:text-orange-200/75">{user?.role}</p>
          </div>

          <button
            type="button"
            className="btn-secondary gap-2 !px-3"
            disabled={isLoggingOut || isChangingPassword}
            onClick={() => setPasswordModalOpen(true)}
          >
            <KeyRound size={16} />
            <span className="hidden sm:inline">Change Password</span>
          </button>

          <button
            type="button"
            className="btn-secondary gap-2 !px-3"
            disabled={isLoggingOut}
            onClick={() => void logout(true)}
          >
            {isLoggingOut ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}
            <span className="hidden sm:inline">{isLoggingOut ? "Signing Out" : "Logout"}</span>
          </button>
        </div>
      </header>

      <TileModal
        isOpen={isPasswordModalOpen}
        title="Change Password"
        onClose={closePasswordModal}
        overlayClassName="bg-gradient-to-br from-sky-200/70 via-white/72 to-cyan-100/72 dark:from-slate-900/65 dark:via-slate-800/60 dark:to-slate-900/65"
        panelClassName="glass-tile max-w-xl border-sky-300/55 bg-white/88 text-[#1d2433] shadow-[0_30px_70px_rgba(14,30,55,0.28)] dark:border-sky-300/35 dark:bg-slate-900/70 dark:text-slate-100"
        headerClassName="border-sky-300/45 dark:border-sky-300/30"
        closeButtonClassName="border-sky-300/55 bg-white/60 text-sky-900 hover:bg-sky-100/70 dark:border-sky-300/40 dark:bg-slate-900/45 dark:text-sky-100 dark:hover:bg-sky-900/35"
      >
        <form className="space-y-3" onSubmit={handleChangePassword}>
          <div>
            <label className="mb-1 block text-sm font-semibold">Current Password</label>
            <input
              className="input-field"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">New Password</label>
            <input
              className="input-field"
              type="password"
              minLength={6}
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Confirm New Password</label>
            <input
              className="input-field"
              type="password"
              minLength={6}
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Verification Code</label>
            <input
              className="input-field"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={passwordForm.verificationCode}
              onChange={(event) =>
                setPasswordForm((prev) => ({
                  ...prev,
                  verificationCode: event.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
              placeholder="Enter 6-digit code"
              required
            />
          </div>
          <div className="space-y-2">
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={handleRequestVerificationCode}
              disabled={isSendingVerification || isChangingPassword}
            >
              {isSendingVerification ? "Sending Code..." : "Send Verification Code"}
            </button>
            {verificationMeta.destination ? (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Code sent to {verificationMeta.destination}. Expires in {verificationMeta.expiresInMinutes} minutes.
              </p>
            ) : null}
            {verificationMeta.debugVerificationCode ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Dev code: {verificationMeta.debugVerificationCode}
              </p>
            ) : null}
          </div>
          <div className="pt-1">
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isChangingPassword || isSendingVerification}
            >
              {isChangingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </TileModal>
    </>
  );
};

export default Topbar;
