import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useGetPayroll, useGetDocuments } from '@/hooks/useQueries';

// removed unused InfoCard imports
import DocumentsSection from "@/components/DocumentsSection";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { EmployeeEditModal } from '@/components/EmployeeEditModal';
import { PayslipDetailModal } from '@/components/PayslipViewforemployee';
import { EmployeeLeaveRequestForm } from '@/components/EmployeeLeaveRequestForm';
import { AttachmentPreviewModal } from '@/components/AttachmentPreviewModal';
import EmployeeAttendanceAnalytics from '@/components/EmployeeAttendanceAnalytics';
import { AttendanceHistoryScreen } from './AttendanceHistoryScreen';
import { apiClient } from '@/api/apiService';
import { LoadingSpinner } from '@/components/common';

import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import {
  LayoutDashboard,
  Clock3,
  Wallet,
  FileText,
  User,
  Briefcase,
  LogOut,
  Menu,
  Moon,
  Sun,
  MapPin,
  Calendar,
  Shield,
  Users,
  Phone,
  Activity,
  CreditCard,
  Heart,
  Home,
  Globe,
  Mail,
  Clock,
  ChevronLeft,
  ScanLine,
  QrCode,
} from 'lucide-react';

import logo from '@/images/3pl1.png';
import { EmployeePaymentAccountsTab } from '@/components/EmployeePaymentAccountsTab';
import { IDScanner } from '@/components/IDScanner';
import { documentAPI } from '@/api/apiService';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/api';
import { useToast } from '@/hooks/useToast';

type Section =
  | 'overview'
  | 'attendance'
  | 'payroll'
  | 'payslip_detail'
  | 'payslip_history'
  | 'payment_account'
  | 'id_scanner'
  | 'documents'
  | 'information'
  | 'leave'
  | 'leave_history';

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
    label: 'Payslip',
    icon: Wallet,
  },
  {
    key: 'documents',
    label: "Documents and ID's",
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
  {
    key: 'payment_account',
    label: 'Payment Account',
    icon: CreditCard,
  },
];

