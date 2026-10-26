import SimpleCatalogPage from '@/components/catalog/SimpleCatalogPage';
import { regions } from '../resource';

export default function RegionsPage() {
  return (
    <SimpleCatalogPage
      title="Régions de circuits"
      newLabel="Nouvelle région"
      editLabel="Modifier la région"
      resource={regions}
      hasImage
      imageFolder="destinations"
      fields={[
        { name: 'description', label: 'Description', type: 'textarea', max: 500 },
        { name: 'image_url', label: 'Image', type: 'image' },
      ]}
      i18nFields={[
        { name: 'name', label: 'Nom' },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
      renderMeta={(r) => r.description || '—'}
      usageLabel={(n) => `${n} circuit(s)`}
    />
  );
}