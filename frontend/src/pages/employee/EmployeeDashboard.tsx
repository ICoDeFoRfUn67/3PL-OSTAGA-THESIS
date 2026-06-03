import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGetPayroll } from '@/hooks/useQueries';
import { EmployeeSidebar } from '@/components/EmployeeSidebar';
import { InfoCard, InfoItem } from '@/components/InfoCard';
import DocumentsSection from "@/components/DocumentsSection";
import { EmployeeEditModal } from '@/components/EmployeeEditModal';
import { PayslipDetailModal } from '@/components/PayslipViewforemployee';
import { EmployeeLeaveRequestForm } from '@/components/EmployeeLeaveRequestForm';
import { EmployeeLeaveHistoryModal } from '@/components/EmployeeLeaveHistoryModal';
import { Modal } from '@/components/Modal';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { authAPI } from '@/api/apiService';
import {
  LayoutDashboard,
  Clock3,
  Wallet,
  FileText,
  User,
  Briefcase,
  LogOut,
  Menu,
  Pencil,
  Moon,
  Sun,
  MapPin,
  Calendar,
  Shield,
  Mail,
  Upload,
  Download,
  Trash2,
  MoreVertical,
  AlertCircle,
  Users,
  Phone
} from 'lucide-react';

import logo from '@/images/3pl1.png';

type Section =
  | 'overview'
  | 'attendance'
  | 'payroll'
  | 'documents'
  | 'information'
  | 'leave';

const navigation = [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: Clock3,
  },
  {
    key: 'payroll',
    label: 'Payroll',
    icon: Wallet,
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: FileText,
  },
  {
    key: 'information',
    label: 'Information',
    icon: User,
  },
  {
    key: 'leave',
    label: 'Leave Request',
    icon: Briefcase,
  },
];

