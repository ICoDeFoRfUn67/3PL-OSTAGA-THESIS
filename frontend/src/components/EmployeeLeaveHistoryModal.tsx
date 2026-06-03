import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiClient } from '@/api/apiService';
import { Badge, LoadingSpinner } from './common';
import {
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  ChevronRight,
  ArrowLeft,
  Plane,
  FileText,
  MoreVertical,
  Trash2,
  Download,
  X
} from 'lucide-react';

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

  // Floating preview state
  const [preview, setPreview] = useState<{
    url: string;
    type: 'image' | 'pdf';
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetcher = async () => {
      try {
        setLoading(true);

        const res = await apiClient.get('/leave-requests/', {
          params: { employee_id: employee?.id },
        });

        const data = res.data;
        const list = Array.isArray(data) ? data : data?.results ?? [];

        setItems(list);
        if (!selected && list.length > 0) setSelected(list[0]);
      } catch (e) {
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

  const openAttachment = (url: string) => {
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
    const isPdf = /\.pdf$/i.test(url);

    if (isImage) {
      setPreview({ url, type: 'image' });
    } else if (isPdf) {
      // direct download for PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = url.split('/').pop() || 'file.pdf';
      link.click();
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leave History" size="xl">
      <div className="flex flex-col md:flex-row h-[75vh] overflow-hidden bg-[#050C1B]">

        {/* LEFT LIST */}
        <div className="w-full md:w-80 border-r border-slate-800 overflow-y-auto">
          {loading ? (
            <div className="p-6 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            items.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left p-4 border-b border-slate-800 hover:bg-slate-900/40"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">{r.leave_type}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(r.start_date).toLocaleDateString()} -{' '}
                      {new Date(r.end_date).toLocaleDateString()}
                    </p>
                  </div>

                  <Badge variant="warning">{r.status}</Badge>
                </div>
              </button>
            ))
          )}
        </div>

        {/* RIGHT DETAIL */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-5 text-white">

            {/* HEADER */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSelected(null)}
                className="p-2 bg-slate-800 rounded-lg md:hidden"
              >
                <ArrowLeft size={18} />
              </button>

              <h2 className="font-bold text-lg">Leave Details</h2>
            </div>

            {/* CARD */}
            <div className="bg-slate-900/40 p-5 rounded-2xl mb-6">
              <div className="flex items-center gap-3">
                <Plane className="text-red-500" />
                <div>
                  <p className="font-bold">{selected.leave_type}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(selected.start_date).toDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* ATTACHMENTS */}
            <div className="space-y-3">
              <p className="text-sm font-bold flex items-center gap-2">
                <Paperclip size={14} /> Attachments
              </p>

              {selected.attachments?.map((url: string, i: number) => {
                const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
                const isPdf = /\.pdf$/i.test(url);

                return (
                  <div
                    key={i}
                    onClick={() => openAttachment(url)}
                    className="flex items-center justify-between bg-slate-900/30 p-3 rounded-xl cursor-pointer hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <FileText />
                      <p className="text-sm truncate max-w-[180px]">
                        {url.split('/').pop()}
                      </p>
                    </div>

                    {isImage ? (
                      <span className="text-xs text-green-400">View</span>
                    ) : isPdf ? (
                      <Download size={16} />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* CANCEL BUTTON */}
            {selected.status === 'pending' && (
              <button
                onClick={() => handleCancelRequest(selected.id)}
                disabled={cancelLoading}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                {cancelLoading ? 'Cancelling...' : 'Cancel Request'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* FLOATING IMAGE VIEWER */}
      {preview?.type === 'image' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
          <button
            onClick={() => setPreview(null)}
            className="absolute top-5 right-5 text-white"
          >
            <X />
          </button>

          <img
            src={preview.url}
            className="max-w-[90%] max-h-[85%] rounded-xl shadow-2xl"
          />
        </div>
      )}
    </Modal>
  );
};

export default EmployeeLeaveHistoryModal;
