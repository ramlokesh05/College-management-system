import {
  Bell,
  BookOpen,
  CalendarCheck2,
  CalendarClock,
  CalendarCog,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  NotebookPen,
  Receipt,
  School,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NavLink } from "react-router-dom";

const studentMenu = [
  { to: "/student", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/profile", label: "Profile", icon: UserCircle2 },
  { to: "/student/courses", label: "Courses", icon: BookOpen },
  { to: "/student/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/student/exams", label: "Exams", icon: CalendarClock },
  { to: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/student/marks", label: "Marks", icon: GraduationCap },
  { to: "/student/assignments", label: "Assignments", icon: NotebookPen },
  { to: "/student/fees", label: "Fees", icon: Receipt },
  { to: "/student/notices", label: "Notices", icon: Bell },
];

const teacherMenu = [
  { to: "/teacher", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/teacher/profile", label: "Profile", icon: UserCircle2 },
  { to: "/teacher/courses", label: "Courses", icon: BookOpen },
  { to: "/teacher/attendance", label: "Mark Attendance", icon: CalendarCheck2 },
  { to: "/teacher/marks", label: "Upload Marks", icon: GraduationCap },
  { to: "/teacher/assignments", label: "Assignments", icon: NotebookPen },
  { to: "/teacher/announcements", label: "Announcements", icon: Megaphone },
  { to: "/teacher/leaves", label: "Leave Apply", icon: CalendarClock },
  { to: "/teacher/earnings", label: "Earnings", icon: Receipt },
];

const adminMenu = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/profile", label: "Profile", icon: UserCircle2 },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/teachers", label: "Teachers", icon: School },
  { to: "/admin/teacher-leaves", label: "Teacher Leaves", icon: ClipboardCheck },
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/enrollments", label: "Enrollments", icon: FileText },
  { to: "/admin/academic", label: "Academic", icon: CalendarCog },
  { to: "/admin/notices", label: "Notices", icon: Bell },
];

const roleMenuMap = {
  student: studentMenu,
  teacher: teacherMenu,
  admin: adminMenu,
};
const MotionAside = motion.aside;
const MotionButton = motion.button;
const MotionDiv = motion.div;

const menuLinkClass = ({ isActive }) =>
  [
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
    isActive
      ? "glass-nav-active"
      : "glass-nav-idle",
  ].join(" ");

const SidebarContent = ({ role, onNavigate }) => {
  const menu = roleMenuMap[role] || [];

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-7 border-b border-orange-200/65 pb-5 dark:border-orange-500/25">
        <div className="glass-black-control mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.75)] dark:bg-sky-300" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#875433] dark:text-orange-100">
            Padhagatham Campus
          </span>
        </div>
        <p className="font-display text-xl font-semibold text-[#2f1b0d] dark:text-orange-50">Rusheel UMS</p>
        <p className="text-xs uppercase tracking-[0.18em] text-[#8a5834] dark:text-orange-200/75">{role} Portal</p>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={menuLinkClass}
              onClick={onNavigate}
            >
              <Icon
                size={17}
                className="text-current transition-transform duration-200 group-hover:scale-110"
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

const Sidebar = ({ role, isOpen, onClose }) => {
  const reduceMotion = useReducedMotion();

  return (
    <>
      <aside className="glass-card fixed bottom-4 left-4 top-4 z-30 hidden w-[16.75rem] lg:block">
        <SidebarContent role={role} />
      </aside>

      <AnimatePresence>
        {isOpen ? (
          <MotionDiv
            className="fixed inset-0 z-50 lg:hidden"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <MotionButton
              type="button"
              className="absolute inset-0 bg-sky-900/20 backdrop-blur-sm dark:bg-black/72"
              aria-label="Close sidebar"
              onClick={onClose}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <MotionAside
              className="glass-card motion-perf absolute bottom-4 left-4 top-4 w-[17.75rem]"
              initial={reduceMotion ? false : { x: -20, opacity: 0.85 }}
              animate={reduceMotion ? undefined : { x: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { x: -16, opacity: 0.86 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-end p-3">
                <button
                  type="button"
                  className="glass-black-control rounded-lg p-1.5"
                  onClick={onClose}
                  aria-label="Close sidebar panel"
                >
                  <X size={17} />
                </button>
              </div>
              <SidebarContent role={role} onNavigate={onClose} />
            </MotionAside>
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