export const EmployeeDashboard = () => {
  const navigate = useNavigate();

  const { employee, logout, setEmployee, setUser } =
    useAuth();

  const [activeSection, setActiveSection] =
    useState<Section>('overview');

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [editOpen, setEditOpen] =
    useState(false);

  const [leaveFormOpen, setLeaveFormOpen] =
    useState(false);
  const [leaveHistoryOpen, setLeaveHistoryOpen] = useState(false);

  const [payslipOpen, setPayslipOpen] =
    useState(false);

  const [selectedPayslip, setSelectedPayslip] =
    useState<any>(null);

  const [darkMode, setDarkMode] =
    useState<boolean>(() => {
      return (
        localStorage.getItem('theme') ===
        'dark'
      );
    });

  /* ===================================
     THEME
  =================================== */

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(
        'theme',
        'light'
      );
    }
  }, [darkMode]);

  /* ===================================
     PAYROLL
  =================================== */

  const payrollQuery = useGetPayroll({
    employee_id: employee?.id,
  });

  const payrolls = useMemo(
    () =>
      normalizeApiResponse(
        payrollQuery.data
      ) as any[],
    [payrollQuery.data]
  );

  /* ===================================
     HELPERS
  =================================== */

  const refreshSessionEmployee = useCallback(async () => {
    try {
      const data = await authAPI.getCurrentUser();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
      }
      if (data.employee) {
        setEmployee(data.employee);
        localStorage.setItem('currentEmployee', JSON.stringify(data.employee));
      }
    } catch (e) {
      console.error(e);
    }
  }, [setEmployee, setUser]);

  const formatCurrency = (
    amount: number
  ) => {
    return new Intl.NumberFormat(
      'en-PH',
      {
        style: 'currency',
        currency: 'PHP',
      }
    ).format(amount || 0);
  };

  /* ===================================
     RENDER SECTION
  =================================== */

  const renderSection = () => {
    switch (activeSection) {
      /* ===================================
         OVERVIEW
      =================================== */
      case 'overview':
  return (
    <div className="space-y-6">

      {/* HERO CARD */}
      <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#8B0000] via-red-700 to-red-900 p-8 shadow-2xl">

        {/* Decorative glow */}
        <div className="absolute -bottom-32 left-0 right-0 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -top-32 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">

          {/* PROFILE IMAGE */}
          <div className="relative">

            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
              <img
                src={
                  employee?.profile_image_url ||
                  'https://via.placeholder.com/300'
                }
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <button
              onClick={() => setEditOpen(true)}
              className="absolute bottom-1 right-1 w-12 h-12 md:w-14 md:h-14 rounded-full bg-red-500 border-4 border-white flex items-center justify-center shadow-xl"
              title="Edit Profile"
              aria-label="Edit Profile"
            >
              <Pencil size={18} className="text-white" />
            </button>

          </div>

          {/* NAME */}
          <h1 className="mt-6 text-3xl md:text-4xl font-bold text-white">
            {employee?.full_name}
          </h1>

          {/* POSITION */}
          <p className="mt-2 text-white/90 text-lg">
            {employee?.position}
          </p>

          {/* LOCATION */}
          <div className="mt-6 w-full max-w-md px-5 py-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center gap-3 text-white">
            <MapPin size={18} />
            <span>
              {employee?.hub_name || 'N/A'}
            </span>
          </div>

          {/* DATE */}
          <div className="mt-3 w-full max-w-xs px-5 py-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center gap-3 text-white">
            <Calendar size={18} />

            <span>
              {employee?.hired_date
                ? new Date(
                    employee.hired_date
                  ).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>

        </div>
      </div>

      {/* EMPLOYEE INFO TITLE */}
      <div>

        <h2 className="text-2xl font-bold text-white">
          Employee Information
        </h2>

        <p className="text-slate-400">
          View your employment details and status
        </p>

      </div>

      {/* INFO GRID */}
      <div className="grid grid-cols-2 gap-4">

        <div className="rounded-3xl bg-[#0B1736] border border-[#1B315F] p-5 shadow-xl">
          <Briefcase
            size={28}
            className="text-red-400 mb-4"
          />

          <p className="text-xs uppercase tracking-wider text-slate-400">
            Employment
          </p>

          <h3 className="mt-2 text-xl font-bold text-white">
            {employee?.employment_type || 'N/A'}
          </h3>
        </div>

        <div className="rounded-3xl bg-[#0B1736] border border-[#1B315F] p-5 shadow-xl">
          <Shield
            size={28}
            className="text-red-400 mb-4"
          />

          <p className="text-xs uppercase tracking-wider text-slate-400">
            Status
          </p>

          <h3 className="mt-2 text-xl font-bold text-white">
            {employee?.status || 'N/A'}
          </h3>
        </div>

        <div className="rounded-3xl bg-[#0B1736] border border-[#1B315F] p-5 shadow-xl">
          <User
            size={28}
            className="text-red-400 mb-4"
          />

          <p className="text-xs uppercase tracking-wider text-slate-400">
            Role
          </p>

          <h3 className="mt-2 text-xl font-bold text-white">
            {employee?.role || 'Employee'}
          </h3>
        </div>

        <div className="rounded-3xl bg-[#0B1736] border border-[#1B315F] p-5 shadow-xl">
          <FileText
            size={28}
            className="text-red-400 mb-4"
          />

          <p className="text-xs uppercase tracking-wider text-slate-400">
            Employee ID
          </p>

          <h3 className="mt-2 text-xl font-bold text-white">
            {employee?.employee_id || 'N/A'}
          </h3>
        </div>

      </div>

    </div>
  );

      /* ===================================
         ATTENDANCE
      =================================== */

      case 'attendance':
        return (
          <div>
            <EmployeeSidebar
              employeeId={
                employee?.id || 0
              }
              employee={employee || {}}
            />
          </div>
        );

      /* ===================================
         PAYROLL
      =================================== */

      case 'payroll':
        return (
          <div className="space-y-4">
            {payrolls && payrolls.length > 0 ? (
              payrolls.map(
                (payroll: any) => (
                  <div
                    key={payroll.id}
                    className="rounded-3xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-5 md:p-6 shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="w-full sm:w-auto">
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-lg md:text-xl">
                          {
                            payroll.pay_period
                          }
                        </p>

                        <p className="mt-2 text-2xl md:text-3xl font-bold text-green-600 dark:text-green-500">
                          {formatCurrency(
                            payroll.net_pay
                          )}
                        </p>
                      </div>

                      <span
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${
                          payroll.status ===
                          'paid'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {payroll.status.toUpperCase()}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPayslip(
                          payroll
                        );

                        setPayslipOpen(true);
                      }}
                      className="mt-5 w-full rounded-2xl bg-[#4F7BFF] hover:bg-[#3d66ff] text-white py-3 font-semibold transition-colors"
                    >
                      View Payslip Details
                    </button>
                  </div>
                )
              )
            ) : (
              <div className="rounded-3xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-8 text-center">
                <Wallet size={40} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400">No payroll records found</p>
              </div>
            )}
          </div>
        );

      /* ===================================
         DOCUMENTS
      =================================== */

      case 'documents':
        return (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1f3a] to-[#0f1728] border border-gray-700 p-8 shadow-2xl">
              {/* Decorative elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -right-40 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl" />
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-600/20 flex items-center justify-center">
                      <FileText size={28} className="text-red-500" />
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-white">Your Documents</h1>
                      <p className="text-gray-300 mt-1">Manage and view your employee documents</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="rounded-3xl bg-[#0F1728] border-2 border-dashed border-gray-600 p-8 shadow-lg">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600/20 to-red-900/20 flex items-center justify-center">
                    <Upload size={32} className="text-red-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Upload Document</h3>
                  <p className="text-gray-400 mb-4">Drag and drop your files here or click to browse</p>
                  <p className="text-sm text-gray-500 mb-6">PDF • DOC • JPG • PNG <span className="text-red-500">(max 5MB)</span></p>
                </div>
                <button className="px-8 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 mx-auto transition-colors shadow-lg">
                  <Upload size={20} />
                  Choose File
                </button>
              </div>
            </div>

            {/* Secure Storage Info */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 p-6 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Shield size={20} className="text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">Secure Storage</h4>
                <p className="text-sm text-gray-400">Your documents are securely stored and only visible to authorized personnel.</p>
              </div>
            </div>
          </div>
        );

      /* ===================================
         INFORMATION
      =================================== */

      case 'information':
        return (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-[#8B0000] to-red-700 p-6 md:p-8 text-white shadow-xl">
              <h2 className="text-2xl md:text-3xl font-bold leading-tight text-white">
                Employee Information
              </h2>

              <p className="mt-2 text-white/90 text-sm md:text-base leading-relaxed">
                Personal details, emergency contact, and government information.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <InfoCard
                title="Personal Information"
                icon={<User size={18} />}
              >
                <InfoItem
                  label="Full Name"
                  value={
                    employee?.full_name
                  }
                />

                <InfoItem
                  label="Gender"
                  value={employee?.gender}
                />

                <InfoItem
                  label="Nationality"
                  value={
                    employee?.nationality
                  }
                />

                <InfoItem
                  label="Marital Status"
                  value={
                    employee?.marital_status
                  }
                />
              </InfoCard>

              <InfoCard
                title="Contact Information"
                icon={<Mail size={18} />}
              >
                <InfoItem
                  label="Email"
                  value={
                    employee?.email_address
                  }
                />

                <InfoItem
                  label="Phone"
                  value={
                    employee?.phone_number
                  }
                />

                <InfoItem
                  label="Address"
                  value={
                    employee?.current_address
                  }
                />
              </InfoCard>

              <InfoCard
                title="Employment Information"
                icon={
                  <Briefcase size={18} />
                }
              >
                <InfoItem
                  label="Position"
                  value={
                    employee?.position
                  }
                />

                <InfoItem
                  label="Hub"
                  value={
                    employee?.hub_name
                  }
                />

                <InfoItem
                  label="Employment Type"
                  value={
                    employee?.employment_type
                  }
                />
              </InfoCard>

              <InfoCard
                title="Government IDs"
                icon={<Shield size={18} />}
              >
                <InfoItem
                  label="TIN"
                  value={employee?.tin}
                />

                <InfoItem
                  label="SSS"
                  value={employee?.sss}
                />

                <InfoItem
                  label="PhilHealth"
                  value={
                    employee?.philhealth
                  }
                />

                <InfoItem
                  label="Pag-IBIG"
                  value={
                    employee?.pagibig
                  }
                />
              </InfoCard>
              <InfoCard
                title="Emergency Contact"
                icon={<User size={18} />}
              >
                <InfoItem
                  label="Contact Name"
                  value={employee?.emergency_contact_name}
                />

                <InfoItem
                  label="Relationship"
                  value={employee?.emergency_contact_relationship}
                />

                <InfoItem
                  label="Phone Number"
                  value={employee?.emergency_contact_phone}
                />
              </InfoCard>
            </div>
          </div>
        );
              

      /* ===================================
         LEAVE
      =================================== */

      case 'leave':
        return (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4F7BFF] to-[#315BFF] p-6 md:p-10 text-white shadow-2xl">
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

              <div className="relative z-10 max-w-2xl">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Briefcase size={32} />
                </div>

                <h2 className="mt-6 text-2xl md:text-3xl font-bold leading-tight text-white">
                  Leave Request
                </h2>

                <p className="mt-4 text-sm md:text-base text-white/90 leading-relaxed">
                  Submit your leave request and monitor approval status through the portal.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() =>
                      setLeaveFormOpen(true)
                    }
                    className="px-6 md:px-8 py-3 rounded-2xl bg-white text-[#315BFF] font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex-1 sm:flex-initial"
                  >
                    Submit Leave
                  </button>
                  <button
                    onClick={() => setLeaveHistoryOpen(true)}
                    className="px-6 md:px-8 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition-all flex-1 sm:flex-initial"
                  >
                    View History
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050C1B] transition-colors">
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      <div className="flex">
        {/* SIDEBAR */}
        <aside
          className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[280px] bg-white dark:bg-[#0F172A]/95 backdrop-blur border-r border-gray-200 dark:border-gray-700 shadow-2xl lg:shadow-none transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* LOGO */}
          <div className="h-20 px-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <img
              src={logo}
              alt="Company Logo"
              className="w-12 h-12 object-contain"
            />

            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                3PL COMPANY
              </h2>
            </div>
          </div>

          {/* PROFILE */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                <img
                  src={
                    employee?.profile_image_url ||
                    'https://via.placeholder.com/150'
                  }
                  alt={employee?.full_name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                  {employee?.full_name}
                </h3>

                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {employee?.position}
                </p>
              </div>
            </div>
          </div>

          {/* NAVIGATION */}
          <div className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;

              const active =
                activeSection === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveSection(
                      item.key as Section
                    );

                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 md:py-4 rounded-2xl transition-all ${
                    active
                      ? 'bg-gradient-to-r from-[#8B0000] to-red-700 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />

                  <span className="font-medium text-sm">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-semibold text-sm"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex-1 min-w-0">
          {/* HEADER */}
          <header className="sticky top-0 z-30 h-20 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 flex items-center justify-between">
            {/* LEFT */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() =>
                  setMobileOpen(true)
                }
                className="lg:hidden w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors text-gray-900 dark:text-gray-100"
                aria-label="Open navigation menu"
                title="Open menu"
              >
                <Menu size={20} />
              </button>

              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
                  3PL COMPANY
                </h1>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center w-14 h-8 rounded-full px-1 transition-colors bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform flex items-center justify-center ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}
                >
                  {darkMode ? (
                    <Sun size={14} className="text-yellow-500" />
                  ) : (
                    <Moon size={14} className="text-gray-700" />
                  )}
                </div>
              </button>

              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                <img
                  src={
                    employee?.profile_image_url ||
                    'https://via.placeholder.com/150'
                  }
                  alt={employee?.full_name || 'Profile'}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </header>

          {/* CONTENT */}
          <main className="p-4 md:p-8 bg-gray-50 dark:bg-[#070B14] min-h-[calc(100vh-5rem)]">
            {renderSection()}
          </main>
        </div>
      </div>

      {/* EDIT MODAL */}
      <EmployeeEditModal
        isOpen={editOpen}
        onClose={() =>
          setEditOpen(false)
        }
        employee={employee}
        onSuccess={() =>
          window.location.reload()
        }
      />

      {/* PAYSLIP */}
      <PayslipDetailModal
        isOpen={payslipOpen}
        onClose={() =>
          setPayslipOpen(false)
        }
        payslip={selectedPayslip}
      />

      {/* LEAVE MODAL */}
      <Modal
        isOpen={leaveFormOpen}
        onClose={() => setLeaveFormOpen(false)}
        title="Leave Request"
        size="xl"
      >
        <div className="p-4 sm:p-6">
          <EmployeeLeaveRequestForm showHeader={false} />
        </div>
      </Modal>

      {/* LEAVE HISTORY */}
      <EmployeeLeaveHistoryModal isOpen={leaveHistoryOpen} onClose={() => setLeaveHistoryOpen(false)} />
    </div>
  );
};

export default EmployeeDashboard;