import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/api/apiService';
import { Badge, LoadingSpinner } from './common';
import { Calendar, Clock, User, MessageSquare, Paperclip, Eye, Download, ChevronRight, ArrowLeft, X, Plane, FileText, File } from 'lucide-react';
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
      <div className="flex flex-col h-[75vh] bg-white dark:bg-dark-bg overflow-hidden rounded-b-xl md:flex-row">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:flex w-full md:w-80 border-r dark:border-gray-800 overflow-y-auto bg-gray-50/30 dark:bg-gray-900/30 flex-col">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center p-12">
              <Calendar size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-500 font-medium">No leave requests found</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-800">
              {items.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`w-full p-4 text-left transition-all hover:bg-white dark:hover:bg-gray-800 flex items-center justify-between group ${
                    selected?.id === r.id ? 'bg-white dark:bg-gray-800 border-l-4 border-red-600 shadow-sm' : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black uppercase text-gray-500 tracking-tight">{r.leave_type}</span>
                      <Badge variant={getStatusVariant(r.status)} size="sm" className="text-[8px] uppercase px-1.5 py-0">{r.status}</Badge>
                    </div>
                    <p className="font-bold text-[13px] text-gray-900 dark:text-gray-100">
                      {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium italic">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <ChevronRight size={16} className={`text-gray-300 transition-transform ${selected?.id === r.id ? 'translate-x-1 text-red-600' : 'group-hover:translate-x-0.5'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile List View - Shown on mobile when no item selected */}
        {!selected && (
          <div className="md:hidden flex-1 overflow-y-auto w-full">
            {loading ? (
              <div className="flex items-center justify-center p-8 h-full">
                <LoadingSpinner />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center p-12 h-full flex flex-col items-center justify-center">
                <Calendar size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-500 font-medium">No leave requests found</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-800">
                {items.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="w-full p-4 text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-tight">{r.leave_type}</span>
                        <Badge variant={getStatusVariant(r.status)} size="sm" className="text-[8px] uppercase px-1.5 py-0">{r.status}</Badge>
                      </div>
                      <p className="font-bold text-[13px] text-gray-900 dark:text-gray-100">
                        {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium italic">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Content - Request Details */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar flex flex-col">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-800">
              <button
                onClick={() => setSelected(null)}
                aria-label="Go back to leave requests"
                title="Go back"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
              </button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave History</h2>
              <button
                onClick={onClose}
                aria-label="Close leave history"
                title="Close"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-900 dark:text-white" />
              </button>
            </div>

            {/* Leave Card - Mobile Style */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-5 mb-6 text-white">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                  <Plane size={32} className="text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold">{selected.leave_type}</h3>
                    <Badge 
                      variant={getStatusVariant(selected.status)} 
                      className="text-[10px] uppercase px-2 py-1 font-black"
                    >
                      {selected.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">
                    {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(selected.end_date).getFullYear()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {Math.ceil((new Date(selected.end_date).getTime() - new Date(selected.start_date).getTime()) / (1000 * 60 * 60 * 24))} Days
                  </p>
                </div>
              </div>
            </div>

            {/* Request Timeline */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-red-600" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Request Timeline</h4>
              </div>
              
              <div className="space-y-4 pl-6 border-l-2 border-red-600">
                {/* Timeline Item 1 */}
                <div className="relative">
                  <div className="absolute -left-8 w-4 h-4 bg-red-600 rounded-full border-4 border-white dark:border-gray-900"></div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Requested</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selected.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Timeline Item 2 */}
                <div className="relative">
                  <div className={`absolute -left-8 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 ${
                    selected.status === 'pending' ? 'bg-gray-400' : 'bg-green-600'
                  }`}></div>
                  <div className={`rounded-2xl p-4 ${
                    selected.status === 'pending' 
                      ? 'bg-gray-50 dark:bg-gray-800/50' 
                      : 'bg-green-50/30 dark:bg-green-900/10'
                  }`}>
                    <p className={`text-sm font-bold ${
                      selected.status === 'pending' 
                        ? 'text-gray-600 dark:text-gray-400' 
                        : 'text-green-700 dark:text-green-400'
                    }`}>
                      {selected.status === 'pending' ? 'Pending Approval' : 'Approved'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {selected.status === 'pending' ? 'Waiting for manager review' : `Approved on ${new Date(selected.reviewed_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Dates */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 mb-6">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-red-600" />
                Leave Dates
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">Start Date</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">End Date</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason for Leave */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <MessageSquare size={18} className="text-red-600" />
                Reason for Leave
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic font-medium">
                  &ldquo;{selected.reason || 'No reason provided'}&rdquo;
                </p>
              </div>
            </div>

            {/* Attachments */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Paperclip size={18} className="text-red-600" />
                Attachments <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold ml-1">({selected.attachments?.length || 0})</span>
              </h4>
              
              {(!selected.attachments || selected.attachments.length === 0) ? (
                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 text-center flex flex-col items-center justify-center">
                  <Paperclip size={28} className="text-gray-300 mb-3" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No attachments</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {selected.attachments.map((url: string, idx: number) => {
                    const filename = url.split('/').pop()?.split('?')[0] || 'Document';
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                    const isPdf = /\.pdf$/i.test(url);
                    const isDoc = /\.(doc|docx)$/i.test(url);

                    let bgColor = 'bg-blue-500';
                    let Icon = File;
                    
                    if (isImage) {
                      bgColor = 'bg-green-500';
                      Icon = File;
                    } else if (isPdf) {
                      bgColor = 'bg-red-500';
                      Icon = FileText;
                    } else if (isDoc) {
                      bgColor = 'bg-blue-500';
                      Icon = FileText;
                    }

                    return (
                      <div 
                        key={idx} 
                        className="group relative bg-white dark:bg-gray-800/50 rounded-2xl overflow-hidden aspect-square border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 cursor-pointer"
                      >
                        {isImage ? (
                          <>
                            <img src={url} alt="Attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                              <button 
                                onClick={() => handlePreview(url)}
                                aria-label="View image"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-900 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-red-600 hover:text-white transition-all"
                              >
                                <Eye size={12} /> View
                              </button>
                            </div>
                          </>
                        ) : (
                          <div 
                            className={`w-full h-full flex flex-col items-center justify-center p-3 ${bgColor} bg-opacity-10 dark:bg-opacity-20 cursor-pointer hover:bg-opacity-20 dark:hover:bg-opacity-30 transition-all`}
                            onClick={() => handlePreview(url)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handlePreview(url)}
                          >
                            <div className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center mb-2`}>
                              <Icon size={24} className="text-white" />
                            </div>
                            <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 text-center truncate w-full px-2 lowercase">
                              {filename.length > 15 ? filename.substring(0, 12) + '...' : filename}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin Review Section */}
            {selected.status !== 'pending' && (
              <div className="mb-6">
                <h4 className={`text-sm font-bold flex items-center gap-2 mb-3 ${
                  selected.status === 'approved' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <User size={18} />
                  Admin Review
                </h4>
                <div className={`p-5 rounded-2xl border ${
                  selected.status === 'approved' 
                    ? 'bg-green-50/30 dark:bg-green-900/10 border-green-100/50 dark:border-green-900/20' 
                    : 'bg-red-50/30 dark:bg-red-900/10 border-red-100/50 dark:border-red-900/20'
                }`}>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                    Reviewed by <span className="text-red-600">{selected.reviewed_by_name || 'Administrator'}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    {selected.notes || 'No additional comments provided.'}
                  </p>
                  {selected.reviewed_at && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      <Clock size={14} />
                      {new Date(selected.reviewed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancel Request Button - Mobile Only */}
            {selected.status === 'pending' && (
              <button className="w-full mt-auto py-3 px-4 border-2 border-red-600 text-red-600 rounded-2xl font-bold text-sm uppercase tracking-wider hover:bg-red-600 hover:text-white transition-colors duration-300">
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
