import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ellipsis } from 'lucide-react';
import { cn } from '@/lib/cn';

/** items = [{ label, icon, onClick, tone: 'danger', disabled, hidden }, { divider: true }] */
export default function ActionMenu({ items, label = 'Actions' }) {
  const list = items.filter((i) => i && !i.hidden);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btn = useRef(null);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const height = list.length * 42 + 20;
      const top = window.innerHeight - r.bottom < height + 12 ? Math.max(8, r.top - height - 6) : r.bottom + 6;
      setPos({ top, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  if (list.length === 0) return null;

  return (
    <>
      <button ref={btn} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions : ${label}`}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-brand-600">
        <Ellipsis className="size-5" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[70] bg-slate-900/40 sm:bg-transparent" onMouseDown={() => setOpen(false)}>
          <div
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ '--t': `${pos.top}px`, '--r': `${pos.right}px` }}
            className="absolute animate-pop overflow-hidden bg-white py-1.5 shadow-xl ring-1 ring-slate-900/10 max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-t-2xl max-sm:pb-[env(safe-area-inset-bottom)] sm:top-(--t) sm:right-(--r) sm:w-64 sm:rounded-xl"
          >
            <p className="truncate px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:hidden">{label}</p>
            {list.map((it, i) => it.divider ? (
              <div key={i} className="my-1.5 h-px bg-slate-100" />
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => { setOpen(false); it.onClick?.(); }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left text-sm disabled:opacity-40 sm:py-2.5',
                  it.tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                {it.icon && <it.icon className="size-4 shrink-0 opacity-70" />}
                {it.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}