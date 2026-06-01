import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronDown,
  LogOut,
  Grid,
  MapPin,
  Users,
  Edit3,
  Sun,
  Moon,
  Calendar,
  CreditCard,
  Clock,
  FileText,
  ShieldAlert,
  Lock,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';

const iconMap: Record<string, any> = {
  '/admin': Grid,
  '/admin/hubs': MapPin,
  '/admin/employees': Users,
  '/admin/edit-requests': Edit3,
  '/admin/leave-requests': Calendar,
  '/admin/payslip': CreditCard,
  '/admin/attendance': Clock,
  '/admin/activity-logs': FileText,
  '/admin/security-alerts': ShieldAlert,
  '/admin/access-control': Lock,
};

const titleMap: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/hubs': 'Hubs',
  '/admin/employees': 'Employees',
  '/admin/edit-requests': 'Edit Requests',
  '/admin/leave-requests': 'Leave Requests',
  '/admin/payslip': 'Payslips',
  '/admin/attendance': 'Attendance',
  '/admin/activity-logs': 'Activity Logs',
  '/admin/security-alerts': 'Security Alerts',
  '/admin/access-control': 'Access Control',
};

const subtitleMap: Record<string, string> = {
  '/admin': 'Overview of your network',
  '/admin/hubs': 'Manage hub locations',
  '/admin/employees': 'Workforce management',
  '/admin/edit-requests': 'Pending modifications',
  '/admin/leave-requests': 'Manage employee leaves',
  '/admin/payslip': 'Payroll history & generation',
  '/admin/attendance': 'Track daily check-ins',
  '/admin/activity-logs': 'System audit trail',
  '/admin/security-alerts': 'Monitor system events',
  '/admin/access-control': 'Roles & permissions',
};

