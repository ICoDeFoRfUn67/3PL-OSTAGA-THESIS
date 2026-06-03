import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/api/apiService';
import { Badge, LoadingSpinner } from './common';
import { Calendar, Clock, User, MessageSquare, Paperclip, Eye, Download, ChevronRight, ArrowLeft, X, Plane, FileText, File, MoreVertical, Trash2 } from 'lucide-react';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const EmployeeLeaveHistoryModal = ({ isOpen, onClose }: Props) => {
  const { employee } = useAuth();
  const { error } = useToast();
  const [loading, setLoading] = useState(false);
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

  const handlePreview = (url: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    const isPdf = /\.pdf$/i.test(url);
    setPreviewFile({
      url,
      type: isImage ? 'image' : isPdf ? 'pdf' : 'other'
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Leave History" size="xl">
      <div className="flex flex-col h-[75vh] bg-white dark:bg-[#050C1B] overflow-hidden rounded-b-xl md:flex-row border-t border-gray-200 dark:border-slate-800/80">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:flex w-full md:w-80 border-r dark:border-slate-800/80 overflow-y-auto bg-gray-50 dark:bg-[#090F1D] flex-col">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center p-12">
              <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-650 mb-2" />
              <p className="text-xs text-slate-400 font-medium">No leave requests found</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800/60">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full p-4 text-left transition-all hover:bg-white dark:hover:bg-slate-900/40 flex items-center justify-between group ${
                    selected?.id === r.id ? 'bg-white dark:bg-slate-900/30 border-l-4 border-red-600 shadow-sm' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold uppercase text-gray-700 dark:text-slate-300 tracking-tight">{r.leave_type}</span>
                      <Badge variant={getStatusVariant(r.status)} size="sm" className="text-[10px] uppercase px-2 py-0.5 font-bold">{r.status}</Badge>
                    </div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium italic">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <ChevronRight size={18} className={`text-gray-400 dark:text-slate-500 transition-transform flex-shrink-0 ${selected?.id === r.id ? 'translate-x-1 text-red-600' : 'group-hover:translate-x-0.5'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile List View - Shown on mobile when no item selected */}
        {!selected && (
          <div className="md:hidden flex-1 overflow-y-auto w-full bg-[#050C1B]">
            {loading ? (
              <div className="flex items-center justify-center p-8 h-full">
                <LoadingSpinner />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center p-12 h-full flex flex-col items-center justify-center">
                <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-660 mb-2" />
                <p className="text-xs text-slate-400 font-medium">No leave requests found</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-slate-800/60">
                {items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="w-full p-4 text-left transition-all hover:bg-gray-50 dark:hover:bg-slate-900/30 flex items-center justify-between group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold uppercase text-gray-700 dark:text-slate-300 tracking-tight">{r.leave_type}</span>
                        <Badge variant={getStatusVariant(r.status)} size="sm" className="text-[10px] uppercase px-2 py-0.5 font-bold">{r.status}</Badge>
                      </div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">
                        {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium italic">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
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
            <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-slate-800/80">
              <button
                onClick={() => setSelected(null)}
                aria-label="Go back to leave requests"
                title="Go back"
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-900/40 rounded-lg transition-colors text-gray-900 dark:text-white"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave History</h2>
              <button
                onClick={onClose}
                aria-label="Close leave history"
                title="Close"
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-900/40 rounded-lg transition-colors text-gray-900 dark:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {/* Leave Card - Premium Glassy Styling matching Image 1 */}
            <div className="bg-[#0d1527]/50 border border-slate-800/60 rounded-[28px] p-5 md:p-6 mb-6 text-white relative overflow-hidden group shadow-lg">
              <div className="flex items-center gap-4">
                {/* Airplane icon circle in red */}
                <div className="flex-shrink-0 w-16 h-16 bg-[#991b1b] rounded-full flex items-center justify-center shadow-md shadow-red-950/20">
                  <Plane size={28} className="text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-lg font-bold text-white truncate">{selected.leave_type}</h3>
                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
                      {selected.status}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tight mt-1">
                    {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {Math.ceil((new Date(selected.end_date).getTime() - new Date(selected.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} Days
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-400 flex-shrink-0" />
              </div>
            </div>

            {/* Request Timeline */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-red-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Request Timeline</h4>
              </div>
              
              <div className="bg-[#0d1527]/30 border border-slate-800/60 rounded-3xl p-5 md:p-6 space-y-6 relative pl-8">
                {/* Vertical Line */}
                <div className="absolute left-[31px] top-8 bottom-8 w-[2px] bg-slate-800" />

                {/* Timeline Item 1 */}
                <div className="relative">
                  <div className="absolute -left-6 w-3 h-3 bg-red-500 rounded-full border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)] mt-1.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white">Requested</p>
                    <p className="text-xs text-slate-400">
                      {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selected.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="relative">
                  <div className={`absolute -left-6 w-3 h-3 rounded-full border mt-1.5 ${
                    selected.status === 'pending' ? 'bg-slate-700 border-slate-650' : 'bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                  }`} />
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white">
                      {selected.status === 'pending' ? 'Pending Approval' : 'Approved'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {selected.status === 'pending' ? 'Waiting for manager review' : `Reviewed on ${new Date(selected.reviewed_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Dates */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-red-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Leave Dates</h4>
              </div>
              
              <div className="bg-[#0d1527]/30 border border-slate-800/60 rounded-3xl p-5 md:p-6 grid grid-cols-2 gap-4 relative">
                {/* Vertical Divider */}
                <div className="absolute top-4 bottom-4 left-1/2 w-[1px] bg-slate-800/80" />

                <div className="text-center sm:text-left">
                  <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">Start Date</p>
                  <p className="text-base font-bold text-white">
                    {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-center sm:text-left pl-4">
                  <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">End Date</p>
                  <p className="text-base font-bold text-white">
                    {new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason for Leave */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-red-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Reason for Leave</h4>
              </div>
              
              <div className="bg-[#0d1527]/30 border border-slate-800/60 rounded-3xl p-5 md:p-6">
                <p className="text-sm text-slate-200 italic font-semibold">
                  &ldquo;{selected.reason || 'No reason provided'}&rdquo;
                </p>
              </div>
            </div>

            {/* Attachments */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2.5">
                <Paperclip size={16} className="text-red-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Attachments</h4>
                <span className="bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
                  {selected.attachments?.length || 0}
                </span>
              </div>
              
              {(!selected.attachments || selected.attachments.length === 0) ? (
                <div className="bg-[#0d1527]/10 rounded-3xl p-6 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center">
                  <Paperclip size={24} className="text-slate-650 mb-2" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No attachments uploaded</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selected.attachments.map((url: string, idx: number) => {
                    const filename = url.split('/').pop()?.split('?')[0] || 'Document';
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                    const isPdf = /\.pdf$/i.test(url);
                    const isDoc = /\.(doc|docx)$/i.test(url);

                    let labelText = 'DOC';
                    let bgIconColor = 'bg-blue-500/15 border-blue-500/20 text-blue-500';
                    let ext = 'docx';

                    if (isPdf) {
                      labelText = 'PDF';
                      bgIconColor = 'bg-red-500/15 border-red-500/20 text-red-500';
                      ext = 'pdf';
                    } else if (isDoc) {
                      labelText = 'DOC';
                      bgIconColor = 'bg-blue-500/15 border-blue-500/20 text-blue-500';
                      ext = 'docx';
                    } else if (isImage) {
                      const imageExt = url.split('.').pop()?.split('?')[0] || 'jpg';
                      labelText = imageExt.toUpperCase();
                      bgIconColor = imageExt.toLowerCase() === 'png' 
                        ? 'bg-purple-500/15 border-purple-500/20 text-purple-500' 
                        : 'bg-green-500/15 border-green-500/20 text-green-500';
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
                          bg-[#0d1527]/30
                          border
                          border-slate-800/80
                          rounded-2xl
                          hover:border-slate-700
                          transition-all
                          cursor-pointer
                        "
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Colored Icon box matching image 1 */}
                          <div className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center flex-shrink-0 ${bgIconColor}`}>
                            <span className="text-[8px] font-black tracking-tighter leading-none mb-0.5">{labelText}</span>
                            <FileText size={14} className="mt-0.5" />
                          </div>
                          
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-slate-200 text-sm truncate">
                              {filename.length > 18 ? filename.substring(0, 15) + '...' + ext : filename}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                              {labelText === 'PDF' ? '245 KB' : labelText === 'DOC' ? '320 KB' : labelText === 'PNG' ? '950 KB' : '1.2 MB'}
                            </p>
                          </div>
                        </div>

                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all flex-shrink-0">
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
              <button className="w-full py-4 border border-red-500/35 hover:border-red-500 text-red-500 hover:bg-red-500/5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all mt-4">
                <Trash2 size={18} />
                Cancel Request
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
