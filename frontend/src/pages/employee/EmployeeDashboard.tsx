import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGetPayroll, useGetDocuments } from '@/hooks/useQueries';
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
  Phone,
  Activity,
  CreditCard,
  Heart,
  Home,
  ArrowRight,
  Eye,
  Plane,
  ChevronRight
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

  const documentsQuery = useGetDocuments({
    employee_id: employee?.id,
  });

  const documentsList = useMemo(
    () =>
      normalizeApiResponse(
        documentsQuery.data
      ) as any[],
    [documentsQuery.data]
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
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#4A0000] via-[#8B0000] to-[#3B0000] p-6 md:p-8 shadow-2xl border border-red-900/30">
              {/* Glow rings */}
              <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />

              <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8">
                {/* PROFILE IMAGE */}
                <div className="relative flex-shrink-0">
                  <div className="w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-[6px] border-white/10 shadow-2xl relative">
                    <img
                      src={employee?.profile_image_url || 'https://via.placeholder.com/300'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* PROFILE DETAILS */}
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      {employee?.full_name}
                    </h1>
                    <p className="text-slate-300 text-lg font-medium">{employee?.position}</p>
                  </div>

                  <div className="flex flex-col gap-2.5 max-w-sm sm:max-w-md">
                    <div className="px-4 py-2 rounded-2xl bg-black/35 backdrop-blur-md border border-white/5 flex items-center gap-3 text-sm text-slate-300 font-semibold shadow-sm w-fit max-w-full">
                      <MapPin size={16} className="text-red-400 flex-shrink-0" />
                      <span className="truncate">{employee?.hub_name || 'N/A'}</span>
                    </div>

                    <div className="px-4 py-2 rounded-2xl bg-black/35 backdrop-blur-md border border-white/5 flex items-center gap-3 text-sm text-slate-300 font-semibold shadow-sm w-fit">
                      <Calendar size={16} className="text-red-400 flex-shrink-0" />
                      <span>
                        {employee?.hired_date
                          ? new Date(employee.hired_date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM EDIT PROFILE CARD (matching Image 2) */}
              <div 
                onClick={() => setEditOpen(true)}
                className="relative z-10 mt-6 bg-white hover:bg-slate-50 transition-all rounded-[20px] p-4 flex items-center justify-between shadow-md cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
                    <User size={22} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Edit Profile</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Update your personal information</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* EMPLOYEE INFO TITLE */}
            <div className="flex items-start gap-3 mt-8">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-500 border border-red-200 dark:border-red-500/20 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm">
                <FileText size={22} />
              </div>
              <div className="space-y-0.5 text-left">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Employee Information</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">View your employment details and status</p>
              </div>
            </div>

            {/* INFO GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm dark:shadow-xl transition-all">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-500 border border-red-150 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={22} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Employment</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white uppercase truncate">{employee?.employment_type || 'N/A'}</h3>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm dark:shadow-xl transition-all">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-500 border border-red-150 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Activity size={22} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Status</p>
                  <h3 className={`mt-1 text-lg font-extrabold truncate ${
                    employee?.status?.toLowerCase() === 'resign' ? 'text-amber-600 dark:text-[#F59E0B]' : 'text-emerald-600 dark:text-[#10B981]'
                  }`}>{employee?.status || 'N/A'}</h3>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm dark:shadow-xl transition-all">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-500 border border-red-150 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <User size={22} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Role</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white capitalize truncate">{employee?.role || 'Employee'}</h3>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm dark:shadow-xl transition-all">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-500 border border-red-150 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={22} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Employee ID</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white truncate">{employee?.employee_id || 'N/A'}</h3>
                </div>
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
          <DocumentsSection
            documents={documentsList}
            employeeId={employee?.id || 0}
            onUpdate={() => documentsQuery.refetch()}
          />
        );

      /* ===================================
         INFORMATION
      =================================== */

      case 'information':
        return (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-[24px] bg-gradient-to-br from-[#4A0000] via-[#8B0000] to-[#3B0000] p-6 md:p-8 text-white shadow-xl border border-red-900/30 flex items-center gap-4 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/30 flex items-center justify-center flex-shrink-0">
                <User size={24} className="text-red-400" />
              </div>
              <div className="text-left">
                <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
                  Employee Information
                </h2>
                <p className="mt-1 text-slate-300 text-xs md:text-sm">
                  Personal details, emergency contact, and government information.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Employment Information Card */}
              <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-600 dark:text-red-500 flex items-center justify-center">
                      <Briefcase size={20} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Employment Information</h3>
                  </div>
                  <div className="text-[#C41E3A] font-bold text-lg cursor-pointer">•••</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <User size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Position</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.position || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <MapPin size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Hub</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.hub_name || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Briefcase size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Employment Type</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.employment_type || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Government IDs Card */}
              <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-600 dark:text-red-500 flex items-center justify-center">
                      <Shield size={20} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Government IDs</h3>
                  </div>
                  <div className="text-[#C41E3A] font-bold text-lg cursor-pointer">•••</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <CreditCard size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">TIN</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.tin || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Shield size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">SSS</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.sss || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Heart size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">PhilHealth</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.philhealth || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Home size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Pag-IBIG</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.pagibig || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Card */}
              <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-650 dark:text-red-500 flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Emergency Contact</h3>
                  </div>
                  <div className="text-[#C41E3A] font-bold text-lg cursor-pointer">•••</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Users size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Contact Name</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.emergency_contact_name || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Users size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Relationship</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.emergency_contact_relationship || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Phone size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Phone Number</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.emergency_contact_phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Personal Information Card */}
              <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-650 dark:text-red-500 flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h3>
                  </div>
                  <div className="text-[#C41E3A] font-bold text-lg cursor-pointer">•••</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <User size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Full Name</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.full_name || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <User size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Gender</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.gender || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <MapPin size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Nationality</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.nationality || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Users size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Marital Status</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.marital_status || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Contact Details Card */}
              <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-650 dark:text-red-500 flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Contact Details</h3>
                  </div>
                  <div className="text-[#C41E3A] font-bold text-lg cursor-pointer">•••</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <User size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Email Address</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto truncate max-w-[200px] sm:max-w-xs">{employee?.email_address || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <Phone size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Phone Number</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.phone_number || 'N/A'}</span>
                  </div>

                  <div className="flex items-center border-b border-slate-100 dark:border-slate-800/50 pb-3 last:border-b-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                      <MapPin size={16} />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold ml-3">Current Address</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white ml-auto">{employee?.current_address || 'N/A'}</span>
                  </div>
                </div>
              </div>
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
          <header className="sticky top-0 z-30 h-20 bg-white/95 dark:bg-[#050C1B]/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-transparent px-4 md:px-8 flex items-center justify-between transition-colors">
            {/* LEFT */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() =>
                  setMobileOpen(true)
                }
                className="lg:hidden w-12 h-12 rounded-2xl flex items-center justify-center border transition-all text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-black/20 border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-black/35"
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
            <div className="flex items-center gap-2.5 md:gap-3.5">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative w-14 h-8 rounded-full p-1 transition-colors flex items-center cursor-pointer border ${
                  darkMode
                    ? 'bg-slate-950/40 border-white/5'
                    : 'bg-slate-200 border-slate-300'
                }`}
                aria-label="Toggle Theme"
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white dark:bg-[#0F172A] shadow-md transform transition-transform flex items-center justify-center border ${
                    darkMode
                      ? 'translate-x-6 border-white/5'
                      : 'translate-x-0 border-slate-200'
                  }`}
                >
                  {darkMode ? (
                    <Sun size={14} className="text-yellow-500 animate-pulse" />
                  ) : (
                    <Moon size={14} className="text-slate-650" />
                  )}
                </div>
              </button>

              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-slate-350 dark:border-amber-500/50 hover:border-slate-400 dark:hover:border-amber-500/80 transition-all shadow-sm">
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