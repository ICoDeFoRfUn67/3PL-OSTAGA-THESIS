import { useState, useMemo } from 'react';
import { Card, Badge, LoadingSpinner, EmptyState } from '@/components/common';
import { EmployeeAccessControlModal } from '@/components/EmployeeAccessControlModal';
import { useGetEmployees, useGetActivityLogs, useGetSecurityAlerts } from '@/hooks/useQueries';
import { Search } from 'lucide-react';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { Sidebar } from '@/components/Sidebar';
import AdminMobileProfile from '@/components/AdminMobileProfile';


export const AccessControlPage = () => {
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [hubFilter, setHubFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch data
  const { data: employeesData, isLoading, refetch: refetchEmployees } = useGetEmployees();
  const { data: activityLogsData } = useGetActivityLogs({ limit: 10 });
  const { data: securityAlertsData } = useGetSecurityAlerts();

  const handleManageClick = (employee: any) => {
    setSelectedEmployee(employee);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleModalUpdate = () => {
    refetchEmployees();
    handleModalClose();
  };

  // Keep fetched data to avoid unused warnings (even if not shown)
  const employees: any[] = Array.isArray(
  normalizeApiResponse(employeesData)
)
  ? normalizeApiResponse(employeesData)
  : [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const activityLogs = normalizeApiResponse(activityLogsData);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const securityAlerts = normalizeApiResponse(securityAlertsData);

  // Get unique roles and hubs for filters
  const roles = useMemo<string[]>(() => {
  const uniqueRoles = new Set<string>();

  employees.forEach((emp: any) => {
    if (emp.role) {
      uniqueRoles.add(String(emp.role));
    }
  });

  return ['All', ...Array.from(uniqueRoles)];
}, [employees]);

  
  const hubs = useMemo<string[]>(() => {
  const uniqueHubs = new Set<string>();

  employees.forEach((emp: any) => {
    if (emp.hub_name) {
      uniqueHubs.add(String(emp.hub_name));
    }
  });

  return ['All', ...Array.from(uniqueHubs)];
}, [employees]);
  // Calculate stats
  const totalUsers = employees.length;
  const activeUsers = employees.filter((emp: any) => emp.is_active && emp.can_login).length;
  const lockedAccounts = employees.filter((emp: any) => !emp.can_login).length;
  const blacklistedUsers = employees.filter((emp: any) => !emp.is_active).length;

  // Filter employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: any) => {
      const matchesSearch =
        !searchTerm ||
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.jtp_code?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'All' || emp.role === roleFilter;

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && emp.is_active) ||
        (statusFilter === 'Deactivated' && !emp.is_active);

      const matchesHub = hubFilter === 'All' || emp.hub_name === hubFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesHub;
    });
  }, [employees, searchTerm, roleFilter, statusFilter, hubFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
        {/* DESKTOP SIDEBAR ONLY */}
        <div className="hidden lg:block">
          <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        <div className="p-4 lg:p-6 lg:ml-64 flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* DESKTOP SIDEBAR ONLY */}
      <div className="hidden lg:block">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>

      <div className="lg:ml-64">
        <AdminMobileProfile />

        <div className="p-4 lg:p-6 space-y-6 pb-32 lg:pb-6 max-md:p-3 max-md:space-y-4 max-md:pb-32">
        {/* Header */}
        <div>
          <h1 className="text-3xl max-md:text-2xl font-bold mb-2 max-md:mb-1">Access Control</h1>
          <p className="text-gray-600 dark:text-gray-400 max-md:text-xs">Manage user access and security</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-md:gap-3">
          <Card className="border-4 border-orange-500 max-md:p-3">
            <div className="text-center">
              <p className="text-orange-600 font-semibold text-sm max-md:text-[11px] uppercase tracking-wider">Total Users</p>
              <p className="text-5xl max-md:text-3xl font-bold text-orange-600 mt-3 max-md:mt-1">{totalUsers}</p>
            </div>
          </Card>

          <Card className="border-4 border-green-500 max-md:p-3">
            <div className="text-center">
              <p className="text-green-600 font-semibold text-sm max-md:text-[11px] uppercase tracking-wider">Active users</p>
              <p className="text-5xl max-md:text-3xl font-bold text-green-600 mt-3 max-md:mt-1">{activeUsers}</p>
            </div>
          </Card>

          <Card className="border-4 border-red-500 max-md:p-3">
            <div className="text-center">
              <p className="text-red-600 font-semibold text-sm max-md:text-[11px] uppercase tracking-wider">Locked Accounts</p>
              <p className="text-5xl max-md:text-3xl font-bold text-red-600 mt-3 max-md:mt-1">{lockedAccounts}</p>
            </div>
          </Card>

          <Card className="border-4 border-red-700 max-md:p-3">
            <div className="text-center">
              <p className="text-red-700 font-semibold text-sm max-md:text-[11px] uppercase tracking-wider">Blacklisted</p>
              <p className="text-5xl max-md:text-3xl font-bold text-red-700 mt-3 max-md:mt-1">{blacklistedUsers}</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={roleFilter}
            onChange={(e: any) =>
              setRoleFilter(e.target.value)
            }
            title="Filter by role"
            className="input-field w-full md:w-56"
          >
            {roles.map((role, index) => (
              <option
                key={`${role}-${index}`}
                value={role}
              >
                Role: {role}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e: any) =>
              setStatusFilter(e.target.value)
            }
            title="Filter by status"
            className="input-field w-full md:w-56"
          >
            <option value="All">Status: All</option>
            <option value="Active">Status: Active</option>
            <option value="Deactivated">Status: Deactivated</option>
          </select>
          <select
            value={hubFilter}
            onChange={(e: any) =>
              setHubFilter(e.target.value)
            }
            title="Filter by hub"
            className="input-field w-full md:w-56"
          >
            {hubs.map((hub, index) => (
              <option
                key={`${hub}-${index}`}
                value={hub}
              >
                Hub: {hub}
              </option>
            ))}
          </select>

          <div className="relative flex-1 w-full min-w-[240px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search user here..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field !pl-10 w-full"
            />
          </div>
        </div>

        {/* Access User List Table */}
        <Card className="max-md:p-3">
          <h2 className="text-lg max-md:text-base font-bold text-red-700 mb-4 max-md:mb-3 border-b pb-3 max-md:pb-2">Access User List</h2>

          {filteredEmployees.length > 0 ? (
            <>
              {/* DESKTOP TABLE */}
              <div className="overflow-x-auto max-md:hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">JTP Code</th>
                      <th className="px-4 py-3 text-left font-semibold">Fullname</th>
                      <th className="px-4 py-3 text-left font-semibold">Position</th>
                      <th className="px-4 py-3 text-left font-semibold">Hub</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp: any) => (
                      <tr
                        key={emp.id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3">{emp.jtp_code || emp.employee_id}</td>
                        <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                        <td className="px-4 py-3">{emp.position}</td>
                        <td className="px-4 py-3">{emp.hub_name || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              emp.is_active && emp.can_login
                                ? 'success'
                                : emp.can_login
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {emp.is_active && emp.can_login
                              ? 'Active'
                              : !emp.can_login
                              ? 'Locked'
                              : 'Deactivated'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleManageClick(emp)}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-1 px-4 rounded text-sm transition-colors"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="hidden max-md:flex flex-col gap-3">
                {filteredEmployees.map((emp: any) => (
                  <div key={emp.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{emp.full_name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{emp.position}</p>
                        <p className="text-[10px] font-mono text-gray-400 uppercase mt-0.5">{emp.jtp_code || emp.employee_id}</p>
                      </div>
                      <Badge
                        variant={
                          emp.is_active && emp.can_login
                            ? 'success'
                            : emp.can_login
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {emp.is_active && emp.can_login
                          ? 'Active'
                          : !emp.can_login
                          ? 'Locked'
                          : 'Deactivated'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700/50 pt-3 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[50%] truncate">{emp.hub_name || 'No Hub'}</p>
                      <button
                        onClick={() => handleManageClick(emp)}
                        className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-1.5 px-4 rounded-lg text-xs transition-colors"
                      >
                        Manage Access
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No users found" description="Try adjusting your filters" />
          )}
        </Card>
      </div>

      {selectedEmployee && (
        <EmployeeAccessControlModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          employee={selectedEmployee}
          onUpdate={handleModalUpdate}
        />
      )}
      </div>
    </div>
  );
};

