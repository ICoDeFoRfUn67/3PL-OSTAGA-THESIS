import { useState, useEffect } from 'react';
import { HRPermission } from '@/types';
import { Modal } from './Modal';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/api/apiService';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { Lock, Unlock, Shield, Key, Eye, EyeOff, ShieldCheck, Trash2, FileText, UserPlus, RefreshCw, Clock } from 'lucide-react';
import { LoadingSpinner } from './common';

interface EmployeeAccessControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  onUpdate?: () => void;
}

export const EmployeeAccessControlModal = ({
  isOpen,
  onClose,
  employee,
  onUpdate,
}: EmployeeAccessControlModalProps) => {
  const { user: currentUser } = useAuth();
  const isCurrentUserAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [accountLocked, setAccountLocked] = useState(!employee?.can_login);

  // Password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const map: Record<number, { label: string; color: string }> = {
      0: { label: 'Weak', color: 'bg-red-500' },
      1: { label: 'Weak', color: 'bg-red-500' },
      2: { label: 'Fair', color: 'bg-amber-500' },
      3: { label: 'Good', color: 'bg-emerald-400' },
      4: { label: 'Strong', color: 'bg-emerald-500' },
    };
    return { score, ...map[score] };
  };

  // Manual Password State
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [manualData, setManualData] = useState({
    password: '',
    confirm: '',
  });

  type PermKey = keyof Pick<HRPermission,
    'can_view_employees' | 'can_edit_employee_info' | 'can_edit_payslip' | 'can_delete_employees' | 'can_reset_password'>;

  const [hrPermissions, setHrPermissions] = useState<Record<PermKey, boolean>>({
    can_view_employees: false,
    can_edit_employee_info: false,
    can_edit_payslip: false,
    can_delete_employees: false,
    can_reset_password: false,
  });
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  const isHR = employee?.role?.toLowerCase() === 'hr';

  useEffect(() => {
    if (isOpen && employee && isHR) {
      loadHRPermissions();
    } else {
      setLoadingPermissions(false);
    }
  }, [isOpen, employee, isHR]);

  useEffect(() => {
    setAccountLocked(!employee?.can_login);
  }, [employee]);

  const loadHRPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await apiClient.get(`hr-permissions/?hr_employee=${employee.id}`);
      const permsList = normalizeApiResponse(response.data);
      if (permsList.length > 0) {
        const perms = permsList[0];
        setHrPermissions({
          can_view_employees: perms.can_view_employees || false,
          can_edit_employee_info: perms.can_edit_employee_info || false,
          can_edit_payslip: perms.can_edit_payslip || false,
          can_delete_employees: perms.can_delete_employees || false,
          can_reset_password: perms.can_reset_password || false,
        });
      }
    } catch (error: any) {
      console.error('Failed to load HR permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const togglePermission = (key: PermKey) => {
    setHrPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAccountLock = async (newLockedState: boolean) => {
    try {
      setIsLoading(true);
      const action = newLockedState ? 'lock' : 'unlock';
      const response = await apiClient.patch(
        `lock-unlock-account/${employee.id}/`,
        { action }
      );
      setAccountLocked(newLockedState);
      toast.success(response.data.message);
      onUpdate?.();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error || `Failed to ${newLockedState ? 'lock' : 'unlock'} account`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    try {
      setIsLoading(true);
      const existingResponse = await apiClient.get(`hr-permissions/?hr_employee=${employee.id}`);
      const permsList = normalizeApiResponse(existingResponse.data);
      if (permsList.length > 0) {
        const permId = permsList[0].id;
        await apiClient.patch(`hr-permissions/${permId}/`, { ...hrPermissions });
      } else {
        await apiClient.post('hr-permissions/', { hr_employee: employee.id, ...hrPermissions });
      }
      toast.success('HR Permissions saved successfully');
      onUpdate?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    // Save password if filled
    if (manualData.password) {
      if (manualData.password !== manualData.confirm) {
        toast.error('Passwords do not match');
        return;
      }
      if (manualData.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      try {
        setIsLoading(true);
        await apiClient.post(`reset-password/${employee.id}/`, { manual_password: manualData.password });
        toast.success('Password updated successfully');
        setManualData({ password: '', confirm: '' });
        onUpdate?.();
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to update password');
      } finally {
        setIsLoading(false);
      }
    }

    // Save HR permissions if HR employee
    if (isHR) {
      await handleSavePermissions();
    }
  };

  const passwordStrength = getPasswordStrength(manualData.password);

  const lastPasswordChange = employee?.last_password_change
    ? new Date(employee.last_password_change).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'Never';

  const lastAccess = employee?.last_login
    ? new Date(employee.last_login).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : 'Never';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Access & Security Control"
      subtitle="Manage user access, credentials, and security settings"
      icon={<Lock size={22} />}
      size="2xl"
      noPadding
    >
      <div className="flex flex-col md:flex-row min-h-[500px]">
        {/* ─── LEFT PANEL ─── */}
        <aside className="md:w-[280px] shrink-0 bg-gray-50 dark:bg-slate-900/60 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-800 flex flex-col items-center p-8 gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl">
              {employee?.profile_image_url ? (
                <img src={employee.profile_image_url} alt={employee.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-red-600 flex items-center justify-center text-white text-5xl font-black">
                  {employee?.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Active indicator */}
            <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold ${
              employee?.status?.toLowerCase() === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
            }`}>
              {employee?.status || 'Active'}
            </span>
          </div>

          {/* Name & role */}
          <div className="text-center mt-4">
            <h3 className="font-extrabold text-gray-900 dark:text-white text-base leading-tight">{employee?.full_name}</h3>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mt-1">{employee?.position || employee?.role}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 font-mono mt-0.5">#{employee?.employee_id}</p>
          </div>

          {/* Security Access */}
          <div className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-gray-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Security Access</span>
            </div>

            <div className={`rounded-xl p-3 ${accountLocked ? 'bg-red-50 dark:bg-red-950/20' : 'bg-green-50 dark:bg-green-950/20'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accountLocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {accountLocked ? <Lock size={14} /> : <Unlock size={14} />}
                </div>
                <div>
                  <p className={`text-xs font-extrabold ${accountLocked ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                    {accountLocked ? 'Account Locked' : 'Access Granted'}
                  </p>
                  <p className="text-[9px] text-gray-500 dark:text-slate-500 font-medium">
                    {accountLocked ? 'No login capabilities' : 'Full system availability'}
                  </p>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1 leading-relaxed">
                {accountLocked ? 'This user cannot log in to the system.' : 'This user has complete access to all systems and features.'}
              </p>
              {/* Toggle */}
              {isCurrentUserAdmin && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => toggleAccountLock(!accountLocked)}
                    disabled={isLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                      accountLocked ? 'bg-gray-300 dark:bg-slate-600' : 'bg-green-500'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      accountLocked ? 'translate-x-1' : 'translate-x-6'
                    }`} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Last Access */}
          <div className="w-full flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
            <Clock size={13} />
            <div>
              <p className="font-bold text-[10px] uppercase tracking-wider">Last Access</p>
              <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">{lastAccess}</p>
            </div>
          </div>
        </aside>

        {/* ─── RIGHT PANEL ─── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

            {/* HR Permissions (only for HR) */}
            {isHR && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={15} className="text-red-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-slate-300">HR Administrative Powers</h4>
                </div>
                {loadingPermissions ? (
                  <div className="flex justify-center py-6"><LoadingSpinner size="sm" /></div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
                    {[
                      { key: 'can_view_employees', label: 'View Employee Records', icon: FileText, desc: 'Can view employee directory' },
                      { key: 'can_edit_employee_info', label: 'Modify Personnel Info', icon: UserPlus, desc: 'Can edit employee details' },
                      { key: 'can_edit_payslip', label: 'Process Payroll/Payslips', icon: ShieldCheck, desc: 'Can manage salary records' },
                      { key: 'can_delete_employees', label: 'Terminate/Delete Staff', icon: Trash2, desc: 'Can remove employee accounts' },
                      { key: 'can_reset_password', label: 'Security Management', icon: Key, desc: 'Can reset user passwords' },
                    ].map((perm) => (
                      <div key={perm.key} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 flex items-center justify-center text-gray-400">
                            <perm.icon size={13} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-800 dark:text-slate-200">{perm.label}</p>
                            <p className="text-[9px] text-gray-400 dark:text-slate-500">{perm.desc}</p>
                          </div>
                        </div>
                        {isCurrentUserAdmin ? (
                          <button
                            onClick={() => togglePermission(perm.key as PermKey)}
                            disabled={isLoading || loadingPermissions}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 ${
                              hrPermissions[perm.key as PermKey] ? 'bg-red-500' : 'bg-gray-200 dark:bg-slate-600'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-300 ${
                              hrPermissions[perm.key as PermKey] ? 'translate-x-4' : 'translate-x-1'
                            }`} />
                          </button>
                        ) : (
                          <span className={`text-[10px] font-bold ${hrPermissions[perm.key as PermKey] ? 'text-green-600' : 'text-gray-400'}`}>
                            {hrPermissions[perm.key as PermKey] ? 'Allowed' : 'Disabled'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Credentials Management */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Key size={15} className="text-gray-400" />
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-700 dark:text-slate-300">Credentials Management</h4>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-3">Manage username and password for system access.</p>

              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden space-y-0">
                {/* Username row */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-slate-700">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">System Username</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100">
                      {employee?.user_info?.username || employee?.employee_id || 'Not Set'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                    <Lock size={11} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Read Only</span>
                  </div>
                </div>

                {/* Password fields */}
                <div className="px-4 pt-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1.5 block">New Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={manualData.password}
                        onChange={(e) => setManualData({ ...manualData, password: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
                        placeholder="At least 8 characters"
                      />
                      <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1.5 block">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={manualData.confirm}
                        onChange={(e) => setManualData({ ...manualData, confirm: e.target.value })}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
                        placeholder="Re-type password"
                      />
                      <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Last password change & Reset */}
                <div className="flex items-center justify-between px-4 pb-4">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-0.5">Last Password Change</p>
                    <p className="text-xs font-semibold text-gray-600 dark:text-slate-300">{lastPasswordChange}</p>
                  </div>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isLoading || (!manualData.password && !manualData.confirm)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-xs font-bold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={13} />
                    Reset Password
                  </button>
                </div>

                {/* Password strength bar */}
                {manualData.password && (
                  <div className="px-4 pb-4 flex items-center gap-3 border-t border-gray-100 dark:border-slate-700 pt-3">
                    <div className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                      <Shield size={13} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-gray-700 dark:text-slate-300">Strong passwords keep your account secure</p>
                      <p className="text-[9px] text-gray-400 dark:text-slate-500">Use a combination of letters, numbers, and symbols.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 w-6 rounded-full transition-all ${
                              i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200 dark:bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[10px] font-black ${
                        passwordStrength.score >= 4 ? 'text-emerald-600' :
                        passwordStrength.score >= 3 ? 'text-emerald-500' :
                        passwordStrength.score >= 2 ? 'text-amber-500' : 'text-red-500'
                      }`}>{passwordStrength.label}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ─── SAVE BUTTON ─── */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button
              onClick={handleSaveChanges}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-extrabold text-sm tracking-wide shadow-lg shadow-red-600/25 transition-all disabled:opacity-60"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Lock size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
