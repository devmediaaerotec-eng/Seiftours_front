import { useForm } from 'react-hook-form';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { fmtRange, toInputDT } from '@/lib/format';
import AssignmentFields from './AssignmentFields';
import { useAvailability, useMission, useMissionControl, useMissionOptions } from './resource';

const RESULTS = [
  { value: 'as_planned', label: 'Effectuée comme prévu', hint: 'La mission s\'est déroulée selon le programme.' },
  { value: 'modified',   label: 'Effectuée avec modification', hint: 'Chauffeur, bus, horaires ou lieux différents du programme.' },
  { value: 'not_done',   label: 'Non effectuée', hint: 'La mission n\'a pas eu lieu (précisez pourquoi).' },
  { value: 'cancelled',  label: 'Annulée', hint: 'Annulée par le client ou par l\'agence.' },
];

export default function ControlForm({ id, onDone, onCancel }) {
  const detail = useMission(id);
  if (detail.isLoading) return <div className="center">Chargement…</div>;
  if (detail.error) return <div className="alert bad">{detail.error.message}</div>;
  return <ControlBody m={detail.data.mission} onDone={onDone} onCancel={onCancel} />;
}

function ControlBody({ m, onDone, onCancel }) {
  const toast = useToast();
  const control = useMissionControl();
  const options = useMissionOptions();

  const original = {
    driver_id: String(m.driver_id), bus_id: String(m.bus_id),
    starts_at: toInputDT(m.starts_at), ends_at: toInputDT(m.ends_at),
    pickup_place: m.pickup_place ?? '', destination: m.destination ?? '',
  };
  const {
    register, handleSubmit, watch, getValues, setError, formState: { errors },
  } = useForm({ defaultValues: { result: 'as_planned', note: '', ...original } });

  const result = watch('result');
  const [starts, ends] = watch(['starts_at', 'ends_at']);
  const availability = useAvailability(result === 'modified' ? starts : '', result === 'modified' ? ends : '', m.id);

  const submit = handleSubmit(async (v) => {
    const body = { result: v.result, note: v.note.trim() };
    if (v.result === 'modified') {
      const changes = Object.fromEntries(
        Object.keys(original)
          .filter((k) => String(v[k]) !== String(original[k]))
          .map((k) => [k, k.endsWith('_id') ? Number(v[k]) : v[k]])
      );
      if (!Object.keys(changes).length) {
        setError('result', { type: 'manual', message: 'Modifiez au moins un élément (chauffeur, bus, horaires ou lieux).' });
        return;
      }
      body.changes = changes;
    }
    try {
      const res = await control.mutateAsync({ id: m.id, ...body });
      (res.warnings ?? []).forEach((w) => toast.warn(w));
      toast.success('Contrôle enregistré.');
      onDone();
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, msg]) => setError(k === 'changes' ? 'result' : k, { type: 'server', message: msg }));
      } else {
        toast.error(e.message);
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="card" style={{ background: '#f8fafb' }}>
        <strong>{m.title}</strong> <small className="muted">· {m.reference}</small><br />
        <span className="muted">{fmtRange(m.starts_at, m.ends_at)} · {m.driver_name} · Bus {m.bus_code}</span>
      </div>

      <div className="opt-list">
        {RESULTS.map((o) => (
          <label key={o.value} className={`opt ${result === o.value ? 'on' : ''}`}>
            <input type="radio" value={o.value} {...register('result')} />
            <span><strong>{o.label}</strong><small>{o.hint}</small></span>
          </label>
        ))}
      </div>
      {errors.result && <small className="field-error">{errors.result.message}</small>}

      {result === 'modified' && (
        <>
          <h4 className="form-section">Ce qui a changé</h4>
          {availability.isFetching && <small className="muted">Vérification des disponibilités…</small>}
          <div className="form-grid">
            <AssignmentFields register={register} errors={errors} options={options.data} busy={availability.data} />
            <Field label="Début réel" error={errors.starts_at}><input type="datetime-local" {...register('starts_at', { required: 'Champ requis' })} /></Field>
            <Field label="Fin réelle" error={errors.ends_at}>
              <input type="datetime-local" {...register('ends_at', {
                required: 'Champ requis',
                validate: (v) => v > getValues('starts_at') || 'La fin doit être après le début',
              })} />
            </Field>
            <Field label="Lieu de prise en charge" error={errors.pickup_place}><input {...register('pickup_place')} /></Field>
            <Field label="Destination" error={errors.destination}><input {...register('destination')} /></Field>
          </div>
        </>
      )}

      <Field label={result === 'as_planned' ? 'Remarque (optionnelle)' : 'Raison / remarque *'} error={errors.note} className="spaced">
        <textarea rows="3" placeholder={result === 'modified' ? 'Ex. Bus remplacé suite à une panne, départ retardé de 30 min…' : ''}
                  {...register('note', {
                    validate: (v) => getValues('result') === 'as_planned' || v.trim().length >= 3 || 'Précisez la raison (3 caractères minimum)',
                  })} />
      </Field>

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={control.isPending}>{control.isPending ? 'Enregistrement…' : 'Enregistrer le contrôle'}</button>
      </div>
    </form>
  );
}