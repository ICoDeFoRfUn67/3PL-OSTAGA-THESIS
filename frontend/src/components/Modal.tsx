import { useRef, ReactNode, useEffect } from 'react';
import { X, ArrowLeft } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string | ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  noPadding?: boolean;
  hideCloseButton?: boolean;
}

export const Modal = ({ isOpen, onClose, onBack, title, subtitle, icon, children, size = 'md', noPadding = false, hideCloseButton = false }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-6xl',
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-[#050C1B] text-slate-900 dark:text-white rounded-[32px] shadow-2xl max-h-[90vh] max-md:max-h-[calc(100vh-140px)] flex flex-col min-h-0 w-full relative z-[10000] border border-slate-200/80 dark:border-slate-800/85 transition-all overflow-hidden ${sizeClasses[size]}`}
      >
        {/* Header */}
        <div className="shrink-0 flex justify-between items-start p-6 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#050C1B]">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors shrink-0"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
            )}
            {icon && (
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors shrink-0"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Content — single scroll region */}
        <div className={`flex-1 min-h-0 overflow-y-auto ${noPadding ? 'p-0' : 'p-6'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
