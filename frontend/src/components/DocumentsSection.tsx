import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';

import {
  Upload,
  Download,
  Trash2,
  FileText,
  Loader2,
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
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <FileText
              size={20}
              className="text-[#8B0000]"
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-800">
            IDs, Certificates, etc.
          </h3>
        </div>
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

      {/* Upload Button */}
      {!readOnly && (
        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
          }}
          disabled={uploading}
          className="
            w-full
            py-8
            border-2
            border-dashed
            border-gray-200
            rounded-xl
            hover:border-[#8B0000]
            hover:bg-red-50/30
            transition-all
            duration-300
            flex
            flex-col
            items-center
            justify-center
            gap-2
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {uploading ? (
            <Loader2
              size={24}
              className="animate-spin text-[#8B0000]"
            />
          ) : (
            <Upload
              size={24}
              className="text-gray-400"
            />
          )}

          <span className="text-sm text-gray-500 font-medium">
            {uploading
              ? 'Uploading...'
              : 'Click to upload document'}
          </span>

          <span className="text-xs text-gray-400">
            PDF, DOC, JPG, PNG (max 5MB)
          </span>
        </button>
      )}

      {/* Documents List */}
      <div className="mt-4 space-y-3">
        {documents?.length ? (
          documents.map((doc, index) => (
            <div
              key={doc.id ?? index}
              className="
                flex
                items-center
                justify-between
                p-3
                bg-gray-50
                rounded-xl
                border
                border-gray-100
              "
            >
              {/* Left */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FileText
                    size={18}
                    className="text-[#8B0000]"
                  />
                </div>

                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">
                    {doc.file_name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {displaySize(doc)} •{' '}
                    {new Date(
                      doc.uploaded_at
                    ).toLocaleDateString()}
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
                    p-2
                    rounded-lg
                    hover:bg-gray-200
                    transition-colors
                  "
                >
                  <Download
                    size={18}
                    className="text-gray-600"
                  />
                </a>

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(Number(doc.id))
                    }
                    className="
                      p-2
                      rounded-lg
                      hover:bg-red-100
                      transition-colors
                    "
                  >
                    <Trash2
                      size={18}
                      className="text-red-500"
                    />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-500 text-sm">
              No documents uploaded
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsSection;