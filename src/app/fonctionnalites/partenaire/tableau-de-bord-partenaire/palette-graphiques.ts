// Palette des graphiques : teintes variées et harmonieuses (indigo, ciel, émeraude, ambre, rose,
// violet, sarcelle, orange), de saturation comparable. Se répète si plus de couleurs sont
// nécessaires que d'entrées dans le tableau.
export const PALETTE_GRAPHIQUES = [
  '#4F46E5',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
];

/** Couleur d'une série unique (barres ou courbe) et son fond translucide pour les courbes. */
export const COULEUR_PRINCIPALE = PALETTE_GRAPHIQUES[0];
export const COULEUR_PRINCIPALE_TRANSPARENTE = 'rgba(79, 70, 229, 0.15)';
/** Couleur d'une seconde série, distincte de la principale. */
export const COULEUR_SECONDAIRE = PALETTE_GRAPHIQUES[1];

export function couleursGraphique(nombre: number): string[] {
  return Array.from({ length: nombre }, (_, i) => PALETTE_GRAPHIQUES[i % PALETTE_GRAPHIQUES.length]);
}
