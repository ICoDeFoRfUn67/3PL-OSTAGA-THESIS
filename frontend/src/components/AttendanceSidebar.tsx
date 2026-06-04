import { useState, useEffect, useRef } from 'react';
import { Clock, Loader2, History, Camera, Fingerprint, ChevronRight, Calendar, LogIn, LogOut, AlertCircle, X } from 'lucide-react';
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoRequired, setShowPhotoRequired] = useState(false);
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

  useEffect(() => {
    if (file) setShowPhotoRequired(false);
  }, [file]);
  
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours} : ${minutes} : ${seconds}`;
  };
  
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const handleClockIn = async () => {
    if (!canClockIn) { toast.error('Already clocked in today'); return; }
    if (!file) {
      setShowPhotoRequired(true);
      toast.error('Please take a photo first before clocking in!');
      return;
    }
    const formData = new FormData();
    formData.append('employee', employeeId.toString());
    formData.append('date', today);
    formData.append('clock_in_image', file);
    try {
      await clockInMutation.mutateAsync(formData);
      toast.success('Clocked in successfully');
      attendanceQuery.refetch();
      setFile(null);
      setPhotoPreview(null);
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed to clock in'); }
  };
  
  const handleClockOut = async () => {
    if (!canClockOut) { toast.error('Already clocked out today'); return; }
    if (!file) {
      setShowPhotoRequired(true);
      toast.error('Please take a photo first before clocking out!');
      return;
    }
    const formData = new FormData();
    formData.append('employee', employeeId.toString());
    formData.append('date', today);
    formData.append('clock_out_image', file);
    try {
      await clockOutMutation.mutateAsync(formData);
      toast.success('Clocked out successfully');
      attendanceQuery.refetch();
      setFile(null);
      setPhotoPreview(null);
    } catch (error: any) { toast.error(error.response?.data?.error || 'Failed to clock out'); }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const clearPhoto = () => {
    setFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div className="w-full space-y-4 rounded-[32px] p-5 bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7] dark:from-[#050B16] dark:via-[#071220] dark:to-[#030814]">
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

      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFF5F5] via-[#FFF8F8] to-[#FFF0F2] dark:from-[#4c0711] dark:via-[#1a080d] dark:to-[#0c101a] p-5 shadow-xl dark:shadow-2xl border border-red-200/50 dark:border-red-900/30 transition-all">
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-red-500/5 dark:bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/5 dark:bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-[#4C0E16]/80 flex items-center justify-center border border-red-250 dark:border-[#70101B]/40 transition-colors">
              <Clock size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-red-950 dark:text-white leading-tight">
                Clock In & Clock Out
              </h2>
              <p className="text-[11px] text-red-750/70 dark:text-red-305/85 mt-0.5">
                {formatDate(currentTime)}
              </p>
            </div>
          </div>

          <div className="text-center space-y-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-widest drop-shadow-[0_2px_8px_rgba(239,68,68,0.1)] dark:drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              {formatTime(currentTime)}
            </div>
            
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/80 dark:bg-black/35 backdrop-blur-md rounded-full border border-red-100 dark:border-white/5 shadow-sm">
              <div className={`w-2 h-2 rounded-full ${getStatusDotColor()} animate-pulse`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {getStatusText()}
              </span>
            </div>
          </div>

          {/* Stacking vertically ("one vertical") */}
          <div className="space-y-3">
            {/* Clock In Card */}
            <div className="bg-white/90 dark:bg-[#0B101D]/60 backdrop-blur-sm rounded-2xl p-3.5 px-4 border border-red-105/50 dark:border-white/5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center">
                  <LogIn size={16} />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Clock In</span>
              </div>
              <span className="text-base font-bold text-slate-950 dark:text-white tracking-wide">
                {formatAttendanceTime(todayAttendance?.clock_in_time)}
              </span>
            </div>
            
            {/* Clock Out Card */}
            <div className="bg-white/90 dark:bg-[#0B101D]/60 backdrop-blur-sm rounded-2xl p-3.5 px-4 border border-red-105/50 dark:border-white/5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 flex items-center justify-center">
                  <LogOut size={16} />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Clock Out</span>
              </div>
              <span className="text-base font-bold text-slate-950 dark:text-white tracking-wide">
                {formatAttendanceTime(todayAttendance?.clock_out_time)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Take Photo Section with Preview & Visual Alert */}
      <div className="space-y-3">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
          id="attendance-photo" 
          ref={fileInputRef} 
        />
        
        {photoPreview ? (
          <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-black aspect-video max-h-48 flex items-center justify-center">
            <img src={photoPreview} alt="Selfie preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all border border-white/10"
              title="Remove photo"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label 
            htmlFor="attendance-photo" 
            className={`flex items-center justify-between w-full p-4 bg-white dark:bg-[#0B101D]/40 backdrop-blur-sm rounded-2xl border border-dashed cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0B101D]/60 hover:border-slate-450 dark:hover:border-white/20 transition-all group shadow-sm ${
              showPhotoRequired 
                ? 'border-red-500 dark:border-red-500/80 animate-pulse bg-red-50/10 dark:bg-red-950/5' 
                : 'border-slate-300 dark:border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
                showPhotoRequired 
                  ? 'bg-red-50 dark:bg-[#4C0E16]/40 border-red-200 dark:border-[#70101B] text-red-650 dark:text-red-400' 
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
              }`}>
                <Camera size={18} />
              </div>
              <div className="text-left">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  Take Photo <span className="text-red-500 dark:text-red-400 font-extrabold">*</span>
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Required before clock in/out
                </span>
              </div>
            </div>
            <span className="text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              <ChevronRight size={18} />
            </span>
          </label>
        )}

        {/* Informative Warning Banner */}
        {!file && (
          <div className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-start gap-2.5 text-left">
            <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <p className="text-xs font-bold text-red-800 dark:text-red-300">Photo Required</p>
              <p className="text-[10px] text-red-600 dark:text-red-400/80 mt-0.5 leading-relaxed font-semibold">
                You must upload or capture a photo before you can Clock In or Clock Out.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sleeker Action Buttons */}
      <div className="space-y-3">
        {/* Main Clock In Button */}
        {canClockIn ? (
          <button 
            onClick={handleClockIn} 
            disabled={clockInMutation.isPending}
            className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.98] border ${
              !file 
                ? 'bg-slate-100 dark:bg-[#181F2C] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/5 opacity-80 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 dark:border-emerald-600/30 shadow-md hover:brightness-110'
            }`}
          >
            {clockInMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Fingerprint size={16} />
            )}
            <span>{clockInMutation.isPending ? 'Processing...' : !file ? 'Photo Required' : 'Clock In'}</span>
          </button>
        ) : (
          <button 
            disabled
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#181F2C] border border-slate-200 dark:border-white/5 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Fingerprint size={16} />
            <span>Clocked In ✓</span>
          </button>
        )}

        {/* Clock Out Button */}
        {canClockOut ? (
          <button 
            onClick={handleClockOut} 
            disabled={clockOutMutation.isPending}
            className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.98] border ${
              !file 
                ? 'bg-slate-100 dark:bg-[#181F2C] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/5 opacity-80 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-600 to-red-500 text-white border-rose-500 dark:border-rose-600/30 shadow-md hover:brightness-110'
            }`}
          >
            {clockOutMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Clock size={16} />
            )}
            <span>{clockOutMutation.isPending ? 'Processing...' : !file ? 'Photo Required' : 'Clock Out'}</span>
          </button>
        ) : (
          <button 
            disabled
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#181F2C] border border-slate-200 dark:border-white/5 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Clock size={16} />
            <span>{hasClockedOut ? 'Clocked Out ✓' : 'Clock Out'}</span>
          </button>
        )}
      </div>

      {/* View History Button */}
      <button 
        onClick={onViewHistory}
        className="w-full p-2.5 pr-4 rounded-2xl bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all flex items-center justify-between font-bold group shadow-sm text-xs"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-all">
            <History size={15} />
          </div>
          <span>View Attendance History</span>
        </div>
        <ChevronRight size={15} className="text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
      </button>
    </div>
  );
};

export default AttendanceSidebar;
