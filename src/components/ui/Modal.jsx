import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-4xl' };

export default function Modal({ title, onClose, children, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'flex max-h-[92dvh] w-full animate-sheet flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-slate-900/5',
          'sm:max-h-[90dvh] sm:animate-pop sm:rounded-2xl sm:pb-0',
          SIZES[size] ?? SIZES.md
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5 sm:px-6 sm:py-4">
          <h3 className="truncate text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}