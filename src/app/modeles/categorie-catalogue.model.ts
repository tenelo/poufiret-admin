/** Reflète une catégorie du catalogue exposée par GET /catalogue/categories/ (arbre récursif). */
export interface CategorieCatalogue {
  id: number;
  nom: string;
  slug: string;
  enfants: CategorieCatalogue[];
}

/** Catégorie aplatie pour un select, avec sa profondeur pour indenter l'affichage. */
export interface CategorieCatalogueAplatie {
  id: number;
  libelle: string;
  profondeur: number;
}

/** Aplatit récursivement l'arbre des catégories en une liste indentée, pour peupler un select. */
export function aplatirCategories(
  categories: CategorieCatalogue[],
  profondeur = 0,
): CategorieCatalogueAplatie[] {
  return categories.flatMap((categorie) => [
    { id: categorie.id, libelle: categorie.nom, profondeur },
    ...aplatirCategories(categorie.enfants ?? [], profondeur + 1),
  ]);
}
