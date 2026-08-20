import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Download, 
  Search, 
  Eye, 
  Clock, 
  Award, 
  AlertTriangle, 
  RefreshCw, 
  MapPin 
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import AdminMobileProfile from '@/components/AdminMobileProfile';
import { useAuth } from '@/hooks/useAuth';
import { useGetAttendance, useGetAttendanceSummary, useGetEmployee } from '@/hooks/useQueries';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { ImageViewer } from '@/components/ImageViewer';
import { apiUrl } from '@/constants/api';
import { useToast } from '@/hooks/useToast';

export const AdminEmployeeAttendanceHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isHR, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [range, setRange] = useState<'this_month' | 'this_week' | 'last_week' | 'last_month' | 'custom'>('this_month');
  const [status, setStatus] = useState<'All' | 'Present' | 'Late' | 'Absent' | 'Overtime'>('All');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [previewSrc, setPreviewSrc] = useState<string | string[] | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<any | null>(null);

  const basePath = window.location.pathname.startsWith('/hr') ? '/hr' : '/admin';

  const formatDateLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const params = useMemo(() => {
    const p: Record<string, any> = { employee_id: id };
    if (range === 'this_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      p.start_date = formatDateLocal(firstDay);
      p.end_date = formatDateLocal(lastDay);
    } else if (range === 'this_week') {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      p.start_date = formatDateLocal(monday);
      p.end_date = formatDateLocal(sunday);
    } else if (range === 'last_week') {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const mondayPrev = new Date(now);
      mondayPrev.setDate(now.getDate() - diffToMonday - 7);
      
      const sundayPrev = new Date(mondayPrev);
      sundayPrev.setDate(mondayPrev.getDate() + 6);

      p.start_date = formatDateLocal(mondayPrev);
      p.end_date = formatDateLocal(sundayPrev);
    } else if (range === 'last_month') {
      const now = new Date();
      const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      p.start_date = formatDateLocal(firstDayPrev);
      p.end_date = formatDateLocal(lastDayPrev);
    } else if (range === 'custom') {
      if (customStart) p.start_date = customStart;
      if (customEnd) p.end_date = customEnd;
    }

    if (search) p.date = search;
    return p;
  }, [id, range, customStart, customEnd, search]);

  const attendanceQuery = useGetAttendance(params);
  const summaryQuery = useGetAttendanceSummary(params);
  const employeeQuery = useGetEmployee(Number(id));

  const attendance = normalizeApiResponse(attendanceQuery.data) || [];
  const summary = summaryQuery.data?.overall || {};

  // useGetEmployee hits /employees/{id}/ which returns a plain object (not paginated)
  // Handle all possible shapes: plain obj, { results: [...] }, or array
  const rawEmpData = employeeQuery.data as any;
  const employeeFromDB: any = rawEmpData
    ? Array.isArray(rawEmpData)
      ? rawEmpData[0]
      : rawEmpData.results
        ? rawEmpData.results[0]
        : rawEmpData
    : null;


  const filteredAttendance = useMemo(() => {
    return attendance.filter((rec: any) => {
      if (status && status !== 'All') {
        if (status === 'Overtime') {
          const otHours = Number(rec.overtime_hours || 0);
          const totalHours = Number(rec.total_hours || 0);
          if (otHours <= 0 && totalHours <= 8) return false;
        } else {
          if (String(rec.status).toLowerCase() !== status.toLowerCase()) return false;
        }
      }
      return true;
    });
  }, [attendance, status]);

  useEffect(() => {
    if (!previewSrc) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewSrc(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewSrc]);

  const handleApproveAttendance = async (attendanceId?: number) => {
    if (!attendanceId) return;
    try {
      const res = await fetch(apiUrl(`attendance/${attendanceId}/approve/`), { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error('Failed to approve');
      success('Attendance approved');
      attendanceQuery.refetch();
      summaryQuery.refetch();
    } catch (err) {
      toastError('Failed to approve attendance');
      console.error(err);
    }
  };

  const handleDisapproveAttendance = async (attendanceId?: number) => {
    if (!attendanceId) return;
    if (!window.confirm('Disapprove this attendance and remove recorded hours? This will clear clock in/out for the day.')) return;
    try {
      const res = await fetch(apiUrl(`attendance/${attendanceId}/disapprove/`), { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}`, 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error('Failed to disapprove');
      success('Attendance disapproved and hours removed');
      attendanceQuery.refetch();
      summaryQuery.refetch();
    } catch (err) {
      toastError('Failed to disapprove attendance');
      console.error(err);
    }
  };

  const getStatusBadge = (recStatus: string) => {
    switch (recStatus) {
      case 'Present':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            Present
          </span>
        );
      case 'Late':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            Late
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 border border-red-200/40 dark:border-red-900/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-450" />
            Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/40 dark:border-blue-900/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {recStatus}
          </span>
        );
    }
  };

  const getEmployeeName = () => {
    if (attendance.length > 0) {
      return attendance[0].employee_name || attendance[0].full_name || 'Staff Member';
    }
    return 'Employee';
  };

  const getEmployeeInfo = () => {
    // Prefer data from the employees endpoint (has profile image)
    if (employeeFromDB) {
      // Build full name from parts when full_name field isn't present
      const nameParts = [
        employeeFromDB.firstname,
        employeeFromDB.middle_initial,
        employeeFromDB.lastname
      ].filter(Boolean).join(' ');
      const name = employeeFromDB.full_name || nameParts || employeeFromDB.employee_name || 'Staff Member';

      return {
        name,
        image: employeeFromDB.profile_image_url || employeeFromDB.profile_image || employeeFromDB.profile_photo || null,
        position: employeeFromDB.position || employeeFromDB.role || '',
        jtp_code: employeeFromDB.employee_id || employeeFromDB.jtp_code || '',
        status: employeeFromDB.status || 'Active',
      };
    }
    // Fall back to attendance records
    if (attendance.length > 0) {
      return {
        name: attendance[0].employee_name || attendance[0].full_name || 'Staff Member',
        image: attendance[0].profile_image_url || attendance[0].employee_photo || null,
        position: attendance[0].position || attendance[0].role || '',
        jtp_code: attendance[0].jtp_code || attendance[0].employee_id || '',
        status: 'Active',
      };
    }
    return { name: 'Loading...', image: null, position: '', jtp_code: '', status: 'Active' };
  };

  const employeeInfo = getEmployeeInfo();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070E1E] text-gray-900 dark:text-white pb-24">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="lg:ml-64">
        <AdminMobileProfile />
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#070E1E]/90 backdrop-blur-md border-b border-gray-100 dark:border-slate-800/80 px-4 py-3 safe-top">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`${basePath}/attendance`)} 
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300 shadow-sm transition-all active:scale-95" 
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Employee Avatar in Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 dark:border-slate-700 shadow-sm shrink-0">
                {employeeInfo.image ? (
                  <img src={employeeInfo.image} alt={employeeInfo.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-black text-sm">
                    {employeeInfo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-left">
                <h2 className="font-extrabold text-base tracking-tight text-gray-900 dark:text-white leading-tight">Attendance History</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{employeeInfo.name}{employeeInfo.jtp_code ? ` · ${employeeInfo.jtp_code}` : ''}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* SIDEBAR (Left Column) */}
          <aside className="w-full lg:w-[340px] shrink-0 space-y-6 lg:sticky lg:top-24">

            {/* Employee Profile Card */}
            <div className="rounded-[28px] bg-white dark:bg-[#0F172A] border border-gray-150 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center gap-4">
                {/* Large Avatar */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-slate-700 shadow-md shrink-0">
                  {employeeInfo.image ? (
                    <img src={employeeInfo.image} alt={employeeInfo.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-black text-2xl">
                      {employeeInfo.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-tight truncate">{employeeInfo.name}</h3>
                </div>
              </div>
            </div>

            {/* DTR Welcome & Overall stats */}
            <div className="rounded-[32px] bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-slate-800/80 p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide uppercase text-blue-400">DTR Summary</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Stats for selected range</p>
                </div>
              </div>

              <div className="mt-6 space-y-3.5">
                {/* Present */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    <span className="text-xs text-slate-300 font-semibold uppercase tracking-tight">Present Days</span>
                  </div>
                  <span className="font-black text-sm text-emerald-400">{summary.present ?? 0}</span>
                </div>

                {/* Late */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
                    <span className="text-xs text-slate-300 font-semibold uppercase tracking-tight">Late Arrivals</span>
                  </div>
                  <span className="font-black text-sm text-amber-400">{summary.late ?? 0}</span>
                </div>

                {/* Absent */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                    <span className="text-xs text-slate-300 font-semibold uppercase tracking-tight">Absent Days</span>
                  </div>
                  <span className="font-black text-sm text-red-400">{summary.absent ?? 0}</span>
                </div>

                {/* Overtime */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                    <span className="text-xs text-slate-300 font-semibold uppercase tracking-tight">Overtime Hours</span>
                  </div>
                  <span className="font-black text-sm text-blue-400">{summary.overtime_hours ?? 0} hrs</span>
                </div>
              </div>
            </div>

            {/* Performance metrics breakdown */}
            <div className="rounded-[32px] bg-white dark:bg-[#0F172A] border border-gray-150 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800/80 pb-3 mb-2">
                <Award className="w-4 h-4 text-red-600" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-slate-300">Period Analytics</h4>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400">Total Hours</span>
                  <span className="font-extrabold text-gray-800 dark:text-slate-200">{summary.total_hours ?? 0} hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400">Average Daily Hours</span>
                  <span className="font-extrabold text-gray-800 dark:text-slate-200">
                    {summary.working_days ? ((summary.total_hours || 0) / (summary.working_days || 1)).toFixed(2) : '0.00'} hrs
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-slate-400">Attendance Rate</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {summary.working_days && summary.present ? `${Math.round((summary.present / summary.working_days) * 100)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>

          </aside>

          {/* MAIN CONTENT (Right Column) */}
          <section className="flex-1 w-full space-y-6">
            
            {/* Filter controls */}
            <div className="bg-white dark:bg-[#0F172A] border border-gray-150 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              {/* Range Selector */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'this_week', label: 'This Week' },
                  { id: 'last_week', label: 'Last Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setRange(btn.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      range === btn.id
                        ? 'bg-red-50 text-red-750 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30'
                        : 'bg-gray-50 text-gray-650 hover:bg-gray-100 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800 border border-transparent'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Picker Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">From Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value);
                      setRange('custom');
                    }}
                    className="p-3 bg-gray-50 dark:bg-slate-900 text-xs font-semibold rounded-xl border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">To Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value);
                      setRange('custom');
                    }}
                    className="p-3 bg-gray-50 dark:bg-slate-900 text-xs font-semibold rounded-xl border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Search and Status Dropdown */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="flex-1 relative">
                  <input
                    placeholder="Search by date (YYYY-MM-DD)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-slate-900 text-xs font-semibold rounded-xl border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-200 pl-10 outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                  <Search className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                </div>

                <div className="w-full sm:w-48">
                  <select
                    title="Status Filter"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-3 bg-gray-50 dark:bg-slate-900 text-xs font-bold rounded-xl border border-gray-100 dark:border-slate-800 text-gray-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                    <option value="Overtime">Overtime</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    attendanceQuery.refetch();
                    summaryQuery.refetch();
                  }}
                  className="px-5 py-3 rounded-xl bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Attendance DTR List */}
            <div className="space-y-4">
              {attendanceQuery.isLoading && (
                <div className="space-y-4">
                  <div className="h-32 bg-white dark:bg-[#0F172A] border border-gray-150 dark:border-slate-800 rounded-3xl animate-pulse" />
                  <div className="h-32 bg-white dark:bg-[#0F172A] border border-gray-150 dark:border-slate-800 rounded-3xl animate-pulse" />
                </div>
              )}

              {filteredAttendance.length === 0 && !attendanceQuery.isLoading && (
                <div className="bg-white dark:bg-[#0F172A] border border-gray-150 dark:border-slate-800 rounded-3xl p-10 text-center text-gray-400 dark:text-slate-500 font-medium">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-slate-350" />
                  No attendance records found for the selected period.
                </div>
              )}

              {filteredAttendance.map((rec: any) => {
                const dateStr = rec.date
                  ? new Date(rec.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      weekday: 'short'
                    })
                  : '';
                const clockIn = rec.clock_in_time
                  ? new Date(rec.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const clockOut = rec.clock_out_time
                  ? new Date(rec.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const inLoc = rec.clock_in_latitude
                  ? `${Number(rec.clock_in_latitude).toFixed(4)}, ${Number(rec.clock_in_longitude).toFixed(4)}`
                  : '—';
                const outLoc = rec.clock_out_latitude
                  ? `${Number(rec.clock_out_latitude).toFixed(4)}, ${Number(rec.clock_out_longitude).toFixed(4)}`
                  : '—';

                return (
                  <article
                    key={rec.id || `${rec.date}-${rec.employee}`}
                    className="bg-white dark:bg-[#0F172A] border border-gray-150 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-red-200/50 dark:hover:border-red-950/35 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                      
                      {/* Left: Metadata & Timings */}
                      <div className="flex-1 min-w-0 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800/80 pb-2.5">
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-widest font-bold">{dateStr}</p>
                            <h4 className="text-base font-black text-gray-850 dark:text-white uppercase tracking-tight mt-0.5">
                              {rec.employee_name || 'Staff Record'}
                            </h4>
                          </div>
                          <div>
                            {getStatusBadge(rec.status)}
                          </div>
                        </div>

                        {/* In & Out Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Clock In */}
                          <div className="p-3 bg-gray-50 dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800/35 rounded-2xl">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-slate-500">Clock In</span>
                            <p className="text-sm font-black text-gray-800 dark:text-slate-200 mt-0.5">{clockIn}</p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1.5 flex items-center gap-1 font-mono">
                              <MapPin size={10} className="text-slate-400" />
                              {inLoc}
                            </p>
                          </div>

                          {/* Clock Out */}
                          <div className="p-3 bg-gray-50 dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800/35 rounded-2xl">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-slate-500">Clock Out</span>
                            <p className="text-sm font-black text-gray-800 dark:text-slate-200 mt-0.5">{clockOut}</p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1.5 flex items-center gap-1 font-mono">
                              <MapPin size={10} className="text-slate-400" />
                              {outLoc}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Camera Images & Hours */}
                      <div className="w-full md:w-36 flex flex-col items-center justify-between self-stretch shrink-0 bg-gray-50/50 dark:bg-[#070e1e]/40 border border-gray-100 dark:border-slate-800/40 p-4 rounded-3xl">
                        
                        {/* Images list */}
                        <div className="flex gap-2.5 items-center justify-center">
                          {/* IN photo */}
                          <div className="relative group w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                            {rec.clock_in_image ? (
                              <>
                                <img src={rec.clock_in_image} alt="in" className="w-full h-full object-cover" />
                                <button 
                                  title="View Check-in Photo"
                                  onClick={() => setPreviewSrc([rec.clock_in_image])}
                                  className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Eye size={14} />
                                </button>
                              </>
                            ) : (
                              <div className="text-[9px] text-gray-450 dark:text-slate-500 uppercase tracking-tight text-center font-bold">In</div>
                            )}
                          </div>

                          {/* OUT photo */}
                          <div className="relative group w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                            {rec.clock_out_image ? (
                              <>
                                <img src={rec.clock_out_image} alt="out" className="w-full h-full object-cover" />
                                <button 
                                  title="View Check-out Photo"
                                  onClick={() => setPreviewSrc([rec.clock_out_image])}
                                  className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Eye size={14} />
                                </button>
                              </>
                            ) : (
                              <div className="text-[9px] text-gray-450 dark:text-slate-500 uppercase tracking-tight text-center font-bold">Out</div>
                            )}
                          </div>
                        </div>

                        {/* Total Worked Hours */}
                        <div className="text-center mt-3 pt-3 border-t border-gray-100 dark:border-slate-800/80 w-full">
                          <p className="font-mono font-black text-base text-gray-800 dark:text-slate-200">{rec.total_hours ?? '0.00'}</p>
                          <p className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-slate-500">Worked Hours</p>
                        </div>

                      </div>
                    </div>

                    {/* Status badge for HR and Admin only */}
                    {(isHR || isAdmin) && (
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-3.5">
                        <div />
                        <div className="flex items-center gap-2">
                          {rec.is_approved ? (
                            <div className="text-[12px] px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold border border-emerald-200/30">Approved</div>
                          ) : ((!rec.clock_in_time && !rec.clock_out_time && rec.status === 'Absent') ? (
                            <div className="text-[12px] px-3.5 py-1.5 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-450 font-bold border border-rose-200/30">Disapproved</div>
                          ) : (
                            <div className="text-[12px] px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 font-bold border border-amber-200/30">Pending Approval</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            
          </section>

        </div>
      </main>

      {previewSrc && <ImageViewer src={previewSrc} onClose={() => setPreviewSrc(null)} />}
      </div>
    </div>
  );
};

export default AdminEmployeeAttendanceHistoryPage;
