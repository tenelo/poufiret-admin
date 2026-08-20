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
