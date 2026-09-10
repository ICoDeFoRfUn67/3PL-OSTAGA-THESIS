import { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';

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
  Briefcase,
  CreditCard,
  Sparkles,
  Plus,
  X,
  ChevronRight,
} from 'lucide-react';

type BottomNavigationProps = {
  className?: string;
};

export const BottomNavigation = ({
  className = '',
}: BottomNavigationProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { isDarkMode } = useTheme();

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
   * PRIMARY 4 DOCK ITEMS
   */
  const bottomItems = useMemo(
    () => [
      {
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: basePath,
      },
      {
        label: 'Delivery Centers',
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
   * ALL EXTENDED MODULES (3x3 Grid in Menu Launcher)
   */
  const menuModules = useMemo(
    () => [
      {
        label: 'Applications',
        desc: 'Applicant Requests',
        icon: Briefcase,
        path: `${basePath}/application-requests`,
        badge: 'NEW',
        gradient: 'from-emerald-500 to-teal-600',
        colorClass: 'text-emerald-500',
        bgGlow: 'bg-emerald-500/10',
      },
      {
        label: 'Payment Accts',
        desc: 'Disbursement Info',
        icon: CreditCard,
        path: `${basePath}/payment-accounts`,
        badge: 'NEW',
        gradient: 'from-blue-500 to-indigo-600',
        colorClass: 'text-blue-500',
        bgGlow: 'bg-blue-500/10',
      },
      {
        label: 'AI Predictions',
        desc: 'Workforce Models',
        icon: Sparkles,
        path: `${basePath}/predictions`,
        badge: 'AI',
        gradient: 'from-amber-500 to-orange-600',
        colorClass: 'text-amber-500',
        bgGlow: 'bg-amber-500/10',
      },
      {
        label: 'Attendance',
        desc: 'Daily Check-ins',
        icon: Clock3,
        path: `${basePath}/attendance`,
        gradient: 'from-cyan-500 to-blue-600',
        colorClass: 'text-cyan-500',
        bgGlow: 'bg-cyan-500/10',
      },
      {
        label: 'Payroll',
        desc: 'Payslip Records',
        icon: DollarSign,
        path: `${basePath}/payslip`,
        gradient: 'from-green-500 to-emerald-600',
        colorClass: 'text-green-500',
        bgGlow: 'bg-green-500/10',
      },
      {
        label: 'Leave Requests',
        desc: 'Leave Approvals',
        icon: CalendarDays,
        path: `${basePath}/leave-requests`,
        gradient: 'from-rose-500 to-pink-600',
        colorClass: 'text-rose-500',
        bgGlow: 'bg-rose-500/10',
      },
      {
        label: 'Access Control',
        desc: 'Roles & Logins',
        icon: Lock,
        path: `${basePath}/access-control`,
        gradient: 'from-purple-500 to-violet-600',
        colorClass: 'text-purple-500',
        bgGlow: 'bg-purple-500/10',
      },
      {
        label: 'Activity Logs',
        desc: 'Audit Trail',
        icon: Activity,
        path: `${basePath}/activity-logs`,
        gradient: 'from-sky-500 to-blue-600',
        colorClass: 'text-sky-500',
        bgGlow: 'bg-sky-500/10',
      },
      {
        label: 'Security Alerts',
        desc: 'Event Monitoring',
        icon: AlertTriangle,
        path: `${basePath}/security-alerts`,
        gradient: 'from-red-500 to-rose-600',
        colorClass: 'text-red-500',
        bgGlow: 'bg-red-500/10',
      },
    ],
    [basePath]
  );

  const handleNavigate = (path: string) => {
    setExpanded(false);
    navigate(path);
  };

  return (
    <>
      {/* BACKDROP */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setExpanded(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* QUICK MENU LAUNCHER SHEET */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-[88px] left-0 right-0 z-[9995] flex justify-center px-3 lg:hidden pointer-events-auto"
          >
            <div
              className={`w-full max-w-[390px] rounded-[28px] p-4 border shadow-2xl backdrop-blur-2xl transition-all ${
                isDarkMode
                  ? 'border-white/10 bg-[#081224]/95 shadow-[0_25px_60px_rgba(0,0,0,0.85)]'
                  : 'border-gray-200 bg-white/95 shadow-[0_20px_50px_rgba(0,0,0,0.2)]'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    All Modules
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 uppercase">
                    {normalizedRole}
                  </span>
                </div>

                <button
                  onClick={() => setExpanded(false)}
                  className={`p-1.5 rounded-full text-xs transition-colors ${
                    isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'
                  }`}
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 3x3 Modules Grid */}
              <div className="grid grid-cols-3 gap-2">
                {menuModules.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center group ${
                        isActive
                          ? 'border-red-500/50 bg-red-500/10 shadow-xs'
                          : isDarkMode
                          ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10'
                          : 'border-gray-100 bg-gray-50/70 hover:bg-gray-100/80 hover:border-gray-200'
                      }`}
                    >
                      {/* Badge if exists */}
                      {item.badge && (
                        <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider leading-tight shadow-xs ${
                          item.badge === 'AI'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Icon Circle */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs bg-gradient-to-br ${item.gradient} transition-transform group-hover:scale-105`}
                      >
                        <Icon size={18} strokeWidth={2.2} />
                      </div>

                      {/* Label */}
                      <span className={`text-[10px] font-bold mt-1.5 leading-tight truncate w-full ${
                        isActive
                          ? 'text-red-500 dark:text-red-400'
                          : isDarkMode
                          ? 'text-white/90 group-hover:text-white'
                          : 'text-gray-800 group-hover:text-gray-950'
                      }`}>
                        {item.label}
                      </span>

                      {/* Sub-label */}
                      <span className={`text-[8px] leading-tight truncate w-full ${
                        isDarkMode ? 'text-white/40' : 'text-gray-400'
                      }`}>
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING BOTTOM DOCK BAR */}
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
          <div
            className={`relative h-[72px] sm:h-[76px] rounded-[26px] overflow-visible border ${
              isDarkMode
                ? 'border-white/10 bg-[rgba(8,15,35,0.96)] backdrop-blur-[24px] shadow-[0_16px_40px_rgba(0,0,0,0.45)]'
                : 'border-gray-200 bg-white/95 backdrop-blur-[24px] shadow-lg'
            }`}
          >
            {/* INNER LIGHT ACCENT */}
            <div
              className={`absolute inset-0 rounded-[26px] pointer-events-none ${
                isDarkMode
                  ? 'bg-gradient-to-b from-white/[0.04] to-transparent'
                  : 'bg-gradient-to-b from-black/[0.02] to-transparent'
              }`}
            />

            <div className="relative flex items-center justify-between h-full px-3 sm:px-4">
              {/* LEFT SIDE (Dashboard & Hubs) */}
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
                      onClick={() => setExpanded(false)}
                      className="flex flex-col items-center gap-[2px] min-w-[54px]"
                    >
                      <motion.div
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ y: -2 }}
                        className={`transition-all duration-300 ${
                          isActive
                            ? 'text-red-500'
                            : isDarkMode
                            ? 'text-white/80'
                            : 'text-gray-500'
                        }`}
                      >
                        <Icon size={19} strokeWidth={2.2} />
                      </motion.div>

                      <span
                        className={`text-[9px] font-semibold transition-all duration-300 ${
                          isActive
                            ? 'text-red-500 font-bold'
                            : isDarkMode
                            ? 'text-white/80'
                            : 'text-gray-500'
                        }`}
                      >
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </div>

              {/* CENTER MENU BUTTON (Floating Red Circle) */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-[16px] z-50">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.04 }}
                  onClick={() => setExpanded(!expanded)}
                  aria-label="Toggle Quick Navigation Menu"
                  className="relative w-[64px] h-[64px] sm:w-[70px] sm:h-[70px] rounded-full flex items-center justify-center bg-gradient-to-b from-[#ff4d4d] to-[#e62020] shadow-[0_0_32px_rgba(255,59,59,0.45)] transition-all"
                >
                  <div className="absolute inset-[3px] rounded-full border border-white/20" />

                  <motion.div
                    animate={{ rotate: expanded ? 135 : 0 }}
                    transition={{ duration: 0.22 }}
                    className="relative z-10"
                  >
                    <Plus
                      size={26}
                      strokeWidth={2.6}
                      className="text-white drop-shadow-sm"
                    />
                  </motion.div>
                </motion.button>
              </div>

              {/* RIGHT SIDE (Employees & Edit) */}
              <div className="flex items-center gap-2 sm:gap-4">
                {bottomItems.slice(2, 4).map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setExpanded(false)}
                      className="flex flex-col items-center gap-[2px] min-w-[54px]"
                    >
                      <motion.div
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ y: -2 }}
                        className={`transition-all duration-300 ${
                          isActive
                            ? 'text-red-500'
                            : isDarkMode
                            ? 'text-white/80'
                            : 'text-gray-500'
                        }`}
                      >
                        <Icon size={19} strokeWidth={2.2} />
                      </motion.div>

                      <span
                        className={`text-[9px] font-semibold transition-all duration-300 ${
                          isActive
                            ? 'text-red-500 font-bold'
                            : isDarkMode
                            ? 'text-white/80'
                            : 'text-gray-500'
                        }`}
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

      {/* BOTTOM SPACER */}
      <div className="h-24 lg:hidden" />
    </>
  );
};

export default BottomNavigation;
