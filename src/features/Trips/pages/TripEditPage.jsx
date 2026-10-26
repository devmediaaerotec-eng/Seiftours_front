import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Copy, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import TripForm from '../components/TripForm';
import { emptyTrip, toForm, toPayload } from '../schema';
import { trips, useDuplicateTrip, useTripFormOptions } from '../resource';

const SCOPES = {
  packages: { base: '/trips',    types: ['omra', 'organized'], noun: 'voyage' },
  circuits: { base: '/circuits', types: ['circuit'],           noun: 'circuit' },
};

export default function TripEditPage({ scope = 'packages' }) {
  const cfg = SCOPES[scope];
  const { id } = useParams();
  const isNew = !id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const options = useTripFormOptions();
  const trip = trips.useOne(id);
  const save = trips.useSave();
  const remove = trips.useRemove();
  const duplicate = useDuplicateTrip();

  const defaults = useMemo(() => {
    if (isNew) {
      const t = params.get('type');
      return emptyTrip(cfg.types.includes(t) ? t : cfg.types[0]);
    }
    return trip.data ? toForm(trip.data) : null;
  }, [isNew, trip.data, params, cfg]);

  // /trips/12 pour un circuit : on redirige vers /circuits/12
  if (!isNew && trip.data) {
    const real = trip.data.trip.type === 'circuit' ? 'circuits' : 'packages';
    if (real !== scope) return <Navigate to={`${SCOPES[real].base}/${id}`} replace />;
  }

  if (!isNew && trip.error?.status === 404) {
    return <><Link to={cfg.base}>← Retour</Link><div className="alert bad">Introuvable.</div></>;
  }
  if (options.isLoading || (!isNew && trip.isLoading) || !defaults || !options.data) {
    return <div className="center">Chargement…</div>;
  }

  const onSubmit = async (values) => {
    try {
      const res = await save.mutateAsync({ id, body: toPayload(values) });
      toast.success('Enregistré.');
      if (isNew) navigate(`${cfg.base}/${res.id}`, { replace: true });
    } catch (e) {
      if (e.status === 422 && e.data?.violations) {
        toast.error('Certains champs sont invalides.');
        return { violations: e.data.violations };
      }
      toast.error(e.message);
    }
    return undefined;
  };

  const onDelete = async () => {
    if (!window.confirm(`Supprimer définitivement ce ${cfg.noun} ?`)) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Supprimé.');
      navigate(cfg.base);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onDuplicate = async () => {
    try {
      const res = await duplicate.mutateAsync(id);
      toast.success('Copie créée (masquée). Modifiez-la puis publiez-la.');
      navigate(`${cfg.base}/${res.id}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Link to={cfg.base}>← Retour à la liste</Link>
      <PageHeader title={isNew ? `Nouveau ${cfg.noun}` : defaults.title || `Modifier le ${cfg.noun}`} />
      <TripForm
        // Après chaque enregistrement les données sont rechargées : le formulaire repart avec les bons identifiants de départs
        key={isNew ? 'new' : `${id}-${trip.dataUpdatedAt}`}
        defaultValues={defaults}
        options={options.data}
        isNew={isNew}
        allowedTypes={cfg.types}
        saving={save.isPending}
        onSubmit={onSubmit}
        extraActions={!isNew && (
          <>
            <button type="button" className="btn ghost" onClick={onDuplicate}><Copy size={16} /> Dupliquer</button>
            <button type="button" className="btn danger" onClick={onDelete}><Trash2 size={16} /> Supprimer</button>
          </>
        )}
      />
    </>
  );
}