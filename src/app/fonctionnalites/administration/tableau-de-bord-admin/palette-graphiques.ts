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
