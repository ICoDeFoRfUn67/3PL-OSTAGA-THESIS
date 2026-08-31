import { useEffect, useMemo, useState } from 'react';
import {
  User, Lock, Eye, EyeOff, Phone, Mail, MapPin, Hash,
  ChevronLeft, ArrowRight, CheckCircle2, Building2, Calendar,
  CreditCard, ShieldCheck, AlertCircle, Search, Info
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/apiService';
import { API_ENDPOINTS, QUERY_KEYS } from '@/constants/api';
import { useGetHubs } from '@/hooks/useQueries';
import { useAuth } from '@/hooks';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { getPhilippineZipCode } from '@/utils/philippineZipCodes';
import * as phil from 'phil-reg-prov-mun-brgy';
type RoleType = string;
type EmploymentType = string;
type GenderType = string;

type HubOption = { id: number; name: string };

interface AddEmployeeProps {
  onCancel?: () => void;
  onClose?: () => void;
  onCreated?: () => void;
}

interface EmployeeFormState {
  username: string;
  jtpCode: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: GenderType;
  nationality: string;
  maritalStatus: string;
  email: string;
  phone: string;
  region: string;
  province: string;
  cityMunicipality: string;
  barangay: string;
  zipCode: string;
  position: string;
  employmentType: EmploymentType;
  status: string;
  role: RoleType;
  hub: string;
  hireDate: string;
  employeeId: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  tin: string;
  sss: string;
  philHealth: string;
  pagIbig: string;
  password: string;
  confirmPassword: string;
  canLogin: boolean;
  isActive: boolean;
  createdAt: string;
  accessType: 'Single' | 'Multiple';
  managedHubs: number[];
}

const initialFormState: EmployeeFormState = {
  username: '',
  jtpCode: '',
  firstName: '',
  middleInitial: '',
  lastName: '',
  placeOfBirth: '',
  dateOfBirth: '',
  gender: '',
  nationality: '',
  maritalStatus: 'Single',
  email: '',
  phone: '',
  region: '',
  province: '',
  cityMunicipality: '',
  barangay: '',
  zipCode: '',
  position: '',
  employmentType: '',
  status: 'Active',
  role: 'Employee',
  hub: '',
  hireDate: '',
  employeeId: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  tin: '',
  sss: '',
  philHealth: '',
  pagIbig: '',
  password: '',
  confirmPassword: '',
  canLogin: true,
  isActive: true,
  createdAt: new Date().toISOString(),
  accessType: 'Single',
  managedHubs: [],
};

/* ─── field style constants ─── */
const inputCls =
  'mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition ' +
  'placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20';

const iconInputCls =
  'mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition ' +
  'placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-500/20';

const selectCls =
  'mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition ' +
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20';

const iconSelectCls =
  'mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 outline-none transition ' +
  'focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20';

const labelCls = 'block text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400';
const redStar = <span className="text-red-500 ml-0.5">*</span>;

function FieldIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <Icon
      size={14}
      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  );
}

/* ─── Step indicator ─── */
const STEPS = ['Account', 'Personal & Contact', 'Employment & Compliance'];

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full mb-4">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex flex-1 items-center min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all
                  ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white shadow shadow-blue-200' : 'border-2 border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'}`}
              >
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span
                className={`mt-0.5 text-[9px] font-bold whitespace-nowrap ${active ? 'text-blue-600' : done ? 'text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1.5 mb-3 rounded transition-all ${done ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export const AddEmployee = ({ onCancel, onClose, onCreated }: AddEmployeeProps) => {
  const queryClient = useQueryClient();
  const { user: currentUser, employee: currentEmployee } = useAuth();
  const currentUserRole = currentEmployee?.role || 'Admin';

  const [formState, setFormState] = useState<EmployeeFormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hubSearch, setHubSearch] = useState('');

  // Dynamic options
  const [roles, setRoles] = useState<string[]>(['Employee', 'HR', 'Admin']);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(['Full-time', 'OCW']);
  const [positions, setPositions] = useState<string[]>(['Admin', 'HR', 'Rider', 'Sorter']);
  const { data: hubsData } = useGetHubs();
  const allHubs = useMemo(() => normalizeApiResponse(hubsData) as HubOption[], [hubsData]);
  const genders = ['Male', 'Female', 'Other'];

  const isAdminUser = currentUserRole !== 'HR';
  const isCreatingHrRole = formState.role === 'HR' && isAdminUser;

  const hrManagedHubIds = useMemo(() => {
    if (currentUserRole !== 'HR') return null;
    const perms = (currentEmployee as { hr_permissions?: { managed_hubs?: Array<number | { id: number }> } })?.hr_permissions;
    const managed = perms?.managed_hubs;
    if (Array.isArray(managed) && managed.length > 0) {
      return managed
        .map((h) => (typeof h === 'number' ? h : h?.id))
        .filter((id): id is number => typeof id === 'number');
    }
    if (currentEmployee?.hub) return [Number(currentEmployee.hub)];
    return [];
  }, [currentUserRole, currentEmployee]);

  const selectableHubs = useMemo(() => {
    if (hrManagedHubIds === null) return allHubs;
    return allHubs.filter((h) => hrManagedHubIds.includes(h.id));
  }, [allHubs, hrManagedHubIds]);

  const filteredAssignmentHubs = useMemo(() => {
    const q = hubSearch.trim().toLowerCase();
    if (!q) return allHubs;
    return allHubs.filter((h) => h.name.toLowerCase().includes(q));
  }, [allHubs, hubSearch]);

  const availableRoles = useMemo(
    () => roles.filter((r) => (currentUserRole === 'HR' ? r === 'Employee' : true)),
    [roles, currentUserRole]
  );

  // Cascading location data using phil-reg-prov-mun-brgy
  const regionsList = phil.regions.map(r => r.name);
  const selectedRegionCode = phil.regions.find(r => r.name === formState.region)?.reg_code;
  const availableProvinces = selectedRegionCode ? phil.getProvincesByRegion(selectedRegionCode).map(p => p.name) : [];
  
  const selectedProvinceCode = selectedRegionCode ? phil.getProvincesByRegion(selectedRegionCode).find(p => p.name === formState.province)?.prov_code : undefined;
  const availableCities = selectedProvinceCode ? phil.getCityMunByProvince(selectedProvinceCode).map(c => c.name) : [];
  
  const selectedCityCode = selectedProvinceCode ? phil.getCityMunByProvince(selectedProvinceCode).find(c => c.name === formState.cityMunicipality)?.mun_code : undefined;
  const availableBarangays = selectedCityCode ? phil.getBarangayByMun(selectedCityCode).map(b => b.name) : [];

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const response = await apiClient.get(`${API_ENDPOINTS.META}`);
        const json = response.data;
        if (Array.isArray(json.roles)) setRoles(json.roles);
        if (Array.isArray(json.positions) && json.positions.length > 0) {
          // Merge backend positions with hardcoded ones and filter out demo entries
          const merged = [...new Set(['Admin', 'HR', 'Rider', 'Sorter', ...json.positions])];
          const filtered = merged.filter((p) => String(p).toLowerCase() !== 'demo');
          setPositions(filtered);
        }
        if (Array.isArray(json.employmentTypes)) {
          // ensure we only keep Full-time and OCW if the backend sends more
          const filteredTypes = json.employmentTypes.filter((t: string) => ['Full-time', 'OCW'].includes(t));
          if (filteredTypes.length > 0) setEmploymentTypes(filteredTypes);
        }
      } catch {
        // keep defaults
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    if (currentUserRole === 'HR') {
      setFormState((prev) => {
        if (prev.role === 'Employee') return prev;
        return { ...prev, role: 'Employee', managedHubs: [], accessType: 'Single' };
      });
    }
  }, [currentUserRole]);

  useEffect(() => {
    if (formState.cityMunicipality || formState.province) {
      const autoZip = getPhilippineZipCode(formState.cityMunicipality, formState.province);
      setFormState((prev) => (prev.zipCode !== autoZip ? { ...prev, zipCode: autoZip } : prev));
    } else if (!formState.region) {
      setFormState((prev) => (prev.zipCode ? { ...prev, zipCode: '' } : prev));
    }
  }, [formState.cityMunicipality, formState.province, formState.region]);

  const callClose = () => { onClose?.(); onCancel?.(); };

  const handleEmailBlur = () => {
    setFormState((prev) => {
      const trimmed = prev.email.trim();
      if (!trimmed) return prev;
      if (!trimmed.includes('@')) {
        return { ...prev, email: `${trimmed}@gmail.com` };
      }
      return { ...prev, email: trimmed };
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;

    if (type === 'checkbox') {
      setFormState((prev) => ({ ...prev, [name]: target.checked }));
      return;
    }

    // Strictly enforce 11 digits only for phone numbers
    if (name === 'phone' || name === 'emergencyContactPhone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormState((prev) => ({ ...prev, [name]: digitsOnly }));
      return;
    }

    // Cascade reset for location fields
    if (name === 'region') {
      setFormState((prev) => ({
        ...prev,
        region: value,
        province: '',
        cityMunicipality: '',
        barangay: '',
        zipCode: '',
      }));
      return;
    }
    if (name === 'province') {
      const autoZip = getPhilippineZipCode('', value);
      setFormState((prev) => ({
        ...prev,
        province: value,
        cityMunicipality: '',
        barangay: '',
        zipCode: autoZip,
      }));
      return;
    }
    if (name === 'cityMunicipality') {
      const autoZip = getPhilippineZipCode(value, formState.province);
      setFormState((prev) => ({
        ...prev,
        cityMunicipality: value,
        barangay: '',
        zipCode: autoZip,
      }));
      return;
    }

    if (name === 'role') {
      setFormState((prev) => ({
        ...prev,
        role: value,
        managedHubs: value === 'HR' ? prev.managedHubs : [],
        accessType: 'Single',
        hub: value === 'HR' ? prev.hub : prev.hub,
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccessTypeChange = (type: 'Single' | 'Multiple') => {
    setFormState((prev) => ({
      ...prev,
      accessType: type,
      managedHubs: type === 'Single' && prev.managedHubs.length > 1
        ? prev.managedHubs.slice(0, 1)
        : prev.managedHubs,
      hub: type === 'Single' && prev.managedHubs.length > 1
        ? String(prev.managedHubs[0])
        : prev.hub,
    }));
  };

  const handleCheckboxChange = (hubId: number) => {
    setFormState((prev) => {
      if (prev.accessType === 'Single') {
        const next = prev.managedHubs.includes(hubId) ? [] : [hubId];
        return { ...prev, managedHubs: next, hub: next[0] ? String(next[0]) : '' };
      }
      const isSelected = prev.managedHubs.includes(hubId);
      const next = isSelected
        ? prev.managedHubs.filter((id) => id !== hubId)
        : [...prev.managedHubs, hubId];
      return { ...prev, managedHubs: next };
    });
  };

  const isStepValid = (s: number) => {
    if (s === 0) {
      return (
        Boolean(formState.username) &&
        Boolean(formState.password) &&
        Boolean(formState.confirmPassword) &&
        formState.password === formState.confirmPassword &&
        Boolean(formState.role)
      );
    }
    if (s === 1) {
      const emailVal = formState.email.trim();
      const hasValidEmail = emailVal.length > 0;
      const phoneValid = formState.phone.length === 11;
      const emergencyPhoneValid = formState.emergencyContactPhone.length === 11;

      const personalValid = Boolean(
        formState.firstName && formState.lastName && hasValidEmail &&
        phoneValid && formState.gender && formState.dateOfBirth &&
        formState.region && formState.province &&
        formState.cityMunicipality && formState.barangay &&
        formState.emergencyContactName && emergencyPhoneValid
      );
      if (isCreatingHrRole) {
        return personalValid && formState.managedHubs.length > 0;
      }
      return personalValid;
    }
    if (s === 2) {
      const hubValue = isCreatingHrRole
        ? (formState.managedHubs[0] ? String(formState.managedHubs[0]) : formState.hub)
        : formState.hub;
      return Boolean(formState.position && formState.employmentType && hubValue && formState.hireDate);
    }
    return true;
  };

  const canProceed = !loading && isStepValid(step);
  const isLastStep = step === STEPS.length - 1;

  const normalizeEmailBeforeSubmit = (): string => {
    let email = formState.email.trim();
    if (email && !email.includes('@')) {
      email = `${email}@gmail.com`;
      setFormState((prev) => ({ ...prev, email }));
    }
    return email;
  };

  const goNext = () => {
    normalizeEmailBeforeSubmit();
    if (formState.phone && formState.phone.length !== 11) {
      setError('Phone number must be exactly 11 digits.');
      return;
    }
    if (formState.emergencyContactPhone && formState.emergencyContactPhone.length !== 11) {
      setError('Emergency contact number must be exactly 11 digits.');
      return;
    }
    if (!isStepValid(step)) {
      setError('Please complete all required fields before continuing.');
      return;
    }
    setError(null);
    setStep((p) => Math.min(p + 1, STEPS.length - 1));
  };
  const goBack = () => { setError(null); setStep((p) => Math.max(p - 1, 0)); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const finalizedEmail = normalizeEmailBeforeSubmit();

    if (!isLastStep) { goNext(); return; }

    if (!formState.firstName || !formState.lastName || !finalizedEmail || !formState.password || !formState.position) {
      setError('Please complete required fields (name, email, password, position).');
      return;
    }
    if (formState.phone.length !== 11) {
      setError('Phone number must be exactly 11 digits.');
      return;
    }
    if (formState.emergencyContactPhone && formState.emergencyContactPhone.length !== 11) {
      setError('Emergency contact number must be exactly 11 digits.');
      return;
    }
    if (formState.password !== formState.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      const fieldMap: Record<string, string> = {
        firstName: 'firstname', lastName: 'lastname', middleInitial: 'middle_initial',
        placeOfBirth: 'place_of_birth', dateOfBirth: 'date_of_birth', maritalStatus: 'marital_status',
        email: 'email_address', phone: 'phone_number',
        employmentType: 'employment_type', hireDate: 'hired_date', jtpCode: 'jtp_code',
        employeeId: 'employee_id', emergencyContactName: 'emergency_contact_name',
        emergencyContactPhone: 'emergency_contact_phone', isActive: 'is_active',
        region: 'region', province: 'province', cityMunicipality: 'city_municipality',
        barangay: 'barangay', zipCode: 'zip_code',
        tin: 'tin', sss: 'sss', philHealth: 'philhealth', pagIbig: 'pagibig',
      };

      const skipKeys = new Set([
        'confirmPassword', 'createdAt',
      ]);

      Object.entries({ ...formState, email: finalizedEmail }).forEach(([key, val]) => {
        if (skipKeys.has(key)) return;
        const backendKey = fieldMap[key] ?? key;
        let value: string | boolean = val as string | boolean;
        if (backendKey === 'employment_type' && typeof value === 'string') {
          if (value === 'Full Time') value = 'Full-time';
        }
        if (typeof value === 'boolean') { formData.append(backendKey, String(value)); return; }
        if (value === undefined || value === null || value === '') return;
        formData.append(backendKey, String(value));
      });

      if (formState.role === 'HR') {
        const managed = formState.accessType === 'Single'
          ? formState.managedHubs.slice(0, 1)
          : formState.managedHubs;
        formData.append('hr_permissions', JSON.stringify({
          access_type: formState.accessType,
          managed_hubs: managed,
        }));
        if (managed.length > 0) {
          formData.set('hub', String(managed[0]));
        }
      }

      if (currentUserRole === 'HR' && formState.role !== 'Employee') {
        setError('HR accounts can only create Employee accounts.');
        setLoading(false);
        return;
      }

      await apiClient.post(API_ENDPOINTS.EMPLOYEES, formData);

      setSuccess('Employee created successfully!');
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEES });
      setFormState({ ...initialFormState, createdAt: new Date().toISOString() });
      onCreated?.();
      setTimeout(callClose, 800);
    } catch (err) {
      const axiosError = err as any;
      const errorData = axiosError?.response?.data;
      const acronyms = ['id', 'jtp', 'tin', 'sss', 'pagibig', 'philhealth'];
      const formatFieldLabel = (key: string) => {
        const map: Record<string, string> = { employee_id: 'Employee ID', jtp_code: 'JTP Code' };
        const normalized = key.replace(/\[|\]/g, '').replace(/\./g, '_');
        if (map[normalized]) return map[normalized];
        return normalized.split('_').map((w) => (acronyms.includes(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
      };
      const formatServerErrors = (data: any): string => {
        if (!data) return 'Server error';
        if (typeof data === 'string') return data;
        if (Array.isArray(data)) return data.join('\n');
        if (typeof data === 'object') {
          if (typeof data.detail === 'string') return data.detail;
          if (typeof data.message === 'string') return data.message;
          return Object.entries(data).map(([k, v]) => `${formatFieldLabel(k)}: ${Array.isArray(v) ? (v as string[]).join(', ') : String(v)}`).join('\n');
        }
        return String(data);
      };
      setError(formatServerErrors(errorData ?? axiosError?.message ?? 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  /* ─── render ─── */
  return (
    <div className="w-full">

        <button type="button" onClick={callClose}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
          <ChevronLeft size={15} /> Back
        </button>

        <div className="mb-3 text-center">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Add Employee</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">A cleaner multi-step flow for account, personal, and work information.</p>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            <StepIndicator step={step} />
          </div>
        </div>

        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span className="whitespace-pre-line text-xs">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/30 dark:emerald-300">
            <CheckCircle2 size={15} className="shrink-0" /><span className="text-xs">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">

            {step === 0 && (
              <>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-500">Step 1 of 3</p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Details</h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Set user access, login details, and core account info.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Username {redStar}</label>
                    <div className="relative">
                      <FieldIcon icon={User} />
                      <input name="username" value={formState.username} onChange={handleChange} placeholder="Enter username" required className={iconInputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Role {redStar}</label>
                    <select name="role" value={formState.role} onChange={handleChange} required className={selectCls}>
                      {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {currentUserRole === 'HR' && (
                      <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">HR can only create Employee accounts.</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Access Permission</label>
                    <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                      <input type="checkbox" name="canLogin" checked={formState.canLogin} onChange={handleChange} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Can login</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Password {redStar}</label>
                    <div className="relative">
                      <FieldIcon icon={Lock} />
                      <input type={showPassword ? 'text' : 'password'} name="password" value={formState.password} onChange={handleChange} placeholder="Enter password" required className={iconInputCls + ' pr-9'} />
                      <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Confirm Password {redStar}</label>
                    <div className="relative">
                      <FieldIcon icon={Lock} />
                      <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formState.confirmPassword} onChange={handleChange} placeholder="Confirm password" required className={iconInputCls + ' pr-9'} />
                      <button type="button" onClick={() => setShowConfirmPassword(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirmPassword ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                    {formState.password && formState.confirmPassword && formState.password !== formState.confirmPassword && (
                      <p className="mt-1 text-[11px] text-red-500">Passwords do not match.</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-500">Step 2 of 3</p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Personal Information</h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  {isCreatingHrRole
                    ? 'Provide personal details and assign which delivery center(s) this HR staff will manage.'
                    : 'Please provide personal details and contact information.'}
                </p>

                <div className={isCreatingHrRole ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : ''}>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className={labelCls}>First Name {redStar}</label>
                      <div className="relative"><FieldIcon icon={User} />
                        <input name="firstName" value={formState.firstName} onChange={handleChange} placeholder="First name" required className={iconInputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Middle Initial</label>
                      <input name="middleInitial" value={formState.middleInitial} onChange={handleChange} placeholder="MI" maxLength={3} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Last Name {redStar}</label>
                      <div className="relative"><FieldIcon icon={User} />
                        <input name="lastName" value={formState.lastName} onChange={handleChange} placeholder="Last name" required className={iconInputCls} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Date of Birth {redStar}</label>
                      <div className="relative"><FieldIcon icon={Calendar} />
                        <input type="date" name="dateOfBirth" value={formState.dateOfBirth} onChange={handleChange} required className={iconInputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Place of Birth {redStar}</label>
                      <div className="relative"><FieldIcon icon={MapPin} />
                        <input name="placeOfBirth" value={formState.placeOfBirth} onChange={handleChange} placeholder="Place of birth" required className={iconInputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Gender {redStar}</label>
                      <select name="gender" value={formState.gender} onChange={handleChange} required className={selectCls}>
                        <option value="">Select gender</option>
                        {genders.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Email Address {redStar}</label>
                      <div className="relative"><FieldIcon icon={Mail} />
                        <input
                          type="email"
                          name="email"
                          value={formState.email}
                          onChange={handleChange}
                          onBlur={handleEmailBlur}
                          placeholder="e.g. john.smith (auto @gmail.com)"
                          required
                          className={iconInputCls}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">Auto-completes with @gmail.com on blur if no @ typed</p>
                    </div>
                    <div>
                      <label className={labelCls}>Phone Number {redStar}</label>
                      <div className="relative"><FieldIcon icon={Phone} />
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={11}
                          name="phone"
                          value={formState.phone}
                          onChange={handleChange}
                          placeholder="09XXXXXXXXX (11 digits)"
                          required
                          className={iconInputCls}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        {formState.phone.length}/11 digits {formState.phone.length === 11 ? '✓' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Address heading */}
                  <div className="border-t border-slate-100 pt-2.5 mt-3 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Address Information</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Please provide residential address details.</p>
                  </div>

                  {/* Cascading dropdowns + Auto ZIP in responsive layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className={labelCls}>Region {redStar}</label>
                      <select name="region" value={formState.region} onChange={handleChange} required className={selectCls}>
                        <option value="">Select region</option>
                        {regionsList.map((r: string) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Province {redStar}</label>
                      <select name="province" value={formState.province} onChange={handleChange} required disabled={!formState.region} className={selectCls + (!formState.region ? ' opacity-50 cursor-not-allowed' : '')}>
                        <option value="">Select province</option>
                        {availableProvinces.map((p: string) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>City / Municipality {redStar}</label>
                      <select name="cityMunicipality" value={formState.cityMunicipality} onChange={handleChange} required disabled={!formState.province} className={selectCls + (!formState.province ? ' opacity-50 cursor-not-allowed' : '')}>
                        <option value="">Select city/municipality</option>
                        {availableCities.map((c: string) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Barangay {redStar}</label>
                      <select name="barangay" value={formState.barangay} onChange={handleChange} required disabled={!formState.cityMunicipality} className={selectCls + (!formState.cityMunicipality ? ' opacity-50 cursor-not-allowed' : '')}>
                        <option value="">Select barangay</option>
                        {availableBarangays.map((b: string) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="md:col-span-2">
                      <label className={labelCls}>
                        ZIP / Postal Code <span className="text-[10px] font-normal text-blue-500">(Auto-filled)</span>
                      </label>
                      <div className="relative">
                        <FieldIcon icon={Hash} />
                        <input
                          name="zipCode"
                          value={formState.zipCode}
                          readOnly
                          placeholder="Auto-populated from address"
                          className={iconInputCls + ' bg-slate-100/80 dark:bg-slate-900/80 font-mono font-medium text-slate-700 dark:text-slate-300 cursor-not-allowed border-dashed'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact heading */}
                  <div className="border-t border-slate-100 pt-2.5 mt-3 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Emergency Contact</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Please provide emergency contact information.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Contact Name {redStar}</label>
                      <div className="relative"><FieldIcon icon={User} />
                        <input name="emergencyContactName" value={formState.emergencyContactName} onChange={handleChange} placeholder="Contact name" required className={iconInputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Contact Number {redStar}</label>
                      <div className="relative"><FieldIcon icon={Phone} />
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={11}
                          name="emergencyContactPhone"
                          value={formState.emergencyContactPhone}
                          onChange={handleChange}
                          placeholder="09XXXXXXXXX (11 digits)"
                          required
                          className={iconInputCls}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        {formState.emergencyContactPhone.length}/11 digits {formState.emergencyContactPhone.length === 11 ? '✓' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {isCreatingHrRole && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                    <div className="mb-3">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delivery Center Assignment</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Assign the delivery center(s) this HR staff will manage.</p>
                    </div>

                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-100/50 px-3 py-2 dark:border-blue-800/50 dark:bg-blue-900/20">
                      <Info size={14} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <p className="text-[11px] text-blue-800 dark:text-blue-200">
                        This determines which delivery center(s) the HR staff can access and manage. They will only manage employees registered under the selected delivery center(s).
                      </p>
                    </div>

                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Access Type</p>
                    <div className="mb-4 space-y-2">
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                        <input
                          type="radio"
                          name="accessType"
                          checked={formState.accessType === 'Single'}
                          onChange={() => handleAccessTypeChange('Single')}
                          className="mt-0.5 h-3.5 w-3.5 border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Single Delivery Center Access</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">HR can manage and access only the assigned delivery center.</p>
                        </div>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                        <input
                          type="radio"
                          name="accessType"
                          checked={formState.accessType === 'Multiple'}
                          onChange={() => handleAccessTypeChange('Multiple')}
                          className="mt-0.5 h-3.5 w-3.5 border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Multiple Delivery Center Access</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">HR can manage and access multiple delivery centers.</p>
                        </div>
                      </label>
                    </div>

                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Select Delivery Center {redStar}
                    </p>
                    <div className="relative mb-2">
                      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={hubSearch}
                        onChange={(e) => setHubSearch(e.target.value)}
                        placeholder="Search delivery center..."
                        className={iconInputCls}
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                      {filteredAssignmentHubs.length > 0 ? (
                        filteredAssignmentHubs.map((hub) => {
                          const checked = formState.managedHubs.includes(hub.id);
                          return (
                            <label
                              key={hub.id}
                              className="flex cursor-pointer items-center gap-2.5 border-b border-slate-100 px-3 py-2.5 last:border-b-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleCheckboxChange(hub.id)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <Building2 size={14} className="shrink-0 text-blue-500" />
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{hub.name}</span>
                            </label>
                          );
                        })
                      ) : (
                        <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">No delivery centers found.</p>
                      )}
                    </div>

                    <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                      {formState.accessType === 'Single'
                        ? 'Select one delivery center for this HR staff.'
                        : 'You can select multiple delivery centers if needed.'}
                    </p>
                    {formState.managedHubs.length === 0 && (
                      <p className="mt-1 text-[10px] text-red-500">Please select at least one delivery center.</p>
                    )}
                  </div>
                )}
                </div>
              </>
            )}

            {/* ════ STEP 2 – Employment ════ */}
            {step === 2 && (
              <>
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-500">Step 3 of 3</p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Employment Information</h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Assign position, delivery center, IDs, and payroll details.</p>

                <div className="space-y-3">
                  {/* Work Assignment in 4 columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className={labelCls}>Position {redStar}</label>
                      <select name="position" value={formState.position} onChange={handleChange} required className={selectCls}>
                        <option value="">Select position</option>
                        {positions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Employment Type {redStar}</label>
                      <select name="employmentType" value={formState.employmentType} onChange={handleChange} required className={selectCls}>
                        <option value="">Select employment type</option>
                        {employmentTypes.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Delivery Center {redStar}</label>
                      <div className="relative"><FieldIcon icon={Building2} />
                        <select
                          name="hub"
                          value={isCreatingHrRole && formState.managedHubs[0] ? String(formState.managedHubs[0]) : formState.hub}
                          onChange={handleChange}
                          required
                          disabled={isCreatingHrRole}
                          className={iconSelectCls + (isCreatingHrRole ? ' opacity-70 cursor-not-allowed' : '')}
                        >
                          <option value="">Select delivery center</option>
                          {(isCreatingHrRole
                            ? allHubs.filter((h) => formState.managedHubs.includes(h.id))
                            : selectableHubs
                          ).map((h: HubOption) => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                      </div>
                      {isCreatingHrRole && (
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Delivery Center is set from Delivery Center Assignment in Step 2.</p>
                      )}
                      {currentUserRole === 'HR' && (
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Only delivery centers you manage are available.</p>
                      )}
                    </div>
                    <div>
                      <label className={labelCls}>Hire Date {redStar}</label>
                      <div className="relative"><FieldIcon icon={Calendar} />
                        <input type="date" name="hireDate" value={formState.hireDate} onChange={handleChange} required className={iconInputCls} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Employee ID</label>
                      <div className="relative"><FieldIcon icon={User} />
                        <input name="employeeId" value={formState.employeeId} onChange={handleChange} placeholder="Enter employee ID" className={iconInputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>JTP Code</label>
                      <div className="relative"><FieldIcon icon={Hash} />
                        <input name="jtpCode" value={formState.jtpCode} onChange={handleChange} placeholder="Enter JTP code" className={iconInputCls} />
                      </div>
                    </div>
                  </div>

                  {/* Government Information heading */}
                  <div className="border-t border-slate-100 pt-2.5 mt-3 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Government Information</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Provide government IDs and compliance details.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className={labelCls}>TIN</label>
                      <div className="relative"><FieldIcon icon={CreditCard} />
                        <input name="tin" value={formState.tin} onChange={handleChange} placeholder="Enter TIN" className={iconInputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>SSS</label>
                      <div className="relative"><FieldIcon icon={ShieldCheck} />
                        <input name="sss" value={formState.sss} onChange={handleChange} placeholder="Enter SSS" className={iconInputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>PhilHealth</label>
                      <div className="relative"><FieldIcon icon={ShieldCheck} />
                        <input name="philHealth" value={formState.philHealth} onChange={handleChange} placeholder="Enter PhilHealth" className={iconInputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Pag-IBIG</label>
                      <div className="relative"><FieldIcon icon={ShieldCheck} />
                        <input name="pagIbig" value={formState.pagIbig} onChange={handleChange} placeholder="Enter Pag-IBIG" className={iconInputCls} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation inside card */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {step > 0 ? (
                <button type="button" onClick={goBack}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                  <ChevronLeft size={14} /> Previous
                </button>
              ) : <div />}

              <button type="submit" disabled={!canProceed}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {isLastStep ? (
                  loading ? (
                    <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Creating…</>
                  ) : (
                    <><User size={13} /> Create Employee</>
                  )
                ) : (
                  <>Continue <ArrowRight size={13} /></>
                )}
              </button>
            </div>

          </div>
        </form>
    </div>
  );
};