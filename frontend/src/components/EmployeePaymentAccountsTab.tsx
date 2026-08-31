import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingSpinner } from '@/components/common';
import {
  useGetPaymentAccounts,
  useCreatePaymentAccount,
  useUpdatePaymentAccount,
  useDeletePaymentAccount,
} from '@/hooks/useQueries';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { Plus, Trash2, Edit2, X, Upload, QrCode, CreditCard } from 'lucide-react';
import gcashLogo from '@/images/gcash_logo.webp';
import mayaLogo from '@/images/maya_logo.jpg';

/* ─── Constants ─────────────────────────────────────────── */
const ACCOUNT_TYPES = ['Maya', 'GCash', 'Bank Card', 'Credit Card/Debit Card'];

/* Brand logos using uploaded images / styled components */
const GCashLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden p-1.5`}>
    <img src={gcashLogo} alt="GCash" className="w-full h-full object-contain" />
  </div>
);

const MayaLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} rounded-xl bg-black flex items-center justify-center shrink-0 shadow-sm border border-slate-900 overflow-hidden p-1`}>
    <img src={mayaLogo} alt="Maya" className="w-full h-full object-contain" />
  </div>
);

const BankLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-sm`}>
    <span className="text-white text-xl">🏦</span>
  </div>
);

const CardLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <div className={`${className} rounded-xl bg-slate-700 flex items-center justify-center shrink-0 shadow-sm`}>
    <CreditCard size={22} className="text-white" />
  </div>
);

const getBrandLogo = (type: string) => {
  if (type === 'GCash') return <GCashLogo />;
  if (type === 'Maya') return <MayaLogo />;
  if (type === 'Bank Card') return <BankLogo />;
  return <CardLogo />;
};

/* ─── Types ──────────────────────────────────────────────── */
interface PaymentAccount {
  id: number;
  account_name: string;
  account_number: string;
  account_type: string;
  bank_name: string | null;
  qr_code_url: string | null;
  employee?: number;
}

interface FormState {
  account_name: string;
  account_number: string;
  account_type: string;
  bank_name: string;
  notes: string;
  qr_code: File | null;
  qr_preview: string | null;
}

const EMPTY: FormState = {
  account_name: '',
  account_number: '',
  account_type: 'GCash',
  bank_name: '',
  notes: '',
  qr_code: null,
  qr_preview: null,
};

interface EmployeePaymentAccountsTabProps {
  employeeId?: number;
}

/* ─── Main Component ─────────────────────────────────────── */
export const EmployeePaymentAccountsTab = ({ employeeId: propEmployeeId }: EmployeePaymentAccountsTabProps = {}) => {
  const { employee: authEmployee } = useAuth();
  const { success, error } = useToast();

  const targetEmployeeId = propEmployeeId !== undefined ? propEmployeeId : authEmployee?.id;

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [qrViewUrl, setQrViewUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: 0 });
  const qrInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useGetPaymentAccounts(
    targetEmployeeId ? { employee: targetEmployeeId } : undefined
  );
  const createMutation = useCreatePaymentAccount();
  const updateMutation = useUpdatePaymentAccount();
  const deleteMutation = useDeletePaymentAccount();

  const allAccounts: PaymentAccount[] = normalizeApiResponse(data) || [];
  const accounts = targetEmployeeId
    ? allAccounts.filter(
        (a) => a.employee == null || String(a.employee) === String(targetEmployeeId)
      )
    : allAccounts;

  const openAdd = () => { setEditingId(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (acc: PaymentAccount) => {
    setEditingId(acc.id);
    setForm({
      account_name: acc.account_name,
      account_number: acc.account_number,
      account_type: acc.account_type,
      bank_name: acc.bank_name || '',
      notes: '',
      qr_code: null,
      qr_preview: acc.qr_code_url || null,
    });
    setShowForm(true);
  };

  const buildFD = () => {
    const fd = new FormData();
    fd.append('account_name', form.account_name);
    fd.append('account_number', form.account_number);
    fd.append('account_type', form.account_type);
    fd.append('bank_name', form.bank_name);
    if (form.qr_code) fd.append('qr_code', form.qr_code);
    if (!editingId && targetEmployeeId) {
      fd.append('employee', String(targetEmployeeId));
    }
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_number.trim()) { error('Account / mobile number is required'); return; }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, formData: buildFD() });
        success('Payment account updated!');
      } else {
        await createMutation.mutateAsync(buildFD());
        success('Payment account added!');
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
    } catch (err: any) {
      error(err?.response?.data?.detail || 'Failed to save. Please try again.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      success('Account removed');
      setDeleteConfirm({ isOpen: false, id: 0 });
    } catch {
      error('Failed to remove account');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Saved Accounts section ── */}
      {accounts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Saved Payment Accounts
          </h4>
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white dark:bg-[#0d1526] border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* Brand logo */}
                  {getBrandLogo(acc.account_type)}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-base">
                      {acc.account_type}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Account Name</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {acc.account_name || '—'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Mobile Number</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">
                      {acc.account_number}
                    </p>
                    {acc.bank_name && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{acc.bank_name}</p>
                    )}
                  </div>

                  {/* QR Code preview */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {acc.qr_code_url ? (
                      <>
                        <p className="text-xs text-gray-400 dark:text-gray-500">QR Code</p>
                        <button
                          onClick={() => setQrViewUrl(acc.qr_code_url!)}
                          className="w-16 h-16 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden bg-white hover:ring-2 hover:ring-blue-400 transition-all"
                        >
                          <img
                            src={acc.qr_code_url}
                            alt="QR"
                            className="w-full h-full object-contain"
                          />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-400 dark:text-gray-500">QR Code</p>
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center">
                          <QrCode size={20} className="text-gray-300 dark:text-slate-600" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status + actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0 ml-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold">
                      Active
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(acc)}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, id: acc.id })}
                        className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── "Add New" dashed card ── */}
      <button
        onClick={openAdd}
        className="w-full border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-2xl py-7 flex flex-col items-center gap-2 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
      >
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Plus size={18} className="text-white" />
        </div>
        <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
          Add New Payment Account
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs">
          Upload your payment details and QR code
        </p>
      </button>

      {/* ══════════════════════════════════════
          Add / Edit Modal
      ══════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Payment Account' : 'Add Payment Account'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY); }}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Row 1: Payment Type + Account Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Payment Type
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                      {form.account_type === 'GCash' && (
                        <img src={gcashLogo} alt="GCash" className="w-5 h-5 object-contain" />
                      )}
                      {form.account_type === 'Maya' && (
                        <img src={mayaLogo} alt="Maya" className="w-5 h-5 object-contain rounded bg-black" />
                      )}
                      {form.account_type === 'Bank Card' && (
                        <span className="text-sm">🏦</span>
                      )}
                      {form.account_type === 'Credit Card/Debit Card' && (
                        <CreditCard size={14} className="text-gray-500" />
                      )}
                    </div>
                    <select
                      value={form.account_type}
                      onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}
                      required
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▾</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={form.account_name}
                    onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Mobile Number + QR Code Upload */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={form.account_number}
                    onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                    placeholder="e.g. 0917 123 4567"
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Bank name under mobile number for bank types */}
                  {(form.account_type === 'Bank Card' || form.account_type === 'Credit Card/Debit Card') && (
                    <input
                      type="text"
                      value={form.bank_name}
                      onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                      placeholder="Bank name (e.g. BDO, BPI)"
                      className="w-full mt-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Upload QR Code
                  </label>
                  {form.qr_preview ? (
                    <div className="relative w-full h-[100px] rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden group bg-gray-50 dark:bg-gray-800">
                      <img src={form.qr_preview} alt="QR" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, qr_code: null, qr_preview: null }))}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      className="w-full h-[100px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-600 transition-colors"
                    >
                      <Upload size={22} className="text-gray-400" />
                      <span className="text-xs font-medium">Click to upload QR code</span>
                      <span className="text-[10px] text-gray-400">PNG, JPG or JPEG (Max. 5MB)</span>
                    </button>
                  )}
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setForm((s) => ({ ...s, qr_code: f, qr_preview: URL.createObjectURL(f) }));
                    }}
                  />
                </div>
              </div>

              {/* Notes (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Add any additional notes here..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                  ) : (
                    editingId ? 'Save Changes' : 'Save Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR View Modal */}
      {qrViewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setQrViewUrl(null)}
        >
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-2xl max-w-[280px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrViewUrl(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <QrCode size={18} className="text-blue-500" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">QR Code</h3>
            </div>
            <img
              src={qrViewUrl}
              alt="QR Code"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 object-contain bg-gray-50 dark:bg-gray-800"
            />
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Remove Payment Account?"
        message="Are you sure you want to remove this payment account? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: 0 })}
        confirmText="Remove"
        isDangerous
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
