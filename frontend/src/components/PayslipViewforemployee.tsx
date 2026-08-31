import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
import { Download, ArrowLeft, ChevronRight } from 'lucide-react';
import { useGetPayroll } from '@/hooks/useQueries';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { exportElementToPdf } from '@/utils/pdfGenerator';

type PayslipStatus = 'draft' | 'approved' | 'pending' | string;

type Payslip = {
  id?: number;
  standard_pay?: number | string;
  basic_salary?: number | string;
  overtime_pay?: number | string;
  night_differential?: number | string;
  ndot?: number | string;
  rest_day?: number | string;
  rest_day_ot?: number | string;
  rest_day_nd?: number | string;
  rest_day_ndot?: number | string;
  special_holiday?: number | string;
  special_holiday_ot?: number | string;
  special_holiday_nd?: number | string;
  special_holiday_ndot?: number | string;
  legal_holiday?: number | string;
  legal_holiday_ot?: number | string;
  legal_holiday_nd?: number | string;
  legal_holiday_ndot?: number | string;
  legal_holiday_rd?: number | string;
  legal_holiday_rdot?: number | string;
  legal_holiday_rdnd?: number | string;
  legal_holiday_rdndot?: number | string;
  incentives?: number | string;
  adjustment?: number | string;
  gas?: number | string;
  load?: number | string;
  other_allowance?: number | string;
  rewards_adjustments?: number | string;
  kpi?: number | string;
  allowances?: number | string;

  late?: number | string;
  id_deduction?: number | string;
  uniform?: number | string;
  insurance?: number | string;
  surety_bond?: number | string;
  convenience_fee?: number | string;
  general_deduction?: number | string;

  sss_deduction?: number | string;
  philhealth_deduction?: number | string;
  pagibig_deduction?: number | string;
  deduction_details?: Record<string, number>;
  total_deductions?: number | string;
  total_government_deductions?: number | string;
  total_earnings?: number | string;
  status?: PayslipStatus;

  total_hours?: number | string;
  overtime_hours?: number | string;
  lates?: number | string;
  absences?: number | string;
  totalHours?: number | string;
  sss_percent?: number | string;
  philhealth_percent?: number | string;
  pagibig_percent?: number | string;

  profile_image_url?: string;
  profile_image?: string;
  full_name?: string;
  fullname?: string;
  jtp_code?: string;
  position?: string;
  date_hired?: string;
  hub_name?: string;
  hub?: string;
  payslip_period?: string;
  period_start?: string;
  period_end?: string;
  tin?: string;
  sss_no?: string;
  philhealth_no?: string;
  pagibig_no?: string;
  net_pay?: number | string;
  // optional relation fields present in some API responses
  employee?: number | string;
  employee_id?: number | string;
};

interface PayslipDetailViewProps {
  payslip: Payslip | null;
  onBack?: () => void;
}

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatPayslipPeriod = (startStr?: string, endStr?: string) => {
  if (!startStr || !endStr) return 'N/A';
  try {
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return `${startStr} - ${endStr}`;
    }
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const startMonth = monthNames[startDate.getMonth()];
    const startDay = startDate.getDate();
    const endMonth = monthNames[endDate.getMonth()];
    const endDay = endDate.getDate();
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    if (startMonth === endMonth && startYear === endYear) {
      return `${startMonth} ${startDay} to ${endDay}, ${startYear}`;
    } else {
      return `${startMonth} ${startDay}, ${startYear} to ${endMonth} ${endDay}, ${endYear}`;
    }
  } catch (e) {
    return `${startStr} - ${endStr}`;
  }
};

