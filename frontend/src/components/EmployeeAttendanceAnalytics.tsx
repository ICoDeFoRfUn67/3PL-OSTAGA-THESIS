import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useGetAttendance, useGetAttendanceSummary } from '@/hooks/useQueries';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';

interface Props {
  employeeId?: number | null;
  days?: number; // past N days
}

export default function EmployeeAttendanceAnalytics({ employeeId, days = 90 }: Props) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const params = useMemo(() => ({
    employee_id: employeeId,
    start_date: start.toISOString().slice(0,10),
    end_date: end.toISOString().slice(0,10),
  }), [employeeId, start, end]);

  const attendanceQuery = useGetAttendance(params);
  const summaryQuery = useGetAttendanceSummary(params);

  const attendance = normalizeApiResponse(attendanceQuery.data) || [];
  const summary = summaryQuery.data?.overall || {};

  // daily aggregation
  const daily = useMemo(() => {
    const map: Record<string, any> = {};
    attendance.forEach((rec: any) => {
      const dateKey = rec.date ? rec.date : (rec.clock_in_time ? rec.clock_in_time.slice(0,10) : '');
      if (!dateKey) return;
      if (!map[dateKey]) map[dateKey] = { date: dateKey, hours: 0, present: 0, late: 0, absent: 0 };
      let hours = 0;
      try {
        if (rec.clock_in_time && rec.clock_out_time) {
          const ci = new Date(rec.clock_in_time);
          const co = new Date(rec.clock_out_time);
          if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
            hours = Math.max(0, (co.getTime() - ci.getTime()) / 3600000);
          }
        }
      } catch (e) {
        hours = 0;
      }
      map[dateKey].hours += hours;
      const statusLower = rec.status ? String(rec.status).toLowerCase() : '';
      map[dateKey].present += statusLower === 'present' ? 1 : 0;
      map[dateKey].late += statusLower === 'late' ? 1 : 0;
      map[dateKey].absent += statusLower === 'absent' ? 1 : 0;
    });

    const arr = Object.values(map).sort((a:any,b:any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return arr;
  }, [attendance]);

  // per-15-day halves aggregation
  const halves = useMemo(() => {
    const map: Record<string, any> = {};
    attendance.forEach((rec: any) => {
      if (!rec.date) return;
      const d = new Date(rec.date);
      if (isNaN(d.getTime())) return;
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      const half = d.getDate() <= 15 ? 1 : 2;
      const key = `${year}-${String(month).padStart(2,'0')}-${half}`;
      if (!map[key]) map[key] = { key, year, month, half, present: 0, late: 0, absent: 0, totalHours: 0 };
      const statusLower = rec.status ? String(rec.status).toLowerCase() : '';
      if (statusLower === 'present') map[key].present += 1;
      if (statusLower === 'late') map[key].late += 1;
      if (statusLower === 'absent') map[key].absent += 1;
      if (rec.clock_in_time && rec.clock_out_time) {
        try {
          const ci = new Date(rec.clock_in_time);
          const co = new Date(rec.clock_out_time);
          if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
            map[key].totalHours += Math.max(0, (co.getTime() - ci.getTime()) / 3600000);
          }
        } catch (e) { }
      }
    });

    const arr = Object.values(map).sort((a:any,b:any) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      return a.half - b.half;
    });
    return arr;
  }, [attendance]);

  const totalHours = daily.reduce((s:any, d:any) => s + (d.hours || 0), 0);
  const totalPresent = daily.reduce((s:any, d:any) => s + (d.present || 0), 0);
  const totalLate = daily.reduce((s:any, d:any) => s + (d.late || 0), 0);
  const totalAbsent = daily.reduce((s:any, d:any) => s + (d.absent || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400">Total Hours ({days} days)</div>
          <div className="text-2xl font-bold mt-1">{Math.round(totalHours)} hrs</div>
        </div>
        <div className="bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400">Present / Late / Absent</div>
          <div className="mt-1 flex items-center gap-3">
            <div className="text-lg font-bold text-emerald-600">{totalPresent}</div>
            <div className="text-lg font-bold text-orange-500">{totalLate}</div>
            <div className="text-lg font-bold text-red-500">{totalAbsent}</div>
          </div>
        </div>
      </div>

    <div className="flex flex-row overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-800 snap-x snap-mandatory">
      {/* Hours per day */}
      <div className="min-w-[295px] sm:min-w-[380px] md:min-w-[480px] flex-1 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 rounded-xl p-4 snap-start shrink-0 shadow-sm">
        <div className="text-sm font-semibold mb-2">Hours per day</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#3182ce" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Presence by type */}
      <div className="min-w-[295px] sm:min-w-[380px] md:min-w-[480px] flex-1 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 rounded-xl p-4 snap-start shrink-0 shadow-sm">
        <div className="text-sm font-semibold mb-2">Presence by type (last 30 days)</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={daily.slice(-30)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="late" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best 15-day halves */}
      <div className="min-w-[295px] sm:min-w-[380px] md:min-w-[480px] flex-1 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 rounded-xl p-4 snap-start shrink-0 shadow-sm">
        <div className="text-sm font-semibold mb-2">Best 15-day halves (Present vs Absent)</div>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={halves.map((h) => ({ name: `${h.month}/${h.year} H${h.half}`, present: h.present, absent: h.absent }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="present" stroke="#4F46E5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
    </div>
  );
}
