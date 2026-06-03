

import { Clock } from 'lucide-react';

export const AttendanceHistoryScreen = () => {
  return (
    <div className="p-4 md:p-6 lg:p-8 lg:ml-64 space-y-6 bg-gray-50 dark:bg-[#070B14] min-h-screen">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Attendance History</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">View and track your attendance records and clock times</p>
      </div>

      {/* Placeholder - would connect to actual attendance data */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 md:p-8 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-sm mx-auto py-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-gray-400 dark:text-gray-600" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Attendance records will appear here</p>
        </div>
      </div>
    </div>
  );
};
