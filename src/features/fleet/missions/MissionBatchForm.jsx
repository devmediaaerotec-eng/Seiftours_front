import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Copy, Plus, Trash2 } from 'lucide-react';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { addMinutes, hmOf } from '@/lib/format';
import { BUS_TYPE, DRIVER_STATUS, MISSION_TYPE } from '../shared/status';
import { useAvailability, useClients, useCreateBatch, useCreateClient, useMissionOptions } from './resource';

const LEG_LABEL = { aller: 'Aller', retour: 'Retour', other: 'Autre étape' };
const blank = () => ({ driver_id: '', bus_id: '' });
const when = (i) => `${i.reference} ${hmOf(i.starts_at)}–${hmOf(i.ends_at)}`;

const initial = (d = {}) => ({
  mission_type: 'transfer', title: '', client_id: '', notes: '',
  legs: [{
    leg: 'aller',
    starts_at: d.date ? `${d.date}T08:00` : '', ends_at: d.date ? `${d.date}T10:00` : '',
    pickup_place: '', destination: '',
    assignments: [{ driver_id: d.driver_id ? String(d.driver_id) : '', bus_id: d.bus_id ? String(d.bus_id) : '' }],
  }],
});

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

/* ----------------------------------------------------------------- étape */

function LegCard({ index, control, register, errors, watch, setValue, getValues, options, onRemove, canRemove }) {
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

  // Le chauffeur propose son bus attitré si aucun bus n'est choisi
  const onDriver = (j) => (ev) => {
    const d = drivers.find((x) => String(x.id) === ev.target.value);
    if (d?.assigned_bus_id && !getValues(name(`assignments.${j}.bus_id`))) {
      setValue(name(`assignments.${j}.bus_id`), String(d.assigned_bus_id), { shouldValidate: true });
    }
  };

  const copyFromFirst = () => {
    const src = (getValues('legs.0.assignments') ?? []).map((a) => ({ ...a }));
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
            <Trash2 size={14} /> Supprimer l'étape
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

      <h4 className="form-section">Bus et chauffeurs ({fields.length})</h4>
      {fields.map((f, j) => {
        const a = e?.assignments?.[j];
        return (
          <div className="assign-row" key={f.id}>
            <Field label={j === 0 ? 'Chauffeur *' : undefined} error={a?.driver_id}>
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
            <Field label={j === 0 ? 'Bus *' : undefined} error={a?.bus_id}>
              <select {...register(name(`assignments.${j}.bus_id`), {
                required: 'Choisissez un bus',
                validate: (v) => (getValues(name('assignments')) ?? []).filter((x, k) => k !== j && x.bus_id === v).length === 0
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
            <button type="button" className="btn ghost sm" aria-label="Retirer" disabled={fields.length === 1} onClick={() => remove(j)}>
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}

      <div className="row-tools" style={{ marginTop: 8 }}>
        <button type="button" className="btn ghost sm" onClick={() => append(blank())}><Plus size={14} /> Ajouter un bus / chauffeur</button>
        {index > 0 && (
          <button type="button" className="btn ghost sm" onClick={copyFromFirst}><Copy size={14} /> Mêmes chauffeurs que l'aller</button>
        )}
      </div>
    </div>
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
    const body = {
      mission_type: v.mission_type,
      title: v.title.trim(),
      client_id: v.client_id ? Number(v.client_id) : null,
      notes: v.notes,
      legs: v.legs.map((l) => ({
        leg: l.leg, starts_at: l.starts_at, ends_at: l.ends_at,
        pickup_place: l.pickup_place, destination: l.destination,
        assignments: l.assignments.map((a) => ({ driver_id: Number(a.driver_id), bus_id: Number(a.bus_id) })),
      })),
    };
    try {
      const res = await save.mutateAsync(body);
      (res.warnings ?? []).forEach((w) => toast.warn(w));
      toast.success(`${res.missions.length} mission(s) créée(s).`);
      onDone(res.missions);
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, msg]) => {
          if (k === 'legs' || k.endsWith('.assignments')) toast.error(msg);
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
      <h4 className="form-section">Mission</h4>
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

      <h4 className="form-section">Étapes (aller, retour…)</h4>
      {fields.map((f, i) => (
        <LegCard key={f.id} index={i} control={control} register={register} errors={errors} watch={watch}
                 setValue={setValue} getValues={getValues} options={options.data}
                 canRemove={fields.length > 1} onRemove={() => remove(i)} />
      ))}
      <button type="button" className="btn ghost" onClick={addLeg}>
        <Plus size={16} /> Ajouter une étape ({fields.length === 1 ? 'retour' : 'autre'})
      </button>

      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Créer la mission'}</button>
      </div>
    </form>
  );
}