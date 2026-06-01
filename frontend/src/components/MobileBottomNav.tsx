import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, MapPin, Lock, Clock, DollarSign, Activity, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Re‑use the navigation definition from Sidebar for consistency
const navItems = [
  { label: 'Dashboard', icon: Home, path: (role: string) => role === 'admin' ? '/admin' : role === 'hr' ? '/hr' : '/employee', roles: ['admin', 'hr'] },
  { label: 'Employees', icon: Users, path: (role: string) => role === 'admin' ? '/admin/employees' : role === 'hr' ? '/hr/employees' : '/employee', roles: ['admin', 'hr'] },
  {
    label: 'Employee Request',
    icon: FileText,
    roles: ['admin', 'hr'],
    children: [
      { label: 'Edit Request', path: (role: string) => role === 'admin' ? '/admin/edit-requests' : '/hr/edit-requests' },
      { label: 'Leave Request', path: (role: string) => role === 'admin' ? '/admin/leave-requests' : '/hr/leave-requests' },
    ],
  },
  { label: 'Hubs', icon: MapPin, path: (role: string) => role === 'admin' ? '/admin/hubs' : role === 'hr' ? '/hr/hubs' : '/employee', roles: ['admin', 'hr'] },
  { label: 'Access Control', icon: Lock, path: (role: string) => role === 'admin' ? '/admin/access-control' : role === 'hr' ? '/hr/access-control' : '/employee', roles: ['admin', 'hr'] },
  { label: 'Attendance', icon: Clock, path: (role: string) => role === 'employee' ? '/employee/attendance' : role === 'hr' ? '/hr/attendance' : '/admin/attendance', roles: ['admin', 'hr'] },
  { label: 'Payroll', icon: DollarSign, path: (role: string) => role === 'admin' ? '/admin/payslip' : role === 'hr' ? '/hr/payslip' : '/employee', roles: ['admin', 'hr'] },
  { label: 'Activity Logs', icon: Activity, path: (role: string) => role === 'admin' ? '/admin/activity-logs' : role === 'hr' ? '/hr/activity-logs' : '/employee', roles: ['admin', 'hr'] },
  { label: 'Security Alerts', icon: AlertTriangle, path: (role: string) => role === 'admin' ? '/admin/security-alerts' : role === 'hr' ? '/hr/security-alerts' : '/employee', roles: ['admin', 'hr'] },
];

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const rawRole = (user?.role || '').toString().trim().toLowerCase();
  const normalizedRole = rawRole.includes('admin') ? 'admin' : rawRole.includes('hr') ? 'hr' : rawRole;

  // Build flat list for tabs (ignore submenu – use parent label only)
  const tabs = navItems.filter((item) => item.roles?.includes(normalizedRole) && !item.children);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-700 bg-[#081120]/80 backdrop-blur-md md:hidden">
      {tabs.map((item) => {
        const Icon = item.icon as any;
        const path = (typeof item.path === 'function' ? item.path(normalizedRole) : item.path) as string;
        const active = isActive(path);
        return (
          <button
            key={item.label}
            onClick={() => navigate(path)}
            className={`flex-1 py-2 flex flex-col items-center justify-center gap-1 ${active ? 'bg-gradient-to-r from-[#FF2D55] to-[#C4001C] text-white' : 'text-gray-400'} transition-colors`}
            aria-label={item.label}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
