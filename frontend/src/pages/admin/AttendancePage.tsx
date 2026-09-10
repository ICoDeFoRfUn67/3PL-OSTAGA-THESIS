import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import AdminMobileProfile from '@/components/AdminMobileProfile';


import { Card, Badge, LoadingSpinner, EmptyState } from '@/components/common';
import { useGetAttendance, useGetHubs, useGetEmployees, useApproveAttendance, useDisapproveAttendance } from '@/hooks/useQueries';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Download, Search, Clock } from 'lucide-react';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';

export const AttendancePage = () => {
  const { employee: authEmployee, isHR } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const basePath = window.location.pathname.startsWith('/hr') ? '/hr' : '/admin';
  const [hubFilter, setHubFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageByHub, setPageByHub] = useState<Record<string, number>>({});

  const approveAttendance = useApproveAttendance();
  const disapproveAttendance = useDisapproveAttendance();

  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedClockInImage, setSelectedClockInImage] = useState<string | null>(null);
  const [selectedClockOutImage, setSelectedClockOutImage] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const openPhotoViewer = (record: any) => {
    setSelectedRecord(record);
    setSelectedClockInImage(record.clock_in_image ?? null);
    setSelectedClockOutImage(record.clock_out_image ?? null);
    setPhotoViewerOpen(true);
  };

  const closePhotoViewer = () => {
    setPhotoViewerOpen(false);
    setSelectedRecord(null);
    setSelectedClockInImage(null);
    setSelectedClockOutImage(null);
  };

  const handleToggleApprove = async (approve: boolean) => {
    if (!selectedRecord?.id) {
      toast.error("Invalid attendance record. Cannot perform action on absent mock records.");
      return;
    }
    const loader = toast.loading(approve ? 'Approving attendance...' : 'Disapproving attendance...');
    try {
      if (approve) {
        await approveAttendance.mutateAsync(selectedRecord.id);
        toast.success('Attendance approved successfully');
      } else {
        await disapproveAttendance.mutateAsync(selectedRecord.id);
        toast.success('Attendance disapproved successfully');
      }
      closePhotoViewer();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update attendance status');
    } finally {
      toast.dismiss(loader);
    }
  };


  useEffect(() => {
    if (!photoViewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhotoViewer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [photoViewerOpen]);



  // Fetch data with server-side date filter to prevent loading thousands of records
  const { data: attendanceData, isLoading: attendanceLoading } = useGetAttendance({ date: dateFilter });
  const { data: hubsData, isLoading: hubsLoading } = useGetHubs();
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployees();

  const attendance = normalizeApiResponse(attendanceData);
  const rawHubs = normalizeApiResponse(hubsData);
  const rawEmployees = normalizeApiResponse(employeesData);

  const managedHubIds = useMemo(() => {
    if (!isHR || !authEmployee?.hr_permissions?.managed_hubs) return null;
    return authEmployee.hr_permissions.managed_hubs.map((h: any) => typeof h === 'number' ? h : h.id);
  }, [isHR, authEmployee]);

  const hubs = useMemo(() => {
    if (isHR && managedHubIds) {
      return rawHubs.filter((hub: any) => managedHubIds.includes(hub.id));
    }
    return rawHubs;
  }, [rawHubs, isHR, managedHubIds]);

  const allEmployees = useMemo(() => {
    if (isHR && managedHubIds) {
      return rawEmployees.filter((emp: any) => {
        const hubId = typeof emp.hub === 'object' ? emp.hub?.id : emp.hub;
        return managedHubIds.includes(hubId);
      });
    }
    return rawEmployees;
  }, [rawEmployees, isHR, managedHubIds]);

  // Exclude HR and Admin users from attendance counts and tables
  const employees = useMemo(() => {
    return allEmployees.filter((e: any) => {
      const role = (e.role || '').toString().toLowerCase();
      return role !== 'hr' && role !== 'admin';
    });
  }, [allEmployees]);

  // Calculate stats - Presents, Absents, Lates
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    
    const todaysAttendance = attendance.filter((a: any) => {
      const aDate = a.date || (a.clock_in_time ? a.clock_in_time.split('T')[0] : '');
      return !dateFilter || aDate === dateFilter;
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
      return !dateFilter || aDate === dateFilter;
    });

    const attendanceMap = new Map();
    todaysAttendance.forEach((a: any) => {
      const empId = a.employee || a.employee_id || a.jtp_code;
      if (empId) attendanceMap.set(empId.toString(), a);
    });

    employees.forEach((emp: any) => {
      const hubName = emp.hub_name || 'Unknown Hub';
      
      // If a specific hub is filtered, skip all employees not in that hub
      if (hubFilter !== 'All' && hubName !== hubFilter && emp.hub !== hubFilter) {
        return;
      }

      if (!grouped[hubName]) {
        grouped[hubName] = [];
      }

      const empIdStr = (emp.id || emp.employee_id || emp.jtp_code)?.toString();
      const existingRecord = attendanceMap.get(empIdStr);

      const record = {
        ...(existingRecord || {}),
        employee: existingRecord?.employee || emp.id,
        employee_name: existingRecord?.employee_name || emp.full_name,
        employee_id: existingRecord?.employee_id || emp.employee_id,
        jtp_code: existingRecord?.jtp_code || emp.jtp_code,
        hub_name: existingRecord?.hub_name || hubName,
        status: existingRecord?.status || 'Absent',
        clock_in_time: existingRecord?.clock_in_time || null,
        clock_out_time: existingRecord?.clock_out_time || null
      };

      const matchesSearch =
        !searchTerm ||
        record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.jtp_code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'All' || record.status === statusFilter;

      if (matchesSearch && matchesStatus) {
        grouped[hubName].push(record);
      }
    });
    
    // Sort so hubs with records are generally first, and alphabetical fallback
    const sortedGrouped: { [key: string]: any[] } = {};
    Object.keys(grouped)
      .sort((a, b) => {
        if (hubFilter !== 'All') {
          if (a === hubFilter) return -1;
          if (b === hubFilter) return 1;
        }
        // First sort by whether they have records
        if (grouped[a].length > 0 && grouped[b].length === 0) return -1;
        if (grouped[b].length > 0 && grouped[a].length === 0) return 1;
        // Then sort alphabetically
        return a.localeCompare(b);
      })
      .forEach((key) => {
        sortedGrouped[key] = grouped[key];
      });

    return sortedGrouped;
  }, [attendance, employees, searchTerm, hubFilter, statusFilter, dateFilter]);

  const handleDownload = (hubName: string) => {
    const hubData = attendanceByHub[hubName];
    if (!hubData || hubData.length === 0) {
      alert('No data to download for this delivery center');
      return;
    }

    // Prepare CSV data matching table columns: Employee, ID Code, Delivery Center, Date, Time In, Time Out, Status, Photo
    const headers = ['Employee', 'ID Code', 'Delivery Center', 'Date', 'Time In', 'Time Out', 'Status', 'Photo'];
    const rows = hubData.map((record: any) => {
      const clockIn = record.clock_in_time ? formatTime(record.clock_in_time) : '-';
      const clockOut = record.clock_out_time ? formatTime(record.clock_out_time) : '-';
      const photo = (record.clock_in_image || record.clock_out_image)
        ? (record.clock_in_image && record.clock_out_image
            ? `${record.clock_in_image} | ${record.clock_out_image}`
            : (record.clock_in_image || record.clock_out_image))
        : 'No photo';

      return [
        record.employee_name || record.full_name || 'N/A',
        record.jtp_code || record.employee_id || 'N/A',
        record.hub_name || record.hub || hubName || 'N/A',
        record.date || dateFilter || 'N/A',
        clockIn,
        clockOut,
        record.status || 'N/A',
        photo,
      ];
    });

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

    // Download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hubName}-attendance-${(dateFilter || new Date().toISOString().split('T')[0])}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
            <div className="font-semibold text-gray-900 dark:text-white">
              Attendance Photos {selectedRecord?.employee_name ? `— ${selectedRecord.employee_name}` : ''}
            </div>
            <button
              onClick={closePhotoViewer}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
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

          {/* Modal Footer with Actions */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Approval:</span>
              <Badge variant={selectedRecord?.is_approved ? 'success' : 'warning'}>
                {selectedRecord?.is_approved ? 'Approved' : 'Pending Approval'}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleApprove(true)}
                disabled={selectedRecord?.is_approved}
                className={`px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm shadow-green-500/10 ${selectedRecord?.is_approved ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Approve Attendance
              </button>
              <button
                type="button"
                onClick={() => handleToggleApprove(false)}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs transition-colors border border-red-200/50 dark:border-red-900/30"
              >
                Disapprove Attendance
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        <div className="hidden lg:block">
          <Sidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        </div>
      <div className="lg:ml-64">
        <AdminMobileProfile />

        <div className="p-4 lg:p-6 space-y-6 max-md:p-3 max-md:space-y-4 max-md:pb-32 pb-32 lg:pb-6">
          {renderPhotoViewer()}


          {/* Header */}
          <div className="hidden md:block">
            <h1 className="text-3xl max-md:text-2xl font-bold mb-2 max-md:mb-1">Attendance Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 max-md:text-xs">Real-time employee attendance tracking by delivery center</p>
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
              Delivery Center Name
            </label>
            <select
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
              aria-label="Filter by delivery center name"
              className="input-field w-full max-md:text-xs max-md:py-2 max-md:px-3"
            >
              <option value="All">All Delivery Centers</option>
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
                      <th className="px-4 py-3 text-left font-semibold">Employee</th>
                      <th className="px-4 py-3 text-left font-semibold">ID Code</th>
                      <th className="px-4 py-3 text-left font-semibold">Delivery Center</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Time In</th>
                      <th className="px-4 py-3 text-left font-semibold">Time Out</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-center font-semibold">Photo</th>
                      <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const currentPage = pageByHub[hubName] || 1;
                      const itemsPerPage = 10;
                      const currentRecords = records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                      
                      return currentRecords.map((record: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="px-4 py-3 font-medium">
                            <button
                              type="button"
                              onClick={() => navigate(`${basePath}/attendance/employee/${record.employee}`)}
                              className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-left"
                            >
                              {record.employee_name || 'N/A'}
                            </button>
                          </td>
                          <td className="px-4 py-3">{record.jtp_code || record.employee_id || 'N/A'}</td>
                          <td className="px-4 py-3">{record.hub_name || record.hub || hubName}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{record.date || dateFilter}</td>
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
                                onClick={() => openPhotoViewer(record)}
                                className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-gray-400">No photo</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => navigate(`${basePath}/attendance/employee/${record.employee}`)}
                              className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap"
                            >
                              View History
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="hidden max-md:flex flex-col gap-3">
                {(() => {
                  const currentPage = pageByHub[hubName] || 1;
                  const itemsPerPage = 10;
                  const currentRecords = records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  
                  return currentRecords.map((record: any, idx: number) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 
                            onClick={() => navigate(`${basePath}/attendance/employee/${record.employee}`)}
                            className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate"
                          >
                            {record.employee_name || 'N/A'}
                          </h4>
                          <p className="text-[10px] font-mono text-gray-400 uppercase mt-1">{record.jtp_code || record.employee_id || 'N/A'}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{record.date || dateFilter}</p>
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

                      <div className="flex flex-col gap-2 mt-2">
                        {(record.clock_in_image || record.clock_out_image) && (
                          <button
                            type="button"
                            onClick={() => openPhotoViewer(record)}
                            className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold py-2 px-4 rounded-lg text-xs transition-colors"
                          >
                            View Photos
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`${basePath}/attendance/employee/${record.employee}`)}
                          className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold py-2 px-4 rounded-lg text-xs transition-colors"
                        >
                          View History
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* PAGINATION */}
              {records.length > 10 && (() => {
                const currentPage = pageByHub[hubName] || 1;
                const totalPages = Math.ceil(records.length / 10);
                return (
                  <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500">
                      Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, records.length)} of {records.length} entries
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPageByHub(prev => ({ ...prev, [hubName]: Math.max(1, currentPage - 1) }))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setPageByHub(prev => ({ ...prev, [hubName]: Math.min(totalPages, currentPage + 1) }))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                );
              })()}
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
