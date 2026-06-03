import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';

import {
  Upload,
  Download,
  Trash2,
  FileText,
  Loader2,
  Shield,
} from 'lucide-react';

import toast from 'react-hot-toast';

import type { EmployeeDocument } from '@/types';

import {
  useUploadDocument,
  useDeleteDocument,
} from '@/hooks/useQueries';

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

  return (
    <div className="bg-[#090F1D] border border-slate-800/85 rounded-[32px] p-6 shadow-xl space-y-6">
      {/* Header Card */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">Your Documents</h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage and view your employee documents</p>
          </div>
        </div>

        {/* 3D Folder Overlap SVG Graphic */}
        <svg className="w-16 h-16 text-red-500/90 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.2)] hidden sm:block flex-shrink-0" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="12" y="16" width="36" height="28" rx="6" fill="#450a0a" stroke="#C41E3A" strokeWidth="2" />
          <rect x="16" y="20" width="36" height="28" rx="6" fill="#7f1d1d" stroke="#EF4444" strokeWidth="2" opacity="0.8" />
          <rect x="20" y="24" width="36" height="28" rx="6" fill="#991b1b" stroke="#F87171" strokeWidth="2" />
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
            border-slate-800
            bg-slate-900/10
            hover:bg-slate-900/30
            hover:border-red-500/30
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
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center group-hover:scale-105 transition-transform">
            {uploading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Upload size={24} />
            )}
          </div>

          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-white">
              {uploading ? 'Uploading Document...' : 'Upload Document'}
            </h4>
            <p className="text-xs text-slate-400">
              Drag and drop your files here or click to browse
            </p>
            <p className="text-xs text-slate-500">
              PDF <span className="text-red-500">•</span> DOC <span className="text-red-500">•</span> JPG <span className="text-red-500">•</span> PNG <span className="text-red-400 font-semibold">(max 5MB)</span>
            </p>
          </div>

          <button
            type="button"
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#8B0000] to-[#C41E3A] hover:from-[#7A0000] hover:to-[#B31A33] text-white font-bold text-sm flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            disabled={uploading}
          >
            <Upload size={16} />
            Choose File
          </button>
        </div>
      )}

      {/* Documents List */}
      <div className="space-y-3">
        {documents?.length ? (
          documents.map((doc, index) => (
            <div
              key={doc.id ?? index}
              className="
                flex
                items-center
                justify-between
                p-4
                bg-[#0d1527]/30
                border
                border-slate-800/80
                rounded-2xl
                transition-all
                hover:border-slate-700
              "
            >
              {/* Left */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-900/25 text-red-500 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-slate-200 text-sm truncate">
                    {doc.file_name}
                  </p>

                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                    <span>{displaySize(doc)}</span>
                    <span className="text-red-500 font-bold">•</span>
                    <span>{new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    p-2.5
                    rounded-xl
                    hover:bg-white/5
                    text-slate-400
                    hover:text-white
                    transition-all
                  "
                >
                  <Download size={18} />
                </a>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(Number(doc.id))}
                    className="
                      p-2.5
                      rounded-xl
                      hover:bg-red-500/15
                      text-red-500
                      border
                      border-red-500/20
                      hover:border-red-500/40
                      transition-all
                    "
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center bg-slate-900/15 border border-dashed border-slate-800/80 rounded-2xl">
            <p className="text-slate-500 text-sm">
              No documents uploaded yet.
            </p>
          </div>
        )}
      </div>

      {/* Secure Storage Info */}
      <div className="rounded-2xl bg-blue-950/20 border border-blue-900/30 p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield size={18} />
        </div>
        <div className="space-y-0.5 text-left">
          <h4 className="text-sm font-bold text-white">Secure Storage</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your documents are securely stored and only visible to authorized personnel.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentsSection;