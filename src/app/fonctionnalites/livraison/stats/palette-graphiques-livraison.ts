// Palette qualitative pour les graphiques stats TeneLivr (donut, barres
// multi-catégories). Copie locale au module livraison (isolation) — ne
// réutilise pas la palette de l'espace admin.
const PALETTE_GRAPHIQUES_LIVRAISON = [
  '#0369a1',
  '#0891b2',
  '#059669',
  '#ca8a04',
  '#dc2626',
  '#7c3aed',
  '#db2777',
  '#65a30d',
];

export function couleursGraphique(n: number): string[] {
  return Array.from({ length: n }, (_, i) => PALETTE_GRAPHIQUES_LIVRAISON[i % PALETTE_GRAPHIQUES_LIVRAISON.length]);
}

export function formaterNombre(valeur: number): string {
  return valeur.toLocaleString('fr-FR');
}
