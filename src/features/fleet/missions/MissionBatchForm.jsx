import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Copy, Plus, Trash2 } from 'lucide-react';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { addDays, addMinutes, hmOf } from '@/lib/format';
import { BUS_TYPE, DRIVER_STATUS, MISSION_TYPE } from '../shared/status';
import { useAvailability, useClients, useCreateBatch, useCreateClient, useMissionOptions } from './resource';
import './missions.css';

const LEG_LABEL = { aller: 'Aller', retour: 'Retour', other: 'Autre étape' };
const blank = () => ({
  driver_id: '', alt_driver_id: '', note: '', bus_id: '', custom: false, starts_at: '', ends_at: '',
});
const when = (i) => `${i.reference} ${hmOf(i.starts_at)}–${hmOf(i.ends_at)}`;

const DAYS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mer'], [4, 'Jeu'], [5, 'Ven'], [6, 'Sam'], [7, 'Dim']];
const PRESETS = [
  ['Une seule fois', []],
  ['Tous les jours', [1, 2, 3, 4, 5, 6, 7]],
  ['Lun – Ven', [1, 2, 3, 4, 5]],
  ['Lun – Sam', [1, 2, 3, 4, 5, 6]],
];
const sameDays = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const dm = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Dates (YYYY-MM-DD) de la répétition : de `first` à `until`, pour les jours ISO choisis. */
function occurrenceDates(first, until, days) {
  const out = [];
  for (let i = 0; i <= 92; i += 1) {
    const d = addDays(first, i);
    if (d > until) break;
    if (days.includes(new Date(`${d}T12:00:00`).getDay() || 7)) out.push(d);
  }
  return out;
}
const mondayOf = (ymd) => addDays(ymd, -((new Date(`${ymd}T12:00:00`).getDay() + 6) % 7));
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);
const shiftDt = (v, n) => (v ? `${addDays(v.slice(0, 10), n)}${v.slice(10)}` : v);

const initial = (d = {}) => ({
  mission_type: 'transfer', title: '', client_id: '', notes: '',
  repeat_days: [], repeat_until: '',
  legs: [{
    leg: 'aller',
    starts_at: d.date ? `${d.date}T08:00` : '', ends_at: d.date ? `${d.date}T10:00` : '',
    pickup_place: '', destination: '',
    assignments: [{ ...blank(), driver_id: d.driver_id ? String(d.driver_id) : '', bus_id: d.bus_id ? String(d.bus_id) : '' }],
  }],
});

/* --------------------------------------------------------------- section */

