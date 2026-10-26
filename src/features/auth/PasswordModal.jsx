import { useForm } from 'react-hook-form';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/http';

export default function PasswordModal({ onClose }) {
  const toast = useToast();
  const { register, handleSubmit, getValues, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  });

  const submit = handleSubmit(async ({ current_password, new_password }) => {
    try {
      await api('/admin/me/password', { method: 'PUT', body: { current_password, new_password } });
      toast.success('Mot de passe modifié.');
      onClose();
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        Object.entries(e.data.violations).forEach(([k, m]) => setError(k, { type: 'server', message: m }));
      } else toast.error(e.message);
    }
  });

  return (
    <Modal title="Changer mon mot de passe" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <Field label="Mot de passe actuel" error={errors.current_password}>
            <input type="password" autoComplete="current-password" {...register('current_password', { required: 'Champ requis' })} />
          </Field>
          <Field label="Nouveau mot de passe" error={errors.new_password} hint="10 caractères minimum, avec au moins une lettre et un chiffre.">
            <input type="password" autoComplete="new-password" {...register('new_password', {
              required: 'Champ requis',
              validate: (v) => (v.length >= 10 && /[A-Za-z]/.test(v) && /\d/.test(v)) || '10 caractères minimum, avec une lettre et un chiffre',
            })} />
          </Field>
          <Field label="Confirmer le nouveau mot de passe" error={errors.confirm}>
            <input type="password" autoComplete="new-password" {...register('confirm', {
              validate: (v) => v === getValues('new_password') || 'Les deux mots de passe sont différents',
            })} />
          </Field>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={isSubmitting}>Enregistrer</button>
        </div>
      </form>
    </Modal>
  );
}