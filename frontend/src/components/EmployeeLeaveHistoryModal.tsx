import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/api/apiService';
import { Badge, LoadingSpinner } from './common';
import { Calendar, Clock, MessageSquare, Paperclip, ChevronRight, ArrowLeft, X, Plane, FileText, MoreVertical, Trash2 } from 'lucide-react';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const EmployeeLeaveHistoryModal = ({ isOpen, onClose }: Props) => {
  const { employee } = useAuth();
  const { error, success } = useToast();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'pdf' | 'other' } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!employee?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    const fetcher = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/leave-requests/', {
          params: { employee_id: employee.id },
        });
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.results ?? [];
        setItems(list);
        if (list.length > 0 && !selected) {
          setSelected(list[0]);
        }
      } catch (e) {
        console.error(e);
        error('Failed to load leave history');
      } finally {
        setLoading(false);
      }
    };

    void fetcher();
  }, [isOpen, employee?.id]);

  const handleCancelRequest = async (id: number) => {
    try {
      setCancelLoading(true);
      await apiClient.delete(`/leave-requests/${id}/`);
      setItems(prev => prev.filter(i => i.id !== id));
      setSelected(null);
      success('Leave request cancelled');
    } catch (e) {
      error('Failed to cancel request');
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePreview = (url: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const isPdf = /\.pdf$/i.test(url);
    if (isImage) {
      setPreviewFile({
        url,
        type: 'image'
      });
    } else if (isPdf) {
      // Force download for PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = url.split('/').pop() || 'file.pdf';
      link.click();
    } else {
      window.open(url, '_blank');
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leave History" size="xl" noPadding>
      <div className="flex flex-col h-[75vh] bg-white dark:bg-[#050C1B] overflow-hidden rounded-b-3xl md:flex-row border-t border-slate-150 dark:border-slate-800/80">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:flex w-full md:w-80 border-r border-slate-100 dark:border-slate-800/80 overflow-y-auto bg-slate-50 dark:bg-[#090F1D] flex-col">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center p-12">
              <Calendar size={40} className="mx-auto text-slate-350 dark:text-slate-650 mb-3 opacity-40" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No leave requests found</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full p-3.5 text-left rounded-2xl transition-all group ${
                    selected?.id === r.id
                      ? 'bg-white dark:bg-[#0d1527] shadow-md border border-slate-200 dark:border-slate-700'
                      : 'hover:bg-white dark:hover:bg-[#0d1527]/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-tight">{r.leave_type}</span>
                    <Badge variant={getStatusVariant(r.status)} size="sm" className="text-[10px] uppercase px-2 py-0.5 font-bold">{r.status}</Badge>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">
                    {new Date(r.start_date).toLocaleDateString()} – {new Date(r.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{new Date(r.created_at).toLocaleString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile List View - Shown on mobile when no item selected */}
        {!selected && (
          <div className="md:hidden flex-1 overflow-y-auto w-full bg-white dark:bg-[#050C1B]">
            {loading ? (
              <div className="flex items-center justify-center p-8 h-full">
                <LoadingSpinner />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center p-12 h-full flex flex-col items-center justify-center">
                <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No leave requests yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Your submitted leave requests will appear here</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="w-full text-left transition-all"
                  >
                    <div className="bg-slate-50 dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 hover:border-red-300 dark:hover:border-red-800/60 transition-all group">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            r.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            r.status === 'rejected' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                            'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            <Plane size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{r.leave_type}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(r.status)} size="sm" className="text-[10px] uppercase px-2.5 py-1 font-bold flex-shrink-0">{r.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Content - Request Details */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar flex flex-col bg-white dark:bg-[#050C1B]">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => setSelected(null)}
                aria-label="Go back to leave requests"
                title="Go back"
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-lg transition-colors text-slate-800 dark:text-white"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Leave History</h2>
              <button
                onClick={onClose}
                aria-label="Close leave history"
                title="Close"
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-lg transition-colors text-slate-800 dark:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Leave Card - Premium Adaptive Glassy Styling */}
            <div className="bg-slate-50 dark:bg-[#0d1527]/50 border border-slate-200 dark:border-slate-800/60 rounded-[28px] p-5 md:p-6 mb-6 text-slate-900 dark:text-white relative overflow-hidden group shadow-sm dark:shadow-lg transition-all">
              <div className="flex items-center gap-4">
                {/* Airplane icon circle in red */}
                <div className="flex-shrink-0 w-16 h-16 bg-red-100 dark:bg-[#991b1b] rounded-full flex items-center justify-center shadow-sm dark:shadow-md dark:shadow-red-950/20 text-red-650 dark:text-white">
                  <Plane size={28} />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{selected.leave_type}</h3>
                    <Badge variant={getStatusVariant(selected.status)} size="sm" className="text-[10px] uppercase px-2.5 py-1 font-bold">{selected.status}</Badge>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                    {Math.ceil((new Date(selected.end_date).getTime() - new Date(selected.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              </div>
            </div>

            {/* Request Timeline */}
            <div className="mb-5 space-y-2.5 text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <Clock size={14} className="text-red-500" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Request Timeline</h4>
              </div>
              
              <div className="bg-slate-50 dark:bg-[#0d1527]/35 border border-slate-200 dark:border-slate-800/60 rounded-3xl p-5 space-y-4 relative pl-10">
                {/* Vertical Line */}
                <div className="absolute left-[35px] top-7 bottom-7 w-[2px] bg-gradient-to-b from-red-400 to-slate-200 dark:to-slate-800 rounded-full" />

                {/* Timeline Item 1 */}
                <div className="relative">
                  <div className="absolute -left-7 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#0d1527] shadow-[0_0_8px_rgba(239,68,68,0.5)] mt-1" />
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Requested</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selected.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="relative">
                  <div className={`absolute -left-7 w-3 h-3 rounded-full border-2 border-white dark:border-[#0d1527] mt-1 ${
                    selected.status === 'pending' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                  }`} />
                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {selected.status === 'pending' ? 'Pending Approval' : selected.status === 'rejected' ? 'Rejected' : 'Approved'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {selected.status === 'pending' ? 'Waiting for manager review' : `Reviewed on ${new Date(selected.reviewed_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Dates */}
            <div className="mb-5 space-y-2.5 text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <Calendar size={14} className="text-red-500" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Leave Dates</h4>
              </div>
              
              <div className="bg-slate-50 dark:bg-[#0d1527]/30 border border-slate-200 dark:border-slate-800/60 rounded-3xl overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="p-4 text-center border-r border-slate-200 dark:border-slate-800/80">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Start Date</p>
                    <p className="text-base font-bold text-slate-800 dark:text-white">
                      {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-1.5 uppercase tracking-wider">End Date</p>
                    <p className="text-base font-bold text-slate-800 dark:text-white">
                      {new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason for Leave */}
            <div className="mb-5 space-y-2.5 text-left">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <MessageSquare size={14} className="text-red-500" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Reason for Leave</h4>
              </div>
              
              <div className="bg-slate-50 dark:bg-[#0d1527]/30 border border-slate-200 dark:border-slate-800/60 rounded-3xl p-4 text-left">
                <p className="text-sm text-slate-700 dark:text-slate-200 italic font-semibold leading-relaxed">
                  &ldquo;{selected.reason || 'No reason provided'}&rdquo;
                </p>
              </div>
            </div>

            {/* Attachments */}
            <div className="mb-6 space-y-3 text-left">
              <div className="flex items-center gap-2.5">
                <Paperclip size={16} className="text-red-500" />
                <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attachments</h4>
                <span className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-650 dark:text-red-500 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
                  {selected.attachments?.length || 0}
                </span>
              </div>
              
              {(!selected.attachments || selected.attachments.length === 0) ? (
                <div className="bg-slate-50/50 dark:bg-[#0d1527]/10 rounded-3xl p-6 border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center">
                  <Paperclip size={24} className="text-slate-400 dark:text-slate-650 mb-2" />
                  <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">No attachments uploaded</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selected.attachments.map((url: string, idx: number) => {
                    const filename = url.split('/').pop()?.split('?')[0] || 'Document';
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                    const isPdf = /\.pdf$/i.test(url);
                    const isDoc = /\.(doc|docx)$/i.test(url);

                    let labelText = 'DOC';
                    let bgIconColor = 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/20 text-blue-650 dark:text-blue-400';
                    let ext = 'docx';

                    if (isPdf) {
                      labelText = 'PDF';
                      bgIconColor = 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/20 text-red-650 dark:text-red-400';
                      ext = 'pdf';
                    } else if (isDoc) {
                      labelText = 'DOC';
                      bgIconColor = 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/20 text-blue-650 dark:text-blue-400';
                      ext = 'docx';
                    } else if (isImage) {
                      const imageExt = url.split('.').pop()?.split('?')[0] || 'jpg';
                      labelText = imageExt.toUpperCase();
                      bgIconColor = imageExt.toLowerCase() === 'png' 
                        ? 'bg-purple-50 dark:bg-purple-500/15 border-purple-200 dark:border-purple-500/20 text-purple-650 dark:text-purple-400' 
                        : 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/20 text-emerald-650 dark:text-emerald-400';
                      ext = imageExt;
                    }

                    return (
                      <div 
                        key={idx}
                        onClick={() => handlePreview(url)}
                        className="
                          flex
                          items-center
                          justify-between
                          p-4
                          bg-slate-50
                          dark:bg-[#0d1527]/30
                          border
                          border-slate-200
                          dark:border-slate-800/80
                          rounded-2xl
                          hover:border-slate-300
                          dark:hover:border-slate-700
                          transition-all
                          cursor-pointer
                        "
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Colored Icon box */}
                          <div className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center flex-shrink-0 ${bgIconColor}`}>
                            <span className="text-[8px] font-black tracking-tighter leading-none mb-0.5">{labelText}</span>
                            <FileText size={14} className="mt-0.5" />
                          </div>
                          
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                              {filename.length > 18 ? filename.substring(0, 15) + '...' + ext : filename}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-455 mt-0.5 font-semibold">
                              {labelText === 'PDF' ? '245 KB' : labelText === 'DOC' ? '320 KB' : labelText === 'PNG' ? '950 KB' : '1.2 MB'}
                            </p>
                          </div>
                        </div>

                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex-shrink-0">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cancel Request Button */}
            {selected.status === 'pending' && (
              <button 
                onClick={() => handleCancelRequest(selected.id)}
                disabled={cancelLoading}
                className="w-full py-4 border border-red-300 dark:border-red-500/35 hover:border-red-500 text-red-650 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={18} />
                {cancelLoading ? 'Cancelling...' : 'Cancel Request'}
              </button>
            )}
          </div>
        )}
      </div>

      {previewFile && (
        <AttachmentPreviewModal
          url={previewFile.url}
          type={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </Modal>
  );
};

export default EmployeeLeaveHistoryModal;
