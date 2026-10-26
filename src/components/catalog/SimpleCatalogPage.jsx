import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { assetUrl } from '@/lib/format';
import CatalogForm from './CatalogForm';

export default function SimpleCatalogPage({
  title, newLabel, editLabel, resource, fields = [], i18nFields = [],
  imageFolder, hasImage = false, nameLabel, renderMeta, usageLabel, actions,
}) {
  const toast = useToast();
  const list = resource.useList();
  const flags = resource.useFlags();
  const reorder = resource.useReorder();
  const remove = resource.useRemove();
  const [editing, setEditing] = useState(undefined);   // undefined = fermé, null = nouveau, objet = modification

  const items = list.data?.items ?? [];
  const onError = (e) => toast.error(e.message);

  const move = (i, delta) => {
    const ids = items.map((x) => x.id);
    [ids[i], ids[i + delta]] = [ids[i + delta], ids[i]];
    reorder.mutate(ids, { onError });
  };

  const del = (row) => {
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return;
    remove.mutate(row.id, { onSuccess: () => toast.success('Supprimé.'), onError });
  };

  return (
    <>
      <PageHeader title={title}
        action={<div className="row-tools">{actions}<button className="btn" onClick={() => setEditing(null)}><Plus size={16} /> {newLabel}</button></div>} />

      {list.error && <div className="alert bad">{list.error.message}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              {hasImage && <th />}
              <th>Nom</th><th>Détails</th><th>Utilisé par</th><th>Statut</th><th>Ordre</th><th />
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={r.id}>
                {hasImage && <td>{r.image_url ? <img className="thumb" src={assetUrl(r.image_url)} alt="" /> : <div className="thumb" />}</td>}
                <td><strong>{r.name}</strong><br /><small className="muted">{r.slug}</small></td>
                <td>{renderMeta ? renderMeta(r) : '—'}</td>
                <td>{usageLabel ? usageLabel(r.used_by) : r.used_by}</td>
                <td>
                  <button className="toggle" title="Publier / masquer"
                          onClick={() => flags.mutate({ id: r.id, is_active: !r.is_active }, { onError })}>
                    <span className={`badge ${r.is_active ? 'ok' : 'muted'}`}>{r.is_active ? 'Publié' : 'Masqué'}</span>
                  </button>
                </td>
                <td>
                  <div className="order-btns">
                    <button className="btn ghost sm" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} aria-label="Monter"><ArrowUp size={14} /></button>
                    <button className="btn ghost sm" disabled={i === items.length - 1 || reorder.isPending} onClick={() => move(i, 1)} aria-label="Descendre"><ArrowDown size={14} /></button>
                  </div>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn ghost sm" onClick={() => setEditing(r)}><Pencil size={14} /> Modifier</button>
                    <button className="btn ghost sm" onClick={() => del(r)} aria-label="Supprimer"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {list.isLoading && <tr><td colSpan="7" className="muted">Chargement…</td></tr>}
            {!list.isLoading && items.length === 0 && <tr><td colSpan="7" className="muted">Aucun élément.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <Modal title={editing ? editLabel : newLabel} onClose={() => setEditing(undefined)}>
          <CatalogForm
            key={editing?.id ?? 'new'}
            row={editing}
            resource={resource}
            fields={fields}
            i18nFields={i18nFields}
            imageFolder={imageFolder}
            nameLabel={nameLabel}
            onDone={() => setEditing(undefined)}
            onCancel={() => setEditing(undefined)}
          />
        </Modal>
      )}
    </>
  );
}