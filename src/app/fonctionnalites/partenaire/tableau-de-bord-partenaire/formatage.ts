// Formatage partagé par les onglets du tableau de bord partenaire.

/** Ex. 125000 -> "125 000 FCFA". */
export function formaterFcfa(valeur: number): string {
  return `${Math.round(valeur).toLocaleString('fr-FR')} FCFA`;
}

/** Ex. "2026-08-19T10:00:00Z" -> "à l'instant" / "il y a 5 min" / "il y a 3 j" / date. */
export function formaterDateRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffJ = Math.floor(diffH / 24);
  if (diffJ < 7) return `il y a ${diffJ} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

const MOIS_COURTS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

/** Clé de regroupement mensuel (YYYY-MM) triable chronologiquement. */
export function cleMois(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Ex. "2026-08" -> "août 2026". */
export function libelleMois(cle: string): string {
  const [annee, mois] = cle.split('-').map(Number);
  return `${MOIS_COURTS[mois - 1]} ${annee}`;
}
