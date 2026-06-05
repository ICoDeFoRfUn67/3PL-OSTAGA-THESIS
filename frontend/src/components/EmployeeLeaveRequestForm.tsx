import { useState, useEffect } from 'react';
import { Card, Button, ErrorMessage } from '@/components/common';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { apiUrl } from '@/constants/api';
import { FileText } from 'lucide-react';

type LeaveRequestPayload = {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
};

type Props = {
  showHeader?: boolean;
  onCancel?: () => void;
};

export const EmployeeLeaveRequestForm = ({ showHeader = true, onCancel }: Props) => {
  const { success, error } = useToast();

  const [step, setStep] = useState(1);

  const [payload, setPayload] = useState<LeaveRequestPayload>({
    leave_type: 'Sick Leave',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const [customLeaveType, setCustomLeaveType] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const token = localStorage.getItem('access_token');
  const { employee } = useAuth();

  const steps = [
    { id: 1, label: 'Leave Details' },
    { id: 2, label: 'Reason & Proof' },
    { id: 3, label: 'Review' },
  ];

  const onChange = (key: keyof LeaveRequestPayload, value: string) => {
    setPayload((p) => ({ ...p, [key]: value }));
    setFormError(null);
  };

  const validate = () => {
    if (step === 1) {
      if (payload.leave_type === 'Others' && !customLeaveType.trim()) {
        return 'Please specify your custom leave type';
      }
      if (!payload.start_date) return 'Select start date';
      if (!payload.end_date) return 'Select end date';
      if (new Date(payload.end_date) < new Date(payload.start_date))
        return 'End date cannot be earlier than start date';
    }

    if (step === 2) {
      if (!payload.reason.trim()) return 'Please provide a reason';
    }

    return null;
  };

  const next = () => {
    const v = validate();
    if (v) return setFormError(v);
    setStep((s) => s + 1);
  };

  const back = () => {
    setStep((s) => Math.max(1, s - 1));
    setFormError(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles((p) => [...p, ...Array.from(e.target.files!)]);
  };

  const removeFile = (i: number) => {
    setFiles((p) => p.filter((_, idx) => idx !== i));
  };

  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          URL.revokeObjectURL(file as any);
        }
      });
    };
  }, [files]);

  const submit = async () => {
    try {
      setLoading(true);

      if (!token) {
        error('You are not authenticated. Please login.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('currentUser');
        window.location.href = '/login';
        return;
      }

      const formData = new FormData();
      if (employee?.id) formData.append('employee', String(employee.id));
      
      // Append payload, substituting Others with custom leave type
      Object.entries(payload).forEach(([k, v]) => {
        if (k === 'leave_type') {
          formData.append(k, payload.leave_type === 'Others' ? customLeaveType : payload.leave_type);
        } else {
          formData.append(k, v);
        }
      });

      files.forEach((f) => formData.append('attachments', f));

      const res = await fetch(apiUrl('leave-requests/'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const body = await res.text();
      let json: any = null;
      try {
        json = body ? JSON.parse(body) : null;
      } catch (e) {
        // not json
      }

      if (!res.ok) {
        let msg = 'Failed to submit leave request';
        if (json) {
          if (json.detail) msg = json.detail;
          else if (json.message) msg = json.message;
          else {
            const parts: string[] = [];
            Object.entries(json).forEach(([k, v]) => {
              if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`);
              else parts.push(`${k}: ${String(v)}`);
            });
            if (parts.length) msg = parts.join(' | ');
          }
        } else {
          msg = body || msg;
        }

        if (res.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('currentEmployee');
          window.location.href = '/login';
        }
        throw new Error(msg);
      }

      success('Leave request submitted successfully');

      setStep(1);
      setPayload({
        leave_type: 'Sick Leave',
        start_date: '',
        end_date: '',
        reason: '',
      });
      setCustomLeaveType('');
      setFiles([]);
      if (onCancel) onCancel();
    } catch (e: any) {
      error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-2 sm:p-4">
      <div className="w-full max-w-3xl mx-auto">
        <Card className="p-6 sm:p-8 rounded-3xl shadow-xl bg-white dark:bg-[#0b1220] border border-gray-200 dark:border-gray-800">
          
          {/* HEADER */}
          {showHeader && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Leave Request
              </h2>
              <p className="text-sm text-gray-500">
                Submit your leave request in 3 simple steps
              </p>
            </div>
          )}

          {/* PROGRESS STEPS (Polished Stepper UI) */}
          <div className="relative flex items-center justify-between w-full max-w-md mx-auto mb-16 px-4">
            {/* Background Connector Line */}
            <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-800 rounded-full z-0">
              {/* Active Progress line */}
              <div 
                className="h-full bg-gradient-to-r from-[#8B0000] to-red-650 rounded-full transition-all duration-300"
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((s) => {
              const isActive = step === s.id;
              const isDone = step > s.id;

              return (
                <div key={s.id} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                      ${isActive ? 'bg-[#8B0000] text-white border-[#8B0000] ring-4 ring-red-500/20 scale-110 shadow-lg' : ''}
                      ${isDone ? 'bg-green-500 text-white border-green-500 shadow-md' : ''}
                      ${!isActive && !isDone ? 'bg-white dark:bg-gray-900 text-gray-400 border-gray-300 dark:border-gray-750' : ''}
                    `}
                  >
                    {isDone ? '✓' : s.id}
                  </div>
                  <span
                    className={`absolute top-11 whitespace-nowrap text-xs font-bold tracking-wide transition-all duration-300
                      ${isActive ? 'text-red-700 dark:text-red-400 scale-105 font-extrabold' : 'text-gray-450 dark:text-gray-500'}
                    `}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {formError && <ErrorMessage message={formError} />}

          {/* CONTENT */}
          <div className="min-h-[220px] text-left">

            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Leave Type</label>
                  <select
                    value={payload.leave_type}
                    onChange={(e) =>
                      onChange('leave_type', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm sm:text-base outline-none focus:ring-2 focus:ring-[#8B0000]/25 focus:border-[#8B0000] transition-all"
                    title="Leave type"
                  >
                    <option>Sick Leave</option>
                    <option>Vacation Leave</option>
                    <option>Emergency Leave</option>
                    <option>Others</option>
                  </select>
                </div>

                {payload.leave_type === 'Others' && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Specify Leave Type</label>
                    <input
                      type="text"
                      value={customLeaveType}
                      onChange={(e) => setCustomLeaveType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm sm:text-base outline-none focus:ring-2 focus:ring-[#8B0000]/25 focus:border-[#8B0000] transition-all"
                      placeholder="Specify your custom leave type..."
                      title="Custom leave type"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={payload.start_date}
                      onChange={(e) =>
                        onChange('start_date', e.target.value)
                      }
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm sm:text-base outline-none focus:ring-2 focus:ring-[#8B0000]/25 focus:border-[#8B0000] transition-all"
                      title="Start date"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={payload.end_date}
                      onChange={(e) =>
                        onChange('end_date', e.target.value)
                      }
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm sm:text-base outline-none focus:ring-2 focus:ring-[#8B0000]/25 focus:border-[#8B0000] transition-all"
                      title="End date"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Reason for Leave</label>
                  <textarea
                    value={payload.reason}
                    onChange={(e) =>
                      onChange('reason', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm sm:text-base outline-none focus:ring-2 focus:ring-[#8B0000]/25 focus:border-[#8B0000] transition-all min-h-[120px] resize-y"
                    placeholder="Explain your reason in detail..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Attachments (Optional)</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-800/40 hover:bg-gray-100 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-3 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-[10px] text-gray-400">PDF, PNG, JPG, or DOC (MAX. 5MB)</p>
                      </div>
                      <input type="file" multiple onChange={handleFile} className="hidden" />
                    </label>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {files.map((file, index) => {
                      const isImage = file.type.startsWith('image/');
                      const isPDF = file.type === 'application/pdf';
                      const previewUrl = isImage ? URL.createObjectURL(file) : null;

                      return (
                        <div
                          key={index}
                          className="relative border border-gray-250 dark:border-gray-700 rounded-xl p-2.5 bg-gray-55 dark:bg-gray-800/60 overflow-hidden flex flex-col items-stretch"
                        >
                          <button
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 text-xs bg-red-650 text-white w-5 h-5 rounded-full flex items-center justify-center shadow hover:bg-red-700 active:scale-95 transition-all z-10"
                            title="Remove file"
                          >
                            ✕
                          </button>

                          <div className="h-20 flex items-center justify-center overflow-hidden rounded bg-gray-200 dark:bg-gray-900 mb-1.5">
                            {isImage && previewUrl ? (
                              <img
                                src={previewUrl}
                                className="w-full h-full object-cover"
                                alt="attachment preview"
                              />
                            ) : isPDF ? (
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-red-650 uppercase tracking-widest">PDF</span>
                                <FileText size={20} className="text-gray-400" />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">FILE</span>
                                <FileText size={20} className="text-gray-400" />
                              </div>
                            )}
                          </div>

                          <p className="text-[10px] font-semibold truncate text-center text-gray-700 dark:text-gray-300">
                            {file.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-150 dark:border-gray-800/50">
                <h4 className="text-sm font-bold border-b border-gray-200 dark:border-gray-750 pb-2 mb-3">Leave Summary Review</h4>
                <div className="grid grid-cols-2 gap-y-3 text-xs sm:text-sm">
                  <span className="text-gray-500">Leave Type:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100">{payload.leave_type === 'Others' ? customLeaveType : payload.leave_type}</span>

                  <span className="text-gray-500">Start Date:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100">{payload.start_date}</span>

                  <span className="text-gray-500">End Date:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-100">{payload.end_date}</span>

                  <span className="text-gray-500 col-span-2 border-t border-gray-100 dark:border-gray-800 pt-2 mt-1">Reason:</span>
                  <p className="col-span-2 italic text-gray-700 dark:text-gray-350 bg-white dark:bg-gray-900/40 p-3 rounded-lg border dark:border-gray-800">
                    &ldquo;{payload.reason}&rdquo;
                  </p>

                  <span className="text-gray-500 col-span-2 border-t border-gray-100 dark:border-gray-800 pt-2 mt-1">Uploaded Certificates:</span>
                  <span className="col-span-2 font-semibold text-gray-800 dark:text-gray-100">{files.length} file(s) attached</span>
                </div>
              </div>
            )}

          </div>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row justify-between mt-8 gap-3 border-t border-gray-250 dark:border-gray-850 pt-5">
            <div className="w-full sm:w-auto">
              <Button
                variant="secondary"
                onClick={step === 1 ? onCancel : back}
                disabled={step === 1 && !onCancel}
                className="w-full sm:w-auto px-6 font-bold text-sm"
              >
                Back
              </Button>
            </div>

            <div className="w-full sm:w-auto">
              {step < 3 ? (
                <Button onClick={next} className="w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">
                  Next
                </Button>
              ) : (
                <Button onClick={submit} isLoading={loading} className="w-full sm:w-auto px-8 bg-[#8B0000] hover:bg-red-700 text-white font-bold text-sm">
                  Submit Request
                </Button>
              )}
            </div>
          </div>

        </Card>
      </div>
    </div>
  );
};