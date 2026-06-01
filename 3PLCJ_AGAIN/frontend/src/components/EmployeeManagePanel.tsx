import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from './common';
import { useGetEmployees, useDeleteEmployee, useBulkToggleLogin } from '@/hooks/useQueries';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from './ConfirmDialog';
import { Trash2, Eye, Lock, Unlock, Search } from 'lucide-react';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';

const getStatusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active': return 'success';
    case 'resign': return 'neutral';
    case 'awol': return 'orange';
    case 'blacklist': return 'error';
    default: return 'info';
  }
};

interface EmployeeManagePanelProps {
  hubId?: number;
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

export const EmployeeManagePanel = (_props: EmployeeManagePanelProps) => {
  const navigate = useNavigate();
  const { user, canDeleteEmployees } = useAuth();
  const { data, isLoading } = useGetEmployees();
  const deleteMutation = useDeleteEmployee();
  const bulkToggleMutation = useBulkToggleLogin();
  const { success, error } = useToast();

  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, employeeId: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const employees = normalizeApiResponse(data);

  const filteredEmployees = (employees || []).filter((emp: Employee) => {
    const term = searchTerm.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(term) ||
      emp.firstname?.toLowerCase().includes(term) ||
      emp.lastname?.toLowerCase().includes(term) ||
      emp.position?.toLowerCase().includes(term) ||
      emp.employee_id?.toLowerCase().includes(term) ||
      emp.hub_name?.toLowerCase().includes(term)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(filteredEmployees.map((emp: Employee) => emp.id));
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
      <Card>
        <div className="space-y-4">
          {/* Search container */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
            <input
              type="text"
              placeholder="Search employees by name, ID, position, or hub..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedEmployees([]);
              }}
              className="w-full h-11 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500/50 transition-all"
            />
          </div>

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
          {filteredEmployees.length > 0 ? (
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
                          checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
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
                    {filteredEmployees.map((emp: Employee) => (
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
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const rawRole = (user?.role || '').toString().trim().toLowerCase();
                              const normalizedRole = rawRole.includes('admin') ? 'admin' : rawRole.includes('hr') ? 'hr' : rawRole;
                              const base = normalizedRole === 'hr' ? '/hr' : normalizedRole === 'admin' ? '/admin' : '/employee';
                              navigate(`${base}/employees/${emp.id}`);
                            }}
                          >
                            <Eye size={16} />
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
                    checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                    id="mobile-select-all"
                  />
                  <label htmlFor="mobile-select-all" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select All</label>
                </div>
                {filteredEmployees.map((emp: Employee) => (
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
                        <p className="text-xs text-gray-550 dark:text-gray-400 mt-0.5">{emp.position}</p>
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
                        variant="secondary"
                        className="flex-1 text-xs py-1.5 h-auto"
                        onClick={() => {
                          const rawRole = (user?.role || '').toString().trim().toLowerCase();
                          const normalizedRole = rawRole.includes('admin') ? 'admin' : rawRole.includes('hr') ? 'hr' : rawRole;
                          const base = normalizedRole === 'hr' ? '/hr' : normalizedRole === 'admin' ? '/admin' : '/employee';
                          navigate(`${base}/employees/${emp.id}`);
                        }}
                      >
                        <Eye size={14} className="mr-1.5" /> View Profile
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
            </>
          ) : (
            <EmptyState title="No employees found" />
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
