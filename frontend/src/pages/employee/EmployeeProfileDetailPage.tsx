import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Badge, LoadingSpinner } from '@/components/common';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Edit2, Save, X, Clock, Send, ArrowLeft, Key } from 'lucide-react';
import { EditInfoRequestModal } from '@/components/EditInfoRequestModal';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';
import apiClient from '@/api/apiService';
import Sidebar from '@/components/Sidebar';
import { ThemeToggle } from '@/context/ThemeContext';
import { useGetHubs } from '@/hooks/useQueries';

interface EmployeeData {
  id: number;
  firstname: string;
  lastname: string;
  middle_initial: string;
  place_of_birth: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  marital_status: string;
  email_address: string;
  phone_number: string;
  current_address: string;
  permanent_address: string;
  position: string;
  employment_type: string;
  status: string;
  role: string;
  hub: number;
  hub_name: string;
  hired_date: string;
  jtp_code: string;
  employee_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  tin: string;
  sss: string;
  philhealth: string;
  pagibig: string;
  profile_image: string;
  profile_image_url: string;
  documents: any[];
  can_login: boolean;
  can_edit_info: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  full_name: string;
  attendance_history?: any[];
}

const FIELD_CONFIG = {
  firstname: { label: 'First Name', type: 'text' },
  lastname: { label: 'Last Name', type: 'text' },
  middle_initial: { label: 'Middle Initial', type: 'text' },
  place_of_birth: { label: 'Place of Birth', type: 'text' },
  date_of_birth: { label: 'Date of Birth', type: 'date' },
  email_address: { label: 'Email Address', type: 'email' },
  phone_number: { label: 'Phone Number', type: 'tel' },
  current_address: { label: 'Current Address', type: 'textarea' },
  permanent_address: { label: 'Permanent Address', type: 'textarea' },
  hired_date: { label: 'Hired Date', type: 'date' },
  jtp_code: { label: 'JTP Code', type: 'text' },
  employee_id: { label: 'Employee ID', type: 'text' },
  emergency_contact_name: { label: 'Emergency Contact Name', type: 'text' },
  emergency_contact_phone: { label: 'Emergency Contact Phone', type: 'tel' },
  tin: { label: 'TIN', type: 'text' },
  sss: { label: 'SSS', type: 'text' },
  philhealth: { label: 'Philhealth', type: 'text' },
  pagibig: { label: 'Pagibig', type: 'text' },
  gender: { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  nationality: { label: 'Nationality', type: 'select', options: ['Filipino', 'Foreign'] },
  marital_status: { label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
  position: { label: 'Position', type: 'text' },
  employment_type: { label: 'Employment Type', type: 'select', options: ['Full-time', 'OCW'] },
  status: { label: 'Status', type: 'select', options: ['Active', 'Resign', 'AWOL', 'Blacklist'] },
  hub: { label: 'Hub', type: 'select', options: [] },
  role: { label: 'Role', type: 'select', options: ['Employee', 'HR', 'Admin'] },
  can_login: { label: 'Can Login', type: 'checkbox' },
  can_edit_info: { label: 'Can Edit Info', type: 'checkbox' },
  is_active: { label: 'Is Active', type: 'checkbox' },
};

export const EmployeeProfileDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  const { employee: currentEmployee } = useAuth();
  
  const showAdminSidebar = location.pathname.startsWith('/admin') || location.pathname.startsWith('/hr');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EmployeeData>>({});
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [latestAttendance, setLatestAttendance] = useState<any>(null);
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isOwnProfile = currentEmployee?.id === Number(id);
  const { isAdmin, isHR, canEditEmployeeInfo } = useAuth();
  const isHRorAdmin = isAdmin || isHR;

  const { data: hubsData } = useGetHubs();
  const hubOptions = (hubsData?.results || hubsData || []).map((h: any) => ({ value: h.id, label: h.name || h.hub_name || h.city || String(h.id) }));
  
  // HR can only edit if they have the permission
  const canEdit = isAdmin || (isHR && canEditEmployeeInfo) || isOwnProfile;

  useEffect(() => {
    if (id) {
      const fetchEmployee = async () => {
        try {
          setIsLoading(true);
          setHasError(false);
          const res = await apiClient.get(`/employees/${id}/`);
          setFormData(res.data);
        } catch (err) {
          console.error('Error fetching employee:', err);
          error('Failed to fetch employee details');
          setHasError(true);
        } finally {
          setIsLoading(false);
        }
      };

      const fetchLatestAttendance = async () => {
        try {
          const response = await apiClient.get(`/attendance/?employee_id=${id}&limit=1`);
          if (response.data?.results && response.data.results.length > 0) {
            setLatestAttendance(response.data.results[0]);
          }
        } catch (err) {
          console.error('Error fetching attendance:', err);
        }
      };

      fetchEmployee();
      fetchLatestAttendance();
    }
  }, [id, error]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    try {
      const updateData: any = {};
      const editableFields = [
        'firstname', 'lastname', 'middle_initial', 'place_of_birth', 'date_of_birth',
        'gender', 'nationality', 'marital_status', 'email_address', 'phone_number',
        'current_address', 'permanent_address', 'position', 'employment_type',
        'status', 'role', 'hub', 'hired_date', 'jtp_code', 'employee_id',
        'emergency_contact_name', 'emergency_contact_phone', 'tin', 'sss',
        'philhealth', 'pagibig', 'can_login', 'can_edit_info'
      ];

      editableFields.forEach(key => {
        const value = (formData as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          updateData[key] = value;
        }
      });

      if (profileImage) {
        const formDataObj = new FormData();
        Object.entries(updateData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formDataObj.append(key, String(value));
          }
        });
        formDataObj.append('profile_image', profileImage);
        await apiClient.patch(`/employees/${id}/`, formDataObj);
      } else {
        await apiClient.patch(`/employees/${id}/`, updateData);
      }

      if (attachments.length > 0) {
        for (const file of attachments) {
          const attachFormData = new FormData();
          attachFormData.append('file', file);
          attachFormData.append('employee', id || '');
          await apiClient.post('/employee-documents/', attachFormData);
        }
      }

      success('Employee details saved successfully');
      setIsEditing(false);
      setProfileImage(null);
      setAttachments([]);

      const updatedData = await apiClient.get(`/employees/${id}/`);
      setFormData(updatedData.data);
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to save employee details');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0F1729]">
      {showAdminSidebar && (
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}
      <div className={`p-4 md:p-6 lg:p-8 space-y-6 ${showAdminSidebar ? 'lg:ml-64' : ''}`}>
        {/* Top bar: Back + Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)} className="text-sm">
            <ArrowLeft size={18} className="mr-2" /> Back
          </Button>

          {!isLoading && !hasError && (
            <div className="flex flex-wrap gap-2">
              {isOwnProfile && (
                <Button variant="secondary" onClick={() => setShowChangePasswordModal(true)} className="text-xs md:text-sm">
                  <Key size={16} className="mr-2" /> Password
                </Button>
              )}
              
              {isOwnProfile && !isEditing && !isHRorAdmin && (
                <Button variant="secondary" onClick={() => setShowEditRequestModal(true)} className="text-xs md:text-sm">
                  <Send size={16} className="mr-2" /> Request Changes
                </Button>
              )}
              
              {canEdit && (
                <>
                  {!isEditing ? (
                    <Button variant="primary" onClick={() => setIsEditing(true)} className="text-xs md:text-sm">
                      <Edit2 size={16} className="mr-2" /> Edit
                    </Button>
                  ) : (
                    <>
                      <Button variant="primary" onClick={handleSave} className="text-xs md:text-sm">
                        <Save size={16} className="mr-2" /> Save
                      </Button>
                      <Button variant="secondary" onClick={() => setIsEditing(false)} className="text-xs md:text-sm">
                        <X size={16} className="mr-2" /> Cancel
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {hasError && (
          <Card>
            <div className="text-center text-red-600 dark:text-red-400">
              <p>Failed to load employee details. Please try again.</p>
              <Button variant="secondary" onClick={() => window.location.reload()} className="mt-4">
                Reload Page
              </Button>
            </div>
          </Card>
        )}

        {!isLoading && !hasError && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column — sticky profile card */}
              <div className="lg:col-span-1 space-y-6 lg:self-start lg:sticky lg:top-8">
                <Card className="overflow-hidden border-none shadow-md dark:shadow-lg dark:shadow-black/50">
                  <div className="relative group aspect-square bg-gray-100 dark:bg-gray-800">
                    {formData.profile_image_url ? (
                      <img src={formData.profile_image_url} alt={formData.full_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 font-black uppercase tracking-widest text-xs">No Image</span>
                      </div>
                    )}
                    {isEditing && (
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                        <Upload size={32} className="mb-2" />
                        <span className="text-xs font-black uppercase tracking-widest">Update Photo</span>
                        <input type="file" accept="image/*" onChange={handleProfileImageChange} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div className="p-5 md:p-6 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
                    <div className="mb-4">
                      <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tight">
                        {formData.full_name}
                      </h2>
                      <p className="text-xs md:text-sm font-bold text-red-600 dark:text-red-500 uppercase tracking-widest mt-2">
                        {formData.position}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mb-4 border-t dark:border-gray-800 pt-4">
                      <Badge variant={formData.status?.toLowerCase() === 'active' ? 'success' : formData.status?.toLowerCase() === 'resign' ? 'neutral' : formData.status?.toLowerCase() === 'awol' ? 'orange' : 'error'} className="font-black tracking-widest uppercase text-xs px-3">
                        {formData.status}
                      </Badge>
                      <span className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">#{formData.employee_id}</span>
                    </div>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-2">Company Role</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{formData.role}</p>
                  </div>
                </Card>

                {latestAttendance && (
                  <Card className="border-l-4 border-red-600">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock size={16} className="text-red-600 flex-shrink-0" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Latest Session</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs gap-2">
                        <span className="text-gray-600 dark:text-gray-400 font-bold uppercase">Status</span>
                        <Badge variant={latestAttendance.status === 'Present' ? 'success' : 'warning'} className="text-xs">{latestAttendance.status}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs gap-2">
                        <span className="text-gray-600 dark:text-gray-400 font-bold uppercase">Date</span>
                        <span className="font-black dark:text-white text-gray-900">{latestAttendance.date}</span>
                      </div>
                      <div className="pt-3 grid grid-cols-2 gap-3 border-t dark:border-gray-800">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase mb-1">Clock In</p>
                          <p className="text-sm font-black text-green-600 dark:text-green-500">{latestAttendance.clock_in_time || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-bold uppercase mb-1">Clock Out</p>
                          <p className="text-sm font-black text-red-600 dark:text-red-500">{latestAttendance.clock_out_time || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-2 space-y-5">
                <Card>
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.15em] text-red-600 dark:text-red-500 mb-6 flex items-center gap-3">
                    <span className="w-6 h-0.5 bg-red-600 dark:bg-red-500"></span> Personal Records
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['firstname', 'lastname', 'middle_initial', 'place_of_birth', 'date_of_birth', 'gender', 'nationality', 'marital_status'].map(field => (
                      <FormField key={field} field={field} value={(formData as any)[field] || ''} config={(FIELD_CONFIG as any)[field]} isEditing={isEditing} onChange={handleFieldChange} />
                    ))}
                  </div>
                </Card>

                <Card>
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.15em] text-red-600 dark:text-red-500 mb-6 flex items-center gap-3">
                    <span className="w-6 h-0.5 bg-red-600 dark:bg-red-500"></span> Contact Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['email_address', 'phone_number', 'current_address', 'permanent_address'].map(field => (
                      <FormField key={field} field={field} value={(formData as any)[field] || ''} config={(FIELD_CONFIG as any)[field]} isEditing={isEditing} onChange={handleFieldChange} />
                    ))}
                  </div>
                </Card>

                <Card>
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.15em] text-red-600 dark:text-red-500 mb-6 flex items-center gap-3">
                    <span className="w-6 h-0.5 bg-red-600 dark:bg-red-500"></span> Employment Scope
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['position', 'employment_type', 'status', 'role', 'hired_date', 'jtp_code', 'employee_id', 'hub'].map(field => {
                      const baseConfig = (FIELD_CONFIG as any)[field] || {};
                      const config = { ...baseConfig };
                      if (['employee_id', 'hub', 'status'].includes(field) && !isHRorAdmin) {
                        config.disabled = true;
                      }
                      if (field === 'hub') {
                        config.options = hubOptions;
                      }
                      return (
                        <FormField key={field} field={field} value={(formData as any)[field] ?? ''} config={config} isEditing={isEditing} onChange={handleFieldChange} />
                      );
                    })}
                  </div>
                </Card>

                <Card>
                  <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.15em] text-red-600 dark:text-red-500 mb-6 flex items-center gap-3">
                    <span className="w-6 h-0.5 bg-red-600 dark:bg-red-500"></span> Statutory IDs
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['tin', 'sss', 'philhealth', 'pagibig'].map(field => (
                      <FormField key={field} field={field} value={(formData as any)[field] || ''} config={(FIELD_CONFIG as any)[field]} isEditing={isEditing} onChange={handleFieldChange} />
                    ))}
                  </div>
                </Card>
              </div>
            </div>
        )}
      </div>

      <EditInfoRequestModal
        employeeId={Number(id)}
        isOpen={showEditRequestModal}
        onClose={() => setShowEditRequestModal(false)}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />
    </div>
  );
};

