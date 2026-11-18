import { useRef, useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useCreateBatch, useMissionOptions } from './resource';
import Stepper from './wizard/Stepper';
import StepCrew from './wizard/StepCrew';
import StepMission from './wizard/StepMission';
import StepRecap, { countMissions } from './wizard/StepRecap';
import StepWhen from './wizard/StepWhen';
import { initial } from './wizard/utils';
import './wizard/wizard.css';

const STEPS = [
  { key: 'mission', label: 'Mission', title: ' ', sub: ' ' },
  { key: 'when',    label: 'Horaires', title: ' ', sub: ' ' },
  { key: 'crew',    label: 'Chauffeurs', title: '', sub: '' },
  { key: 'recap',   label: 'Récapitulatif', title: 'Tout est bon ?', sub: '' },
];

export default function MissionWizard({ defaults, onDone, onCancel }) {
  const toast = useToast();
  const options = useMissionOptions();
  const save = useCreateBatch();
  const top = useRef(null);

  const methods = useForm({ defaultValues: initial(defaults) });
  const legs = useFieldArray({ control: methods.control, name: 'legs' });
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const last = STEPS.length - 1;

  const goto = (n) => {
    setStep(n);
    setReached((r) => Math.max(r, n));
    requestAnimationFrame(() => top.current?.requestAnimationFrame(() => { const b = document.querySelector('.wz-body'); if (b) b.scrollTo({ top: 0, behavior: 'smooth' }); }));
  };

  /** Champs à valider pour chaque étape. */
  const fieldsFor = (s) => {
    const L = methods.getValues('legs') ?? [];
    if (s === 0) return ['title', 'mission_type'];
    if (s === 1) return [...L.flatMap((_, i) => [`legs.${i}.starts_at`, `legs.${i}.ends_at`]), 'repeat_until'];
    if (s === 2) {
      return L.flatMap((l, i) => (l.assignments ?? []).flatMap((_, j) => [
        `legs.${i}.assignments.${j}.driver_id`, `legs.${i}.assignments.${j}.bus_id`, `legs.${i}.assignments.${j}.alt_driver_id`,
        `legs.${i}.assignments.${j}.starts_at`, `legs.${i}.assignments.${j}.ends_at`,
      ]));
    }
    return [];
  };

  const next = async () => {
    if (await methods.trigger(fieldsFor(step))) goto(step + 1);
  };

  const onValid = async (v) => {
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
          alt_driver_id: rep && a.alt_driver_id ? Number(a.alt_driver_id) : null,
          bus_id: Number(a.bus_id),
          note: a.note?.trim() || null,
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
        const keys = Object.keys(e.data.violations);
        Object.entries(e.data.violations).forEach(([k, msg]) => {
          if (k === 'legs' || k === 'repeat' || k.endsWith('.assignments')) toast.error(msg);
          else methods.setError(k, { type: 'server', message: msg });
        });
        toast.error('Certains champs sont invalides.');
        // retourne à l'étape concernée
        if (keys.some((k) => k === 'title' || k === 'mission_type' || k === 'client_id')) goto(0);
        else if (keys.some((k) => k === 'repeat' || /^legs\.\d+\.(starts_at|ends_at)$/.test(k))) goto(1);
        else if (keys.some((k) => k.includes('assignments'))) goto(2);
      } else {
        toast.error(e.message);
      }
    }
  };

  /** Erreur de validation à la création : on revient à la première étape fautive. */
  const onInvalid = (errs) => {
    if (errs.title || errs.mission_type) goto(0);
    else if (errs.repeat_until || (errs.legs ?? []).some?.((l) => l && (l.starts_at || l.ends_at))) goto(1);
    else goto(2);
  };

  const submit = methods.handleSubmit(onValid, onInvalid);
  const total = countMissions(methods.watch()).total;

  return (
    <FormProvider {...methods}>
      <form
        className="wz"
        noValidate
        onSubmit={(e) => { e.preventDefault(); if (step < last) next(); else submit(); }}
      >
        <div ref={top} />
<Stepper steps={STEPS} current={step} reached={reached} onGo={goto} />

<div className="wz-body">
        {STEPS.map((s, i) => (
          <section key={s.key} className="wz-panel" hidden={step !== i} aria-labelledby={`wz-t-${s.key}`}>
            <header className="wz-title">
              <h3 id={`wz-t-${s.key}`}>{s.title}</h3>
              <p className="muted">{s.sub}</p>
            </header>
            {i === 0 && <StepMission />}
            {i === 1 && <StepWhen legs={legs} />}
            {i === 2 && <StepCrew legs={legs} options={options.data} />}
            {i === 3 && <StepRecap options={options.data} />}
            </section>
  ))}
</div>

        <footer className="wz-foot">
          <button type="button" className="btn ghost" onClick={step === 0 ? onCancel : () => goto(step - 1)}>
            {step === 0 ? 'Annuler' : <><ArrowLeft size={16} /> Précédent</>}
          </button>
          <span className="wz-count">Étape {step + 1} / {STEPS.length}</span>
          {step < last ? (
            <button type="submit" className="btn">Suivant <ArrowRight size={16} /></button>
          ) : (
            <button type="submit" className="btn" disabled={save.isPending || !total}>
              <Check size={16} /> {save.isPending ? 'Création…' : total > 1 ? `Créer ${total} missions` : 'Créer la mission'}
            </button>
          )}
        </footer>
      </form>
    </FormProvider>
  );
}