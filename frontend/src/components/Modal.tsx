import { useRef, ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  noPadding?: boolean;
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md', noPadding = false }: ModalProps) => {
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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-[#050C1B] text-slate-900 dark:text-white rounded-[32px] shadow-2xl max-h-[90vh] flex flex-col min-h-0 w-full relative z-[9999] border border-slate-200/80 dark:border-slate-800/85 transition-all overflow-hidden ${sizeClasses[size]}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#050C1B]">
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
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
