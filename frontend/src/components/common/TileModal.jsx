import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

const MotionDiv = motion.div;
const MotionButton = motion.button;

const TileModal = ({
  isOpen,
  title,
  onClose,
  children,
  overlayClassName = "",
  panelClassName = "",
  headerClassName = "",
  closeButtonClassName = "",
}) => {
  const reduceMotion = useReducedMotion();
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <MotionDiv
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reduceMotion ? undefined : { opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <MotionButton
            type="button"
            className={`absolute inset-0 backdrop-blur-[10px] ${overlayClassName}`}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-label="Close expanded tile"
          />

          <MotionDiv
            className={`student-dashboard-theme motion-perf relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl border backdrop-blur-[10px] ${panelClassName}`}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={`flex items-center justify-between border-b px-4 py-3 ${headerClassName}`}>
              <h3 className="text-lg font-semibold">{title || "Details"}</h3>
              <button
                type="button"
                onClick={onClose}
                className={`rounded-lg border p-1.5 transition ${closeButtonClassName}`}
                aria-label="Close details"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
          </MotionDiv>
        </MotionDiv>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default TileModal;