export const PayslipDetailModal = ({
  payslip,
  onBack,
}: PayslipDetailViewProps) => {
  const { success, error } = useToast();
  const [localPayslip, setLocalPayslip] = useState<Payslip | null>(payslip);
  const [isDownloading, setIsDownloading] = useState(false);
  const payslipRef = useRef<HTMLDivElement>(null);

  // Fetch all payroll records to show history for the employee
  const { data: allPayrollData } = useGetPayroll();
  const allPayroll = normalizeApiResponse(allPayrollData) || [];
  const history = (allPayroll || []).filter((p: any) => {
    if (!payslip) return false;
    const pEmpId = p.employee || p.employee_id;
    const currentEmpId = payslip.employee || payslip.employee_id;
    return pEmpId && currentEmpId && pEmpId === currentEmpId && p.id !== localPayslip?.id;
  }).sort((a: any, b: any) => new Date(b.period_end || '').getTime() - new Date(a.period_end || '').getTime());

  useEffect(() => {
    setLocalPayslip(payslip);
  }, [payslip]);

  const handleDownload = async () => {
    if (!localPayslip || !payslipRef.current) return;
    try {
      setIsDownloading(true);
      const filename = `Payslip-${(localPayslip.full_name || localPayslip.fullname || 'Employee').replace(/\s+/g, '_')}-${localPayslip.period_end || 'period'}.pdf`;
      await exportElementToPdf(payslipRef.current, filename);
      success('Payslip downloaded as PDF');
    } catch (err) {
      console.error(err);
      error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderFieldReadOnly = (label: string, val: number, isReadOnly: boolean = false) => {
    return (
      <div className="flex flex-col gap-1 border-b border-gray-100 dark:border-slate-800/40 pb-2">
        <label className="text-gray-500 dark:text-gray-400 text-xs font-semibold">{label}</label>
        <p className="text-gray-800 dark:text-gray-200 font-bold text-xs mt-0.5 flex items-center justify-between">
          <span>₱{val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          {isReadOnly && <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded font-medium">25% Fixed</span>}
        </p>
      </div>
    );
  };

  const earningsFields: { label: string; key: keyof Payslip; isReadOnly?: boolean; computed?: number }[] = [
    { label: 'Standard Pay', key: 'standard_pay' },
    { label: 'Basic Salary/Pay', key: 'basic_salary' },
    { label: 'Overtime Pay', key: 'overtime_pay', isReadOnly: true, computed: toNumber(localPayslip?.basic_salary) * 0.25 },
    { label: 'Night Differential', key: 'night_differential' },
    { label: 'NDOT', key: 'ndot' },
    { label: 'Rest Day Pay', key: 'rest_day' },
    { label: 'Rest Day OT', key: 'rest_day_ot' },
    { label: 'Rest Day ND', key: 'rest_day_nd' },
    { label: 'Rest Day NDOT', key: 'rest_day_ndot' },
    { label: 'Special Holiday Pay', key: 'special_holiday' },
    { label: 'Special Holiday OT', key: 'special_holiday_ot' },
    { label: 'Special Holiday ND', key: 'special_holiday_nd' },
    { label: 'Special Holiday NDOT', key: 'special_holiday_ndot' },
    { label: 'Legal Holiday Pay', key: 'legal_holiday' },
    { label: 'Legal Holiday OT', key: 'legal_holiday_ot' },
    { label: 'Legal Holiday ND', key: 'legal_holiday_nd' },
    { label: 'Legal Holiday NDOT', key: 'legal_holiday_ndot' },
    { label: 'Legal Holiday RD', key: 'legal_holiday_rd' },
    { label: 'Legal Holiday RDOT', key: 'legal_holiday_rdot' },
    { label: 'Legal Holiday RDND', key: 'legal_holiday_rdnd' },
    { label: 'Legal Holiday RDNDOT', key: 'legal_holiday_rdndot' },
    { label: 'Incentives', key: 'incentives' },
    { label: 'Adjustment', key: 'adjustment' },
    { label: 'Gas Allowance', key: 'gas' },
    { label: 'Load Allowance', key: 'load' },
    { label: 'Other Allowance', key: 'other_allowance' },
    { label: 'Rewards/Adjustments', key: 'rewards_adjustments' },
    { label: 'KPI', key: 'kpi' },
    { label: 'Legacy Allowances', key: 'allowances' },
  ];

  const deductionsFields: { label: string; key: keyof Payslip }[] = [
    { label: 'Late Deduction', key: 'late' },
    { label: 'ID Card Fee', key: 'id_deduction' },
    { label: 'Uniform Fee', key: 'uniform' },
    { label: 'Insurance Premium', key: 'insurance' },
    { label: 'Surety Bond', key: 'surety_bond' },
    { label: 'Convenience Fee', key: 'convenience_fee' },
    { label: 'General Deduction', key: 'general_deduction' },
  ];

  if (!payslip && !localPayslip) return null;

  return (
    <div ref={payslipRef} className="bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-3xl overflow-hidden shadow-xl">
      <div className="bg-gray-50 dark:bg-slate-950">
        {/* HEADER AREA */}
        <div className="bg-gradient-to-r from-red-800 via-red-900 to-red-950 p-6 text-white relative shadow-lg">
          <div className="flex justify-between items-center mb-6">
            {onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10"
                title="Back to Payroll"
              >
                Back
              </button>
            ) : <div />}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="hover:bg-white/10 disabled:opacity-50 p-2 rounded-full transition-all flex items-center gap-1.5 border border-white/10"
              aria-label="Download PDF"
              title="Download as PDF"
            >
              {isDownloading ? (
                <svg className="animate-spin w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <Download size={18} />
              )}
              <span className="text-xs font-bold pr-1">{isDownloading ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="shrink-0">
              {localPayslip?.profile_image_url || localPayslip?.profile_image ? (
                <img
                  src={localPayslip?.profile_image_url || localPayslip?.profile_image}
                  alt={localPayslip?.full_name || localPayslip?.fullname || 'Employee'}
                  className="w-20 h-20 rounded-2xl border-2 border-white/30 object-cover shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl border-2 border-white/30 bg-red-700 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                  {(localPayslip?.full_name || localPayslip?.fullname || 'E').charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold tracking-tight truncate">
                {localPayslip?.full_name || localPayslip?.fullname || 'N/A'}
              </h2>
              <p className="text-red-200 text-xs font-semibold tracking-wider uppercase mt-0.5">
                JTP Code: {localPayslip?.jtp_code || 'N/A'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-4 text-xs text-white/80 border-t border-white/10 pt-3">
                <div>
                  <span className="text-[10px] text-red-200 font-bold uppercase tracking-wider block">Position</span>
                  <span className="font-semibold text-white truncate block">{localPayslip?.position || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-red-200 font-bold uppercase tracking-wider block">Date Hired</span>
                  <span className="font-semibold text-white block">
                    {localPayslip?.date_hired ? new Date(localPayslip.date_hired).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-red-200 font-bold uppercase tracking-wider block">Delivery Center Name</span>
                  <span className="font-semibold text-white truncate block">{localPayslip?.hub_name || localPayslip?.hub || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 bg-white/10 backdrop-blur border border-white/10 px-4 py-2 rounded-2xl text-xs flex items-center justify-between">
            <span className="text-red-100 font-medium">Payslip Period:</span>
            <span className="font-bold text-white text-right">
              {formatPayslipPeriod(localPayslip?.period_start, localPayslip?.period_end)}
            </span>
          </div>
        </div>

        {/* GOVERNMENT IDS SECTION */}
        <div className="px-6 pt-6 pb-2">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
            <h4 className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-3">Employee Government IDs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-gray-500 font-medium">TIN:</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{localPayslip?.tin || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">SSS No:</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{localPayslip?.sss_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">PhilHealth No:</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{localPayslip?.philhealth_no || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Pag-IBIG No:</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{localPayslip?.pagibig_no || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TWO COLUMN CONTENT PANEL */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: EARNINGS BREAKDOWN (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <h3 className="text-gray-800 dark:text-gray-100 font-bold text-sm border-b pb-3 mb-4 flex justify-between items-center">
                <span>Earnings Breakdown</span>
                <span className="text-xs text-green-600 font-medium">In PHP</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 max-h-[480px] overflow-y-auto pr-2">
                {earningsFields.map((field) => (
                  <div key={field.key} className="sm:col-span-1">
                    {renderFieldReadOnly(field.label, field.computed !== undefined ? field.computed : toNumber(localPayslip?.[field.key]), field.isReadOnly)}
                  </div>
                ))}
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 p-4 rounded-2xl flex justify-between items-center mt-6">
                <span className="text-green-700 dark:text-green-400 font-bold text-xs">Total Earnings</span>
                <span className="text-green-700 dark:text-green-400 font-extrabold text-sm">
                  ₱{toNumber(localPayslip?.total_earnings).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DEDUCTIONS & ATTENDANCE (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* ATTENDANCE SUMMARY */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <h3 className="text-gray-800 dark:text-gray-100 font-bold text-xs border-b pb-3 mb-4">Attendance Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400 font-medium">Total Hours</p>
                  <p className="text-gray-800 dark:text-gray-200 font-bold text-sm mt-0.5">
                    {localPayslip?.total_hours ?? localPayslip?.totalHours ?? '0'} hrs
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Overtime Hours</p>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm mt-0.5">
                    {localPayslip?.overtime_hours ?? '0'} hrs
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Lates</p>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm mt-0.5">
                    {localPayslip?.lates ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Absences</p>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold text-sm mt-0.5">
                    {localPayslip?.absences ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* DEDUCTIONS BREAKDOWN */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
              <h3 className="text-gray-800 dark:text-gray-100 font-bold text-sm border-b pb-3 mb-4 flex justify-between items-center">
                <span>Deductions</span>
                <span className="text-xs text-red-600 font-medium">In PHP</span>
              </h3>

              <div className="space-y-4">
                {/* Government Mandated */}
                <div className="border-b pb-3 border-gray-100 dark:border-slate-800/40">
                  <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-3">Government Mandated</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">SSS</span>
                      <span className="text-gray-800 dark:text-gray-200 font-bold">
                        ₱{toNumber(localPayslip?.sss_deduction).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({localPayslip?.sss_percent || '0'}%)
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">PhilHealth</span>
                      <span className="text-gray-800 dark:text-gray-200 font-bold">
                        ₱{toNumber(localPayslip?.philhealth_deduction).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({localPayslip?.philhealth_percent || '0'}%)
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Pag-IBIG</span>
                      <span className="text-gray-800 dark:text-gray-200 font-bold">
                        ₱{toNumber(localPayslip?.pagibig_deduction).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({localPayslip?.pagibig_percent || '0'}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Deductions */}
                <div className="border-b pb-3 border-gray-100 dark:border-slate-800/40">
                  <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-3">Itemized Deductions</p>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {deductionsFields.map((field) => (
                      <div key={field.key}>
                        {renderFieldReadOnly(field.label, toNumber(localPayslip?.[field.key]))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Custom Deductions */}
                <div>
                  <p className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider mb-2">Other Deductions</p>
                  {localPayslip?.deduction_details && Object.keys(localPayslip.deduction_details).length > 0 ? (
                    <div className="space-y-2 max-h-[100px] overflow-y-auto">
                      {Object.entries(localPayslip.deduction_details).map(([label, amount]) => (
                        <div key={label} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
                          <span className="text-gray-800 dark:text-gray-200 font-bold">
                            ₱{toNumber(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-[11px] py-1">No other deductions</p>
                  )}
                </div>

                {/* Total Deductions Panel */}
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex justify-between items-center mt-6">
                  <span className="text-red-700 dark:text-red-400 font-bold text-xs">Total Deductions</span>
                  <span className="text-red-700 dark:text-red-400 font-extrabold text-sm">
                    ₱{(toNumber(localPayslip?.total_deductions) + toNumber(localPayslip?.total_government_deductions)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM CARD: SALARY / NET PAY SUMMARY */}
        <div className="px-6 pb-6">
          <div className="bg-gradient-to-r from-blue-700 via-indigo-850 to-blue-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Net Salary Payday</p>
              <h3 className="text-3xl font-extrabold tracking-tight mt-1 animate-pulse">
                ₱{toNumber(localPayslip?.net_pay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>

            <div className="flex gap-4 items-center">
              <div>
                <span className="text-[10px] text-blue-200 uppercase font-black block text-right">Status</span>
                <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full mt-1 uppercase tracking-wider border shadow-sm ${localPayslip?.status === 'approved'
                    ? 'bg-green-500 border-green-400 text-white'
                    : 'bg-yellow-500 border-yellow-400 text-white'
                  }`}>
                  {localPayslip?.status || 'Draft'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Employee payslip history (semi-monthly) */}
        {history && history.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Payslip History (Semi-monthly)</h3>

            {(() => {
              const groups: Record<string, any[]> = {};
              const labels: Record<string, string> = {};
              history.forEach((p) => {
                const d = new Date(p.period_start || p.period_end || 0);
                const year = d.getFullYear();
                const month = d.getMonth();
                const day = d.getDate();
                const half = day <= 15 ? 1 : 2;
                const key = `${year}-${month}-${half}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);

                if (!labels[key]) {
                  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                  const monthName = monthNames[month] || (month+1).toString();
                  if (half === 1) labels[key] = `${monthName} 1–15, ${year}`;
                  else {
                    const lastDay = new Date(year, month+1, 0).getDate();
                    labels[key] = `${monthName} 16–${lastDay}, ${year}`;
                  }
                }
              });

              const sortedKeys = Object.keys(groups).sort((a,b) => {
                const [ay, am, ah] = a.split('-').map(Number);
                const [by, bm, bh] = b.split('-').map(Number);
                if (ay !== by) return by - ay;
                if (am !== bm) return bm - am;
                return bh - ah;
              });

              return (
                <div className="space-y-3">
                  {sortedKeys.map((k) => (
                    <div key={k} className="space-y-2">
                      <div className="text-xs font-semibold text-gray-600">{labels[k]}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {groups[k].map((prev) => (
                          <div key={prev.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <div>
                              <p className="text-xs font-bold text-gray-800">{formatPayslipPeriod(prev.period_start, prev.period_end)}</p>
                              <p className="text-[10px] text-green-600 font-bold mt-1">Net Pay: ₱{toNumber(prev.net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <button onClick={() => setLocalPayslip(prev)} className="text-[10px] font-black uppercase tracking-widest text-red-650 hover:text-red-700 flex items-center gap-0.5">
                              <span>View Record</span>
                              <ChevronRight size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
};
