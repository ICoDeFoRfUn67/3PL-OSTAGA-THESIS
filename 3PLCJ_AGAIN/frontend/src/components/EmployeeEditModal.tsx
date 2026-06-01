import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Employee, FieldDefinition } from '@/types';
import { useCreateEditRequest, useUpdateEmployee, useGetHubs } from '@/hooks/useQueries';
import { normalizeApiResponse } from '@/utils/apiResponseHandler';
import { Modal } from './Modal';

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
  { name: 'current_address', label: 'Current Address', type: 'textarea' },
  { name: 'permanent_address', label: 'Permanent Address', type: 'textarea' },
  { name: 'emergency_contact_name', label: 'Emergency Contact Name', type: 'text' },
  { name: 'emergency_contact_phone', label: 'Emergency Contact Phone', type: 'text' },
  { name: 'status', label: 'Employment Status', type: 'select', options: [{ value: 'Active', label: 'Active' }, { value: 'Resign', label: 'Resign' }, { value: 'AWOL', label: 'AWOL' }, { value: 'Blacklist', label: 'Blacklist' }] },
  { name: 'employment_type', label: 'Employment Type', type: 'select', options: [{ value: 'Full-time', label: 'Full-time' }, { value: 'OCW', label: 'OCW' }] },
  { name: 'position', label: 'Position', type: 'text', required: true },
  { name: 'employee_id', label: 'Employee ID', type: 'text', required: true },
  { name: 'hub', label: 'Hub Location', type: 'select', options: [] },
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
  
  const createMutation = useCreateEditRequest();
  const updateMutation = useUpdateEmployee(employee?.id || 0);
  const { data: hubsData } = useGetHubs();
  
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
      setFormData(initialData);
      setErrors({});
      setProfileFile(null);
      setPreviewUrl(employee.profile_image_url || employee.profile_image || null);
    }
  }, [employee]);
  
  const handleChange = (name: string, value: any) => {
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

        await updateMutation.mutateAsync(payload as any);
        toast.success('Profile changes saved successfully');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit changes');
    }
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    setProfileFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
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
      case 'select':
        let options = field.options || [];
        if (field.name === 'hub') {
          options = hubsList.map((h: any) => ({ value: String(h.id), label: h.name }));
        }
        return (
          <select value={value} onChange={(e) => handleChange(field.name, e.target.value)} className={baseInputClass}>
            <option value="">Select {field.label}</option>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        );
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
  const contactFields = ['email_address', 'phone_number', 'current_address', 'permanent_address'];
  const emergencyFields = ['emergency_contact_name', 'emergency_contact_phone'];
  const employmentFields = ['status', 'employment_type', 'position', 'employee_id', 'hub'];
  const governmentFields = ['tin', 'sss', 'philhealth', 'pagibig'];
  
  const renderFieldSection = (title: string, fields: string[]) => (
    <div className="mb-8">
      <h4 className="text-sm sm:text-sm md:text-base font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-3">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {title === 'Personal Information' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">Profile Picture</label>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-0.5">
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                )}
              </div>

              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <p className="text-xs text-gray-500 mt-1">Max size 5MB. JPG/PNG recommended.</p>
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
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="w-full sm:w-auto px-4 py-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium" disabled={isPending}>Cancel</button>
        <button onClick={handleSubmit} disabled={isPending} className="w-full sm:w-auto px-4 py-3 rounded-lg bg-[#8B0000] text-white hover:bg-[#6B0000] transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
          {isPending && <Loader2 size={16} className="animate-spin" />}
          {isPending ? 'Submitting...' : isCriticalChanged ? 'Send Edit Request' : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
};

export default EmployeeEditModal;