import { useState, useEffect, useRef } from 'react';
import { Clock, Loader2, History, Camera, Fingerprint, ChevronRight, Calendar, LogIn, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetAttendance, useClockIn, useClockOut } from '@/hooks/useQueries';

interface AttendanceSidebarProps {
  employeeId: number;
  onViewHistory?: () => void;
}

const formatAttendanceTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return '-- : --';
  try {
    if (timeStr.includes(':') && !timeStr.includes('-') && !timeStr.includes('T')) {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const hour = parseInt(parts[0], 10);
        const minutes = parts[1].padStart(2, '0');
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        const displayHourStr = displayHour.toString().padStart(2, '0');
        return `${displayHourStr}:${minutes} ${ampm}`;
      }
    }
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      return '-- : --';
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).replace(' ', ' ');
  } catch (error) {
    return '-- : --';
  }
};

export const AttendanceSidebar = ({ employeeId, onViewHistory }: AttendanceSidebarProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const attendanceQuery = useGetAttendance({ employee_id: employeeId, date: today });
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  
  const todayAttendance = attendanceQuery.data?.results?.[0] || attendanceQuery.data?.[0] || null;
  const hasClockedIn = !!todayAttendance?.clock_in_time;
  const hasClockedOut = !!todayAttendance?.clock_out_time;
  const canClockIn = !hasClockedIn;
  const canClockOut = hasClockedIn && !hasClockedOut;
  
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours} : ${minutes} : ${seconds}`;
  };
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const handleClockIn = async () => {
    if (!canClockIn) { toast.error('Already clocked in today'); return; }
    const formData = new FormData();
    formData.append('employee', employeeId.toString());
    formData.append('date', today);
    if (file) formData.append('clock_in_image', file);
    try {
      await clockInMutation.mutateAsync(formData);
      toast.success('Clocked in successfully');
      attendanceQuery.refetch();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed to clock in'); }
  };
  
  const handleClockOut = async () => {
    if (!canClockOut) { toast.error('Already clocked out today'); return; }
    const formData = new FormData();
    formData.append('employee', employeeId.toString());
    formData.append('date', today);
    if (file) formData.append('clock_out_image', file);
    try {
      await clockOutMutation.mutateAsync(formData);
      toast.success('Clocked out successfully');
      attendanceQuery.refetch();
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed to clock out'); }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };
  
  const getStatusText = () => {
    if (!hasClockedIn) return 'Not Yet Clocked In';
    if (!hasClockedOut) return 'Working';
    return 'Completed';
  };

  const getStatusDotColor = () => {
    if (hasClockedOut) return 'bg-green-500';
    if (hasClockedIn) return 'bg-blue-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="w-full space-y-6 rounded-[32px] p-5
      dark:bg-gradient-to-b dark:from-[#050B16] dark:via-[#071220] dark:to-[#030814]
      bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7]">
      {/* Header with Calendar Button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Attendance Records
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View and track your attendance
          </p>
        </div>
        <button className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-[#4C0E16]/80 hover:bg-red-100 dark:hover:bg-[#4C0E16] border border-red-200 dark:border-[#70101B] text-red-600 dark:text-[#EF4444] flex items-center justify-center transition-all shadow-sm">
          <Calendar size={20} />
        </button>
      </div>

      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#FFF5F5] via-[#FFF8F8] to-[#FFF0F2] dark:from-[#4c0711] dark:via-[#1a080d] dark:to-[#0c101a] p-6 md:p-8 shadow-xl dark:shadow-2xl border border-red-200/50 dark:border-red-900/30 transition-all">
        {/* Glow rings & SVG waves to match screenshot decoration */}
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-red-500/5 dark:bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/5 dark:bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Animated/Subtle Wave overlays representing image curved backdrop */}
        <div className="absolute inset-0 opacity-20 dark:opacity-30 pointer-events-none overflow-hidden">
          <svg className="absolute -bottom-10 -right-10 w-[120%] h-[120%] text-red-300 dark:text-red-500" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0 350 C 150 350, 200 150, 400 200" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
            <path d="M 0 370 C 120 370, 180 180, 400 230" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <path d="M 0 390 C 100 390, 150 210, 400 260" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
            <path d="M 0 410 C 80 410, 120 240, 400 290" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          </svg>
        </div>

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-[#4C0E16]/80 flex items-center justify-center border border-red-250 dark:border-[#70101B]/40 transition-colors">
              <Clock size={22} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-950 dark:text-white leading-tight">
                Clock In & Click Out
              </h2>
              <p className="text-xs text-red-750/70 dark:text-red-300/80 mt-0.5">
                {formatDate(currentTime)}
              </p>
            </div>
          </div>

          {/* Large Time Display */}
          <div className="text-center space-y-4">
            <div className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-widest drop-shadow-[0_2px_8px_rgba(239,68,68,0.1)] dark:drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              {formatTime(currentTime)}
            </div>
            
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 dark:bg-black/35 backdrop-blur-md rounded-full border border-red-100 dark:border-white/5 shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusDotColor()} animate-pulse`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {getStatusText()}
              </span>
            </div>
          </div>

          {/* Clock In/Out Times Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/90 dark:bg-[#0B101D]/60 backdrop-blur-sm rounded-2xl p-4 border border-red-100/50 dark:border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center mb-2.5">
                <LogIn size={18} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                Clock In
              </p>
              <p className="text-xl font-bold text-slate-950 dark:text-white tracking-wide">
                {formatAttendanceTime(todayAttendance?.clock_in_time)}
              </p>
            </div>
            
            <div className="bg-white/90 dark:bg-[#0B101D]/60 backdrop-blur-sm rounded-2xl p-4 border border-red-100/50 dark:border-white/5 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20 flex items-center justify-center mb-2.5">
                <LogOut size={18} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                Clock Out
              </p>
              <p className="text-xl font-bold text-slate-950 dark:text-white tracking-wide">
                {formatAttendanceTime(todayAttendance?.clock_out_time)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Take Photo Section - OUTSIDE Crimson Card to match reference screenshot */}
      <div className="space-y-3">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
          id="attendance-photo" 
          ref={fileInputRef} 
        />
        <label htmlFor="attendance-photo" className="flex items-center justify-between w-full p-4 bg-white dark:bg-[#0B101D]/40 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0B101D]/60 hover:border-slate-400 dark:hover:border-white/20 transition-all group shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-all">
              <Camera size={18} />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                {file ? file.name : 'Take Photo'}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                Verify your attendance
              </span>
            </div>
          </div>
          <span className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            <ChevronRight size={18} />
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Main Clock In Button */}
        {canClockIn ? (
          <button 
            onClick={handleClockIn} 
            disabled={clockInMutation.isPending}
            className="w-full p-2.5 pr-6 rounded-2xl font-bold transition-all flex items-center justify-between text-base bg-gradient-to-r from-[#C41E3A] to-[#E53E3E] dark:from-[#A3091B] dark:to-[#700612] border border-red-200/50 dark:border-[#7A0F1D]/40 text-white shadow-[0_4px_16px_rgba(196,30,58,0.2)] dark:shadow-[0_4px_20px_rgba(163,9,27,0.25)] active:scale-[0.98] hover:brightness-110"
          >
            <div className="w-11 h-11 rounded-xl bg-white/20 dark:bg-black/25 border border-white/10 dark:border-white/5 flex items-center justify-center text-white mr-3">
              {clockInMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Fingerprint size={20} />
              )}
            </div>
            <span className="flex-1 text-center font-bold tracking-wide">
              {clockInMutation.isPending ? 'Processing...' : 'Clock In'}
            </span>
          </button>
        ) : (
          <button 
            disabled
            className="w-full p-2.5 pr-6 rounded-2xl font-bold transition-all flex items-center justify-between text-base text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#181F2C] border border-slate-200 dark:border-white/5 cursor-not-allowed"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-200/50 dark:bg-black/10 border border-slate-350 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 mr-3">
              <Fingerprint size={20} />
            </div>
            <span className="flex-1 text-center font-bold tracking-wide">
              Clock In
            </span>
          </button>
        )}

        {/* Clock Out Button */}
        {canClockOut ? (
          <button 
            onClick={handleClockOut} 
            disabled={clockOutMutation.isPending}
            className="w-full p-2.5 pr-6 rounded-2xl font-bold transition-all flex items-center justify-between text-base bg-gradient-to-r from-[#C41E3A] to-[#E53E3E] dark:from-[#A3091B] dark:to-[#700612] border border-red-200/50 dark:border-[#7A0F1D]/40 text-white shadow-[0_4px_16px_rgba(196,30,58,0.2)] dark:shadow-[0_4px_20px_rgba(163,9,27,0.25)] active:scale-[0.98] hover:brightness-110"
          >
            <div className="w-11 h-11 rounded-xl bg-white/20 dark:bg-black/25 border border-white/10 dark:border-white/5 flex items-center justify-center text-white mr-3">
              {clockOutMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Clock size={20} />
              )}
            </div>
            <span className="flex-1 text-center font-bold tracking-wide">
              {clockOutMutation.isPending ? 'Processing...' : 'Clock Out'}
            </span>
          </button>
        ) : (
          <button 
            disabled
            className="w-full p-2.5 pr-6 rounded-2xl font-bold transition-all flex items-center justify-between text-base text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#181F2C] border border-slate-200 dark:border-white/5 cursor-not-allowed"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-200/50 dark:bg-black/10 border border-slate-350 dark:border-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 mr-3">
              <Clock size={20} />
            </div>
            <span className="flex-1 text-center font-bold tracking-wide">
              Clock Out
            </span>
          </button>
        )}
      </div>

      {/* View History Button */}
      <button 
        onClick={onViewHistory}
        className="w-full p-2.5 pr-5 rounded-2xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-750 transition-all flex items-center justify-between font-bold group shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-all">
            <History size={18} />
          </div>
          <span>View Attendance History</span>
        </div>
        <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
      </button>
    </div>
  );
};

export default AttendanceSidebar;

