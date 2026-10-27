import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check, Circle, Eye, EyeOff, Lock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { api } from '@/lib/http';

const RULES = [
  { id: 'len', label: '10 caractères minimum', test: (v) => v.length >= 10 },
  { id: 'letter', label: 'Au moins une lettre', test: (v) => /[A-Za-z]/.test(v) },
  { id: 'digit', label: 'Au moins un chiffre', test: (v) => /\d/.test(v) },
];

const LEVELS = {
  1: { label: 'Faible', bar: 'bg-red-500', text: 'text-red-600' },
  2: { label: 'Moyen', bar: 'bg-amber-500', text: 'text-amber-600' },
  3: { label: 'Bon', bar: 'bg-brand-500', text: 'text-brand-600' },
  4: { label: 'Excellent', bar: 'bg-emerald-500', text: 'text-emerald-600' },
};

const strength = (v) => {
  if (!v) return 0;
  let s = 0;
  if (v.length >= 10) s++;
  if (v.length >= 14) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return Math.max(1, Math.min(4, s));
};

function Toggle({ show, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={show ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-600">
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

export default function PasswordModal({ onClose }) {
  const toast = useToast();
  const [show, setShow] = useState(false);
  const { register, handleSubmit, watch, getValues, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  });

  const next = watch('new_password') ?? '';
  const confirm = watch('confirm') ?? '';
  const level = strength(next);
  const type = show ? 'text' : 'password';
  const iconCls = 'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400';

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
    <Modal title="Changer mon mot de passe" size="sm" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-5">
        <Field label="Mot de passe actuel" error={errors.current_password}>
          <span className="relative block">
            <Lock className={iconCls} />
            <input type={type} autoFocus autoComplete="current-password" className="px-10"
                   {...register('current_password', { required: 'Champ requis' })} />
            <Toggle show={show} onClick={() => setShow(!show)} />
          </span>
        </Field>

        <div>
          <Field label="Nouveau mot de passe" error={errors.new_password}>
            <span className="relative block">
              <Lock className={iconCls} />
              <input type={type} autoComplete="new-password" className="px-10" {...register('new_password', {
                required: 'Champ requis',
                validate: (v) => RULES.every((r) => r.test(v)) || 'Ce mot de passe ne respecte pas toutes les règles',
              })} />
              <Toggle show={show} onClick={() => setShow(!show)} />
            </span>
          </Field>

          {next && (
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex flex-1 gap-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= level ? LEVELS[level].bar : 'bg-slate-200')} />
                  ))}
                </div>
                <span className={cn('w-20 text-right text-xs font-semibold', LEVELS[level].text)}>{LEVELS[level].label}</span>
              </div>
              <ul className="space-y-1">
                {RULES.map((r) => {
                  const ok = r.test(next);
                  return (
                    <li key={r.id} className={cn('flex items-center gap-2 text-xs', ok ? 'text-emerald-600' : 'text-slate-500')}>
                      {ok ? <Check className="size-3.5" /> : <Circle className="size-3.5" />} {r.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <Field label="Confirmer le nouveau mot de passe" error={errors.confirm}>
          <span className="relative block">
            <Lock className={iconCls} />
            <input type={type} autoComplete="new-password" className="px-10" {...register('confirm', {
              validate: (v) => v === getValues('new_password') || 'Les deux mots de passe sont différents',
            })} />
            <Toggle show={show} onClick={() => setShow(!show)} />
          </span>
          {confirm && confirm === next && !errors.confirm && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><Check className="size-3.5" /> Identiques</span>
          )}
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>Annuler</Button>
          <Button type="submit" className="w-full sm:w-auto" loading={isSubmitting}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}