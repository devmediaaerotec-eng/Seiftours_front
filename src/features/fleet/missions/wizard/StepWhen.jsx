import { useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import Field from '@/components/ui/Field';
import { addDays, addMinutes } from '@/lib/format';
import {
  DAYS, LEG_LABEL, MODES, PRESETS, blank, daysBetween, dm, makeReturn, modeOf, mondayOf,
  occurrenceDates, sameDays, shiftDt,
} from './utils';
import ClientBar from './ClientBar'
/* ---- Aller / Retour / Aller & retour ---- */
function ModeSwitch({ legs }) {
  const { watch, getValues } = useFormContext();
  const mode = modeOf(watch('legs'));

  const change = (m) => {
    if (m === mode) return;
    const all = getValues('legs');
    const first = all[0];
    if (m === 'both') {
      const back = all[1]?.leg === 'retour' ? all[1] : makeReturn(first);
      legs.replace([{ ...first, leg: 'aller' }, { ...back, leg: 'retour' }]);
    } else {
      legs.replace([{ ...first, leg: m }]);
    }
  };

  return (
    <div className="wz-seg" role="tablist" aria-label="Type de trajet">
      {MODES.map(([k, label]) => (
        <button key={k} type="button" role="tab" aria-selected={mode === k} className={mode === k ? 'on' : ''} onClick={() => change(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}



/* ---- Horaires d'une étape ---- */
 function LegTimes({ index, mode, onRemove, canRemove }) {
  const { register, watch, getValues, setValue, formState: { errors } } = useFormContext();
  const name = (k) => `legs.${index}.${k}`;
  const e = errors.legs?.[index];
  const legType = watch(name('leg'));
  const [starts, ends] = watch([name('starts_at'), name('ends_at')]);
  const locked = mode !== 'custom';
  const compact = mode === 'both';
  const mins = starts && ends && ends > starts ? Math.round((new Date(ends) - new Date(starts)) / 60000) : 0;

  const onStart = (ev) => {
    const v = ev.target.value;
    const end = getValues(name('ends_at'));
    if (v && (!end || end <= v)) setValue(name('ends_at'), addMinutes(v, 120), { shouldValidate: true });
    if (index === 0 && locked) {
      const day = v.slice(0, 10);
      (getValues('legs') ?? []).slice(1).forEach((l, k) => {
        if (l.leg === 'retour' && l.starts_at && l.starts_at.slice(0, 10) < day) {
          setValue(`legs.${k + 1}.starts_at`, `${day}${l.starts_at.slice(10)}`);
          setValue(`legs.${k + 1}.ends_at`, `${day}${(l.ends_at || '').slice(10)}`);
        }
      });
    }
  };

  return (
    <div className={`wz-card ${compact ? 'wz-leg-compact' : ''} ${legType === 'retour' ? 'retour' : ''}`}>
      <div className="wz-card-head">
        {locked ? (
          <span className={`wz-badge ${legType === 'retour' ? 'retour' : ''}`}>{LEG_LABEL[legType]}</span>
        ) : (
          <select style={{ width: 'auto' }} {...register(name('leg'))}>
            {Object.entries(LEG_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        )}
        {mins > 0 && <span className="muted">{Math.floor(mins / 60)} h {String(mins % 60).padStart(2, '0')}</span>}
        {canRemove && (
          <button type="button" className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={onRemove}>
            <Trash2 size={14} /> Retirer
          </button>
        )}
      </div>

      
            <div className="wz-row2">
        <Field label="Départ *" error={e?.starts_at}>
          <input type="datetime-local" {...register(name('starts_at'), {
            required: 'Champ requis',
            onChange: onStart,
            validate: (v) => index === 0 || legType !== 'retour' || !getValues('legs.0.starts_at') || v >= getValues('legs.0.starts_at')
              || "Le retour ne peut pas commencer avant l'aller",
          })} />
        </Field>
        <Field label="Arrivée *" error={e?.ends_at}>
          <input type="datetime-local" {...register(name('ends_at'), {
            required: 'Champ requis',
            validate: (v) => !getValues(name('starts_at')) || v > getValues(name('starts_at')) || "L'arrivée doit être après le départ",
          })} />
        </Field>
      </div>

      <div className="wz-row2" style={{ marginTop: 10 }}>
        <Field label="Prise en charge"><input placeholder="Départ" {...register(name('pickup_place'))} /></Field>
        <Field label="Destination"><input placeholder="Arrivée" {...register(name('destination'))} /></Field>
      </div>
    </div>
  );
}
 


/* ---- Aller & retour : Départ / Arrivée alignés, Aller à gauche, Retour à droite ---- */

 function PairedTimes() {
  const { register, getValues, setValue, formState: { errors } } = useFormContext();
  const err = (i, k) => errors.legs?.[i]?.[k];

  const onStart = (i) => (ev) => {
    const v = ev.target.value;
    const end = getValues(`legs.${i}.ends_at`);
    if (v && (!end || end <= v)) setValue(`legs.${i}.ends_at`, addMinutes(v, 120), { shouldValidate: true });
    if (i === 0) {
      const day = v.slice(0, 10);
      const r = getValues('legs.1');
      if (r?.starts_at && r.starts_at.slice(0, 10) < day) {
        setValue('legs.1.starts_at', `${day}${r.starts_at.slice(10)}`);
        setValue('legs.1.ends_at', `${day}${(r.ends_at || '').slice(10)}`);
      }
    }
  };

  // Le retour reprend le trajet de l'aller, inversé
  const syncRoute = () => {
    setValue('legs.1.pickup_place', getValues('legs.0.destination') || '');
    setValue('legs.1.destination', getValues('legs.0.pickup_place') || '');
  };

  const block = (i, label) => (
    <div className={`wz-leg ${i === 1 ? 'retour' : ''}`}>
      <div className="wz-leg-title">{label}</div>
      <div className="wz-leg-row">
        <Field label="Départ *" error={err(i, 'starts_at')}>
          <input type="datetime-local" {...register(`legs.${i}.starts_at`, {
            required: 'Champ requis',
            onChange: onStart(i),
            validate: (v) => i === 0 || !getValues('legs.0.starts_at') || v >= getValues('legs.0.starts_at')
              || "Le retour ne peut pas commencer avant l'aller",
          })} />
        </Field>
        <Field label="Arrivée *" error={err(i, 'ends_at')}>
          <input type="datetime-local" {...register(`legs.${i}.ends_at`, {
            required: 'Champ requis',
            validate: (v) => !getValues(`legs.${i}.starts_at`) || v > getValues(`legs.${i}.starts_at`)
              || "L'arrivée doit être après le départ",
          })} />
        </Field>
      </div>
      <div className="wz-leg-row wz-leg-route">
        <Field label="Prise en charge">
          <input placeholder="Départ" {...register(`legs.${i}.pickup_place`, i === 0 ? { onChange: syncRoute } : {})} />
        </Field>
        <Field label="Destination">
          <input placeholder="Arrivée" {...register(`legs.${i}.destination`, i === 0 ? { onChange: syncRoute } : {})} />
        </Field>
      </div>
    </div>
  );

  return <div className="wz-legs">{block(0, 'Aller')}{block(1, 'Retour')}</div>;
}
/* ---- Répétition ---- */
function Repeat() {
  const { register, watch, setValue, getValues, formState: { errors } } = useFormContext();
  const days = watch('repeat_days') ?? [];
  const until = watch('repeat_until');
  const first = (watch('legs.0.starts_at') || '').slice(0, 10);
  const dates = days.length && first && until ? occurrenceDates(first, until, days) : [];

  /** Décale toutes les étapes sur le lundi de la semaine, sans aller dans le passé. */
  const alignToMonday = () => {
    if (!first) return first;
    const monday = mondayOf(first);
    const today = new Date().toISOString().slice(0, 10);
    const target = monday < today ? today : monday;
    const n = daysBetween(first, target);
    if (n === 0) return first;
    getValues('legs').forEach((l, i) => {
      setValue(`legs.${i}.starts_at`, shiftDt(l.starts_at, n));
      setValue(`legs.${i}.ends_at`, shiftDt(l.ends_at, n));
      (l.assignments ?? []).forEach((a, j) => {
        if (!a.custom) return;
        setValue(`legs.${i}.assignments.${j}.starts_at`, shiftDt(a.starts_at, n));
        setValue(`legs.${i}.assignments.${j}.ends_at`, shiftDt(a.ends_at, n));
      });
    });
    return target;
  };

  const setDays = (list) => {
    setValue('repeat_days', list, { shouldDirty: true });
    if (!list.length) { setValue('repeat_until', ''); return; }
    const base = days.length ? first : alignToMonday();
    if (!until && base) setValue('repeat_until', addDays(base, 6));
  };
  const toggle = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b));

    return (
    <div className="wz-repeat">
      <div className="wz-seg wz-seg-wrap" role="group" aria-label="Fréquence">
        {PRESETS.map(([label, list]) => (
          <button key={label} type="button" className={sameDays(days, list) ? 'on' : ''} onClick={() => setDays(list)}>{label}</button>
        ))}
      </div>

      <div className="wz-weekdays" role="group" aria-label="Jours de la semaine">
        {DAYS.map(([n, label]) => (
          <button key={n} type="button" className={days.includes(n) ? 'on' : ''} aria-pressed={days.includes(n)} onClick={() => toggle(n)}>
            {label}
          </button>
        ))}
      </div>

      {days.length > 0 && (
        <div className="wz-repeat-end">
          <Field label="Jusqu'au *" error={errors.repeat_until}>
            <input type="date" min={first} {...register('repeat_until', {
              validate: (v) => !(getValues('repeat_days') ?? []).length || !!v || 'Choisissez la date de fin',
            })} />
          </Field>
          <div className="wz-repeat-sum">
            {!until ? 'Choisissez la date de fin.'
              : dates.length ? <><strong>{dates.length} jour(s)</strong><span>du {dm(dates[0])} au {dm(dates[dates.length - 1])}</span></>
                : 'Aucun jour ne correspond.'}
            {dates.length > 0 && first && dates[0] !== first && (
              <small>Le {dm(first)} n'est pas dans les jours choisis : ignoré.</small>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Étape 2 ---- */
export default function StepWhen({ legs }) {
  const { watch, getValues } = useFormContext();
  const mode = modeOf(watch('legs'));

  const addLeg = () => {
    const all = getValues('legs');
    const last = all[all.length - 1];
    const day = (last.starts_at || '').slice(0, 10);
    legs.append({
      leg: 'other',
      starts_at: day ? `${day}T16:00` : '', ends_at: day ? `${day}T18:00` : '',
      pickup_place: last.destination, destination: last.pickup_place,
      assignments: [blank()],
    });
  };

  return (
    <>
      <ClientBar />
      <ModeSwitch legs={legs} />
 
     
     {mode === 'both' ? (
  <PairedTimes />
) : (
  <div>
    {legs.fields.map((f, i) => (
      <LegTimes key={f.id} index={i} mode={mode} canRemove={mode === 'custom' && legs.fields.length > 1} onRemove={() => legs.remove(i)} />
    ))}
  </div>
)}
      {mode === 'custom' && (
        <button type="button" className="btn ghost" onClick={addLeg}><Plus size={16} /> Ajouter une étape</button>
      )}

     <h4 className="wz-sub-title">Répétition <span>(optionnelle)</span></h4>
      <Repeat />
    </>
  );
}