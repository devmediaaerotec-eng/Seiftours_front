import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Copy, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import DealForm from '../components/DealForm';
import { deals, useDealFormOptions, useDuplicateDeal } from '../resource';
import { emptyDeal, toForm, toPayload } from '../schema';

export default function DealEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();

  const options = useDealFormOptions();
  const deal = deals.useOne(id);
  const save = deals.useSave();
  const remove = deals.useRemove();
  const duplicate = useDuplicateDeal();

  const defaults = useMemo(
    () => (isNew ? emptyDeal() : deal.data ? toForm(deal.data) : null),
    [isNew, deal.data]
  );

  if (!isNew && deal.error?.status === 404) {
    return <><Link to="/deals">← Retour</Link><div className="alert bad">Offre introuvable.</div></>;
  }
  if (options.isLoading || (!isNew && deal.isLoading) || !defaults || !options.data) {
    return <div className="center">Chargement…</div>;
  }

  const onSubmit = async (values) => {
    try {
      const res = await save.mutateAsync({ id, body: toPayload(values) });
      toast.success('Enregistré.');
      if (isNew) navigate(`/deals/${res.id}`, { replace: true });
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
    if (!window.confirm('Supprimer définitivement cette offre ?')) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Supprimée.');
      navigate('/deals');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onDuplicate = async () => {
    try {
      const res = await duplicate.mutateAsync(id);
      toast.success('Copie créée (masquée).');
      navigate(`/deals/${res.id}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Link to="/deals">← Retour aux bons plans</Link>
      <PageHeader title={isNew ? 'Nouveau bon plan' : defaults.title || 'Modifier le bon plan'} />
      <DealForm
        key={isNew ? 'new' : `${id}-${deal.dataUpdatedAt}`}
        defaultValues={defaults}
        options={options.data}
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