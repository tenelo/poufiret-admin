// Palette Poufiret (vert #1B5E20 / orange #E65100) + nuances dérivées, pour les
// segments de graphiques (donut, barres multi-séries). Se répète si plus de
// couleurs sont nécessaires que d'entrées dans le tableau.
export const PALETTE_GRAPHIQUES = [
  '#1B5E20',
  '#E65100',
  '#4C8C4A',
  '#F57C00',
  '#2E7D32',
  '#FB8C00',
  '#66BB6A',
  '#FFA726',
];

export function couleursGraphique(nombre: number): string[] {
  return Array.from({ length: nombre }, (_, i) => PALETTE_GRAPHIQUES[i % PALETTE_GRAPHIQUES.length]);
}

/** Formate un nombre avec séparateur de milliers français. */
export function formaterNombre(valeur: number): string {
  return Math.round(valeur).toLocaleString('fr-FR');
}

/**
 * Formate une durée en secondes en texte lisible français :
 * < 60 s → "45 s" ; < 3600 s → "7 min 09 s" ; ≥ 3600 s → "1 h 02 min".
 */
export function formaterDuree(secondes: number): string {
  const total = Math.max(0, Math.round(secondes));

  if (total < 60) {
    return `${total} s`;
  }
  if (total < 3600) {
    const minutes = Math.floor(total / 60);
    const restantes = total % 60;
    return `${minutes} min ${restantes.toString().padStart(2, '0')} s`;
  }
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${heures} h ${minutes.toString().padStart(2, '0')} min`;
}
