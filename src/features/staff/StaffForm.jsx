import { useForm } from 'react-hook-form';
import Field from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { staff, useStaffOptions } from './resource';

export default function StaffForm({ row, isMe, onDone, onCancel }) {
  const toast = useToast();
  const save = staff.useSave();
  const options = useStaffOptions();

  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      full_name: row?.full_name ?? '', email: row?.email ?? '', phone: row?.phone ?? '',
      role_id: row ? String(row.role_id) : '', branch_id: row?.branch_id ? String(row.branch_id) : '',
    },
  });

  const submit = handleSubmit(async (v) => {
    const body = { ...v, role_id: Number(v.role_id), branch_id: v.branch_id ? Number(v.branch_id) : null };
    try {
      const res = await save.mutateAsync({ id: row?.id, body });
      toast.success('Enregistré.');
      onDone(res);
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, m]) => setError(k, { type: 'server', message: m }));
        toast.error('Certains champs sont invalides.');
      } else toast.error(e.message);
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field label="Nom complet *" error={errors.full_name}>
          <input autoFocus {...register('full_name', { required: 'Champ requis', maxLength: { value: 160, message: '160 caractères maximum' } })} />
        </Field>
        <Field label="E-mail (identifiant de connexion) *" error={errors.email}>
          <input type="email" autoComplete="off" {...register('email', { required: 'Champ requis', pattern: { value: /^\S+@\S+\.\S+$/, message: 'E-mail invalide' } })} />
        </Field>
        <Field label="Téléphone" error={errors.phone}>
          <input inputMode="tel" {...register('phone', { validate: (v) => v === '' || /^[+0-9 ().-]{6,30}$/.test(v) || 'Numéro invalide' })} />
        </Field>
        <Field label="Rôle *" error={errors.role_id}
               hint={isMe ? 'Vous ne pouvez pas modifier votre propre rôle.' : 'Détermine les pages et actions autorisées (voir « Rôles et droits »).'}>
          <select disabled={isMe} {...register('role_id', { required: 'Choisissez un rôle' })}>
            <option value="">Choisir…</option>
            {(options.data?.roles ?? []).map((r) => <option key={r.id} value={String(r.id)}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Agence" className="span-2" error={errors.branch_id}
               hint="Une personne rattachée à une agence ne voit que les réservations de cette agence. « Toutes » donne un accès global.">
          <select {...register('branch_id')}>
            <option value="">Toutes les agences (accès global)</option>
            {(options.data?.branches ?? []).map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </select>
        </Field>
      </div>
      {!row && <p className="muted">Un mot de passe provisoire sera généré et affiché une seule fois après la création.</p>}
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
        <button className="btn" disabled={save.isPending}>{save.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}