/**
 * Reflète le modèle MaCategorie exposé par le backend Django
 * (GET /auth/mes-categories/, PATCH /auth/mes-categories/<id>/).
 */
export interface MaCategorie {
  id: number;
  // Id de la catégorie globale du catalogue liée (permet de savoir laquelle
  // proposer/masquer dans le dialog d'ajout — comparer à CategorieGlobale.id).
  categorie: number;
  categorie_nom: string;
  categorie_slug: string;
  categorie_icone: string | null;
  est_principale: boolean;
  image_couverture: string | null;
}
