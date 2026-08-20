import React from 'react';
import { Modal } from './Modal';
import { Badge } from './common';

interface Payslip {
  id?: number;
  period_start?: string;
  period_end?: string;
  payslip_period?: string;
  net_pay?: number | string;
  status?: string;
  employee?: number | string;
  employee_id?: number | string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number | string | null;
  allPayroll: Payslip[];
  onView?: (p: Payslip) => void;
  showSummary?: boolean;
}

const getEmpId = (p: Payslip) => p.employee ?? p.employee_id ?? null;

const formatPeriod = (p: Payslip) => p.payslip_period ?? `${p.period_start || ''} - ${p.period_end || ''}`;

/* ─── Inline SVG icons ──────────────────────────────────────── */
const ReceiptIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CurrencyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function PayslipHistoryModal({ isOpen, onClose, employeeId, allPayroll, onView }: Props) {
  if (!isOpen) return null;

  const matches = (allPayroll || []).filter((p) => {
    const id = getEmpId(p);
    if (id == null || employeeId == null) return false;
    return String(id) === String(employeeId);
  }).sort((a, b) => {
    const aT = new Date(a.period_end || (a as any).created_at || 0).getTime();
    const bT = new Date(b.period_end || (b as any).created_at || 0).getTime();
    return bT - aT;
  });

  // Summary
  const totalPayslips = matches.length;
  const approvedCount = matches.filter((m) => String((m.status || '').toLowerCase()) === 'approved').length;
  const monthsList = Array.from(new Set(matches.map((m) => {
    const d = new Date(m.period_end || m.period_start || (m as any).created_at || 0);
    if (isNaN(d.getTime())) return '';
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
  }).filter(Boolean))).slice(0, 24);

  const highest = matches.reduce((best: { amount: number; payslip?: Payslip } | null, cur) => {
    const amt = Number(cur.net_pay || 0);
    if (!best || amt > best.amount) return { amount: amt, payslip: cur };
    return best;
  }, null as any);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="space-y-6">
        {/* ─── Premium Header ─── */}
        <div className="flex items-center gap-4 pb-2 border-b border-gray-200 dark:border-slate-700/60">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <ReceiptIcon />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">Payslip History</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              {totalPayslips > 0
                ? `${totalPayslips} record${totalPayslips !== 1 ? 's' : ''} found`
                : 'Employee payroll records'}
            </p>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <ReceiptIcon />
            </div>
            <p className="text-gray-500 dark:text-slate-400 font-medium">No payslip history available for this employee.</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">Payslips will appear here once generated.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* ─── Gradient Summary Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Total Payslips */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border border-blue-200/50 dark:border-blue-500/20 p-3.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-600/70 dark:text-blue-400/80">Total Payslips</p>
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
                    <ReceiptIcon />
                  </div>
                </div>
                <p className="text-xl font-black mt-1 text-gray-900 dark:text-white">{totalPayslips}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">All time records</p>
              </div>

              {/* Approved */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20 border border-emerald-200/50 dark:border-emerald-500/20 p-3.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/80">Approved</p>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                    <CheckCircleIcon />
                  </div>
                </div>
                <p className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{approvedCount}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{totalPayslips > 0 ? `${Math.round((approvedCount / totalPayslips) * 100)}% approval rate` : '—'}</p>
              </div>

              {/* Highest Net Pay */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-200/50 dark:border-amber-500/20 p-3.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-600/70 dark:text-amber-400/80">Highest Net Pay</p>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
                    <CurrencyIcon />
                  </div>
                </div>
                <p className="text-xl font-black mt-1 text-gray-900 dark:text-white">₱{(highest?.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 truncate">{highest?.payslip ? formatPeriod(highest.payslip) : '—'}</p>
              </div>
            </div>

            {/* ─── Premium Month Badges ─── */}
            {monthsList.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                  <CalendarIcon />
                  <span>Pay Periods</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {monthsList.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1.5 text-xs font-medium bg-white dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 px-3 py-1.5 rounded-full border border-gray-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Payslip List ─── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                <ClockIcon />
                <span>Recent Payslips</span>
              </div>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                {matches.map((p, idx) => (
                  <div
                    key={p.id ?? idx}
                    className="group flex items-center justify-between bg-white dark:bg-[#0f1a2e]/80 border border-gray-200/80 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all duration-200"
                  >
                    {/* Left: Icon + Info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/40 dark:border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                        <ReceiptIcon />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{formatPeriod(p)}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-medium">
                          Net Pay:&nbsp;
                          <span className="text-gray-800 dark:text-slate-200 font-bold">
                            ₱{Number(p.net_pay || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Badge + Button */}
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <Badge variant={p.status === 'approved' ? 'success' : p.status === 'pending' ? 'warning' : 'info'}>
                        {p.status || 'N/A'}
                      </Badge>
                      <button
                        onClick={() => { onView?.(p); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-purple-700 active:scale-[0.97] transition-all duration-150"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
