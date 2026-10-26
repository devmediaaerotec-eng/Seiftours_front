import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { uploadFile } from '@/lib/http';
import { assetUrl } from '@/lib/format';

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
    <div className={`upload upload-${variant}`}>
      {value ? (
        <div className="upload-preview">
          <img src={assetUrl(value)} alt="Aperçu" />
          <div className="row-tools">
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? 'Envoi…' : 'Remplacer'}
            </button>
            <button type="button" className="btn ghost sm" disabled={busy} onClick={() => onChange('')}>Retirer</button>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone ${drag ? 'drag' : ''}`}
          onClick={() => !busy && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        >
          <ImagePlus size={22} />
          <span>{busy ? 'Envoi en cours…' : 'Cliquez ou glissez une image ici'}</span>
          <small className="muted">JPEG, PNG ou WebP · 8 Mo maximum</small>
        </div>
      )}
      <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0])} />
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}