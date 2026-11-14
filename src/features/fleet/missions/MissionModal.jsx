import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import ControlForm from './ControlForm';
import MissionDetail from './MissionDetail';
import MissionForm from './MissionForm';
import NoticeForm from './NoticeForm'; // AJOUT 1 : import
import MissionBatchForm from './MissionBatchForm';
const TITLES = {
  detail: 'Mission', new: 'Nouvelle mission', edit: 'Modifier la mission',
  control: 'Contrôle de la mission',
  notice: 'Message au chauffeur', // AJOUT 2 : titre
};

/** target = { mode: 'detail' | 'new' | 'edit' | 'control' | 'notice', id?, kind?, defaults?, template? } */
export default function MissionModal({ target, onClose }) {
  const [view, setView] = useState(target);
  const toDetail = (id) => setView({ mode: 'detail', id });

  // Création/duplication annulée : on ferme. Modification/contrôle/message annulés : retour au détail.
  const backOrClose = () => (view.id ? toDetail(view.id) : onClose());

  return (
    <Modal title={TITLES[view.mode]} size="lg" onClose={onClose}>
      {view.mode === 'detail' && (
        <MissionDetail
          id={view.id}
          onEdit={() => setView({ mode: 'edit', id: view.id })}
          onControl={() => setView({ mode: 'control', id: view.id })}
          onNotice={() => setView({ mode: 'notice', id: view.id })} // AJOUT 3 : ouvre le message
          onDuplicate={(template) => setView({ mode: 'new', template })}
          onClose={onClose}
        />
      )}
     
     {view.mode === 'new' && !view.template && (
  <MissionBatchForm defaults={view.defaults} onDone={onClose} onCancel={onClose} />
)}
{view.mode === 'new' && view.template && (
  <MissionForm template={view.template} onDone={(m) => toDetail(m.id)} onCancel={onClose} />
)}
      {view.mode === 'edit' && (
        <MissionForm id={view.id} onDone={() => toDetail(view.id)} onCancel={backOrClose} />
      )}
      {view.mode === 'control' && (
        <ControlForm id={view.id} onDone={() => toDetail(view.id)} onCancel={backOrClose} />
      )}
      {view.mode === 'notice' && ( // AJOUT 4 : le formulaire
        <NoticeForm id={view.id} kind={view.kind} onBack={backOrClose} />
      )}
    </Modal>
  );
}