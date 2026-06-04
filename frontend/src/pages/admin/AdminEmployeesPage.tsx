import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { EmployeeManagePanel } from '@/components/EmployeeManagePanel';
import { AddEmployee } from '@/pages/admin/AddEmployee';

import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTheme, ThemeToggle } from '@/context/ThemeContext';

import {
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Plus,
  User,
  Search,
} from 'lucide-react';

import AdminMobileProfile from '@/components/AdminMobileProfile';
import OnlinePresence from '@/components/OnlinePresence';

export const AdminEmployeesPage = () => {
  const { user, canEditEmployeeInfo, logout, canViewEmployees } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [searchEmployeesTerm, setSearchEmployeesTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (showAdd) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        <div className="hidden lg:block">
          <Sidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>

        <div className="p-4 lg:p-6 lg:ml-64 pb-32 lg:pb-6">
          <AddEmployee
            onClose={() => setShowAdd(false)}
            onCancel={() => setShowAdd(false)}
            onCreated={() => setShowAdd(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      <div className="lg:ml-64">
        <AdminMobileProfile />
        <div className="p-4 lg:p-6 space-y-6 max-md:p-3 max-md:space-y-4 pb-32 lg:pb-6">

        {/* Mobile title removed — AdminMobileProfile provides the header */}

        {/* ONLINE PRESENCE (Admins/HR only) */}
        {/* (moved below desktop header so it sits above the employee table) */}

        {/* DESKTOP HEADER */}
        <div className="hidden md:block">
          <div className="mb-4">
            <h1 className="text-3xl font-bold mb-1">
              Employee Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Manage employees and their information
            </p>
          </div>

          {/* Search and Filter container */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="relative flex-1 min-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchEmployeesTerm}
                onChange={(e) => setSearchEmployeesTerm(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-9 pr-3 text-sm text-gray-800 dark:text-gray-100 outline-none transition-colors duration-150 focus:ring-2 focus:ring-red-300/30"
                aria-label="Search employees"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title="Filter by employee status"
              aria-label="Filter by status"
              className="h-10 min-w-[140px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-8 text-sm text-gray-800 dark:text-gray-100 outline-none transition-colors duration-150 focus:ring-2 focus:ring-red-300/30 appearance-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Resign">Resign</option>
              <option value="AWOL">AWOL</option>
              <option value="Blacklist">Blacklist</option>
            </select>

            {canEditEmployeeInfo && (
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Employee
              </button>
            )}
          </div>
        </div>

        {/* ONLINE PRESENCE (Admins/HR only) */}
        {canViewEmployees && (
          <div className="mt-4">
            <OnlinePresence />
          </div>
        )}

        {/* EMPLOYEE PANEL */}
        <EmployeeManagePanel searchTerm={searchEmployeesTerm} statusFilter={statusFilter} />

        {/* MOBILE FLOATING ADD BUTTON */}
        {canEditEmployeeInfo && (
          <button
            title="Add employee"
            onClick={() => setShowAdd(true)}
            className="
                md:hidden
                    fixed
                    bottom-28
              right-4
              z-50
              w-12
              h-12
              rounded-full
              bg-blue-600
              hover:bg-blue-700
              text-white
              shadow-xl
              flex
              items-center
              justify-center
            "
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
      </div>
    </div>
  );
};

export default AdminEmployeesPage;
