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
          <h1 className="text-2xl md:text-3xl font-bold text-white">Attendance Records</h1>
          <p className="text-sm text-slate-400">View and track your attendance</p>
        </div>
        <button className="w-12 h-12 rounded-2xl bg-red-950/40 text-red-500 flex items-center justify-center border border-red-500/20 hover:bg-red-950/60 transition-colors">
          <Calendar size={20} />
        </button>
      </div>

      {/* Main Clock In/Out Card */}
      <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#2E0008] via-[#7D0018] to-[#D90429] p-8 border border-red-400/10 shadow-[0_30px_100px_rgba(217,4,41,.45)]">
        {/* Decorative elements to match screenshot background waves/glows */}
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Abstract lines simulation using linear gradient lines */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-950/60 flex items-center justify-center border border-red-800/30">
              <Clock size={22} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Clock In & Click Out</h2>
              <p className="text-xs text-red-300/80">{formatDate(currentTime)}</p>
            </div>
          </div>

          {/* Large Time Display */}
          <div className="text-center space-y-4">
            <div className="text-5xl md:text-6xl font-black text-white font-mono tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              {formatTime(currentTime)}
            </div>
            
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/45 backdrop-blur-md rounded-full border border-white/5">
              <div className={`w-2 h-2 rounded-full ${getStatusDotColor()} animate-pulse`} />
              <span className="text-xs font-semibold text-slate-300">{getStatusText()}</span>
            </div>
          </div>

          {/* Clock In/Out Times (Matching layout from image) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/25 backdrop-blur-sm rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 text-green-500 flex items-center justify-center mb-2.5">
                <LogIn size={18} />
              </div>
              <p className="text-xs text-slate-400 font-medium mb-1">Clock In</p>
              <p className="text-xl font-bold text-white tracking-wide">{formatAttendanceTime(todayAttendance?.clock_in_time)}</p>
            </div>
            
            <div className="bg-black/25 backdrop-blur-sm rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center mb-2.5">
                <LogOut size={18} />
              </div>
              <p className="text-xs text-slate-400 font-medium mb-1">Clock Out</p>
              <p className="text-xl font-bold text-white tracking-wide">{formatAttendanceTime(todayAttendance?.clock_out_time)}</p>
            </div>
          </div>

          {/* Photo Section */}
          <div className="space-y-3 border-t border-white/10 pt-6">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
              id="attendance-photo" 
              ref={fileInputRef} 
            />
            <label htmlFor="attendance-photo" className="flex items-center justify-between w-full p-4 bg-black/20 backdrop-blur-sm rounded-2xl border border-dashed border-white/15 cursor-pointer hover:bg-black/30 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-white/10 transition-all">
                  <Camera size={18} />
                </div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-white">{file ? file.name : 'Take Photo'}</span>
                  <span className="block text-xs text-slate-400">Verify your attendance</span>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-white transition-colors">
                <ChevronRight size={18} />
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Main Clock In Button */}
        <button 
          onClick={handleClockIn} 
          disabled={!canClockIn || clockInMutation.isPending}
          className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 text-lg ${
            canClockIn 
              ? 'bg-gradient-to-r from-[#8B0000] to-[#C41E3A] hover:from-[#7A0000] hover:to-[#B31A33] shadow-lg shadow-red-950/20 active:scale-[0.98]' 
              : 'bg-slate-800/40 border border-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          {clockInMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              <Fingerprint size={20} className={canClockIn ? 'text-white' : 'text-slate-500'} />
              Clock In
            </>
          )}
        </button>

        {/* Clock Out Button */}
        <button 
          onClick={handleClockOut} 
          disabled={!canClockOut || clockOutMutation.isPending}
          className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 text-lg ${
            canClockOut 
              ? 'bg-gradient-to-r from-[#8B0000] to-[#C41E3A] hover:from-[#7A0000] hover:to-[#B31A33] shadow-lg shadow-red-950/20 active:scale-[0.98]' 
              : 'bg-slate-800/40 border border-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          {clockOutMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              <Clock size={20} className={canClockOut ? 'text-white' : 'text-slate-500'} />
              Clock Out
            </>
          )}
        </button>
      </div>

      {/* View History Button */}
      <button 
        onClick={onViewHistory}
        className="w-full py-4 px-6 rounded-2xl bg-[#090F1D] border border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800/30 hover:border-slate-700 transition-all flex items-center justify-between font-semibold group"
      >
        <div className="flex items-center gap-2.5">
          <History size={18} className="text-slate-400 group-hover:text-white transition-colors" />
          <span>View Attendance History</span>
        </div>
        <ChevronRight size={18} className="text-slate-400 group-hover:text-white transition-colors" />
      </button>
    </div>
  );
};

export default AttendanceSidebar;
