import { useState, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from '@/components/common';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  useGetPaymentAccounts,
  useCreatePaymentAccount,
  useUpdatePaymentAccount,
  useDeletePaymentAccount,
  useGetEmployees,
} from '@/hooks/useQueries';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { CreditCard, Plus, Trash2, Edit2, Eye, X, Upload, QrCode, Search, User as UserIcon } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import AdminMobileProfile from '@/components/AdminMobileProfile';
import gcashLogo from '@/images/gcash_logo.webp';
import mayaLogo from '@/images/maya_logo.jpg';

const ACCOUNT_TYPES = ['Maya', 'GCash', 'Bank Card', 'Credit Card/Debit Card'];

const getTypeBadge = (type: string): 'info' | 'success' | 'orange' | 'neutral' => {
  switch (type) {
    case 'Maya': return 'info';
    case 'GCash': return 'success';
    case 'Bank Card': return 'orange';
    default: return 'neutral';
  }
};

interface PaymentAccount {
  id: number;
  employee: number;
  employee_name: string;
  jtp_code: string;
  account_name: string;
  account_number: string;
  account_type: string;
  bank_name: string | null;
  qr_code_url: string | null;
}

interface FormState {
  employee: string;
  account_name: string;
  account_number: string;
  account_type: string;
  bank_name: string;
  qr_code: File | null;
  qr_preview: string | null;
}

const EMPTY_FORM: FormState = {
  employee: '',
  account_name: '',
  account_number: '',
  account_type: 'GCash',
  bank_name: '',
  qr_code: null,
  qr_preview: null,
};