function AdminMobileProfile() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const getPageMeta = (pathname: string) => {
    let cleanPath = pathname.replace(/\/$/, '') || '/';
    // Normalize HR paths to Admin paths for key lookup
    const key = cleanPath.replace(/^\/hr/, '/admin');

    if (titleMap[key]) {
      return {
        title: titleMap[key],
        subtitle: subtitleMap[key],
        Icon: iconMap[key],
      };
    }

    if (key.startsWith('/admin/employees/')) {
      return {
        title: 'Employee Profile',
        subtitle: 'Detailed employee view',
        Icon: Users,
      };
    }

    if (key.startsWith('/admin/edit-requests/')) {
      return {
        title: 'Edit Request Details',
        subtitle: 'Modify employee information',
        Icon: Edit3,
      };
    }

    return {
      title: 'Dashboard',
      subtitle: 'Overview of your network',
      Icon: Grid,
    };
  };

  const { title: pageTitle, subtitle: pageSubtitle, Icon: IconComp } = getPageMeta(location.pathname);

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout?.();
    } catch (error) {
      console.error(
        'Logout failed:',
        error
      );
    }
  };

  return (
    <div className="block md:hidden">
      <div className="relative px-3 pt-3">

        {/* BACKGROUND GLOW */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 right-0 w-52 h-52 blur-[120px] ${isDarkMode ? 'bg-red-600/20' : 'bg-gray-300/30'}`} />
        </div>

        {/* HEADER CARD */}
        <div className={`relative overflow-visible rounded-[30px] border ${isDarkMode ? 'border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.75)] bg-gradient-to-r from-[#040B18] via-[#050505] to-[#180707] backdrop-blur-xl' : 'border-gray-200 bg-white/90 shadow-sm'}`}>

          {/* DECORATIVE RED LINES */}
          <div className="absolute inset-0 overflow-hidden rounded-[30px]">
            <div className="absolute top-0 right-16 h-full w-px bg-gradient-to-b from-red-500/30 to-transparent rotate-[30deg]" />
            <div className="absolute top-0 right-28 h-full w-px bg-gradient-to-b from-red-500/20 to-transparent rotate-[30deg]" />
          </div>

          <div className="relative z-10 p-4">

            <div className="flex items-center justify-between">

              {/* LEFT */}
              <div className="flex items-center gap-3">

                {/* LOGO */}
                <div className="flex items-center gap-3">

                  <div className="w-16 h-16 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-center">
                    <img
                      src="/MOBILELOGOLOGIN.png"
                      alt="logo"
                      className="h-12 w-auto object-contain"
                    />
                  </div>

                  <div className="w-px h-12 bg-white/10" />
                </div>

                {/* PAGE INFO */}
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-lg font-bold leading-none`}>
                      {pageTitle}
                    </h1>

                    <p className={`${isDarkMode ? 'text-white/50' : 'text-gray-600'} text-xs mt-1`}>
                      {pageSubtitle}
                    </p>
                  </div>

                </div>
              </div>

              {/* PROFILE */}
              <div
                ref={dropdownRef}
                className="relative"
              >
                <button
                  onClick={() => setOpen(!open)}
                  className={`flex items-center gap-2 rounded-full border px-2 py-1 ${isDarkMode ? 'border-white/10 bg-white/[0.04] backdrop-blur-xl' : 'border-gray-200 bg-white'}`}>

                  {/* AVATAR */}
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${isDarkMode ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-[0_0_18px_rgba(255,0,0,0.35)]' : 'bg-gray-200 text-gray-800' } text-sm` }>
                      {user?.username?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white" />
                  </div>

                  <div className="text-left max-w-[70px]">
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} text-sm font-semibold truncate`}>{user?.username || 'admin'}</p>
                    <p className={`${isDarkMode ? 'text-white/50' : 'text-gray-600'} text-[11px]`}>{user?.role || 'Admin'}</p>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-white/50 transition-transform duration-300 ${
                      open
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>

                {/* DROPDOWN */}
                {open && (
                  <div className={`absolute right-0 top-[62px] ${isDarkMode ? 'w-48 rounded-2xl border border-white/10 bg-[#0B1220] backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)]' : 'w-44 rounded-xl border border-gray-200 bg-white shadow-lg'} overflow-hidden z-50`}>

                    <div className={`px-4 py-2 ${isDarkMode ? 'border-b border-white/5' : 'border-b border-gray-100'}`}>
                      <p className={`${isDarkMode ? 'text-red-400' : 'text-gray-500'} text-[10px] uppercase tracking-[0.25em] font-bold`}>Account</p>
                    </div>

                    <div className={`px-4 py-3 flex items-center gap-3 ${isDarkMode ? 'border-b border-white/5' : 'border-b border-gray-100'}`}>
                      <div className={`${isDarkMode ? 'w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-500 text-white flex items-center justify-center font-bold' : 'w-8 h-8 rounded-full bg-gray-200 text-gray-800 flex items-center justify-center font-semibold'}`}>
                        {user?.username?.charAt(0)?.toUpperCase() || 'A'}
                      </div>

                      <div>
                        <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-sm`}>{user?.username || 'admin'}</p>
                        <p className={`${isDarkMode ? 'text-white/50' : 'text-gray-600'} text-xs`}>{user?.role || 'Admin'}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      className={`w-full px-4 py-3 flex items-center justify-between ${isDarkMode ? 'border-b border-white/5 hover:bg-white/[0.04]' : 'hover:bg-gray-50'} text-left`}
                    >
                      <div className="flex items-center gap-2">
                        {isDarkMode ? (
                          <Moon className="w-4 h-4 text-white/70" />
                        ) : (
                          <Sun className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className={`${isDarkMode ? 'text-white/80' : 'text-gray-700'} text-sm`}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                      </div>
                      <div className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${isDarkMode ? 'bg-red-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>

                    <button
                      onClick={handleLogout}
                      className={`w-full px-4 py-3 flex items-center gap-3 ${isDarkMode ? 'text-white/80 hover:bg-red-500/10' : 'text-gray-700 hover:bg-gray-50' } transition-all duration-200`}
                    >
                      <LogOut className={`w-4 h-4 ${isDarkMode ? 'text-red-400' : 'text-gray-600'}`} />
                      <span className="text-sm font-medium">Logout</span>
                    </button>

                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminMobileProfile;