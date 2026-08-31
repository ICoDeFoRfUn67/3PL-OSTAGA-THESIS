import { useState, useEffect, useRef } from 'react';
import { Loader2, User, Phone, Briefcase, Shield, AlertTriangle, Upload, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Employee, FieldDefinition } from '@/types';
import { useCreateEditRequest, useUpdateEmployee, useGetHubs, useUploadDocument } from '@/hooks/useQueries';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { Modal } from './Modal';
import { getPhilippineZipCode } from '@/utils/philippineZipCodes';
import * as phil from 'phil-reg-prov-mun-brgy';

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess?: () => void;
}

const FIELD_DEFINITIONS: FieldDefinition[] = [
  { name: 'firstname', label: 'First Name', type: 'text', required: true },
  { name: 'lastname', label: 'Last Name', type: 'text', required: true },
  { name: 'middle_initial', label: 'Middle Initial', type: 'text' },
  { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { name: 'place_of_birth', label: 'Place of Birth', type: 'text' },
  { name: 'gender', label: 'Gender', type: 'select', options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }] },
  { name: 'nationality', label: 'Nationality', type: 'text' },
  { name: 'marital_status', label: 'Marital Status', type: 'select', options: [{ value: 'Single', label: 'Single' }, { value: 'Married', label: 'Married' }, { value: 'Divorced', label: 'Divorced' }, { value: 'Widowed', label: 'Widowed' }] },
  { name: 'email_address', label: 'Email Address', type: 'email' },
  { name: 'phone_number', label: 'Phone Number', type: 'text' },
  // Legacy free-text address fields removed. Use structured address UI below.
  { name: 'emergency_contact_name', label: 'Emergency Contact Name', type: 'text' },
  { name: 'emergency_contact_phone', label: 'Emergency Contact Phone', type: 'text' },
  { name: 'status', label: 'Employment Status', type: 'select', options: [{ value: 'Active', label: 'Active' }, { value: 'Resign', label: 'Resign' }, { value: 'AWOL', label: 'AWOL' }, { value: 'Blacklist', label: 'Blacklist' }] },
  { name: 'employment_type', label: 'Employment Type', type: 'select', options: [{ value: 'Full-time', label: 'Full-time' }, { value: 'OCW', label: 'OCW' }] },
  { name: 'position', label: 'Position', type: 'text', required: true },
  { name: 'employee_id', label: 'Employee ID', type: 'text', required: true },
  { name: 'hub', label: 'Delivery Center Location', type: 'select', options: [] },
  { name: 'tin', label: 'TIN', type: 'text' },
  { name: 'sss', label: 'SSS', type: 'text' },
  { name: 'philhealth', label: 'PhilHealth', type: 'text' },
  { name: 'pagibig', label: 'Pag-IBIG', type: 'text' },
];

const CRITICAL_FIELDS = ['position', 'employment_type', 'status', 'employee_id', 'hub'];