function Section({ n, title, hint, children }) {
  return (
    <section className="ms-section">
      <header className="ms-section-head">
        <span className="ms-step">{n}</span>
        <div><h4>{title}</h4>{hint && <p className="muted">{hint}</p>}</div>
      </header>
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- client */

function ClientPicker({ register, errors, setValue, getValues }) {
  const toast = useToast();
  const clients = useClients();
  const create = useCreateClient();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', phone: '' });

  const onPick = (e) => {
    const v = e.target.value;
    if (v === '__new__') { setValue('client_id', ''); setAdding(true); return; }
    const c = (clients.data?.items ?? []).find((x) => String(x.id) === v);
    if (c && !getValues('title').trim()) setValue('title', c.name, { shouldValidate: true });
  };

  const save = async () => {
    try {
      const res = await create.mutateAsync({ name: draft.name, phone: draft.phone });
      setValue('client_id', String(res.client.id));
      if (!getValues('title').trim()) setValue('title', res.client.name, { shouldValidate: true });
      setAdding(false);
      setDraft({ name: '', phone: '' });
      toast.success('Client créé.');
    } catch (e) {
      toast.error(e.data?.violations ? Object.values(e.data.violations)[0] : e.message);
    }
  };

  return (
    <>
      <Field label="Client" error={errors.client_id}>
        <select {...register('client_id', { onChange: onPick })}>
          <option value="">— Aucun client —</option>
          {(clients.data?.items ?? []).map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          <option value="__new__">＋ Nouveau client…</option>
        </select>
      </Field>

      {adding && (
        <div className="card span-2" style={{ padding: 12 }}>
          <div className="form-grid">
            <Field label="Nom du client *">
              <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Téléphone">
              <input inputMode="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </Field>
          </div>
          <div className="modal-actions" style={{ marginTop: 10, paddingTop: 10 }}>
            <button type="button" className="btn ghost sm" onClick={() => setAdding(false)}>Annuler</button>
            <button type="button" className="btn sm" disabled={create.isPending || draft.name.trim().length < 2} onClick={save}>Créer le client</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------- zone de ramassage */

function NoteField({ j, register, name, a, watch }) {
  const value = watch(name(`assignments.${j}.note`));
  const [open, setOpen] = useState(!!value);
  if (!open) {
    return (
      <button type="button" className="btn ghost sm" style={{ alignSelf: 'end' }} onClick={() => setOpen(true)}>
        <Plus size={14} /> Ajouter une zone de ramassage
      </button>
    );
  }
  return (
    <Field label="Zone de ramassage" error={a?.note} hint="Affichée à côté du nom du chauffeur dans les messages.">
      <input placeholder="Ex. Monastir" maxLength={190} {...register(name(`assignments.${j}.note`))} />
    </Field>
  );
}

/* ----------------------------------------------------------------- étape */

function LegCard({ index, control, register, errors, watch, setValue, getValues, options, onRemove, canRemove, repeating }) {
  const { fields, append, remove, replace } = useFieldArray({ control, name: `legs.${index}.assignments` });
  const name = (k) => `legs.${index}.${k}`;
  const e = errors.legs?.[index];

  const [starts, ends] = watch([name('starts_at'), name('ends_at')]);
  const busy = useAvailability(starts, ends).data ?? {};
  const drivers = options?.drivers ?? [];
  const buses = options?.buses ?? [];

  const onStart = (ev) => {
    const v = ev.target.value;
    const end = getValues(name('ends_at'));
    if (v && (!end || end <= v)) setValue(name('ends_at'), addMinutes(v, 120), { shouldValidate: true });
  };

  const onDriver = (j) => (ev) => {
    const d = drivers.find((x) => String(x.id) === ev.target.value);
    if (d?.assigned_bus_id && !getValues(name(`assignments.${j}.bus_id`))) {
      setValue(name(`assignments.${j}.bus_id`), String(d.assigned_bus_id), { shouldValidate: true });
    }
  };

  // Horaire propre à un chauffeur (relais) : pré-rempli avec celui de l'étape
  const onCustom = (j) => (ev) => {
    const p = name(`assignments.${j}`);
    if (ev.target.checked) {
      setValue(`${p}.starts_at`, getValues(name('starts_at')));
      setValue(`${p}.ends_at`, getValues(name('ends_at')));
    } else {
      setValue(`${p}.starts_at`, '');
      setValue(`${p}.ends_at`, '');
    }
  };

  const copyFromFirst = () => {
    const src = (getValues('legs.0.assignments') ?? []).map((a) => ({
      ...blank(), driver_id: a.driver_id, alt_driver_id: a.alt_driver_id, bus_id: a.bus_id, note: a.note,
    }));
    if (src.length) replace(src);
  };

  return (
    <div className="card leg-card">
      <div className="leg-head">
        <select style={{ width: 'auto' }} {...register(name('leg'))}>
          {Object.entries(LEG_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className="muted">Étape {index + 1}</span>
        {canRemove && (
          <button type="button" className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={onRemove}>
            <Trash2 size={14} /> <span className="hide-sm">Supprimer l'étape</span>
          </button>
        )}
      </div>

      <div className="form-grid">
        <Field label="Départ *" error={e?.starts_at}>
          <input type="datetime-local" {...register(name('starts_at'), { required: 'Champ requis', onChange: onStart })} />
        </Field>
        <Field label="Arrivée *" error={e?.ends_at}>
          <input type="datetime-local" {...register(name('ends_at'), {
            required: 'Champ requis',
            validate: (v) => !getValues(name('starts_at')) || v > getValues(name('starts_at')) || "L'arrivée doit être après le départ",
          })} />
        </Field>
        <Field label="Lieu de prise en charge" error={e?.pickup_place}><input {...register(name('pickup_place'))} /></Field>
        <Field label="Destination" error={e?.destination}><input {...register(name('destination'))} /></Field>
      </div>

      <h4 style={{ margin: '14px 0 0', fontSize: 14 }}>Bus et chauffeurs ({fields.length})</h4>
      {fields.map((f, j) => {
        const a = e?.assignments?.[j];
        const custom = watch(name(`assignments.${j}.custom`));
        return (
          <div className="assign-card" key={f.id}>
            <div className="assign-card-head">
              <strong>Affectation {j + 1}</strong>
              <button type="button" className="btn ghost sm" aria-label="Retirer" disabled={fields.length === 1} onClick={() => remove(j)}>
                <Trash2 size={14} /> <span className="hide-sm">Retirer</span>
              </button>
            </div>

            <div className="assign-grid">
              <Field label="Chauffeur *" error={a?.driver_id}>
                <select {...register(name(`assignments.${j}.driver_id`), { required: 'Choisissez un chauffeur', onChange: onDriver(j) })}>
                  <option value="">Choisir…</option>
                  {drivers.map((d) => {
                    const b = busy.drivers?.[d.id];
                    return (
                      <option key={d.id} value={String(d.id)}>
                        {d.full_name}{d.status !== 'active' ? ` (${DRIVER_STATUS[d.status]?.label})` : ''}
                        {b ? ` — ⚠ déjà : ${when(b)}` : ''}
                      </option>
                    );
                  })}
                </select>
              </Field>

              <Field label="Bus *" error={a?.bus_id}>
                <select {...register(name(`assignments.${j}.bus_id`), {
                  required: 'Choisissez un bus',
                  validate: (v) => (getValues(name('assignments')) ?? []).filter((x, k) => k !== j && x.bus_id === v && !x.custom && !getValues(name(`assignments.${j}.custom`))).length === 0
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
                <Field label="Alterne avec (1 jour sur 2)" error={a?.alt_driver_id} hint="Optionnel : « lotfi ou ayoub ».">
                  <select {...register(name(`assignments.${j}.alt_driver_id`), {
                    validate: (v) => !v || v !== getValues(name(`assignments.${j}.driver_id`)) || 'Doit être un autre chauffeur',
                  })}>
                    <option value="">— Aucun —</option>
                    {drivers.map((d) => <option key={d.id} value={String(d.id)}>{d.full_name}</option>)}
                  </select>
                </Field>
              )}

              <NoteField j={j} register={register} name={name} a={a} watch={watch} />
            </div>

            {fields.length > 1 && (
              <>
                <label className="chk assign-toggle">
                  <input type="checkbox" {...register(name(`assignments.${j}.custom`), { onChange: onCustom(j) })} />
                  Horaire différent pour ce chauffeur (relais)
                </label>
                {custom && (
                  <div className="assign-custom">
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
              </>
            )}
          </div>
        );
      })}

      <div className="row-tools" style={{ marginTop: 10 }}>
        <button type="button" className="btn ghost sm" onClick={() => append(blank())}><Plus size={14} /> Ajouter un bus / chauffeur</button>
        {index > 0 && (
          <button type="button" className="btn ghost sm" onClick={copyFromFirst}><Copy size={14} /> Mêmes chauffeurs que l'aller</button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ répétition */

function RepeatPicker({ watch, setValue, getValues, register, errors }) {
  const days = watch('repeat_days') ?? [];
  const until = watch('repeat_until');
  const first = (watch('legs.0.starts_at') || '').slice(0, 10);
  const dates = days.length && first && until ? occurrenceDates(first, until, days) : [];
  const hasAlt = (watch('legs') ?? []).some((l) => (l.assignments ?? []).some((a) => a.alt_driver_id));

  /** Décale toutes les étapes (et les relais) sur le lundi de la semaine, sans jamais aller dans le passé. */
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
    const base = days.length ? first : alignToMonday(); // 1re sélection : on part du lundi
    if (!until && base) setValue('repeat_until', addDays(base, 6)); // jusqu'au dimanche de cette semaine
  };
  const toggle = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b));

  return (
    <>
      <div className="row-tools" style={{ marginBottom: 8 }}>
        {PRESETS.map(([label, list]) => (
          <button key={label} type="button" className={`day-chip ${sameDays(days, list) ? 'on' : ''}`} onClick={() => setDays(list)}>{label}</button>
        ))}
      </div>
      <div className="row-tools">
        {DAYS.map(([n, label]) => (
          <button key={n} type="button" className={`day-chip ${days.includes(n) ? 'on' : ''}`} onClick={() => toggle(n)}>{label}</button>
        ))}
      </div>

      {days.length > 0 && (
        <div className="form-grid" style={{ marginTop: 10 }}>
          <Field label="Répéter jusqu'au *" error={errors.repeat_until} hint="92 jours maximum.">
            <input type="date" min={first} {...register('repeat_until')} />
          </Field>
          <div className="muted" style={{ alignSelf: 'center' }}>
            {!until ? 'Choisissez la date de fin.'
              : dates.length ? `${dates.length} jour(s) : du ${dm(dates[0])} au ${dm(dates[dates.length - 1])}`
                : 'Aucun jour ne correspond.'}
            {dates.length > 0 && first && dates[0] !== first && (
              <><br /><small>La date de départ ({dm(first)}) n'est pas dans les jours choisis : elle est ignorée.</small></>
            )}
          </div>
        </div>
      )}

      {days.length > 0 && hasAlt && dates.length > 0 && (
        <p className="muted" style={{ marginTop: 8 }}>
          Alternance : le chauffeur principal prend le {dm(dates[0])}{dates[2] ? `, le ${dm(dates[2])}` : ''}…
          et l'autre le {dates[1] ? dm(dates[1]) : '—'}{dates[3] ? `, le ${dm(dates[3])}` : ''}…
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ form */

export default function MissionBatchForm({ defaults, onDone, onCancel }) {
  const toast = useToast();
  const options = useMissionOptions();
  const save = useCreateBatch();

  const {
    register, handleSubmit, watch, setValue, getValues, setError, control, formState: { errors },
  } = useForm({ defaultValues: initial(defaults) });
  const { fields, append, remove } = useFieldArray({ control, name: 'legs' });
  const repeating = (watch('repeat_days') ?? []).length > 0;

  // Récapitulatif : nombre de missions qui seront créées
  const legsW = watch('legs') ?? [];
  const daysW = watch('repeat_days') ?? [];
  const untilW = watch('repeat_until');
  const firstDay = (legsW[0]?.starts_at || '').slice(0, 10);
  const nDays = repeating ? (firstDay && untilW ? occurrenceDates(firstDay, untilW, daysW).length : 0) : 1;
  const perDay = legsW.reduce((n, l) => n + (l.assignments?.length || 0), 0);
  const total = nDays * perDay;

  const addLeg = () => {
    const legs = getValues('legs');
    const last = legs[legs.length - 1];
    const day = (last.starts_at || '').slice(0, 10);
    append({
      leg: legs.length === 1 ? 'retour' : 'other',
      starts_at: day ? `${day}T16:00` : '', ends_at: day ? `${day}T18:00` : '',
      pickup_place: last.destination, destination: last.pickup_place, // trajet inversé
      assignments: [blank()],
    });
  };

  const submit = handleSubmit(async (v) => {
    if (v.repeat_days.length && !v.repeat_until) {
      setError('repeat_until', { type: 'manual', message: 'Choisissez la date de fin.' });
      return;
    }
    const rep = v.repeat_days.length > 0;
    const body = {
      mission_type: v.mission_type,
      title: v.title.trim(),
      client_id: v.client_id ? Number(v.client_id) : null,
      notes: v.notes,
      ...(rep ? { repeat: { days: v.repeat_days, until: v.repeat_until } } : {}),
      legs: v.legs.map((l) => ({
        leg: l.leg, starts_at: l.starts_at, ends_at: l.ends_at,
        pickup_place: l.pickup_place, destination: l.destination,
        assignments: l.assignments.map((a) => ({
          driver_id: Number(a.driver_id),
          // l'alternance n'a de sens que sur une répétition
          alt_driver_id: rep && a.alt_driver_id ? Number(a.alt_driver_id) : null,
          bus_id: Number(a.bus_id),
          note: a.note?.trim() || null,
          // le relais n'a de sens qu'avec plusieurs chauffeurs
          ...(a.custom && l.assignments.length > 1 ? { starts_at: a.starts_at, ends_at: a.ends_at } : {}),
        })),
      })),
    };
    try {
      const res = await save.mutateAsync(body);
      const w = res.warnings ?? [];
      w.slice(0, 3).forEach((x) => toast.warn(x));
      if (w.length > 3) toast.warn(`… et ${w.length - 3} autre(s) avertissement(s).`);
      toast.success(`${res.missions.length} mission(s) créée(s).`);
      onDone(res.missions);
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, msg]) => {
          if (k === 'legs' || k === 'repeat' || k.endsWith('.assignments')) toast.error(msg);
          else setError(k, { type: 'server', message: msg });
        });
        toast.error('Certains champs sont invalides.');
      } else {
        toast.error(e.message);
      }
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <Section n="1" title="Mission" hint="Client, type et consignes communes à tous les chauffeurs.">
        <div className="form-grid">
          <ClientPicker register={register} errors={errors} setValue={setValue} getValues={getValues} />
          <Field label="Type" error={errors.mission_type}>
            <select {...register('mission_type')}>
              {Object.entries(MISSION_TYPE).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </Field>
          <Field label="Intitulé *" error={errors.title} hint="Ex. Mitech — transport du personnel">
            <input {...register('title', {
              required: 'Champ requis',
              validate: (v) => v.trim() !== '' || 'Champ requis',
              maxLength: { value: 190, message: '190 caractères maximum' },
            })} />
          </Field>
          <Field label="Consignes pour les chauffeurs" className="span-2" error={errors.notes} hint="Reprises dans les messages WhatsApp.">
            <textarea rows="2" {...register('notes')} />
          </Field>
        </div>
      </Section>

      <Section n="2" title="Étapes" hint="Aller, retour… Chaque étape a ses horaires, ses bus et ses chauffeurs.">
        {fields.map((f, i) => (
          <LegCard key={f.id} index={i} control={control} register={register} errors={errors} watch={watch}
                   setValue={setValue} getValues={getValues} options={options.data}
                   canRemove={fields.length > 1} onRemove={() => remove(i)} repeating={repeating} />
        ))}
        <button type="button" className="btn ghost" onClick={addLeg}>
          <Plus size={16} /> Ajouter une étape ({fields.length === 1 ? 'retour' : 'autre'})
        </button>
      </Section>

      <Section n="3" title="Répétition" hint="Laisser vide pour une mission unique.">
        <RepeatPicker watch={watch} setValue={setValue} getValues={getValues} register={register} errors={errors} />
      </Section>

      <div className={`ms-summary ${total ? '' : 'empty'}`}>
        {total
          ? <><strong>{total}</strong> mission(s) : {nDays} jour(s) × {perDay} affectation(s)</>
          : 'Aucune mission à créer : vérifiez les jours et la date de fin.'}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={save.isPending || !total}>
          {save.isPending ? 'Enregistrement…' : total > 1 ? `Créer ${total} missions` : 'Créer la mission'}
        </button>
      </div>
    </form>
  );
}