import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props {
  src: string | string[] | null | undefined;
  onClose: () => void;
  initialIndex?: number;
}

export const ImageViewer = ({ src, onClose, initialIndex = 0 }: Props) => {
  const sources = Array.isArray(src) ? src.filter(Boolean) as string[] : (src ? [src] : []);
  const [index, setIndex] = useState(Math.max(0, Math.min(initialIndex, sources.length - 1)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(sources.length - 1, i + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, sources.length]);

  useEffect(() => {
    setIndex(0);
  }, [src]);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-white/95 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-[95vw] max-h-[85vh] flex items-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.max(0, i - 1)); }}
          className="p-2 bg-white border rounded-full shadow"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-[85vw] max-h-[85vh] bg-white rounded-lg overflow-hidden shadow">
            <img
              src={sources[index]}
              alt={`preview-${index}`}
              className="w-full h-full object-contain bg-white"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setIndex((i) => Math.min(sources.length - 1, i + 1)); }}
          className="p-2 bg-white border rounded-full shadow"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Thumbnails */}
      {sources.length > 1 && (
        <div className="mt-4 w-full max-w-[95vw] flex items-center justify-center gap-2 overflow-x-auto px-2" onClick={(e) => e.stopPropagation()}>
          {sources.map((s, i) => (
            <button key={s + i} onClick={() => setIndex(i)} className={`rounded overflow-hidden border ${i === index ? 'ring-2 ring-blue-300' : 'border-gray-200'} bg-white` }>
              <img src={s} alt={`thumb-${i}`} className="w-16 h-12 object-cover" />
            </button>
          ))}
        </div>
      )}

      <button
        className="absolute top-4 right-4 text-gray-800 bg-white p-2 rounded-full border shadow"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
};
