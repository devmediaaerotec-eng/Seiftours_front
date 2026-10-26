import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import RolesMatrix from './RolesMatrix';
import StaffUsers from './StaffUsers';

export default function StaffPage() {
  const [tab, setTab] = useState('users');
  return (
    <>
      <PageHeader title="Personnel" />
      <nav className="subtabs">
        <button className={`subtab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Comptes</button>
       </nav>
      {tab === 'users' ? <StaffUsers /> : <RolesMatrix />}
    </>
  );
}