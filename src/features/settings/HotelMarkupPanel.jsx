import { useState } from 'react';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useHotelMarkup, useSaveHotelMarkup } from './resource';

const SAMPLE = 250; // prix fournisseur d'exemple, en DT

export default function HotelMarkupPanel() {
  const { data, isLoading, error } = useHotelMarkup();
  const save = useSaveHotelMarkup();
  const toast = useToast();
  const [input, setInput] = useState(null); // null = pas encore édité → on suit la valeur serveur

  if (isLoading) return <div className="center">Chargement…</div>;
  if (error) return <div className="alert bad">{error.message}</div>;

  const current = Number(data?.percent ?? 0);
  const raw = input ?? String(current);
  const parsed = Number(String(raw).replace(',', '.'));
  const valid = /^\d+([.,]\d{1,2})?$/.test(String(raw).trim()) && parsed >= 0 && parsed <= 100;
  const final = valid ? Math.round(SAMPLE * (1 + parsed / 100)) : null;
  const dirty = valid && parsed !== current;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    try {
      await save.mutateAsync(parsed);
      setInput(null);
      toast.success('Marge enregistrée.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card">
      <div className="setting-row">
        <div className="setting-info">
          <strong>Marge agence sur les prix MyGo</strong>
          <small className="muted">
            Pourcentage ajouté au prix fournisseur pour obtenir le prix de vente affiché au client.
            Appliqué partout (cartes, détail hôtel, offres, demandes de réservation). Les réservations déjà
            envoyées gardent leur prix.
          </small>
        </div>
        <div className="setting-input">
          <Field label="" error={!valid ? { message: 'Marge entre 0 et 100 %' } : undefined}>
            <div className="with-suffix">
              <input inputMode="decimal" value={raw} onChange={(e) => setInput(e.target.value)} />
              <span>%</span>
            </div>
          </Field>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <strong>Exemple</strong>
          <small className="muted">
            Prix fournisseur {SAMPLE} DT
            {final != null && <> → marge {final - SAMPLE} DT → <strong>prix client {final} DT</strong></>}
          </small>
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn" disabled={!dirty || save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}
