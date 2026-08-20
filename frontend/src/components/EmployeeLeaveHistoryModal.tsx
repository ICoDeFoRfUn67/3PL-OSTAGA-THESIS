import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/api/apiService';
import { Badge, LoadingSpinner } from './common';
import { Calendar, Clock, MessageSquare, Paperclip, ChevronRight, ArrowLeft, Plane, FileText, MoreVertical, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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
      setPreviewFile({ url, type: 'image' });
    } else if (isPdf) {
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'rejected': return <XCircle size={16} className="text-red-500" />;
      default: return <AlertCircle size={16} className="text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'rejected': return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400';
      default: return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400';
    }
  };

  const getDaysCount = (start: string, end: string) => {
    return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leave History" size="xl" noPadding>
      <div className="flex flex-col h-[78vh] bg-white dark:bg-[#050C1B] overflow-hidden rounded-b-3xl md:flex-row border-t border-slate-100 dark:border-slate-800/80">

        {/* ── Desktop Sidebar ── */}
        <div className="hidden md:flex w-72 border-r border-slate-100 dark:border-slate-800/80 overflow-y-auto bg-slate-50 dark:bg-[#090F1D] flex-col flex-shrink-0">
          {loading ? (
            <div className="flex items-center justify-center p-8 flex-1">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center p-12 flex-1 flex flex-col items-center justify-center">
              <Calendar size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
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
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate pr-2">{r.leave_type}</span>
                    <Badge variant={getStatusVariant(r.status)} size="sm" className="text-[10px] uppercase px-2 py-0.5 font-bold flex-shrink-0">{r.status}</Badge>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">
                    {new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(r.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{new Date(r.created_at).toLocaleString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Mobile: List View (when nothing selected) ── */}
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
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            r.status === 'approved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            r.status === 'rejected' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
                            'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            <Plane size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.leave_type}</p>
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

        {/* ── Detail Panel ── */}
        {selected && (
          <div className="flex-1 overflow-y-auto flex flex-col bg-white dark:bg-[#050C1B] min-w-0">

            {/* Mobile back bar — ONLY back arrow, no X (modal already has X) */}
            <div className="md:hidden flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex-shrink-0">
              <button
                onClick={() => setSelected(null)}
                aria-label="Go back"
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Leave Details</h2>
            </div>

            <div className="p-4 md:p-6 space-y-4 flex-1">
              {/* ── Summary Hero Card ── */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a0610] via-[#2a0a1a] to-[#0d0318] border border-red-900/30 p-5 shadow-xl">
                {/* Glow */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10">
                  {/* Leave type + status row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                        <Plane size={20} className="text-red-300" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-red-300/70 uppercase tracking-wider mb-0.5">Leave Type</p>
                        <h3 className="text-lg font-extrabold text-white leading-tight">{selected.leave_type}</h3>
                      </div>
                    </div>
                    {/* Status pill */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold flex-shrink-0 ${getStatusColor(selected.status)}`}>
                      {getStatusIcon(selected.status)}
                      <span className="uppercase tracking-wide">{selected.status}</span>
                    </div>
                  </div>

                  {/* Dates + duration row */}
                  <div className="flex items-center justify-between bg-white/5 rounded-2xl px-4 py-3 border border-white/5">
                    <div>
                      <p className="text-[10px] text-red-300/60 font-bold uppercase tracking-wider mb-1">Period</p>
                      <p className="text-sm font-bold text-white">
                        {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' '}&ndash;{' '}
                        {new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-red-300/60 font-bold uppercase tracking-wider mb-1">Duration</p>
                      <p className="text-xl font-black text-white">{getDaysCount(selected.start_date, selected.end_date)}<span className="text-sm font-bold text-red-300/70 ml-1">days</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Request Timeline ── */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <Clock size={12} className="text-red-500" />
                  </div>
                  <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Request Timeline</h4>
                </div>

                <div className="bg-slate-50 dark:bg-[#0d1527]/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 space-y-4 relative pl-9">
                  {/* Vertical line */}
                  <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-red-400 via-red-400/50 to-slate-200 dark:to-slate-800 rounded-full" />

                  {/* Item 1: Requested */}
                  <div className="relative">
                    <div className="absolute -left-6 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#0d1527] shadow-[0_0_6px_rgba(239,68,68,0.5)] mt-1" />
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Requested</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {new Date(selected.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selected.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Item 2: Status */}
                  <div className="relative">
                    <div className={`absolute -left-6 w-3 h-3 rounded-full border-2 border-white dark:border-[#0d1527] mt-1 ${
                      selected.status === 'pending' ? 'bg-slate-300 dark:bg-slate-600' :
                      selected.status === 'approved' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' :
                      'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                    }`} />
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {selected.status === 'pending' ? 'Pending Approval' : selected.status === 'rejected' ? 'Rejected' : 'Approved'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {selected.status === 'pending'
                        ? 'Waiting for manager review'
                        : `Reviewed on ${new Date(selected.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                    {selected.status === 'rejected' && selected.notes && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-105/20 dark:border-red-900/30 rounded-xl text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">
                        <span className="font-bold">Rejection Reason:</span> &ldquo;{selected.notes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Leave Dates ── */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <Calendar size={12} className="text-red-500" />
                  </div>
                  <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Leave Dates</h4>
                </div>

                <div className="bg-slate-50 dark:bg-[#0d1527]/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-2">
                    <div className="p-4 text-center border-r border-slate-200 dark:border-slate-800/80">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-1.5 uppercase tracking-wider">Start Date</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        {new Date(selected.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-1.5 uppercase tracking-wider">End Date</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        {new Date(selected.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Reason for Leave ── */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <MessageSquare size={12} className="text-red-500" />
                  </div>
                  <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason for Leave</h4>
                </div>

                <div className="bg-slate-50 dark:bg-[#0d1527]/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-200 italic font-semibold leading-relaxed">
                    &ldquo;{selected.reason || 'No reason provided'}&rdquo;
                  </p>
                </div>
              </div>

              {/* ── Attachments ── */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                    <Paperclip size={12} className="text-red-500" />
                  </div>
                  <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attachments</h4>
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400 text-[10px] font-bold">
                    {selected.attachments?.length || 0}
                  </span>
                </div>

                {(!selected.attachments || selected.attachments.length === 0) ? (
                  <div className="bg-slate-50 dark:bg-[#0d1527]/20 rounded-2xl p-5 border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center">
                    <Paperclip size={20} className="text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">No attachments uploaded</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selected.attachments.map((url: string, idx: number) => {
                      const filename = url.split('/').pop()?.split('?')[0] || 'Document';
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                      const isPdf = /\.pdf$/i.test(url);
                      const isDoc = /\.(doc|docx)$/i.test(url);

                      let labelText = 'DOC';
                      let bgIconColor = 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400';
                      let ext = 'docx';

                      if (isPdf) {
                        labelText = 'PDF'; bgIconColor = 'bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/20 text-red-650 dark:text-red-400'; ext = 'pdf';
                      } else if (isDoc) {
                        labelText = 'DOC'; ext = 'docx';
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
                          className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#0d1527]/30 border border-slate-200 dark:border-slate-800/80 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl border flex flex-col items-center justify-center flex-shrink-0 ${bgIconColor}`}>
                              <span className="text-[8px] font-black tracking-tighter leading-none mb-0.5">{labelText}</span>
                              <FileText size={12} className="mt-0.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                                {filename.length > 18 ? filename.substring(0, 15) + '...' + ext : filename}
                              </p>
                            </div>
                          </div>
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex-shrink-0">
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Cancel Button ── */}
              {selected.status === 'pending' && (
                <button
                  onClick={() => handleCancelRequest(selected.id)}
                  disabled={cancelLoading}
                  className="w-full py-3 border border-red-300 dark:border-red-500/35 hover:border-red-500 text-red-650 dark:text-red-550 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Trash2 size={15} />
                  {cancelLoading ? 'Cancelling...' : 'Cancel Request'}
                </button>
              )}
            </div>
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