export const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // allow navigation to this page with a desired active section via location.state
    const state: any = (location && (location.state as any)) || {};
    if (state?.activeSection) {
      setActiveSection(state.activeSection as Section);
      // clear the navigation state so it doesn't persist on reloads
      try {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      } catch (e) {
        // ignore
      }
    }
  }, [location]);

  const { employee, logout } =
    useAuth();

  const formatEmployeeAddress = (emp: any) => {
    if (!emp) return 'N/A';
    const parts = [
      emp.barangay,
      emp.city_municipality,
      emp.province,
      emp.region,
      emp.zip_code ? `ZIP: ${emp.zip_code}` : ''
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : 'N/A';
  };

  const [activeSection, setActiveSection] =
    useState<Section>('overview');

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [editOpen, setEditOpen] =
    useState(false);

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveItems, setLeaveItems] = useState<any[]>([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [leaveCancelLoading, setLeaveCancelLoading] = useState(false);
  const [leavePreviewFile, setLeavePreviewFile] = useState<{ url: string; type: 'image' | 'pdf' | 'other' } | null>(null);

  const [selectedPayslip, setSelectedPayslip] =
    useState<any>(null);
  const [payslipOpenedFromHistory, setPayslipOpenedFromHistory] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const queryClient = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const darkMode = isDarkMode;
  const setDarkMode = () => toggleDarkMode();

  /* ===================================
     LEAVE HISTORY DATA FETCH
  =================================== */
  useEffect(() => {
    if (activeSection !== 'leave_history') return;
    if (!employee?.id) return;
    const fetchLeaveItems = async () => {
      try {
        setLeaveLoading(true);
        const res = await apiClient.get('/leave-requests/', {
          params: { employee_id: employee.id },
        });
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.results ?? [];
        setLeaveItems(list);
      } catch (e) {
        console.error('Failed to load leave history', e);
      } finally {
        setLeaveLoading(false);
      }
    };
    fetchLeaveItems();
  }, [activeSection, employee?.id]);



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
                  <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="space-y-0.5">
                    <h1 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight">
                      {employee?.full_name}
                    </h1>
                    <p className="text-slate-300 text-xs font-semibold">{employee?.position}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <div className="px-2.5 py-1 rounded-lg bg-black/35 backdrop-blur-md border border-white/5 flex items-center gap-1.5 text-[10px] text-slate-300 font-bold shadow-sm w-fit max-w-full">
                      <MapPin size={11} className="text-red-400 flex-shrink-0" />
                      <span className="truncate">{employee?.hub_name || 'N/A'}</span>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-black/35 backdrop-blur-md border border-white/5 flex items-center gap-1.5 text-[10px] text-slate-300 font-bold shadow-sm w-fit">
                      <Calendar size={11} className="text-red-400 flex-shrink-0" />
                      <span>
                        {employee?.hired_date
                          ? new Date(employee.hired_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Edit Profile moved to Information tab; Payslip History moved to Payroll tab */}
                </div>
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

            {/* INFO GRID - Always 2 cols x 2 rows */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm dark:shadow-xl transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-500 border border-red-150 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={18} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Employment</p>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white uppercase truncate">{employee?.employment_type || 'N/A'}</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm dark:shadow-xl transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-500 border border-red-150 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <Activity size={18} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Status</p>
                  <h3 className={`mt-0.5 text-sm font-extrabold truncate ${
                    employee?.status?.toLowerCase() === 'resign' ? 'text-amber-600 dark:text-[#F59E0B]' : 'text-emerald-600 dark:text-[#10B981]'
                  }`}>{employee?.status || 'N/A'}</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm dark:shadow-xl transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-500 border border-red-150 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <User size={18} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Role</p>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white capitalize truncate">{employee?.role || 'Employee'}</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm dark:shadow-xl transition-all">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-500 border border-red-150 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Employee ID</p>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white truncate">{employee?.employee_id || 'N/A'}</h3>
                </div>
              </div>
            </div>
        
          {/* Attendance Analytics */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Attendance Analytics</h3>
            <EmployeeAttendanceAnalytics employeeId={employee?.id} days={90} />
          </div>
          </div>
        );

      /* ===================================
         ATTENDANCE
      =================================== */

      case 'attendance':
        return (
          <AttendanceHistoryScreen isEmbedded={true} />
        );

      /* ===================================
         PAYROLL
      =================================== */

      case 'payroll':
        // Build merged chart data: per-payslip net_pay + avg per 15-day half, keyed by period label
        const payrollChartData = (() => {
          const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          // Build avgNet map by 15-day half key
          const halfMap: Record<string, { net: number; count: number; name: string }> = {};
          (payrolls || []).forEach((p: any) => {
            const dateStr = p.period_start || p.period_end || p.created_at;
            if (!dateStr) return;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return;
            const year = d.getFullYear();
            const month = d.getMonth();
            const half = d.getDate() <= 15 ? 1 : 2;
            const key = `${year}-${month}-${half}`;
            if (!halfMap[key]) halfMap[key] = { net: 0, count: 0, name: `${monthNames[month].slice(0,3)} ${year} H${half}` };
            halfMap[key].net += Number(p.net_pay || 0);
            halfMap[key].count += 1;
          });
          // Sort payrolls chronologically and map each to chart point with both values
          const sorted = (payrolls || []).slice().sort((a: any, b: any) =>
            new Date(a.period_end || a.period_start || 0).getTime() - new Date(b.period_end || b.period_start || 0).getTime()
          );
          return sorted.map((p: any) => {
            const dateStr = p.period_start || p.period_end || p.created_at;
            let avgNet: number | null = null;
            if (dateStr) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate() <= 15 ? 1 : 2}`;
                const h = halfMap[key];
                if (h && h.count) avgNet = h.net / h.count;
              }
            }
            return {
              name: p.payslip_period || p.period_end || p.period_start || 'N/A',
              'Net Pay': Number(p.net_pay || 0),
              'Avg Net (Half)': avgNet !== null ? Math.round(avgNet * 100) / 100 : undefined,
            };
          });
        })();

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Payslip</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSection('payslip_history')}
                  className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                >
                  Payslip History
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <div className="text-sm font-semibold mb-3">Salary Overview — Net Pay &amp; Average</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={payrollChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => `₱${Number(val).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} />
                    <Legend />
                    <Line type="monotone" dataKey="Net Pay" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Avg Net (Half)" stroke="#10B981" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {(() => {
              const latestPayslip = payrolls && payrolls.length > 0 ? payrolls[0] : null;
              if (latestPayslip) {
                return (
                  <div className="rounded-3xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-5 md:p-6 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold">Current Payslip</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="w-full sm:w-auto">
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-lg md:text-xl">
                          {latestPayslip.pay_period}
                        </p>
                        <p className="mt-2 text-2xl md:text-3xl font-bold text-green-600 dark:text-green-500">
                          {formatCurrency(latestPayslip.net_pay)}
                        </p>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap ${
                          latestPayslip.status === 'paid'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {latestPayslip.status.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPayslip(latestPayslip);
                        setActiveSection('payslip_detail');
                      }}
                      className="mt-5 w-full rounded-2xl bg-[#4F7BFF] hover:bg-[#3d66ff] text-white py-3 font-semibold transition-colors"
                    >
                      View Payslip Details
                    </button>
                  </div>
                );
              }
              return (
                <div className="rounded-3xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <Wallet size={40} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400">No payroll records found</p>
                </div>
              );
            })()}
          </div>
        );

      /* ===================================
         DOCUMENTS
      =================================== */

      case 'documents':
        return (
          <DocumentsSection
            documents={documentsList || []}
            employeeId={employee?.id || 0}
            onUpdate={() => documentsQuery.refetch()}
            readOnly={false}
          />
        );

      case 'leave':
        return (
          <div className="space-y-6">
       
            {/* Show intro card first; open the form when user clicks Submit Leave */}
            {!showLeaveForm ? (
              <div className="max-w-md mx-auto">
                <div className="rounded-2xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800 p-6 shadow-sm text-center">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Leave Request</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Submit your leave request and monitor approval status through the portal.</p>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <button onClick={() => setShowLeaveForm(true)} className="w-full sm:w-3/4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold">Submit Leave</button>
                    <button onClick={() => setActiveSection('leave_history')} className="w-full sm:w-3/4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition-colors">View History</button>
                  </div>
                </div>
              </div>
            ) : (
              <EmployeeLeaveRequestForm showHeader={false} onCancel={() => setShowLeaveForm(false)} />
            )}
          </div>
        );

      case 'payslip_history': {
        // Full-page payslip history (no modal)
        const historyPayrolls = (payrolls || []).filter((p: any) => {
          if (employee?.id == null) return true;
          const empId = p.employee ?? p.employee_id;
          return empId == null || String(empId) === String(employee.id);
        }).slice().sort((a: any, b: any) => {
          const aT = new Date(a.period_end || a.created_at || 0).getTime();
          const bT = new Date(b.period_end || b.created_at || 0).getTime();
          return bT - aT;
        });
        const totalPs = historyPayrolls.length;
        const approvedPs = historyPayrolls.filter((p: any) => String(p.status || '').toLowerCase() === 'approved').length;
        const highestPs = historyPayrolls.reduce((best: any, cur: any) => {
          const amt = Number(cur.net_pay || 0);
          if (!best || amt > best.amount) return { amount: amt, payslip: cur };
          return best;
        }, null as any);
        const formatPeriod = (p: any) => p.payslip_period ?? `${p.period_start || ''} - ${p.period_end || ''}`;
        return (
          <div className="space-y-5">
            {/* Back header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSection('payroll')}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300 shadow-sm transition-all active:scale-95 flex items-center justify-center"
                aria-label="Back"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payslip History</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{totalPs} record{totalPs !== 1 ? 's' : ''} found</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-500/20 p-3.5">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80">Total</p>
                  <span className="text-blue-400 text-xs">📄</span>
                </div>
                <p className="text-xl font-black mt-1 text-gray-900 dark:text-white">{totalPs}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">All records</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20 border border-emerald-200/50 dark:border-emerald-500/20 p-3.5">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">Approved</p>
                  <span className="text-emerald-400 text-xs">✓</span>
                </div>
                <p className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{approvedPs}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{totalPs > 0 ? `${Math.round((approvedPs / totalPs) * 100)}% rate` : '—'}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-200/50 dark:border-amber-500/20 p-3.5">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-600/80 dark:text-amber-400/80">Highest Pay</p>
                  <span className="text-amber-400 text-xs">₱</span>
                </div>
                <p className="text-xl font-black mt-1 text-gray-900 dark:text-white truncate">₱{(highestPs?.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 truncate">{highestPs?.payslip ? formatPeriod(highestPs.payslip) : '—'}</p>
              </div>
            </div>

            {/* Payslip list */}
            {historyPayrolls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800">
                <p className="text-gray-500 dark:text-slate-400 font-medium">No payslip history available.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyPayrolls.map((p: any, idx: number) => (
                  <div
                    key={p.id ?? idx}
                    className="flex items-center justify-between bg-white dark:bg-[#0f1a2e]/80 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/40 dark:border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 text-sm">
                        📄
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{formatPeriod(p)}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          Net Pay: <span className="font-bold text-gray-800 dark:text-slate-200">₱{Number(p.net_pay || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        p.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : p.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>{p.status || 'N/A'}</span>
                      <button
                        onClick={() => { setSelectedPayslip(p); setPayslipOpenedFromHistory(true); setActiveSection('payslip_detail'); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-purple-700 active:scale-[0.97] transition-all duration-150"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'payslip_detail':
        return (
          <PayslipDetailModal
            payslip={selectedPayslip}
            onBack={() => {
              if (payslipOpenedFromHistory) {
                setPayslipOpenedFromHistory(false);
                setActiveSection('payslip_history');
              } else {
                setActiveSection('payroll');
              }
            }}
          />
        );

      /* ===================================
         LEAVE HISTORY (inline page section)
      =================================== */
      case 'leave_history': {

        const handleCancelLeave = async (id: number) => {
          try {
            setLeaveCancelLoading(true);
            await apiClient.delete(`/leave-requests/${id}/`);
            setLeaveItems(prev => prev.filter(i => i.id !== id));
            setSelectedLeave(null);
          } catch (e) {
            console.error('Failed to cancel leave request', e);
          } finally {
            setLeaveCancelLoading(false);
          }
        };

        const handleLeavePreview = (url: string) => {
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
          const isPdf = /\.pdf$/i.test(url);
          if (isImage) {
            setLeavePreviewFile({ url, type: 'image' });
          } else if (isPdf) {
            const link = document.createElement('a');
            link.href = url;
            link.download = url.split('/').pop() || 'file.pdf';
            link.click();
          } else {
            window.open(url, '_blank');
          }
        };

        const getLeaveStatusColor = (status: string) => {
          switch (status?.toLowerCase()) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
          }
        };

        const getLeaveStatusIcon = (status: string) => {
          switch (status?.toLowerCase()) {
            case 'approved': return '✓';
            case 'rejected': return '✕';
            default: return '⏳';
          }
        };

        const getDaysCount = (start: string, end: string) => {
          return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        };

        const totalLeaves = leaveItems.length;
        const approvedLeaves = leaveItems.filter((l: any) => l.status?.toLowerCase() === 'approved').length;
        const pendingLeaves = leaveItems.filter((l: any) => l.status?.toLowerCase() === 'pending').length;

        // Detail view for selected leave
        if (selectedLeave) {
          return (
            <div className="space-y-5">
              {/* Back header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedLeave(null)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300 shadow-sm transition-all active:scale-95 flex items-center justify-center"
                  aria-label="Back"
                >
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Leave Details</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedLeave.leave_type}</p>
                </div>
              </div>

              {/* Summary Hero */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0610] via-[#2a0a1a] to-[#0d0318] border border-red-900/30 p-5 shadow-xl">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-red-300/70 uppercase tracking-wider mb-0.5">Leave Type</p>
                      <h3 className="text-lg font-extrabold text-white leading-tight">{selectedLeave.leave_type}</h3>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase ${getLeaveStatusColor(selectedLeave.status)}`}>
                      {getLeaveStatusIcon(selectedLeave.status)} {selectedLeave.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3 border border-white/5">
                    <div>
                      <p className="text-[10px] text-red-300/60 font-bold uppercase tracking-wider mb-1">Period</p>
                      <p className="text-sm font-bold text-white">
                        {new Date(selectedLeave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' '}–{' '}
                        {new Date(selectedLeave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-red-300/60 font-bold uppercase tracking-wider mb-1">Duration</p>
                      <p className="text-xl font-black text-white">{getDaysCount(selectedLeave.start_date, selectedLeave.end_date)}<span className="text-sm font-bold text-red-300/70 ml-1">days</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason for Leave</h4>
                <div className="bg-white dark:bg-[#0d1527]/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-200 italic font-semibold leading-relaxed">
                    &ldquo;{selectedLeave.reason || 'No reason provided'}&rdquo;
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Request Timeline</h4>
                <div className="bg-white dark:bg-[#0d1527]/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 space-y-4 relative pl-9">
                  <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-red-400 via-red-400/50 to-slate-200 dark:to-slate-800 rounded-full" />
                  <div className="relative">
                    <div className="absolute -left-6 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#0d1527] shadow-[0_0_6px_rgba(239,68,68,0.5)] mt-1" />
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Requested</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {new Date(selectedLeave.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selectedLeave.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="relative">
                    <div className={`absolute -left-6 w-3 h-3 rounded-full border-2 border-white dark:border-[#0d1527] mt-1 ${
                      selectedLeave.status === 'pending' ? 'bg-slate-300 dark:bg-slate-600' :
                      selectedLeave.status === 'approved' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' :
                      'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                    }`} />
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {selectedLeave.status === 'pending' ? 'Pending Approval' : selectedLeave.status === 'rejected' ? 'Rejected' : 'Approved'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {selectedLeave.status === 'pending'
                        ? 'Waiting for manager review'
                        : selectedLeave.reviewed_at ? `Reviewed on ${new Date(selectedLeave.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Status updated'}
                    </p>
                    {selectedLeave.status === 'rejected' && selectedLeave.notes && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 rounded-xl text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">
                        <span className="font-bold">Rejection Reason:</span> &ldquo;{selectedLeave.notes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attachments ({selectedLeave.attachments.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedLeave.attachments.map((url: string, idx: number) => {
                      const filename = url.split('/').pop()?.split('?')[0] || 'Document';
                      return (
                        <div
                          key={idx}
                          onClick={() => handleLeavePreview(url)}
                          className="flex items-center gap-3 p-3.5 bg-white dark:bg-[#0d1527]/30 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400 text-xs font-black">
                            📎
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">{filename}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cancel button */}
              {selectedLeave.status === 'pending' && (
                <button
                  onClick={() => handleCancelLeave(selectedLeave.id)}
                  disabled={leaveCancelLoading}
                  className="w-full py-3 border border-red-300 dark:border-red-500/35 hover:border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  🗑️ {leaveCancelLoading ? 'Cancelling...' : 'Cancel Request'}
                </button>
              )}
            </div>
          );
        }

        // List view
        return (
          <div className="space-y-5">
            {/* Back header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSection('leave')}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300 shadow-sm transition-all active:scale-95 flex items-center justify-center"
                aria-label="Back"
              >
                <ChevronLeft size={16} />
              </button>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Leave History</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{totalLeaves} record{totalLeaves !== 1 ? 's' : ''} found</p>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-500/20 p-3.5">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80">Total</p>
                  <span className="text-blue-400 text-xs">📋</span>
                </div>
                <p className="text-xl font-black mt-1 text-gray-900 dark:text-white">{totalLeaves}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">All requests</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20 border border-emerald-200/50 dark:border-emerald-500/20 p-3.5">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">Approved</p>
                  <span className="text-emerald-400 text-xs">✓</span>
                </div>
                <p className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{approvedLeaves}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{totalLeaves > 0 ? `${Math.round((approvedLeaves / totalLeaves) * 100)}% rate` : '—'}</p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-200/50 dark:border-amber-500/20 p-3.5">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-600/80 dark:text-amber-400/80">Pending</p>
                  <span className="text-amber-400 text-xs">⏳</span>
                </div>
                <p className="text-xl font-black mt-1 text-amber-600 dark:text-amber-400">{pendingLeaves}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Awaiting review</p>
              </div>
            </div>

            {/* Leave list */}
            {leaveLoading ? (
              <div className="flex items-center justify-center py-16 rounded-2xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800">
                <LoadingSpinner />
              </div>
            ) : leaveItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800">
                <p className="text-gray-500 dark:text-slate-400 font-medium">No leave history available.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaveItems.map((l: any, idx: number) => (
                  <div
                    key={l.id ?? idx}
                    className="flex items-center justify-between bg-white dark:bg-[#0f1a2e]/80 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-red-300 dark:hover:border-red-500/40 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                        l.status?.toLowerCase() === 'approved' ? 'bg-gradient-to-br from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20 border border-emerald-200/40 dark:border-emerald-500/20 text-emerald-500 dark:text-emerald-400' :
                        l.status?.toLowerCase() === 'rejected' ? 'bg-gradient-to-br from-red-500/10 to-pink-500/10 dark:from-red-500/20 dark:to-pink-500/20 border border-red-200/40 dark:border-red-500/20 text-red-500 dark:text-red-400' :
                        'bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-200/40 dark:border-amber-500/20 text-amber-500 dark:text-amber-400'
                      }`}>
                        ✈
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{l.leave_type}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {new Date(l.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(l.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="ml-2 font-bold text-gray-800 dark:text-slate-200">({getDaysCount(l.start_date, l.end_date)} days)</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getLeaveStatusColor(l.status)}`}>{l.status || 'N/A'}</span>
                      <button
                        onClick={() => setSelectedLeave(l)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white shadow-sm hover:shadow-md hover:from-red-600 hover:to-red-800 active:scale-[0.97] transition-all duration-150"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      /* ===================================
         INFORMATION
      =================================== */

      case 'information':
        return (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-[24px] bg-gradient-to-br from-[#4A0000] via-[#8B0000] to-[#3B0000] p-6 text-white shadow-xl border border-red-900/30 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/30 flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-red-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg md:text-2xl font-bold text-white leading-tight">
                    Employee Information
                  </h2>
                  <p className="mt-1 text-slate-300 text-xs md:text-sm">
                    Personal details, emergency contact, and government information.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditOpen(true)} 
                className="w-full sm:w-36 px-6 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-all shadow-md active:scale-95"
              >
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Employment Information Card */}
                <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-600 dark:text-red-500 flex items-center justify-center">
                      <Briefcase size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Employment Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Briefcase size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Position</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.position || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Clock size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Employment Type</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.employment_type || 'N/A'}</span>
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <MapPin size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Delivery Center</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.hub_name || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Government IDs Card */}
                <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-650 dark:text-red-500 flex items-center justify-center">
                      <Shield size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Government IDs</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <CreditCard size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">TIN</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.tin || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Shield size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">SSS</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.sss || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Heart size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">PhilHealth</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.philhealth || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Home size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Pag-IBIG</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.pagibig || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Card */}
                <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-650 dark:text-red-500 flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Emergency Contact</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <User size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Contact Name</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.emergency_contact_name || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Users size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Relationship</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.emergency_contact_relationship || 'N/A'}</span>
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Phone size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Phone Number</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.emergency_contact_phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Personal Information Card */}
                <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-650 dark:text-red-500 flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <User size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Full Name</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.full_name || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <User size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Gender</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.gender || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Globe size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Nationality</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.nationality || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Users size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Marital Status</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.marital_status || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Details Card */}
                <div className="rounded-3xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 p-5 md:p-6 shadow-sm dark:shadow-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-150 dark:border-red-500/20 text-red-650 dark:text-red-500 flex items-center justify-center">
                      <User size={18} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Contact Details</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Mail size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Email</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-all">{employee?.email_address || 'N/A'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Phone size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Phone</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{employee?.phone_number || 'N/A'}</span>
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-750/85 rounded-2xl p-4 transition-all">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <MapPin size={14} />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Address</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white break-words">{formatEmployeeAddress(employee)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'payment_account':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-blue-600/10">
                <CreditCard className="text-blue-500" size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Account</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage your payment methods and QR codes</p>
              </div>
            </div>
            <EmployeePaymentAccountsTab />
          </div>
        );

      case 'id_scanner':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-purple-600/10">
                <ScanLine className="text-purple-500" size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">ID Scanner</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Scan and upload your government-issued ID</p>
              </div>
            </div>
            {!showScanner ? (
              <div className="max-w-md mx-auto">
                <div className="rounded-2xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-5">
                  <div className="flex justify-center">
                    <div className="p-5 rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <ScanLine size={40} className="text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Scan Your ID</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Use your camera to scan the front and back of your government ID. The scanner will auto-detect and capture the card.
                    </p>
                  </div>
                  <ul className="text-left text-sm text-slate-600 dark:text-slate-400 space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <li className="flex items-center gap-2"><QrCode size={14} className="text-purple-500 shrink-0" /> Place your ID flat on a surface</li>
                    <li className="flex items-center gap-2"><QrCode size={14} className="text-purple-500 shrink-0" /> Camera will auto-frame the card edges</li>
                    <li className="flex items-center gap-2"><QrCode size={14} className="text-purple-500 shrink-0" /> Capture front then back side</li>
                    <li className="flex items-center gap-2"><QrCode size={14} className="text-purple-500 shrink-0" /> Images upload automatically to Documents</li>
                  </ul>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                  >
                    <ScanLine size={18} />
                    Launch Camera ID Scanner
                  </button>
                </div>
              </div>
            ) : (
              <IDScanner
                onScanComplete={async (frontFile: File, backFile: File, categoryKey?: string) => {
                  if (!employee?.id) return;
                  try {
                    const cat = categoryKey || 'license';
                    await documentAPI.uploadDocument(employee.id, frontFile, frontFile.name || 'ID_Front.jpg', cat);
                    await documentAPI.uploadDocument(employee.id, backFile, backFile.name || 'ID_Back.jpg', cat);
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DOCUMENTS });
                    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
                    toastSuccess('Front and back of your ID have been saved to Documents.');
                    setShowScanner(false);
                  } catch {
                    toastError('Could not upload ID images. Please try again.');
                  }
                }}
                onClose={() => setShowScanner(false)}
              />
            )}
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
                onClick={toggleDarkMode}
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
        onClose={() => setEditOpen(false)}
        employee={employee}
        onSuccess={() => setEditOpen(false)}
      />


      {/* LEAVE ATTACHMENT PREVIEW */}
      {leavePreviewFile && (
        <AttachmentPreviewModal
          url={leavePreviewFile.url}
          type={leavePreviewFile.type}
          onClose={() => setLeavePreviewFile(null)}
        />
      )}

    </div>
  );
};

export default EmployeeDashboard;