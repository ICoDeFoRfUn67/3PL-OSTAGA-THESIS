import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Loader2,
  Eye,
  ScanLine,
  CreditCard,
  CheckCircle,
  Plus,
  Shield,
  Car,
  HeartPulse,
  Building,
  Hash,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { EmployeeDocument } from '@/types';
import { useUploadDocument, useDeleteDocument } from '@/hooks/useQueries';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { IDScanner } from './IDScanner';
import { useAuth } from '@/hooks/useAuth';

/* ─── Philippine ID Category Definitions ────────────────── */
export interface IDCategory {
  key: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  badgeBg: string;
  badgeText: string;
  matchKeys: string[];
}

export const PHILIPPINE_ID_CATEGORIES: IDCategory[] = [
  {
    key: 'pagibig_id',
    title: 'Pag-IBIG ID',
    subtitle: 'Pag-IBIG Loyalty Card Plus / Member ID',
    icon: Building,
    color: 'from-amber-500 to-orange-600',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    badgeText: 'Pag-IBIG',
    matchKeys: ['pagibig', 'pag-ibig', 'pag_ibig', 'loyalty'],
  },
  {
    key: 'license',
    title: "Driver's License",
    subtitle: 'LTO Professional / Non-Professional Driver License',
    icon: Car,
    color: 'from-blue-600 to-indigo-700',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    badgeText: "Driver's License",
    matchKeys: ['license', 'driver', 'lto'],
  },
  {
    key: 'national_id',
    title: 'National ID (PhilSys)',
    subtitle: 'Philippine Identification Card / ePhilID',
    icon: Shield,
    color: 'from-emerald-600 to-teal-700',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    badgeText: 'National ID',
    matchKeys: ['national', 'philsys', 'ephilid'],
  },
  {
    key: 'philhealth_id',
    title: 'PhilHealth ID',
    subtitle: 'PhilHealth Member Identification Card',
    icon: HeartPulse,
    color: 'from-green-600 to-emerald-700',
    badgeBg: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    badgeText: 'PhilHealth',
    matchKeys: ['philhealth', 'phic'],
  },
  {
    key: 'sss_id',
    title: 'SSS / UMID Card',
    subtitle: 'Social Security System / Unified Multi-Purpose ID',
    icon: CreditCard,
    color: 'from-cyan-600 to-blue-700',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
    badgeText: 'SSS / UMID',
    matchKeys: ['sss', 'umid'],
  },
  {
    key: 'tin_id',
    title: 'TIN ID',
    subtitle: 'Bureau of Internal Revenue (BIR) Tax ID Card',
    icon: Hash,
    color: 'from-purple-600 to-violet-700',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    badgeText: 'TIN ID',
    matchKeys: ['tin', 'bir'],
  },
  {
    key: 'document',
    title: 'Company & General Documents',
    subtitle: 'Contracts, Resumes, Clearances, and Certifications',
    icon: FileText,
    color: 'from-slate-600 to-gray-800',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
    badgeText: 'Documents',
    matchKeys: ['document', 'resume', 'contract', 'clearance', 'other'],
  },
];

interface DocumentsSectionProps {
  documents: EmployeeDocument[];
  employeeId: number;
  onUpdate?: () => void;
  readOnly?: boolean;
}

