import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import GlassCard from "../ui/GlassCard";
import { authService } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";

const EmailVerificationCard = ({
  title = "Email Verification",
  description = "Enter your email and verify it using OTP.",
  className = "",
  onVerified,
}) => {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [otp, setOtp] = useState("");
  const [requestMeta, setRequestMeta] = useState({
    destination: "",
    expiresInMinutes: 10,
    delivery: "",
    debugOtp: "",
  });
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    setEmail(user?.email || "");
  }, [user?.email]);

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCurrentEmail = String(user?.email || "").trim().toLowerCase();
  const isVerifiedForCurrentInput = Boolean(user?.isEmailVerified) && normalizedEmail === normalizedCurrentEmail;

  const handleRequestOtp = async () => {
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }

    setRequestingOtp(true);
    try {
      const response = await authService.requestEmailOtp({ email: normalizedEmail });
      setRequestMeta({
        destination: response?.data?.destination || "",
        expiresInMinutes: Number(response?.data?.expiresInMinutes || 10),
        delivery: response?.data?.delivery || "",
        debugOtp: response?.data?.debugOtp || "",
      });
      toast.success("OTP sent to your email.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send OTP.");
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(String(otp || "").trim())) {
      toast.error("Enter a valid 6-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    try {
      await authService.verifyEmailOtp({ email: normalizedEmail, otp: String(otp).trim() });
      toast.success("Email verified successfully.");
      setOtp("");
      setRequestMeta({
        destination: "",
        expiresInMinutes: 10,
        delivery: "",
        debugOtp: "",
      });
      await refreshUser();
      if (typeof onVerified === "function") {
        await onVerified();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to verify OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <GlassCard className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
            isVerifiedForCurrentInput
              ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/45 dark:bg-emerald-500/20 dark:text-emerald-100"
              : "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-400/45 dark:bg-amber-500/20 dark:text-amber-100"
          }`}
        >
          {isVerifiedForCurrentInput ? "Verified" : "Not Verified"}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>

      <form className="mt-4 space-y-3" onSubmit={handleVerifyOtp}>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Email
          </label>
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRequestOtp}
            disabled={requestingOtp || verifyingOtp}
          >
            {requestingOtp ? "Sending OTP..." : requestMeta.destination ? "Resend OTP" : "Send OTP"}
          </button>
        </div>

        {requestMeta.destination ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">
            OTP sent to {requestMeta.destination}. Expires in {requestMeta.expiresInMinutes} minutes.
          </p>
        ) : null}
        {requestMeta.debugOtp ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Dev OTP: {requestMeta.debugOtp}
          </p>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            OTP
          </label>
          <input
            className="input-field"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter 6-digit OTP"
            required
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={verifyingOtp || requestingOtp}
        >
          {verifyingOtp ? "Verifying..." : "Verify Email"}
        </button>
      </form>
    </GlassCard>
  );
};

export default EmailVerificationCard;