export const AdminPaymentAccountsPage = () => {
  const { success, error } = useToast();
  const { user } = useAuth();
  const rawRole = (user?.role || '').toLowerCase();
  const isAdmin = rawRole.includes('admin');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [qrViewUrl, setQrViewUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: 0 });
  const qrInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetPaymentAccounts(
    typeFilter !== 'All' ? { account_type: typeFilter } : undefined
  );
  const { data: empData } = useGetEmployees();
  const createMutation = useCreatePaymentAccount();
  const updateMutation = useUpdatePaymentAccount();
  const deleteMutation = useDeletePaymentAccount();

  const rawAccounts: PaymentAccount[] = normalizeApiResponse(data) || [];
  const employees: any[] = normalizeApiResponse(empData) || [];

  const accounts = rawAccounts.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (a.employee_name || '').toLowerCase().includes(q) ||
      (a.account_name || '').toLowerCase().includes(q) ||
      (a.jtp_code || '').toLowerCase().includes(q) ||
      (a.account_number || '').toLowerCase().includes(q) ||
      (a.account_type || '').toLowerCase().includes(q) ||
      (a.bank_name || '').toLowerCase().includes(q)
    );
  });

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };

  const openEdit = (acc: PaymentAccount) => {
    setEditingId(acc.id);
    setForm({
      employee: String(acc.employee || ''),
      account_name: acc.account_name || '',
      account_number: acc.account_number || '',
      account_type: acc.account_type || 'GCash',
      bank_name: acc.bank_name || '',
      qr_code: null,
      qr_preview: acc.qr_code_url || null,
    });
    setShowForm(true);
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setForm((f) => ({ ...f, qr_code: file, qr_preview: URL.createObjectURL(file) }));
  };

  const buildFormData = () => {
    const fd = new FormData();
    if (form.employee) fd.append('employee', form.employee);
    fd.append('account_name', form.account_name);
    fd.append('account_number', form.account_number);
    fd.append('account_type', form.account_type);
    fd.append('bank_name', form.bank_name);
    if (form.qr_code) fd.append('qr_code', form.qr_code);
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_number.trim()) { error('Account number is required'); return; }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, formData: buildFormData() });
        success('Payment account updated!');
      } else {
        await createMutation.mutateAsync(buildFormData());
        success('Payment account added!');
      }
      setShowForm(false); setForm(EMPTY_FORM); setEditingId(null);
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Failed to save payment account');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      success('Payment account deleted');
      setDeleteConfirm({ isOpen: false, id: 0 });
    } catch { error('Failed to delete'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Sidebar View */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="lg:ml-64">
        <AdminMobileProfile />

        <div className="p-4 lg:p-6 space-y-6 max-md:p-3 max-md:space-y-4 max-md:pb-32 pb-32 lg:pb-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                  <CreditCard size={24} />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Payment Accounts
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Maya, GCash, Bank Card, and Credit/Debit Card
              </p>
            </div>

            {isAdmin && (
              <Button
                variant="primary"
                onClick={openAdd}
                className="flex items-center justify-center gap-2 shrink-0 py-2.5 px-4 shadow-sm"
              >
                <Plus size={18} />
                <span>Add Account</span>
              </Button>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card className="border-l-4 border-blue-500 !p-4">
              <div className="text-center">
                <p className="text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider">Total Accounts</p>
                <p className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">{rawAccounts.length}</p>
              </div>
            </Card>

            <Card className="border-l-4 border-green-500 !p-4">
              <div className="text-center">
                <p className="text-green-600 dark:text-green-400 font-semibold text-xs uppercase tracking-wider">GCash</p>
                <p className="text-3xl lg:text-4xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {rawAccounts.filter(a => a.account_type === 'GCash').length}
                </p>
              </div>
            </Card>

            <Card className="border-l-4 border-cyan-500 !p-4">
              <div className="text-center">
                <p className="text-cyan-600 dark:text-cyan-400 font-semibold text-xs uppercase tracking-wider">Maya</p>
                <p className="text-3xl lg:text-4xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
                  {rawAccounts.filter(a => a.account_type === 'Maya').length}
                </p>
              </div>
            </Card>

            <Card className="border-l-4 border-purple-500 !p-4">
              <div className="text-center">
                <p className="text-purple-600 dark:text-purple-400 font-semibold text-xs uppercase tracking-wider">Bank & Cards</p>
                <p className="text-3xl lg:text-4xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {rawAccounts.filter(a => a.account_type === 'Bank Card' || a.account_type === 'Credit Card/Debit Card').length}
                </p>
              </div>
            </Card>
          </div>

          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, JTP code, number, bank..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              <option value="All">All Types</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Main Table Card */}
          <Card className="overflow-hidden !p-0 border border-gray-200 dark:border-gray-700 shadow-xs">
            {isLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : accounts.length === 0 ? (
              <div className="p-8">
                <EmptyState title="No payment accounts found" description="Add payment accounts for employees." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">JTP Code</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Number</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Account Type</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-center">QR Code</th>
                      <th className="px-5 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                          {acc.employee_name || acc.account_name || 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-sm font-mono text-gray-600 dark:text-gray-300 font-medium">
                          {acc.jtp_code || '—'}
                        </td>
                        <td className="px-5 py-4 text-sm font-mono text-gray-800 dark:text-gray-200 font-semibold">
                          {acc.account_number || '—'}
                          {acc.bank_name && (
                            <span className="block text-xs font-sans text-gray-400 font-normal">{acc.bank_name}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {acc.account_type === 'GCash' && (
                              <img src={gcashLogo} alt="GCash" className="w-5 h-5 object-contain" />
                            )}
                            {acc.account_type === 'Maya' && (
                              <img src={mayaLogo} alt="Maya" className="w-5 h-5 object-contain rounded bg-black" />
                            )}
                            {acc.account_type === 'Bank Card' && (
                              <span className="text-sm">🏦</span>
                            )}
                            {acc.account_type === 'Credit Card/Debit Card' && (
                              <CreditCard size={15} className="text-slate-500" />
                            )}
                            <Badge variant={getTypeBadge(acc.account_type)} className="text-xs whitespace-nowrap font-bold">
                              {acc.account_type}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {acc.qr_code_url ? (
                            <Button
                              variant="secondary"
                              className="text-xs py-1.5 px-3 h-auto inline-flex items-center gap-1.5 shadow-2xs"
                              onClick={() => setQrViewUrl(acc.qr_code_url!)}
                            >
                              <Eye size={14} className="text-blue-500" /> View
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No QR</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="secondary"
                              className="text-xs py-1.5 px-3 h-auto inline-flex items-center gap-1.5"
                              onClick={() => openEdit(acc)}
                            >
                              <Edit2 size={13} /> Edit
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="danger"
                                className="text-xs py-1.5 px-2.5 h-auto"
                                onClick={() => setDeleteConfirm({ isOpen: true, id: acc.id })}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard size={20} className="text-blue-500" />
                {editingId ? 'Edit Payment Account' : 'Add Payment Account'}
              </h2>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
                <select value={form.employee} onChange={(e) => setForm((f) => ({ ...f, employee: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Select Employee —</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name || `${emp.firstname} ${emp.lastname}`} ({emp.jtp_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Type *</label>
                <select value={form.account_type} onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label>
                <input type="text" value={form.account_name} onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                  placeholder="Account holder name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account / Mobile Number *</label>
                <input type="text" value={form.account_number} onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                  placeholder="09XXXXXXXXX or account number" required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {(form.account_type === 'Bank Card' || form.account_type === 'Credit Card/Debit Card') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank / Provider</label>
                  <input type="text" value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                    placeholder="e.g. BDO, BPI, UnionBank"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QR Code Image</label>
                {form.qr_preview ? (
                  <div className="relative w-40 h-40 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden group">
                    <img src={form.qr_preview} alt="QR" className="w-full h-full object-contain bg-gray-50 dark:bg-gray-800" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, qr_code: null, qr_preview: null }))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => qrInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    <Upload size={16} /> Upload QR Code
                  </button>
                )}
                <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrChange} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" isLoading={createMutation.isPending || updateMutation.isPending} className="flex-1">
                  {editingId ? 'Save Changes' : 'Add Account'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrViewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setQrViewUrl(null)}>
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setQrViewUrl(null)} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <div className="flex items-center gap-2 mb-4"><QrCode size={20} className="text-blue-500" /><h3 className="font-bold text-gray-900 dark:text-white">QR Code</h3></div>
            <img src={qrViewUrl} alt="QR Code" className="w-full rounded-lg border object-contain bg-gray-50 dark:bg-gray-800" />
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={deleteConfirm.isOpen} title="Delete Payment Account?" message="This will permanently remove this payment account."
        onConfirm={handleDelete} onCancel={() => setDeleteConfirm({ isOpen: false, id: 0 })}
        confirmText="Delete" isDangerous isLoading={deleteMutation.isPending} />
    </div>
  );
};

export default AdminPaymentAccountsPage;
