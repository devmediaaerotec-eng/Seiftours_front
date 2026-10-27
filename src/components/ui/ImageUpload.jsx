import { useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { assetUrl } from '@/lib/format';
import { uploadFile } from '@/lib/http';
import Button from './Button';

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 8 * 1024 * 1024;

export function checkImage(file) {
  if (!IMAGE_ACCEPT.split(',').includes(file.type)) return 'Format non accepté (JPEG, PNG ou WebP).';
  if (file.size > MAX_BYTES) return 'Image trop lourde (8 Mo maximum).';
  return null;
}

// variant : 'cover' (image large) ou 'avatar' (photo ronde)
export default function ImageUpload({ value, onChange, folder = 'trips', variant = 'cover' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const avatar = variant === 'avatar';

  const pick = async (file) => {
    if (!file) return;
    const problem = checkImage(file);
    if (problem) { setError(problem); return; }
    setError('');
    setBusy(true);
    try {
      const { url } = await uploadFile('/admin/uploads', file, { folder });
      onChange(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      {value ? (
        <div className={cn('flex gap-4', avatar ? 'items-center' : 'flex-col items-start')}>
          <img src={assetUrl(value)} alt="Aperçu"
               className={cn('border border-slate-200 object-cover', avatar ? 'size-24 rounded-full' : 'max-h-56 w-full max-w-sm rounded-xl')} />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={Upload} loading={busy} onClick={() => input.current?.click()}>Remplacer</Button>
            <Button size="sm" variant="ghost" icon={Trash2} disabled={busy} onClick={() => onChange('')}>Retirer</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          className={cn(
            'flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 text-sm transition',
            avatar ? 'py-5' : 'py-8',
            drag ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-slate-50/60 text-slate-500 hover:border-brand-400 hover:bg-brand-50/50'
          )}
        >
          <ImagePlus className="size-6" />
          <span className="font-medium">{busy ? 'Envoi en cours…' : 'Cliquez ou glissez une image ici'}</span>
          <span className="text-xs text-slate-400">JPEG, PNG ou WebP · 8 Mo maximum</span>
        </button>
      )}
      <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0])} />
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}