import React, { useState } from 'react';
import { Card, Badge } from '@/components/common';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Users, Wifi, TrendingUp, Calendar, ShieldAlert, Building2, AlertTriangle, ChevronDown, Clock, UserCheck, Activity } from 'lucide-react';
import { useGetDashboardAnalytics, useGetTopEmployeesByHub, useGetHubs, useGetOnlineEmployees } from '@/hooks/useQueries';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_BG: Record<string, string> = {
  high: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800',
  critical: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700',
  medium: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
  low: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function formatDateTime(isoStr: string | null) {
  if (!isoStr) return 'Unknown';
  const d = new Date(isoStr);
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncateHubName(name: string, max = 22) {
  if (!name || name.length <= max) return name;
  return `${name.slice(0, max - 1)}…`;
}

function calcBarSize(itemCount: number, chartHeight = 176, min = 14, max = 30) {
  if (itemCount <= 0) return min;
  const usable = chartHeight - 12;
  return Math.max(min, Math.min(max, Math.floor(usable / itemCount) - 6));
}

const HubChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1 max-w-[220px]">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

// ─── Hub Dropdown ─────────────────────────────────────────────────────────────

interface HubOption { id: number; name: string; }

const HubDropdown = ({
  hubs,
  selectedId,
  onChange,
}: {
  hubs: HubOption[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selected = hubs.find(h => h.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[11px] font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-2.5 py-1.5 rounded-lg transition-colors max-w-[160px]"
      >
        <Building2 className="w-3 h-3 shrink-0 text-purple-500" />
        <span className="truncate">{selected?.name ?? 'All Hubs (Default)'}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl min-w-[200px] max-h-64 overflow-y-auto">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedId === null ? 'font-bold text-red-600' : 'text-gray-800 dark:text-gray-300'}`}
          >
            Default (Top Hub)
          </button>
          <div className="border-t border-gray-100 dark:border-gray-700" />
          {hubs.map(hub => (
            <button
              key={hub.id}
              onClick={() => { onChange(hub.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedId === hub.id ? 'font-bold text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-800 dark:text-gray-300'}`}
            >
              {hub.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Top Employees Card ───────────────────────────────────────────────────────

const TopEmployeesCard = () => {
  const [selectedHubId, setSelectedHubId] = useState<number | null>(null);
  const { data: hubsData } = useGetHubs();
  const { data, isLoading } = useGetTopEmployeesByHub(selectedHubId);

  const hubs: HubOption[] = Array.isArray(hubsData)
    ? hubsData.map((h: any) => ({ id: h.id, name: h.name }))
    : (hubsData?.results ?? []).map((h: any) => ({ id: h.id, name: h.name }));

  const topEmployees: any[] = (data as any)?.top_employees ?? [];
  const hubName: string = (data as any)?.hub_name ?? '…';

  return (
    <Card className="p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold uppercase text-gray-900 dark:text-gray-300 flex items-center gap-2 min-w-0">
          <span className="text-yellow-500 shrink-0">🏆</span>
          <span className="truncate">Top 10 – <span className="text-red-600 dark:text-red-400 normal-case font-extrabold">{isLoading ? '…' : hubName}</span></span>
        </h3>
        {hubs.length > 1 && (
          <HubDropdown
            hubs={hubs}
            selectedId={selectedHubId}
            onChange={setSelectedHubId}
          />
        )}
      </div>

      <div className="overflow-x-auto -mx-1 flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-gray-600 dark:text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="text-left font-semibold py-1.5 w-6">#</th>
                <th className="text-left font-semibold py-1.5">Employee</th>
                <th className="text-left font-semibold py-1.5">Position</th>
                <th className="text-center font-semibold py-1.5">Rate</th>
                <th className="text-center font-semibold py-1.5">Late</th>
                <th className="text-center font-semibold py-1.5">Absent</th>
              </tr>
            </thead>
            <tbody>
              {topEmployees.map((emp: any, idx: number) => {
                const rate = parseFloat(emp.attendance_rate);
                const statusColor = rate >= 95
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : rate >= 80
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                return (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-1.5 font-bold text-gray-500 dark:text-gray-400 text-center">
                      {rankEmoji ?? <span className="text-gray-400 dark:text-gray-500">{idx + 1}</span>}
                    </td>
                    <td className="py-1.5 font-medium text-gray-900 dark:text-gray-200 max-w-[90px]">
                      <span className="truncate block">{emp.name}</span>
                    </td>
                    <td className="py-1.5 text-gray-600 dark:text-gray-400 max-w-[70px]">
                      <span className="truncate block">{emp.position}</span>
                    </td>
                    <td className="py-1.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                        {emp.attendance_rate_display}
                      </span>
                    </td>
                    <td className="py-1.5 text-center text-gray-600 dark:text-gray-400">{emp.late_count}</td>
                    <td className="py-1.5 text-center text-gray-600 dark:text-gray-400">{emp.absent_count}</td>
                  </tr>
                );
              })}
              {topEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No employee attendance data for this hub
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminDashboardOverview = () => {
  const { data, isLoading, isError } = useGetDashboardAnalytics();
  const { data: onlineData, isLoading: onlineLoading } = useGetOnlineEmployees();
  const { data: hubsData } = useGetHubs();
  const navigate = useNavigate();
  const { isHR } = useAuth();
  const basePath = isHR ? '/hr' : '/admin';

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalEmployees: number = data?.total_employees ?? 0;
  const activeEmployees: number = data?.active_employees ?? data?.employee_status_counts?.Active ?? 0;
  const totalHubs: number = data?.total_hubs ?? 0;
  const onlineCount: number = onlineData?.count ?? data?.online_count ?? 0;

  const empStatus = data?.employee_status_counts ?? { Active: 0, Resign: 0, AWOL: 0, Blacklist: 0 };
  const totalStatus = empStatus.Active + empStatus.Resign + empStatus.AWOL + empStatus.Blacklist;
  const empStatusData = [
    { name: 'Active', value: empStatus.Active, color: '#22C55E' },
    { name: 'Resign', value: empStatus.Resign, color: '#6B7280' },
    { name: 'AWOL', value: empStatus.AWOL, color: '#F97316' },
    { name: 'Blacklist', value: empStatus.Blacklist, color: '#EF4444' },
  ].filter(d => d.value > 0);

  const empType = data?.employment_type_counts ?? { 'Full-time': 0, 'OCW': 0 };
  const totalType = (empType['Full-time'] || 0) + (empType['OCW'] || 0);

  // Attendance trend – last 30 days
  const attendanceTrend = (data?.attendance_trend ?? []).map((d: any) => ({
    name: formatDate(d.date),
    present: d.present,
    late: d.late,
    absent: d.absent,
    onLeave: d.on_leave,
  }));

  // Top hubs by active employees
  const topHubsActive = (data?.top_hubs_active ?? []).map((h: any) => ({
    name: h.hub_name,
    value: h.active_count,
  }));

  // AWOL / Resign / Blacklist
  const awolResignBlacklist = (data?.awol_resign_blacklist ?? []).map((h: any) => ({
    name: h.hub_name,
    AWOL: h.awol,
    Resign: h.resign,
    Blacklist: h.blacklist,
  }));

  // Attendance approval today
  const attApproval = data?.attendance_approval ?? { approved: 0, pending: 0, total: 0 };
  const attApprovalData = [
    { name: 'Approved', value: attApproval.approved, color: '#22C55E' },
    { name: 'Pending', value: attApproval.pending, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  // Overtime by hub
  const topHubsOvertime = (data?.top_hubs_overtime ?? []).map((h: any) => ({
    name: h.hub_name,
    value: h.overtime_hours,
  }));

  // Leave overview
  const leaveOverview = data?.leave_overview ?? { approved: 0, pending: 0, rejected: 0, cancelled: 0, total: 0 };
  const leaveOverviewData = [
    { name: 'Approved', value: leaveOverview.approved, color: '#22C55E' },
    { name: 'Pending', value: leaveOverview.pending, color: '#F59E0B' },
    { name: 'Rejected', value: leaveOverview.rejected, color: '#EF4444' },
    { name: 'Cancelled', value: leaveOverview.cancelled, color: '#3B82F6' },
  ].filter(d => d.value > 0);

  // Security alerts
  const recentAlerts: any[] = data?.security_alerts ?? [];
  const alertCounts = data?.security_alert_counts ?? { high: 0, medium: 0, critical: 0, low: 0, unresolved: 0, total: 0 };

  // Avg attendance rate
  const topEmployeesForRate: any[] = data?.top_employees ?? [];
  const avgRate = topEmployeesForRate.length > 0
    ? Math.round(topEmployeesForRate.reduce((sum: number, e: any) => sum + parseFloat(e.attendance_rate), 0) / topEmployeesForRate.length)
    : 0;

  // Payslip Trend
  const payslipTrendData = (data?.payslip_trend ?? []).map((d: any) => ({
    name: d.name || d.label,
    value: d.value || d.total_pay,
  }));

  // Hub Total Pay
  const hubTotalPayData = (data?.hub_total_pay ?? []).map((d: any) => ({
    name: d.name || d.hub_name,
    value: d.value || d.total_pay,
  }));

  // Highest Paid Employee per Hub
  const highestPaidData = (data?.highest_paid_employees ?? []).map((d: any) => ({
    hub_name: d.hub_name,
    employee_name: d.employee_name,
    amount: d.amount,
  }));

  if (isError) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>Failed to load dashboard analytics. Please refresh the page.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Row 1: Summary Cards (6 cols) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* Total Employees */}
        <Card className="p-3 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400">Total Employees</span>
          </div>
          {isLoading ? <Skeleton className="h-8 w-14" /> : (
            <span className="text-3xl font-black text-gray-900 dark:text-white">{totalEmployees}</span>
          )}
        </Card>

        {/* Active Employees */}
        <Card className="p-3 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-1">
            <UserCheck className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400">Active Employees</span>
          </div>
          {isLoading ? <Skeleton className="h-8 w-14" /> : (
            <span className="text-3xl font-black text-green-600 dark:text-green-400">{activeEmployees}</span>
          )}
        </Card>

        {/* Total Hubs */}
        <Card className="p-3 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400">Total Hubs</span>
          </div>
          {isLoading ? <Skeleton className="h-8 w-14" /> : (
            <span className="text-3xl font-black text-gray-900 dark:text-white">{totalHubs}</span>
          )}
        </Card>

        {/* Employee Status – mini donut */}
        <Card className="p-3 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400 mb-1">Employee Status</span>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-14 h-14 relative shrink-0">
              {isLoading ? <Skeleton className="w-full h-full rounded-full" /> : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie data={empStatusData.length ? empStatusData : [{ value: 1, color: '#e5e7eb' }]} cx="50%" cy="50%" innerRadius={18} outerRadius={28} dataKey="value" stroke="none">
                      {(empStatusData.length ? empStatusData : [{ color: '#e5e7eb' }]).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex-1 text-[10px] space-y-0.5">
              {[
                { label: 'Active', value: empStatus.Active, color: 'bg-green-500' },
                { label: 'Resign', value: empStatus.Resign, color: 'bg-gray-500' },
                { label: 'AWOL', value: empStatus.AWOL, color: 'bg-orange-500' },
                { label: 'Blacklist', value: empStatus.Blacklist, color: 'bg-red-500' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-400">
                    <div className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                    <span>{s.label}</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-gray-200">{totalStatus ? Math.round((s.value / totalStatus) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Employment Type – compact bars */}
        <Card className="p-3 flex flex-col justify-center gap-2 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400">Employment Type</span>
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></div>
          ) : (
            <>
              <div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300 mb-0.5">
                  <span>Full-time</span>
                  <span className="font-semibold">{empType['Full-time']} <span className="text-gray-500 dark:text-gray-400">({totalType ? Math.round((empType['Full-time'] / totalType) * 100) : 0}%)</span></span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${totalType ? (empType['Full-time'] / totalType) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300 mb-0.5">
                  <span>OCW</span>
                  <span className="font-semibold">{empType['OCW']} <span className="text-gray-500 dark:text-gray-400">({totalType ? Math.round((empType['OCW'] / totalType) * 100) : 0}%)</span></span>
                </div>
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${totalType ? (empType['OCW'] / totalType) * 100 : 0}%` }} />
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Workforce Status – compact list */}
        <Card className="p-3 flex flex-col justify-center text-xs">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700 dark:text-gray-400 mb-1">Workforce Status</span>
          {isLoading ? <Skeleton className="h-14 w-full" /> : (
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Active</span><span className="font-bold text-green-600 dark:text-green-400">{empStatus.Active}</span></div>
              <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">AWOL</span><span className="font-bold text-orange-500">{empStatus.AWOL}</span></div>
              <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Resign</span><span className="font-bold text-gray-500 dark:text-gray-400">{empStatus.Resign}</span></div>
              <div className="flex justify-between"><span className="text-gray-700 dark:text-gray-300">Blacklist</span><span className="font-bold text-red-500">{empStatus.Blacklist}</span></div>
            </div>
          )}
        </Card>

      </div>

      {/* ── Row 2: Quick Stats (4 cols) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Online Now */}
        <Card className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5 text-green-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">Online Now</p>
            {onlineLoading && !onlineData ? <Skeleton className="h-6 w-8 mt-0.5" /> : (
              <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">{onlineCount}</p>
            )}
            <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">
              {totalEmployees > 0 ? `${((onlineCount / totalEmployees) * 100).toFixed(1)}% of total` : '—'}
            </p>
          </div>
        </Card>

        {/* Avg Attendance */}
        <Card className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">Avg Att. Rate</p>
            {isLoading ? <Skeleton className="h-6 w-12 mt-0.5" /> : (
              <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">{avgRate}%</p>
            )}
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Last 30 days</p>
          </div>
        </Card>

        {/* Pending Leave */}
        <Card className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">Pending Leave</p>
            {isLoading ? <Skeleton className="h-6 w-8 mt-0.5" /> : (
              <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">{leaveOverview.pending}</p>
            )}
            <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Requires approval</p>
          </div>
        </Card>

        {/* Security Alerts */}
        <Card className="p-3 flex items-center gap-3 cursor-pointer hover:border-red-200 dark:hover:border-red-800 transition-colors" onClick={() => navigate(`${basePath}/security-alerts`)}>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">Sec. Alerts</p>
            {isLoading ? <Skeleton className="h-6 w-8 mt-0.5" /> : (
              <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">{alertCounts.total}</p>
            )}
            <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
              {alertCounts.high} High · {alertCounts.medium} Med
            </p>
          </div>
        </Card>
      </div>

      {/* ── Row 3: Attendance Trend (full width) + Attendance Approval (side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Attendance Trend – Area Chart (takes 2 cols) */}
        <Card className="p-4 lg:col-span-2">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-2">
            Attendance Trend (Last 30 Days)
          </h3>
          <div className="h-48">
            {isLoading ? <Skeleton className="w-full h-full" /> : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={attendanceTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} interval={4} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                  <Area type="monotone" dataKey="present" stroke="#22C55E" strokeWidth={2} fill="url(#presentGrad)" name="Present" />
                  <Area type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={1.5} fill="url(#absentGrad)" name="Absent" />
                  <Line type="monotone" dataKey="late" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="Late" />
                  <Line type="monotone" dataKey="onLeave" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="On Leave" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Attendance Approval + Leave Overview stacked */}
        <div className="flex flex-col gap-3">
          {/* Attendance Approval Donut */}
          <Card className="p-4 flex-1">
            <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-2">
              Attendance Approval (Today)
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-24 h-24 relative shrink-0">
                {isLoading ? <Skeleton className="w-full h-full rounded-full" /> : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={attApprovalData.length ? attApprovalData : [{ name: 'No Data', value: 1, color: '#e5e7eb' }]}
                        cx="50%" cy="50%"
                        innerRadius={28} outerRadius={42}
                        dataKey="value"
                      >
                        {(attApprovalData.length ? attApprovalData : [{ color: '#e5e7eb' }]).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-gray-900 dark:text-white">{attApproval.total}</span>
                  <span className="text-[9px] text-gray-600 dark:text-gray-400">Total</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-gray-800 dark:text-gray-300">Approved: <strong>{attApproval.approved}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                  <span className="text-gray-800 dark:text-gray-300">Pending: <strong>{attApproval.pending}</strong></span>
                </div>
              </div>
            </div>
          </Card>

          {/* Leave Overview */}
          <Card className="p-4 flex-1">
            <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-2">
              Leave Requests
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 relative shrink-0">
                {isLoading ? <Skeleton className="w-full h-full rounded-full" /> : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={leaveOverviewData.length ? leaveOverviewData : [{ name: 'No Data', value: 1, color: '#e5e7eb' }]}
                        cx="50%" cy="50%"
                        innerRadius={22} outerRadius={36}
                        dataKey="value"
                      >
                        {(leaveOverviewData.length ? leaveOverviewData : [{ color: '#e5e7eb' }]).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-gray-900 dark:text-white">{leaveOverview.total}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1 text-[11px] min-w-0">
                {leaveOverviewData.length === 0 && !isLoading && (
                  <span className="text-gray-500 dark:text-gray-400">No leave requests</span>
                )}
                {leaveOverviewData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-700 dark:text-gray-300 truncate">{item.name}</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white shrink-0">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Row 4: Top Hubs Active + AWOL Chart (widened, 2 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Top Hubs by Active Employees – horizontal ranked bars */}
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-2 flex justify-between items-center gap-2">
            <span className="truncate">Top Hubs – Active Employees</span>
            {topHubsActive[0] && (
              <Badge variant="success" className="text-[9px] shrink-0">
                <TrendingUp className="w-3 h-3 mr-1 inline" />
                <span className="truncate max-w-[120px] inline-block align-bottom">{topHubsActive[0].name}</span>
              </Badge>
            )}
          </h3>
          <div className="h-44">
            {isLoading ? <Skeleton className="w-full h-full" /> : topHubsActive.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                No hub data available
              </div>
            ) : (() => {
              const chartData = topHubsActive.slice(0, 8);
              const maxActive = Math.max(...chartData.map((d: { value: number }) => d.value), 1);
              const barSize = calcBarSize(chartData.length);
              return (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 2, right: 36, left: 4, bottom: 2 }}
                    barCategoryGap="8%"
                  >
                    <defs>
                      <linearGradient id="activeBarGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#16A34A" />
                        <stop offset="100%" stopColor="#4ADE80" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.4} />
                    <XAxis
                      type="number"
                      domain={[0, maxActive]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: '#6b7280' }}
                      tickCount={4}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={118}
                      tick={{ fontSize: 9, fill: '#374151' }}
                      tickFormatter={(v: string) => truncateHubName(v, 18)}
                    />
                    <Tooltip content={<HubChartTooltip />} cursor={{ fill: 'rgba(34,197,94,0.06)' }} />
                    <Bar
                      dataKey="value"
                      fill="url(#activeBarGrad)"
                      radius={[0, 6, 6, 0]}
                      barSize={barSize}
                      name="Active Employees"
                      label={{ position: 'right', fill: '#374151', fontSize: 10, fontWeight: 600 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </Card>

        {/* AWOL / Resign / Blacklist – horizontal stacked bars (better for long hub names) */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
            <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300">
              AWOL / Resign / Blacklist By Hub
            </h3>
            <div className="flex items-center gap-3 text-[10px] text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F97316]" />AWOL</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6B7280]" />Resign</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]" />Blacklist</span>
            </div>
          </div>
          <div className="h-44">
            {isLoading ? <Skeleton className="w-full h-full" /> : awolResignBlacklist.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                No AWOL / Resign / Blacklist data
              </div>
            ) : (() => {
              const chartData = awolResignBlacklist.slice(0, 8);
              const barSize = calcBarSize(chartData.length);
              return (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 2, right: 8, left: 4, bottom: 2 }}
                    barCategoryGap="8%"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.4} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: '#6b7280' }}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={118}
                      tick={{ fontSize: 9, fill: '#374151' }}
                      tickFormatter={(v: string) => truncateHubName(v, 18)}
                    />
                    <Tooltip content={<HubChartTooltip />} cursor={{ fill: 'rgba(243,244,246,0.5)' }} />
                    <Bar dataKey="AWOL" stackId="status" fill="#F97316" barSize={barSize} name="AWOL" />
                    <Bar dataKey="Resign" stackId="status" fill="#6B7280" barSize={barSize} name="Resign" />
                    <Bar dataKey="Blacklist" stackId="status" fill="#EF4444" barSize={barSize} name="Blacklist" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </Card>
      </div>

      {/* ── Row 4b: Top 10 Employees ── */}
      <TopEmployeesCard />

      {/* ── Row 5: Overtime + Security Summary + Recent Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Top Hubs by Overtime */}
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-2">
            Top Hubs – Overtime Hours (This Month)
          </h3>
          <div className="h-40">
            {isLoading ? <Skeleton className="w-full h-full" /> : topHubsOvertime.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
                No overtime data this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={topHubsOvertime.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name" type="category"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 9, fill: '#374151' }} width={100}
                  />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Bar
                    dataKey="value"
                    fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={10}
                    label={{ position: 'right', fill: '#374151', fontSize: 9, formatter: (val: any) => `${val}h` }}
                    name="Overtime (hrs)"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Security Alert Summary */}
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-3">
            Security Alert Summary
          </h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(['critical', 'high', 'medium', 'low'] as const).map((severity) => (
                <div key={severity} className={`rounded-lg p-2.5 text-center ${SEVERITY_BG[severity]}`}>
                  <div className="text-xl font-black">{alertCounts[severity] ?? 0}</div>
                  <div className="text-[10px] font-semibold capitalize">{severity}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className="font-medium">Unresolved</span>
            <span className="font-bold text-red-600">{alertCounts.unresolved ?? 0}</span>
          </div>
        </Card>

        {/* Recent Security Alerts */}
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-3 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Recent Security Alerts
          </h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : recentAlerts.length === 0 ? (
            <div className="flex items-center justify-center h-28 text-gray-500 dark:text-gray-400 text-sm">
              No recent security alerts
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {recentAlerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800/50 pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${SEVERITY_BG[alert.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                      {alert.severity?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-200 truncate">{alert.alert_type ?? 'Alert'}</p>
                      <p className="text-gray-500 dark:text-gray-400 truncate max-w-[120px]">{alert.details}</p>
                    </div>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 shrink-0 ml-2 text-[10px]">{formatDateTime(alert.created_at)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-center pt-2 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => navigate(`${basePath}/security-alerts`)} className="text-red-600 text-xs font-bold hover:underline">View all alerts →</button>
          </div>
        </Card>
      </div>

      {/* ── Row 6: Financial & Payroll Analytics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Payslip Trend per 15 Days Area Chart */}
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-2">
            Payslip Net Pay Trend (Per 15 Days)
          </h3>
          <div className="h-44">
            {isLoading ? <Skeleton className="w-full h-full" /> : (payslipTrendData.length === 0) ? (
              <div className="h-full flex items-center justify-center text-gray-505 dark:text-gray-400 text-xs">
                No payslip data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={payslipTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'currentColor' }} className="text-gray-950 dark:text-gray-400 font-semibold" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'currentColor' }} className="text-gray-950 dark:text-gray-400 font-semibold" />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} formatter={(val: any) => [`₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Total Net Pay']} />
                  <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#payGrad)" name="Total Net Pay" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* What Hub Has the Highest Pay Bar Chart */}
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-2">
            Total Payroll Cost by Hub
          </h3>
          <div className="h-44">
            {isLoading ? <Skeleton className="w-full h-full" /> : (hubTotalPayData.length === 0) ? (
              <div className="h-full flex items-center justify-center text-gray-505 dark:text-gray-400 text-xs">
                No payroll data by hub
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={hubTotalPayData.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name" type="category"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 9, fill: 'currentColor' }} width={90}
                    tickFormatter={(v: string) => truncateHubName(v, 14)}
                    className="text-gray-950 dark:text-gray-400 font-semibold"
                  />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} formatter={(val: any) => [`₱${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Total Cost']} />
                  <Bar
                    dataKey="value"
                    fill="#10B981" radius={[0, 4, 4, 0]} barSize={10}
                    label={{ position: 'right', fill: 'currentColor', fontSize: 9, formatter: (val: any) => `₱${Math.round(val / 1000)}k`, className: 'text-gray-955 dark:text-gray-300 font-bold' }}
                    name="Total Cost"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Highest Paid Employee per Hub Bar Chart */}
        <Card className="p-4">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-gray-300 mb-2">
            Highest Paid Employee per Hub
          </h3>
          <div className="h-44">
            {isLoading ? <Skeleton className="w-full h-full" /> : (highestPaidData.length === 0) ? (
              <div className="h-full flex items-center justify-center text-gray-505 dark:text-gray-400 text-xs">
                No top paid employee data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={highestPaidData.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="hub_name" type="category"
                    axisLine={false} tickLine={false}
                    tick={{ fontSize: 9, fill: 'currentColor' }} width={90}
                    tickFormatter={(v: string) => truncateHubName(v, 14)}
                    className="text-gray-950 dark:text-gray-400 font-semibold"
                  />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-2.5 py-1.5 text-xs text-left">
                        <p className="font-bold text-gray-950 dark:text-white">{item.employee_name}</p>
                        <p className="text-gray-550 dark:text-gray-400 text-[10px]">{item.hub_name}</p>
                        <p className="text-blue-600 font-semibold mt-1">₱{Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                    );
                  }} />
                  <Bar
                    dataKey="amount"
                    fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={10}
                    label={{ position: 'right', fill: 'currentColor', fontSize: 9, formatter: (val: any) => `₱${Math.round(val / 1000)}k`, className: 'text-gray-955 dark:text-gray-300 font-bold' }}
                    name="Amount"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
