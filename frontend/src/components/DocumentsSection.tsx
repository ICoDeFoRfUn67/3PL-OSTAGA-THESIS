import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';

import {
  Upload,
  Download,
  Trash2,
  FileText,
  Loader2,
  Shield,
  Eye,
} from 'lucide-react';

import toast from 'react-hot-toast';

import type { EmployeeDocument } from '@/types';

import {
  useUploadDocument,
  useDeleteDocument,
} from '@/hooks/useQueries';

import { AttachmentPreviewModal } from './AttachmentPreviewModal';

interface DocumentsSectionProps {
  documents: EmployeeDocument[];
  employeeId: number;
  onUpdate?: () => void;
  readOnly?: boolean;
}

const DocumentsSection = ({
  documents,
  employeeId,
  onUpdate,
  readOnly = false,
}: DocumentsSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'pdf' | 'other' } | null>(null);

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  const handleFileSelect = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    // Validate file size (5MB max)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      return;
    }

    setUploading(true);

    try {
      await uploadMutation.mutateAsync({
        employeeId,
        file: selectedFile,
        fileName: selectedFile.name,
      });

      toast.success('Document uploaded successfully');

      onUpdate?.();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to upload document'
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (docId: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this document?'
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(docId);

      toast.success('Document deleted successfully');

      onUpdate?.();
    } catch (error: any) {
      if (error?.response?.status === 404) {
        toast.success('Document removed');

        onUpdate?.();

        return;
      }

      toast.error(
        error?.response?.data?.message ||
          'Failed to delete document'
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const displaySize = (doc: EmployeeDocument) => {
    return formatFileSize(
      Number(doc.file_size ?? 0) * 1024
    );
  };

  const handleDocumentAction = (doc: EmployeeDocument) => {
    const filename = doc.file_name || '';
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename || doc.file_url || '');
    
    if (isImage) {
      setPreviewFile({
        url: doc.file_url,
        type: 'image'
      });
    } else {
      // Force download for PDF / other formats
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.setAttribute('download', filename);
      link.setAttribute('target', '_blank');
      link.click();
    }
  };

  return (
    <div className="bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/85 rounded-[32px] p-6 shadow-md dark:shadow-xl space-y-6 transition-all">
      {/* Header Card */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-500 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Your Documents</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage and view your employee documents</p>
          </div>
        </div>

        {/* 3D Folder Overlap SVG Graphic */}
        <svg className="w-16 h-16 text-red-600 dark:text-red-500/90 filter drop-shadow-[0_2px_8px_rgba(239,68,68,0.15)] hidden sm:block flex-shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="16" width="36" height="28" rx="6" fill="#fecaca" className="dark:fill-[#450a0a]" stroke="#C41E3A" strokeWidth="2" />
          <rect x="16" y="20" width="36" height="28" rx="6" fill="#fee2e2" className="dark:fill-[#7f1d1d]" stroke="#EF4444" strokeWidth="2" opacity="0.8" />
          <rect x="20" y="24" width="36" height="28" rx="6" fill="#ef4444" className="dark:fill-[#991b1b]" stroke="#F87171" strokeWidth="2" />
          <path d="M38 34L38 42M38 34L35 37M38 34L41 37" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M34 44H42" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        hidden
        disabled={readOnly || uploading}
      />

      {/* Upload Box */}
      {!readOnly && (
        <div
          onClick={() => {
            if (!uploading) fileInputRef.current?.click();
          }}
          className="
            w-full
            py-8
            px-4
            border-2
            border-dashed
            border-slate-200
            dark:border-slate-800
            bg-slate-50
            dark:bg-slate-900/10
            hover:bg-slate-100
            dark:hover:bg-slate-900/30
            hover:border-red-400
            dark:hover:border-red-500/30
            transition-all
            duration-300
            rounded-[24px]
            flex
            flex-col
            items-center
            justify-center
            gap-4
            cursor-pointer
            group
          "
        >
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            {uploading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Upload size={24} />
            )}
          </div>

          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {uploading ? 'Uploading Document...' : 'Upload Document'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag and drop your files here or click to browse
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              PDF <span className="text-red-500">•</span> DOC <span className="text-red-500">•</span> JPG <span className="text-red-500">•</span> PNG <span className="text-red-400 dark:text-red-500 font-semibold">(max 5MB)</span>
            </p>
          </div>

          <button
            type="button"
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#C41E3A] to-[#E53E3E] dark:from-[#8B0000] dark:to-[#C41E3A] hover:brightness-110 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            disabled={uploading}
          >
            <Upload size={16} />
            Choose File
          </button>
        </div>
      )}

      {/* Documents Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {documents?.length ? (
          documents.map((doc, index) => {
            const filename = doc.file_name || '';
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename || doc.file_url || '');
            const isPdf = /\.pdf$/i.test(filename || doc.file_url || '');
            const isDoc = /\.(doc|docx)$/i.test(filename || doc.file_url || '');

            let labelText = 'DOC';
            let bgIconColor = 'bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/20 text-blue-650 dark:text-blue-400';
            let ext = 'docx';

            if (isPdf) {
              labelText = 'PDF';
              bgIconColor = 'bg-red-55 dark:bg-red-500/15 border border-red-200 dark:border-red-500/20 text-red-650 dark:text-red-400';
              ext = 'pdf';
            } else if (isDoc) {
              labelText = 'DOC';
              bgIconColor = 'bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/20 text-blue-650 dark:text-blue-400';
              ext = 'docx';
            } else if (isImage) {
              const imageExt = filename.split('.').pop()?.split('?')[0] || 'jpg';
              labelText = imageExt.toUpperCase();
              bgIconColor = imageExt.toLowerCase() === 'png' 
                ? 'bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/20 text-purple-650 dark:text-purple-400' 
                : 'bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/20 text-emerald-650 dark:text-emerald-400';
              ext = imageExt;
            }

            return (
              <div
                key={doc.id ?? index}
                onClick={() => handleDocumentAction(doc)}
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
                  transition-all
                  hover:border-slate-350
                  dark:hover:border-slate-700
                  cursor-pointer
                  group
                  shadow-sm
                "
              >
                {/* Left */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center flex-shrink-0 ${bgIconColor}`}>
                    <span className="text-[8px] font-black tracking-tighter leading-none mb-0.5">{labelText}</span>
                    <FileText size={14} className="mt-0.5" />
                  </div>

                  <div className="min-w-0 text-left">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                      {filename.length > 18 ? filename.substring(0, 15) + '...' + ext : filename}
                    </p>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                      <span>{displaySize(doc)}</span>
                      <span className="text-red-500 font-bold">•</span>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </p>
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isImage ? (
                    <button
                      type="button"
                      onClick={() => setPreviewFile({ url: doc.file_url, type: 'image' })}
                      className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all"
                      title="Preview Image"
                    >
                      <Eye size={18} />
                    </button>
                  ) : (
                    <a
                      href={doc.file_url}
                      download={filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all"
                      title="Download Document"
                    >
                      <Download size={18} />
                    </a>
                  )}

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(Number(doc.id))}
                      className="
                        p-2
                        rounded-xl
                        hover:bg-red-100
                        dark:hover:bg-red-500/15
                        text-red-500
                        border
                        border-transparent
                        hover:border-red-200
                        dark:hover:border-red-500/40
                        transition-all
                      "
                      title="Delete Document"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/15 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
            <p className="text-slate-500 text-sm font-semibold">
              No documents uploaded yet.
            </p>
          </div>
        )}
      </div>

      {/* Secure Storage Info */}
      <div className="rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-650 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield size={18} />
        </div>
        <div className="space-y-0.5 text-left">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Secure Storage</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            Your documents are securely stored and only visible to authorized personnel.
          </p>
        </div>
      </div>

      {previewFile && (
        <AttachmentPreviewModal
          url={previewFile.url}
          type={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default DocumentsSection;