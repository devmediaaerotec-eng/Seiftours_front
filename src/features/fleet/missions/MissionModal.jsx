import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import ControlForm from './ControlForm';
import MissionDetail from './MissionDetail';
import MissionForm from './MissionForm';

const TITLES = { detail: 'Mission', new: 'Nouvelle mission', edit: 'Modifier la mission', control: 'Contrôle de la mission' };

/** target = { mode: 'detail' | 'new' | 'edit' | 'control', id?, defaults?, template? } */
export default function MissionModal({ target, onClose }) {
  const [view, setView] = useState(target);
  const toDetail = (id) => setView({ mode: 'detail', id });

  return (
    <Modal title={TITLES[view.mode]} size="lg" onClose={onClose}>
      {view.mode === 'detail' && (
        <MissionDetail
          id={view.id}
          onEdit={() => setView({ mode: 'edit', id: view.id })}
          onControl={() => setView({ mode: 'control', id: view.id })}
          onDuplicate={(template) => setView({ mode: 'new', template })}
          onClose={onClose}
        />
      )}
      {view.mode === 'new' && (
        <MissionForm defaults={view.defaults} template={view.template}
                     onDone={(m) => toDetail(m.id)} onCancel={onClose} />
      )}
      {view.mode === 'edit' && (
        <MissionForm id={view.id} onDone={() => toDetail(view.id)} onCancel={() => toDetail(view.id)} />
      )}
      {view.mode === 'control' && (
        <ControlForm id={view.id} onDone={() => toDetail(view.id)} onCancel={() => toDetail(view.id)} />
      )}
    </Modal>
  );
}