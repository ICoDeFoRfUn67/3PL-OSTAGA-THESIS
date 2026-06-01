import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

import {
  LayoutDashboard,
  Users,
  MapPin,
  FileText,
  CalendarDays,
  Lock,
  Clock3,
  DollarSign,
  Activity,
  AlertTriangle,
  Plus,
  X,
} from 'lucide-react';

type BottomNavigationProps = {
  className?: string;
};

export const BottomNavigation = ({
  className = '',
}: BottomNavigationProps) => {
  const { user } = useAuth();
  const location = useLocation();

  const [expanded, setExpanded] = useState(false);

  const rawRole = (user?.role || '')
    .toString()
    .trim()
    .toLowerCase();

  const normalizedRole =
    rawRole.includes('admin')
      ? 'admin'
      : rawRole.includes('hr')
      ? 'hr'
      : rawRole;

  const basePath =
    normalizedRole === 'admin'
      ? '/admin'
      : normalizedRole === 'hr'
      ? '/hr'
      : '/employee';

  /**
   * MAIN NAVIGATION
   */
  const bottomItems = useMemo(
    () => [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: basePath,
      },
      {
        label: 'Hubs',
        icon: MapPin,
        path: `${basePath}/hubs`,
      },
      {
        label: 'Employees',
        icon: Users,
        path: `${basePath}/employees`,
      },
      {
        label: 'Edit',
        icon: FileText,
        path: `${basePath}/edit-requests`,
      },
    ],
    [basePath]
  );

  /**
   * FLOATING MENU
   */
  const floatingItems = useMemo(
    () => [
      {
        label: 'Leave',
        icon: CalendarDays,
        path: `${basePath}/leave-requests`,
      },
      {
        label: 'Access',
        icon: Lock,
        path: `${basePath}/access-control`,
      },
      {
        label: 'Attendance',
        icon: Clock3,
        path: `${basePath}/attendance`,
      },
      {
        label: 'Payroll',
        icon: DollarSign,
        path: `${basePath}/payslip`,
      },
      {
        label: 'Activity',
        icon: Activity,
        path: `${basePath}/activity-logs`,
      },
      {
        label: 'Alerts',
        icon: AlertTriangle,
        path: `${basePath}/security-alerts`,
      },
    ],
    [basePath]
  );

  /**
   * FIXED FLOATING ARC SPACING
   * evenly separated
   */
  const positions = [
    { x: -132, y: -88 },
    { x: -92, y: -152 },
    { x: -34, y: -198 },

    { x: 34, y: -198 },
    { x: 92, y: -152 },
    { x: 132, y: -88 },
  ];

  return (
    <>
      <div
        className={`
          fixed
          bottom-3
          left-0
          right-0
          z-[9999]
          flex
          justify-center
          px-3
          lg:hidden
          ${className}
        `}
      >
        <div className="relative w-full max-w-[420px]">
          {/* BACKDROP */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setExpanded(false)}
                className="
                  fixed
                  inset-0
                  bg-black/35
                  backdrop-blur-[6px]
                "
              />
            )}
          </AnimatePresence>

          {/* FLOATING MENU */}
          <AnimatePresence>
            {expanded &&
              floatingItems.map((item, index) => {
                const Icon = item.icon;

                const pos = positions[index];

                const isActive =
                  location.pathname.startsWith(item.path);

                return (
                  <motion.div
                    key={item.path}
                    initial={{
                      opacity: 0,
                      scale: 0.2,
                      x: 0,
                      y: 0,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: pos.x,
                      y: pos.y,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.2,
                      x: 0,
                      y: 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 24,
                      delay: index * 0.02,
                    }}
                    className="
                      absolute
                      left-1/2
                      bottom-[38px]
                      z-40
                    "
                    style={{
                      marginLeft: '-22px',
                    }}
                  >
                    <NavLink
                      to={item.path}
                      onClick={() => setExpanded(false)}
                    >
                      <motion.div
                        whileTap={{
                          scale: 0.94,
                        }}
                        whileHover={{
                          y: -3,
                        }}
                        className="
                          flex
                          flex-col
                          items-center
                          gap-1.5
                        "
                      >
                        {/* FLOATING ICON */}
                        <div
                          className={`
                            relative

                            w-[44px]
                            h-[44px]

                            sm:w-[48px]
                            sm:h-[48px]

                            rounded-full

                            flex
                            items-center
                            justify-center

                            border

                            transition-all
                            duration-300

                            ${
                              isActive
                                ? `
                                  bg-gradient-to-b
                                  from-red-500
                                  to-red-600

                                  border-red-400

                                  text-white

                                  shadow-[0_8px_24px_rgba(239,68,68,0.35)]
                                `
                                : `
                                  bg-[#081226]/92

                                  border-white/15

                                  text-white

                                  hover:border-red-400
                                  hover:text-red-400
                                `
                            }
                          `}
                        >
                          <div
                            className="
                              absolute
                              inset-[3px]
                              rounded-full
                              border
                              border-white/5
                            "
                          />

                          <Icon
                            size={18}
                            strokeWidth={2.2}
                            className="relative z-10"
                          />
                        </div>

                        {/* LABEL */}
                        <span
                          className="
                            text-[9px]
                            font-semibold
                            text-white
                            leading-none
                          "
                        >
                          {item.label}
                        </span>
                      </motion.div>
                    </NavLink>
                  </motion.div>
                );
              })}
          </AnimatePresence>

          {/* MAIN NAVIGATION */}
          <div
            className="
              relative

              h-[72px]
              sm:h-[76px]

              rounded-[26px]

              overflow-visible

              border
              border-white/10

              bg-[rgba(8,15,35,0.94)]

              backdrop-blur-[22px]

              shadow-[0_16px_40px_rgba(0,0,0,0.38)]
            "
          >
            {/* INNER LIGHT */}
            <div
              className="
                absolute
                inset-0

                rounded-[26px]

                bg-gradient-to-b
                from-white/[0.03]
                to-transparent
              "
            />

            <div
              className="
                relative

                flex
                items-center
                justify-between

                h-full

                px-3
                sm:px-4
              "
            >
              {/* LEFT SIDE */}
              <div className="flex items-center gap-2 sm:gap-4">
                {bottomItems.slice(0, 2).map((item) => {
                  const Icon = item.icon;

                  const isActive =
                    item.path === basePath
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className="
                        flex
                        flex-col
                        items-center
                        gap-[2px]

                        min-w-[54px]
                      "
                    >
                      <motion.div
                        whileTap={{
                          scale: 0.92,
                        }}
                        whileHover={{
                          y: -2,
                        }}
                        className={`
                          transition-all
                          duration-300

                          ${
                            isActive
                              ? 'text-red-500'
                              : 'text-gray-500'
                          }
                        `}
                      >
                        <Icon
                          size={18}
                          strokeWidth={2.2}
                        />
                      </motion.div>

                      <span
                        className={`
                          text-[9px]
                          font-semibold

                          transition-all
                          duration-300

                          ${
                            isActive
                              ? 'text-red-500'
                              : 'text-gray-500'
                          }
                        `}
                      >
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </div>

              {/* CENTER BUTTON */}
              <div
                className="
                  absolute
                  left-1/2
                  -translate-x-1/2

                  -top-[16px]

                  z-50
                "
              >
                <motion.button
                  whileTap={{
                    scale: 0.94,
                  }}
                  whileHover={{
                    scale: 1.03,
                  }}
                  onClick={() => setExpanded(!expanded)}
                  className="
                    relative

                    w-[64px]
                    h-[64px]

                    sm:w-[70px]
                    sm:h-[70px]

                    rounded-full

                    flex
                    items-center
                    justify-center

                    bg-gradient-to-b
                    from-[#ff4d4d]
                    to-[#ff3131]

                    shadow-[0_0_30px_rgba(255,59,59,0.38)]

                    transition-all
                    duration-300
                  "
                >
                  <div
                    className="
                      absolute
                      inset-[4px]

                      rounded-full

                      border
                      border-white/10
                    "
                  />

                  <motion.div
                    animate={{
                      rotate: expanded ? 180 : 0,
                    }}
                    transition={{
                      duration: 0.22,
                    }}
                    className="relative z-10"
                  >
                    {expanded ? (
                      <X
                        size={24}
                        strokeWidth={2.5}
                        className="text-white"
                      />
                    ) : (
                      <Plus
                        size={24}
                        strokeWidth={2.5}
                        className="text-white"
                      />
                    )}
                  </motion.div>
                </motion.button>
              </div>

              {/* RIGHT SIDE */}
              <div className="flex items-center gap-2 sm:gap-4">
                {bottomItems.slice(2, 4).map((item) => {
                  const Icon = item.icon;

                  const isActive =
                    location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className="
                        flex
                        flex-col
                        items-center
                        gap-[2px]

                        min-w-[54px]
                      "
                    >
                      <motion.div
                        whileTap={{
                          scale: 0.92,
                        }}
                        whileHover={{
                          y: -2,
                        }}
                        className={`
                          transition-all
                          duration-300

                          ${
                            isActive
                              ? 'text-red-500'
                              : 'text-gray-500'
                          }
                        `}
                      >
                        <Icon
                          size={18}
                          strokeWidth={2.2}
                        />
                      </motion.div>

                      <span
                        className={`
                          text-[9px]
                          font-semibold

                          transition-all
                          duration-300

                          ${
                            isActive
                              ? 'text-red-500'
                              : 'text-gray-500'
                          }
                        `}
                      >
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SPACER */}
      <div className="h-24 lg:hidden" />
    </>
  );
};

export default BottomNavigation;
