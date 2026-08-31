import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from './common';
import { useGetEmployees, useDeleteEmployee, useBulkToggleLogin } from '@/hooks/useQueries';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from './ConfirmDialog';
import { Trash2, Eye, Lock, Unlock, Users, UserX } from 'lucide-react';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';

const getStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'success';
    case 'resign':
    case 'resigned': return 'neutral';
    case 'awol': return 'orange';
    case 'blacklist': return 'error';
    default: return 'info';
  }
};

interface EmployeeManagePanelProps {
  hubId?: number;
  searchTerm?: string;
  statusFilter?: string;
}

interface Employee {
  id: number;
  full_name: string;
  firstname: string;
  lastname: string;
  middle_initial?: string;
  position: string;
  employment_type: string;
  status: string;
  hub_name?: string;
  employee_id: string;
  jtp_code: string;
  can_login: boolean;
  can_edit_info: boolean;
  profile_image_url?: string;
}

export const EmployeeManagePanel = (props: EmployeeManagePanelProps) => {
  const navigate = useNavigate();
  const { user, canDeleteEmployees } = useAuth();
  const { data, isLoading } = useGetEmployees();
  const deleteMutation = useDeleteEmployee();
  const bulkToggleMutation = useBulkToggleLogin();
  const { success, error } = useToast();

  const [employeeTab, setEmployeeTab] = useState<'current' | 'resigned'>('current');
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, employeeId: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const rawEmployees: Employee[] = normalizeApiResponse(data) || [];

  // Calculate live counts
  const currentCount = rawEmployees.filter(
    (emp) => emp.status?.toLowerCase() !== 'resign' && emp.status?.toLowerCase() !== 'resigned'
  ).length;

  const resignedCount = rawEmployees.filter(
    (emp) => emp.status?.toLowerCase() === 'resign' || emp.status?.toLowerCase() === 'resigned'
  ).length;

  // Separate employees by active tab
  let employees = rawEmployees.filter((emp) => {
    const isResigned = emp.status?.toLowerCase() === 'resign' || emp.status?.toLowerCase() === 'resigned';
    return employeeTab === 'resigned' ? isResigned : !isResigned;
  });

  // Apply status filter if provided (for current tab)
  if (employeeTab === 'current' && props.statusFilter && props.statusFilter !== 'All') {
    employees = employees.filter((emp: Employee) => emp.status === props.statusFilter);
  }

  // Apply search filter if provided
  if (props.searchTerm && props.searchTerm.trim() !== '') {
    const q = props.searchTerm.trim().toLowerCase();
    employees = employees.filter((emp: Employee) => (
      (emp.full_name || '').toLowerCase().includes(q) ||
      (emp.employee_id || '').toLowerCase().includes(q) ||
      (emp.position || '').toLowerCase().includes(q)
    ));
  }

  // Automatically disable login for Blacklist and Resign employees
  employees = employees.map((emp: Employee) => {
    if ((emp.status === 'Blacklist' || emp.status === 'Resign' || emp.status === 'Resigned') && emp.can_login) {
      return { ...emp, can_login: false };
    }
    return emp;
  });

  // Reset to page 1 and clear selections when search, tab, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedEmployees([]);
  }, [props.searchTerm, props.statusFilter, employeeTab]);

  // Pagination calculation
  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = employees.slice(startIndex, endIndex);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(employees.map((emp: Employee) => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, id]);
    } else {
      setSelectedEmployees(selectedEmployees.filter(empId => empId !== id));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteConfirm.employeeId);
      success('Employee deleted successfully');
      setDeleteConfirm({ isOpen: false, employeeId: 0 });
    } catch (err) {
      error('Failed to delete employee');
    }
  };

  const handleBulkToggleLogin = async (canLogin: boolean) => {
    if (selectedEmployees.length === 0) {
      error('Please select employees');
      return;
    }

    try {
      await bulkToggleMutation.mutateAsync({ employeeIds: selectedEmployees, canLogin });
      success(`Login ${canLogin ? 'enabled' : 'disabled'} for selected employees`);
      setSelectedEmployees([]);
    } catch (err) {
      error('Failed to update employee login status');
    }
  };

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        {/* Top Category Tabs: Current Employees vs Resigned */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 -mx-6 -mt-6 mb-4 px-2 sm:px-6 bg-gray-50/70 dark:bg-gray-800/40">
          <button
            type="button"
            onClick={() => setEmployeeTab('current')}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 sm:px-6 font-bold text-xs sm:text-sm tracking-wide border-b-2 transition-all duration-150 ${
              employeeTab === 'current'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border-t border-l border-r border-gray-200 dark:border-gray-700 rounded-t-lg shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Users size={16} />
            <span>Current Employees</span>
            <span
              className={`ml-1 px-2 py-0.5 text-[11px] rounded-full font-bold ${
                employeeTab === 'current'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {currentCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEmployeeTab('resigned')}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 sm:px-6 font-bold text-xs sm:text-sm tracking-wide border-b-2 transition-all duration-150 ${
              employeeTab === 'resigned'
                ? 'border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border-t border-l border-r border-gray-200 dark:border-gray-700 rounded-t-lg shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <UserX size={16} />
            <span>Resigned</span>
            <span
              className={`ml-1 px-2 py-0.5 text-[11px] rounded-full font-bold ${
                employeeTab === 'resigned'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {resignedCount}
            </span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Bulk Actions */}
          {selectedEmployees.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg flex items-center justify-between">
              <p className="text-sm font-medium">{selectedEmployees.length} employee(s) selected</p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBulkToggleLogin(true)}
                  isLoading={bulkToggleMutation.isPending}
                >
                  <Unlock size={16} />
                  Enable Login
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleBulkToggleLogin(false)}
                  isLoading={bulkToggleMutation.isPending}
                >
                  <Lock size={16} />
                  Disable Login
                </Button>
              </div>
            </div>
          )}

          {/* Employee Table & Mobile Cards */}
          {employees.length > 0 ? (
            <>
              {/* DESKTOP TABLE */}
              <div className="overflow-x-auto max-md:hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          aria-label="Select all employees"
                          title="Select all employees"
                          checked={selectedEmployees.length === employees.length && employees.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Position</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Login</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.map((emp: Employee) => (
                      <tr key={emp.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                aria-label={`Select employee ${emp.full_name || emp.employee_id}`}
                                title={`Select ${emp.full_name || emp.employee_id}`}
                                checked={selectedEmployees.includes(emp.id)}
                                onChange={(e) => handleSelectEmployee(emp.id, e.target.checked)}
                                className="rounded"
                              />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{emp.full_name}</td>
                        <td className="px-4 py-3 text-sm">{emp.employee_id}</td>
                        <td className="px-4 py-3 text-sm">{emp.position}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={getStatusBadgeVariant(emp.status)}>
                            {emp.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={emp.can_login ? 'success' : 'error'}>
                            {emp.can_login ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm space-x-2 flex">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              const rawRole = (user?.role || '').toString().trim().toLowerCase();
                              const normalizedRole = rawRole.includes('admin') ? 'admin' : rawRole.includes('hr') ? 'hr' : rawRole;
                              const base = normalizedRole === 'hr' ? '/hr' : normalizedRole === 'admin' ? '/admin' : '/employee';
                              navigate(`${base}/employees/${emp.id}`);
                            }}
                          >
                            View
                          </Button>
                          {canDeleteEmployees && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteConfirm({ isOpen: true, employeeId: emp.id })}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="hidden max-md:flex flex-col gap-4">
                {/* Mobile Select All */}
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === employees.length && employees.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                    id="mobile-select-all"
                  />
                  <label htmlFor="mobile-select-all" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select All</label>
                </div>
                {paginatedEmployees.map((emp: Employee) => (
                  <div key={emp.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          aria-label={`Select employee ${emp.full_name || emp.employee_id}`}
                          title={`Select ${emp.full_name || emp.employee_id}`}
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={(e) => handleSelectEmployee(emp.id, e.target.checked)}
                          className="rounded"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{emp.full_name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{emp.position}</p>
                        <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase">ID: {emp.employee_id}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge variant={getStatusBadgeVariant(emp.status)}>
                          {emp.status}
                        </Badge>
                        <Badge variant={emp.can_login ? 'success' : 'error'}>
                          {emp.can_login ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-50 dark:border-gray-700/50">
                       <Button
                         variant="primary"
                         className="flex-1 text-xs py-1.5 h-auto"
                         onClick={() => {
                           const rawRole = (user?.role || '').toString().trim().toLowerCase();
                           const normalizedRole = rawRole.includes('admin') ? 'admin' : rawRole.includes('hr') ? 'hr' : rawRole;
                           const base = normalizedRole === 'hr' ? '/hr' : normalizedRole === 'admin' ? '/admin' : '/employee';
                           navigate(`${base}/employees/${emp.id}`);
                         }}
                       >
                         View
                       </Button>
                      {canDeleteEmployees && (
                        <Button
                          variant="danger"
                          className="text-xs py-1.5 h-auto px-3"
                          onClick={() => setDeleteConfirm({ isOpen: true, employeeId: emp.id })}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINATION CONTROLS */}
              {employees.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, employees.length)} of {employees.length} employees
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="text-xs py-1.5 h-auto px-3"
                    >
                      ← Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="text-xs py-1.5 h-auto px-3"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title={employeeTab === 'resigned' ? 'No resigned employees found' : 'No current employees found'}
              description={
                employeeTab === 'resigned'
                  ? 'Employees with "Resign" status will appear here with archived records.'
                  : 'Try adjusting your search or status filters.'
              }
            />
          )}
        </div>
      </Card>

      {/* Modals */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Employee?"
        message="This action cannot be undone. Are you sure?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, employeeId: 0 })}
        confirmText="Delete"
        isDangerous
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
