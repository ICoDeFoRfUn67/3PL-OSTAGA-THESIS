import { useEffect, useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import AdminMobileProfile from '@/components/AdminMobileProfile';


import { Card, Badge, LoadingSpinner, EmptyState } from '@/components/common';
import { useGetAttendance, useGetHubs, useGetEmployees } from '@/hooks/useQueries';
import { Download, Search, Clock } from 'lucide-react';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';

export const AttendancePage = () => {
  const [hubFilter, setHubFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedClockInImage, setSelectedClockInImage] = useState<string | null>(null);
  const [selectedClockOutImage, setSelectedClockOutImage] = useState<string | null>(null);

  const openPhotoViewer = (clockInImage?: string | null, clockOutImage?: string | null) => {
    setSelectedClockInImage(clockInImage ?? null);
    setSelectedClockOutImage(clockOutImage ?? null);
    setPhotoViewerOpen(true);
  };

  const closePhotoViewer = () => {
    setPhotoViewerOpen(false);
    setSelectedClockInImage(null);
    setSelectedClockOutImage(null);
  };


  useEffect(() => {
    if (!photoViewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhotoViewer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [photoViewerOpen]);



  // Fetch data
  const { data: attendanceData, isLoading: attendanceLoading } = useGetAttendance();
  const { data: hubsData, isLoading: hubsLoading } = useGetHubs();
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployees();

  const attendance = normalizeApiResponse(attendanceData);
  const hubs = normalizeApiResponse(hubsData);
  const employees = normalizeApiResponse(employeesData);

  // Calculate stats - Presents, Absents, Lates
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    
    const todaysAttendance = attendance.filter((a: any) => {
      const aDate = a.date || (a.clock_in_time ? a.clock_in_time.split('T')[0] : '');
      return aDate === dateFilter;
    });

    const presents = todaysAttendance.filter((a: any) => a.status === 'Present').length;
    const lates = todaysAttendance.filter((a: any) => a.status === 'Late').length;
    const absents = totalEmployees - (presents + lates);

    return {
      totalEmployees,
      presents,
      absents: absents > 0 ? absents : 0,
      lates,
    };
  }, [attendance, employees, dateFilter]);

  // Group attendance by hub
  const attendanceByHub = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};

    const todaysAttendance = attendance.filter((a: any) => {
      const aDate = a.date || (a.clock_in_time ? a.clock_in_time.split('T')[0] : '');
      return aDate === dateFilter;
    });

    const attendanceMap = new Map();
    todaysAttendance.forEach((a: any) => {
      const empId = a.employee || a.employee_id || a.jtp_code;
      if (empId) attendanceMap.set(empId.toString(), a);
    });

    employees.forEach((emp: any) => {
      const hubName = emp.hub_name || 'Unknown Hub';
      if (!grouped[hubName]) {
        grouped[hubName] = [];
      }

      const empIdStr = (emp.id || emp.employee_id || emp.jtp_code)?.toString();
      const existingRecord = attendanceMap.get(empIdStr);

      const record = existingRecord || {
        employee_name: emp.full_name,
        employee_id: emp.employee_id,
        jtp_code: emp.jtp_code,
        hub_name: hubName,
        status: 'Absent',
        clock_in_time: null,
        clock_out_time: null
      };

      const matchesSearch =
        !searchTerm ||
        record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.jtp_code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesHub = hubFilter === 'All' || record.hub_name === hubFilter || record.hub === hubFilter;
      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;

      if (matchesSearch && matchesHub && matchesStatus) {
        grouped[hubName].push(record);
      }
    });

    return grouped;
  }, [attendance, employees, searchTerm, hubFilter, statusFilter, dateFilter]);

  const handleDownload = (hubName: string) => {
    const hubData = attendanceByHub[hubName];
    if (!hubData || hubData.length === 0) {
      alert('No data to download for this hub');
      return;
    }

    // Prepare CSV data with new columns
    const headers = ['Fullname', 'JTP Code', 'Hub', 'Time In', 'Time Out', 'Status'];
    const rows = hubData.map((record: any) => {
      const clockIn = record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString() : 'N/A';
      const clockOut = record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString() : 'N/A';
      
      return [
        record.full_name || 'N/A',
        record.jtp_code || record.employee_id || 'N/A',
        record.hub_name || record.hub || 'N/A',
        clockIn,
        clockOut,
        record.status || 'N/A',
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hubName}-attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'success';
      case 'late':
        return 'warning';
      case 'absent':
        return 'danger';
      default:
        return 'info';

    }
  };

  const formatTime = (dateTime: string | null) => {
    if (!dateTime) return '-';
    try {
      const date = new Date(dateTime);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid';
    }
  };

  if (attendanceLoading || hubsLoading || employeesLoading) {
    return (
      <div className="p-4 lg:p-6 lg:ml-64 flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const renderPhotoViewer = () => {
    if (!photoViewerOpen) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closePhotoViewer();
        }}
      >
        <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-5xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="font-semibold">Attendance Photos</div>
            <button
              onClick={closePhotoViewer}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Clock In</div>
              {selectedClockInImage ? (
                <img
                  src={selectedClockInImage}
                  alt="Clock in"
                  className="w-full h-[420px] object-contain bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-full h-[420px] flex items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed rounded">
                  No clock-in image
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Clock Out</div>
              {selectedClockOutImage ? (
                <img
                  src={selectedClockOutImage}
                  alt="Clock out"
                  className="w-full h-[420px] object-contain bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-full h-[420px] flex items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed rounded">
                  No clock-out image
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      <div className="lg:ml-64">
        <AdminMobileProfile />

        <div className="p-4 lg:p-6 space-y-6 max-md:p-3 max-md:space-y-4 max-md:pb-32 pb-32 lg:pb-6">
          {renderPhotoViewer()}


          {/* Header */}
          <div>
            <h1 className="text-3xl max-md:text-2xl font-bold mb-2 max-md:mb-1">Attendance Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 max-md:text-xs">Real-time employee attendance tracking by hub</p>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-md:gap-3">
        {/* Total Employees */}
        <Card className="border-l-4 border-blue-500 max-md:p-3">
          <div className="text-center">
            <p className="text-blue-600 font-semibold text-sm max-md:text-[11px] uppercase tracking-wider">Total Employees</p>
            <p className="text-5xl max-md:text-3xl font-bold text-blue-600 mt-3 max-md:mt-1">{stats.totalEmployees}</p>
          </div>
        </Card>

        {/* Presents */}
        <Card className="border-l-4 border-green-500 max-md:p-3">
          <div className="text-center">
            <p className="text-green-600 font-semibold text-sm max-md:text-[11px] uppercase tracking-wider">Presents</p>
            <p className="text-5xl max-md:text-3xl font-bold text-green-600 mt-3 max-md:mt-1">{stats.presents}</p>
          </div>
        </Card>

        {/* Absents */}
        <Card className="border-l-4 border-red-500 max-md:p-3">
          <div className="text-center">
            <p className="text-red-600 font-semibold text-sm max-md:text-[11px] uppercase tracking-wider">Absents</p>
            <p className="text-5xl max-md:text-3xl font-bold text-red-600 mt-3 max-md:mt-1">{stats.absents}</p>
          </div>
        </Card>

        {/* Lates */}
        <Card className="border-l-4 border-yellow-500 max-md:p-3">
          <div className="text-center">
            <p className="text-yellow-600 font-semibold text-sm max-md:text-[11px] uppercase tracking-wider">Lates</p>
            <p className="text-5xl max-md:text-3xl font-bold text-yellow-600 mt-3 max-md:mt-1">{stats.lates}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="max-md:p-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-md:gap-2.5">
          <div>
            <label className="block text-sm max-md:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 max-md:mb-1">
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Filter by date"
              className="input-field w-full max-md:text-xs max-md:py-2 max-md:px-3"
            />
          </div>

          <div>
            <label className="block text-sm max-md:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 max-md:mb-1">
              Hub Name
            </label>
            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              aria-label="Filter by hub name"
              className="input-field w-full max-md:text-xs max-md:py-2 max-md:px-3"
            >
              <option value="All">All Hubs</option>
              {hubs.map((hub: any) => (
                <option key={hub.id} value={hub.name}>
                  {hub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm max-md:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 max-md:mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="input-field w-full max-md:text-xs max-md:py-2 max-md:px-3"
            >
              <option value="All">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm max-md:text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 max-md:mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 max-md:w-3.5 max-md:h-3.5" size={18} />
              <input
                type="text"
                placeholder="Search user here..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field !pl-10 max-md:!pl-8 w-full max-md:text-xs max-md:py-2 max-md:px-3"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Attendance by Hub */}
      {Object.keys(attendanceByHub).length > 0 ? (
        Object.entries(attendanceByHub).map(([hubName, records]) => (
          <Card key={hubName} className="max-md:p-3 max-md:bg-transparent max-md:border-none max-md:shadow-none">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg max-md:text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Clock size={20} className="text-blue-600" />
                  {hubName}
                </h2>
                <p className="text-sm max-md:text-xs text-gray-500 dark:text-gray-400 mt-1">{records.length} records</p>
              </div>
              <button
                onClick={() => handleDownload(hubName)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 max-md:py-1.5 max-md:px-3 max-md:text-xs rounded flex items-center gap-2"
              >
                <Download size={18} className="max-md:w-4 max-md:h-4" />
                <span className="max-md:hidden">Download</span>
              </button>
            </div>

            {records.length > 0 ? (
              <>
                <div className="overflow-x-auto max-md:hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Fullname</th>
                      <th className="px-4 py-3 text-left font-semibold">JTP Code</th>
                      <th className="px-4 py-3 text-left font-semibold">Hub</th>
                      <th className="px-4 py-3 text-left font-semibold">Time In</th>
                      <th className="px-4 py-3 text-left font-semibold">Time Out</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-center font-semibold">Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 font-medium">{record.employee_name || 'N/A'}</td>
                        <td className="px-4 py-3">{record.jtp_code || record.employee_id || 'N/A'}</td>
                        <td className="px-4 py-3">{record.hub_name || record.hub || hubName}</td>
                        <td className="px-4 py-3 text-sm">{formatTime(record.clock_in_time)}</td>
                        <td className="px-4 py-3 text-sm">{formatTime(record.clock_out_time)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadgeVariant(record.status)}>
                            {record.status || 'N/A'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(record.clock_in_image || record.clock_out_image) ? (
                            <button
                              type="button"
                              onClick={() => openPhotoViewer(record.clock_in_image, record.clock_out_image)}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                            >
                              View
                            </button>
                          ) : (
                            <span className="text-gray-400">No photo</span>
                          )}

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="hidden max-md:flex flex-col gap-3">
                {records.map((record: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{record.employee_name || 'N/A'}</h4>
                        <p className="text-[10px] font-mono text-gray-400 uppercase mt-1">{record.jtp_code || record.employee_id || 'N/A'}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(record.status)}>
                        {record.status || 'N/A'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Time In</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatTime(record.clock_in_time)}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Time Out</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatTime(record.clock_out_time)}</p>
                      </div>
                    </div>

                    {(record.clock_in_image || record.clock_out_image) && (
                      <button
                        type="button"
                        onClick={() => openPhotoViewer(record.clock_in_image, record.clock_out_image)}
                        className="w-full mt-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold py-2 px-4 rounded-lg text-xs transition-colors"
                      >
                        View Photos
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
            ) : (
              <div className="py-8">
                <EmptyState
                  title="No records found"
                  description={`No attendance records found for ${hubName}`}
                />
              </div>
            )}
          </Card>
        ))
      ) : (
        <Card>
          <div className="py-12">
            <EmptyState
              title="No attendance data"
              description="No attendance records found for the selected filters"
            />
          </div>
        </Card>
      )}
    </div>
    </div>
  </div>
  );
};
