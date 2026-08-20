import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Badge, LoadingSpinner, EmptyState } from '@/components/common';
import { Sidebar } from '@/components/Sidebar';
import { PayslipDetailModal } from '@/components/PayslipDetailModal';
import { useGetPayroll, useGetEmployees } from '@/hooks/useQueries';
import { ArrowLeft, FileText, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';

const formatPayslipPeriod = (start?: string, end?: string) => {
  if (!start && !end) return 'No period';
  const fmt = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '?';
  return `${fmt(start)} – ${fmt(end)}`;
};

const getStatusBadgeVariant = (status?: string) => {
  if (status === 'approved') return 'success' as const;
  if (status === 'pending') return 'warning' as const;
  return 'default' as const;
};

export const AdminEmployeePayslipHistoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const prefix = location.pathname.startsWith('/admin') ? '/admin' : '/hr';

  const { data: payrollData, isLoading: payrollLoading } = useGetPayroll();
  const { data: employeesData, isLoading: empLoading } = useGetEmployees();

  const allPayroll = normalizeApiResponse(payrollData);
  const allEmployees = normalizeApiResponse(employeesData);

  const employee = allEmployees.find((e: any) => String(e.id) === String(id));
  const employeePayslips = allPayroll
    .filter((p: any) => {
      const empId = p.employee || p.employee_id;
      return String(empId) === String(id) || (typeof empId === 'object' && String(empId?.id) === String(id));
    })
    .sort((a: any, b: any) => new Date(b.period_end || '').getTime() - new Date(a.period_end || '').getTime());

  const isLoading = payrollLoading || empLoading;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0F1729]">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="p-4 md:p-6 lg:p-8 space-y-6 lg:ml-64">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate(`${prefix}/payslip`)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold text-sm transition-colors"
          >
            Back to Payslip
          </button>
        </div>

        {/* Employee Info Banner */}
        {employee && (
          <div className="bg-gradient-to-r from-blue-700 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg shrink-0">
                {employee.profile_image_url ? (
                  <img src={employee.profile_image_url} alt={employee.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-500/40 flex items-center justify-center text-white text-2xl font-black">
                    {(employee.firstname || employee.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">{employee.full_name || `${employee.firstname} ${employee.lastname}`}</h1>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mt-0.5">{employee.position} · #{employee.employee_id}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-blue-200 text-[10px] uppercase font-bold tracking-widest">Total Payslips</p>
                <p className="text-3xl font-black">{employeePayslips.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payslip History Table */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-gray-900 dark:text-white">Payslip History</h2>
              <p className="text-xs text-gray-400">All payslip records for this employee</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : employeePayslips.length === 0 ? (
            <EmptyState title="No payslips found" description="This employee has no payslip records yet." />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">#</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Basic Salary</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Net Pay</th>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeePayslips.map((payslip: any, idx: number) => (
                      <tr key={payslip.id || idx} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-blue-500 shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-white text-xs">
                              {formatPayslipPeriod(payslip.period_start, payslip.period_end)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                          ₱{parseFloat(payslip.basic_salary || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white text-xs">
                          ₱{parseFloat(payslip.net_pay || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadgeVariant(payslip.status)}>{payslip.status || 'Draft'}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setSelectedPayslip(payslip); setIsModalOpen(true); }}
                            className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors"
                          >
                            View Payslip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="flex md:hidden flex-col gap-3">
                {employeePayslips.map((payslip: any, idx: number) => (
                  <div key={payslip.id || idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500 shrink-0" />
                        <span className="font-bold text-xs text-gray-900 dark:text-white">
                          {formatPayslipPeriod(payslip.period_start, payslip.period_end)}
                        </span>
                      </div>
                      <Badge variant={getStatusBadgeVariant(payslip.status)}>{payslip.status || 'Draft'}</Badge>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50 mb-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Pay</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        ₱{parseFloat(payslip.net_pay || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button
                      onClick={() => { setSelectedPayslip(payslip); setIsModalOpen(true); }}
                      className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold py-2 px-4 rounded-lg text-xs transition-colors"
                    >
                      View Payslip
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {selectedPayslip && (
        <PayslipDetailModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedPayslip(null); }}
          payslip={selectedPayslip}
          allPayroll={allPayroll}
        />
      )}
    </div>
  );
};

export default AdminEmployeePayslipHistoryPage;
