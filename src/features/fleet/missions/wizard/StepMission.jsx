import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { MISSION_TYPE } from '../../shared/status';
import { useClients, useCreateClient } from '../resource';

function ClientPicker() {
  const toast = useToast();
  const { register, setValue, getValues, formState: { errors } } = useFormContext();
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
        <div className="wz-inline">
          <Field label="Nom du client *">
            <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Téléphone">
            <input inputMode="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </Field>
          <div className="wz-inline-actions">
            <button type="button" className="btn ghost sm" onClick={() => setAdding(false)}>Annuler</button>
            <button type="button" className="btn sm" disabled={create.isPending || draft.name.trim().length < 2} onClick={save}>
              Créer le client
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function StepMission() {
  const { register, formState: { errors } } = useFormContext();
  return (
    <>
      <div className="wz-grid">
        <ClientPicker />
        <Field label="Type" error={errors.mission_type}>
          <select {...register('mission_type')}>
            {Object.entries(MISSION_TYPE).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </Field>
        <div className="wz-full">
          <Field label="Intitulé *" error={errors.title} hint="Ex. Mitech, transport du personnel">
            <input placeholder="Nom de la mission" {...register('title', {
              required: 'Champ requis',
              validate: (v) => v.trim() !== '' || 'Champ requis',
              maxLength: { value: 190, message: '190 caractères maximum' },
            })} />
          </Field>
        </div>
        <div className="wz-full">
          <Field label="Consignes pour les chauffeurs" error={errors.notes} hint="Reprises dans les messages WhatsApp.">
            <textarea rows="2" {...register('notes')} />
          </Field>
        </div>
      </div>
    </>
  );
}