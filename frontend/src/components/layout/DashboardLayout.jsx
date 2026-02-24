import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const MotionDiv = motion.div;

const DashboardLayout = ({ role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-x-clip pb-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="floating-orb left-[4%] top-[5%] h-56 w-56 bg-orange-300/38 dark:bg-orange-500/24" />
        <span className="floating-orb right-[10%] top-[18%] h-64 w-64 bg-sky-300/34 dark:bg-sky-500/24" />
        <span className="floating-orb bottom-[6%] left-[44%] h-72 w-72 bg-orange-200/32 dark:bg-orange-700/20" />
      </div>

      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="relative z-10 min-h-screen px-4 pt-4 sm:px-6 lg:pl-[18.75rem] lg:pr-6">
        <div className="mx-auto w-full max-w-[1540px]">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />

          <AnimatePresence mode="wait" initial={false}>
            <MotionDiv
              key={location.pathname}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="motion-perf space-y-6"
            >
              <Outlet />
            </MotionDiv>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
