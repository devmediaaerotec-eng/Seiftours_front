import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import BranchesPanel from './BranchesPanel';
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
        {groups.map((g) => (
          <button key={g.id} className={`subtab ${tab === g.id ? 'active' : ''}`} onClick={() => setTab(g.id)}>{g.label}</button>
        ))}
      </nav>

      {error && <div className="alert bad">{error.message}</div>}
      {isLoading && tab !== 'branches' && <div className="center">Chargement…</div>}
      {tab === 'branches' && <BranchesPanel />}
      {group && <SettingsGroup key={group.id + JSON.stringify(group.items.map((i) => i.value))} group={group} />}
    </>
  );
}