export const DocumentsSection = ({
  documents = [],
  employeeId,
  onUpdate,
  readOnly = false,
}: DocumentsSectionProps) => {
  const { isAdmin, isHR } = useAuth();
  const isStaffOrAdmin = isAdmin || isHR;

  const [activeUploadCategory, setActiveUploadCategory] = useState<string | null>(null);
  const [scannerCategory, setScannerCategory] = useState<string | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: 'image' | 'pdf' | 'other' } | null>(null);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  /* Helper to classify a document into a category */
  const getDocumentCategoryKey = (doc: EmployeeDocument): string => {
    const rawType = (doc.document_type || '').toLowerCase();
    const rawName = (doc.file_name || '').toLowerCase();

    for (const cat of PHILIPPINE_ID_CATEGORIES) {
      if (cat.key === rawType) return cat.key;
      for (const match of cat.matchKeys) {
        if (rawType.includes(match) || rawName.includes(match)) {
          return cat.key;
        }
      }
    }
    return 'document';
  };

  /* Group documents by category */
  const groupedDocuments = PHILIPPINE_ID_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = documents.filter((d) => getDocumentCategoryKey(d) === cat.key);
    return acc;
  }, {} as Record<string, EmployeeDocument[]>);

  /* Total count */
  const totalCount = documents.length;

  const handleFileSelect = async (categoryKey: string, event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      if (fileInputRefs.current[categoryKey]) fileInputRefs.current[categoryKey]!.value = '';
      return;
    }

    setUploadingCategory(categoryKey);

    const categoryObj = PHILIPPINE_ID_CATEGORIES.find((c) => c.key === categoryKey);
    const categoryTitle = categoryObj ? categoryObj.title : 'Document';

    try {
      await uploadMutation.mutateAsync({
        employeeId,
        file: selectedFile,
        fileName: `${categoryTitle}_${selectedFile.name}`,
        documentType: categoryKey,
      });

      toast.success(`${categoryTitle} uploaded successfully!`);
      onUpdate?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploadingCategory(null);
      if (fileInputRefs.current[categoryKey]) fileInputRefs.current[categoryKey]!.value = '';
    }
  };

  const handleScanComplete = async (frontFile: File, backFile: File, categoryKey: string) => {
    const categoryObj = PHILIPPINE_ID_CATEGORIES.find((c) => c.key === categoryKey);
    const categoryTitle = categoryObj ? categoryObj.title : 'ID';

    try {
      await uploadMutation.mutateAsync({
        employeeId,
        file: frontFile,
        fileName: `${categoryTitle}_Front.jpg`,
        documentType: categoryKey,
      });
      await uploadMutation.mutateAsync({
        employeeId,
        file: backFile,
        fileName: `${categoryTitle}_Back.jpg`,
        documentType: categoryKey,
      });

      toast.success(`${categoryTitle} (Front & Back) scanned and uploaded!`);
      onUpdate?.();
    } catch (err: any) {
      toast.error('Failed to save scanned ID');
    } finally {
      setScannerCategory(null);
    }
  };

  const handleDelete = async (docId: number, docName?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${docName ? `"${docName}"` : 'this document'}?`
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(docId);
      toast.success('Document deleted successfully');
      onUpdate?.();
    } catch (err: any) {
      if (err?.response?.status === 404) {
        toast.success('Document removed');
        onUpdate?.();
        return;
      }
      toast.error(err?.response?.data?.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const displaySize = (doc: EmployeeDocument) => {
    return formatFileSize(Number(doc.file_size ?? 0) * 1024);
  };

  const handleDocumentAction = (doc: EmployeeDocument) => {
    const filename = doc.file_name || '';
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename || doc.file_url || '');

    if (isImage) {
      setPreviewFile({
        url: doc.file_url,
        type: 'image',
      });
    } else {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.setAttribute('download', filename);
      link.setAttribute('target', '_blank');
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500">
            <FileText size={22} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Documents & Philippine IDs
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {totalCount} Total
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Government IDs and uploaded records organized by card type
            </p>
          </div>
        </div>

        {/* Action Button to trigger Scanner / Upload for any ID */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScannerCategory('pagibig_id')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <ScanLine size={15} />
              Scan Physical ID
            </button>
          </div>
        )}
      </div>

      {/* ── Separate Category Containers ── */}
      <div className="space-y-5">
        {PHILIPPINE_ID_CATEGORIES.map((category) => {
          const categoryDocs = groupedDocuments[category.key] || [];
          const hasDocs = categoryDocs.length > 0;
          const isUploadingThis = uploadingCategory === category.key;
          const IconComp = category.icon;

          return (
            <div
              key={category.key}
              className="bg-white dark:bg-[#090F1D] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Category Container Header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-white shadow-xs`}>
                    <IconComp size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {category.title}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${category.badgeBg}`}>
                        {categoryDocs.length} {categoryDocs.length === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {category.subtitle}
                    </p>
                  </div>
                </div>

                {/* Container Actions: Scan or Upload specifically into this container */}
                {!readOnly && (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => setScannerCategory(category.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all active:scale-95"
                    >
                      <ScanLine size={13} className="text-blue-500" />
                      <span>Scan ID</span>
                    </button>
                    <button
                      onClick={() => fileInputRefs.current[category.key]?.click()}
                      disabled={isUploadingThis}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isUploadingThis ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                      <span>Upload</span>
                    </button>
                  </div>
                )}

                {/* Hidden File Input for this Category */}
                <input
                  ref={(el) => (fileInputRefs.current[category.key] = el)}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileSelect(category.key, e)}
                  hidden
                  disabled={readOnly || isUploadingThis}
                />
              </div>

              {/* Category Container Body */}
              <div className="p-4 md:p-5">
                {hasDocs ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryDocs.map((doc, idx) => {
                      const filename = doc.file_name || '';
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename || doc.file_url || '');
                      const isPdf = /\.pdf$/i.test(filename || doc.file_url || '');

                      return (
                        <div
                          key={doc.id ?? idx}
                          onClick={() => handleDocumentAction(doc)}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 hover:border-blue-300 dark:hover:border-blue-600/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer group shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Thumbnail or File Icon */}
                            {isImage && doc.file_url ? (
                              <div className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 bg-white dark:bg-slate-800">
                                <img src={doc.file_url} alt="ID" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <span className="text-[9px] font-black">{isPdf ? 'PDF' : 'DOC'}</span>
                                <FileText size={16} />
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                {filename}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <span>{displaySize(doc)}</span>
                                <span>•</span>
                                <span>
                                  {doc.uploaded_at
                                    ? new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })
                                    : 'Saved'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                            {isImage ? (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({ url: doc.file_url, type: 'image' })}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                title="Preview"
                              >
                                <Eye size={15} />
                              </button>
                            ) : (
                              <a
                                href={doc.file_url}
                                download={filename}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                                title="Download"
                              >
                                <Download size={15} />
                              </a>
                            )}

                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => handleDelete(Number(doc.id), filename)}
                                className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty state for this specific container */
                  <div className="py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/20">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      No {category.title} uploaded yet. Click <span className="font-semibold text-slate-600 dark:text-slate-300">Scan ID</span> or <span className="font-semibold text-slate-600 dark:text-slate-300">Upload</span> above to add.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {previewFile && (
        <AttachmentPreviewModal
          url={previewFile.url}
          type={previewFile.type}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* ID Scanner Modal with Selected Category */}
      {scannerCategory && (
        <IDScanner
          initialCategoryKey={scannerCategory}
          onScanComplete={(frontFile, backFile, chosenKey) =>
            handleScanComplete(frontFile, backFile, chosenKey || scannerCategory)
          }
          onClose={() => setScannerCategory(null)}
        />
      )}
    </div>
  );
};

export default DocumentsSection;