import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import BranchesPanel from './BranchesPanel';
import HotelMarkupPanel from './HotelMarkupPanel';
import SettingsGroup from './SettingsGroup';
import { useSettings } from './resource';

export default function SettingsPage() {
  const [tab, setTab] = useState('branches');
  const { data, isLoading, error } = useSettings();
  const groups = data?.groups ?? [];
  const group = groups.find((g) => g.id === tab);

  return (
    <>
      <PageHeader title="Réglages" />
      <nav className="subtabs">
        <button className={`subtab ${tab === 'branches' ? 'active' : ''}`} onClick={() => setTab('branches')}>Agences</button>
        <button className={`subtab ${tab === 'pricing' ? 'active' : ''}`} onClick={() => setTab('pricing')}>Tarification</button>
        {groups.map((g) => (
          <button key={g.id} className={`subtab ${tab === g.id ? 'active' : ''}`} onClick={() => setTab(g.id)}>{g.label}</button>
        ))}
      </nav>

      {error && <div className="alert bad">{error.message}</div>}
      {isLoading && tab !== 'branches' && tab !== 'pricing' && <div className="center">Chargement…</div>}
      {tab === 'branches' && <BranchesPanel />}
      {tab === 'pricing' && <HotelMarkupPanel />}
      {group && <SettingsGroup key={group.id + JSON.stringify(group.items.map((i) => i.value))} group={group} />}
    </>
  );
}