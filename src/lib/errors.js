// Affiche le premier message de validation du serveur, sinon le message général.
export const errText = (e) =>
  (e?.data?.violations ? Object.values(e.data.violations)[0] : e?.message) || 'Une erreur est survenue.';