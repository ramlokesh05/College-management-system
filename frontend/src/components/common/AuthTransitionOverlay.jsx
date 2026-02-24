import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const MotionDiv = motion.div;

const getOverlayCopy = (mode, userName) => {
  if (mode === "logging-in") {
    return {
      title: "Signing in",
      subtitle: "Verifying credentials and preparing your workspace...",
      accent: "from-sky-400/70 to-blue-500/70",
    };
  }

  if (mode === "welcome") {
    return {
      title: `Welcome, ${userName || "Scholar"}`,
      subtitle: "Opening your campus dashboard...",
      accent: "from-orange-400/80 to-sky-400/80",
    };
  }

  if (mode === "logging-out") {
    return {
      title: "Signing out",
      subtitle: "Securing your session and redirecting...",
      accent: "from-orange-400/75 to-sky-400/75",
    };
  }

  return null;
};

const AuthTransitionOverlay = () => {
  const { authFx, user } = useAuth();
  const reduceMotion = useReducedMotion();
  const copy = getOverlayCopy(authFx, user?.name);

  return (
    <AnimatePresence>
      {copy ? (
        <MotionDiv
          className="fixed inset-0 z-[400] flex items-center justify-center p-5"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <MotionDiv
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <MotionDiv
            className="glass-card motion-perf relative z-10 w-full max-w-md border border-sky-300/35 p-5"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${copy.accent} text-white shadow-[0_8px_20px_-12px_rgba(14,165,233,0.85)]`}
              >
                <LoaderCircle size={18} className="animate-spin" />
              </span>
              <div>
                <p className="text-sm font-semibold">{copy.title}</p>
                <p className="text-xs">{copy.subtitle}</p>
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      ) : null}
    </AnimatePresence>
  );
};

export default AuthTransitionOverlay;
