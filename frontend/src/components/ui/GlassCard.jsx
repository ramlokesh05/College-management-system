import { motion, useReducedMotion } from "framer-motion";

const MotionDiv = motion.div;

const GlassCard = ({ children, className = "", delay = 0, animateIn = false, ...props }) => {
  const isInteractive = className.includes("cursor-pointer") || typeof props.onClick === "function";
  const reduceMotion = useReducedMotion();
  const enableEnterMotion = animateIn && !reduceMotion;
  const enableHoverMotion = isInteractive && !reduceMotion;

  return (
    <MotionDiv
      initial={enableEnterMotion ? { opacity: 0, y: 10 } : false}
      animate={enableEnterMotion ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.22, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={enableHoverMotion ? { y: -2 } : undefined}
      whileTap={enableHoverMotion ? { y: 0 } : undefined}
      className={`glass-card motion-perf p-5 ${className}`}
      {...props}
    >
      {children}
    </MotionDiv>
  );
};

export default GlassCard;
