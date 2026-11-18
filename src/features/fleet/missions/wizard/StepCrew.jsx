import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import Field from '@/components/ui/Field';
import { BUS_TYPE, DRIVER_STATUS } from '../../shared/status';
import { useAvailability } from '../resource';
import { LEG_LABEL, blank, dm, hm, when,modeOf } from './utils';
 import ClientBar from './ClientBar';
function NoteField({ j, name }) {
  const { register, watch } = useFormContext();
  const value = watch(name(`assignments.${j}.note`));
  const [open, setOpen] = useState(false);
  if (!open && !value) {
    return <div className="wz-full"><button type="button" className="wz-link" onClick={() => setOpen(true)}>+ Zone de ramassage</button></div>;
  }
  return (
    <div className="wz-full">
      <Field label="Zone de ramassage">
        <input placeholder="Ex. Monastir" maxLength={190} {...register(name(`assignments.${j}.note`))} />
      </Field>
    </div>
  );
}

function LegCrew({ index, options }) {
  const { register, watch, getValues, setValue, control, formState: { errors } } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray({ control, name: `legs.${index}.assignments` });
  const name = (k) => `legs.${index}.${k}`;
  const e = errors.legs?.[index];

  const legType = watch(name('leg'));
  const [starts, ends] = watch([name('starts_at'), name('ends_at')]);
  const repeating = (watch('repeat_days') ?? []).length > 0;
  const busy = useAvailability(starts, ends).data ?? {};
  const drivers = options?.drivers ?? [];
  const buses = options?.buses ?? [];

  const onDriver = (j) => (ev) => {
    const d = drivers.find((x) => String(x.id) === ev.target.value);
    if (d?.assigned_bus_id && !getValues(name(`assignments.${j}.bus_id`))) {
      setValue(name(`assignments.${j}.bus_id`), String(d.assigned_bus_id), { shouldValidate: true });
    }
  };

  const onCustom = (j) => (ev) => {
    const p = name(`assignments.${j}`);
    setValue(`${p}.starts_at`, ev.target.checked ? getValues(name('starts_at')) : '');
    setValue(`${p}.ends_at`, ev.target.checked ? getValues(name('ends_at')) : '');
  };

  const copyFromFirst = () => {
    const src = (getValues('legs.0.assignments') ?? []).map((a) => ({
      ...blank(), driver_id: a.driver_id, alt_driver_id: a.alt_driver_id, bus_id: a.bus_id, note: a.note,
    }));
    if (src.length) replace(src);
  };

  return (
    <div className={`wz-card ${legType === 'retour' ? 'retour' : ''}`}>
      <div className="wz-card-head">
        <span className={`wz-badge ${legType === 'retour' ? 'retour' : ''}`}>{LEG_LABEL[legType]}</span>
        <span className="muted">{starts ? `${dm(starts)} · ${hm(starts.replace('T', ' '))} → ${hm(ends?.replace('T', ' '))}` : ''}</span>
        {index > 0 && (
          <button type="button" className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={copyFromFirst}>
            Mêmes chauffeurs que l'aller
          </button>
        )}
      </div>

      {fields.map((f, j) => {
        const a = e?.assignments?.[j];
        const custom = watch(name(`assignments.${j}.custom`));
        return (
          <div className="wz-crew" key={f.id}>
            <div className="wz-crew-head">
              <span className="wz-crew-n">{j + 1}</span>
              <strong>Chauffeur {j + 1}</strong>
              {fields.length > 1 && (
                <button type="button" className="wz-icon" aria-label="Retirer ce chauffeur" onClick={() => remove(j)}><Trash2 size={15} /></button>
              )}
            </div>

            <div className="wz-stack">
              <Field label="Chauffeur *" error={a?.driver_id}>
                <select {...register(name(`assignments.${j}.driver_id`), { required: 'Choisissez un chauffeur', onChange: onDriver(j) })}>
                  <option value="">Choisir…</option>
                  {drivers.map((d) => {
                    const b = busy.drivers?.[d.id];
                    return (
                      <option key={d.id} value={String(d.id)}>
                        {d.full_name}{d.status !== 'active' ? ` (${DRIVER_STATUS[d.status]?.label})` : ''}{b ? ` — ⚠ déjà : ${when(b)}` : ''}
                      </option>
                    );
                  })}
                </select>
              </Field>

              <Field label="Bus *" error={a?.bus_id}>
                <select {...register(name(`assignments.${j}.bus_id`), {
                  required: 'Choisissez un bus',
                  validate: (v) => (getValues(name('assignments')) ?? [])
                    .filter((x, k) => k !== j && x.bus_id === v && !x.custom && !getValues(name(`assignments.${j}.custom`))).length === 0
                    || 'Ce bus est déjà dans cette étape',
                })}>
                  <option value="">Choisir…</option>
                  {buses.map((b) => {
                    const o = busy.buses?.[b.id];
                    return (
                      <option key={b.id} value={String(b.id)} disabled={!!o}>
                        {b.plate_number} · {BUS_TYPE[b.bus_type]?.label} · {b.seats} pl.
                        {b.status === 'maintenance' ? ' — maintenance' : b.status === 'out_of_service' ? ' — hors service' : ''}
                        {o ? ` — occupé : ${when(o)}` : ''}
                      </option>
                    );
                  })}
                </select>
              </Field>

              {repeating && (
                <div className="wz-full">
                  <Field label="Alterne avec (1 jour sur 2)" error={a?.alt_driver_id} hint="Optionnel : « Lotfi ou Ayoub ».">
                    <select {...register(name(`assignments.${j}.alt_driver_id`), {
                      validate: (v) => !v || v !== getValues(name(`assignments.${j}.driver_id`)) || 'Doit être un autre chauffeur',
                    })}>
                      <option value="">— Aucun —</option>
                      {drivers.map((d) => <option key={d.id} value={String(d.id)}>{d.full_name}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              <NoteField j={j} name={name} />

              {fields.length > 1 && (
                <div className="wz-full">
                  <label className="wz-check">
                    <input type="checkbox" {...register(name(`assignments.${j}.custom`), { onChange: onCustom(j) })} />
                    Horaire différent pour ce chauffeur (relais)
                  </label>
                  {custom && (
                    <div className="wz-stack wz-relay">
                      <Field label="Début de ce chauffeur" error={a?.starts_at}>
                        <input type="datetime-local" {...register(name(`assignments.${j}.starts_at`), { required: 'Champ requis' })} />
                      </Field>
                      <Field label="Fin de ce chauffeur" error={a?.ends_at}>
                        <input type="datetime-local" {...register(name(`assignments.${j}.ends_at`), {
                          required: 'Champ requis',
                          validate: (v) => v > getValues(name(`assignments.${j}.starts_at`)) || 'La fin doit être après le début',
                        })} />
                      </Field>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" className="wz-link" onClick={() => append(blank())}>+ Ajouter un chauffeur</button>
    </div>
  );
}

/* ---- Une case (chauffeur + son bus) pour un sens ---- */
function CrewCell({ i, j, options, busy, repeating }) {
  const { register, watch, getValues, setValue, formState: { errors } } = useFormContext();
  const p = `legs.${i}.assignments.${j}`;
  const a = errors.legs?.[i]?.assignments?.[j];
  const drivers = options?.drivers ?? [];
  const buses = options?.buses ?? [];
  const custom = watch(`${p}.custom`);
  const hasExtra = !!(watch(`${p}.note`) || watch(`${p}.alt_driver_id`) || custom);
  const [open, setOpen] = useState(hasExtra);

  const onDriver = (ev) => {
    const d = drivers.find((x) => String(x.id) === ev.target.value);
    if (d?.assigned_bus_id && !getValues(`${p}.bus_id`)) setValue(`${p}.bus_id`, String(d.assigned_bus_id), { shouldValidate: true });
  };
  const onCustom = (ev) => {
    setValue(`${p}.starts_at`, ev.target.checked ? getValues(`legs.${i}.starts_at`) : '');
    setValue(`${p}.ends_at`, ev.target.checked ? getValues(`legs.${i}.ends_at`) : '');
  };
  const showMore = open || hasExtra;


  return (
    <div className={`wz-cell ${i === 1 ? 'retour' : ''}`}>
      <Field label="Chauffeur *" error={a?.driver_id}>
        <select {...register(`${p}.driver_id`, { required: 'Requis', onChange: onDriver })}>
          <option value="">Choisir…</option>
          {drivers.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.full_name}{d.status !== 'active' ? ` (${DRIVER_STATUS[d.status]?.label})` : ''}{busy.drivers?.[d.id] ? ' ⚠' : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Bus *" error={a?.bus_id}>
        <select {...register(`${p}.bus_id`, {
          required: 'Requis',
          validate: (v) => (getValues(`legs.${i}.assignments`) ?? [])
            .filter((x, k) => k !== j && x.bus_id === v && !x.custom && !getValues(`${p}.custom`)).length === 0
            || 'Bus déjà utilisé',
        })}>
          <option value="">Choisir…</option>
          {buses.map((b) => {
            const o = busy.buses?.[b.id];
            return (
              <option key={b.id} value={String(b.id)} disabled={!!o}>
                {b.plate_number} · {b.seats} pl.{o ? ` — occupé ${hm(o.starts_at)}–${hm(o.ends_at)}` : ''}
              </option>
            );
          })}
        </select>
      </Field>

 <button type="button" className="wz-link" onClick={() => setOpen((v) => !v)}>
  {showMore ? "− Moins d'options" : '+ Options'}
</button>

      {open && (
        <div className="wz-stack">
          {repeating && (
            <Field label="Alterne avec" error={a?.alt_driver_id}>
              <select {...register(`${p}.alt_driver_id`, {
                validate: (v) => !v || v !== getValues(`${p}.driver_id`) || 'Autre chauffeur requis',
              })}>
                <option value="">— Aucun —</option>
                {drivers.map((d) => <option key={d.id} value={String(d.id)}>{d.full_name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Zone de ramassage">
            <input placeholder="Ex. Monastir" maxLength={190} {...register(`${p}.note`)} />
          </Field>
          <label className="wz-check">
            <input type="checkbox" {...register(`${p}.custom`, { onChange: onCustom })} /> Relais (horaire propre)
          </label>
          {custom && (
            <>
              <Field label="Début" error={a?.starts_at}>
                <input type="datetime-local" {...register(`${p}.starts_at`, { required: 'Requis' })} />
              </Field>
              <Field label="Fin" error={a?.ends_at}>
                <input type="datetime-local" {...register(`${p}.ends_at`, {
                  required: 'Requis',
                  validate: (v) => v > getValues(`${p}.starts_at`) || 'Fin après début',
                })} />
              </Field>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Aller & retour : une ligne par chauffeur, Aller à gauche, Retour à droite ---- */
function PairedCrew({ options }) {
  const { control, watch, getValues, setValue } = useFormContext();
  const a0 = useFieldArray({ control, name: 'legs.0.assignments' });
  const a1 = useFieldArray({ control, name: 'legs.1.assignments' });
  const [s0, e0, s1, e1] = watch(['legs.0.starts_at', 'legs.0.ends_at', 'legs.1.starts_at', 'legs.1.ends_at']);
  const busy0 = useAvailability(s0, e0).data ?? {};
  const busy1 = useAvailability(s1, e1).data ?? {};
  const repeating = (watch('repeat_days') ?? []).length > 0;

  // Les deux sens gardent toujours le même nombre de lignes
  const rows = Math.max(a0.fields.length, a1.fields.length);
  const add = () => { a0.append(blank()); a1.append(blank()); };
  const remove = (j) => { a0.remove(j); a1.remove(j); };
  const copyRow = (j) => {
  const src = getValues(`legs.0.assignments.${j}`);
  ['driver_id', 'bus_id', 'alt_driver_id', 'note'].forEach((k) =>
    setValue(`legs.1.assignments.${j}.${k}`, src[k] ?? '', { shouldValidate: k === 'driver_id' || k === 'bus_id' }));
};

  return (
    <>
      <div className="wz-pair wz-pair-sticky">
        <div className="wz-pair-head">Aller <small>{s0 ? `${dm(s0)} · ${hm(s0.replace('T', ' '))}` : ''}</small></div>
        <div className="wz-pair-head retour">Retour <small>{s1 ? `${dm(s1)} · ${hm(s1.replace('T', ' '))}` : ''}</small></div>
      </div>

      {Array.from({ length: rows }, (_, j) => (
        <div className="wz-crew" key={a0.fields[j]?.id ?? j}>
          <div className="wz-crew-head">
            <span className="wz-crew-n">{j + 1}</span>
            <strong>Chauffeur {j + 1}</strong>
            <button type="button" className="wz-link" style={{ marginLeft: 'auto' }} onClick={() => copyRow(j)}>Même équipe au retour</button>
            {rows > 1 && (
              <button type="button" className="wz-icon" style={{ marginLeft: 0 }} aria-label="Retirer" onClick={() => remove(j)}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <div className="wz-pair">
            <CrewCell i={0} j={j} options={options} busy={busy0} repeating={repeating} />
            <CrewCell i={1} j={j} options={options} busy={busy1} repeating={repeating} />
          </div>
        </div>
      ))}

      <button type="button" className="wz-link" onClick={add}>+ Ajouter un chauffeur</button>
    </>
  );
}
export default function StepCrew({ legs, options }) {
  const { watch } = useFormContext();
  const both = modeOf(watch('legs')) === 'both';
  return (
    <>
      <ClientBar withLegs />
      {both ? <PairedCrew options={options} /> : legs.fields.map((f, i) => <LegCrew key={f.id} index={i} options={options} />)}
    </>
  );
}