import { Link } from 'react-router-dom';
import SimpleCatalogPage from '@/components/catalog/SimpleCatalogPage';
import { dealCategories } from '../resource';

export default function DealCategoriesPage() {
  return (
    <SimpleCatalogPage
      title="Catégories de bons plans"
      newLabel="Nouvelle catégorie"
      editLabel="Modifier la catégorie"
      nameLabel="Nom de la catégorie"
      resource={dealCategories}
      i18nFields={[{ name: 'name', label: 'Nom' }]}
      usageLabel={(n) => `${n} offre(s)`}
      actions={<Link className="btn ghost" to="/deals">← Bons plans</Link>}
    />
  );
}