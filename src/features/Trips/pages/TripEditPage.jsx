import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Copy, Pencil, Plane, Plus, Route, Trash2 } from 'lucide-react';
import ActionMenu from '@/components/ui/ActionMenu';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { errText } from '@/lib/errors';
import TripForm from '../components/TripForm';
import { emptyTrip, toForm, toPayload } from '../schema';
import { trips, useDuplicateTrip, useTripFormOptions } from '../resource';

const SCOPES = {
  packages: { base: '/trips', types: ['omra', 'organized'], noun: 'voyage', list: 'Voyages organisés', icon: Plane },
  circuits: { base: '/circuits', types: ['circuit'], noun: 'circuit', list: 'Circuits', icon: Route },
};

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="h-8 w-72 rounded bg-slate-200" />
      <div className="h-11 rounded-lg bg-slate-200/70" />
      <div className="h-96 rounded-xl bg-slate-200/60" />
    </div>
  );
}

export default function TripEditPage({ scope = 'packages' }) {
  const cfg = SCOPES[scope];
  const { id } = useParams();
  const isNew = !id;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

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

  const back = (
    <Link to={cfg.base} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="size-4" /> {cfg.list}
    </Link>
  );

  if (!isNew && trip.error?.status === 404) {
    return (
      <>
        {back}
        <Card padded={false}>
          <EmptyState icon={cfg.icon} title={`${cfg.noun[0].toUpperCase()}${cfg.noun.slice(1)} introuvable`}
                      text="Il a peut-être été supprimé." action={<Button as={Link} to={cfg.base} variant="secondary">Retour à la liste</Button>} />
        </Card>
      </>
    );
  }
  if (options.isLoading || (!isNew && trip.isLoading) || !defaults || !options.data) return <Skeleton />;

  const current = trip.data?.trip;

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
      toast.error(errText(e));
    }
    return undefined;
  };

  const onDelete = async () => {
    if (!(await confirm({
      title: `Supprimer le ${cfg.noun}`, confirmLabel: 'Supprimer',
      message: `Supprimer définitivement « ${defaults.title} » ? S'il est lié à des demandes de devis ou des bons plans, masquez-le plutôt.`,
    }))) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Supprimé.');
      navigate(cfg.base);
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const onDuplicate = async () => {
    try {
      const res = await duplicate.mutateAsync(id);
      toast.success('Copie créée (masquée). Modifiez-la puis publiez-la.');
      navigate(`${cfg.base}/${res.id}`);
    } catch (e) {
      toast.error(errText(e));
    }
  };

  return (
    <>
      {back}
      <PageHeader
        title={(
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {isNew ? `Nouveau ${cfg.noun}` : defaults.title || `Modifier le ${cfg.noun}`}
            {current && <Badge tone={current.is_active ? 'ok' : 'muted'} dot>{current.is_active ? 'Publié' : 'Masqué'}</Badge>}
          </span>
        )}
        description={isNew
          ? 'Renseignez les informations, les départs et le programme. Vous pourrez le publier ensuite.'
          : `Adresse web : /${defaults.slug}`}
        action={!isNew && (
          <ActionMenu label={defaults.title} items={[
            { label: 'Dupliquer', icon: Copy, onClick: onDuplicate },
            { divider: true },
            { label: 'Supprimer', icon: Trash2, tone: 'danger', onClick: onDelete },
          ]} />
        )}
      />

      <TripForm
        // Après chaque enregistrement les données sont rechargées : le formulaire repart avec les bons identifiants de départs
        key={isNew ? 'new' : `${id}-${trip.dataUpdatedAt}`}
        defaultValues={defaults}
        options={options.data}
        isNew={isNew}
        allowedTypes={cfg.types}
        saving={save.isPending}
        onSubmit={onSubmit}
        onCancel={() => navigate(cfg.base)}
      />
    </>
  );
}