export const EmployeeEditModal = ({ isOpen, onClose, employee, onSuccess }: EmployeeEditModalProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const regionsList = phil.regions.map(r => r.name);
  const selectedRegionCode = phil.regions.find(r => r.name === formData.region)?.reg_code;
  const availableProvinces = selectedRegionCode ? phil.getProvincesByRegion(selectedRegionCode).map(p => p.name) : [];
  
  const selectedProvinceCode = selectedRegionCode ? phil.getProvincesByRegion(selectedRegionCode).find(p => p.name === formData.province)?.prov_code : undefined;
  const availableCities = selectedProvinceCode ? phil.getCityMunByProvince(selectedProvinceCode).map(c => c.name) : [];
  
  const selectedCityCode = selectedProvinceCode ? phil.getCityMunByProvince(selectedProvinceCode).find(c => c.name === formData.city_municipality)?.mun_code : undefined;
  const availableBarangays = selectedCityCode ? phil.getBarangayByMun(selectedCityCode).map(b => b.name) : [];
  
  const createMutation = useCreateEditRequest();
  const updateMutation = useUpdateEmployee(employee?.id || 0);
  const { data: hubsData } = useGetHubs();
  const uploadMutation = useUploadDocument();

  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  
  const hubsList = normalizeApiResponse(hubsData) || [];
  
  useEffect(() => {
    if (employee) {
      const initialData: Record<string, any> = {};
      FIELD_DEFINITIONS.forEach((field) => {
        if (field.name === 'hub') {
          const rawHub = employee.hub;
          initialData['hub'] = rawHub && typeof rawHub === 'object' ? (rawHub as any).id : (rawHub ?? '');
        } else {
          initialData[field.name] = employee[field.name as keyof Employee] ?? '';
        }
      });
      // initialize structured address fields
      initialData['region'] = (employee as any).region ?? '';
      initialData['province'] = (employee as any).province ?? '';
      initialData['city_municipality'] = (employee as any).city_municipality ?? '';
      initialData['barangay'] = (employee as any).barangay ?? '';
      initialData['zip_code'] = (employee as any).zip_code || getPhilippineZipCode((employee as any).city_municipality, (employee as any).province);
      setFormData(initialData);
      setErrors({});
      setProfileFile(null);
      setPreviewUrl(employee.profile_image_url || employee.profile_image || null);
    }
  }, [employee]);
  
  const handleChange = (name: string, value: any) => {
    // 11 digits enforcement
    if (name === 'phone_number' || name === 'emergency_contact_phone') {
      value = String(value).replace(/\D/g, '').slice(0, 11);
    }

    if (name === 'region') {
      setFormData((prev) => ({
        ...prev,
        region: value,
        province: '',
        city_municipality: '',
        barangay: '',
        zip_code: '',
      }));
      return;
    }
    if (name === 'province') {
      const autoZip = getPhilippineZipCode('', value);
      setFormData((prev) => ({
        ...prev,
        province: value,
        city_municipality: '',
        barangay: '',
        zip_code: autoZip,
      }));
      return;
    }
    if (name === 'city_municipality') {
      const autoZip = getPhilippineZipCode(value, formData['province']);
      setFormData((prev) => ({
        ...prev,
        city_municipality: value,
        barangay: '',
        zip_code: autoZip,
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    FIELD_DEFINITIONS.forEach((field) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getChangedFields = () => {
    const requested_data: Record<string, any> = {};
    Object.keys(formData).forEach((key) => {
      const newVal = formData[key];
      const oldVal = employee ? employee[key as keyof Employee] : undefined;
      const oldCompareVal = (key === 'hub' && oldVal && typeof oldVal === 'object') 
        ? (oldVal as any).id 
        : oldVal;

      const newStr = newVal === undefined || newVal === null ? '' : String(newVal).trim();
      const oldStr = oldCompareVal === undefined || oldCompareVal === null ? '' : String(oldCompareVal).trim();
      
      if (newStr !== oldStr) {
        if (key === 'hub') {
          requested_data[key] = newVal ? Number(newVal) : null;
        } else {
          requested_data[key] = newVal;
        }
      }
    });
    return requested_data;
  };

  const changedFields = getChangedFields();
  
  const isCriticalChanged = CRITICAL_FIELDS.some((field) => {
    const newVal = formData[field];
    const oldVal = employee ? employee[field as keyof Employee] : undefined;
    const oldCompareVal = (field === 'hub' && oldVal && typeof oldVal === 'object') 
      ? (oldVal as any).id 
      : oldVal;

    const newStr = newVal === undefined || newVal === null ? '' : String(newVal).trim();
    const oldStr = oldCompareVal === undefined || oldCompareVal === null ? '' : String(oldCompareVal).trim();
    return newStr !== oldStr;
  });
  
  const handleSubmit = async () => {
    if (!employee || !validate()) return;
    try {
      console.log('handleSubmit triggered. changedFields:', changedFields);
      console.log('isCriticalChanged:', isCriticalChanged);
      console.log('profileFile:', profileFile);

      if (Object.keys(changedFields).length === 0 && !profileFile) {
        toast('No changes to submit');
        return;
      }

      if (isCriticalChanged) {
        const payload = new FormData();
        payload.append('employee', String(employee.id));
        payload.append('requested_data', JSON.stringify(changedFields));
        if (profileFile) {
          payload.append('uploaded_files', profileFile, profileFile.name);
        }

        console.log('Submitting Critical Edit Request...');
        await createMutation.mutateAsync(payload as any);
        toast.success('Edit request submitted for approval');
      } else {
        const payload = new FormData();
        Object.entries(changedFields).forEach(([k, v]) => {
          payload.append(k, String(v));
        });
        if (profileFile) {
          payload.append('profile_image', profileFile, profileFile.name);
        }

        console.log('Submitting direct PATCH update...', Array.from((payload as any).entries()));
        await updateMutation.mutateAsync(payload as any);
        toast.success('Profile changes saved successfully');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('handleSubmit error:', error);
      console.error('error response data:', error.response?.data);
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to submit changes');
    }
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    setProfileFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDocFileChange = (file?: File) => {
    setDocFile(file || null);
  };

  const handleDocUpload = async () => {
    if (!employee) return;
    if (!docFile) {
      toast.error('Please choose a document to upload');
      return;
    }

    if (docFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setDocUploading(true);
    try {
      // Submit as an edit request so admin/HR must approve it
      const payload = new FormData();
      payload.append('employee', String(employee.id));
      payload.append('requested_data', JSON.stringify({
        document_upload: true,
        file_name: docFile.name,
      }));
      payload.append('uploaded_files', docFile, docFile.name);

      await createMutation.mutateAsync(payload as any);
      toast.success('Document upload request submitted for approval');
      onSuccess?.();
      setDocFile(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit document upload request');
    } finally {
      setDocUploading(false);
    }
  };
  
  const renderField = (field: FieldDefinition) => {
    const value = formData[field.name] ?? '';
    const error = errors[field.name];
    const baseInputClass = `w-full px-4 py-3 rounded-lg border ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'} text-gray-800 dark:text-gray-100 text-sm sm:text-base placeholder:text-gray-400 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/25 focus:border-[#8B0000] transition-all`;
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return <input type={field.type} value={value} onChange={(e) => handleChange(field.name, e.target.value)} className={baseInputClass} />;
      case 'date':
        return <input type="date" value={value ? value.split('T')[0] : ''} onChange={(e) => handleChange(field.name, e.target.value)} className={baseInputClass} />;
      case 'textarea':
        return <textarea value={value} onChange={(e) => handleChange(field.name, e.target.value)} className={`${baseInputClass} min-h-[80px] resize-y`} />;
      case 'select': {
        let options = field.options || [];
        if (field.name === 'hub') {
          options = hubsList.map((h: any) => ({ value: String(h.id), label: h.name }));
        }
        return (
          <select aria-label={field.label} value={value} onChange={(e) => handleChange(field.name, e.target.value)} className={baseInputClass}>
            <option value="">Select {field.label}</option>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        );
      }
      case 'boolean':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={!!value} onChange={(e) => handleChange(field.name, e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#8B0000]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B0000]"></div>
          </label>
        );
      default:
        return <input type="text" value={value} onChange={(e) => handleChange(field.name, e.target.value)} className={baseInputClass} />;
    }
  };
  
  const personalFields = ['firstname', 'lastname', 'middle_initial', 'date_of_birth', 'place_of_birth', 'gender', 'nationality', 'marital_status'];
  const contactFields = ['email_address', 'phone_number'];
  const emergencyFields = ['emergency_contact_name', 'emergency_contact_phone'];
  const employmentFields = ['status', 'employment_type', 'position', 'employee_id', 'hub'];
  const governmentFields = ['tin', 'sss', 'philhealth', 'pagibig'];
  
  const profileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const sectionIcons: Record<string, React.ReactNode> = {
    'Personal Information': <User size={18} />,
    'Contact Information': <Phone size={18} />,
    'Emergency Contact': <AlertTriangle size={18} />,
    'Employment Details': <Briefcase size={18} />,
    'Government IDs': <Shield size={18} />,
  };

  const renderFieldSection = (title: string, fields: string[]) => (
    <div className="mb-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10 border border-red-200/50 dark:border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
          {sectionIcons[title] || <User size={18} />}
        </div>
        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{title}</h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {title === 'Personal Information' && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Profile Picture</label>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <User size={32} className="text-gray-300 dark:text-gray-500" />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0])} />
                <button type="button" onClick={() => profileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-sm transition-all cursor-pointer">
                  <Upload size={15} className="text-red-500" />
                  Choose Photo
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500">Max 5MB · JPG or PNG</p>
                {profileFile && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ {profileFile.name}</p>}
              </div>
            </div>
          </div>
        )}
        {FIELD_DEFINITIONS.filter(f => fields.includes(f.name)).map((field) => (
          <div key={field.name} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            {renderField(field)}
            {errors[field.name] && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors[field.name]}</p>}
          </div>
        ))}
        {/* Address UI (structured) */}
        {title === 'Contact Information' && (
          <div className="sm:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Region</label>
                <select aria-label="Region" value={formData['region'] ?? ''} onChange={(e) => { handleChange('region', e.target.value); }} className={`w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-sm`}>
                  <option value="">Select region</option>
                  {regionsList.map((r: any) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Province</label>
                <select aria-label="Province" value={formData['province'] ?? ''} onChange={(e) => { handleChange('province', e.target.value); }} disabled={!formData['region']} className={`w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-sm ${!formData['region'] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">Select province</option>
                  {availableProvinces.map((p: any) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">City / Municipality</label>
                <select aria-label="City / Municipality" value={formData['city_municipality'] ?? ''} onChange={(e) => { handleChange('city_municipality', e.target.value); }} disabled={!formData['province']} className={`w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-sm ${!formData['province'] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">Select city/municipality</option>
                  {availableCities.map((c: any) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Barangay</label>
                <select aria-label="Barangay" value={formData['barangay'] ?? ''} onChange={(e) => handleChange('barangay', e.target.value)} disabled={!formData['city_municipality']} className={`w-full px-4 py-3 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-sm ${!formData['city_municipality'] ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <option value="">Select barangay</option>
                  {availableBarangays.map((b: any) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                  ZIP / Postal Code <span className="text-xs text-blue-500 font-normal">(Auto-filled)</span>
                </label>
                <input
                  value={formData['zip_code'] ?? ''}
                  readOnly
                  placeholder="Auto-populated"
                  className="w-full px-4 py-3 rounded-lg border border-dashed border-gray-300 bg-gray-100/80 dark:border-gray-700 dark:bg-gray-900/80 text-sm font-mono font-medium text-gray-700 dark:text-gray-300 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Employee" size="3xl">
      <div className="pr-2 px-2 sm:px-4">
        {renderFieldSection('Personal Information', personalFields)}
        {renderFieldSection('Contact Information', contactFields)}
        {renderFieldSection('Emergency Contact', emergencyFields)}
        {renderFieldSection('Employment Details', employmentFields)}
        {renderFieldSection('Government IDs', governmentFields)}

        <div className="mb-6 rounded-2xl bg-white dark:bg-[#0F172A] border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10 border border-red-200/50 dark:border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
              <FileText size={18} />
            </div>
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Documents</h4>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => handleDocFileChange(e.target.files?.[0])} />
            <button type="button" onClick={() => docInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-sm transition-all cursor-pointer">
              <Upload size={15} className="text-red-500" />
              Choose File
            </button>
            {docFile && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ {docFile.name}</span>}
            <button onClick={handleDocUpload} disabled={docUploading || !docFile} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#6B0000] text-white text-sm font-semibold shadow-sm hover:shadow-md hover:from-[#7A0000] hover:to-[#5A0000] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {docUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {docUploading ? 'Submitting...' : 'Request Upload'}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-5 border-t border-gray-100 dark:border-gray-800">
        <button onClick={onClose} className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-sm font-semibold shadow-sm" disabled={isPending}>Cancel</button>
        <button onClick={handleSubmit} disabled={isPending} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#8B0000] to-[#6B0000] text-white hover:from-[#7A0000] hover:to-[#5A0000] transition-all text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg ring-1 ring-red-900/20">
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {isPending ? 'Submitting...' : isCriticalChanged ? 'Send Edit Request' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
};

export default EmployeeEditModal;