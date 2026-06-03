import { useState, useEffect, useRef } from 'react';
import { Clock, Loader2, History, Camera, Fingerprint, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetAttendance, useClockIn, useClockOut } from '@/hooks/useQueries';

interface AttendanceSidebarProps {
  employeeId: number;
  onViewHistory?: () => void;
}

const formatAttendanceTime = (timeStr: string | undefined | null) => {
  if (!timeStr) return '--:--';
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
      return '--:--';
    }
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '--:--';
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
  
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Attendance Records</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">View and track your attendance</p>
      </div>

      {/* Main Clock In/Out Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8B0000] via-red-700 to-red-900 p-8 shadow-2xl">
        {/* Decorative glow */}
        <div className="absolute -bottom-32 left-0 right-0 h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -top-32 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Clock size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">Clock In & Click Out</h2>
                <p className="text-sm text-red-100">{formatDate(currentTime)}</p>
              </div>
            </div>
          </div>

          {/* Large Time Display */}
          <div className="text-center space-y-4">
            <div className="text-6xl md:text-7xl font-black text-white font-mono tracking-tight">
              {formatTime(currentTime)}
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center justify-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusDotColor()} animate-pulse`} />
              <span className="text-lg font-semibold text-red-100">{getStatusText()}</span>
            </div>
          </div>

          {/* Clock In/Out Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-xs font-semibold text-red-100 uppercase tracking-wider mb-2">Clock In</p>
              <p className="text-2xl font-black text-white">{formatAttendanceTime(todayAttendance?.clock_in_time) || '-- : --'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-xs font-semibold text-red-100 uppercase tracking-wider mb-2">Clock Out</p>
              <p className="text-2xl font-black text-white">{formatAttendanceTime(todayAttendance?.clock_out_time) || '-- : --'}</p>
            </div>
          </div>

          {/* Photo Section */}
          <div className="space-y-3 border-t border-white/20 pt-6">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
              id="attendance-photo" 
              ref={fileInputRef} 
            />
            <label htmlFor="attendance-photo" className="flex items-center justify-between w-full p-4 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/30 cursor-pointer hover:bg-white/15 transition-all group">
              <div className="flex items-center gap-3">
                <Camera size={20} className="text-red-100 group-hover:text-white transition-colors" />
                <span className="text-sm font-semibold text-red-100 group-hover:text-white transition-colors">{file ? file.name : 'Take Photo'}</span>
              </div>
              <span className="text-red-100 group-hover:text-white transition-colors">
                <ChevronRight size={20} />
              </span>
            </label>
            <p className="text-xs text-red-100 text-center">Verify your attendance</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Main Clock In Button */}
        <button 
          onClick={handleClockIn} 
          disabled={!canClockIn || clockInMutation.isPending}
          className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 text-lg ${
            canClockIn 
              ? 'bg-[#8B0000] hover:bg-[#6B0000] shadow-lg hover:shadow-xl hover:scale-105 active:scale-95' 
              : 'bg-gray-400 cursor-not-allowed opacity-60'
          }`}
        >
          {clockInMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              <Fingerprint size={24} />
              {hasClockedIn ? 'Already Clocked In' : 'Clock In'}
            </>
          )}
        </button>

        {/* Clock Out Button */}
        <button 
          onClick={handleClockOut} 
          disabled={!canClockOut || clockOutMutation.isPending}
          className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 text-lg ${
            canClockOut 
              ? 'bg-gray-600 hover:bg-gray-700 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95' 
              : 'bg-gray-400 cursor-not-allowed opacity-60'
          }`}
        >
          {clockOutMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              <Clock size={24} />
              {hasClockedOut ? 'Already Clocked Out' : 'Clock Out'}
            </>
          )}
        </button>
      </div>

      {/* View History Link */}
      <button 
        onClick={onViewHistory}
        className="w-full py-4 rounded-2xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all flex items-center justify-center gap-2 font-semibold group"
      >
        <History size={20} className="group-hover:scale-110 transition-transform" />
        View Attendance History
      </button>
    </div>
  );
};

export default AttendanceSidebar;