interface FormFieldProps {
  field: string;
  value: any;
  config: any;
  isEditing: boolean;
  onChange: (field: string, value: any) => void;
}

const FormField = ({ field, value, config, isEditing, onChange }: FormFieldProps) => {
  if (!config) return null;
  const { label, type, options, disabled } = config;

  return (
    <div className="space-y-2">
      <label className="block text-xs md:text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {!isEditing || (disabled && isEditing) ? (
        <div className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800/70 rounded-lg border border-gray-200 dark:border-gray-700">
          {type === 'checkbox' ? (
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${value ? 'bg-red-600 border-red-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
              {value && <X size={10} className="text-white" />}
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{value || '—'}</p>
          )}
        </div>
      ) : (
        <div className="relative group">
          {type === 'text' || type === 'email' || type === 'tel' || type === 'date' ? (
            <input
              type={type}
              value={value || ''}
              onChange={e => onChange(field, e.target.value)}
              placeholder={label}
              aria-label={label}
              className="w-full px-4 py-2.5 text-sm font-semibold border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
            />
          ) : type === 'textarea' ? (
            <textarea
              value={value || ''}
              onChange={e => onChange(field, e.target.value)}
              placeholder={label}
              aria-label={label}
              className="w-full px-4 py-2.5 text-sm font-semibold border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all"
              rows={2}
            />
          ) : type === 'select' ? (
            <select
              value={value ?? ''}
              onChange={e => {
                const val = e.target.value;
                if (field === 'hub') onChange(field, val === '' ? '' : Number(val));
                else onChange(field, val);
              }}
              aria-label={label}
              title={label}
              className="w-full px-4 py-2.5 text-sm font-semibold border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none appearance-none transition-all"
            >
              <option value="">{label}</option>
              {options && options.map((opt: any) => (
                typeof opt === 'object' ? (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ) : (
                  <option key={opt} value={opt}>{opt}</option>
                )
              ))}
            </select>
          ) : type === 'checkbox' ? (
            <input
              type="checkbox"
              checked={value || false}
              onChange={e => onChange(field, e.target.checked)}
              aria-label={label}
              title={label}
              className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-600 cursor-pointer"
            />
          ) : null}
        </div>
      )}
    </div>
  );
};
