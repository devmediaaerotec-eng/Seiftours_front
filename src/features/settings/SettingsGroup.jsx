import { useForm } from 'react-hook-form';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { millimesToTnd, tndToMillimes, fmtDateTime } from '@/lib/format';
import { useSaveSettings } from './resource';

const toForm = (it) => {
  if (it.type === 'rate') return String(Math.round(it.value * 10000) / 100);
  if (it.type === 'millimes') return millimesToTnd(it.value) || '0';
  if (it.type === 'bool') return !!it.value;
  return String(it.value);
};

const toValue = (it, v) => {
  if (it.type === 'rate') return Math.round(Number(String(v).replace(',', '.')) * 100) / 10000;
  if (it.type === 'millimes') return tndToMillimes(v);
  if (it.type === 'bool') return !!v;
  return Number(v);
};

const rules = (it) => {
  if (it.type === 'bool') return {};
  if (it.type === 'rate') {
    return { validate: (v) => (/^\d+([.,]\d{1,2})?$/.test(String(v).trim()) && Number(String(v).replace(',', '.')) <= 100) || 'Pourcentage entre 0 et 100' };
  }
  if (it.type === 'millimes') {
    return { validate: (v) => /^\d+([.,]\d{1,3})?$/.test(String(v).trim()) || 'Montant invalide (ex. 30 ou 30.500)' };
  }
  return { validate: (v) => (/^\d+$/.test(String(v).trim()) && Number(v) >= it.min && Number(v) <= it.max) || `Nombre entier entre ${it.min} et ${it.max}` };
};


const suffix = (it) => (it.type === 'rate' ? '%' : it.type === 'millimes' ? 'TND' : it.unit === 'h' ? 'heures' : it.unit === 'min' ? 'minutes' : it.unit === 'km/h' ? 'km/h' : '');
export default function SettingsGroup({ group }) {
  const toast = useToast();
  const save = useSaveSettings();
  const { register, handleSubmit, setError, reset, formState: { errors, isDirty } } = useForm({
    defaultValues: Object.fromEntries(group.items.map((it) => [it.key.replace('.', '__'), toForm(it)])),
  });
  const field = (it) => it.key.replace('.', '__');          // react-hook-form lit un point comme un niveau d'imbrication

  const submit = handleSubmit(async (v) => {
    const values = Object.fromEntries(group.items.map((it) => [it.key, toValue(it, v[field(it)])]));
    try {
      await save.mutateAsync(values);
      toast.success('Réglages enregistrés.');
      reset(v);
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, m]) => setError(k.replace('.', '__'), { type: 'server', message: m }));
        toast.error('Certaines valeurs sont invalides.');
      } else toast.error(e.message);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="card">
      {group.items.map((it) => (
        <div className="setting-row" key={it.key}>
          <div className="setting-info">
            <strong>{it.label}</strong>
            <small className="muted">{it.description}</small>
            {it.updated_at && <small className="muted">Modifié par {it.updated_by_name || '—'} · {fmtDateTime(it.updated_at)}</small>}
          </div>
          <div className="setting-input">
            {it.type === 'bool' ? (
              <label className="chk"><input type="checkbox" {...register(field(it))} /> Activée</label>
            ) : (
              <Field label="" error={errors[field(it)]}>
                <div className="with-suffix">
                  <input inputMode="decimal" {...register(field(it), rules(it))} />
                  <span>{suffix(it)}</span>
                </div>
              </Field>
            )}
          </div>
        </div>
      ))}
      <div className="modal-actions">
        <button className="btn" disabled={!isDirty || save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}