import SimpleCatalogPage from '@/components/catalog/SimpleCatalogPage';
import { destinations } from '../resource';

const KINDS = [
  { value: 'abroad', label: "Voyage à l'étranger" },
  { value: 'omra', label: 'Omra' },
];

export default function DestinationsPage() {
  return (
    <SimpleCatalogPage
      title="Destinations"
      newLabel="Nouvelle destination"
      editLabel="Modifier la destination"
      resource={destinations}
      hasImage
      imageFolder="destinations"
      fields={[
        { name: 'kind', label: 'Type', type: 'select', options: KINDS, required: true },
        { name: 'country', label: 'Pays', type: 'text', max: 80 },
        { name: 'city', label: 'Ville', type: 'text', max: 80 },
        { name: 'tagline', label: 'Accroche', type: 'text', max: 190, span: 2 },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'image_url', label: 'Image', type: 'image' },
      ]}
      i18nFields={[
        { name: 'name', label: 'Nom' },
        { name: 'tagline', label: 'Accroche' },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
      renderMeta={(r) => (
        <>{r.kind === 'omra' ? 'Omra' : 'Étranger'} · {[r.city, r.country].filter(Boolean).join(', ') || '—'}</>
      )}
      usageLabel={(n) => `${n} voyage(s)`}
    />
  );
}